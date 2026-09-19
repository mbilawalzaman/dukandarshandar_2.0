export type BannerMediaType = "image" | "video";
export type ProcessingStatus = "idle" | "uploading" | "processing" | "failed";
export type PageSettingsKey = "home" | "shop" | "about" | "contact" | "privacy" | "terms" | "shipping" | "returns";
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

export interface PolicySectionItem {
  id: string;
  title: string;
  content: string;
}

export interface PolicyPageSettingsConfig extends PageBannerConfig {
  lastUpdated?: string;
  sections: PolicySectionItem[];
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
  privacy: PolicyPageSettingsConfig;
  terms: PolicyPageSettingsConfig;
  shipping: PolicyPageSettingsConfig;
  returns: PolicyPageSettingsConfig;
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
  privacy: {
    bannerTitle: "PRIVACY POLICY",
    bannerSubtitle: "How we collect, use, and protect your personal data",
    bannerType: "image",
    bannerImage: "",
    lastUpdated: "September 2026",
    sections: [
      {
        id: "priv-1",
        title: "Information We Collect",
        content: "At Dukandar Shandar, we collect personal information necessary to process your orders and enhance your shopping experience. This includes your name, email address, phone number, shipping address, and payment method details.",
      },
      {
        id: "priv-2",
        title: "How We Use Your Information",
        content: "Your information is used strictly to process orders, generate shipping labels, deliver stationery and craft products, send order tracking updates, and provide customer support via email or WhatsApp.",
      },
      {
        id: "priv-3",
        title: "Payment Security & Third Parties",
        content: "Online card and digital wallet payments are securely processed through encrypted payment gateways (Safepay). We never store raw credit card numbers or banking secrets on our servers. Courier partners (e.g., PostEx) receive only your shipping name, address, and contact number for parcel fulfillment.",
      },
      {
        id: "priv-4",
        title: "Cookies & Local Storage",
        content: "We use secure browser cookies and local storage to save your cart items, maintain active login sessions, and optimize storefront performance.",
      },
      {
        id: "priv-5",
        title: "Your Data Rights & Contact",
        content: "You may request access to, correction of, or deletion of your stored profile data at any time by contacting our support team via our Contact page or WhatsApp.",
      },
    ],
  },
  terms: {
    bannerTitle: "TERMS & CONDITIONS",
    bannerSubtitle: "Rules, terms, and guidelines for shopping with us",
    bannerType: "image",
    bannerImage: "",
    lastUpdated: "September 2026",
    sections: [
      {
        id: "terms-1",
        title: "Acceptance of Terms",
        content: "By accessing Dukandar Shandar or placing an order, you agree to be bound by these Terms & Conditions. If you do not agree to all terms, please do not use our website.",
      },
      {
        id: "terms-2",
        title: "Products & Pricing",
        content: "All prices listed on our storefront are in Pakistani Rupees (PKR) and include applicable taxes unless stated otherwise. We reserve the right to correct pricing errors or update product availability without prior notice.",
      },
      {
        id: "terms-3",
        title: "Order Acceptance & Payments",
        content: "An order placement constitutes an offer to purchase. We reserve the right to decline or cancel orders due to stock unavailability, pricing inaccuracies, or suspected fraud. Cash on Delivery (COD) orders require exact payment upon parcel delivery.",
      },
      {
        id: "terms-4",
        title: "User Accounts",
        content: "You are responsible for maintaining the confidentiality of your account password and restricting access to your computer.",
      },
      {
        id: "terms-5",
        title: "Governing Law",
        content: "These terms are governed by and construed in accordance with the laws of the Islamic Republic of Pakistan.",
      },
    ],
  },
  shipping: {
    bannerTitle: "SHIPPING & DELIVERY POLICY",
    bannerSubtitle: "Parcel delivery timelines, rates, and tracking info",
    bannerType: "image",
    bannerImage: "",
    lastUpdated: "September 2026",
    sections: [
      {
        id: "ship-1",
        title: "Delivery Timelines",
        content: "We deliver stationery, craft supplies, and art materials across all major cities and rural areas in Pakistan. Standard delivery takes 2 to 4 business days for major urban cities (Lahore, Karachi, Islamabad, Rawalpindi, Faisalabad) and 3 to 6 business days for secondary towns.",
      },
      {
        id: "ship-2",
        title: "Shipping Charges & Free Delivery Promotions",
        content: "Standard shipping fee is flat rate (e.g. PKR 250) per order across Pakistan. We regularly run Free Shipping promotions on orders exceeding specific cart amounts or via special promotion vouchers.",
      },
      {
        id: "ship-3",
        title: "Cash on Delivery (COD) Rules",
        content: "For Cash on Delivery (COD) orders, please keep exact cash ready upon rider arrival. Riders are authorized to hand over parcels only after cash collection.",
      },
      {
        id: "ship-4",
        title: "Order Tracking",
        content: "Once your order is processed and handed over to our courier partner (e.g. PostEx), you will receive email/SMS notifications with your tracking ID to track your package live.",
      },
    ],
  },
  returns: {
    bannerTitle: "RETURNS & REFUNDS POLICY",
    bannerSubtitle: "7-Day return policy and hassle-free refund process",
    bannerType: "image",
    bannerImage: "",
    lastUpdated: "September 2026",
    sections: [
      {
        id: "ret-1",
        title: "7-Day Return Window",
        content: "We accept return requests within 7 days of order delivery if you receive damaged, defective, or incorrect stationery products.",
      },
      {
        id: "ret-2",
        title: "Eligibility Criteria",
        content: "To be eligible for a return, your item must be unused, in its original packaging, and accompanied by proof of purchase (Order ID or receipt).",
      },
      {
        id: "ret-3",
        title: "Refund Process",
        content: "Once your returned parcel is received and inspected, we will notify you of the approval or rejection of your refund. Approved refunds are processed to your original payment method (Safepay online refund) or Bank Account / Raast for COD orders within 3 to 5 business days.",
      },
      {
        id: "ret-4",
        title: "Damaged or Wrong Items",
        content: "If your parcel arrives damaged during transit, please contact us immediately via WhatsApp or email with unboxing photos/videos so we can arrange a free replacement.",
      },
    ],
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
  privacy?: Partial<PolicyPageSettingsConfig>;
  terms?: Partial<PolicyPageSettingsConfig>;
  shipping?: Partial<PolicyPageSettingsConfig>;
  returns?: Partial<PolicyPageSettingsConfig>;
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

  const normalizePolicyPage = (
    page: Partial<PolicyPageSettingsConfig> | undefined,
    defaults: PolicyPageSettingsConfig
  ): PolicyPageSettingsConfig => {
    const banner = normalizePageBanner(page, defaults);
    const sections = Array.isArray(page?.sections) && page!.sections.length > 0
      ? page!.sections.map((s, idx) => ({
          id: s.id || `section-${idx + 1}`,
          title: typeof s.title === "string" ? s.title : "",
          content: typeof s.content === "string" ? s.content : "",
        }))
      : defaults.sections;

    return {
      ...banner,
      lastUpdated: typeof page?.lastUpdated === "string" ? page.lastUpdated : defaults.lastUpdated || "September 2026",
      sections,
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
    privacy: normalizePolicyPage(safeDoc.privacy, DEFAULT_PAGE_SETTINGS.privacy),
    terms: normalizePolicyPage(safeDoc.terms, DEFAULT_PAGE_SETTINGS.terms),
    shipping: normalizePolicyPage(safeDoc.shipping, DEFAULT_PAGE_SETTINGS.shipping),
    returns: normalizePolicyPage(safeDoc.returns, DEFAULT_PAGE_SETTINGS.returns),
  };
}
