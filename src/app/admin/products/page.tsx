"use client";

import React, { useEffect, useState, useMemo } from "react";
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

interface Product {
  _id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  rating: number;
  description: string;
  image: string;
  featured?: boolean;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [stockFilter, setStockFilter] = useState<"all" | "in-stock" | "low-stock" | "out-of-stock">("all");
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductFormData | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/products");
      const data = await res.json();
      if (data.success) {
        setProducts(data.products || []);
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const inStockCount = useMemo(() => products.filter((p) => p.quantity > 5).length, [products]);
  const lowStockCount = useMemo(() => products.filter((p) => p.quantity > 0 && p.quantity <= 5).length, [products]);
  const outOfStockCount = useMemo(() => products.filter((p) => p.quantity <= 0).length, [products]);

  const filteredProducts = useMemo(() => {
    switch (stockFilter) {
      case "in-stock":
        return products.filter((p) => p.quantity > 5);
      case "low-stock":
        return products.filter((p) => p.quantity > 0 && p.quantity <= 5);
      case "out-of-stock":
        return products.filter((p) => p.quantity <= 0);
      default:
        return products;
    }
  }, [products, stockFilter]);

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
      format: (val) => (
        <Box sx={{ width: 48, height: 48, position: "relative", borderRadius: 1, overflow: "hidden" }}>
          <Image src={String(val || "/images/logo.jpg")} alt="Product" fill style={{ objectFit: "cover" }} unoptimized />
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

      {/* Stock Health Tabs */}
      <Paper sx={{ mb: 3, borderRadius: 2.5, border: "1px solid #e2e8f0" }} elevation={0}>
        <Tabs
          value={stockFilter}
          onChange={(_, val) => setStockFilter(val)}
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
            label={`All Items (${products.length})`}
          />
          <Tab
            value="in-stock"
            icon={<CheckCircleOutlineIcon fontSize="small" color="success" />}
            iconPosition="start"
            label={`Healthy Stock (${inStockCount})`}
          />
          <Tab
            value="low-stock"
            icon={<WarningAmberIcon fontSize="small" color="warning" />}
            iconPosition="start"
            label={`Low Stock ≤ 5 (${lowStockCount})`}
          />
          <Tab
            value="out-of-stock"
            icon={<ErrorOutlineIcon fontSize="small" color="error" />}
            iconPosition="start"
            label={`Out of Stock (${outOfStockCount})`}
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
        data={filteredProducts}
        searchField="name"
        searchPlaceholder="Search product by name..."
        onEdit={handleOpenEditModal}
        onDelete={handleOpenDeleteModal}
        loading={loading}
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
