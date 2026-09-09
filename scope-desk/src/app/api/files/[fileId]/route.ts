import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, handleApiError, ApiError } from "@/lib/api";
import { storage } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ fileId: string }> }) {
  try {
    await requireUser();
    const { fileId } = await params;
    const file = await db.uploadedFile.findUnique({ where: { id: fileId } });
    if (!file) throw new ApiError(404, "File not found");

    const bytes = await storage.get(file.storageKey);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `inline; filename="${file.filename.replace(/"/g, "")}"`,
        "Cache-Control": "private, max-age=0, no-cache",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
