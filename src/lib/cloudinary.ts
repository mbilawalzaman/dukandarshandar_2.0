import { v2 as cloudinary } from "cloudinary";

export type CloudinaryUpload = {
  url: string;
  publicId: string;
  format?: string;
  resourceType?: "image" | "video" | "raw";
  width?: number;
  height?: number;
  duration?: number;
  bytes?: number;
};

export function isConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

export function configure() {
  if (!isConfigured()) {
    throw new Error("Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.");
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export function isCloudinaryUrl(value: string): boolean {
  return typeof value === "string" && value.includes("res.cloudinary.com");
}

/**
 * Standard image upload helper for products, icons, and storefront static assets
 */
export async function uploadImage(
  image: string,
  folder = "dukandarshandar/products"
): Promise<CloudinaryUpload> {
  if (!image) {
    throw new Error("No image provided");
  }

  if (image.startsWith("http") && !image.startsWith("data:")) {
    return { url: image, publicId: "" };
  }

  configure();

  const result = await cloudinary.uploader.upload(image, {
    folder,
    resource_type: "image",
    overwrite: false,
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    format: result.format,
    resourceType: "image",
    width: result.width,
    height: result.height,
    bytes: result.bytes,
  };
}

/**
 * Deletes an asset from Cloudinary storage
 */
export async function deleteAsset(publicId?: string | null, resourceType: "image" | "video" | "raw" = "image") {
  if (!publicId) return;
  try {
    configure();
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (error) {
    console.error("Cloudinary delete failed:", error);
  }
}

export { toPlayableVideoUrl } from "@/lib/cloudinaryUrl";

/** Signed params for browser → Cloudinary direct upload (avoids Next.js body size limits). */
export function getSignedUploadParams(options?: {
  folder?: string;
  resourceType?: "image" | "video" | "raw" | "auto";
}) {
  configure();

  const folder = options?.folder || "dukandarshandar/banners/videos";
  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = { timestamp, folder };
  const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET!);

  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    timestamp,
    folder,
    signature,
    resourceType: options?.resourceType || "video",
  };
}

/** @deprecated use deleteAsset */
export const deleteImage = deleteAsset;

/** @deprecated use uploadImage */
export async function persistImage(image: string | undefined | null): Promise<string> {
  if (!image) return "/images/logo.jpg";
  const uploaded = await uploadImage(image);
  return uploaded.url;
}
