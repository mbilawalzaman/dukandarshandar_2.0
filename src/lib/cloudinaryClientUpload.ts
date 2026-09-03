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
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const signRes = await fetch("/api/admin/media/sign", {
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

  const { cloudName, apiKey, timestamp, folder, signature, resourceType } = signData.upload;
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);
  formData.append("folder", folder);

  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
    method: "POST",
    body: formData,
  });

  const uploadData = await uploadRes.json();
  if (!uploadRes.ok || !uploadData.secure_url) {
    throw new Error(uploadData.error?.message || "Cloudinary video upload failed");
  }

  return {
    url: toPlayableVideoUrl(uploadData.secure_url as string),
    publicId: uploadData.public_id as string,
    format: uploadData.format as string | undefined,
    bytes: uploadData.bytes as number | undefined,
    duration: uploadData.duration as number | undefined,
  };
}
