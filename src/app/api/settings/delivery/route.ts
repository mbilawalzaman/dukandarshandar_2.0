import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getDeliverySettings, updateDeliverySettings } from "@/lib/deliverySettings.server";

export async function GET() {
  try {
    const settings = await getDeliverySettings();
    return NextResponse.json({
      success: true,
      settings: {
        feeEnabled: settings.feeEnabled,
        fee: settings.fee,
      },
    });
  } catch (error) {
    console.error("Error fetching delivery settings:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch delivery settings" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = requireAdmin(req);
    if (!admin.ok) return admin.response;

    const body = await req.json();
    const feeEnabled = Boolean(body.feeEnabled);
    const fee = Math.max(0, Number(body.fee) || 0);

    const settings = await updateDeliverySettings({ feeEnabled, fee }, admin.user.userName);

    return NextResponse.json({
      success: true,
      message: "Delivery settings updated",
      settings: {
        feeEnabled: settings.feeEnabled,
        fee: settings.fee,
        updatedAt: settings.updatedAt,
        updatedBy: settings.updatedBy,
      },
    });
  } catch (error) {
    console.error("Error updating delivery settings:", error);
    return NextResponse.json({ success: false, message: "Failed to update delivery settings" }, { status: 500 });
  }
}
