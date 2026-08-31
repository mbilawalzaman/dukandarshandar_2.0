export interface PageSettings {
  home: {
    bannerImages: string[];
    topRatedCount: number;
    productsPerPage: number;
  };
  shop: {
    bannerTitle: string;
    bannerSubtitle: string;
    bannerImage?: string;
    productsPerPage: number;
  };
  about: {
    bannerTitle: string;
    bannerSubtitle: string;
    bannerImage?: string;
  };
  contact: {
    bannerTitle: string;
    bannerSubtitle: string;
    bannerImage?: string;
  };
}

export const DEFAULT_PAGE_SETTINGS: PageSettings = {
  home: {
    bannerImages: [
      "/images/banner1.jpg",
      "/images/banner2.jpg",
      "/images/banner3.jpg",
    ],
    topRatedCount: 4,
    productsPerPage: 9,
  },
  shop: {
    bannerTitle: "Shop Catalog",
    bannerSubtitle: "Explore all stationery, crafts, and creative essentials",
    bannerImage: "",
    productsPerPage: 9,
  },
  about: {
    bannerTitle: "ABOUT US",
    bannerSubtitle: "Where creativity meets convenience",
    bannerImage: "",
  },
  contact: {
    bannerTitle: "CONTACT",
    bannerSubtitle: "We would love to hear from you",
    bannerImage: "",
  },
};
