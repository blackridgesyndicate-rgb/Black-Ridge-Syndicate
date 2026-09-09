import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, parseJson, handleApiError } from "@/lib/api";
import { accessorySchema } from "@/lib/validation";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id: claimId } = await params;
    const data = await parseJson(req, accessorySchema);
    const accessory = await db.accessory.create({
      data: {
        claimId,
        type: data.type,
        label: data.label || null,
        quantity: data.quantity,
        unit: data.unit,
        notes: data.notes || null,
      },
    });
    return NextResponse.json({ accessory }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
