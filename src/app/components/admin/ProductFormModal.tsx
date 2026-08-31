"use client";

import React, { useState, useEffect, useRef } from "react";
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
  IconButton,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { PRODUCT_CATEGORIES } from "@/lib/constants";

export interface ProductFormData {
  _id?: string;
  name: string;
  category: string;
  price: number | string;
  quantity: number | string;
  rating: number | string;
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
  price: "",
  quantity: "",
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
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (productToEdit) {
      setFormData({
        _id: productToEdit._id,
        name: productToEdit.name || "",
        category: productToEdit.category || "",
        price: productToEdit.price !== undefined && productToEdit.price !== null ? productToEdit.price : "",
        quantity: productToEdit.quantity !== undefined && productToEdit.quantity !== null ? productToEdit.quantity : "",
        rating: productToEdit.rating !== undefined && productToEdit.rating !== null ? productToEdit.rating : 5,
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
    setIsDragging(false);
  }, [productToEdit, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please upload a valid image file (JPEG, PNG, WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("Image must be under 5MB.");
      return;
    }

    setErrorMsg("");
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      setSelectedImage(result);
      setFormData((prev) => ({ ...prev, image: result }));
    };
    reader.onerror = (error) => {
      console.error("Error reading image:", error);
      setErrorMsg("Failed to read image file.");
    };
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedImage("");
    setFormData((prev) => ({ ...prev, image: "" }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const priceNum = Number(formData.price);
    const qtyNum = Number(formData.quantity);
    const ratingNum = formData.rating !== "" ? Number(formData.rating) : 5;

    if (!formData.name.trim() || !formData.category || isNaN(priceNum) || priceNum <= 0 || !formData.description.trim()) {
      setErrorMsg("Please fill in all required fields with valid values.");
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
          name: formData.name.trim(),
          price: priceNum,
          quantity: isNaN(qtyNum) || qtyNum < 0 ? 0 : qtyNum,
          rating: isNaN(ratingNum) ? 5 : ratingNum,
          description: formData.description.trim(),
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
                label="Product Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Category</InputLabel>
                <Select
                  name="category"
                  label="Category"
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
                label="Price (PKR)"
                name="price"
                inputProps={{ min: 0, step: "any" }}
                value={formData.price}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Quantity"
                name="quantity"
                inputProps={{ min: 0, step: 1 }}
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
                label="Description"
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
                label="Feature this product (Featured / Top Product)"
              />
            </Grid>

            {/* Enhanced Drag & Drop Area */}
            <Grid item xs={12}>
              <Box
                onDragOver={handleDragOver}
                onDragEnter={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  border: isDragging ? "2px dashed #febe4c" : "2px dashed #cbd5e1",
                  backgroundColor: isDragging ? "rgba(254, 190, 76, 0.08)" : "#fafafa",
                  borderRadius: 2.5,
                  p: 3,
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    borderColor: "#febe4c",
                    backgroundColor: "rgba(254, 190, 76, 0.04)",
                  },
                }}
              >
                <input
                  ref={fileInputRef}
                  accept="image/*"
                  type="file"
                  onChange={handleFileInputChange}
                  style={{ display: "none" }}
                />

                {selectedImage ? (
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5 }}>
                    <Box
                      sx={{
                        position: "relative",
                        display: "inline-block",
                        borderRadius: 2,
                        overflow: "hidden",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                      }}
                    >
                      <Box
                        component="img"
                        src={selectedImage}
                        alt="Preview"
                        sx={{
                          width: 140,
                          height: 140,
                          objectFit: "contain",
                          backgroundColor: "#ffffff",
                          display: "block",
                        }}
                      />
                      <IconButton
                        size="small"
                        onClick={handleRemoveImage}
                        sx={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          backgroundColor: "rgba(0,0,0,0.6)",
                          color: "#fff",
                          "&:hover": { backgroundColor: "rgba(239, 68, 68, 0.9)" },
                        }}
                        title="Remove image"
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Click or drop another image to replace
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ py: 1 }}>
                    <CloudUploadIcon sx={{ fontSize: 44, color: isDragging ? "primary.main" : "#94a3b8", mb: 1 }} />
                    <Typography variant="body1" sx={{ fontWeight: 600, color: "#1e293b" }}>
                      {isDragging ? "Drop image here" : "Drag & drop an image here"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      or <Box component="span" sx={{ color: "primary.main", fontWeight: 600, textDecoration: "underline" }}>browse</Box> from your computer (max 5MB)
                    </Typography>
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
