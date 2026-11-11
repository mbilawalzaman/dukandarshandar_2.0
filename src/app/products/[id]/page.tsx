import { cache } from "react";

import type { Metadata } from "next";
import { ObjectId } from "mongodb";

import ProductDetails, { type Product } from "@/app/components/ProductDetails";
import { bestDealForProduct } from "@/lib/promotionEngine";
import { ACTIVE_PRODUCT_FILTER } from "@/lib/checkoutValidation";
import { getProductImageUrls } from "@/lib/productImages";
import { getDb } from "@/lib/db";
import { getPublicPromotions } from "@/services/promotionService";
import { getDeliverySettings } from "@/lib/deliverySettings.server";
import type { ProductVariation } from "@/types/apps/productTypes";

type ProductForStructuredData = {
  _id: ObjectId;
  name?: string;
  description?: string;
  category?: string;
  price?: number;
  discountPrice?: number | null;
  quantity?: number;
  variations?: ProductVariation[];
  image?: string;
  images?: { url: string; publicId?: string }[];
  rating?: number;
  ratings?: number[];
  reviewCount?: number;
};

const getProductCached = cache(
  async (id: string): Promise<ProductForStructuredData | null> => {
    if (!ObjectId.isValid(id)) return null;

    try {
      const db = await getDb();

      return (await db.collection("products").findOne({
        _id: new ObjectId(id),
        ...ACTIVE_PRODUCT_FILTER,
      })) as ProductForStructuredData | null;
    } catch (error) {
      console.error("Could not load product for SEO/metadata:", error);

      return null;
    }
  },
);

function cleanDescription(text?: string, fallback = ""): string {
  if (!text) return fallback;

  const stripped = text
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (stripped.length > 155) {
    return `${stripped.slice(0, 152)}...`;
  }

  return stripped || fallback;
}

function getWhatsAppOgImage(url: string): string {
  if (
    !url ||
    !url.includes("res.cloudinary.com") ||
    !url.includes("/upload/")
  ) {
    return url;
  }

  if (url.includes("/upload/c_pad")) {
    return url;
  }

  return url.replace("/upload/", "/upload/c_pad,b_white,w_1200,h_630/");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductCached(id);
  const deliverySettings = await getDeliverySettings().catch(() => null);
  const shopName = deliverySettings?.shopName?.trim() || "Dukandar Shandar";

  if (!product) {
    return {
      title: "Product Not Found",
      description: "The requested product is unavailable or does not exist.",
      robots: { index: false, follow: true },
    };
  }

  const siteUrl = (
    process.env.NEXT_PUBLIC_APP_URL || "https://www.dukandarshandar.com"
  ).replace(/\/+$/, "");

  const productUrl = `${siteUrl}/products/${id}`;
  const productName = product.name?.trim() || "Product";
  const basePrice = Number(product.price) || 0;

  const fallbackDescription = `Buy ${productName} online in Pakistan${
    basePrice > 0 ? ` for PKR ${basePrice.toLocaleString()}` : ""
  }. Quality stationery, craft & school supplies with fast nationwide delivery from ${shopName}.`;

  const description = cleanDescription(
    product.description,
    fallbackDescription,
  );

  const images = [...new Set(getProductImageUrls(product))].filter((url) =>
    /^https?:\/\//i.test(url),
  );

  const ogImages = images.slice(0, 4).map((url) => ({
    url: getWhatsAppOgImage(url),
    width: 1200,
    height: 630,
    alt: productName,
  }));

  return {
    title: productName,
    description,
    alternates: {
      canonical: productUrl,
    },
    openGraph: {
      title: `${productName} | ${shopName}`,
      description,
      url: productUrl,
      siteName: shopName,
      type: "website",
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: `${productName} | ${shopName}`,
      description,
      images: images.length > 0 ? [getWhatsAppOgImage(images[0])] : [],
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [product, deliverySettings] = await Promise.all([
    getProductCached(id),
    getDeliverySettings().catch(() => null),
  ]);

  const shopName = deliverySettings?.shopName?.trim() || "Dukandar Shandar";

  let productJsonLd: Record<string, unknown> | null = null;

  if (product) {
    const basePrice = Number(product.price) || 0;
    const discountAmount = Number(product.discountPrice) || 0;

    const directSalePrice =
      discountAmount > 0 && discountAmount < basePrice
        ? basePrice - discountAmount
        : null;

    let price = directSalePrice ?? basePrice;
    let promotionsLoaded = false;

    try {
      const promotions = await getPublicPromotions();

      const deal = bestDealForProduct(
        {
          _id: String(product._id),
          price: basePrice,
          category: product.category,
        },
        promotions,
      );

      if (deal && directSalePrice !== null) {
        price = Math.min(deal.salePrice, directSalePrice);
      } else if (deal) {
        price = deal.salePrice;
      }

      promotionsLoaded = true;
    } catch (error) {
      // Do not publish a potentially incorrect Offer price if promotion data is unavailable.
      console.error(
        "Could not load promotions for product structured data:",
        error,
      );
    }

    const stock = product.variations?.length
      ? product.variations
          .filter((variation) => !variation.archived)
          .reduce(
            (total, variation) => total + (Number(variation.quantity) || 0),
            0,
          )
      : Number(product.quantity) || 0;

    const images = [...new Set(getProductImageUrls(product))].filter((url) =>
      /^https?:\/\//i.test(url),
    );

    const siteUrl = (
      process.env.NEXT_PUBLIC_APP_URL || "https://www.dukandarshandar.com"
    ).replace(/\/+$/, "");

    const productUrl = `${siteUrl}/products/${product._id}`;
    const reviewCount = Math.max(0, Number(product.reviewCount) || 0);
    const rating = Number(product.rating);

    productJsonLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name || "",
      ...(product.description ? { description: product.description } : {}),
      ...(images.length ? { image: images } : {}),
      productID: String(product._id),
      sku: String(product._id),
      brand: {
        "@type": "Brand",
        name: shopName,
      },
      url: productUrl,
      ...(promotionsLoaded
        ? {
            offers: {
              "@type": "Offer",
              url: productUrl,
              priceCurrency: "PKR",
              price: price.toFixed(2),
              availability:
                stock > 0
                  ? "https://schema.org/InStock"
                  : "https://schema.org/OutOfStock",
              itemCondition: "https://schema.org/NewCondition",
            },
          }
        : {}),
      ...(reviewCount > 0 &&
      Number.isFinite(rating) &&
      rating >= 0.5 &&
      rating <= 5
        ? {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: rating,
              ratingCount: reviewCount,
              reviewCount,
            },
          }
        : {}),
    };
  }

  const initialProduct: Product | null = product
    ? {
        _id: String(product._id),
        name: product.name ?? "",
        category: product.category ?? "",
        price: Number(product.price) || 0,
        discountPrice:
          typeof product.discountPrice === "number"
            ? product.discountPrice
            : null,
        quantity: Number(product.quantity) || 0,
        rating: Number(product.rating) || 0,
        ratings: Array.isArray(product.ratings) ? product.ratings : [],
        image: product.image ?? "",
        images: Array.isArray(product.images) ? product.images : [],
        description: product.description ?? "",
        variations: Array.isArray(product.variations)
          ? product.variations
          : undefined,
      }
    : null;

  return (
    <>
      {productJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(productJsonLd).replace(/</g, "\\u003c"),
          }}
        />
      )}
      <ProductDetails initialProduct={initialProduct} />
    </>
  );
}
