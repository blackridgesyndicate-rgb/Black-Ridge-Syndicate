import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, parseJson, handleApiError } from "@/lib/api";
import { accessorySchema } from "@/lib/validation";

export async function PATCH(req: Request, { params }: { params: Promise<{ accessoryId: string }> }) {
  try {
    await requireUser();
    const { accessoryId } = await params;
    const data = await parseJson(req, accessorySchema.partial());
    const accessory = await db.accessory.update({
      where: { id: accessoryId },
      data: {
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.label !== undefined ? { label: data.label || null } : {}),
        ...(data.quantity !== undefined ? { quantity: data.quantity } : {}),
        ...(data.unit !== undefined ? { unit: data.unit } : {}),
        ...(data.notes !== undefined ? { notes: data.notes || null } : {}),
      },
    });
    return NextResponse.json({ accessory });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ accessoryId: string }> }) {
  try {
    await requireUser();
    const { accessoryId } = await params;
    await db.accessory.delete({ where: { id: accessoryId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
