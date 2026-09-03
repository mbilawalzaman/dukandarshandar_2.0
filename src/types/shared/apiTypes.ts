/**
 * Shared API response shapes for Dukandar Shandar.
 * Prefer these over ad-hoc `{ success, message }` inline types.
 */

export type ApiSuccessStatus = true;
export type ApiFailureStatus = false;

export type ApiSuccessResponse<T = unknown> = {
  success: ApiSuccessStatus;
  message?: string;
  data?: T;
  token?: string;
};

export type ApiErrorResponse = {
  success: ApiFailureStatus;
  message: string;
  error?: string;
};

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

export type PaginatedMeta = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export type PaginatedResponse<T> = {
  success: true;
  items: T[];
  pagination: PaginatedMeta;
  message?: string;
};
