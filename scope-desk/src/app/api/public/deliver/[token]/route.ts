import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handleApiError, ApiError } from "@/lib/api";
import { storage } from "@/lib/storage";
import { verifyDeliveryToken, hashToken } from "@/lib/secureDelivery";
import { computeQcStatus, qcAllowsDelivery } from "@/lib/qc";

// Public, unauthenticated: this is the customer-facing secure link itself.
// Security comes from the signed, expiring token — not a session — per the
// "secure link from the internal tool, no separate customer portal" design.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const verified = verifyDeliveryToken(token);
    if (!verified) throw new ApiError(410, "This download link is invalid or has expired.");

    const doc = await db.generatedDocument.findUnique({ where: { id: verified.documentId } });
    if (!doc) throw new ApiError(404, "Document not found");

    // The stored hash must match this exact token — a newer regenerated
    // link invalidates any older one even if it hasn't technically expired.
    if (!doc.secureTokenHash || doc.secureTokenHash !== hashToken(token)) {
      throw new ApiError(410, "This download link has been superseded by a newer one.");
    }

    // Defense in depth: re-check QC at the moment of actual download, not
    // just at link-generation time, in case the checklist regressed since.
    const checklist = await db.qCChecklist.findFirst({
      where: { claimId: doc.claimId },
      orderBy: { createdAt: "desc" },
    });
    const status = checklist ? computeQcStatus(checklist.itemsJson) : "incomplete";
    const effectiveStatus = checklist?.status === "exception_approved" ? "exception_approved" : status;
    if (!qcAllowsDelivery(effectiveStatus)) {
      throw new ApiError(409, "This document is no longer cleared for delivery.");
    }

    if (!doc.deliveredAt) {
      await db.generatedDocument.update({ where: { id: doc.id }, data: { deliveredAt: new Date() } });
    }

    const bytes = await storage.get(doc.storageKey);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${doc.filename.replace(/"/g, "")}"`,
        "Cache-Control": "private, max-age=0, no-cache",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
