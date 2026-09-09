import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, parseJson, handleApiError } from "@/lib/api";
import { supplementMatchSchema } from "@/lib/validation";

export async function PATCH(req: Request, { params }: { params: Promise<{ matchId: string }> }) {
  try {
    await requireUser();
    const { matchId } = await params;
    const data = await parseJson(req, supplementMatchSchema.partial());
    const match = await db.supplementMatch.update({
      where: { id: matchId },
      data: {
        ...(data.contractorDescription !== undefined ? { contractorDescription: data.contractorDescription } : {}),
        ...(data.contractorQuantity !== undefined ? { contractorQuantity: data.contractorQuantity } : {}),
        ...(data.contractorUnit !== undefined ? { contractorUnit: data.contractorUnit } : {}),
        ...(data.contractorUnitPrice !== undefined ? { contractorUnitPrice: data.contractorUnitPrice } : {}),
        ...(data.carrierItemId !== undefined ? { carrierItemId: data.carrierItemId || null } : {}),
        ...(data.reasonForSupplement !== undefined
          ? { reasonForSupplement: data.reasonForSupplement || null }
          : {}),
        ...(data.supportingCodeOrPhoto !== undefined
          ? { supportingCodeOrPhoto: data.supportingCodeOrPhoto || null }
          : {}),
      },
    });
    return NextResponse.json({ match });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ matchId: string }> }) {
  try {
    await requireUser();
    const { matchId } = await params;
    await db.supplementMatch.delete({ where: { id: matchId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
