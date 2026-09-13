import type {
  PromotionConditions,
  PromotionKind,
  PromotionReward,
  PromotionRewardType,
  PromotionScope,
  PromotionStatus,
} from "@/types/apps/promotionTypes";

export { formatDate as formatPromoDate, formatDateRange, daysUntil } from "@/lib/dateUtils";

type RewardLike = { rewardType?: PromotionRewardType | string; rewardValue?: number };

/** "25%" / "Rs. 200" / "Free Delivery" for emails and legacy callers. */
export function rewardValueLabel(input: RewardLike): string {
  const type = input.rewardType || "percentage";
  const value = input.rewardValue ?? 0;
  if (type === "free_shipping") return "Free Delivery";
  if (type === "percentage") return `${value}%`;
  return `Rs. ${Number(value).toLocaleString()}`;
}

/** Human label for a reward: "20% off (max Rs. 500)", "Rs. 200 off", "Free delivery", "Buy 2 get 1 free". */
export function rewardLabel(reward: PromotionReward | undefined): string {
  if (!reward) return "";
  switch (reward.type) {
    case "percentage":
      return `${reward.value ?? 0}% off${reward.maxDiscount ? ` (max Rs. ${reward.maxDiscount.toLocaleString()})` : ""}`;
    case "fixed":
      return `Rs. ${(reward.value ?? 0).toLocaleString()} off`;
    case "free_shipping":
      return "Free delivery";
    case "bundle": {
      const pct = reward.getDiscountPercent ?? 100;
      return `Buy ${reward.buyQty ?? 1} get ${reward.getQty ?? 1} ${pct >= 100 ? "free" : `${pct}% off`}`;
    }
    default:
      return "";
  }
}

export function scopeLabel(scope: PromotionScope | undefined): string {
  if (!scope || scope.type === "all") return "All products";
  if (scope.type === "categories") return scope.categories?.length ? scope.categories.join(", ") : "Selected categories";
  return `${scope.productIds?.length ?? 0} selected product${(scope.productIds?.length ?? 0) === 1 ? "" : "s"}`;
}

export function conditionsLabel(conditions: PromotionConditions | undefined): string {
  if (!conditions) return "No conditions";
  const parts: string[] = [];
  if (conditions.minOrderAmount) parts.push(`Min. order Rs. ${conditions.minOrderAmount.toLocaleString()}`);
  if (conditions.minItemQuantity) parts.push(`${conditions.minItemQuantity}+ items`);
  if (conditions.firstOrderOnly) parts.push("First order only");
  return parts.length ? parts.join(" · ") : "No conditions";
}

export const STATUS_COLORS: Record<PromotionStatus, { bg: string; fg: string }> = {
  active: { bg: "#dcfce7", fg: "#166534" },
  scheduled: { bg: "#dbeafe", fg: "#1d4ed8" },
  paused: { bg: "#fef3c7", fg: "#92400e" },
  expired: { bg: "#f1f5f9", fg: "#64748b" },
  draft: { bg: "#ede9fe", fg: "#5b21b6" },
};

export const KIND_COLORS: Record<PromotionKind, string> = {
  product_discount: "#dc2626",
  flash_sale: "#ea580c",
  voucher: "#16a34a",
  free_shipping: "#0284c7",
  bundle: "#7c3aed",
};

/** Countdown text such as "Ends in 2d 5h" / "Ends in 40m" / "Ended". */
export function countdownLabel(endAt: string | Date, now: Date = new Date()): string {
  const ms = new Date(endAt).getTime() - now.getTime();
  if (ms <= 0) return "Ended";
  const mins = Math.floor(ms / 60000);
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (days > 0) return `Ends in ${days}d ${hours}h`;
  if (hours > 0) return `Ends in ${hours}h ${m}m`;
  return `Ends in ${m}m`;
}
