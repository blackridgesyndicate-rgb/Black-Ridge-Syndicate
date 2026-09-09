import "server-only";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

/**
 * Private object storage abstraction. Files are never placed under /public
 * and are only ever served back through an authenticated route handler.
 * LocalStorageProvider is the default (zero-config) implementation; swap in
 * an S3-backed provider for production by implementing the same interface.
 */
export interface StorageProvider {
  put(key: string, data: Buffer): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

// turbopackIgnore: this path is data (uploaded files), not application code —
// it must not be traced/bundled into the server output.
const STORAGE_ROOT = path.resolve(
  /* turbopackIgnore: true */ process.cwd(),
  process.env.STORAGE_ROOT ?? "./storage_private"
);

class LocalStorageProvider implements StorageProvider {
  private async resolve(key: string): Promise<string> {
    // Prevent path traversal outside the storage root.
    const target = path.resolve(/* turbopackIgnore: true */ STORAGE_ROOT, key);
    if (!target.startsWith(STORAGE_ROOT + path.sep) && target !== STORAGE_ROOT) {
      throw new Error("Invalid storage key");
    }
    return target;
  }

  async put(key: string, data: Buffer): Promise<void> {
    const target = await this.resolve(key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, data);
  }

  async get(key: string): Promise<Buffer> {
    const target = await this.resolve(key);
    return fs.readFile(target);
  }

  async delete(key: string): Promise<void> {
    const target = await this.resolve(key);
    await fs.rm(target, { force: true });
  }
}

export const storage: StorageProvider = new LocalStorageProvider();

export function newStorageKey(claimId: string, originalFilename: string): string {
  const ext = path.extname(originalFilename).slice(0, 20);
  const random = crypto.randomBytes(16).toString("hex");
  return `claims/${claimId}/${random}${ext}`;
}

export const ALLOWED_UPLOAD_TYPES: Record<string, string[]> = {
  measurement_report: [".pdf", ".xml", ".csv"],
  carrier_estimate: [".pdf", ".xml", ".csv"],
  photo: [".jpg", ".jpeg", ".png", ".webp", ".heic"],
  other: [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".csv", ".xml", ".txt"],
};

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

export function validateUpload(kind: string, filename: string, size: number): string | null {
  const ext = path.extname(filename).toLowerCase();
  const allowed = ALLOWED_UPLOAD_TYPES[kind] ?? ALLOWED_UPLOAD_TYPES.other;
  if (!allowed.includes(ext)) {
    return `File type "${ext || "unknown"}" is not allowed for ${kind}. Allowed: ${allowed.join(", ")}`;
  }
  if (size > MAX_UPLOAD_BYTES) {
    return `File exceeds the ${(MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(0)}MB upload limit.`;
  }
  if (size <= 0) {
    return "File is empty.";
  }
  return null;
}

export function mimeTypeForExt(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const map: Record<string, string> = {
    ".pdf": "application/pdf",
    ".xml": "application/xml",
    ".csv": "text/csv",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".heic": "image/heic",
    ".txt": "text/plain",
  };
  return map[ext] ?? "application/octet-stream";
}
