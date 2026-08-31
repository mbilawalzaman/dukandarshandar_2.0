import { v2 as cloudinary } from "cloudinary";

export type CloudinaryUpload = {
  url: string;
  publicId: string;
};

function isConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

function configure() {
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

export function isCloudinaryUrl(value: string) {
  return value.includes("res.cloudinary.com");
}

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
  };
}

export async function deleteImage(publicId?: string | null) {
  if (!publicId) return;
  try {
    configure();
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Cloudinary delete failed:", error);
  }
}

/** @deprecated use uploadImage */
export async function persistImage(image: string | undefined | null): Promise<string> {
  if (!image) return "/images/logo.jpg";
  const uploaded = await uploadImage(image);
  return uploaded.url;
}
