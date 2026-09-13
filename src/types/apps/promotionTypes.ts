/**
 * Promotions & discounts (Daraz-style seller-center model).
 *
 * One `promotions` document per campaign. `kind` decides which rules apply and
 * where the storefront shows it. Vouchers are the only kind that needs a code.
 */

export type PromotionKind = "product_discount" | "flash_sale" | "voucher" | "free_shipping" | "bundle";

export type PromotionVisibility = "public" | "private";

/** Derived at read time from dates + flags. Only `draft` and `paused` are stored. */
export type PromotionStatus = "draft" | "scheduled" | "active" | "paused" | "expired";

export type PromotionScopeType = "all" | "categories" | "products";

export type PromotionRewardType = "percentage" | "fixed" | "free_shipping" | "bundle";

export interface PromotionScope {
  type: PromotionScopeType;
  categories?: string[];
  productIds?: string[];
}

export interface PromotionConditions {
  minOrderAmount?: number;
  minItemQuantity?: number;
  firstOrderOnly?: boolean;
}

export interface PromotionReward {
  type: PromotionRewardType;
  /** percentage: 1-100, fixed: currency amount */
  value?: number;
  /** cap for percentage rewards */
  maxDiscount?: number;
  /** bundle: buy this many qualifying units ... */
  buyQty?: number;
  /** bundle: ... and get this many ... */
  getQty?: number;
  /** bundle: ... at this percent off (100 = free) */
  getDiscountPercent?: number;
}

/** Per-SKU deal inside a product_discount / flash_sale campaign. */
export interface PromotionProductDeal {
  productId: string;
  productName?: string;
  originalPrice?: number;
  salePrice: number;
  /** max units sold at the sale price; undefined = unlimited */
  stockLimit?: number;
  sold: number;
}

export interface PromotionLimits {
  totalUses?: number;
  perCustomer?: number;
}

export interface PromotionStats {
  timesUsed: number;
  totalDiscountGiven: number;
  revenue: number;
}

export interface PromotionBadge {
  label: string;
  color: string;
}

export interface Promotion {
  _id?: string;
  name: string;
  description?: string;
  kind: PromotionKind;
  /** preset this promotion was created from (informational) */
  typeId?: string | null;
  /** vouchers only; unique, uppercase */
  code?: string | null;
  visibility: PromotionVisibility;
  isDraft: boolean;
  isPaused: boolean;
  startAt: string;
  endAt: string;
  scope: PromotionScope;
  conditions: PromotionConditions;
  reward: PromotionReward;
  perProduct?: PromotionProductDeal[];
  limits: PromotionLimits;
  stats: PromotionStats;
  /** may combine with other promotions on the same order */
  stackable: boolean;
  /** higher wins when two promotions compete for the same line */
  priority: number;
  badge: PromotionBadge;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
  /** derived */
  status: PromotionStatus;
}

export type PromotionInput = Partial<
  Omit<Promotion, "_id" | "stats" | "status" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">
>;

/** Reusable preset ("promotion type") the admin picks when creating a promotion. */
export interface PromotionType {
  _id?: string;
  name: string;
  kind: PromotionKind;
  description?: string;
  defaults: {
    scope?: PromotionScope;
    conditions?: PromotionConditions;
    reward?: PromotionReward;
    limits?: PromotionLimits;
    stackable?: boolean;
    priority?: number;
    badge?: PromotionBadge;
    visibility?: PromotionVisibility;
    perProduct?: PromotionProductDeal[];
  };
  isSystem: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Row in `promotion_redemptions`. */
export interface PromotionRedemption {
  _id?: string;
  promotionId: string;
  orderId: string;
  customerId?: string | null;
  customerEmail?: string | null;
  code?: string | null;
  kind: PromotionKind;
  amount: number;
  createdAt: string;
}

/** What the storefront receives: no private codes, no stats. */
export type PublicPromotion = Pick<
  Promotion,
  | "_id"
  | "name"
  | "description"
  | "kind"
  | "code"
  | "visibility"
  | "startAt"
  | "endAt"
  | "scope"
  | "conditions"
  | "reward"
  | "perProduct"
  | "stackable"
  | "priority"
  | "badge"
  | "status"
> & { limits?: PromotionLimits; collected?: boolean; usedByMe?: number };

export interface CollectedVoucher {
  promotionId: string;
  collectedAt: string;
}

export interface SendPromoEmailInput {
  promotionId: string;
  userIds?: string[];
  manualEmails?: string[];
  segment?: "none" | "all_users" | "with_orders" | "inactive_30d" | "subscribers";
  customMessage?: string;
}

/** Discount line persisted on an order. */
export interface OrderDiscountLine {
  promotionId: string;
  code?: string | null;
  kind: PromotionKind;
  name: string;
  amount: number;
}

export const PROMOTION_KINDS: PromotionKind[] = ["product_discount", "flash_sale", "voucher", "free_shipping", "bundle"];

export const PROMOTION_KIND_LABELS: Record<PromotionKind, string> = {
  product_discount: "Product Discount",
  flash_sale: "Flash Sale",
  voucher: "Voucher",
  free_shipping: "Free Shipping",
  bundle: "Bundle Deal",
};

export const PROMOTION_STATUS_LABELS: Record<PromotionStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  active: "Active",
  paused: "Paused",
  expired: "Expired",
};
