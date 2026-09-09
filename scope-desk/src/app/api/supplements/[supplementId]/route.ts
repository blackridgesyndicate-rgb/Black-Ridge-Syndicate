import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, handleApiError } from "@/lib/api";

export async function DELETE(_req: Request, { params }: { params: Promise<{ supplementId: string }> }) {
  try {
    await requireUser();
    const { supplementId } = await params;
    await db.supplement.delete({ where: { id: supplementId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
