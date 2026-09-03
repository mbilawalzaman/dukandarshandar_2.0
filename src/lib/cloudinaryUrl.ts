/** Ensure Cloudinary videos play in browsers (MOV → MP4 delivery). Safe for client + server. */
export function toPlayableVideoUrl(url: string): string {
  if (!url || !url.includes("res.cloudinary.com") || !url.includes("/video/upload/")) {
    return url;
  }
  if (url.includes("/video/upload/f_mp4")) {
    return url;
  }
  return url.replace("/video/upload/", "/video/upload/f_mp4/");
}
