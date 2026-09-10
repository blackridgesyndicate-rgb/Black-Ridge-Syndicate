import { storage } from "@/lib/storage";
import type { PhotoDetail } from "@/lib/types";

export interface PhotoAsset {
  photo: PhotoDetail;
  buffer: Buffer | null; // null when the file is missing or in a format @react-pdf/renderer can't embed
}

// @react-pdf/renderer's image support is JPEG/PNG only (no HEIC/WebP).
const EMBEDDABLE_MIME = new Set(["image/jpeg", "image/png"]);

export async function loadPhotoAssets(photos: PhotoDetail[]): Promise<PhotoAsset[]> {
  return Promise.all(
    photos.map(async (photo): Promise<PhotoAsset> => {
      if (!EMBEDDABLE_MIME.has(photo.file.mimeType)) {
        return { photo, buffer: null };
      }
      try {
        const buffer = await storage.get(photo.file.storageKey);
        return { photo, buffer };
      } catch {
        return { photo, buffer: null };
      }
    })
  );
}
