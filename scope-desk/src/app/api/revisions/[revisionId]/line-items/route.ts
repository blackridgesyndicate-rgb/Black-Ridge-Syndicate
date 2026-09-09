import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, parseJson, handleApiError, ApiError } from "@/lib/api";
import { lineItemSchema } from "@/lib/validation";
import { computeLineItemFinancials } from "@/lib/calc/estimate";

export async function POST(req: Request, { params }: { params: Promise<{ revisionId: string }> }) {
  try {
    await requireUser();
    const { revisionId } = await params;
    const revision = await db.estimateRevision.findUnique({ where: { id: revisionId } });
    if (!revision) throw new ApiError(404, "Revision not found");

    const data = await parseJson(req, lineItemSchema);
    const taxable = data.taxable ?? true;
    const taxRatePercent = data.taxRatePercent ?? (taxable ? revision.taxRatePercent : 0);
    const depreciationPercent = data.depreciationPercent ?? revision.defaultDepreciationPercent;
    const financials = computeLineItemFinancials({
      quantity: data.quantity,
      unitPrice: data.unitPrice,
      taxable,
      taxableMaterialAmount: data.taxableMaterialAmount ?? null,
      taxRatePercent,
      depreciationPercent,
    });

    const maxSort = await db.estimateLineItem.aggregate({
      where: { revisionId },
      _max: { sortOrder: true },
    });

    const lineItem = await db.estimateLineItem.create({
      data: {
        revisionId,
        category: data.category,
        description: data.description,
        unit: data.unit,
        quantity: data.quantity,
        calculatedQuantity: null,
        quantityOverridden: false,
        unitPrice: data.unitPrice,
        taxable,
        taxRatePercent,
        notes: data.notes || null,
        codeCitation: data.codeCitation || null,
        included: data.included ?? true,
        sortOrder: data.sortOrder ?? (maxSort._max.sortOrder ?? 0) + 1,
        depreciationPercent,
        ...financials,
      },
    });

    return NextResponse.json({ lineItem }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ revisionId: string }> }) {
  // Bulk reorder: body = { order: [lineItemId, ...] } in desired sequence.
  try {
    await requireUser();
    const { revisionId } = await params;
    const body = await req.json();
    const order: string[] = body.order ?? [];
    await db.$transaction(
      order.map((id, idx) =>
        db.estimateLineItem.update({ where: { id }, data: { sortOrder: idx } })
      )
    );
    const lineItems = await db.estimateLineItem.findMany({
      where: { revisionId },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json({ lineItems });
  } catch (err) {
    return handleApiError(err);
  }
}
