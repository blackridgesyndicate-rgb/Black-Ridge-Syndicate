"use client";

import { useRef, useState } from "react";
import type { ClaimDetail } from "@/lib/types";
import { apiPost, apiPatch, apiDelete, apiUpload } from "@/lib/apiClient";
import { Field, TextInput, NumberInput, Select, TextArea } from "@/components/ui/Field";

const ACCESSORY_TYPES = [
  ["pipe_jack", "Pipe Jack"],
  ["turtle_box_vent", "Turtle / Box Vent"],
  ["ridge_vent", "Ridge Vent"],
  ["powered_vent", "Powered Vent"],
  ["chimney", "Chimney"],
  ["chimney_flashing", "Chimney Flashing"],
  ["chimney_cricket", "Chimney Cricket"],
  ["skylight", "Skylight"],
  ["satellite_dish", "Satellite Dish"],
  ["kickout_diverter", "Kick-Out Diverter"],
  ["wall_flashing", "Wall Flashing"],
  ["counterflashing", "Counterflashing"],
  ["apron_flashing", "Apron Flashing"],
  ["exhaust_vent", "Exhaust Vent"],
  ["gutter", "Gutter"],
  ["downspout", "Downspout"],
  ["detached_garage", "Detached Garage"],
  ["low_slope_roofing", "Low-Slope Roofing"],
  ["decking_replacement", "Decking Replacement"],
  ["additional_layer", "Additional Layer"],
  ["interior_damage", "Interior Damage"],
  ["other", "Other / Custom"],
] as const;

const DAMAGE_TYPES = [
  ["hail", "Hail"],
  ["wind", "Wind"],
  ["mechanical", "Mechanical Damage"],
  ["wear", "Wear"],
  ["improper_installation", "Improper Installation"],
  ["interior_water", "Interior Water Damage"],
  ["other", "Other"],
] as const;

const FINDING_CATEGORIES = [
  ["slopes", "Slopes"],
  ["flashings", "Flashings"],
  ["ventilation", "Ventilation"],
  ["gutters", "Gutters"],
  ["interior", "Interior"],
  ["structural", "Structural"],
  ["other", "Other"],
] as const;

export function AccessoriesTab({ claim, onChanged }: { claim: ClaimDetail; onChanged: () => Promise<void> }) {
  return (
    <div className="space-y-6">
      <AccessoriesSection claim={claim} onChanged={onChanged} />
      <FindingsSection claim={claim} onChanged={onChanged} />
      <PhotosSection claim={claim} onChanged={onChanged} />
    </div>
  );
}

function AccessoriesSection({ claim, onChanged }: { claim: ClaimDetail; onChanged: () => Promise<void> }) {
  const [form, setForm] = useState({ type: "pipe_jack", label: "", quantity: 1, unit: "ea", notes: "" });
  const [saving, setSaving] = useState(false);

  async function add() {
    setSaving(true);
    try {
      await apiPost(`/api/claims/${claim.id}/accessories`, form);
      setForm({ type: "pipe_jack", label: "", quantity: 1, unit: "ea", notes: "" });
      await onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function update(id: string, patch: Record<string, unknown>) {
    await apiPatch(`/api/accessories/${id}`, patch);
    await onChanged();
  }

  async function remove(id: string) {
    await apiDelete(`/api/accessories/${id}`);
    await onChanged();
  }

  return (
    <div className="brd-card rounded-sm p-6">
      <h2 className="text-sm font-semibold text-brd-gold-bright uppercase tracking-wide mb-4">
        Roof Accessories
      </h2>

      {claim.accessories.length > 0 && (
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-brd-text-dim border-b border-brd-border">
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Qty</th>
                <th className="py-2 pr-3">Unit</th>
                <th className="py-2 pr-3">Notes</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {claim.accessories.map((a) => (
                <tr key={a.id} className="border-b border-brd-border/60">
                  <td className="py-2 pr-3">
                    {ACCESSORY_TYPES.find(([v]) => v === a.type)?.[1] ?? a.type}
                    {a.label ? ` — ${a.label}` : ""}
                  </td>
                  <td className="py-2 pr-3 w-24">
                    <NumberInput
                      value={a.quantity}
                      onValueChange={(v) => update(a.id, { quantity: v ?? 0 })}
                    />
                  </td>
                  <td className="py-2 pr-3 w-20">
                    <TextInput defaultValue={a.unit} onBlur={(e) => update(a.id, { unit: e.target.value })} />
                  </td>
                  <td className="py-2 pr-3">
                    <TextInput defaultValue={a.notes ?? ""} onBlur={(e) => update(a.id, { notes: e.target.value })} />
                  </td>
                  <td className="py-2">
                    <button onClick={() => remove(a.id)} className="text-brd-danger text-xs px-2">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid sm:grid-cols-5 gap-3 items-end">
        <Field label="Type">
          <Select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
            {ACCESSORY_TYPES.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
        </Field>
        {form.type === "other" && (
          <Field label="Custom Label">
            <TextInput value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
          </Field>
        )}
        <Field label="Quantity">
          <NumberInput value={form.quantity} onValueChange={(v) => setForm((f) => ({ ...f, quantity: v ?? 0 }))} />
        </Field>
        <Field label="Unit">
          <TextInput value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} />
        </Field>
        <Field label="Notes">
          <TextInput value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        </Field>
        <button onClick={add} disabled={saving} className="brd-btn-gold rounded-sm px-4 py-2 text-sm h-9">
          + Add
        </button>
      </div>
    </div>
  );
}

function FindingsSection({ claim, onChanged }: { claim: ClaimDetail; onChanged: () => Promise<void> }) {
  const [form, setForm] = useState({
    category: "slopes",
    location: "",
    damageType: "hail",
    description: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  async function add() {
    if (!form.description.trim()) return;
    setSaving(true);
    try {
      await apiPost(`/api/claims/${claim.id}/findings`, form);
      setForm({ category: "slopes", location: "", damageType: "hail", description: "", notes: "" });
      await onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await apiDelete(`/api/findings/${id}`);
    await onChanged();
  }

  return (
    <div className="brd-card rounded-sm p-6">
      <h2 className="text-sm font-semibold text-brd-gold-bright uppercase tracking-wide mb-4">
        Inspection Findings
      </h2>

      {claim.findings.length > 0 && (
        <div className="space-y-3 mb-5">
          {claim.findings.map((f) => (
            <div key={f.id} className="border border-brd-border rounded-sm p-3 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="brd-tag rounded-sm px-1.5 py-0.5 border">
                    {FINDING_CATEGORIES.find(([v]) => v === f.category)?.[1] ?? f.category}
                  </span>
                  <span className="brd-tag rounded-sm px-1.5 py-0.5 border text-brd-gold-bright border-brd-gold-dim">
                    {DAMAGE_TYPES.find(([v]) => v === f.damageType)?.[1] ?? f.damageType}
                  </span>
                  {f.location && <span className="text-xs text-brd-text-dim">{f.location}</span>}
                </div>
                <p className="text-sm">{f.description}</p>
                {f.notes && <p className="text-xs text-brd-text-dim mt-1">{f.notes}</p>}
              </div>
              <button onClick={() => remove(f.id)} className="text-brd-danger text-xs px-2 shrink-0">
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Category">
          <Select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
            {FINDING_CATEGORIES.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
        </Field>
        <Field label="Damage Classification">
          <Select value={form.damageType} onChange={(e) => setForm((f) => ({ ...f, damageType: e.target.value }))}>
            {DAMAGE_TYPES.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
        </Field>
        <Field label="Location">
          <TextInput value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
        </Field>
        <Field label="Notes">
          <TextInput value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Description">
            <TextArea
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </Field>
        </div>
        <div className="sm:col-span-2 flex justify-end">
          <button onClick={add} disabled={saving} className="brd-btn-gold rounded-sm px-4 py-2 text-sm">
            + Add Finding
          </button>
        </div>
      </div>
    </div>
  );
}

function PhotosSection({ claim, onChanged }: { claim: ClaimDetail; onChanged: () => Promise<void> }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [classification, setClassification] = useState("hail");
  const [uploading, setUploading] = useState(false);

  async function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("kind", "photo");
      fd.append("file", file);
      fd.append("caption", caption);
      fd.append("damageClassification", classification);
      await apiUpload(`/api/claims/${claim.id}/upload`, fd);
      setCaption("");
      if (fileRef.current) fileRef.current.value = "";
      await onChanged();
    } finally {
      setUploading(false);
    }
  }

  async function remove(id: string) {
    await apiDelete(`/api/photos/${id}`);
    await onChanged();
  }

  return (
    <div className="brd-card rounded-sm p-6">
      <h2 className="text-sm font-semibold text-brd-gold-bright uppercase tracking-wide mb-4">
        Inspection Photos
      </h2>

      <div className="grid sm:grid-cols-4 gap-3 items-end mb-5">
        <div className="sm:col-span-2">
          <Field label="Photo File">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="text-sm text-brd-text-dim file:mr-3 file:brd-btn-ghost file:rounded-sm file:border file:px-3 file:py-1.5 file:text-sm w-full"
            />
          </Field>
        </div>
        <Field label="Damage Classification">
          <Select value={classification} onChange={(e) => setClassification(e.target.value)}>
            {DAMAGE_TYPES.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
        </Field>
        <Field label="Caption">
          <TextInput value={caption} onChange={(e) => setCaption(e.target.value)} />
        </Field>
        <div className="sm:col-span-4 flex justify-end">
          <button onClick={upload} disabled={uploading} className="brd-btn-gold rounded-sm px-4 py-2 text-sm">
            {uploading ? "Uploading…" : "Upload Photo"}
          </button>
        </div>
      </div>

      {claim.photos.length === 0 ? (
        <p className="text-sm text-brd-text-dim">No photos uploaded yet.</p>
      ) : (
        <div className="grid sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {claim.photos.map((p) => (
            <div key={p.id} className="border border-brd-border rounded-sm overflow-hidden">
              <a href={`/api/files/${p.fileId}`} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/files/${p.fileId}`} alt={p.caption ?? "Inspection photo"} className="w-full h-32 object-cover" />
              </a>
              <div className="p-2 text-xs space-y-1">
                {p.damageClassification && (
                  <span className="brd-tag rounded-sm px-1.5 py-0.5 border inline-block">
                    {DAMAGE_TYPES.find(([v]) => v === p.damageClassification)?.[1] ?? p.damageClassification}
                  </span>
                )}
                <p className="text-brd-text-dim truncate">{p.caption || "No caption"}</p>
                <button onClick={() => remove(p.id)} className="text-brd-danger">
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
