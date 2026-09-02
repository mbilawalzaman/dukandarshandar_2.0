export type NotificationType =
  | "new_message"
  | "order_placed"
  | "order_status"
  | "payment_paid"
  | "payment_failed"
  | "low_stock"
  | "new_user";

export interface NotificationDoc {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  entityType?: string | null;
  entityId?: string | null;
  actorId?: string | null;
  isRead: boolean;
  readAt?: unknown | null;
  createdAt: unknown;
  idempotencyKey: string;
}

export interface FcmDeviceDoc {
  userId: string;
  deviceId: string;
  token: string;
  platform: "web";
  userAgent?: string;
  enabled: boolean;
  createdAt: Date;
  lastSeenAt: Date;
}

export interface CreateNotificationInput {
  recipients: string[];
  actorId?: string | null;
  type: NotificationType;
  title: string;
  body: string;
  entityType?: string | null;
  entityId?: string | null;
  idempotencyKey: string;
  sendPush?: boolean;
  route?: string;
}

export interface MongoNotificationDoc {
  firestoreId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  entityType?: string | null;
  entityId?: string | null;
  actorId?: string | null;
  isRead: boolean;
  readAt?: Date | null;
  createdAt: Date;
  idempotencyKey: string;
}
