import type { PromotionRewardType } from "@/types/apps/promotionTypes";
import { formatPromoDate, rewardValueLabel } from "@/lib/promotionDisplay";

const gold = "#febe4c";
const navy = "#0f172a";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layout(title: string, body: string) {
  return `
  <div style="font-family: Poppins, Arial, sans-serif; background:#f8fafc; padding:24px;">
    <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden;">
      <div style="background:${navy}; color:#fff; padding:20px 24px;">
        <h1 style="margin:0; font-size:20px;">Dukandar Shandar</h1>
        <p style="margin:6px 0 0; color:${gold}; font-size:13px;">${title}</p>
      </div>
      <div style="padding:24px; color:${navy}; font-size:15px; line-height:1.6;">
        ${body}
      </div>
      <div style="padding:16px 24px; font-size:12px; color:#64748b; border-top:1px solid #e2e8f0;">
        Stationery &amp; craft supplies
      </div>
    </div>
  </div>`;
}

export function contactShopEmail(input: { name: string; email: string; subject?: string; message: string }) {
  return layout(
    "New contact message",
    `<p><strong>${escapeHtml(input.name)}</strong> (${escapeHtml(input.email)}) wrote:</p>
     <p><strong>Subject:</strong> ${escapeHtml(input.subject || "General enquiry")}</p>
     <p>${escapeHtml(input.message).replace(/\n/g, "<br/>")}</p>`
  );
}

export function contactCustomerEmail(name: string) {
  return layout(
    "We received your message",
    `<p>Hi ${escapeHtml(name)},</p>
     <p>Thanks for contacting Dukandar Shandar. We have your message and will reply as soon as we can.</p>
     <p>Warm regards,<br/>The Dukandar Shandar team</p>`
  );
}

export function newsletterWelcomeEmail() {
  return layout(
    "Welcome to the list",
    `<p>You are subscribed to Dukandar Shandar updates, new stationery, craft finds, and shop news.</p>
     <p>We will only send useful notes, never spam.</p>`
  );
}

export function orderConfirmationEmail(input: {
  name: string;
  orderId: string;
  items: { name: string; quantity: number; price: number }[];
  total: number;
  subtotal?: number;
  shipping?: number;
  discounts?: Array<{ name?: string; code?: string | null; amount: number }> | null;
  province?: string;
  city?: string;
  area?: string;
  address?: string;
}) {
  const rows = input.items
    .map(
      (item) =>
          `<tr>
          <td style="padding:8px 0; border-bottom:1px solid #e2e8f0;">${escapeHtml(item.name)} × ${item.quantity}</td>
          <td style="padding:8px 0; border-bottom:1px solid #e2e8f0; text-align:right;">PKR ${(item.price * item.quantity).toLocaleString()}</td>
        </tr>`
    )
    .join("");

  const locationParts = [input.address, input.area, input.city, input.province].filter(Boolean);
  const fullLocation = locationParts.map((p) => escapeHtml(p!)).join(", ");

  return layout(
    "Order confirmed",
    `<p>Hi ${escapeHtml(input.name)},</p>
     <p>Thank you for your order <strong>#${escapeHtml(input.orderId)}</strong>.</p>
     <table style="width:100%; border-collapse:collapse;">${rows}</table>
     ${typeof input.shipping === "number" ? `<p style="margin:12px 0 0;">Delivery: PKR ${input.shipping.toLocaleString()}</p>` : ""}
     ${(input.discounts || [])
       .filter((d) => d.amount > 0)
       .map((d) => `<p style="margin:4px 0 0; color:#166534;">${escapeHtml(d.code || d.name || "Promotion")}: -PKR ${d.amount.toLocaleString()}</p>`)
       .join("")}
     <p style="margin-top:12px;"><strong>Total: PKR ${input.total.toLocaleString()}</strong></p>
     ${fullLocation ? `<p>Shipping to: ${fullLocation}</p>` : ""}
     <p>We will email you again when the status changes.</p>`
  );
}

export function orderStatusEmail(input: { name: string; orderId: string; status: string }) {
  return layout(
    `Order ${input.status}`,
    `<p>Hi ${escapeHtml(input.name)},</p>
     <p>Your order <strong>#${escapeHtml(input.orderId)}</strong> is now <strong>${escapeHtml(input.status)}</strong>.</p>
     <p>Thank you for shopping with Dukandar Shandar.</p>`
  );
}

export function orderDeliveredEmail(input: { name: string; orderId: string; fullOrderId: string }) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://dukandarshandar.com";
  const reviewUrl = `${baseUrl}/orders?orderId=${encodeURIComponent(input.fullOrderId)}&action=review`;

  return layout(
    "Order Delivered - Rate & Review",
    `<p>Hi ${escapeHtml(input.name)},</p>
     <p>Your order <strong>#${escapeHtml(input.orderId)}</strong> has been successfully <strong>delivered</strong> 🎉.</p>
     <p>We hope you are delighted with your items! Please take a moment to rate your products and share your feedback with us.</p>
     <div style="margin:28px 0; text-align:center;">
       <a href="${reviewUrl}" style="background:${gold}; color:${navy}; font-size:15px; font-weight:bold; padding:14px 28px; text-decoration:none; border-radius:8px; display:inline-block; box-shadow:0 4px 12px rgba(254,190,76,0.3);">
         ★ Rate &amp; Review Products
       </a>
     </div>
     <p style="font-size:13px; color:#64748b;">If the button above does not work, copy and paste this link into your browser:<br/>
     <a href="${reviewUrl}" style="color:${navy};">${reviewUrl}</a></p>
     <p>Thank you for shopping with Dukandar Shandar!</p>`
  );
}

export function promoCodeEmailTemplate(input: {
  name?: string;
  code: string;
  type?: PromotionRewardType | string;
  value?: number;
  /** @deprecated superseded by endDate */
  durationMonths?: number;
  endDate?: string | Date;
  minOrderAmount?: number;
  minItemQuantity?: number;
  customMessage?: string;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://dukandarshandar.netlify.app";
  const shopUrl = `${baseUrl}/checkout?promo=${encodeURIComponent(input.code)}`;
  const discountValue = rewardValueLabel({ rewardType: input.type, rewardValue: input.value });
  const validityText = input.endDate
    ? `valid until <strong>${escapeHtml(formatPromoDate(input.endDate))}</strong>`
    : `valid for <strong>${input.durationMonths === 1 || !input.durationMonths ? "1 month" : `${input.durationMonths} months`}</strong>`;
  const conditions = [
    input.minOrderAmount ? `orders over Rs. ${Number(input.minOrderAmount).toLocaleString()}` : "",
    input.minItemQuantity ? `${input.minItemQuantity}+ items` : "",
  ].filter(Boolean);
  const customerName = input.name ? escapeHtml(input.name) : "Valued Customer";
  const promoCode = escapeHtml(input.code);

  return layout(
    `Special Offer: ${promoCode}`,
    `<p>Hi ${customerName},</p>
     <p>We're excited to offer you a special discount of <strong>${discountValue}</strong> on Dukandar Shandar, ${validityText}. Don't miss out on this limited-time promotion!</p>
     ${input.customMessage ? `<p style="background:#f1f5f9; padding:12px 16px; border-left:4px solid ${gold}; font-style:italic; margin:16px 0;">${escapeHtml(input.customMessage)}</p>` : ""}
     <div style="background:#f8fafc; border:2px dashed ${gold}; border-radius:10px; padding:20px; text-align:center; margin:24px 0;">
       <p style="margin:0 0 6px; font-size:13px; color:#64748b; text-transform:uppercase; letter-spacing:1px; font-weight:600;">Your Exclusive Promo Code</p>
       <div style="font-size:26px; font-weight:800; color:${navy}; letter-spacing:2px; margin:8px 0;">${promoCode}</div>
       <p style="margin:6px 0 0; font-size:13px; color:#475569;">
         ${conditions.length ? `Valid on <strong>${escapeHtml(conditions.join(", "))}</strong>` : "Valid on all stationery & craft supplies"}
       </p>
     </div>
     <div style="margin:28px 0; text-align:center;">
       <a href="${shopUrl}" style="background:${gold}; color:${navy}; font-size:15px; font-weight:bold; padding:14px 32px; text-decoration:none; border-radius:8px; display:inline-block; box-shadow:0 4px 12px rgba(254,190,76,0.3);">
         Claim Your Discount
       </a>
     </div>
     <p style="font-size:13px; color:#64748b;">Simply enter promo code <strong>"${promoCode}"</strong> at checkout to claim your savings.</p>
     <p>Warm regards,<br/>The Dukandar Shandar Team</p>`
  );
}
