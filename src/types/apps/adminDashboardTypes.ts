/** Admin dashboard + payments admin types */

export type AdminDashboardLowStockProduct = {
  _id: string;
  name: string;
  category?: string;
  price: number;
  quantity: number;
  image?: string;
  rating?: number;
  description?: string;
  featured?: boolean;
};

export type AdminDashboardSalesTrendPoint = {
  name: string;
  revenue: number;
  orders: number;
};

export type AdminDashboardCategoryDistPoint = {
  name: string;
  count: number;
  stock: number;
};

export type AdminDashboardOrderStatusPoint = {
  status: string;
  count: number;
  value: number;
};

export type AdminDashboardPaymentBreakdownPoint = {
  status: string;
  count: number;
  value: number;
};

export type AdminDashboardRecentOrder = {
  _id: string;
  customer_name?: string;
  customer_email?: string;
  total_amount: number;
  status: string;
  created_at?: string;
};

export type AdminDashboardRecentUser = {
  _id: string;
  userName?: string;
  email: string;
  role?: string;
  created_at?: string;
};

export type AdminDashboardStatsType = {
  totalProducts: number;
  totalUsers: number;
  totalOrders: number;
  totalEarnings: number;
  lowStockCount?: number;
  outOfStockCount?: number;
  lowStockProducts?: AdminDashboardLowStockProduct[];
  salesTrend?: AdminDashboardSalesTrendPoint[];
  categoryDistribution?: AdminDashboardCategoryDistPoint[];
  orderStatusBreakdown?: AdminDashboardOrderStatusPoint[];
  paymentBreakdown?: AdminDashboardPaymentBreakdownPoint[];
  recentOrders?: AdminDashboardRecentOrder[];
  recentUsers?: AdminDashboardRecentUser[];
};

export type AdminPaymentRecordType = {
  _id: string;
  customer_name: string;
  customer_email: string;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  order_status: string;
  safepay_tracker?: string | null;
  paid_at?: string;
  created_at?: string;
};

export type AdminPaymentStatsType = {
  onlineRevenue: number;
  paidOnlineCount: number;
  failedCount: number;
  awaitingCount: number;
  codRevenue: number;
  codCount: number;
  successRate: number;
  onlineAttempts: number;
};

export const CATEGORY_COLORS = ["#0284c7", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

export const STATUS_COLORS: Record<string, string> = {
  delivered: "#10b981",
  shipped: "#0284c7",
  pending: "#f59e0b",
  cancelled: "#ef4444",
};

export const PAYMENT_COLORS: Record<string, string> = {
  "paid online": "#10b981",
  cod: "#64748b",
  awaiting: "#f59e0b",
  failed: "#ef4444",
};

/** Backward-compatible aliases (existing imports) */
export type LowStockProduct = AdminDashboardLowStockProduct;
export type SalesTrendPoint = AdminDashboardSalesTrendPoint;
export type CategoryDistPoint = AdminDashboardCategoryDistPoint;
export type OrderStatusPoint = AdminDashboardOrderStatusPoint;
export type PaymentBreakdownPoint = AdminDashboardPaymentBreakdownPoint;
export type RecentOrder = AdminDashboardRecentOrder;
export type RecentUser = AdminDashboardRecentUser;
export type AdminDashboardStats = AdminDashboardStatsType;
export type AdminPaymentRecord = AdminPaymentRecordType;
export type AdminPaymentStats = AdminPaymentStatsType;
