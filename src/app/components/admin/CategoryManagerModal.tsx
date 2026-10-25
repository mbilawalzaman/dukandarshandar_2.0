"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  TextField,
  FormControlLabel,
  Checkbox,
  Button,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  Snackbar,
  InputAdornment,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SearchIcon from "@mui/icons-material/Search";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

import { BRAND } from "@/lib/uiBrand";
import { authFetch } from "@/lib/authFetch";
import { refreshProductCategories } from "@/lib/productCategoryStore";
import ConfirmModal from "../ConfirmModal";
import type {
  CategoryDetailItem,
  CategoryListResponse,
  CategoryMutationResponse,
} from "@/types/apps/categoryTypes";

export interface CategoryManagerModalProps {
  open: boolean;
  onClose: () => void;
  onCategoryChanged?: () => void;
}

const ROWS_PER_PAGE = 5;

export default function CategoryManagerModal({
  open,
  onClose,
  onCategoryChanged,
}: CategoryManagerModalProps) {
  const [categories, setCategories] = useState<CategoryDetailItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);

  // Form state
  const [nameInput, setNameInput] = useState("");
  const [isActiveInput, setIsActiveInput] = useState(true);

  const [editingCategory, setEditingCategory] =
    useState<CategoryDetailItem | null>(null);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    category: CategoryDetailItem | null;
    loading: boolean;
  }>({
    open: false,
    category: null,
    loading: false,
  });

  // Toast feedback state
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({
    open: false,
    message: "",
    severity: "info",
  });

  const fetchCategories = useCallback(async (): Promise<void> => {
    setLoading(true);

    try {
      const res = await authFetch("/api/categories?details=true");
      const data = (await res.json()) as CategoryListResponse;

      if (data.success && Array.isArray(data.categoryDetails)) {
        setCategories(data.categoryDetails);
      }
    } catch (err) {
      console.error("Failed to fetch category details:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void fetchCategories();
      setNameInput("");
      setIsActiveInput(true);
      setEditingCategory(null);
      setFormError("");
      setSearchTerm("");
      setPage(1);
    }
  }, [open, fetchCategories]);

  // Filtered categories based on search
  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return categories;
    const term = searchTerm.trim().toLowerCase();

    return categories.filter((c) => c.name.toLowerCase().includes(term));
  }, [categories, searchTerm]);

  // Reset page when search term changes
  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredCategories.length / ROWS_PER_PAGE),
  );

  const paginatedCategories = useMemo(() => {
    const start = (page - 1) * ROWS_PER_PAGE;

    return filteredCategories.slice(start, start + ROWS_PER_PAGE);
  }, [filteredCategories, page]);

  const handleStartEdit = (category: CategoryDetailItem) => {
    setEditingCategory(category);
    setNameInput(category.name);
    setIsActiveInput(category.isActive);
    setFormError("");
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setNameInput("");
    setIsActiveInput(true);
    setFormError("");
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault();
    const trimmed = nameInput.trim();

    if (!trimmed) {
      setFormError("Please enter a category name");

      return;
    }

    setSaving(true);
    setFormError("");

    try {
      if (editingCategory) {
        // Update existing category
        const res = await authFetch("/api/categories", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            oldName: editingCategory.name,
            newName: trimmed,
            isActive: isActiveInput,
          }),
        });

        const data = (await res.json()) as CategoryMutationResponse;

        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to update category");
        }

        setToast({
          open: true,
          message: `Category "${trimmed}" updated successfully`,
          severity: "success",
        });
        handleCancelEdit();
      } else {
        // Add new category
        const res = await authFetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: trimmed,
            isActive: isActiveInput,
          }),
        });

        const data = (await res.json()) as CategoryMutationResponse;

        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to add category");
        }

        setToast({
          open: true,
          message: `Category "${trimmed}" created successfully`,
          severity: "success",
        });
        setNameInput("");
        setIsActiveInput(true);
      }

      await fetchCategories();
      void refreshProductCategories();
      onCategoryChanged?.();
    } catch (err) {
      console.error("Category save error:", err);
      setFormError(
        err instanceof Error ? err.message : "Failed to save category",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDelete = (category: CategoryDetailItem) => {
    setDeleteModal({
      open: true,
      category,
      loading: false,
    });
  };

  const handleCloseDelete = () => {
    if (!deleteModal.loading) {
      setDeleteModal({ open: false, category: null, loading: false });
    }
  };

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteModal.category) return;
    const catToDelete = deleteModal.category;

    setDeleteModal((prev) => ({ ...prev, loading: true }));

    try {
      const res = await authFetch(
        `/api/categories?name=${encodeURIComponent(catToDelete.name)}`,
        { method: "DELETE" },
      );

      const data = (await res.json()) as CategoryMutationResponse;

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to delete category");
      }

      setToast({
        open: true,
        message: `Category "${catToDelete.name}" deleted successfully`,
        severity: "success",
      });

      if (editingCategory?.id === catToDelete.id) {
        handleCancelEdit();
      }

      setDeleteModal({ open: false, category: null, loading: false });
      await fetchCategories();
      void refreshProductCategories();
      onCategoryChanged?.();
    } catch (err) {
      console.error("Delete category error:", err);
      setToast({
        open: true,
        message:
          err instanceof Error ? err.message : "Failed to delete category",
        severity: "error",
      });
      setDeleteModal((prev) => ({ ...prev, loading: false }));
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1,
            boxShadow: "0 20px 40px -10px rgba(15,23,42,0.18)",
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            pb: 1,
          }}
        >
          <Box>
            <Typography
              variant="h5"
              sx={{ fontWeight: 800, color: BRAND.navy }}
            >
              Product Categories
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Manage categories for your store. Create new, edit, or delete
              existing categories.
            </Typography>
          </Box>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              color: "text.secondary",
              "&:hover": { bgcolor: "action.hover" },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 1, pb: 2 }}>
          {/* Top Form Box: Add or Edit Category */}
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
              p: 2.5,
              mb: 3,
              borderRadius: 2.5,
              bgcolor: "#F8FAFC",
              border: "1px solid #E2E8F0",
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 1.5,
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 700,
                  color: BRAND.navy,
                  textTransform: "uppercase",
                  fontSize: "0.82rem",
                  letterSpacing: "0.04em",
                }}
              >
                {editingCategory ? "Edit category" : "Add category"}
              </Typography>
              {editingCategory && (
                <Chip
                  label={`Editing: ${editingCategory.name}`}
                  size="small"
                  sx={{
                    bgcolor: "rgba(254, 190, 76, 0.2)",
                    color: BRAND.navy,
                    fontWeight: 600,
                    fontSize: "0.75rem",
                  }}
                />
              )}
            </Box>

            {formError && (
              <Alert severity="error" sx={{ mb: 2, py: 0.5 }}>
                {formError}
              </Alert>
            )}

            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                color: "text.secondary",
                textTransform: "uppercase",
                display: "block",
                mb: 0.75,
                letterSpacing: "0.03em",
              }}
            >
              Category Name *
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="e.g. Stationery, School Bags, Art Supplies..."
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              disabled={saving}
              inputProps={{ maxLength: 80 }}
              sx={{
                bgcolor: "#FFFFFF",
                "& .MuiOutlinedInput-root": {
                  borderRadius: 1.5,
                },
              }}
            />

            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mt: 1.5,
                flexWrap: "wrap",
                gap: 1,
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isActiveInput}
                    onChange={(e) => setIsActiveInput(e.target.checked)}
                    size="small"
                    color="primary"
                  />
                }
                label={
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Active category
                  </Typography>
                }
              />

              <Box sx={{ display: "flex", gap: 1 }}>
                {editingCategory && (
                  <Button
                    size="small"
                    onClick={handleCancelEdit}
                    disabled={saving}
                    sx={{
                      color: "text.secondary",
                      textTransform: "none",
                      fontWeight: 600,
                    }}
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  type="submit"
                  variant="contained"
                  disabled={saving || !nameInput.trim()}
                  startIcon={!editingCategory && <AddIcon />}
                  sx={{ px: 3, py: 1, fontWeight: 700 }}
                >
                  {saving
                    ? "Saving…"
                    : editingCategory
                      ? "Update category"
                      : "Add category"}
                </Button>
              </Box>
            </Box>
          </Box>

          {/* Search Bar Section */}
          <Box sx={{ mb: 1.5 }}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                color: "text.secondary",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                display: "block",
                mb: 0.75,
              }}
            >
              Search Categories
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by category name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon
                      fontSize="small"
                      sx={{ color: "text.secondary" }}
                    />
                  </InputAdornment>
                ),
              }}
              sx={{
                bgcolor: "#FFFFFF",
                "& .MuiOutlinedInput-root": {
                  borderRadius: 1.5,
                },
              }}
            />
          </Box>

          {/* Category List Card */}
          <Box
            sx={{
              border: "1px solid #E2E8F0",
              borderRadius: 2,
              bgcolor: "#FFFFFF",
              overflow: "hidden",
              minHeight: 180,
            }}
          >
            {loading ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  py: 6,
                }}
              >
                <CircularProgress size={28} />
              </Box>
            ) : paginatedCategories.length === 0 ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  py: 6,
                  px: 2,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  {searchTerm.trim()
                    ? "No categories match your search."
                    : "No categories yet. Create your first category above!"}
                </Typography>
              </Box>
            ) : (
              paginatedCategories.map((cat, index) => (
                <React.Fragment key={cat.id}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      px: 2.5,
                      py: 1.6,
                      transition: "background-color 0.15s ease",
                      "&:hover": {
                        bgcolor: "#F8FAFC",
                      },
                    }}
                  >
                    <Box sx={{ pr: 2 }}>
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: 700,
                          color: BRAND.navy,
                          fontSize: "0.95rem",
                        }}
                      >
                        {cat.name}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontSize: "0.82rem", mt: 0.25 }}
                      >
                        {cat.productCount}{" "}
                        {cat.productCount === 1 ? "product" : "products"}
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                      }}
                    >
                      <Chip
                        label={cat.isActive ? "Active" : "Inactive"}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.75rem",
                          borderRadius: 1,
                          bgcolor: cat.isActive ? "#F1F5F9" : "#FEE2E2",
                          color: cat.isActive ? BRAND.navy : "#DC2626",
                        }}
                      />
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<EditOutlinedIcon fontSize="small" />}
                        onClick={() => handleStartEdit(cat)}
                        sx={{
                          borderColor: "#CBD5E1",
                          color: BRAND.navy,
                          textTransform: "none",
                          fontWeight: 600,
                          fontSize: "0.8rem",
                          py: 0.4,
                          px: 1.5,
                          borderRadius: 1.5,
                          "&:hover": {
                            borderColor: BRAND.navy,
                            bgcolor: "rgba(15,23,42,0.04)",
                          },
                        }}
                      >
                        Edit
                      </Button>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDelete(cat)}
                        aria-label={`Delete category ${cat.name}`}
                        sx={{
                          color: "#EF4444",
                          border: "1px solid #FECACA",
                          borderRadius: 1.5,
                          p: 0.6,
                          "&:hover": {
                            bgcolor: "#FEE2E2",
                            borderColor: "#EF4444",
                          },
                        }}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                  {index < paginatedCategories.length - 1 && <Divider />}
                </React.Fragment>
              ))
            )}
          </Box>

          {/* Footer: Count & Pagination */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mt: 2,
              px: 0.5,
            }}
          >
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontWeight: 500 }}
            >
              {filteredCategories.length}{" "}
              {filteredCategories.length === 1 ? "category" : "categories"}
            </Typography>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <IconButton
                size="small"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                sx={{
                  border: "1px solid #E2E8F0",
                  borderRadius: 1.5,
                  p: 0.5,
                }}
              >
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontWeight: 600, px: 0.5, fontSize: "0.85rem" }}
              >
                {page} / {totalPages}
              </Typography>
              <IconButton
                size="small"
                disabled={page >= totalPages}
                onClick={() =>
                  setPage((prev) => Math.min(totalPages, prev + 1))
                }
                sx={{
                  border: "1px solid #E2E8F0",
                  borderRadius: 1.5,
                  p: 0.5,
                }}
              >
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={deleteModal.open}
        title="Delete Category"
        message={
          deleteModal.category?.productCount &&
          deleteModal.category.productCount > 0
            ? `Are you sure you want to delete category "${deleteModal.category?.name}"? It currently has ${deleteModal.category.productCount} product(s) linked.`
            : `Are you sure you want to delete category "${deleteModal.category?.name}"? This action cannot be undone.`
        }
        confirmLabel="Delete Category"
        confirmColor="error"
        loading={deleteModal.loading}
        onConfirm={() => void handleConfirmDelete()}
        onClose={handleCloseDelete}
      />

      {/* Feedback Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={toast.severity}
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          sx={{ width: "100%", boxShadow: 3 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </>
  );
}
