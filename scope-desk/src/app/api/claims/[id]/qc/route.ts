import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, parseJson, handleApiError, ApiError } from "@/lib/api";
import { qcChecklistUpdateSchema, qcExceptionSchema } from "@/lib/validation";
import { QC_ITEM_KEYS, computeQcStatus } from "@/lib/qc";

/** Every claim has at most one "live" QC checklist — fetched or lazily created here. */
async function getOrCreateChecklist(claimId: string) {
  const existing = await db.qCChecklist.findFirst({ where: { claimId }, orderBy: { createdAt: "desc" } });
  if (existing) return existing;
  const blank: Record<string, boolean> = {};
  for (const key of QC_ITEM_KEYS) blank[key] = false;
  return db.qCChecklist.create({ data: { claimId, itemsJson: JSON.stringify(blank) } });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id: claimId } = await params;
    const checklist = await getOrCreateChecklist(claimId);
    return NextResponse.json({ checklist });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id: claimId } = await params;
    const data = await parseJson(req, qcChecklistUpdateSchema);

    const current = await getOrCreateChecklist(claimId);
    const currentItems: Record<string, boolean> = JSON.parse(current.itemsJson);
    const mergedItems = { ...currentItems, ...data.items };
    const itemsJson = JSON.stringify(mergedItems);
    const status = computeQcStatus(itemsJson);

    const checklist = await db.qCChecklist.update({
      where: { id: current.id },
      data: {
        itemsJson,
        status,
        // Clears any prior exception once the real checklist is completed properly.
        ...(status === "complete"
          ? { completedByUserId: user.id, completedAt: new Date(), exceptionReason: null, exceptionByUserId: null }
          : { completedByUserId: null, completedAt: null }),
      },
    });

    return NextResponse.json({ checklist });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Records an authorized exception: delivery may proceed despite an
  // incomplete checklist, with a reason on record.
  try {
    const user = await requireUser();
    const { id: claimId } = await params;
    if (user.role !== "admin") {
      throw new ApiError(403, "Only an administrator can record a quality-control exception.");
    }
    const data = await parseJson(req, qcExceptionSchema);

    const current = await getOrCreateChecklist(claimId);
    const checklist = await db.qCChecklist.update({
      where: { id: current.id },
      data: {
        status: "exception_approved",
        exceptionReason: data.reason,
        exceptionByUserId: user.id,
      },
    });

    return NextResponse.json({ checklist });
  } catch (err) {
    return handleApiError(err);
  }
}
