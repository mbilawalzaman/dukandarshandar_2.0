import type { ProductImage } from "@/lib/productImages";

export interface ProductVariation {
  id: string;
  name: string;
  quantity: number;
}

export interface ProductFormData {
  _id?: string;
  name: string;
  category: string;
  price: number | string;
  discountPrice?: number | string | null;
  variations?: ProductVariation[];
  quantity: number | string;
  rating: number | string;
  description: string;
  image: string;
  images?: ProductImage[];
  image_public_id?: string;
  featured?: boolean;
}

export interface Product {
  _id: string;
  name: string;
  category: string;
  price: number;
  discountPrice?: number | null;
  variations?: ProductVariation[];
  quantity: number;
  rating: number;
  description: string;
  image: string;
  images?: { url: string; publicId?: string }[];
  featured?: boolean;
}

export interface StockCounts {
  inStock: number;
  lowStock: number;
  outOfStock: number;
}
