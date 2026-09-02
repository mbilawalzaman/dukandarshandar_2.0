export type ConversationType = "support";

export type MessageType = "text" | "image" | "file" | "system";

export interface LastMessageSummary {
  messageId: string;
  senderId: string;
  preview: string;
  type: MessageType;
  createdAt: unknown;
}

export interface ConversationDoc {
  type: ConversationType;
  customerId: string;
  participantIds: string[];
  orderId?: string | null;
  createdBy: string;
  customerName?: string | null;
  customerEmail?: string | null;
  createdAt: unknown;
  updatedAt: unknown;
  lastMessage?: LastMessageSummary | null;
}

export interface MessageDoc {
  senderId: string;
  type: MessageType;
  text: string;
  attachment?: unknown | null;
  orderId?: string | null;
  createdAt: unknown;
  editedAt?: unknown | null;
  deletedAt?: unknown | null;
  clientMessageId: string;
}

export interface ConversationMemberDoc {
  conversationId: string;
  userId: string;
  joinedAt: unknown;
  lastReadMessageId?: string | null;
  lastReadAt?: unknown | null;
  unreadCount: number;
  muted: boolean;
  archived: boolean;
  updatedAt?: unknown;
}
