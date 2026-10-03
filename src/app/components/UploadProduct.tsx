"use client";

import { useState } from "react";

import Image from "next/image";

interface Product {
  _id: string;
  name: string;
  category: string;
  price: number; // ✅ Allow any number
  quantity: number; // ✅ Allow any number
  rating: number;
  ratings: number[];
  image: string;
  description: string;
  created_by: string;
}

interface UploadProductProps {
  onProductUpload: () => void; // ✅ Define the prop type
}

const UploadProduct: React.FC<UploadProductProps> = ({ onProductUpload }) => {
  const [selectedImage, setSelectedImage] = useState<string>("");

  const [product, setProduct] = useState<Product>({
    _id: "", // Default empty string, will be assigned by the database
    name: "",
    category: "",
    price: 0, // Should be a number
    quantity: 0, // Should be a number
    rating: 0,
    ratings: [], // Empty array for ratings
    image: "",
    description: "",
    created_by: "",
  });

  const handleBase64 = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.readAsDataURL(file);
    reader.onload = () => setSelectedImage(reader.result as string);
    reader.onerror = (error) => console.error("Error:", error);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProduct({ ...product, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedImage) {
      alert("Please upload an image");

      return;
    }

    try {
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("token"); // Fetch JWT from storage

        const response = await fetch("/api/products/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`, // 🔥 Add this line
          },
          body: JSON.stringify({ ...product, image: selectedImage }),
        });

        const data = await response.json();

        if (data.success) {
          alert("Product added successfully!");
          onProductUpload();
          setProduct({
            _id: "", // ✅ Reset ID
            name: "",
            category: "",
            price: 0, // ✅ Ensure it's a number
            quantity: 0, // ✅ Ensure it's a number
            description: "",
            rating: 0,
            ratings: [], // ✅ Reset ratings array
            image: "", // ✅ Reset image
            created_by: "admin", // ✅ Reset created_by
          });
          setSelectedImage("");
        } else {
          alert("Error: " + data.message);
        }
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-white shadow-lg rounded-lg">
      <h2 className="text-xl font-semibold mb-4">Upload Product</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          name="name"
          placeholder="Product Name"
          value={product.name}
          onChange={handleInputChange}
          required
          className="w-full p-2 border rounded"
        />
        <input
          type="text"
          name="description"
          placeholder="Description"
          value={product.description}
          onChange={handleInputChange}
          required
          className="w-full p-2 border rounded"
        />
        <input
          type="text"
          name="category"
          placeholder="Category"
          value={product.category}
          onChange={handleInputChange}
          required
          className="w-full p-2 border rounded"
        />
        <input
          type="number"
          name="price"
          placeholder="Price"
          value={product.price}
          onChange={handleInputChange}
          required
          className="w-full p-2 border rounded"
        />
        <input
          type="number"
          name="quantity"
          placeholder="Quantity"
          value={product.quantity}
          onChange={handleInputChange}
          required
          className="w-full p-2 border rounded"
        />
        <input
          type="number"
          name="rating"
          placeholder="Rating"
          value={product.rating}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
        />

        <div className="upload-box border p-4 rounded">
          <label
            htmlFor="image-upload"
            className="upload-label block text-center cursor-pointer"
          >
            <p className="text-gray-600">
              Drag and drop an image or click here to upload
            </p>
          </label>
          <input
            accept="image/*"
            type="file"
            id="image-upload"
            onChange={handleBase64}
            className="hidden"
          />
        </div>

        {selectedImage && (
          <Image
            src={selectedImage}
            alt="Preview"
            width={96} // 24 * 4 (tailwind w-24)
            height={96} // 24 * 4 (tailwind h-24)
            className="w-24 h-24 object-cover mt-2"
          />
        )}

        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
        >
          Upload Product
        </button>
      </form>
    </div>
  );
};

export default UploadProduct;
