import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, parseJson, handleApiError } from "@/lib/api";
import { supplementMatchSchema } from "@/lib/validation";

export async function POST(req: Request, { params }: { params: Promise<{ supplementId: string }> }) {
  try {
    await requireUser();
    const { supplementId } = await params;
    const data = await parseJson(req, supplementMatchSchema);
    const match = await db.supplementMatch.create({
      data: {
        supplementId,
        contractorLineItemId: data.contractorLineItemId || null,
        contractorDescription: data.contractorDescription,
        contractorQuantity: data.contractorQuantity,
        contractorUnit: data.contractorUnit,
        contractorUnitPrice: data.contractorUnitPrice,
        carrierItemId: data.carrierItemId || null,
        reasonForSupplement: data.reasonForSupplement || null,
        supportingCodeOrPhoto: data.supportingCodeOrPhoto || null,
      },
    });
    return NextResponse.json({ match }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
