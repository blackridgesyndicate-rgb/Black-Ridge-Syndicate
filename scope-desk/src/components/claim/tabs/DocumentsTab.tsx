"use client";

import { useState } from "react";
import type { ClaimDetail } from "@/lib/types";
import { apiPost } from "@/lib/apiClient";
import { Select } from "@/components/ui/Field";
import { dateStr } from "@/lib/format";

const DOCUMENT_OPTIONS: { type: string; label: string; needsRevision?: boolean; needsSupplement?: boolean }[] = [
  { type: "insurance_estimate", label: "Contractor-Prepared Insurance Estimate", needsRevision: true },
  { type: "measurement_summary", label: "Measurement Summary" },
  { type: "code_report", label: "Code-Enforcement Report" },
  { type: "weather_report", label: "Weather-History Report" },
  { type: "supplement_request", label: "Supplement Request", needsSupplement: true },
  { type: "homeowner_proposal", label: "Homeowner Proposal", needsRevision: true },
  { type: "material_order", label: "Material Order", needsRevision: true },
  { type: "invoice", label: "Invoice", needsRevision: true },
];

export function DocumentsTab({ claim, onChanged }: { claim: ClaimDetail; onChanged: () => Promise<void> }) {
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
          {DOCUMENT_OPTIONS.map((opt) => {
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
        {claim.generatedDocuments.length === 0 ? (
          <p className="text-sm text-brd-text-dim">No documents generated yet.</p>
        ) : (
          <ul className="text-sm space-y-2">
            {claim.generatedDocuments.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 border-b border-brd-border/60 pb-2">
                <div>
                  <p>{DOCUMENT_OPTIONS.find((o) => o.type === d.type)?.label ?? d.type}</p>
                  <p className="text-xs text-brd-text-dim">{dateStr(d.generatedAt)}</p>
                </div>
                <a
                  href={`/api/documents/${d.id}/download`}
                  target="_blank"
                  rel="noreferrer"
                  className="brd-btn-ghost rounded-sm px-3 py-1.5 text-xs"
                >
                  Download
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
