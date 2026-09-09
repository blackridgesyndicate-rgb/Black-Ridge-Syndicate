import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, handleApiError, ApiError } from "@/lib/api";
import { claimDetailInclude } from "@/lib/types";
import { renderDocument, DOCUMENT_TYPES, DOCUMENT_LABELS, documentRequirements, type DocumentType } from "@/lib/pdf/render";
import { storage, newStorageKey } from "@/lib/storage";
import { runJob } from "@/lib/jobs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireUser();
    const { id: claimId } = await params;
    const body = await req.json().catch(() => ({}));
    const type = body?.type as DocumentType;

    if (!DOCUMENT_TYPES.includes(type)) {
      throw new ApiError(400, `Unknown document type: ${type}`);
    }

    const claim = await db.claim.findUnique({ where: { id: claimId }, include: claimDetailInclude });
    if (!claim) throw new ApiError(404, "Claim not found");

    const { needsRevision, needsSupplement } = documentRequirements(type);

    let revision = undefined;
    if (needsRevision) {
      const revisionId = body?.revisionId as string | undefined;
      revision = revisionId
        ? claim.revisions.find((r) => r.id === revisionId)
        : [...claim.revisions].sort((a, b) => b.revisionNumber - a.revisionNumber)[0];
      if (!revision) throw new ApiError(400, "This document requires at least one estimate revision.");
    }

    let supplement = undefined;
    if (needsSupplement) {
      const supplementId = body?.supplementId as string | undefined;
      supplement = supplementId
        ? claim.supplements.find((s) => s.id === supplementId)
        : claim.supplements[0];
      if (!supplement) throw new ApiError(400, "This document requires at least one supplement.");
    }

    const buffer = await runJob(`generate-document:${claimId}:${type}`, () =>
      renderDocument(type, claim, { revision, supplement })
    );

    const filenameBase = `${type}-${claim.property.addressLine1.replace(/[^a-z0-9]+/gi, "-")}`.toLowerCase();
    const filename = `${filenameBase}.pdf`;
    const storageKey = newStorageKey(claimId, filename);
    await storage.put(storageKey, buffer);

    const doc = await db.generatedDocument.create({
      data: {
        claimId,
        type,
        revisionId: revision?.id ?? null,
        storageKey,
        filename,
      },
    });

    return NextResponse.json({ document: doc, label: DOCUMENT_LABELS[type] }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
