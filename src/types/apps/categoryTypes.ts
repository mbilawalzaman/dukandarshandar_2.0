export interface ProductCategoryDocument {
  _id: string;
  name: string;
  createdAt: Date;
}

export interface CategoryListResponse {
  success: true;
  categories: string[];
  nextCursor: string | null;
}

export interface CategoryCreateResponse {
  success: true;
  name: string;
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
