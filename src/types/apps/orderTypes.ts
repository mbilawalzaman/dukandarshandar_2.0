import type { PaymentMethod } from "@/types/apps/paymentTypes";
import type { OrderDiscountLine } from "@/types/apps/promotionTypes";

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
  /** unit price charged (after item-level promotions) */
  price: number;
  original_price?: number;
  line_discount?: number;
  applied_promotion_ids?: string[];
  image?: string;
};

export type OrderType = {
  _id: string;
  customer_name: string;
  customer_email?: string;
  customer_id?: string | null;
  phone?: string;
  province?: string;
  city?: string;
  area?: string;
  address?: string;
  total_amount: number;
  subtotal?: number;
  shipping?: number;
  delivery_promo?: boolean;
  discounts?: OrderDiscountLine[];
  discount_total?: number;
  /** legacy: voucher only */
  discount_code?: string | null;
  discount_amount?: number;
  promotions_recorded?: boolean;
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
  province?: string;
  city: string;
  area?: string;
  address: string;
};
