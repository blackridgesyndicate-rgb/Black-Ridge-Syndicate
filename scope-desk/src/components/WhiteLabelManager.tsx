"use client";

import { useState } from "react";
import type { WhiteLabelProfile } from "@prisma/client";
import { apiPost, apiPatch } from "@/lib/apiClient";
import { Field, TextInput } from "@/components/ui/Field";

const BLANK_FORM = {
  name: "",
  businessName: "",
  addressLine1: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  email: "",
  website: "",
  licenseNumber: "",
  salesRepName: "",
  workmanshipWarrantyText: "",
  brandPrimaryColor: "#0a0a0b",
  brandAccentColor: "#c8a464",
};

export function WhiteLabelManager({ initialProfiles }: { initialProfiles: WhiteLabelProfile[] }) {
  const [profiles, setProfiles] = useState(initialProfiles);
  const [form, setForm] = useState(BLANK_FORM);
  const [saving, setSaving] = useState(false);

  async function reload() {
    const res = await fetch("/api/white-label-profiles", { cache: "no-store" });
    const data = await res.json();
    setProfiles(data.profiles);
  }

  async function addProfile() {
    if (!form.name.trim() || !form.businessName.trim()) return;
    setSaving(true);
    try {
      await apiPost("/api/white-label-profiles", form);
      setForm(BLANK_FORM);
      await reload();
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(profile: WhiteLabelProfile) {
    await apiPatch(`/api/white-label-profiles/${profile.id}`, { active: !profile.active });
    await reload();
  }

  return (
    <div className="space-y-6">
      {profiles.length > 0 && (
        <div className="grid gap-3">
          {profiles.map((p) => (
            <div key={p.id} className="brd-card rounded-sm p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-brd-text font-medium">{p.name}</p>
                <p className="text-sm text-brd-text-dim">
                  {p.businessName}
                  {p.licenseNumber ? ` — Lic. ${p.licenseNumber}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`brd-tag rounded-sm px-2 py-1 border ${
                    p.active ? "text-brd-success border-brd-success/40" : "text-brd-text-dim border-brd-border"
                  }`}
                >
                  {p.active ? "Active" : "Inactive"}
                </span>
                <button onClick={() => toggleActive(p)} className="brd-btn-ghost rounded-sm px-3 py-1.5 text-xs">
                  {p.active ? "Deactivate" : "Reactivate"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="brd-card rounded-sm p-5">
        <h2 className="text-sm font-semibold text-brd-gold-bright uppercase tracking-wide mb-3">Add White-Label Profile</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Internal Label"><TextInput value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Acme Roofing (reseller)" /></Field>
          <Field label="Business Name"><TextInput value={form.businessName} onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))} placeholder="Acme Roofing Co." /></Field>
          <Field label="License Number"><TextInput value={form.licenseNumber} onChange={(e) => setForm((f) => ({ ...f, licenseNumber: e.target.value }))} /></Field>
          <Field label="Address"><TextInput value={form.addressLine1} onChange={(e) => setForm((f) => ({ ...f, addressLine1: e.target.value }))} /></Field>
          <Field label="City"><TextInput value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} /></Field>
          <Field label="State"><TextInput value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} /></Field>
          <Field label="ZIP"><TextInput value={form.zip} onChange={(e) => setForm((f) => ({ ...f, zip: e.target.value }))} /></Field>
          <Field label="Phone"><TextInput value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></Field>
          <Field label="Email"><TextInput value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></Field>
          <Field label="Website"><TextInput value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} /></Field>
          <Field label="Sales Representative"><TextInput value={form.salesRepName} onChange={(e) => setForm((f) => ({ ...f, salesRepName: e.target.value }))} /></Field>
          <Field label="Primary Color (hex)"><TextInput value={form.brandPrimaryColor} onChange={(e) => setForm((f) => ({ ...f, brandPrimaryColor: e.target.value }))} /></Field>
          <Field label="Accent Color (hex)"><TextInput value={form.brandAccentColor} onChange={(e) => setForm((f) => ({ ...f, brandAccentColor: e.target.value }))} /></Field>
          <div className="sm:col-span-3">
            <Field label="Workmanship Warranty Text">
              <TextInput value={form.workmanshipWarrantyText} onChange={(e) => setForm((f) => ({ ...f, workmanshipWarrantyText: e.target.value }))} />
            </Field>
          </div>
        </div>
        <button onClick={addProfile} disabled={saving} className="brd-btn-gold rounded-sm px-4 py-2 text-sm mt-4">
          {saving ? "Adding…" : "+ Add Profile"}
        </button>
      </div>
    </div>
  );
}
