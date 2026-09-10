"use client";

import { useRef, useState } from "react";
import type { ClaimDetail } from "@/lib/types";
import { apiPatch, apiUpload } from "@/lib/apiClient";
import { Field, TextInput, TextArea } from "@/components/ui/Field";
import { dateInputValue, dateStr } from "@/lib/format";

const FIELDS: { key: string; label: string; area?: boolean }[] = [
  { key: "authorityHavingJurisdiction", label: "Authority Having Jurisdiction (AHJ)" },
  { key: "departmentContact", label: "Building Department Contact" },
  { key: "adoptedCodeEdition", label: "Adopted IRC/IBC Edition" },
  { key: "localAmendments", label: "Local Amendments", area: true },
  { key: "permitRequirements", label: "Permit Requirements", area: true },
  { key: "permitFees", label: "Permit Fees" },
  { key: "iceBarrierRequirement", label: "Ice-Barrier Requirement", area: true },
  { key: "dripEdgeRequirement", label: "Drip-Edge Requirement", area: true },
  { key: "valleyLiningRequirement", label: "Valley-Lining Requirement", area: true },
  { key: "underlaymentRequirement", label: "Underlayment Requirement", area: true },
  { key: "ventilationRequirement", label: "Ventilation Requirement", area: true },
  { key: "chimneyCricketRequirement", label: "Chimney-Cricket Requirement", area: true },
  { key: "reRoofLayerLimitation", label: "Re-Roofing / Layer Limitations", area: true },
  { key: "deckingRequirement", label: "Decking Requirement", area: true },
];

const PLACEHOLDER = "Verification required";

export function CodeReportTab({ claim, onChanged }: { claim: ClaimDetail; onChanged: () => Promise<void> }) {
  const cr = claim.codeReport;
  const [form, setForm] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = {};
    for (const f of FIELDS) base[f.key] = (cr as any)?.[f.key] ?? "";
    base.sourceUrl = cr?.sourceUrl ?? "";
    base.notes = cr?.notes ?? "";
    base.verificationDate = dateInputValue(cr?.verificationDate);
    return base;
  });
  const [verified, setVerified] = useState(cr?.verified ?? false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleUpload(file: File) {
    setUploading(true);
    setUploadMsg(null);
    try {
      const fd = new FormData();
      fd.append("kind", "code_report");
      fd.append("file", file);
      const result = await apiUpload(`/api/claims/${claim.id}/upload`, fd);
      setUploadMsg((result.warnings ?? []).join(" "));
      await onChanged();
    } catch (err) {
      setUploadMsg((err as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save() {
    setSaving(true);
    try {
      await apiPatch(`/api/claims/${claim.id}/code-report`, { ...form, verified });
      await onChanged();
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  }

  const codeReportFiles = claim.files.filter((f) => f.kind === "code_report");

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="brd-card rounded-sm p-6">
        <h2 className="text-sm font-semibold text-brd-gold-bright uppercase tracking-wide mb-2">
          Upload Code-Verification Report
        </h2>
        <p className="text-sm text-brd-text-dim mb-3">
          Accepts an address-specific jurisdiction/code verification report PDF (e.g. OneClick Code). Recognized
          fields are imported automatically and can still be edited below; anything not found is left as
          &ldquo;Verification required&rdquo; rather than guessed.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
            }}
            className="text-sm text-brd-text-dim file:mr-3 file:brd-btn-ghost file:rounded-sm file:border file:px-3 file:py-1.5 file:text-sm"
          />
          {uploading && <span className="text-xs text-brd-text-dim">Processing…</span>}
        </div>
        {uploadMsg && <p className="text-sm text-brd-gold-bright mt-3">{uploadMsg}</p>}
        {codeReportFiles.length > 0 && (
          <ul className="text-xs text-brd-text-dim mt-3 space-y-1">
            {codeReportFiles.map((f) => (
              <li key={f.id}>
                {dateStr(f.uploadedAt)} —{" "}
                <a href={`/api/files/${f.id}`} target="_blank" rel="noreferrer" className="text-brd-gold-bright hover:underline">
                  {f.filename}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="brd-card rounded-sm p-6 space-y-6">
      <div>
        <h2 className="brd-heading text-xl text-brd-text">Code-Enforcement Report</h2>
        <p className="text-sm text-brd-text-dim mt-1">
          Every citation must trace to an official municipal, county, state, or ICC source. Leave a field blank
          (shown as &ldquo;Verification required&rdquo;) rather than guessing — never invent a code requirement.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {FIELDS.map((f) => (
          <div key={f.key} className={f.area ? "sm:col-span-2" : ""}>
            <Field label={f.label}>
              {f.area ? (
                <TextArea rows={2} placeholder={PLACEHOLDER} value={form[f.key]} onChange={(e) => set(f.key, e.target.value)} />
              ) : (
                <TextInput placeholder={PLACEHOLDER} value={form[f.key]} onChange={(e) => set(f.key, e.target.value)} />
              )}
            </Field>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-brd-border">
        <Field label="Direct Source URL">
          <TextInput
            placeholder="https://www.municode.com/..."
            value={form.sourceUrl}
            onChange={(e) => set("sourceUrl", e.target.value)}
          />
        </Field>
        <Field label="Verification Date">
          <TextInput type="date" value={form.verificationDate} onChange={(e) => set("verificationDate", e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Notes">
            <TextArea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} />
          I have personally verified the above citations against the source(s) listed.
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="brd-btn-gold rounded-sm px-5 py-2.5 text-sm">
          {saving ? "Saving…" : "Save Code Report"}
        </button>
        {savedAt && <span className="text-xs text-brd-success">Saved.</span>}
        {!verified && (
          <span className="brd-tag rounded-sm px-2 py-1 border text-brd-danger border-brd-danger/40">
            Unverified
          </span>
        )}
      </div>
      </div>
    </div>
  );
}
