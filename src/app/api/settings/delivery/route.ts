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
        shopName: settings.shopName || "",
        shopPhone: settings.shopPhone || "",
        storeEmail: settings.storeEmail || "",
        shopAddress: settings.shopAddress || "",
        province: settings.province || "",
        city: settings.city || "",
        area: settings.area || "",
        address: settings.address || "",
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
    const feeEnabled = body.feeEnabled;
    const fee = body.fee;
    if ((feeEnabled !== undefined && typeof feeEnabled !== "boolean") ||
        (fee !== undefined && (typeof fee !== "number" || !Number.isFinite(fee) || fee < 0))) {
      return NextResponse.json({ success: false, message: "Invalid delivery fee settings" }, { status: 400 });
    }

    const shopName = typeof body.shopName === "string" ? body.shopName : undefined;
    const shopPhone = typeof body.shopPhone === "string" ? body.shopPhone : undefined;
    const storeEmail = typeof body.storeEmail === "string" ? body.storeEmail : undefined;
    const shopAddress = typeof body.shopAddress === "string" ? body.shopAddress : undefined;
    const province = typeof body.province === "string" ? body.province : undefined;
    const city = typeof body.city === "string" ? body.city : undefined;
    const area = typeof body.area === "string" ? body.area : undefined;
    const address = typeof body.address === "string" ? body.address : undefined;

    let qrCodeImage = typeof body.qrCodeImage === "string" ? body.qrCodeImage : undefined;
    if (qrCodeImage?.startsWith("data:image/")) {
      const uploaded = await uploadImage(qrCodeImage, "");
      qrCodeImage = uploaded.url;
    }

    let storeLogo = typeof body.storeLogo === "string" ? body.storeLogo : undefined;
    if (storeLogo?.startsWith("data:image/")) {
      const uploaded = await uploadImage(storeLogo, "");
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
      { feeEnabled, fee, shopName, shopPhone, storeEmail, shopAddress, province, city, area, address, qrCodeImage, whatsAppNumber, storeLogo, socialLinks },
      admin.user.userName
    );

    return NextResponse.json({
      success: true,
      message: "Store settings updated successfully",
      settings: {
        feeEnabled: settings.feeEnabled,
        fee: settings.fee,
        shopName: settings.shopName || "",
        shopPhone: settings.shopPhone || "",
        storeEmail: settings.storeEmail || "",
        shopAddress: settings.shopAddress || "",
        province: settings.province || "",
        city: settings.city || "",
        area: settings.area || "",
        address: settings.address || "",
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
    const message = error instanceof Error ? error.message : "Failed to update delivery settings";
    return NextResponse.json({ success: false, message }, { status: message === "Social links must be HTTPS URLs" ? 400 : 500 });
  }
}
