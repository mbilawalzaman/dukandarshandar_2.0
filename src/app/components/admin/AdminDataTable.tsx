"use client";

import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  TextField,
  Box,
  Typography,
  IconButton,
  Chip,
  Tooltip,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";

export interface ColumnDef<T> {
  id: keyof T | "actions";
  label: string;
  minWidth?: number;
  align?: "left" | "center" | "right";
  format?: (value: unknown, row: T) => React.ReactNode;
}

interface AdminDataTableProps<T> {
  title: string;
  columns: ColumnDef<T>[];
  data: T[];
  searchPlaceholder?: string;
  searchField?: keyof T;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  onView?: (row: T) => void;
  loading?: boolean;
  serverPagination?: {
    total: number;
    page: number;
    rowsPerPage: number;
    onPageChange: (page: number) => void;
    onRowsPerPageChange: (rowsPerPage: number) => void;
    onSearchChange?: (term: string) => void;
    searchTerm?: string;
  };
}

export default function AdminDataTable<T extends { _id?: string }>({
  title,
  columns,
  data,
  searchPlaceholder = "Search...",
  searchField,
  onEdit,
  onDelete,
  onView,
  loading = false,
  serverPagination,
}: AdminDataTableProps<T>) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");

  const isServer = Boolean(serverPagination);
  const activeSearch = isServer ? serverPagination!.searchTerm ?? "" : searchTerm;
  const activePage = isServer ? serverPagination!.page : page;
  const activeRowsPerPage = isServer ? serverPagination!.rowsPerPage : rowsPerPage;

  const filteredData = isServer
    ? data
    : data.filter((row) => {
        if (!searchTerm) return true;
        if (searchField) {
          const val = row[searchField];
          return String(val ?? "").toLowerCase().includes(searchTerm.toLowerCase());
        }
        return JSON.stringify(row).toLowerCase().includes(searchTerm.toLowerCase());
      });

  const handleChangePage = (_event: unknown, newPage: number) => {
    if (isServer) serverPagination!.onPageChange(newPage);
    else setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = +event.target.value;
    if (isServer) serverPagination!.onRowsPerPageChange(next);
    else {
      setRowsPerPage(next);
      setPage(0);
    }
  };

  const displayRows = isServer
    ? filteredData
    : filteredData.slice(activePage * activeRowsPerPage, activePage * activeRowsPerPage + activeRowsPerPage);

  const totalCount = isServer ? serverPagination!.total : filteredData.length;

  return (
    <Paper
      elevation={0}
      sx={{
        width: "100%",
        overflow: "hidden",
        borderRadius: 3,
        border: "1px solid #e2e8f0",
        boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
      }}
    >
      <Box
        sx={{
          p: { xs: 2, sm: 3 },
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "stretch", sm: "center" },
          flexDirection: { xs: "column", sm: "row" },
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, color: "#1e293b", fontSize: { xs: "1.1rem", sm: "1.25rem" } }}
          >
            {title}
          </Typography>
          <Chip label={`${totalCount} entries`} size="small" color="primary" variant="outlined" />
        </Box>
        <TextField
          size="small"
          placeholder={searchPlaceholder}
          value={activeSearch}
          onChange={(e) => {
            const value = e.target.value;
            if (isServer) serverPagination!.onSearchChange?.(value);
            else {
              setSearchTerm(value);
              setPage(0);
            }
          }}
          sx={{ width: { xs: "100%", sm: 260 } }}
        />
      </Box>

      <TableContainer sx={{ width: "100%", overflowX: "auto" }}>
        <Table aria-label="admin data table" sx={{ minWidth: 600 }}>
          <TableHead sx={{ backgroundColor: "#f8fafc", display: "table-header-group" }}>
            <TableRow sx={{ backgroundColor: "#f8fafc" }}>
              {columns.map((column) => (
                <TableCell
                  key={String(column.id)}
                  align={column.align || "left"}
                  sx={{
                    minWidth: column.minWidth || 120,
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    backgroundColor: "#f8fafc",
                    color: "#334155",
                    borderBottom: "2px solid #e2e8f0",
                    whiteSpace: "nowrap",
                    py: 1.75,
                  }}
                >
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">Loading data...</Typography>
                </TableCell>
              </TableRow>
            ) : displayRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">No records found.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              displayRows.map((row, index) => (
                  <TableRow hover role="checkbox" tabIndex={-1} key={row._id || index}>
                    {columns.map((column) => {
                      if (column.id === "actions") {
                        return (
                          <TableCell key="actions" align={column.align || "center"} sx={{ py: 1.5 }}>
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: column.align === "right" ? "flex-end" : "center",
                                gap: 0.5,
                              }}
                            >
                              {onView && (
                                <Tooltip title="View">
                                  <IconButton size="small" color="info" onClick={() => onView(row)}>
                                    <VisibilityIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                              {onEdit && (
                                <Tooltip title="Edit">
                                  <IconButton size="small" color="primary" onClick={() => onEdit(row)}>
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                              {onDelete && (
                                <Tooltip title="Delete">
                                  <IconButton size="small" color="error" onClick={() => onDelete(row)}>
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          </TableCell>
                        );
                      }

                      const value = row[column.id as keyof T];
                      return (
                        <TableCell key={String(column.id)} align={column.align || "left"} sx={{ py: 1.75 }}>
                          {column.format ? column.format(value, row) : String(value ?? "")}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={totalCount}
        rowsPerPage={activeRowsPerPage}
        page={activePage}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
}
