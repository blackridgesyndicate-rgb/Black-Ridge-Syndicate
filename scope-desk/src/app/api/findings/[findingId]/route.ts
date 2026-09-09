import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, parseJson, handleApiError } from "@/lib/api";
import { findingSchema } from "@/lib/validation";

export async function PATCH(req: Request, { params }: { params: Promise<{ findingId: string }> }) {
  try {
    await requireUser();
    const { findingId } = await params;
    const data = await parseJson(req, findingSchema.partial());
    const finding = await db.inspectionFinding.update({
      where: { id: findingId },
      data: {
        ...(data.category !== undefined ? { category: data.category } : {}),
        ...(data.location !== undefined ? { location: data.location || null } : {}),
        ...(data.damageType !== undefined ? { damageType: data.damageType } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.notes !== undefined ? { notes: data.notes || null } : {}),
      },
    });
    return NextResponse.json({ finding });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ findingId: string }> }) {
  try {
    await requireUser();
    const { findingId } = await params;
    await db.inspectionFinding.delete({ where: { id: findingId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
