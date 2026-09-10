import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, parseJson, handleApiError } from "@/lib/api";
import { priceListItemSchema } from "@/lib/validation";

export async function GET() {
  try {
    await requireUser();
    const items = await db.priceListItem.findMany({ orderBy: { sortOrder: "asc" } });
    return NextResponse.json({ items });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    await requireUser();
    const data = await parseJson(req, priceListItemSchema);
    const maxSort = await db.priceListItem.aggregate({ _max: { sortOrder: true } });
    const item = await db.priceListItem.create({
      data: {
        category: data.category,
        code: data.code,
        description: data.description,
        unit: data.unit,
        defaultUnitPrice: data.defaultUnitPrice,
        taxable: data.taxable ?? true,
        defaultDepreciationPercent: data.defaultDepreciationPercent ?? 0,
        codeCitation: data.codeCitation || null,
        calcRule: data.calcRule ?? null,
        sortOrder: data.sortOrder ?? (maxSort._max.sortOrder ?? 0) + 1,
        active: data.active ?? true,
        state: data.state || null,
        manufacturer: data.manufacturer || null,
        productName: data.productName || null,
        reasonSelected: data.reasonSelected || null,
      },
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
