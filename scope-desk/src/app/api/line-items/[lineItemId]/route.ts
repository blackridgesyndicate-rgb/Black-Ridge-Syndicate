import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, parseJson, handleApiError, ApiError } from "@/lib/api";
import { lineItemUpdateSchema } from "@/lib/validation";
import { computeLineItemFinancials } from "@/lib/calc/estimate";

export async function PATCH(req: Request, { params }: { params: Promise<{ lineItemId: string }> }) {
  try {
    await requireUser();
    const { lineItemId } = await params;
    const existing = await db.estimateLineItem.findUnique({ where: { id: lineItemId } });
    if (!existing) throw new ApiError(404, "Line item not found");

    const data = await parseJson(req, lineItemUpdateSchema);

    const quantity = data.quantity ?? existing.quantity;
    const unitPrice = data.unitPrice ?? existing.unitPrice;
    const taxable = data.taxable ?? existing.taxable;
    const taxRatePercent = data.taxRatePercent ?? existing.taxRatePercent;
    const depreciationPercent = data.depreciationPercent ?? existing.depreciationPercent;

    // If the taxable-material amount was never customized away from the
    // line's default (full line total when taxable), keep following the
    // line total as quantity/price change. An explicitly customized split
    // is preserved as an absolute dollar amount instead.
    const oldDefaultTaxableMaterial = existing.taxable ? existing.quantity * existing.unitPrice : 0;
    const wasCustomized = Math.abs(existing.taxableMaterialAmount - oldDefaultTaxableMaterial) > 0.005;
    const taxableMaterialAmount =
      data.taxableMaterialAmount !== undefined
        ? data.taxableMaterialAmount
        : wasCustomized
          ? existing.taxableMaterialAmount
          : null;

    const financials = computeLineItemFinancials({
      quantity,
      unitPrice,
      taxable,
      taxableMaterialAmount,
      taxRatePercent,
      depreciationPercent,
    });

    const quantityOverridden =
      data.quantity !== undefined && existing.calculatedQuantity !== null
        ? data.quantity !== existing.calculatedQuantity
        : existing.quantityOverridden;

    const lineItem = await db.estimateLineItem.update({
      where: { id: lineItemId },
      data: {
        ...(data.category !== undefined ? { category: data.category } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.unit !== undefined ? { unit: data.unit } : {}),
        quantity,
        quantityOverridden,
        unitPrice,
        taxable,
        taxRatePercent,
        depreciationPercent,
        ...(data.notes !== undefined ? { notes: data.notes || null } : {}),
        ...(data.codeCitation !== undefined ? { codeCitation: data.codeCitation || null } : {}),
        ...(data.included !== undefined ? { included: data.included } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        ...(data.isUpgrade !== undefined ? { isUpgrade: data.isUpgrade } : {}),
        ...(data.overrideReason !== undefined ? { overrideReason: data.overrideReason || null, manualOverride: true } : {}),
        ...financials,
      },
    });

    return NextResponse.json({ lineItem });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ lineItemId: string }> }) {
  try {
    await requireUser();
    const { lineItemId } = await params;
    await db.estimateLineItem.delete({ where: { id: lineItemId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
