import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, parseJson, handleApiError } from "@/lib/api";
import { priceListItemSchema } from "@/lib/validation";

export async function PATCH(req: Request, { params }: { params: Promise<{ itemId: string }> }) {
  try {
    await requireUser();
    const { itemId } = await params;
    const data = await parseJson(req, priceListItemSchema.partial());
    const item = await db.priceListItem.update({
      where: { id: itemId },
      data: {
        ...(data.category !== undefined ? { category: data.category } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.unit !== undefined ? { unit: data.unit } : {}),
        ...(data.defaultUnitPrice !== undefined ? { defaultUnitPrice: data.defaultUnitPrice } : {}),
        ...(data.taxable !== undefined ? { taxable: data.taxable } : {}),
        ...(data.defaultDepreciationPercent !== undefined
          ? { defaultDepreciationPercent: data.defaultDepreciationPercent }
          : {}),
        ...(data.codeCitation !== undefined ? { codeCitation: data.codeCitation || null } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
      },
    });
    return NextResponse.json({ item });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ itemId: string }> }) {
  try {
    await requireUser();
    const { itemId } = await params;
    await db.priceListItem.update({ where: { id: itemId }, data: { active: false } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
