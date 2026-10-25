export interface ProductCategoryDocument {
  _id: string;
  name: string;
  isActive?: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface CategoryDetailItem {
  id: string;
  name: string;
  productCount: number;
  isActive: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface CategoryListResponse {
  success: true;
  categories: string[];
  categoryDetails?: CategoryDetailItem[];
  total?: number;
  nextCursor: string | null;
}

export interface CategoryCreateResponse {
  success: true;
  name: string;
  category?: CategoryDetailItem;
}

export interface CategoryMutationResponse {
  success: boolean;
  message?: string;
  name?: string;
  category?: CategoryDetailItem;
  productsAffected?: number;
}

export interface CategoryErrorResponse {
  success: false;
  message: string;
}

export interface CategoryStoreState {
  categories: string[];
  loading: boolean;
  error: string | null;
}
