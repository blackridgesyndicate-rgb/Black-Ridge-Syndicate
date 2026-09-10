import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, handleApiError, ApiError } from "@/lib/api";
import { createDeliveryToken, hashToken } from "@/lib/secureDelivery";
import { QC_ITEM_KEYS, computeQcStatus, qcAllowsDelivery } from "@/lib/qc";
import { appBaseUrl } from "@/lib/stripe";

/** Staff-only: generates a secure, expiring download link for a generated
 * document — blocked until the claim's quality-control checklist is
 * complete or an administrator has recorded an authorized exception. */
export async function POST(_req: Request, { params }: { params: Promise<{ docId: string }> }) {
  try {
    await requireUser();
    const { docId } = await params;

    const doc = await db.generatedDocument.findUnique({ where: { id: docId } });
    if (!doc) throw new ApiError(404, "Document not found");

    const checklist = await db.qCChecklist.findFirst({
      where: { claimId: doc.claimId },
      orderBy: { createdAt: "desc" },
    });
    const status = checklist ? computeQcStatus(checklist.itemsJson) : "incomplete";
    const effectiveStatus = checklist?.status === "exception_approved" ? "exception_approved" : status;

    if (!qcAllowsDelivery(effectiveStatus)) {
      const items: Record<string, boolean> = checklist ? JSON.parse(checklist.itemsJson) : {};
      const outstanding = QC_ITEM_KEYS.filter((k) => !items[k]);
      throw new ApiError(
        409,
        `Quality control is not complete for this job (${outstanding.length} item(s) outstanding). Complete the QC checklist, or have an administrator record an authorized exception, before delivering this document.`
      );
    }

    const { token, tokenHash, expiresAt } = createDeliveryToken(docId);
    await db.generatedDocument.update({
      where: { id: docId },
      data: { secureTokenHash: tokenHash, secureTokenExpiresAt: expiresAt },
    });

    return NextResponse.json({
      url: `${appBaseUrl()}/api/public/deliver/${token}`,
      expiresAt,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
