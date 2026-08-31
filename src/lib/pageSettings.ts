export type BannerMediaType = "image" | "lottie";
export type ProcessingStatus = "idle" | "uploading" | "processing" | "failed";

export interface MediaAsset {
  type: BannerMediaType;
  url: string;
  publicId?: string;
  resourceType?: "image" | "raw";
  format?: string;
  width?: number;
  height?: number;
  duration?: number;
  bytes?: number;
}

export interface BannerItem {
  id: string;
  title?: string;
  subtitle?: string;
  order: number;
  isActive: boolean;
  activeMedia: MediaAsset;
  pendingMedia?: MediaAsset | null;
  processingStatus: ProcessingStatus;
  errorMessage?: string;
}

export interface PageBannerConfig {
  bannerTitle: string;
  bannerSubtitle: string;
  bannerType: BannerMediaType;
  bannerImage?: string;
  bannerMedia?: MediaAsset;
  productsPerPage?: number;
}

export interface PageSettings {
  home: {
    bannerMode: "image_slider" | "single_lottie";
    banners: BannerItem[];
    singleBanner?: BannerItem;
    bannerImages?: string[];
    topRatedCount: number;
    productsPerPage: number;
  };
  shop: PageBannerConfig & { productsPerPage: number };
  about: PageBannerConfig;
  contact: PageBannerConfig;
}

export const DEFAULT_PAGE_SETTINGS: PageSettings = {
  home: {
    bannerMode: "image_slider",
    banners: [],
    singleBanner: undefined,
    topRatedCount: 4,
    productsPerPage: 9,
  },
  shop: {
    bannerTitle: "Shop Catalog",
    bannerSubtitle: "Explore all stationery, crafts, and creative essentials",
    bannerType: "image",
    bannerImage: "",
    productsPerPage: 9,
  },
  about: {
    bannerTitle: "ABOUT US",
    bannerSubtitle: "Where creativity meets convenience",
    bannerType: "image",
    bannerImage: "",
  },
  contact: {
    bannerTitle: "CONTACT",
    bannerSubtitle: "We would love to hear from you",
    bannerType: "image",
    bannerImage: "",
  },
};

export interface RawMongoPageSettingsDoc {
  home?: {
    bannerMode?: "image_slider" | "single_lottie";
    bannerImages?: string[];
    banners?: BannerItem[];
    singleBanner?: BannerItem;
    topRatedCount?: number;
    productsPerPage?: number;
  };
  shop?: Partial<PageSettings["shop"]>;
  about?: Partial<PageSettings["about"]>;
  contact?: Partial<PageSettings["contact"]>;
}

/**
 * Normalizes database records without injecting hardcoded dummy fallback images
 */
export function normalizePageSettings(doc: RawMongoPageSettingsDoc | Record<string, unknown> | null | undefined): PageSettings {
  const safeDoc = (doc || {}) as RawMongoPageSettingsDoc;
  const homeDoc = safeDoc.home || {};
  let banners: BannerItem[] = [];

  if (Array.isArray(homeDoc.banners) && homeDoc.banners.length > 0) {
    banners = homeDoc.banners.map((b: BannerItem, idx: number) => ({
      id: b.id || `banner-${idx + 1}`,
      title: b.title || "",
      subtitle: b.subtitle || "",
      order: typeof b.order === "number" ? b.order : idx + 1,
      isActive: b.isActive !== false,
      activeMedia: b.activeMedia || {
        type: "image",
        url: "",
      },
      pendingMedia: b.pendingMedia || null,
      processingStatus: b.processingStatus || "idle",
      errorMessage: b.errorMessage || undefined,
    }));
  } else if (Array.isArray(homeDoc.bannerImages) && homeDoc.bannerImages.length > 0) {
    banners = homeDoc.bannerImages.map((imgUrl: string, idx: number) => ({
      id: `banner-${idx + 1}`,
      title: `Banner ${idx + 1}`,
      subtitle: "",
      order: idx + 1,
      isActive: true,
      activeMedia: {
        type: "image",
        url: imgUrl,
        resourceType: "image",
      },
      pendingMedia: null,
      processingStatus: "idle",
    }));
  }

  // Preserve the user's existing active media for singleBanner
  let singleBanner: BannerItem | undefined = homeDoc.singleBanner;
  if (!singleBanner && banners.length > 0) {
    singleBanner = {
      ...banners[0],
      id: "single-banner-1",
    };
  }

  return {
    home: {
      ...DEFAULT_PAGE_SETTINGS.home,
      ...(safeDoc.home || {}),
      bannerMode: homeDoc.bannerMode || "image_slider",
      banners,
      singleBanner,
    },
    shop: {
      ...DEFAULT_PAGE_SETTINGS.shop,
      ...(safeDoc.shop || {}),
      bannerType: safeDoc.shop?.bannerType || "image",
    },
    about: {
      ...DEFAULT_PAGE_SETTINGS.about,
      ...(safeDoc.about || {}),
      bannerType: safeDoc.about?.bannerType || "image",
    },
    contact: {
      ...DEFAULT_PAGE_SETTINGS.contact,
      ...(safeDoc.contact || {}),
      bannerType: safeDoc.contact?.bannerType || "image",
    },
  };
}
