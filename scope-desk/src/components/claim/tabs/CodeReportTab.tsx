"use client";

import { useState } from "react";
import type { ClaimDetail } from "@/lib/types";
import { apiPatch } from "@/lib/apiClient";
import { Field, TextInput, TextArea } from "@/components/ui/Field";
import { dateInputValue } from "@/lib/format";

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

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
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

  return (
    <div className="brd-card rounded-sm p-6 space-y-6 max-w-4xl">
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
  );
}
