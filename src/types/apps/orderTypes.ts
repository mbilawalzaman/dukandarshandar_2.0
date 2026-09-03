import type { PaymentMethod } from "@/types/apps/paymentTypes";

export type { PaymentMethod };

export type OrderStatusType =
  | "pending"
  | "pending_payment"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | string;

export type OrderItemType = {
  _id?: string;
  name: string;
  quantity: number;
  price: number;
  image?: string;
};

export type OrderType = {
  _id: string;
  customer_name: string;
  customer_email?: string;
  customer_id?: string | null;
  phone?: string;
  address?: string;
  city?: string;
  total_amount: number;
  subtotal?: number;
  shipping?: number;
  delivery_promo?: boolean;
  status: OrderStatusType;
  payment_status?: string;
  payment_method?: PaymentMethod | string;
  created_at?: string;
  updated_at?: string;
  items: OrderItemType[];
};

export type OrderTypeWithAction = OrderType & {
  action?: string;
};

export type CheckoutShippingFormType = {
  customer_name: string;
  customer_email: string;
  phone: string;
  address: string;
  city: string;
};
