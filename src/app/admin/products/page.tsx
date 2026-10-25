"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

import Image from "next/image";

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
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CategoryIcon from "@mui/icons-material/Category";
import InventoryIcon from "@mui/icons-material/Inventory";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

import type { ColumnDef } from "../../components/admin/AdminDataTable";
import AdminDataTable from "../../components/admin/AdminDataTable";
import type { ProductFormData } from "../../components/admin/ProductFormModal";
import ProductFormModal from "../../components/admin/ProductFormModal";
import ConfirmDeleteModal from "../../components/admin/ConfirmDeleteModal";
import CategoryManagerModal from "../../components/admin/CategoryManagerModal";
import { authFetch } from "@/lib/authFetch";
import { BRAND } from "@/lib/uiBrand";
import { getProductThumbnail } from "@/lib/productImages";

import type { Product, StockCounts } from "@/types/apps/productTypes";

export default function AdminProductsPage(): React.JSX.Element {
  const [categoryOpen, setCategoryOpen] = useState(false);

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
  const [isProductReadOnly, setIsProductReadOnly] = useState(false);

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
    setIsProductReadOnly(false);
    setSelectedProduct(null);
    setIsFormModalOpen(true);
  }, []);

  const handleOpenEditModal = useCallback((product: Product): void => {
    setIsProductReadOnly(false);
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
        minWidth: 120,
        format: (val, row) => {
          const regularPrice = Number(val) || 0;

          const discountAmount =
            typeof row.discountPrice === "number" &&
            row.discountPrice > 0 &&
            row.discountPrice < regularPrice
              ? row.discountPrice
              : null;

          if (discountAmount !== null) {
            const salePrice = regularPrice - discountAmount;

            return (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                <Typography
                  component="span"
                  sx={{
                    fontWeight: 700,
                    color: "#dc2626",
                    fontSize: "0.875rem",
                  }}
                >
                  PKR {salePrice.toLocaleString()}
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    fontSize: "0.75rem",
                    color: "text.secondary",
                    textDecoration: "line-through",
                  }}
                >
                  PKR {regularPrice.toLocaleString()}
                </Typography>
              </Box>
            );
          }

          return (
            <Typography
              component="span"
              sx={{ fontWeight: 600, fontSize: "0.875rem" }}
            >
              PKR {regularPrice.toLocaleString()}
            </Typography>
          );
        },
      },
      {
        id: "discountPrice",
        label: "Discount (Off)",
        minWidth: 110,
        format: (val) => {
          const num = Number(val);

          return val !== undefined && val !== null && !isNaN(num) && num > 0
            ? `-PKR ${num.toLocaleString()}`
            : "—";
        },
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

  const handleViewProduct = useCallback((product: Product): void => {
    setSelectedProduct(product);
    setIsProductReadOnly(true);
    setIsFormModalOpen(true);
  }, []);

  const handleRowsPerPageChange = useCallback((next: number): void => {
    setRowsPerPage(next);
    setPage(0);
  }, []);

  const handleSearchChange = useCallback((term: string): void => {
    setSearchTerm(term);
    setPage(0);
  }, []);

  const handleOpenCategory = useCallback((): void => {
    setCategoryOpen(true);
  }, []);

  const handleCloseCategory = useCallback((): void => {
    setCategoryOpen(false);
  }, []);

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
            startIcon={<CategoryIcon />}
            onClick={handleOpenCategory}
            sx={{ borderRadius: 2, color: BRAND.navy, borderColor: BRAND.gold }}
          >
            Manage Categories
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

      <CategoryManagerModal
        open={categoryOpen}
        onClose={handleCloseCategory}
        onCategoryChanged={fetchProducts}
      />

      <ProductFormModal
        open={isFormModalOpen}
        onClose={handleCloseProductForm}
        onSuccess={fetchProducts}
        productToEdit={selectedProduct}
        readOnly={isProductReadOnly}
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
