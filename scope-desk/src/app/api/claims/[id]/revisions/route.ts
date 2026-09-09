import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, handleApiError, ApiError } from "@/lib/api";
import { buildInitialLineItems, type InitialLineItem } from "@/lib/calc/estimate";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id: claimId } = await params;

    const claim = await db.claim.findUnique({ where: { id: claimId } });
    if (!claim) throw new ApiError(404, "Claim not found");

    const body = await req.json().catch(() => ({}));
    const mode: "duplicate_latest" | "fresh_from_price_list" = body?.mode ?? "duplicate_latest";

    const latest = await db.estimateRevision.findFirst({
      where: { claimId },
      orderBy: { revisionNumber: "desc" },
      include: { lineItems: { orderBy: { sortOrder: "asc" } } },
    });
    const nextNumber = (latest?.revisionNumber ?? 0) + 1;

    let wastePercent = 12;
    let taxRatePercent = 8.5;
    let defaultDepreciationPercent = 0;
    let deductible = latest?.deductible ?? 0;
    let priorPayments = 0;

    let lineItemsToCreate: InitialLineItem[] = [];

    if (latest && mode === "duplicate_latest") {
      wastePercent = latest.wastePercent;
      taxRatePercent = latest.taxRatePercent;
      defaultDepreciationPercent = latest.defaultDepreciationPercent;
      deductible = latest.deductible;
      priorPayments = latest.priorPayments;
      lineItemsToCreate = latest.lineItems.map((li) => ({
        category: li.category,
        description: li.description,
        unit: li.unit,
        quantity: li.quantity,
        calculatedQuantity: li.calculatedQuantity,
        quantityOverridden: li.quantityOverridden,
        unitPrice: li.unitPrice,
        taxable: li.taxable,
        taxRatePercent: li.taxRatePercent,
        codeCitation: li.codeCitation,
        included: li.included,
        sortOrder: li.sortOrder,
        priceListItemCode: li.priceListItemCode,
        taxableMaterialAmount: li.taxableMaterialAmount,
        taxAmount: li.taxAmount,
        rcv: li.rcv,
        depreciationPercent: li.depreciationPercent,
        depreciationAmount: li.depreciationAmount,
        acv: li.acv,
        notes: li.notes,
      }));
    } else {
      const [priceList, measurement, accessories] = await Promise.all([
        db.priceListItem.findMany({ where: { active: true } }),
        db.measurement.findUnique({ where: { claimId } }),
        db.accessory.findMany({ where: { claimId } }),
      ]);
      wastePercent = measurement?.wastePercent ?? wastePercent;
      lineItemsToCreate = buildInitialLineItems(
        priceList,
        measurement,
        accessories,
        wastePercent,
        taxRatePercent,
        defaultDepreciationPercent
      );
    }

    const revision = await db.estimateRevision.create({
      data: {
        claimId,
        revisionNumber: nextNumber,
        label: body?.label || `Revision ${nextNumber}`,
        status: "draft",
        wastePercent,
        taxRatePercent,
        defaultDepreciationPercent,
        deductible,
        priorPayments,
        lineItems: { create: lineItemsToCreate },
      },
      include: { lineItems: { orderBy: { sortOrder: "asc" } } },
    });

    return NextResponse.json({ revision }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
