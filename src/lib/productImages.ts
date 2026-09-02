export type ProductImage = {
  url: string;
  publicId?: string;
};

export const MAX_PRODUCT_IMAGES = 8;

export function getProductImages(product: {
  image?: string;
  images?: ProductImage[];
  image_public_id?: string;
}): ProductImage[] {
  if (Array.isArray(product.images) && product.images.length > 0) {
    return product.images.filter((img) => img?.url);
  }
  if (product.image) {
    return [{ url: product.image, publicId: product.image_public_id }];
  }
  return [];
}

export function getProductThumbnail(
  product: { image?: string; images?: ProductImage[]; image_public_id?: string },
  fallback = "/images/ds-icon.png"
): string {
  return getProductImages(product)[0]?.url || fallback;
}

export function getProductImageUrls(product: {
  image?: string;
  images?: ProductImage[];
  image_public_id?: string;
}): string[] {
  return getProductImages(product).map((img) => img.url);
}
