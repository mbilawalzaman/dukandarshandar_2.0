export interface LowStockProduct {
  _id: string;
  name: string;
  category?: string;
  price: number;
  quantity: number;
  image?: string;
  rating?: number;
  description?: string;
  featured?: boolean;
}

export interface SalesTrendPoint {
  name: string;
  revenue: number;
  orders: number;
}

export interface CategoryDistPoint {
  name: string;
  count: number;
  stock: number;
}

export interface OrderStatusPoint {
  status: string;
  count: number;
  value: number;
}

export interface RecentOrder {
  _id: string;
  customer_name?: string;
  customer_email?: string;
  total_amount: number;
  status: string;
  created_at?: string;
}

export interface RecentUser {
  _id: string;
  userName?: string;
  email: string;
  role?: string;
  created_at?: string;
}

export interface AdminDashboardStats {
  totalProducts: number;
  totalUsers: number;
  totalOrders: number;
  totalEarnings: number;
  lowStockCount?: number;
  outOfStockCount?: number;
  lowStockProducts?: LowStockProduct[];
  salesTrend?: SalesTrendPoint[];
  categoryDistribution?: CategoryDistPoint[];
  orderStatusBreakdown?: OrderStatusPoint[];
  recentOrders?: RecentOrder[];
  recentUsers?: RecentUser[];
}

export const CATEGORY_COLORS = ["#0284c7", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

export const STATUS_COLORS: Record<string, string> = {
  delivered: "#10b981",
  shipped: "#0284c7",
  pending: "#f59e0b",
  cancelled: "#ef4444",
};
