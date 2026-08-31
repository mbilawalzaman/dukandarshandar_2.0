"use client";

import React from "react";
import {
  Box,
  Typography,
  Paper,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import Link from "next/link";
import { LowStockProduct } from "@/types/admin";
import { ProductFormData } from "./ProductFormModal";

interface InventoryAlertWidgetProps {
  lowStockCount?: number;
  outOfStockCount?: number;
  lowStockProducts?: LowStockProduct[];
  onRestockClick: (product: ProductFormData) => void;
}

export default function InventoryAlertWidget({
  lowStockCount = 0,
  outOfStockCount = 0,
  lowStockProducts = [],
  onRestockClick,
}: InventoryAlertWidgetProps) {
  const totalNeedsRestock = lowStockCount + outOfStockCount;

  if (totalNeedsRestock === 0 && lowStockProducts.length === 0) {
    return null;
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        mb: 4,
        borderRadius: 3,
        border: "1px solid #fed7aa",
        backgroundColor: "#fffbeb",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <WarningAmberIcon sx={{ color: "#d97706", fontSize: 26 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#9a3412" }}>
            Inventory Restock Alerts ({totalNeedsRestock} items need attention)
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          {outOfStockCount > 0 && (
            <Chip label={`${outOfStockCount} Out of Stock`} size="small" color="error" sx={{ fontWeight: 700 }} />
          )}
          {lowStockCount > 0 && (
            <Chip label={`${lowStockCount} Low Stock (≤ 5)`} size="small" color="warning" sx={{ fontWeight: 700 }} />
          )}
          <Button component={Link} href="/admin/products" size="small" variant="outlined" color="warning" sx={{ textTransform: "none" }}>
            View In Inventory →
          </Button>
        </Box>
      </Box>

      {lowStockProducts.length > 0 ? (
        <TableContainer sx={{ backgroundColor: "#ffffff", borderRadius: 2, border: "1px solid #fde68a" }}>
          <Table size="small">
            <TableHead sx={{ backgroundColor: "#fef3c7" }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: "#92400e" }}>Product Name</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#92400e" }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#92400e" }}>Price</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#92400e" }} align="center">Stock Level</TableCell>
                <TableCell sx={{ fontWeight: 700, color: "#92400e" }} align="right">Quick Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lowStockProducts.map((prod) => (
                <TableRow key={prod._id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{prod.name}</TableCell>
                  <TableCell>{prod.category || "General"}</TableCell>
                  <TableCell>PKR {Number(prod.price).toLocaleString()}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={prod.quantity <= 0 ? "0 (Out of stock)" : `${prod.quantity} remaining`}
                      size="small"
                      color={prod.quantity <= 0 ? "error" : "warning"}
                      sx={{ fontWeight: 700, fontSize: "0.75rem" }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() =>
                        onRestockClick({
                          _id: prod._id,
                          name: prod.name,
                          category: prod.category || "",
                          price: prod.price,
                          quantity: prod.quantity,
                          rating: prod.rating || 5,
                          description: prod.description || "",
                          image: prod.image || "",
                          featured: Boolean(prod.featured),
                        })
                      }
                      sx={{ textTransform: "none", py: 0.25, px: 1.5, fontSize: "0.8rem" }}
                    >
                      Restock
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", p: 3 }}>
          <Typography variant="body2" sx={{ color: "#15803d", fontWeight: 600 }}>
            ✓ All products are adequately stocked!
          </Typography>
        </Box>
      )}
    </Paper>
  );
}
