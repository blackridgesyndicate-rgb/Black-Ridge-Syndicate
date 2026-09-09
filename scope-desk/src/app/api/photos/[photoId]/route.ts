import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, parseJson, handleApiError } from "@/lib/api";
import { photoMetaSchema } from "@/lib/validation";
import { storage } from "@/lib/storage";

export async function PATCH(req: Request, { params }: { params: Promise<{ photoId: string }> }) {
  try {
    await requireUser();
    const { photoId } = await params;
    const data = await parseJson(req, photoMetaSchema);
    const photo = await db.photo.update({
      where: { id: photoId },
      data: {
        ...(data.caption !== undefined ? { caption: data.caption || null } : {}),
        ...(data.damageClassification !== undefined
          ? { damageClassification: data.damageClassification || null }
          : {}),
      },
      include: { file: true },
    });
    return NextResponse.json({ photo });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ photoId: string }> }) {
  try {
    await requireUser();
    const { photoId } = await params;
    const photo = await db.photo.findUnique({ where: { id: photoId }, include: { file: true } });
    if (photo) {
      await db.photo.delete({ where: { id: photoId } });
      await db.uploadedFile.delete({ where: { id: photo.fileId } });
      await storage.delete(photo.file.storageKey);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
