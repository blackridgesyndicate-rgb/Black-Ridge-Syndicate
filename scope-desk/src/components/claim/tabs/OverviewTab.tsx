"use client";

import { useEffect, useState } from "react";
import type { WhiteLabelProfile } from "@prisma/client";
import type { ClaimDetail } from "@/lib/types";
import { apiGet, apiPatch } from "@/lib/apiClient";
import { Field, TextInput, Select } from "@/components/ui/Field";
import { dateInputValue, dateStr } from "@/lib/format";

const STATUS_OPTIONS = ["open", "estimating", "submitted", "supplementing", "closed"];

export function OverviewTab({ claim, onChanged }: { claim: ClaimDetail; onChanged: () => Promise<void> }) {
  const [form, setForm] = useState({
    homeownerName: claim.property.customer.name,
    phone: claim.property.customer.phone ?? "",
    email: claim.property.customer.email ?? "",
    addressLine1: claim.property.addressLine1,
    addressLine2: claim.property.addressLine2 ?? "",
    city: claim.property.city,
    state: claim.property.state,
    zip: claim.property.zip,
    insuranceCarrier: claim.insuranceCarrier ?? "",
    claimNumber: claim.claimNumber ?? "",
    policyNumber: claim.policyNumber ?? "",
    dateOfLoss: dateInputValue(claim.dateOfLoss),
    estimator: claim.estimator ?? "",
    inspectionDate: dateInputValue(claim.inspectionDate),
    status: claim.status,
  });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [profiles, setProfiles] = useState<WhiteLabelProfile[]>([]);
  const [whiteLabelProfileId, setWhiteLabelProfileId] = useState(claim.whiteLabelProfileId ?? "");
  const [savingBrand, setSavingBrand] = useState(false);

  useEffect(() => {
    apiGet("/api/white-label-profiles").then((data) => setProfiles(data.profiles.filter((p: WhiteLabelProfile) => p.active)));
  }, []);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    setSaving(true);
    try {
      await apiPatch(`/api/claims/${claim.id}`, form);
      await onChanged();
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  }

  async function saveBrand() {
    setSavingBrand(true);
    try {
      await apiPatch(`/api/claims/${claim.id}`, { whiteLabelProfileId: whiteLabelProfileId || null });
      await onChanged();
    } finally {
      setSavingBrand(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 brd-card rounded-sm p-6 space-y-6">
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-brd-gold-bright uppercase tracking-wide">Homeowner</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Homeowner Name">
              <TextInput value={form.homeownerName} onChange={(e) => set("homeownerName", e.target.value)} />
            </Field>
            <Field label="Phone">
              <TextInput value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <Field label="Email">
              <TextInput type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </Field>
          </div>
        </section>

        <section className="space-y-4 pt-4 border-t border-brd-border">
          <h2 className="text-sm font-semibold text-brd-gold-bright uppercase tracking-wide">Property</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Address Line 1"><TextInput value={form.addressLine1} onChange={(e) => set("addressLine1", e.target.value)} /></Field>
            <Field label="Address Line 2"><TextInput value={form.addressLine2} onChange={(e) => set("addressLine2", e.target.value)} /></Field>
            <Field label="City"><TextInput value={form.city} onChange={(e) => set("city", e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="State"><TextInput value={form.state} onChange={(e) => set("state", e.target.value)} /></Field>
              <Field label="ZIP"><TextInput value={form.zip} onChange={(e) => set("zip", e.target.value)} /></Field>
            </div>
          </div>
        </section>

        <section className="space-y-4 pt-4 border-t border-brd-border">
          <h2 className="text-sm font-semibold text-brd-gold-bright uppercase tracking-wide">Insurance Claim</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Insurance Carrier"><TextInput value={form.insuranceCarrier} onChange={(e) => set("insuranceCarrier", e.target.value)} /></Field>
            <Field label="Claim Number"><TextInput value={form.claimNumber} onChange={(e) => set("claimNumber", e.target.value)} /></Field>
            <Field label="Policy Number"><TextInput value={form.policyNumber} onChange={(e) => set("policyNumber", e.target.value)} /></Field>
            <Field label="Date of Loss"><TextInput type="date" value={form.dateOfLoss} onChange={(e) => set("dateOfLoss", e.target.value)} /></Field>
            <Field label="Estimator"><TextInput value={form.estimator} onChange={(e) => set("estimator", e.target.value)} /></Field>
            <Field label="Inspection Date"><TextInput type="date" value={form.inspectionDate} onChange={(e) => set("inspectionDate", e.target.value)} /></Field>
            <Field label="Status">
              <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </Field>
          </div>
        </section>

        <div className="flex items-center gap-3 pt-2">
          <button onClick={save} disabled={saving} className="brd-btn-gold rounded-sm px-5 py-2.5 text-sm">
            {saving ? "Saving…" : "Save Changes"}
          </button>
          {savedAt && <span className="text-xs text-brd-success">Saved.</span>}
        </div>
      </div>

      <div className="space-y-4">
        <div className="brd-card rounded-sm p-5">
          <h2 className="text-sm font-semibold text-brd-gold-bright uppercase tracking-wide mb-3">Report Branding</h2>
          <Field label="White-Label Profile">
            <Select value={whiteLabelProfileId} onChange={(e) => setWhiteLabelProfileId(e.target.value)}>
              <option value="">Black Ridge Roofing (default)</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </Field>
          <button onClick={saveBrand} disabled={savingBrand} className="brd-btn-ghost rounded-sm px-3 py-1.5 text-xs mt-3">
            {savingBrand ? "Saving…" : "Save Branding"}
          </button>
        </div>
        <div className="brd-card rounded-sm p-5">
          <h2 className="text-sm font-semibold text-brd-gold-bright uppercase tracking-wide mb-3">Job Timeline</h2>
          <dl className="text-sm space-y-2">
            <div className="flex justify-between"><dt className="text-brd-text-dim">Created</dt><dd>{dateStr(claim.createdAt)}</dd></div>
            <div className="flex justify-between"><dt className="text-brd-text-dim">Last Updated</dt><dd>{dateStr(claim.updatedAt)}</dd></div>
            <div className="flex justify-between"><dt className="text-brd-text-dim">Revisions</dt><dd>{claim.revisions.length}</dd></div>
            <div className="flex justify-between"><dt className="text-brd-text-dim">Documents Uploaded</dt><dd>{claim.files.length}</dd></div>
            <div className="flex justify-between"><dt className="text-brd-text-dim">Photos</dt><dd>{claim.photos.length}</dd></div>
          </dl>
        </div>
        <div className="brd-card rounded-sm p-5">
          <h2 className="text-sm font-semibold text-brd-gold-bright uppercase tracking-wide mb-3">Uploaded Files</h2>
          {claim.files.length === 0 ? (
            <p className="text-sm text-brd-text-dim">No files uploaded yet.</p>
          ) : (
            <ul className="text-sm space-y-2">
              {claim.files.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-2">
                  <a href={`/api/files/${f.id}`} target="_blank" rel="noreferrer" className="text-brd-gold-bright hover:underline truncate">
                    {f.filename}
                  </a>
                  <span className="brd-tag rounded-sm px-1.5 py-0.5 border shrink-0">{f.kind.replace("_", " ")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
