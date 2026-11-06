import { ObjectId } from "mongodb";

import ProductDetails from "@/app/components/ProductDetails";
import { bestDealForProduct } from "@/lib/promotionEngine";
import { ACTIVE_PRODUCT_FILTER } from "@/lib/checkoutValidation";
import { getProductImageUrls } from "@/lib/productImages";
import { getDb } from "@/lib/db";
import { getPublicPromotions } from "@/services/promotionService";
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
  reviewCount?: number;
};

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let product: ProductForStructuredData | null = null;

  if (ObjectId.isValid(id)) {
    try {
      const db = await getDb();

      product = (await db.collection("products").findOne({
        _id: new ObjectId(id),
        ...ACTIVE_PRODUCT_FILTER,
      })) as ProductForStructuredData | null;
    } catch (error) {
      // Keep the product page available if the optional SEO lookup fails.
      console.error("Could not load product structured data:", error);
    }
  }

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
      <ProductDetails />
    </>
  );
}
