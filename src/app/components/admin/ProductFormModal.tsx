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
  Chip,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { PRODUCT_CATEGORIES } from "@/lib/constants";
import { getProductImageUrls, MAX_PRODUCT_IMAGES, type ProductImage } from "@/lib/productImages";

export interface ProductFormData {
  _id?: string;
  name: string;
  category: string;
  price: number | string;
  quantity: number | string;
  rating: number | string;
  description: string;
  image: string;
  images?: ProductImage[];
  image_public_id?: string;
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
  images: [],
  featured: false,
};

export default function ProductFormModal({
  open,
  onClose,
  onSuccess,
  productToEdit,
}: ProductFormModalProps) {
  const [formData, setFormData] = useState<ProductFormData>(initialFormState);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (productToEdit) {
      const existingImages = getProductImageUrls(productToEdit);
      setFormData({
        _id: productToEdit._id,
        name: productToEdit.name || "",
        category: productToEdit.category || "",
        price: productToEdit.price !== undefined && productToEdit.price !== null ? productToEdit.price : "",
        quantity: productToEdit.quantity !== undefined && productToEdit.quantity !== null ? productToEdit.quantity : "",
        rating: productToEdit.rating !== undefined && productToEdit.rating !== null ? productToEdit.rating : 5,
        description: productToEdit.description || "",
        image: existingImages[0] || productToEdit.image || "",
        images: productToEdit.images,
        featured: Boolean(productToEdit.featured),
      });
      setSelectedImages(existingImages);
    } else {
      setFormData(initialFormState);
      setSelectedImages([]);
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

  const processFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const remaining = MAX_PRODUCT_IMAGES - selectedImages.length;

    if (remaining <= 0) {
      setErrorMsg(`You can upload up to ${MAX_PRODUCT_IMAGES} images.`);
      return;
    }

    const toAdd = fileArray.slice(0, remaining);
    let pending = toAdd.length;
    const newImages: string[] = [];

    toAdd.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        setErrorMsg("Please upload valid image files (JPEG, PNG, WebP).");
        pending -= 1;
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg("Each image must be under 5MB.");
        pending -= 1;
        return;
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        newImages.push(reader.result as string);
        pending -= 1;
        if (pending === 0) {
          setErrorMsg("");
          setSelectedImages((prev) => [...prev, ...newImages].slice(0, MAX_PRODUCT_IMAGES));
        }
      };
      reader.onerror = () => {
        pending -= 1;
        setErrorMsg("Failed to read one or more image files.");
      };
    });
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      processFiles(e.target.files);
      e.target.value = "";
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

    if (e.dataTransfer.files?.length) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= selectedImages.length) return;
    setSelectedImages((prev) => {
      const next = [...prev];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
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

    if (!selectedImages.length) {
      setErrorMsg("Please upload at least one product image.");
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
          images: selectedImages,
          image: selectedImages[0],
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

            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Product Images ({selectedImages.length}/{MAX_PRODUCT_IMAGES})
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
                The first image is used as the listing thumbnail. Drag order with arrows to reorder.
              </Typography>

              {selectedImages.length > 0 && (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
                    gap: 1.5,
                    mb: 2,
                  }}
                >
                  {selectedImages.map((src, index) => (
                    <Box
                      key={`${src.slice(0, 32)}-${index}`}
                      sx={{
                        position: "relative",
                        borderRadius: 2,
                        overflow: "hidden",
                        border: index === 0 ? "2px solid #febe4c" : "1px solid #e2e8f0",
                        backgroundColor: "#fff",
                      }}
                    >
                      <Box
                        component="img"
                        src={src}
                        alt={`Product image ${index + 1}`}
                        sx={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", display: "block" }}
                      />
                      {index === 0 && (
                        <Chip
                          label="Thumbnail"
                          size="small"
                          sx={{
                            position: "absolute",
                            top: 6,
                            left: 6,
                            height: 22,
                            fontSize: "0.65rem",
                            fontWeight: 700,
                            backgroundColor: "#febe4c",
                            color: "#1e293b",
                          }}
                        />
                      )}
                      <Box
                        sx={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          display: "flex",
                          flexDirection: "column",
                          gap: 0.5,
                        }}
                      >
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveImage(index);
                          }}
                          sx={{
                            backgroundColor: "rgba(0,0,0,0.6)",
                            color: "#fff",
                            "&:hover": { backgroundColor: "rgba(239, 68, 68, 0.9)" },
                          }}
                          title="Remove image"
                        >
                          <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Box>
                      <Box sx={{ display: "flex", justifyContent: "center", gap: 0.5, p: 0.5, bgcolor: "#f8fafc" }}>
                        <IconButton
                          size="small"
                          disabled={index === 0}
                          onClick={() => moveImage(index, -1)}
                          title="Move earlier (toward thumbnail)"
                        >
                          <ArrowBackIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                        <IconButton
                          size="small"
                          disabled={index === selectedImages.length - 1}
                          onClick={() => moveImage(index, 1)}
                          title="Move later"
                        >
                          <ArrowForwardIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}

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
                  multiple
                  onChange={handleFileInputChange}
                  style={{ display: "none" }}
                />

                <CloudUploadIcon sx={{ fontSize: 44, color: isDragging ? "primary.main" : "#94a3b8", mb: 1 }} />
                <Typography variant="body1" sx={{ fontWeight: 600, color: "#1e293b" }}>
                  {isDragging ? "Drop images here" : "Drag & drop images here"}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  or{" "}
                  <Box component="span" sx={{ color: "primary.main", fontWeight: 600, textDecoration: "underline" }}>
                    browse
                  </Box>{" "}
                  from your computer (max 5MB each, up to {MAX_PRODUCT_IMAGES} images)
                </Typography>
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
