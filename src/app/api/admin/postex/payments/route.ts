import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import PostExService from "@/services/postex.service.js";

type PostExOrderDoc = {
  _id: { toString(): string };
  customer_name?: string;
  customer_email?: string;
  phone?: string;
  city?: string;
  province?: string;
  total_amount?: number;
  payment_method?: string;
  payment_status?: string;
  status?: string;
  created_at?: Date | string;
  postexDetails?: {
    trackingNumber?: string;
    orderStatus?: string;
    orderRefNumber?: string;
  };
};

function estimateCourierFee(city = "", province = ""): number {
  const c = city.toLowerCase();
  const p = province.toLowerCase();

  if (c.includes("lahore")) return 157;

  if (
    p.includes("punjab") ||
    c.includes("rawalpindi") ||
    c.includes("islamabad") ||
    c.includes("faisalabad") ||
    c.includes("multan")
  ) {
    return 258;
  }

  return 274;
}

export async function GET(req: NextRequest) {
  try {
    const admin = requireAdmin(req);

    if (!admin.ok) return admin.response;

    const db = await getDb();

    const orders = (await db
      .collection("orders")
      .find({
        "postexDetails.trackingNumber": { $exists: true, $ne: "" },
      })
      .sort({ created_at: -1 })
      .toArray()) as PostExOrderDoc[];

    let totalBookedCOD = 0;
    let deliveredCOD = 0;
    let inTransitCOD = 0;
    let remittedCount = 0;

    let codShipments = 0;
    let cardShipments = 0;
    let totalCourierFees = 0;
    let netPostExBalance = 0;

    const records = orders.map((o) => {
      const amount = Number(o.total_amount || 0);
      const isCod = (o.payment_method || "cod").toLowerCase() === "cod";
      const isDelivered = o.status === "delivered";
      const isInTransit = o.status === "shipped" || o.status === "dispatched";
      const isPaid = o.payment_status === "paid";

      const courierFee = estimateCourierFee(o.city || "", o.province || "");

      totalCourierFees += courierFee;

      if (isCod) {
        codShipments += 1;
        totalBookedCOD += amount;

        if (isDelivered) {
          deliveredCOD += amount;
          netPostExBalance += amount - courierFee;
        } else {
          netPostExBalance -= courierFee;
        }
      } else {
        cardShipments += 1;
        netPostExBalance -= courierFee; // Prepaid: PostEx collects 0 cash, store owes delivery fee to PostEx
      }

      if (isInTransit && isCod) inTransitCOD += amount;
      if (isPaid) remittedCount += 1;

      return {
        _id: o._id.toString(),
        customer_name: o.customer_name || "Unknown",
        phone: o.phone || "—",
        city: o.city || "—",
        total_amount: amount,
        payment_method: isCod ? "cod" : "card",
        cod_invoice_amount: isCod ? amount : 0,
        estimated_courier_fee: courierFee,
        net_postex_effect: isCod
          ? isDelivered
            ? amount - courierFee
            : -courierFee
          : -courierFee,
        order_status: o.status || "pending",
        payment_status: o.payment_status || "unpaid",
        trackingNumber: o.postexDetails?.trackingNumber || "",
        created_at: o.created_at
          ? new Date(o.created_at).toISOString()
          : undefined,
      };
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalBookedCOD,
        deliveredCOD,
        inTransitCOD,
        totalShipments: records.length,
        codShipments,
        cardShipments,
        remittedCount,
        totalCourierFees,
        netPostExBalance,
      },
      records,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };

    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to fetch PostEx payment records",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = requireAdmin(req);

    if (!admin.ok) return admin.response;

    const { trackingNumber } = await req.json();

    if (!trackingNumber) {
      return NextResponse.json(
        { success: false, error: "trackingNumber is required" },
        { status: 400 },
      );
    }

    const liveStatus = await PostExService.getPaymentStatus(trackingNumber);

    return NextResponse.json({ success: true, data: liveStatus });
  } catch (error: unknown) {
    const err = error as { message?: string };

    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to fetch live PostEx payment status",
      },
      { status: 500 },
    );
  }
}
