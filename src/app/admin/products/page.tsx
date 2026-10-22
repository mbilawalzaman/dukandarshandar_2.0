"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

import Image from "next/image";
import { useRouter } from "next/navigation";

import {
  Box,
  Button,
  Typography,
  Chip,
  Rating,
  Tabs,
  Tab,
  Paper,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import InventoryIcon from "@mui/icons-material/Inventory";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

import type { ColumnDef } from "../../components/admin/AdminDataTable";
import AdminDataTable from "../../components/admin/AdminDataTable";
import type { ProductFormData } from "../../components/admin/ProductFormModal";
import ProductFormModal from "../../components/admin/ProductFormModal";
import ConfirmDeleteModal from "../../components/admin/ConfirmDeleteModal";
import { authFetch } from "@/lib/authFetch";
import { BRAND } from "@/lib/uiBrand";
import { getProductThumbnail } from "@/lib/productImages";

import type { Product, StockCounts } from "@/types/apps/productTypes";
import { refreshProductCategories } from "@/lib/productCategoryStore";

export default function AdminProductsPage(): React.JSX.Element {
  const router = useRouter();
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [stockFilter, setStockFilter] = useState<
    "all" | "in-stock" | "low-stock" | "out-of-stock"
  >("all");

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [total, setTotal] = useState(0);

  const [stockCounts, setStockCounts] = useState<StockCounts>({
    inStock: 0,
    lowStock: 0,
    outOfStock: 0,
  });

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

  const [selectedProduct, setSelectedProduct] =
    useState<ProductFormData | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "warning" | "info";
  }>({
    open: false,
    message: "",
    severity: "info",
  });

  const handleAddCategory = useCallback(
    async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      setSavingCategory(true);
      setCategoryError("");

      try {
        const response = await authFetch("/api/categories", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: categoryName }),
        });

        const data: unknown = await response.json();

        if (
          !response.ok ||
          typeof data !== "object" ||
          data === null ||
          !("success" in data) ||
          data.success !== true
        ) {
          const message =
            typeof data === "object" &&
            data !== null &&
            "message" in data &&
            typeof data.message === "string"
              ? data.message
              : "Unable to create category";

          throw new Error(message);
        }

        void refreshProductCategories();
        setCategoryOpen(false);
        setCategoryName("");
        setToast({
          open: true,
          message: "Category added successfully",
          severity: "success",
        });
      } catch (error) {
        console.error("Failed to add category:", error);
        setCategoryError(
          error instanceof Error ? error.message : "Unable to create category",
        );
      } finally {
        setSavingCategory(false);
      }
    },
    [categoryName],
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchProducts = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: String(page + 1),
        limit: String(rowsPerPage),
      });

      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      if (stockFilter !== "all") params.set("stock", stockFilter);

      const res = await authFetch(`/api/products?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setProducts(data.products || []);
        setTotal(data.pagination?.total ?? 0);
        if (data.stockCounts) setStockCounts(data.stockCounts);
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, debouncedSearch, stockFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleStockFilterChange = useCallback(
    (_: React.SyntheticEvent, val: typeof stockFilter): void => {
      setStockFilter(val);
      setPage(0);
    },
    [],
  );

  const handleOpenAddModal = useCallback((): void => {
    setSelectedProduct(null);
    setIsFormModalOpen(true);
  }, []);

  const handleOpenEditModal = useCallback((product: Product): void => {
    setSelectedProduct(product);
    setIsFormModalOpen(true);
  }, []);

  const handleOpenDeleteModal = useCallback((product: Product): void => {
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async (): Promise<void> => {
    if (!productToDelete) return;

    try {
      setDeleting(true);

      const res = await authFetch(`/api/products/${productToDelete._id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (res.ok && data.success) {
        fetchProducts();
        setIsDeleteModalOpen(false);
      } else {
        setToast({
          open: true,
          message: data.message || "Failed to delete product",
          severity: "error",
        });
      }
    } catch (err) {
      console.error("Error deleting product:", err);
      setToast({
        open: true,
        message: "Error deleting product.",
        severity: "error",
      });
    } finally {
      setDeleting(false);
    }
  }, [productToDelete, fetchProducts]);

  const columns = useMemo<ColumnDef<Product>[]>(
    () => [
      {
        id: "image",
        label: "Image",
        minWidth: 80,
        format: (_val, row) => (
          <Box
            sx={{
              width: 48,
              height: 48,
              position: "relative",
              borderRadius: 1,
              overflow: "hidden",
            }}
          >
            <Image
              src={getProductThumbnail(row)}
              alt="Product"
              fill
              style={{ objectFit: "cover" }}
              unoptimized
            />
          </Box>
        ),
      },
      { id: "name", label: "Product Name", minWidth: 160 },
      {
        id: "category",
        label: "Category",
        minWidth: 120,
        format: (val) => (
          <Chip
            label={String(val || "General")}
            size="small"
            color="primary"
            variant="outlined"
          />
        ),
      },
      {
        id: "price",
        label: "Price",
        minWidth: 100,
        format: (val) => `PKR ${Number(val).toLocaleString()}`,
      },
      {
        id: "quantity",
        label: "Stock Qty",
        minWidth: 90,
        align: "center",
        format: (val) => {
          const qty = Number(val) || 0;

          return (
            <Chip
              label={
                qty <= 0
                  ? "0 (Out of stock)"
                  : qty <= 5
                    ? `${qty} (Low stock)`
                    : String(qty)
              }
              size="small"
              color={qty > 5 ? "success" : qty > 0 ? "warning" : "error"}
              sx={{ fontWeight: 600 }}
            />
          );
        },
      },
      {
        id: "rating",
        label: "Rating",
        minWidth: 120,
        format: (val) => (
          <Rating
            value={Number(val) || 0}
            precision={0.5}
            size="small"
            readOnly
          />
        ),
      },
      {
        id: "actions",
        label: "Actions",
        minWidth: 120,
        align: "center",
      },
    ],
    [],
  );

  const handleViewProduct = useCallback(
    (product: Product): void => {
      router.push(`/products/${product._id}`);
    },
    [router],
  );

  const handleRowsPerPageChange = useCallback((next: number): void => {
    setRowsPerPage(next);
    setPage(0);
  }, []);

  const handleSearchChange = useCallback((term: string): void => {
    setSearchTerm(term);
    setPage(0);
  }, []);

  const handleOpenCategory = useCallback((): void => {
    setCategoryError("");
    setCategoryOpen(true);
  }, []);

  const handleCloseCategory = useCallback((): void => {
    if (!savingCategory) setCategoryOpen(false);
  }, [savingCategory]);

  const handleCategoryNameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      setCategoryName(event.target.value);
    },
    [],
  );

  const handleCloseProductForm = useCallback((): void => {
    setIsFormModalOpen(false);
  }, []);

  const handleCloseDelete = useCallback((): void => {
    setIsDeleteModalOpen(false);
  }, []);

  const handleCloseToast = useCallback((): void => {
    setToast((previous) => ({ ...previous, open: false }));
  }, []);

  const totalAll =
    stockCounts.inStock + stockCounts.lowStock + stockCounts.outOfStock;

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: BRAND.navy }}>
            Products Inventory Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            View real-time stock levels, update inventory, add, edit, or remove
            catalog items.
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleOpenCategory}
            sx={{ borderRadius: 2, color: BRAND.navy, borderColor: BRAND.gold }}
          >
            Add Category
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenAddModal}
            sx={{
              borderRadius: 2,
              px: 3,
              py: 1.2,
              fontWeight: 600,
              backgroundColor: BRAND.gold,
            }}
          >
            Add Product
          </Button>
        </Box>
      </Box>

      <Paper
        sx={{ mb: 3, borderRadius: 2.5, border: "1px solid #e2e8f0" }}
        elevation={0}
      >
        <Tabs
          value={stockFilter}
          onChange={handleStockFilterChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: 1,
            "& .MuiTab-root": {
              fontWeight: 600,
              textTransform: "none",
              fontSize: "0.9rem",
              minHeight: 48,
            },
          }}
        >
          <Tab
            value="all"
            icon={<InventoryIcon fontSize="small" />}
            iconPosition="start"
            label={`All Items (${totalAll})`}
          />
          <Tab
            value="in-stock"
            icon={<CheckCircleOutlineIcon fontSize="small" color="success" />}
            iconPosition="start"
            label={`Healthy Stock (${stockCounts.inStock})`}
          />
          <Tab
            value="low-stock"
            icon={<WarningAmberIcon fontSize="small" color="warning" />}
            iconPosition="start"
            label={`Low Stock ≤ 5 (${stockCounts.lowStock})`}
          />
          <Tab
            value="out-of-stock"
            icon={<ErrorOutlineIcon fontSize="small" color="error" />}
            iconPosition="start"
            label={`Out of Stock (${stockCounts.outOfStock})`}
          />
        </Tabs>
      </Paper>

      <AdminDataTable
        title={
          stockFilter === "low-stock"
            ? "Low Stock Inventory Items"
            : stockFilter === "out-of-stock"
              ? "Out of Stock Items"
              : stockFilter === "in-stock"
                ? "Healthy Stock Items"
                : "All Products Inventory"
        }
        columns={columns}
        data={products}
        searchPlaceholder="Search product by name..."
        onView={handleViewProduct}
        onEdit={handleOpenEditModal}
        onDelete={handleOpenDeleteModal}
        loading={loading}
        serverPagination={{
          total,
          page,
          rowsPerPage,
          searchTerm,
          onPageChange: setPage,
          onRowsPerPageChange: handleRowsPerPageChange,
          onSearchChange: handleSearchChange,
        }}
      />

      <Dialog
        open={categoryOpen}
        onClose={handleCloseCategory}
        fullWidth
        maxWidth="xs"
      >
        <form onSubmit={handleAddCategory}>
          <DialogTitle>Add Category</DialogTitle>
          <DialogContent>
            {categoryError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {categoryError}
              </Alert>
            )}
            <TextField
              autoFocus
              fullWidth
              required
              label="Category name"
              value={categoryName}
              onChange={handleCategoryNameChange}
              inputProps={{ maxLength: 80 }}
              disabled={savingCategory}
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions>
            <Button disabled={savingCategory} onClick={handleCloseCategory}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={savingCategory || !categoryName.trim()}
            >
              {savingCategory ? "Saving…" : "Add Category"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <ProductFormModal
        open={isFormModalOpen}
        onClose={handleCloseProductForm}
        onSuccess={fetchProducts}
        productToEdit={selectedProduct}
      />

      <ConfirmDeleteModal
        open={isDeleteModalOpen}
        title="Delete Product"
        message={`Are you sure you want to delete "${productToDelete?.name}"?`}
        onClose={handleCloseDelete}
        onConfirm={handleDeleteConfirm}
        loading={deleting}
      />

      <Snackbar
        open={toast.open}
        autoHideDuration={5000}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseToast}
          severity={toast.severity}
          variant="filled"
          sx={{ width: "100%", borderRadius: 2 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
