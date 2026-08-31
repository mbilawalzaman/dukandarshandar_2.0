import { getDb } from "@/lib/db";
import { convertVideoToLottieJson } from "./videoConverterService";
import { MediaAsset } from "@/lib/pageSettings";

export interface QueueJobParams {
  videoData: string;
  pageKey: "home" | "shop" | "about" | "contact";
  bannerId?: string;
  isSingleBanner?: boolean;
}

/**
 * Service managing asynchronous background video-to-Lottie conversion jobs
 * and atomic state updates in MongoDB.
 */
export class MediaQueueService {
  /**
   * Enqueues a video conversion job. Immediately returns after setting the processing status,
   * then converts the video in the background and promotes it to activeMedia upon completion.
   */
  static async enqueueVideoConversion(params: QueueJobParams): Promise<{ success: boolean; message: string }> {
    const { videoData, pageKey, bannerId = "single-banner-1", isSingleBanner = false } = params;
    const db = await getDb();

    // 1. Mark status as 'processing' in MongoDB so old banner stays live
    if (pageKey === "home") {
      if (isSingleBanner) {
        await db.collection("page_settings").updateOne(
          { key: "global_page_settings" },
          {
            $set: {
              "home.bannerMode": "single_lottie",
              "home.singleBanner.processingStatus": "processing",
              "home.singleBanner.errorMessage": null,
            },
          },
          { upsert: true }
        );
      } else {
        await db.collection("page_settings").updateOne(
          {
            key: "global_page_settings",
            "home.banners.id": bannerId,
          },
          {
            $set: {
              "home.banners.$.processingStatus": "processing",
              "home.banners.$.errorMessage": null,
            },
          }
        );
      }
    } else {
      await db.collection("page_settings").updateOne(
        { key: "global_page_settings" },
        {
          $set: {
            [`${pageKey}.bannerType`]: "lottie",
            [`${pageKey}.bannerMedia.type`]: "lottie",
          },
        },
        { upsert: true }
      );
    }

    // 2. Dispatch background conversion job asynchronously (fire and forget)
    setTimeout(async () => {
      try {
        console.log(`[MediaQueue] Starting background video-to-Lottie conversion for ${pageKey}...`);
        const { asset } = await convertVideoToLottieJson(videoData, "dukandarshandar/banners");

        // Promote Lottie asset to activeMedia
        await MediaQueueService.promoteConvertedLottie(pageKey, asset, bannerId, isSingleBanner);
        console.log(`[MediaQueue] Successfully converted and published Lottie banner for ${pageKey}`);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Video conversion failed";
        console.error(`[MediaQueue] Video conversion error for ${pageKey}:`, err);
        await MediaQueueService.recordJobFailure(pageKey, errorMsg, bannerId, isSingleBanner);
      }
    }, 100);

    return {
      success: true,
      message: "Video conversion job enqueued. Your current banner will remain live until processing finishes.",
    };
  }

  /**
   * Promotes the newly generated Lottie JSON asset to activeMedia
   */
  static async promoteConvertedLottie(
    pageKey: "home" | "shop" | "about" | "contact",
    asset: MediaAsset,
    bannerId: string,
    isSingleBanner: boolean
  ) {
    const db = await getDb();

    if (pageKey === "home") {
      if (isSingleBanner) {
        await db.collection("page_settings").updateOne(
          { key: "global_page_settings" },
          {
            $set: {
              "home.bannerMode": "single_lottie",
              "home.singleBanner.activeMedia": asset,
              "home.singleBanner.pendingMedia": null,
              "home.singleBanner.processingStatus": "idle",
              "home.singleBanner.errorMessage": null,
            },
          }
        );
      } else {
        await db.collection("page_settings").updateOne(
          {
            key: "global_page_settings",
            "home.banners.id": bannerId,
          },
          {
            $set: {
              "home.banners.$.activeMedia": asset,
              "home.banners.$.pendingMedia": null,
              "home.banners.$.processingStatus": "idle",
              "home.banners.$.errorMessage": null,
            },
          }
        );
      }
    } else {
      await db.collection("page_settings").updateOne(
        { key: "global_page_settings" },
        {
          $set: {
            [`${pageKey}.bannerType`]: "lottie",
            [`${pageKey}.bannerMedia`]: asset,
            [`${pageKey}.bannerImage`]: asset.url,
          },
        }
      );
    }
  }

  /**
   * Records a job failure while keeping current active media completely intact
   */
  static async recordJobFailure(
    pageKey: "home" | "shop" | "about" | "contact",
    errorMessage: string,
    bannerId: string,
    isSingleBanner: boolean
  ) {
    const db = await getDb();

    if (pageKey === "home") {
      if (isSingleBanner) {
        await db.collection("page_settings").updateOne(
          { key: "global_page_settings" },
          {
            $set: {
              "home.singleBanner.processingStatus": "failed",
              "home.singleBanner.errorMessage": errorMessage,
            },
          }
        );
      } else {
        await db.collection("page_settings").updateOne(
          {
            key: "global_page_settings",
            "home.banners.id": bannerId,
          },
          {
            $set: {
              "home.banners.$.processingStatus": "failed",
              "home.banners.$.errorMessage": errorMessage,
            },
          }
        );
      }
    }
  }
}
