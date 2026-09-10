import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, parseJson, handleApiError, ApiError } from "@/lib/api";
import { revisionSettingsSchema } from "@/lib/validation";
import { calculateQuantityForRule, computeLineItemFinancials } from "@/lib/calc/estimate";

export async function GET(_req: Request, { params }: { params: Promise<{ revisionId: string }> }) {
  try {
    await requireUser();
    const { revisionId } = await params;
    const revision = await db.estimateRevision.findUnique({
      where: { id: revisionId },
      include: { lineItems: { orderBy: { sortOrder: "asc" } } },
    });
    if (!revision) throw new ApiError(404, "Revision not found");
    return NextResponse.json({ revision });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ revisionId: string }> }) {
  try {
    await requireUser();
    const { revisionId } = await params;
    const data = await parseJson(req, revisionSettingsSchema);

    const revision = await db.estimateRevision.findUnique({
      where: { id: revisionId },
      include: { lineItems: true },
    });
    if (!revision) throw new ApiError(404, "Revision not found");

    const wasteChanged = data.wastePercent !== undefined && data.wastePercent !== revision.wastePercent;
    const taxChanged = data.taxRatePercent !== undefined && data.taxRatePercent !== revision.taxRatePercent;

    const newWaste = data.wastePercent ?? revision.wastePercent;
    const newTax = data.taxRatePercent ?? revision.taxRatePercent;

    let measurement = null as Awaited<ReturnType<typeof db.measurement.findUnique>> | null;
    let accessories: Awaited<ReturnType<typeof db.accessory.findMany>> = [];
    let priceListByCode = new Map<string, { calcRule: string | null }>();

    if (wasteChanged) {
      const [m, acc, priceList] = await Promise.all([
        db.measurement.findUnique({ where: { claimId: revision.claimId } }),
        db.accessory.findMany({ where: { claimId: revision.claimId } }),
        db.priceListItem.findMany(),
      ]);
      measurement = m;
      accessories = acc;
      priceListByCode = new Map(priceList.map((p) => [p.code, { calcRule: p.calcRule }]));
    }

    await db.$transaction(async (tx) => {
      await tx.estimateRevision.update({
        where: { id: revisionId },
        data: {
          ...(data.label !== undefined ? { label: data.label } : {}),
          ...(data.status !== undefined ? { status: data.status } : {}),
          ...(data.wastePercent !== undefined ? { wastePercent: data.wastePercent } : {}),
          ...(data.taxRatePercent !== undefined ? { taxRatePercent: data.taxRatePercent } : {}),
          ...(data.defaultDepreciationPercent !== undefined
            ? { defaultDepreciationPercent: data.defaultDepreciationPercent }
            : {}),
          ...(data.deductible !== undefined ? { deductible: data.deductible } : {}),
          ...(data.priorPayments !== undefined ? { priorPayments: data.priorPayments } : {}),
          ...(data.overheadProfitPercent !== undefined ? { overheadProfitPercent: data.overheadProfitPercent } : {}),
        },
      });

      if (wasteChanged || taxChanged) {
        for (const li of revision.lineItems) {
          let quantity = li.quantity;
          let calculatedQuantity = li.calculatedQuantity;
          let quantityChanged = false;

          if (wasteChanged && !li.quantityOverridden && li.priceListItemCode) {
            const rule = priceListByCode.get(li.priceListItemCode)?.calcRule ?? null;
            const effectiveMeasurement = measurement ? { ...measurement, wastePercent: newWaste } : null;
            const newQty = calculateQuantityForRule(rule, effectiveMeasurement, accessories);
            if (newQty != null) {
              quantity = newQty;
              calculatedQuantity = newQty;
              quantityChanged = true;
            }
          }

          if (!quantityChanged && !taxChanged) continue;

          const taxRatePercent = li.taxable ? newTax : 0;
          const financials = computeLineItemFinancials({
            quantity,
            unitPrice: li.unitPrice,
            taxable: li.taxable,
            taxableMaterialAmount: quantityChanged ? null : li.taxableMaterialAmount,
            taxRatePercent,
            depreciationPercent: li.depreciationPercent,
          });

          await tx.estimateLineItem.update({
            where: { id: li.id },
            data: { quantity, calculatedQuantity, taxRatePercent, ...financials },
          });
        }
      }
    });

    const updated = await db.estimateRevision.findUnique({
      where: { id: revisionId },
      include: { lineItems: { orderBy: { sortOrder: "asc" } } },
    });

    return NextResponse.json({ revision: updated });
  } catch (err) {
    return handleApiError(err);
  }
}
