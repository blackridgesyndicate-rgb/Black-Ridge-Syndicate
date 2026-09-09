import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, handleApiError, ApiError } from "@/lib/api";
import { storage } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ docId: string }> }) {
  try {
    await requireUser();
    const { docId } = await params;
    const doc = await db.generatedDocument.findUnique({ where: { id: docId } });
    if (!doc) throw new ApiError(404, "Document not found");

    const bytes = await storage.get(doc.storageKey);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${doc.filename.replace(/"/g, "")}"`,
        "Cache-Control": "private, max-age=0, no-cache",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
