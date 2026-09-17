export type BannerMediaType = "image" | "video";
export type ProcessingStatus = "idle" | "uploading" | "processing" | "failed";
export type PageSettingsKey = "home" | "shop" | "about" | "contact";
export type HomeBannerMode = "image_slider" | "single_video";

export interface MediaAsset {
  type: BannerMediaType;
  url: string;
  publicId?: string;
  resourceType?: "image" | "video" | "raw";
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
  goToLink?: string;
  order: number;
  isActive: boolean;
  activeMedia: MediaAsset;
  pendingMedia?: MediaAsset | null;
  processingStatus?: ProcessingStatus;
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

export interface HeroFeatureItem {
  id: string;
  icon: "verified" | "craft" | "shipping" | "security";
  title: string;
  desc1: string;
  desc2: string;
}

export interface HeroSectionConfig {
  enabled: boolean;
  features: HeroFeatureItem[];
}

export interface AboutHighlightItem {
  id: string;
  icon: "time" | "craft" | "shipping" | "security";
  title: string;
  text: string;
}

export interface AboutStoryConfig {
  title: string;
  text: string;
  image: string;
  buttonText: string;
  buttonLink: string;
}

export interface AboutPageSettingsConfig extends PageBannerConfig {
  highlights?: AboutHighlightItem[];
  story?: AboutStoryConfig;
  quotes?: string[];
}

export interface PageSettings {
  home: {
    bannerMode: HomeBannerMode;
    banners: BannerItem[];
    singleBanner?: BannerItem;
    bannerImages?: string[];
    topRatedCount: number;
    productsPerPage: number;
    heroSection?: HeroSectionConfig;
  };
  shop: PageBannerConfig & { productsPerPage: number };
  about: AboutPageSettingsConfig;
  contact: PageBannerConfig;
}

export const DEFAULT_PAGE_SETTINGS: PageSettings = {
  home: {
    bannerMode: "image_slider",
    banners: [],
    singleBanner: undefined,
    topRatedCount: 4,
    productsPerPage: 9,
    heroSection: {
      enabled: true,
      features: [
        {
          id: "feature-1",
          icon: "verified",
          title: "",
          desc1: "",
          desc2: "",
        },
        {
          id: "feature-2",
          icon: "craft",
          title: "",
          desc1: "",
          desc2: "",
        },
        {
          id: "feature-3",
          icon: "shipping",
          title: "",
          desc1: "",
          desc2: "",
        },
        {
          id: "feature-4",
          icon: "security",
          title: "",
          desc1: "",
          desc2: "",
        },
      ],
    },
  },
  shop: {
    bannerTitle: "Shop Catalog",
    bannerSubtitle: "",
    bannerType: "image",
    bannerImage: "",
    productsPerPage: 9,
  },
  about: {
    bannerTitle: "ABOUT US",
    bannerSubtitle: "",
    bannerType: "image",
    bannerImage: "",
    highlights: [
      { id: "hl-1", icon: "time", title: "", text: "" },
      { id: "hl-2", icon: "craft", title: "", text: "" },
      { id: "hl-3", icon: "shipping", title: "", text: "" },
      { id: "hl-4", icon: "security", title: "", text: "" },
    ],
    story: {
      title: "",
      text: "",
      image: "",
      buttonText: "View products",
      buttonLink: "/shop",
    },
    quotes: [],
  },
  contact: {
    bannerTitle: "CONTACT",
    bannerSubtitle: "",
    bannerType: "image",
    bannerImage: "",
  },
};

export interface RawMongoPageSettingsDoc {
  home?: {
    bannerMode?: HomeBannerMode | "single_lottie";
    bannerImages?: string[];
    banners?: BannerItem[];
    singleBanner?: BannerItem;
    topRatedCount?: number;
    productsPerPage?: number;
    heroSection?: HeroSectionConfig;
  };
  shop?: Partial<PageSettings["shop"]>;
  about?: Partial<AboutPageSettingsConfig>;
  contact?: Partial<PageSettings["contact"]>;
}

function normalizeMediaAsset(media?: MediaAsset | null): MediaAsset {
  if (!media?.url) {
    return { type: "image", url: "" };
  }

  let url = media.url;
  const lower = url.toLowerCase();
  let type: BannerMediaType = media.type === "video" ? "video" : "image";

  // Filter out deleted local static image fallbacks (e.g., /images/banner2.jpg, /images/ds-icon.png)
  if (url.startsWith("/images/")) {
    const validStaticImages = ["/images/store-qr-code.png"];
    if (!validStaticImages.includes(url)) {
      return { type: "image", url: "" };
    }
  }

  // Legacy Lottie assets are ignored for playback; admin should re-upload MP4/image.
  if (
    (media.type as string) === "lottie" ||
    lower.endsWith(".json") ||
    lower.includes("/raw/upload/")
  ) {
    return { type: "image", url: "" };
  }

  if (
    type === "video" ||
    lower.includes("/video/upload/") ||
    /\.(mp4|webm|mov)(\?|$)/i.test(lower)
  ) {
    type = "video";
    // Client-safe inline transform (avoid importing node cloudinary SDK here)
    if (url.includes("res.cloudinary.com") && url.includes("/video/upload/") && !url.includes("/video/upload/f_mp4")) {
      url = url.replace("/video/upload/", "/video/upload/f_mp4/");
    }
  } else {
    type = "image";
  }

  return {
    ...media,
    type,
    url,
  };
}

function normalizeBannerMode(mode?: string): HomeBannerMode {
  if (mode === "single_video" || mode === "single_lottie") return "single_video";
  return "image_slider";
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
      goToLink: typeof b.goToLink === "string" ? b.goToLink : undefined,
      order: typeof b.order === "number" ? b.order : idx + 1,
      isActive: b.isActive !== false,
      activeMedia: normalizeMediaAsset(b.activeMedia),
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

  let singleBanner: BannerItem | undefined = homeDoc.singleBanner
    ? {
        ...homeDoc.singleBanner,
        activeMedia: normalizeMediaAsset(homeDoc.singleBanner.activeMedia),
        processingStatus: homeDoc.singleBanner.processingStatus || "idle",
      }
    : undefined;

  if (!singleBanner && banners.length > 0 && normalizeBannerMode(homeDoc.bannerMode) !== "single_video") {
    singleBanner = {
      ...banners[0],
      id: "single-banner-1",
    };
  }

  const normalizePageBanner = (
    page: Partial<PageBannerConfig> | undefined,
    defaults: PageBannerConfig
  ): PageBannerConfig => {
    const merged = { ...defaults, ...(page || {}) };
    const media = normalizeMediaAsset(merged.bannerMedia || (merged.bannerImage ? { type: merged.bannerType, url: merged.bannerImage } : null));
    return {
      ...merged,
      bannerType: media.type || merged.bannerType || "image",
      bannerImage: media.url || merged.bannerImage || "",
      bannerMedia: media.url ? media : undefined,
    };
  };

  return {
    home: {
      ...DEFAULT_PAGE_SETTINGS.home,
      ...(safeDoc.home || {}),
      bannerMode: normalizeBannerMode(homeDoc.bannerMode),
      banners,
      singleBanner,
      heroSection: {
        enabled: homeDoc.heroSection?.enabled !== false,
        features: Array.isArray(homeDoc.heroSection?.features) && homeDoc.heroSection!.features.length > 0
          ? homeDoc.heroSection!.features
          : DEFAULT_PAGE_SETTINGS.home.heroSection!.features,
      },
    },
    shop: {
      ...normalizePageBanner(safeDoc.shop, DEFAULT_PAGE_SETTINGS.shop),
      productsPerPage: Number(safeDoc.shop?.productsPerPage) || DEFAULT_PAGE_SETTINGS.shop.productsPerPage,
    },
    about: {
      ...normalizePageBanner(safeDoc.about, DEFAULT_PAGE_SETTINGS.about),
      highlights: Array.isArray(safeDoc.about?.highlights) && safeDoc.about!.highlights!.length > 0
        ? safeDoc.about!.highlights
        : DEFAULT_PAGE_SETTINGS.about.highlights,
      story: {
        title: safeDoc.about?.story?.title ?? DEFAULT_PAGE_SETTINGS.about.story?.title ?? "",
        text: safeDoc.about?.story?.text ?? DEFAULT_PAGE_SETTINGS.about.story?.text ?? "",
        image: safeDoc.about?.story?.image ?? DEFAULT_PAGE_SETTINGS.about.story?.image ?? "",
        buttonText: safeDoc.about?.story?.buttonText ?? DEFAULT_PAGE_SETTINGS.about.story?.buttonText ?? "View products",
        buttonLink: safeDoc.about?.story?.buttonLink ?? DEFAULT_PAGE_SETTINGS.about.story?.buttonLink ?? "/shop",
      },
      quotes: Array.isArray(safeDoc.about?.quotes) && safeDoc.about!.quotes!.length > 0
        ? safeDoc.about!.quotes
        : DEFAULT_PAGE_SETTINGS.about.quotes,
    },
    contact: normalizePageBanner(safeDoc.contact, DEFAULT_PAGE_SETTINGS.contact),
  };
}
