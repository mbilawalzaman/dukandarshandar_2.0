"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { PRODUCT_CATEGORIES } from "@/lib/constants";

export interface ProductFormData {
  _id?: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  rating: number;
  description: string;
  image: string;
  featured?: boolean;
}

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  productToEdit?: ProductFormData | null;
}

const initialFormState: ProductFormData = {
  name: "",
  category: "",
  price: 0,
  quantity: 0,
  rating: 5,
  description: "",
  image: "",
  featured: false,
};

export default function ProductFormModal({
  open,
  onClose,
  onSuccess,
  productToEdit,
}: ProductFormModalProps) {
  const [formData, setFormData] = useState<ProductFormData>(initialFormState);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (productToEdit) {
      setFormData({
        _id: productToEdit._id,
        name: productToEdit.name || "",
        category: productToEdit.category || "",
        price: productToEdit.price || 0,
        quantity: productToEdit.quantity || 0,
        rating: productToEdit.rating || 5,
        description: productToEdit.description || "",
        image: productToEdit.image || "",
        featured: Boolean(productToEdit.featured),
      });
      setSelectedImage(productToEdit.image || "");
    } else {
      setFormData(initialFormState);
      setSelectedImage("");
    }
    setErrorMsg("");
  }, [productToEdit, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "price" || name === "quantity" || name === "rating" ? Number(value) : value,
    }));
  };

  const handleBase64 = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("Image must be under 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      setSelectedImage(result);
      setFormData((prev) => ({ ...prev, image: result }));
    };
    reader.onerror = (error) => console.error("Error reading image:", error);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!formData.name || !formData.category || !formData.price || !formData.description) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }

    if (!selectedImage && !formData.image) {
      setErrorMsg("Please upload a product image.");
      return;
    }

    try {
      setSubmitting(true);
      const isEdit = Boolean(formData._id);
      const url = isEdit ? `/api/products/${formData._id}` : "/api/products/upload";
      const method = isEdit ? "PUT" : "POST";

      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...formData,
          image: selectedImage || formData.image,
          created_by: "admin",
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMsg(data.message || "Failed to save product.");
      }
    } catch (err) {
      console.error("Error submitting product:", err);
      setErrorMsg("An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {formData._id ? "Edit Product" : "Add New Product"}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          {errorMsg && (
            <Typography color="error" variant="body2" sx={{ mb: 2 }}>
              {errorMsg}
            </Typography>
          )}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Product Name *"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Category *</InputLabel>
                <Select
                  name="category"
                  label="Category *"
                  value={formData.category}
                  onChange={(e) => setFormData((prev) => ({ ...prev, category: String(e.target.value) }))}
                >
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Price (PKR) *"
                name="price"
                value={formData.price}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Quantity *"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Rating (0 - 5)"
                name="rating"
                inputProps={{ min: 0, max: 5, step: 0.5 }}
                value={formData.rating}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description *"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={Boolean(formData.featured)}
                    onChange={(e) => setFormData((prev) => ({ ...prev, featured: e.target.checked }))}
                  />
                }
                label="Feature this product on the Blog page"
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ border: "2px dashed #cbd5e1", borderRadius: 2, p: 3, textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Drag & drop an image, or click to choose file
                </Typography>
                <input
                  accept="image/*"
                  type="file"
                  onChange={handleBase64}
                  style={{ display: "block", margin: "0 auto" }}
                />
                {selectedImage && (
                  <Box sx={{ mt: 2, display: "flex", justifyContent: "center" }}>
                    <Box
                      component="img"
                      src={selectedImage}
                      alt="Preview"
                      sx={{ width: 120, height: 120, objectFit: "cover", borderRadius: 1 }}
                    />
                  </Box>
                )}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} color="inherit" disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" color="primary" disabled={submitting}>
            {submitting ? "Saving..." : formData._id ? "Update Product" : "Save Product"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
