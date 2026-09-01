import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import type { AdminPaymentRecord, AdminPaymentStats } from "@/types/admin";

type OrderDoc = {
  _id: { toString(): string };
  customer_name?: string;
  customer_email?: string;
  total_amount?: number;
  payment_method?: string;
  payment_status?: string;
  status?: string;
  safepay_tracker?: string | null;
  paid_at?: Date | string;
  created_at?: Date | string;
};

function toIso(value?: Date | string) {
  if (!value) return undefined;
  return new Date(value).toISOString();
}

function isOnlineMethod(method?: string) {
  return method === "card" || method === "raast" || method === "wallet";
}

function computeStats(orders: OrderDoc[]): AdminPaymentStats {
  const onlineOrders = orders.filter((o) => isOnlineMethod(o.payment_method));
  const paidOnline = onlineOrders.filter((o) => o.payment_status === "paid");
  const failed = onlineOrders.filter(
    (o) => o.status === "payment_failed" || o.payment_status === "failed"
  );
  const awaiting = onlineOrders.filter((o) => o.status === "pending_payment");
  const codOrders = orders.filter(
    (o) => (o.payment_method || "cod") === "cod" && o.status !== "cancelled"
  );

  const onlineRevenue = paidOnline.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const codRevenue = codOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const onlineAttempts = paidOnline.length + failed.length + awaiting.length;
  const successRate = onlineAttempts > 0 ? Math.round((paidOnline.length / onlineAttempts) * 100) : 0;

  return {
    onlineRevenue,
    paidOnlineCount: paidOnline.length,
    failedCount: failed.length,
    awaitingCount: awaiting.length,
    codRevenue,
    codCount: codOrders.length,
    successRate,
    onlineAttempts,
  };
}

function mapToPaymentRecord(order: OrderDoc): AdminPaymentRecord {
  return {
    _id: order._id.toString(),
    customer_name: order.customer_name || "Unknown",
    customer_email: order.customer_email || "",
    total_amount: Number(order.total_amount || 0),
    payment_method: order.payment_method || "cod",
    payment_status: order.payment_status || "unpaid",
    order_status: order.status || "pending",
    safepay_tracker: order.safepay_tracker ?? null,
    paid_at: toIso(order.paid_at),
    created_at: toIso(order.created_at),
  };
}

export async function GET(req: NextRequest) {
  try {
    const admin = requireAdmin(req);
    if (!admin.ok) return admin.response;

    const { searchParams } = new URL(req.url);
    const method = searchParams.get("method"); // card | cod | online | all
    const status = searchParams.get("status"); // paid | failed | awaiting | cod | all
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const db = await getDb();
    const allOrders = (await db.collection("orders").find({}).sort({ created_at: -1 }).toArray()) as OrderDoc[];

    const stats = computeStats(allOrders);

    let records = allOrders.map(mapToPaymentRecord);

    if (method === "card") {
      records = records.filter((r) => r.payment_method === "card");
    } else if (method === "cod") {
      records = records.filter((r) => r.payment_method === "cod" || !r.payment_method);
    } else if (method === "online") {
      records = records.filter((r) => isOnlineMethod(r.payment_method));
    }

    if (status === "paid") {
      records = records.filter((r) => r.payment_status === "paid");
    } else if (status === "failed") {
      records = records.filter(
        (r) => r.order_status === "payment_failed" || r.payment_status === "failed"
      );
    } else if (status === "awaiting") {
      records = records.filter((r) => r.order_status === "pending_payment");
    } else if (status === "cod") {
      records = records.filter((r) => r.payment_method === "cod" || !r.payment_method);
    }

    if (from) {
      const fromDate = new Date(from);
      records = records.filter((r) => {
        const date = r.paid_at || r.created_at;
        return date ? new Date(date) >= fromDate : false;
      });
    }

    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      records = records.filter((r) => {
        const date = r.paid_at || r.created_at;
        return date ? new Date(date) <= toDate : false;
      });
    }

    return NextResponse.json({ success: true, stats, payments: records });
  } catch (error) {
    console.error("Error in admin payments API:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch payment records" }, { status: 500 });
  }
}
