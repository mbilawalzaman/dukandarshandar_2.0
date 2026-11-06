import type { MetadataRoute } from "next";

import { ACTIVE_PRODUCT_FILTER } from "@/lib/checkoutValidation";
import { getDb } from "@/lib/db";

export const revalidate = 3600;

type SitemapProduct = {
  _id: { toString(): string };
  updated_at?: Date | string;
};

function toLastModified(value: Date | string | undefined): Date | undefined {
  if (!value) return undefined;

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = (
    process.env.NEXT_PUBLIC_APP_URL || "https://www.dukandarshandar.com"
  ).replace(/\/+$/, "");

  const staticPages: MetadataRoute.Sitemap = [
    { url: siteUrl, priority: 1, changeFrequency: "daily" },
    { url: `${siteUrl}/shop`, priority: 0.9, changeFrequency: "daily" },
    { url: `${siteUrl}/about`, priority: 0.6, changeFrequency: "monthly" },
    { url: `${siteUrl}/contact`, priority: 0.5, changeFrequency: "monthly" },
    { url: `${siteUrl}/support`, priority: 0.5, changeFrequency: "monthly" },
    { url: `${siteUrl}/blog`, priority: 0.7, changeFrequency: "weekly" },
    { url: `${siteUrl}/vouchers`, priority: 0.6, changeFrequency: "weekly" },
    {
      url: `${siteUrl}/shipping-policy`,
      priority: 0.3,
      changeFrequency: "yearly",
    },
    {
      url: `${siteUrl}/returns-and-refunds`,
      priority: 0.3,
      changeFrequency: "yearly",
    },
    {
      url: `${siteUrl}/privacy-policy`,
      priority: 0.2,
      changeFrequency: "yearly",
    },
    {
      url: `${siteUrl}/terms-of-service`,
      priority: 0.2,
      changeFrequency: "yearly",
    },
  ];

  try {
    const db = await getDb();

    const products = (await db
      .collection("products")
      .find(ACTIVE_PRODUCT_FILTER)
      .project({ _id: 1, updated_at: 1 })
      .limit(49_989)
      .toArray()) as SitemapProduct[];

    return [
      ...staticPages,
      ...products.map((product) => ({
        url: `${siteUrl}/products/${product._id}`,
        lastModified: toLastModified(product.updated_at),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ];
  } catch (error) {
    console.error("Could not load products for sitemap:", error);

    return staticPages;
  }
}
