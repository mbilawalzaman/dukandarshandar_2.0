"use client";

import React, { useEffect, useState } from "react";
import { Box, Button, Typography, Chip, Rating } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
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
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
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
      format: (val) => (
        <Chip
          label={Number(val)}
          size="small"
          color={Number(val) > 10 ? "success" : Number(val) > 0 ? "warning" : "error"}
        />
      ),
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
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: "#0f172a" }}>
            Products Inventory Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            View, add, edit, or remove catalog items.
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

      <AdminDataTable
        title="Products List"
        columns={columns}
        data={products}
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
