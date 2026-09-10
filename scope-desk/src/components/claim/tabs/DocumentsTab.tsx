"use client";

import { useState } from "react";
import type { ClaimDetail } from "@/lib/types";
import { apiPost } from "@/lib/apiClient";
import { Select } from "@/components/ui/Field";
import { dateStr } from "@/lib/format";

type GeneratedDocumentDetail = ClaimDetail["generatedDocuments"][number];

const DOCUMENT_OPTIONS: {
  type: string;
  label: string;
  needsRevision?: boolean;
  needsSupplement?: boolean;
  reportTypes: ("insurance" | "retail")[];
}[] = [
  { type: "insurance_estimate", label: "Contractor-Prepared Insurance Restoration Estimate", needsRevision: true, reportTypes: ["insurance"] },
  { type: "measurement_summary", label: "Measurement Summary", reportTypes: ["insurance", "retail"] },
  { type: "code_report", label: "Code-Enforcement Report", reportTypes: ["insurance", "retail"] },
  { type: "weather_report", label: "Weather-History Report", reportTypes: ["insurance", "retail"] },
  { type: "supplement_request", label: "Supplement Request", needsSupplement: true, reportTypes: ["insurance"] },
  { type: "homeowner_proposal", label: "Premium Roof Replacement Proposal", needsRevision: true, reportTypes: ["retail"] },
  { type: "material_order", label: "Material Order", needsRevision: true, reportTypes: ["insurance", "retail"] },
  { type: "invoice", label: "Invoice", needsRevision: true, reportTypes: ["insurance", "retail"] },
];

export function DocumentsTab({ claim, onChanged }: { claim: ClaimDetail; onChanged: () => Promise<void> }) {
  const reportType = (claim.reportType ?? "insurance") as "insurance" | "retail";
  const availableOptions = DOCUMENT_OPTIONS.filter((opt) => opt.reportTypes.includes(reportType));
  const revisions = [...claim.revisions].sort((a, b) => b.revisionNumber - a.revisionNumber);
  const [revisionId, setRevisionId] = useState(revisions[0]?.id ?? "");
  const [supplementId, setSupplementId] = useState(claim.supplements[0]?.id ?? "");
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate(type: string, needsRevision?: boolean, needsSupplement?: boolean) {
    setGenerating(type);
    setError(null);
    try {
      const body: Record<string, unknown> = { type };
      if (needsRevision) body.revisionId = revisionId;
      if (needsSupplement) body.supplementId = supplementId;
      const result = await apiPost(`/api/claims/${claim.id}/documents`, body);
      await onChanged();
      const url = `/api/documents/${result.document.id}/download`;
      window.open(url, "_blank");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerating(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="brd-card rounded-sm p-6">
        <h2 className="text-sm font-semibold text-brd-gold-bright uppercase tracking-wide mb-4">Generate Documents</h2>

        <div className="grid sm:grid-cols-2 gap-4 mb-5 max-w-lg">
          <div>
            <label className="brd-eyebrow block mb-1">Estimate Revision (for estimate/proposal/order/invoice)</label>
            <Select value={revisionId} onChange={(e) => setRevisionId(e.target.value)} disabled={revisions.length === 0}>
              {revisions.length === 0 && <option>No revisions yet</option>}
              {revisions.map((r) => (
                <option key={r.id} value={r.id}>#{r.revisionNumber} — {r.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="brd-eyebrow block mb-1">Supplement (for supplement request)</label>
            <Select value={supplementId} onChange={(e) => setSupplementId(e.target.value)} disabled={claim.supplements.length === 0}>
              {claim.supplements.length === 0 && <option>No supplements yet</option>}
              {claim.supplements.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </Select>
          </div>
        </div>

        {error && (
          <p className="text-sm text-brd-danger border border-brd-danger/40 bg-brd-danger/10 rounded-sm px-3 py-2 mb-4">
            {error}
          </p>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {availableOptions.map((opt) => {
            const disabled =
              (opt.needsRevision && !revisionId) || (opt.needsSupplement && !supplementId) || generating === opt.type;
            return (
              <button
                key={opt.type}
                onClick={() => generate(opt.type, opt.needsRevision, opt.needsSupplement)}
                disabled={disabled}
                className="brd-card rounded-sm p-4 text-left hover:border-brd-gold-dim transition-colors disabled:opacity-40"
              >
                <p className="text-sm font-medium text-brd-text">{opt.label}</p>
                <p className="text-xs text-brd-gold-bright mt-2">
                  {generating === opt.type ? "Generating…" : "Generate PDF →"}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="brd-card rounded-sm p-6">
        <h2 className="text-sm font-semibold text-brd-gold-bright uppercase tracking-wide mb-4">Generated Documents</h2>
        <p className="text-xs text-brd-text-dim mb-4">
          &ldquo;Download&rdquo; is for internal review. &ldquo;Secure Link&rdquo; produces a signed, expiring
          customer-facing URL — blocked until Quality Control is complete or an administrator records an exception.
        </p>
        {claim.generatedDocuments.length === 0 ? (
          <p className="text-sm text-brd-text-dim">No documents generated yet.</p>
        ) : (
          <ul className="text-sm space-y-2">
            {claim.generatedDocuments.map((d) => (
              <GeneratedDocumentRow key={d.id} doc={d} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function GeneratedDocumentRow({ doc }: { doc: GeneratedDocumentDetail }) {
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateLink() {
    setGenerating(true);
    setError(null);
    setLinkUrl(null);
    try {
      const result = await apiPost(`/api/documents/${doc.id}/deliver`);
      setLinkUrl(result.url);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <li className="border-b border-brd-border/60 pb-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p>{DOCUMENT_OPTIONS.find((o) => o.type === doc.type)?.label ?? doc.type}</p>
          <p className="text-xs text-brd-text-dim">
            {dateStr(doc.generatedAt)}
            {doc.deliveredAt && <span className="text-brd-success"> · delivered {dateStr(doc.deliveredAt)}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={`/api/documents/${doc.id}/download`}
            target="_blank"
            rel="noreferrer"
            className="brd-btn-ghost rounded-sm px-3 py-1.5 text-xs"
          >
            Download
          </a>
          <button onClick={generateLink} disabled={generating} className="brd-btn-gold rounded-sm px-3 py-1.5 text-xs">
            {generating ? "Generating…" : "Secure Link"}
          </button>
        </div>
      </div>
      {error && <p className="text-xs text-brd-danger mt-2">{error}</p>}
      {linkUrl && (
        <div className="mt-2 flex items-center gap-2">
          <input readOnly value={linkUrl} className="brd-input flex-1 rounded-sm px-2 py-1.5 text-xs" onFocus={(e) => e.target.select()} />
          <button
            onClick={() => navigator.clipboard.writeText(linkUrl)}
            className="brd-btn-ghost rounded-sm px-2 py-1.5 text-xs"
          >
            Copy
          </button>
        </div>
      )}
    </li>
  );
}
