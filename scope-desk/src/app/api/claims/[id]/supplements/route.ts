import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, parseJson, handleApiError } from "@/lib/api";
import { supplementSchema } from "@/lib/validation";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id: claimId } = await params;
    const data = await parseJson(req, supplementSchema);
    const supplement = await db.supplement.create({
      data: { claimId, label: data.label, revisionId: data.revisionId || null },
      include: { carrierItems: true, matches: true },
    });
    return NextResponse.json({ supplement }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
