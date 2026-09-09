import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, parseJson, handleApiError } from "@/lib/api";
import { carrierItemSchema } from "@/lib/validation";

export async function POST(req: Request, { params }: { params: Promise<{ supplementId: string }> }) {
  try {
    await requireUser();
    const { supplementId } = await params;
    const data = await parseJson(req, carrierItemSchema);
    const maxSort = await db.carrierEstimateItem.aggregate({
      where: { supplementId },
      _max: { sortOrder: true },
    });
    const item = await db.carrierEstimateItem.create({
      data: { supplementId, ...data, sortOrder: (maxSort._max.sortOrder ?? 0) + 1 },
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
