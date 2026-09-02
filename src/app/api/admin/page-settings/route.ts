import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { uploadImage } from "@/lib/cloudinary";
import { MediaQueueService } from "@/services/mediaQueueService";
import { DEFAULT_PAGE_SETTINGS, PageSettings, BannerItem, normalizePageSettings } from "@/lib/pageSettings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

    const normalized = normalizePageSettings(doc);

    return NextResponse.json({
      success: true,
      settings: normalized,
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

    const bannerMode: "image_slider" | "single_lottie" =
      body.home?.bannerMode === "single_lottie" ? "single_lottie" : "image_slider";

    // 1. Process Multiple Image Slides (Home Slideshow)
    const rawBanners: Array<{
      id?: string;
      title?: string;
      subtitle?: string;
      order?: number;
      isActive?: boolean;
      activeMedia?: { type: "image" | "lottie"; url: string };
      mediaUpload?: string;
    }> = Array.isArray(body.home?.banners) ? body.home.banners : [];

    const processedBanners: BannerItem[] = [];

    for (let i = 0; i < rawBanners.length; i++) {
      const b = rawBanners[i];
      const bannerId = b.id || `banner-${i + 1}`;

      if (b.mediaUpload && b.mediaUpload.startsWith("data:image/")) {
        const uploaded = await uploadImage(b.mediaUpload, "dukandarshandar/banners");
        processedBanners.push({
          id: bannerId,
          title: b.title || "",
          subtitle: b.subtitle || "",
          order: typeof b.order === "number" ? b.order : i + 1,
          isActive: b.isActive !== false,
          activeMedia: {
            type: "image",
            url: uploaded.url,
            publicId: uploaded.publicId,
            resourceType: "image",
            format: uploaded.format,
          },
          pendingMedia: null,
          processingStatus: "idle",
        });
      } else {
        processedBanners.push({
          id: bannerId,
          title: b.title || "",
          subtitle: b.subtitle || "",
          order: typeof b.order === "number" ? b.order : i + 1,
          isActive: b.isActive !== false,
          activeMedia: b.activeMedia || {
            type: "image",
            url: "",
          },
          pendingMedia: null,
          processingStatus: "idle",
        });
      }
    }

    // 2. Process Single Video / Lottie Banner (videoUrl = Cloudinary URL, not base64)
    const rawSingle = body.home?.singleBanner || {};
    const singleVideoUrl =
      typeof rawSingle.videoUrl === "string"
        ? rawSingle.videoUrl
        : typeof rawSingle.videoUpload === "string" && rawSingle.videoUpload.startsWith("http")
          ? rawSingle.videoUpload
          : "";

    const singleBanner: BannerItem = {
      id: rawSingle.id || "single-banner-1",
      title: rawSingle.title || "Dukandar Shandar",
      subtitle: rawSingle.subtitle || "",
      order: 1,
      isActive: rawSingle.isActive !== false,
      activeMedia: rawSingle.activeMedia || processedBanners[0]?.activeMedia || {
        type: "image",
        url: "",
      },
      pendingMedia: null,
      processingStatus: singleVideoUrl ? "processing" : (rawSingle.processingStatus || "idle"),
      errorMessage: rawSingle.errorMessage || undefined,
    };

    if (singleVideoUrl.startsWith("http")) {
      await MediaQueueService.enqueueVideoConversion({
        videoData: singleVideoUrl,
        pageKey: "home",
        bannerId: singleBanner.id,
        isSingleBanner: true,
      });
    }

    // 3. Process Shop banner (Image or Video)
    let shopBannerImage = body.shop?.bannerImage || "";
    if (typeof shopBannerImage === "string" && shopBannerImage.startsWith("data:image/")) {
      const uploaded = await uploadImage(shopBannerImage, "dukandarshandar/banners");
      shopBannerImage = uploaded.url;
    } else {
      const shopVideoUrl =
        typeof body.shop?.videoUrl === "string"
          ? body.shop.videoUrl
          : typeof body.shop?.videoUpload === "string" && body.shop.videoUpload.startsWith("http")
            ? body.shop.videoUpload
            : "";
      if (shopVideoUrl) {
        await MediaQueueService.enqueueVideoConversion({
          videoData: shopVideoUrl,
          pageKey: "shop",
        });
      }
    }

    // 4. Process About banner (Image or Video)
    let aboutBannerImage = body.about?.bannerImage || "";
    if (typeof aboutBannerImage === "string" && aboutBannerImage.startsWith("data:image/")) {
      const uploaded = await uploadImage(aboutBannerImage, "dukandarshandar/banners");
      aboutBannerImage = uploaded.url;
    } else {
      const aboutVideoUrl =
        typeof body.about?.videoUrl === "string"
          ? body.about.videoUrl
          : typeof body.about?.videoUpload === "string" && body.about.videoUpload.startsWith("http")
            ? body.about.videoUpload
            : "";
      if (aboutVideoUrl) {
        await MediaQueueService.enqueueVideoConversion({
          videoData: aboutVideoUrl,
          pageKey: "about",
        });
      }
    }

    // 5. Process Contact banner (Image or Video)
    let contactBannerImage = body.contact?.bannerImage || "";
    if (typeof contactBannerImage === "string" && contactBannerImage.startsWith("data:image/")) {
      const uploaded = await uploadImage(contactBannerImage, "dukandarshandar/banners");
      contactBannerImage = uploaded.url;
    } else {
      const contactVideoUrl =
        typeof body.contact?.videoUrl === "string"
          ? body.contact.videoUrl
          : typeof body.contact?.videoUpload === "string" && body.contact.videoUpload.startsWith("http")
            ? body.contact.videoUpload
            : "";
      if (contactVideoUrl) {
        await MediaQueueService.enqueueVideoConversion({
          videoData: contactVideoUrl,
          pageKey: "contact",
        });
      }
    }

    const updatedSettings: PageSettings = {
      home: {
        bannerMode,
        banners: processedBanners.length > 0 ? processedBanners : DEFAULT_PAGE_SETTINGS.home.banners,
        singleBanner,
        topRatedCount: Math.max(1, Math.min(24, Number(body.home?.topRatedCount) || 4)),
        productsPerPage: Math.max(1, Math.min(48, Number(body.home?.productsPerPage) || 9)),
      },
      shop: {
        bannerTitle: body.shop?.bannerTitle?.trim() || DEFAULT_PAGE_SETTINGS.shop.bannerTitle,
        bannerSubtitle: body.shop?.bannerSubtitle?.trim() ?? DEFAULT_PAGE_SETTINGS.shop.bannerSubtitle,
        bannerType: body.shop?.bannerType || "image",
        bannerImage: shopBannerImage,
        productsPerPage: Math.max(1, Math.min(48, Number(body.shop?.productsPerPage) || 9)),
      },
      about: {
        bannerTitle: body.about?.bannerTitle?.trim() || DEFAULT_PAGE_SETTINGS.about.bannerTitle,
        bannerSubtitle: body.about?.bannerSubtitle?.trim() ?? DEFAULT_PAGE_SETTINGS.about.bannerSubtitle,
        bannerType: body.about?.bannerType || "image",
        bannerImage: aboutBannerImage,
      },
      contact: {
        bannerTitle: body.contact?.bannerTitle?.trim() || DEFAULT_PAGE_SETTINGS.contact.bannerTitle,
        bannerSubtitle: body.contact?.bannerSubtitle?.trim() ?? DEFAULT_PAGE_SETTINGS.contact.bannerSubtitle,
        bannerType: body.contact?.bannerType || "image",
        bannerImage: contactBannerImage,
      },
    };

    // Save strictly clean settings (without raw video uploads)
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
