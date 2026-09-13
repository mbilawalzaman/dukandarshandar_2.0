"use client";

import React, { useState } from "react";
import type {
  PopoverOrigin} from "@mui/material";
import {
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  Divider
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";

export interface DropdownItem<T = unknown> {
  label: React.ReactNode;
  icon?: React.ReactNode;
  onClick: (data: T) => void | Promise<void>;
  color?: string;
  disabled?: boolean;
  divider?: boolean;
}

export type TableRowAction<T> = DropdownItem<T>;

export interface DropdownProps<T = unknown> {
  /** Optional custom trigger node (e.g. Button or Icon). Defaults to 3-dots icon button. */
  trigger?: React.ReactNode;
  /** Tooltip title for default trigger button */
  tooltipTitle?: string;
  /** Menu items list */
  items?: DropdownItem<T>[];
  /** Target data object (useful for table row actions) */
  row?: T;
  /** Direct callback for View Details action */
  onView?: (row: T) => void;
  /** Direct callback for Edit action */
  onEdit?: (row: T) => void;
  /** Direct callback for Delete action */
  onDelete?: (row: T) => void;
  /** Function returning custom extra actions for a specific row */
  extraActions?: (row: T) => DropdownItem<T>[];
  /** Menu anchor origin */
  anchorOrigin?: PopoverOrigin;
  /** Menu transform origin */
  transformOrigin?: PopoverOrigin;
  /** Minimum width for the popover menu */
  minWidth?: number | string;
}

/**
 * Reusable Global Dropdown Component.
 * Can be used as generic dropdown menu, action menu, or table row actions menu across the entire app.
 */
export default function Dropdown<T = unknown>({
  trigger,
  tooltipTitle = "Actions",
  items,
  row,
  onView,
  onEdit,
  onDelete,
  extraActions,
  anchorOrigin = { horizontal: "right", vertical: "bottom" },
  transformOrigin = { horizontal: "right", vertical: "top" },
  minWidth = 160,
}: DropdownProps<T>) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };

  const handleClose = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setAnchorEl(null);
  };

  const extraItems = row && extraActions ? extraActions(row) : [];
  const allCustomItems = [...(items || []), ...extraItems];

  const hasContent = Boolean(
    (row && (onView || onEdit || onDelete)) || allCustomItems.length > 0
  );

  if (!hasContent) return null;

  const defaultTrigger = (
    <IconButton
      size="small"
      onClick={handleOpen}
      sx={{ color: "#475569", "&:hover": { backgroundColor: "#f1f5f9" } }}
    >
      <MoreVertIcon fontSize="small" />
    </IconButton>
  );

  const triggerElement = trigger ? (
    <span onClick={handleOpen} style={{ cursor: "pointer", display: "inline-flex" }}>
      {trigger}
    </span>
  ) : tooltipTitle ? (
    <Tooltip title={tooltipTitle}>{defaultTrigger}</Tooltip>
  ) : (
    defaultTrigger
  );

  return (
    <>
      {triggerElement}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => handleClose()}
        PaperProps={{
          elevation: 3,
          sx: {
            borderRadius: 2,
            minWidth,
            py: 0.5,
            boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
            border: "1px solid #e2e8f0",
          },
        }}
        transformOrigin={transformOrigin}
        anchorOrigin={anchorOrigin}
      >
        {row && onView && (
          <MenuItem
            onClick={(e) => {
              handleClose(e);
              onView(row);
            }}
            sx={{ gap: 1.5, fontSize: "0.85rem" }}
          >
            <ListItemIcon sx={{ minWidth: "auto", color: "#0284c7" }}>
              <VisibilityIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="View Details" />
          </MenuItem>
        )}
        {row && onEdit && (
          <MenuItem
            onClick={(e) => {
              handleClose(e);
              onEdit(row);
            }}
            sx={{ gap: 1.5, fontSize: "0.85rem" }}
          >
            <ListItemIcon sx={{ minWidth: "auto", color: "#475569" }}>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Edit" />
          </MenuItem>
        )}
        {allCustomItems.map((act, i) => (
          <React.Fragment key={i}>
            {act.divider && <Divider sx={{ my: 0.5 }} />}
            <MenuItem
              disabled={act.disabled}
              onClick={(e) => {
                handleClose(e);
                act.onClick(row as T);
              }}
              sx={{ gap: 1.5, fontSize: "0.85rem", color: act.color || "inherit" }}
            >
              {act.icon && (
                <ListItemIcon sx={{ minWidth: "auto", color: act.color || "#475569" }}>
                  {act.icon}
                </ListItemIcon>
              )}
              <ListItemText primary={act.label} />
            </MenuItem>
          </React.Fragment>
        ))}
        {row && onDelete && (
          <MenuItem
            onClick={(e) => {
              handleClose(e);
              onDelete(row);
            }}
            sx={{ gap: 1.5, fontSize: "0.85rem", color: "#ef4444" }}
          >
            <ListItemIcon sx={{ minWidth: "auto", color: "#ef4444" }}>
              <DeleteIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Delete" />
          </MenuItem>
        )}
      </Menu>
    </>
  );
}
