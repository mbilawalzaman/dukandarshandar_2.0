import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { uploadImage } from "@/lib/cloudinary";
import { toPlayableVideoUrl } from "@/lib/cloudinaryUrl";
import {
  DEFAULT_PAGE_SETTINGS,
  PageSettings,
  PageSettingsKey,
  BannerItem,
  MediaAsset,
  normalizePageSettings,
} from "@/lib/pageSettings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function looksLikeVideo(media?: MediaAsset | null, url?: string): boolean {
  const candidate = (url || media?.url || "").toLowerCase();
  if (media?.type === "video" || media?.resourceType === "video") return true;
  return (
    candidate.includes("/video/upload/") ||
    candidate.endsWith(".mp4") ||
    candidate.endsWith(".webm") ||
    candidate.endsWith(".mov")
  );
}

async function resolveImageMedia(
  mediaUpload: string | undefined,
  existing?: MediaAsset | null
): Promise<MediaAsset> {
  if (mediaUpload?.startsWith("data:image/")) {
    const uploaded = await uploadImage(mediaUpload, "dukandarshandar/banners");
    return {
      type: "image",
      url: uploaded.url,
      publicId: uploaded.publicId,
      resourceType: "image",
      format: uploaded.format,
    };
  }

  if (existing?.url) {
    if (looksLikeVideo(existing)) {
      return {
        type: "video",
        url: toPlayableVideoUrl(existing.url),
        publicId: existing.publicId,
        resourceType: "video",
        format: existing.format || "mp4",
        width: existing.width,
        height: existing.height,
        duration: existing.duration,
        bytes: existing.bytes,
      };
    }
    return {
      type: "image",
      url: existing.url,
      publicId: existing.publicId,
      resourceType: existing.resourceType === "video" ? "image" : existing.resourceType,
      format: existing.format,
      width: existing.width,
      height: existing.height,
      bytes: existing.bytes,
    };
  }

  return { type: "image", url: "" };
}

function toVideoMedia(input: {
  url?: string;
  publicId?: string;
  format?: string;
  bytes?: number;
  duration?: number;
}): MediaAsset | null {
  if (!input.url?.startsWith("http")) return null;
  return {
    type: "video",
    url: toPlayableVideoUrl(input.url),
    publicId: input.publicId,
    resourceType: "video",
    format: input.format || "mp4",
    bytes: input.bytes,
    duration: input.duration,
  };
}

async function processHomeSettings(rawHome: Record<string, unknown>) {
  const bannerMode = rawHome.bannerMode === "single_video" ? "single_video" : "image_slider";

  const rawBanners: Array<{
    id?: string;
    title?: string;
    subtitle?: string;
    order?: number;
    isActive?: boolean;
    activeMedia?: MediaAsset;
    mediaUpload?: string;
  }> = Array.isArray(rawHome.banners) ? rawHome.banners : [];

  const processedBanners: BannerItem[] = [];
  for (let i = 0; i < rawBanners.length; i++) {
    const b = rawBanners[i];
    const bannerId = b.id || `banner-${i + 1}`;
    const activeMedia = await resolveImageMedia(b.mediaUpload, b.activeMedia);
    processedBanners.push({
      id: bannerId,
      title: b.title || "",
      subtitle: b.subtitle || "",
      order: typeof b.order === "number" ? b.order : i + 1,
      isActive: b.isActive !== false,
      activeMedia,
      pendingMedia: null,
      processingStatus: "idle",
    });
  }

  const rawSingle = (rawHome.singleBanner || {}) as Record<string, unknown>;
  const existingSingleMedia = (rawSingle.activeMedia as MediaAsset | undefined) || null;

  const videoFromPayload =
    toVideoMedia({
      url:
        typeof rawSingle.videoUrl === "string"
          ? rawSingle.videoUrl
          : looksLikeVideo(existingSingleMedia)
            ? existingSingleMedia?.url
            : undefined,
      publicId:
        typeof rawSingle.videoPublicId === "string"
          ? rawSingle.videoPublicId
          : existingSingleMedia?.publicId,
      format:
        typeof rawSingle.videoFormat === "string"
          ? rawSingle.videoFormat
          : existingSingleMedia?.format,
      bytes: existingSingleMedia?.bytes,
      duration: existingSingleMedia?.duration,
    }) || null;

  let singleActiveMedia: MediaAsset;
  if (videoFromPayload) {
    singleActiveMedia = videoFromPayload;
  } else if (existingSingleMedia?.url && !looksLikeVideo(existingSingleMedia)) {
    singleActiveMedia = await resolveImageMedia(
      typeof rawSingle.mediaUpload === "string" ? rawSingle.mediaUpload : undefined,
      existingSingleMedia
    );
  } else if (typeof rawSingle.mediaUpload === "string") {
    singleActiveMedia = await resolveImageMedia(rawSingle.mediaUpload, existingSingleMedia);
  } else if (bannerMode === "single_video") {
    // Never fall back to carousel slide images for video mode
    singleActiveMedia = { type: "video", url: "", resourceType: "video" };
  } else {
    singleActiveMedia = processedBanners[0]?.activeMedia || { type: "image", url: "" };
  }

  const singleBanner: BannerItem = {
    id: (typeof rawSingle.id === "string" && rawSingle.id) || "single-banner-1",
    title: (typeof rawSingle.title === "string" && rawSingle.title) || "Dukandar Shandar",
    subtitle: (typeof rawSingle.subtitle === "string" && rawSingle.subtitle) || "",
    order: 1,
    isActive: rawSingle.isActive !== false,
    activeMedia: singleActiveMedia,
    pendingMedia: null,
    processingStatus: "idle",
  };

  return {
    bannerMode,
    banners: processedBanners,
    singleBanner,
    topRatedCount: Math.max(1, Math.min(24, Number(rawHome.topRatedCount) || 4)),
    productsPerPage: Math.max(1, Math.min(48, Number(rawHome.productsPerPage) || 9)),
  } satisfies PageSettings["home"];
}

async function processSubpageSettings(
  pageKey: "shop" | "about" | "contact",
  rawPage: Record<string, unknown>
) {
  const defaults = DEFAULT_PAGE_SETTINGS[pageKey];
  const videoMedia = toVideoMedia({
    url: typeof rawPage.videoUrl === "string" ? rawPage.videoUrl : undefined,
    publicId: typeof rawPage.videoPublicId === "string" ? rawPage.videoPublicId : undefined,
    format: typeof rawPage.videoFormat === "string" ? rawPage.videoFormat : undefined,
  });

  let bannerMedia: MediaAsset | undefined = videoMedia || undefined;
  let bannerImage = typeof rawPage.bannerImage === "string" ? rawPage.bannerImage : defaults.bannerImage || "";
  let bannerType = (rawPage.bannerType as MediaAsset["type"]) || defaults.bannerType;

  if (videoMedia) {
    bannerMedia = videoMedia;
    bannerImage = videoMedia.url;
    bannerType = "video";
  } else if (typeof rawPage.bannerImage === "string" && rawPage.bannerImage.startsWith("data:image/")) {
    bannerMedia = await resolveImageMedia(rawPage.bannerImage, null);
    bannerImage = bannerMedia.url;
    bannerType = "image";
  } else if (rawPage.bannerMedia && typeof rawPage.bannerMedia === "object") {
    bannerMedia = await resolveImageMedia(undefined, rawPage.bannerMedia as MediaAsset);
    bannerImage = bannerMedia.url;
    bannerType = bannerMedia.type;
  } else if (bannerImage) {
    bannerMedia = { type: bannerType === "video" ? "video" : "image", url: bannerImage };
  }

  const result = {
    bannerTitle:
      (typeof rawPage.bannerTitle === "string" && rawPage.bannerTitle.trim()) || defaults.bannerTitle,
    bannerSubtitle:
      typeof rawPage.bannerSubtitle === "string" ? rawPage.bannerSubtitle.trim() : defaults.bannerSubtitle,
    bannerType,
    bannerImage,
    bannerMedia,
  };

  if (pageKey === "shop") {
    return {
      ...result,
      productsPerPage: Math.max(1, Math.min(48, Number(rawPage.productsPerPage) || DEFAULT_PAGE_SETTINGS.shop.productsPerPage)),
    } satisfies PageSettings["shop"];
  }

  return result satisfies PageSettings["about"];
}

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

    return NextResponse.json({
      success: true,
      settings: normalizePageSettings(doc),
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
    const page = body.page as PageSettingsKey | undefined;

    if (!page || !["home", "shop", "about", "contact"].includes(page)) {
      return NextResponse.json(
        { success: false, message: "page must be one of: home, shop, about, contact" },
        { status: 400 }
      );
    }

    const pageData = (body.data || body[page] || {}) as Record<string, unknown>;
    const processed =
      page === "home"
        ? await processHomeSettings(pageData)
        : await processSubpageSettings(page, pageData);

    await db.collection("page_settings").updateOne(
      { key: "global_page_settings" },
      {
        $set: {
          key: "global_page_settings",
          [page]: processed,
          updated_at: new Date(),
          updated_by: auth.user.userName,
        },
      },
      { upsert: true }
    );

    const doc = await db.collection("page_settings").findOne({ key: "global_page_settings" });
    const settings = normalizePageSettings(doc);

    return NextResponse.json({
      success: true,
      message: `${page[0]!.toUpperCase()}${page.slice(1)} settings saved`,
      page,
      settings,
    });
  } catch (error) {
    console.error("Error updating page settings:", error);
    const message = error instanceof Error ? error.message : "Failed to update page settings";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
