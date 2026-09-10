"use client";

import { useEffect, useState } from "react";
import type { ClaimDetail } from "@/lib/types";
import { apiGet, apiPatch, apiPost } from "@/lib/apiClient";
import { QC_ITEMS } from "@/lib/qc";
import { dateStr } from "@/lib/format";

interface Checklist {
  id: string;
  itemsJson: string;
  status: "incomplete" | "complete" | "exception_approved";
  exceptionReason: string | null;
  completedAt: string | null;
}

export function QCTab({ claim }: { claim: ClaimDetail }) {
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [exceptionReason, setExceptionReason] = useState("");
  const [recordingException, setRecordingException] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet(`/api/claims/${claim.id}/qc`)
      .then((data) => setChecklist(data.checklist))
      .finally(() => setLoading(false));
  }, [claim.id]);

  async function toggle(key: string, value: boolean) {
    setSaving(key);
    setError(null);
    try {
      const data = await apiPatch(`/api/claims/${claim.id}/qc`, { items: { [key]: value } });
      setChecklist(data.checklist);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(null);
    }
  }

  async function recordException() {
    if (!exceptionReason.trim()) return;
    setRecordingException(true);
    setError(null);
    try {
      const data = await apiPost(`/api/claims/${claim.id}/qc`, { reason: exceptionReason });
      setChecklist(data.checklist);
      setExceptionReason("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRecordingException(false);
    }
  }

  if (loading || !checklist) {
    return <div className="brd-card rounded-sm p-8 text-center text-brd-text-dim">Loading checklist…</div>;
  }

  const items: Record<string, boolean> = JSON.parse(checklist.itemsJson);
  const completedCount = QC_ITEMS.filter((i) => items[i.key]).length;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="brd-card rounded-sm p-6">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <h2 className="brd-heading text-xl text-brd-text">Quality Control</h2>
          {checklist.status === "complete" && (
            <span className="brd-tag rounded-sm px-2.5 py-1 border text-brd-success border-brd-success/40">
              Complete — {dateStr(checklist.completedAt)}
            </span>
          )}
          {checklist.status === "exception_approved" && (
            <span className="brd-tag rounded-sm px-2.5 py-1 border text-brd-gold-bright border-brd-gold-dim">
              Exception Approved
            </span>
          )}
          {checklist.status === "incomplete" && (
            <span className="brd-tag rounded-sm px-2.5 py-1 border text-brd-danger border-brd-danger/40">
              {completedCount} / {QC_ITEMS.length} complete
            </span>
          )}
        </div>
        <p className="text-sm text-brd-text-dim">
          Delivery of the final report is blocked until every item below is checked, or an administrator records an
          authorized exception with a reason.
        </p>
      </div>

      {checklist.status === "exception_approved" && checklist.exceptionReason && (
        <div className="brd-card rounded-sm p-4 border-brd-gold-dim">
          <p className="text-xs text-brd-gold-bright uppercase tracking-wide mb-1">Exception on record</p>
          <p className="text-sm text-brd-text">{checklist.exceptionReason}</p>
        </div>
      )}

      {error && (
        <p className="text-sm text-brd-danger border border-brd-danger/40 bg-brd-danger/10 rounded-sm px-3 py-2">
          {error}
        </p>
      )}

      <div className="brd-card rounded-sm p-6">
        <div className="space-y-1">
          {QC_ITEMS.map((item) => (
            <label
              key={item.key}
              className="flex items-center gap-3 py-2 border-b border-brd-border/60 last:border-0 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={!!items[item.key]}
                disabled={saving === item.key}
                onChange={(e) => toggle(item.key, e.target.checked)}
              />
              <span className="text-sm text-brd-text">{item.label}</span>
            </label>
          ))}
        </div>
      </div>

      {checklist.status !== "complete" && (
        <div className="brd-card rounded-sm p-6 space-y-3">
          <h3 className="text-sm font-semibold text-brd-gold-bright uppercase tracking-wide">
            Record an Authorized Exception
          </h3>
          <p className="text-xs text-brd-text-dim">
            Administrator-only. Allows delivery to proceed with an incomplete checklist, with the reason recorded on
            the claim.
          </p>
          <textarea
            className="brd-input w-full rounded-sm px-3 py-2 text-sm"
            rows={2}
            placeholder="Reason for exception…"
            value={exceptionReason}
            onChange={(e) => setExceptionReason(e.target.value)}
          />
          <button
            onClick={recordException}
            disabled={recordingException || !exceptionReason.trim()}
            className="brd-btn-ghost rounded-sm px-4 py-2 text-sm"
          >
            {recordingException ? "Recording…" : "Record Exception"}
          </button>
        </div>
      )}
    </div>
  );
}
