import fs from "fs";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import { v2 as cloudinary } from "cloudinary";
import { configure } from "@/lib/cloudinary";
import { MediaAsset } from "@/lib/pageSettings";

const execFileAsync = promisify(execFile);

export interface VideoToLottieResult {
  asset: MediaAsset;
  jsonContent?: string;
  totalFrames: number;
}

/**
 * Builds a valid Bodymovin / Lottie v5.7.4 JSON structure from an array of image frames.
 */
export function buildLottieJsonFromFrames({
  framesBase64,
  width,
  height,
  fps = 10,
}: {
  framesBase64: string[];
  width: number;
  height: number;
  fps?: number;
}): Record<string, unknown> {
  const totalFrames = Math.max(1, framesBase64.length);

  const assets = framesBase64.map((b64, i) => ({
    id: `img_${i}`,
    w: width,
    h: height,
    u: "",
    p: `data:image/jpeg;base64,${b64}`,
    e: 1,
  }));

  // Create sequential frame layers
  const layers = framesBase64.map((_, i) => ({
    ddd: 0,
    ind: i + 1,
    ty: 2, // Image asset layer
    nm: `Frame_${i + 1}`,
    refId: `img_${i}`,
    sr: 1,
    ks: {
      o: { a: 0, k: 100, ix: 11 },
      r: { a: 0, k: 0, ix: 10 },
      p: { a: 0, k: [width / 2, height / 2, 0], ix: 2 },
      a: { a: 0, k: [width / 2, height / 2, 0], ix: 1 },
      s: { a: 0, k: [100, 100, 100], ix: 6 },
    },
    ao: 0,
    ip: i,
    op: i + 1,
    st: 0,
    bm: 0,
  }));

  return {
    v: "5.7.4",
    fr: fps,
    ip: 0,
    op: totalFrames,
    w: width,
    h: height,
    nm: "Dukandar Shandar Lottie Animation",
    ddd: 0,
    assets,
    layers,
  };
}

/**
 * Converts a video file (MOV, MP4, WebM) into an optimized Lottie JSON animation
 * and stores it on Cloudinary as raw JSON.
 */
export async function convertVideoToLottieJson(
  videoData: string,
  folder = "dukandarshandar/banners"
): Promise<VideoToLottieResult> {
  if (!videoData) {
    throw new Error("No video content provided for conversion");
  }

  // If already a Lottie JSON URL or direct JSON string
  if (videoData.startsWith("http") && (videoData.endsWith(".json") || videoData.includes("raw/upload"))) {
    return {
      asset: {
        type: "lottie",
        url: videoData,
        resourceType: "raw",
        format: "json",
      },
      totalFrames: 1,
    };
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ds_video_lottie_"));
  const inputVideoPath = path.join(tmpDir, "input_video.mp4");

  try {
    // 1. Write video payload to temp file
    let videoBuffer: Buffer;
    if (videoData.startsWith("data:")) {
      const base64Data = videoData.split(",")[1];
      videoBuffer = Buffer.from(base64Data, "base64");
    } else {
      videoBuffer = Buffer.from(videoData, "base64");
    }

    fs.writeFileSync(inputVideoPath, videoBuffer);

    // 2. Extract frames using ffmpeg (support up to 15 seconds full duration, 10 fps, 540px width)
    const framePattern = path.join(tmpDir, "frame_%03d.jpg");
    await execFileAsync("ffmpeg", [
      "-y",
      "-i",
      inputVideoPath,
      "-t",
      "15",
      "-vf",
      "fps=10,scale=540:-1",
      "-q:v",
      "7",
      framePattern,
    ]);

    // 3. Read generated frames
    const frameFiles = fs
      .readdirSync(tmpDir)
      .filter((file) => file.startsWith("frame_") && file.endsWith(".jpg"))
      .sort();

    if (frameFiles.length === 0) {
      throw new Error("No frames were extracted from the uploaded video.");
    }

    const framesBase64 = frameFiles.map((file) => {
      const filePath = path.join(tmpDir, file);
      return fs.readFileSync(filePath).toString("base64");
    });

    // 4. Build Lottie JSON
    const lottieJsonObj = buildLottieJsonFromFrames({
      framesBase64,
      width: 540,
      height: 320,
      fps: 10,
    });

    const lottieJsonString = JSON.stringify(lottieJsonObj);

    // 5. Upload to Cloudinary as raw JSON file with distinct public_id
    configure();
    const uploadPayload = `data:application/json;base64,${Buffer.from(lottieJsonString).toString("base64")}`;
    const publicId = `lottie_banner_${Date.now()}`;

    const uploadResult = await cloudinary.uploader.upload(uploadPayload, {
      folder,
      public_id: publicId,
      resource_type: "raw",
      format: "json",
      overwrite: false,
    });

    return {
      asset: {
        type: "lottie",
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        resourceType: "raw",
        format: "json",
        bytes: uploadResult.bytes,
      },
      jsonContent: lottieJsonString,
      totalFrames: framesBase64.length,
    };
  } finally {
    // Clean up temporary directory
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  }
}
