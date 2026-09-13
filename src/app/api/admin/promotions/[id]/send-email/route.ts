import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getPromotionById } from "@/services/promotionService";
import { promoCodeEmailTemplate } from "@/lib/emailTemplates";
import { sendMail } from "@/lib/mail";
import type { SendPromoEmailInput } from "@/types/apps/promotionTypes";

const BATCH_SIZE = 5;
const MAX_RECIPIENTS = 2000;

type Recipient = { email: string; name: string };

async function resolveSegment(segment: SendPromoEmailInput["segment"]): Promise<Recipient[]> {
  if (!segment || segment === "none") return [];
  const db = await getDb();

  if (segment === "all_users") {
    const users = await db.collection("users").find({ role: { $ne: "admin" }, email: { $exists: true } }, { projection: { email: 1, name: 1 } }).toArray();
    return users.map((u) => ({ email: String(u.email), name: String(u.name || "Customer") }));
  }

  if (segment === "subscribers") {
    const subs = await db.collection("subscribers").find({}, { projection: { email: 1, name: 1 } }).toArray();
    return subs.map((s) => ({ email: String(s.email), name: String(s.name || "Subscriber") }));
  }

  if (segment === "with_orders" || segment === "inactive_30d") {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const match: Record<string, unknown> = { status: { $nin: ["cancelled", "payment_failed", "pending_payment"] } };
    const rows = await db
      .collection("orders")
      .aggregate([
        { $match: match },
        { $group: { _id: { $toLower: "$customer_email" }, name: { $first: "$customer_name" }, lastOrder: { $max: "$created_at" } } },
      ])
      .toArray();
    const filtered = segment === "with_orders" ? rows : rows.filter((r) => !r.lastOrder || new Date(r.lastOrder) < since);
    return filtered
      .filter((r) => r._id && String(r._id).includes("@") && !String(r._id).startsWith("guest@"))
      .map((r) => ({ email: String(r._id), name: String(r.name || "Customer") }));
  }

  return [];
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = requireAdmin(req);
  if (!admin.ok) return admin.response;

  try {
    const { id } = await params;
    const promotion = await getPromotionById(id);
    if (!promotion) return NextResponse.json({ success: false, error: "Promotion not found" }, { status: 404 });
    if (promotion.kind !== "voucher" || !promotion.code) {
      return NextResponse.json({ success: false, error: "Only vouchers with a code can be emailed" }, { status: 400 });
    }
    if (promotion.status === "expired" || promotion.status === "draft" || promotion.status === "paused") {
      return NextResponse.json({ success: false, error: `This voucher is ${promotion.status}. Publish or resume it before sending.` }, { status: 400 });
    }

    const body = (await req.json()) as Omit<SendPromoEmailInput, "promotionId">;
    const { userIds = [], manualEmails = [], segment = "none", customMessage = "" } = body;

    const recipientMap = new Map<string, string>();
    const addRecipient = (email: string, name: string) => {
      const clean = (email || "").trim().toLowerCase();
      if (clean && clean.includes("@")) recipientMap.set(clean, name);
    };

    manualEmails.forEach((email) => addRecipient(email, "Valued Customer"));
    (await resolveSegment(segment)).forEach((r) => addRecipient(r.email, r.name));

    if (Array.isArray(userIds) && userIds.length > 0) {
      const db = await getDb();
      const oids = userIds.filter((u) => ObjectId.isValid(u)).map((u) => new ObjectId(u));
      if (oids.length) {
        const users = await db.collection("users").find({ _id: { $in: oids } }, { projection: { email: 1, name: 1 } }).toArray();
        users.forEach((u) => u.email && addRecipient(String(u.email), String(u.name || "Customer")));
      }
    }

    if (recipientMap.size === 0) {
      return NextResponse.json({ success: false, error: "No valid recipient email addresses specified" }, { status: 400 });
    }
    if (recipientMap.size > MAX_RECIPIENTS) {
      return NextResponse.json({ success: false, error: `Too many recipients (${recipientMap.size}). Limit is ${MAX_RECIPIENTS} per send.` }, { status: 400 });
    }

    const recipients = Array.from(recipientMap.entries());
    const failed: string[] = [];
    let sentCount = 0;

    const send = async ([email, name]: [string, string]) => {
      try {
        const html = promoCodeEmailTemplate({
          name,
          code: promotion.code!,
          type: promotion.reward.type,
          value: promotion.reward.value,
          endDate: promotion.endAt,
          minOrderAmount: promotion.conditions.minOrderAmount,
          minItemQuantity: promotion.conditions.minItemQuantity,
          customMessage,
        });
        await sendMail({ to: email, subject: `Special Offer: ${promotion.code} - Dukandar Shandar`, html });
        sentCount += 1;
      } catch (err) {
        console.error(`Failed to send promo email to ${email}:`, err);
        failed.push(email);
      }
    };

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      await Promise.all(recipients.slice(i, i + BATCH_SIZE).map(send));
    }

    return NextResponse.json({
      success: true,
      sentCount,
      totalRecipients: recipients.length,
      failedCount: failed.length,
      message: `Sent voucher "${promotion.code}" to ${sentCount} of ${recipients.length} recipient(s).`,
    });
  } catch (error) {
    console.error("Error sending promo email:", error);
    return NextResponse.json({ success: false, error: "Failed to send promo email" }, { status: 500 });
  }
}
