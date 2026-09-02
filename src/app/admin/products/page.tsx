"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Box, Button, Typography, Chip, Rating, Tabs, Tab, Paper } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import InventoryIcon from "@mui/icons-material/Inventory";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import AdminDataTable, { ColumnDef } from "../../components/admin/AdminDataTable";
import ProductFormModal, { ProductFormData } from "../../components/admin/ProductFormModal";
import ConfirmDeleteModal from "../../components/admin/ConfirmDeleteModal";
import Image from "next/image";
import { getProductThumbnail } from "@/lib/productImages";

interface Product {
  _id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  rating: number;
  description: string;
  image: string;
  images?: { url: string; publicId?: string }[];
  featured?: boolean;
}

interface StockCounts {
  inStock: number;
  lowStock: number;
  outOfStock: number;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [stockFilter, setStockFilter] = useState<"all" | "in-stock" | "low-stock" | "out-of-stock">("all");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [stockCounts, setStockCounts] = useState<StockCounts>({ inStock: 0, lowStock: 0, outOfStock: 0 });
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductFormData | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page + 1),
        limit: String(rowsPerPage),
      });
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      if (stockFilter !== "all") params.set("stock", stockFilter);

      const res = await fetch(`/api/products?${params.toString()}`);
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

  const handleStockFilterChange = (_: React.SyntheticEvent, val: typeof stockFilter) => {
    setStockFilter(val);
    setPage(0);
  };

  const handleOpenAddModal = () => {
    setSelectedProduct(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setSelectedProduct(product);
    setIsFormModalOpen(true);
  };

  const handleOpenDeleteModal = (product: Product) => {
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;
    try {
      setDeleting(true);
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch(`/api/products/${productToDelete._id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchProducts();
        setIsDeleteModalOpen(false);
      } else {
        alert(data.message || "Failed to delete product");
      }
    } catch (err) {
      console.error("Error deleting product:", err);
      alert("Error deleting product.");
    } finally {
      setDeleting(false);
    }
  };

  const columns: ColumnDef<Product>[] = [
    {
      id: "image",
      label: "Image",
      minWidth: 80,
      format: (_val, row) => (
        <Box sx={{ width: 48, height: 48, position: "relative", borderRadius: 1, overflow: "hidden" }}>
          <Image src={getProductThumbnail(row)} alt="Product" fill style={{ objectFit: "cover" }} unoptimized />
        </Box>
      ),
    },
    { id: "name", label: "Product Name", minWidth: 160 },
    {
      id: "category",
      label: "Category",
      minWidth: 120,
      format: (val) => <Chip label={String(val || "General")} size="small" color="primary" variant="outlined" />,
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
            label={qty <= 0 ? "0 (Out of stock)" : qty <= 5 ? `${qty} (Low stock)` : String(qty)}
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
      format: (val) => <Rating value={Number(val) || 0} precision={0.5} size="small" readOnly />,
    },
    {
      id: "actions",
      label: "Actions",
      minWidth: 120,
      align: "center",
    },
  ];

  const totalAll = stockCounts.inStock + stockCounts.lowStock + stockCounts.outOfStock;

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: "#0f172a" }}>
            Products Inventory Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            View real-time stock levels, update inventory, add, edit, or remove catalog items.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenAddModal}
          sx={{ borderRadius: 2, px: 3, py: 1.2, fontWeight: 600, backgroundColor: "#0284c7" }}
        >
          Add Product
        </Button>
      </Box>

      <Paper sx={{ mb: 3, borderRadius: 2.5, border: "1px solid #e2e8f0" }} elevation={0}>
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
        onEdit={handleOpenEditModal}
        onDelete={handleOpenDeleteModal}
        loading={loading}
        serverPagination={{
          total,
          page,
          rowsPerPage,
          searchTerm,
          onPageChange: setPage,
          onRowsPerPageChange: (next) => {
            setRowsPerPage(next);
            setPage(0);
          },
          onSearchChange: (term) => {
            setSearchTerm(term);
            setPage(0);
          },
        }}
      />

      <ProductFormModal
        open={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={fetchProducts}
        productToEdit={selectedProduct}
      />

      <ConfirmDeleteModal
        open={isDeleteModalOpen}
        title="Delete Product"
        message={`Are you sure you want to delete "${productToDelete?.name}"?`}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        loading={deleting}
      />
    </Box>
  );
}
