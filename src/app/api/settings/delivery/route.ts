import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { uploadImage } from "@/lib/cloudinary";
import { getDeliverySettings, updateDeliverySettings } from "@/lib/deliverySettings.server";

export async function GET() {
  try {
    const settings = await getDeliverySettings();
    return NextResponse.json({
      success: true,
      settings: {
        feeEnabled: settings.feeEnabled,
        fee: settings.fee,
        qrCodeImage: settings.qrCodeImage || "",
        whatsAppNumber: settings.whatsAppNumber || "",
        storeLogo: settings.storeLogo || "",
        socialLinks: settings.socialLinks || { instagram: "", facebook: "", youtube: "" },
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

    let qrCodeImage = typeof body.qrCodeImage === "string" ? body.qrCodeImage : undefined;
    if (qrCodeImage?.startsWith("data:image/")) {
      const uploaded = await uploadImage(qrCodeImage, "dukandarshandar/qrcode");
      qrCodeImage = uploaded.url;
    }

    let storeLogo = typeof body.storeLogo === "string" ? body.storeLogo : undefined;
    if (storeLogo?.startsWith("data:image/")) {
      const uploaded = await uploadImage(storeLogo, "dukandarshandar/logos");
      storeLogo = uploaded.url;
    }

    const whatsAppNumber = typeof body.whatsAppNumber === "string" ? body.whatsAppNumber : undefined;

    const socialLinks =
      body.socialLinks && typeof body.socialLinks === "object"
        ? {
            instagram: typeof body.socialLinks.instagram === "string" ? body.socialLinks.instagram : "",
            facebook: typeof body.socialLinks.facebook === "string" ? body.socialLinks.facebook : "",
            youtube: typeof body.socialLinks.youtube === "string" ? body.socialLinks.youtube : "",
          }
        : undefined;

    const settings = await updateDeliverySettings(
      { feeEnabled, fee, qrCodeImage, whatsAppNumber, storeLogo, socialLinks },
      admin.user.userName
    );

    return NextResponse.json({
      success: true,
      message: "Store settings updated successfully",
      settings: {
        feeEnabled: settings.feeEnabled,
        fee: settings.fee,
        qrCodeImage: settings.qrCodeImage || "",
        whatsAppNumber: settings.whatsAppNumber || "",
        storeLogo: settings.storeLogo || "",
        socialLinks: settings.socialLinks || { instagram: "", facebook: "", youtube: "" },
        updatedAt: settings.updatedAt,
        updatedBy: settings.updatedBy,
      },
    });
  } catch (error) {
    console.error("Error updating delivery settings:", error);
    return NextResponse.json({ success: false, message: "Failed to update delivery settings" }, { status: 500 });
  }
}
