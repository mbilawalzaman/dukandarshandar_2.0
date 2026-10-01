import type { ObjectId } from "mongodb";

export interface PostExStatusHistoryItem {
  statusCode: string;
  statusMessage: string;
  timestamp: Date;
}

export interface PostExShipmentDetails {
  trackingNumber?: string;
  orderType?: "Normal" | "Reversed" | "Replacement";
  orderStatus?: string;
  pickupAddressCode?: string;
  airwayBillUrl?: string;
  loadSheetId?: string;
  shippedAt?: Date;
  deliveredAt?: Date;
  paymentSettled?: boolean;
  settlementDate?: Date;
  statusHistory?: PostExStatusHistoryItem[];
}

export interface PostExShipmentRecord {
  _id?: ObjectId;
  orderId: string | ObjectId;
  orderRefNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  cityName: string;
  trackingNumber: string;
  orderType: string;
  orderStatus: string;
  invoicePayment: number;
  pickupAddressCode?: string;
  createdAt: Date;
  updatedAt: Date;
  statusHistory: PostExStatusHistoryItem[];
}
