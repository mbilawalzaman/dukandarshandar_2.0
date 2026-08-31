import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { uploadImage } from "@/lib/cloudinary";
import { DEFAULT_PAGE_SETTINGS, PageSettings } from "@/lib/pageSettings";

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const db = await getDb();
    const doc = await db.collection("page_settings").findOne({ key: "global_page_settings" });

    if (!doc) {
      return NextResponse.json({
        success: true,
        settings: DEFAULT_PAGE_SETTINGS,
      });
    }

    const mergedSettings: PageSettings = {
      home: { ...DEFAULT_PAGE_SETTINGS.home, ...(doc.home || {}) },
      shop: { ...DEFAULT_PAGE_SETTINGS.shop, ...(doc.shop || {}) },
      about: { ...DEFAULT_PAGE_SETTINGS.about, ...(doc.about || {}) },
      contact: { ...DEFAULT_PAGE_SETTINGS.contact, ...(doc.contact || {}) },
    };

    return NextResponse.json({
      success: true,
      settings: mergedSettings,
    });
  } catch (error) {
    console.error("Admin error fetching page settings:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const db = await getDb();

    // Process home banner images (if any base64 image strings were uploaded, upload to Cloudinary)
    const processedBannerImages: string[] = [];
    if (Array.isArray(body.home?.bannerImages)) {
      for (const img of body.home.bannerImages) {
        if (typeof img === "string" && img.startsWith("data:image/")) {
          const uploaded = await uploadImage(img);
          processedBannerImages.push(uploaded.url);
        } else if (typeof img === "string" && img.trim()) {
          processedBannerImages.push(img.trim());
        }
      }
    }

    // Process Shop banner image
    let shopBannerImage = body.shop?.bannerImage || "";
    if (typeof shopBannerImage === "string" && shopBannerImage.startsWith("data:image/")) {
      const uploaded = await uploadImage(shopBannerImage);
      shopBannerImage = uploaded.url;
    }

    // Process About banner image
    let aboutBannerImage = body.about?.bannerImage || "";
    if (typeof aboutBannerImage === "string" && aboutBannerImage.startsWith("data:image/")) {
      const uploaded = await uploadImage(aboutBannerImage);
      aboutBannerImage = uploaded.url;
    }

    // Process Contact banner image
    let contactBannerImage = body.contact?.bannerImage || "";
    if (typeof contactBannerImage === "string" && contactBannerImage.startsWith("data:image/")) {
      const uploaded = await uploadImage(contactBannerImage);
      contactBannerImage = uploaded.url;
    }

    const updatedSettings: PageSettings = {
      home: {
        bannerImages: processedBannerImages.length > 0 ? processedBannerImages : DEFAULT_PAGE_SETTINGS.home.bannerImages,
        topRatedCount: Math.max(1, Math.min(24, Number(body.home?.topRatedCount) || 4)),
        productsPerPage: Math.max(1, Math.min(48, Number(body.home?.productsPerPage) || 9)),
      },
      shop: {
        bannerTitle: body.shop?.bannerTitle?.trim() || DEFAULT_PAGE_SETTINGS.shop.bannerTitle,
        bannerSubtitle: body.shop?.bannerSubtitle?.trim() ?? DEFAULT_PAGE_SETTINGS.shop.bannerSubtitle,
        bannerImage: shopBannerImage,
        productsPerPage: Math.max(1, Math.min(48, Number(body.shop?.productsPerPage) || 9)),
      },
      about: {
        bannerTitle: body.about?.bannerTitle?.trim() || DEFAULT_PAGE_SETTINGS.about.bannerTitle,
        bannerSubtitle: body.about?.bannerSubtitle?.trim() ?? DEFAULT_PAGE_SETTINGS.about.bannerSubtitle,
        bannerImage: aboutBannerImage,
      },
      contact: {
        bannerTitle: body.contact?.bannerTitle?.trim() || DEFAULT_PAGE_SETTINGS.contact.bannerTitle,
        bannerSubtitle: body.contact?.bannerSubtitle?.trim() ?? DEFAULT_PAGE_SETTINGS.contact.bannerSubtitle,
        bannerImage: contactBannerImage,
      },
    };

    await db.collection("page_settings").updateOne(
      { key: "global_page_settings" },
      {
        $set: {
          key: "global_page_settings",
          ...updatedSettings,
          updated_at: new Date(),
          updated_by: auth.user.userName,
        },
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      message: "Page settings saved successfully",
      settings: updatedSettings,
    });
  } catch (error) {
    console.error("Error updating page settings:", error);
    return NextResponse.json({ success: false, message: "Failed to update page settings" }, { status: 500 });
  }
}
