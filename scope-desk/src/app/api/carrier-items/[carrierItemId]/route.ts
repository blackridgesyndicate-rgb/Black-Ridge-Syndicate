import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, handleApiError } from "@/lib/api";

export async function DELETE(_req: Request, { params }: { params: Promise<{ carrierItemId: string }> }) {
  try {
    await requireUser();
    const { carrierItemId } = await params;
    await db.carrierEstimateItem.delete({ where: { id: carrierItemId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
