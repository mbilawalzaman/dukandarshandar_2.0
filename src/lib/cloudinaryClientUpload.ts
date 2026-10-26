import { authFetch } from "@/lib/authFetch";
import { toPlayableVideoUrl } from "@/lib/cloudinaryUrl";

/**
 * Upload a video file directly to Cloudinary (browser → Cloudinary).
 * Avoids Next.js / Vercel request body size limits (413).
 */
export async function uploadVideoToCloudinary(file: File): Promise<{
  url: string;
  publicId: string;
  format?: string;
  bytes?: number;
  duration?: number;
}> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const signRes = await authFetch("/api/admin/media/sign", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ resourceType: "video" }),
  });

  const signData = await signRes.json();

  if (!signRes.ok || !signData.success || !signData.upload) {
    throw new Error(signData.message || "Could not start video upload");
  }

  const { cloudName, apiKey, timestamp, folder, signature, resourceType } =
    signData.upload;

  const formData = new FormData();

  formData.append("file", file);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);
  formData.append("folder", folder);

  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  const uploadData = await uploadRes.json();

  if (!uploadRes.ok || !uploadData.secure_url) {
    throw new Error(
      uploadData.error?.message || "Cloudinary video upload failed",
    );
  }

  return {
    url: toPlayableVideoUrl(uploadData.secure_url as string),
    publicId: uploadData.public_id as string,
    format: uploadData.format as string | undefined,
    bytes: uploadData.bytes as number | undefined,
    duration: uploadData.duration as number | undefined,
  };
}

/** Upload product bytes directly; only signed parameters pass through the app. */
export async function uploadImageToCloudinary(
  file: File,
): Promise<{ url: string; publicId: string }> {
  if (
    !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)
  )
    throw new Error("Choose a JPEG, PNG, WebP, or GIF image.");
  if (file.size > 5 * 1024 * 1024)
    throw new Error("Each image must be under 5MB.");

  const signedResponse = await authFetch("/api/admin/media/sign", {
    method: "POST",
    body: JSON.stringify({ resourceType: "image", folder: "products" }),
  });

  const signed = await signedResponse.json();

  if (!signedResponse.ok || !signed.success || !signed.upload)
    throw new Error(signed.message || "Could not start image upload");
  const { cloudName, apiKey, timestamp, folder, signature } = signed.upload;
  const body = new FormData();

  body.append("file", file);
  body.append("api_key", apiKey);
  body.append("timestamp", String(timestamp));
  body.append("folder", folder);
  body.append("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body },
  );

  const data = await response.json();

  if (
    !response.ok ||
    typeof data.secure_url !== "string" ||
    typeof data.public_id !== "string"
  )
    throw new Error(data.error?.message || "Image upload failed");

  return { url: data.secure_url, publicId: data.public_id };
}
