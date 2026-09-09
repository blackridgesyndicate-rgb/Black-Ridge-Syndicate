"use client";

import { useMemo, useRef, useState } from "react";
import type { ClaimDetail } from "@/lib/types";
import { apiPatch, apiUpload } from "@/lib/apiClient";
import { Field, NumberInput, TextInput, SourceBadge } from "@/components/ui/Field";
import { computeDerivedQuantities } from "@/lib/calc/measurements";
import { num, dateStr } from "@/lib/format";

type PitchArea = { pitch: string; areaSqFt: number };

const LINEAR_FIELDS: { key: string; label: string }[] = [
  { key: "eaves", label: "Eaves (LF)" },
  { key: "rakes", label: "Rakes (LF)" },
  { key: "ridges", label: "Ridges (LF)" },
  { key: "hips", label: "Hips (LF)" },
  { key: "valleys", label: "Valleys (LF)" },
  { key: "starterLength", label: "Starter Length (LF)" },
  { key: "dripEdgeLength", label: "Drip-Edge Length (LF)" },
  { key: "flashingLength", label: "Flashing (LF)" },
  { key: "stepFlashingLength", label: "Step Flashing (LF)" },
  { key: "apronFlashingLength", label: "Apron Flashing (LF)" },
  { key: "leakBarrierLength", label: "Leak-Barrier Length (LF)" },
];

export function MeasurementsTab({ claim, onChanged }: { claim: ClaimDetail; onChanged: () => Promise<void> }) {
  const m = claim.measurement;
  const fieldSource: Record<string, string> = useMemo(
    () => (m?.fieldSourceJson ? JSON.parse(m.fieldSourceJson) : {}),
    [m?.fieldSourceJson]
  );
  const originalValues: Record<string, unknown> = useMemo(
    () => (m?.originalValuesJson ? JSON.parse(m.originalValuesJson) : {}),
    [m?.originalValuesJson]
  );
  const initialPitchAreas: PitchArea[] = useMemo(
    () => (m?.pitchAreasJson ? JSON.parse(m.pitchAreasJson) : []),
    [m?.pitchAreasJson]
  );

  const [form, setForm] = useState({
    roofAreaSqFt: m?.roofAreaSqFt ?? null,
    measuredSquares: m?.measuredSquares ?? null,
    facets: m?.facets ?? null,
    predominantPitch: m?.predominantPitch ?? "",
    eaves: m?.eaves ?? null,
    rakes: m?.rakes ?? null,
    ridges: m?.ridges ?? null,
    hips: m?.hips ?? null,
    valleys: m?.valleys ?? null,
    starterLength: m?.starterLength ?? null,
    dripEdgeLength: m?.dripEdgeLength ?? null,
    flashingLength: m?.flashingLength ?? null,
    stepFlashingLength: m?.stepFlashingLength ?? null,
    apronFlashingLength: m?.apronFlashingLength ?? null,
    leakBarrierLength: m?.leakBarrierLength ?? null,
    twoStoryAreaSqFt: m?.twoStoryAreaSqFt ?? null,
    steepSlopeAreaSqFt: m?.steepSlopeAreaSqFt ?? null,
    wastePercent: m?.wastePercent ?? 12,
    membraneWidthFeet: m?.membraneWidthFeet ?? 3,
  });
  const [pitchAreas, setPitchAreas] = useState<PitchArea[]>(initialPitchAreas);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function setField<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    setDirty((d) => new Set(d).add(k as string));
  }

  const derived = useMemo(() => computeDerivedQuantities({ ...(m as any), ...form } as any), [form, m]);

  async function handleUpload(file: File) {
    setUploading(true);
    setUploadMsg(null);
    try {
      const fd = new FormData();
      fd.append("kind", "measurement_report");
      fd.append("file", file);
      const result = await apiUpload(`/api/claims/${claim.id}/upload`, fd);
      const warnings = result.report?.errorMessage;
      setUploadMsg(warnings || "Report processed.");
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
      const payload: Record<string, unknown> = { fieldOverrides: {} };
      const overrides: Record<string, boolean> = {};
      for (const key of dirty) {
        payload[key] = (form as any)[key];
        overrides[key] = true;
      }
      if (pitchAreas.length > 0 || dirty.has("pitchAreas")) {
        payload.pitchAreas = pitchAreas;
      }
      payload.fieldOverrides = overrides;
      await apiPatch(`/api/claims/${claim.id}/measurement`, payload);
      await onChanged();
      setDirty(new Set());
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="brd-card rounded-sm p-5">
        <h2 className="text-sm font-semibold text-brd-gold-bright uppercase tracking-wide mb-3">
          Upload Roof Measurement Report
        </h2>
        <p className="text-sm text-brd-text-dim mb-3">
          Accepts GAF QuickMeasure, EagleView, Roofr, or similar reports as PDF, plus CSV or XML exports. The
          system extracts what it can recognize and flags the rest for manual entry below.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.csv,.xml"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
            }}
            className="text-sm text-brd-text-dim file:mr-3 file:brd-btn-ghost file:rounded-sm file:border file:px-3 file:py-1.5 file:text-sm"
          />
          {uploading && <span className="text-xs text-brd-text-dim">Processing…</span>}
        </div>
        {uploadMsg && <p className="text-sm text-brd-gold-bright mt-3">{uploadMsg}</p>}

        {claim.measurementReports.length > 0 && (
          <div className="mt-4 pt-4 border-t border-brd-border">
            <p className="brd-eyebrow mb-2">Upload History</p>
            <ul className="text-sm space-y-1.5">
              {claim.measurementReports.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-brd-text-dim">
                    {dateStr(r.createdAt)} — {r.parserType.replace(/_/g, " ")}
                  </span>
                  <span
                    className={`brd-tag rounded-sm px-1.5 py-0.5 border ${
                      r.status === "extracted" ? "text-brd-success border-brd-success/40" : "text-brd-danger border-brd-danger/40"
                    }`}
                  >
                    {r.status.replace("_", " ")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 brd-card rounded-sm p-6 space-y-6">
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-brd-gold-bright uppercase tracking-wide">Roof Summary</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Total Roof Area (sq ft)" hint={<SourceBadge source={fieldSource.roofAreaSqFt} />}>
                <NumberInput value={form.roofAreaSqFt} onValueChange={(v) => setField("roofAreaSqFt", v)} />
              </Field>
              <Field label="Measured Squares" hint={<SourceBadge source={fieldSource.measuredSquares} />}>
                <NumberInput value={form.measuredSquares} onValueChange={(v) => setField("measuredSquares", v)} />
              </Field>
              <Field label="Roof Facets" hint={<SourceBadge source={fieldSource.facets} />}>
                <NumberInput value={form.facets} onValueChange={(v) => setField("facets", v)} />
              </Field>
              <Field label="Predominant Pitch" hint={<SourceBadge source={fieldSource.predominantPitch} />}>
                <TextInput
                  placeholder="6/12"
                  value={form.predominantPitch ?? ""}
                  onChange={(e) => setField("predominantPitch", e.target.value)}
                />
              </Field>
            </div>
          </section>

          <section className="space-y-3 pt-4 border-t border-brd-border">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-brd-gold-bright uppercase tracking-wide">Individual Pitch Areas</h2>
              <button
                onClick={() => {
                  setPitchAreas((p) => [...p, { pitch: "", areaSqFt: 0 }]);
                  setDirty((d) => new Set(d).add("pitchAreas"));
                }}
                className="brd-btn-ghost rounded-sm px-2.5 py-1 text-xs"
              >
                + Add Pitch
              </button>
            </div>
            {pitchAreas.length === 0 ? (
              <p className="text-sm text-brd-text-dim">No pitch breakdown entered.</p>
            ) : (
              <div className="space-y-2">
                {pitchAreas.map((pa, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <TextInput
                      placeholder="6/12"
                      value={pa.pitch}
                      onChange={(e) => {
                        const next = [...pitchAreas];
                        next[idx] = { ...next[idx], pitch: e.target.value };
                        setPitchAreas(next);
                        setDirty((d) => new Set(d).add("pitchAreas"));
                      }}
                      className="max-w-[100px]"
                    />
                    <NumberInput
                      value={pa.areaSqFt}
                      onValueChange={(v) => {
                        const next = [...pitchAreas];
                        next[idx] = { ...next[idx], areaSqFt: v ?? 0 };
                        setPitchAreas(next);
                        setDirty((d) => new Set(d).add("pitchAreas"));
                      }}
                    />
                    <span className="text-xs text-brd-text-dim shrink-0">sq ft</span>
                    <button
                      onClick={() => {
                        setPitchAreas(pitchAreas.filter((_, i) => i !== idx));
                        setDirty((d) => new Set(d).add("pitchAreas"));
                      }}
                      className="text-brd-danger text-xs px-2"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4 pt-4 border-t border-brd-border">
            <h2 className="text-sm font-semibold text-brd-gold-bright uppercase tracking-wide">Linear Measurements</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {LINEAR_FIELDS.map(({ key, label }) => (
                <Field key={key} label={label} hint={<SourceBadge source={fieldSource[key]} />}>
                  <NumberInput value={(form as any)[key]} onValueChange={(v) => setField(key as any, v)} />
                </Field>
              ))}
            </div>
          </section>

          <section className="space-y-4 pt-4 border-t border-brd-border">
            <h2 className="text-sm font-semibold text-brd-gold-bright uppercase tracking-wide">Additional Areas &amp; Waste</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Two-Story Roof Area (sq ft)" hint={<SourceBadge source={fieldSource.twoStoryAreaSqFt} />}>
                <NumberInput value={form.twoStoryAreaSqFt} onValueChange={(v) => setField("twoStoryAreaSqFt", v)} />
              </Field>
              <Field label="Steep-Slope Roof Area (sq ft)" hint={<SourceBadge source={fieldSource.steepSlopeAreaSqFt} />}>
                <NumberInput value={form.steepSlopeAreaSqFt} onValueChange={(v) => setField("steepSlopeAreaSqFt", v)} />
              </Field>
              <Field label="Waste Percentage (%)" hint={<SourceBadge source={fieldSource.wastePercent} />}>
                <NumberInput value={form.wastePercent} onValueChange={(v) => setField("wastePercent", v ?? 0)} />
              </Field>
              <Field label="Ice/Valley Membrane Roll Width (ft)">
                <NumberInput value={form.membraneWidthFeet} onValueChange={(v) => setField("membraneWidthFeet", v ?? 3)} />
              </Field>
            </div>
          </section>

          <div className="flex items-center gap-3 pt-2">
            <button onClick={save} disabled={saving || (dirty.size === 0)} className="brd-btn-gold rounded-sm px-5 py-2.5 text-sm">
              {saving ? "Saving…" : "Save Measurements"}
            </button>
            {savedAt && <span className="text-xs text-brd-success">Saved.</span>}
            {dirty.size > 0 && <span className="text-xs text-brd-gold-bright">{dirty.size} unsaved field(s)</span>}
          </div>
        </div>

        <div className="space-y-4">
          <div className="brd-card rounded-sm p-5">
            <h2 className="text-sm font-semibold text-brd-gold-bright uppercase tracking-wide mb-3">
              Calculated Quantities
            </h2>
            <p className="text-xs text-brd-text-dim mb-3">
              Live preview from current field values. These drive the estimate line-item quantities.
            </p>
            <dl className="text-sm space-y-2">
              <Row label="Removal (SQ)" value={num(derived.removalSquares)} />
              <Row label="Installation (SQ, w/ waste)" value={num(derived.installSquares)} />
              <Row label="High-Roof Removal (SQ)" value={num(derived.highRoofRemovalSquares)} />
              <Row label="High-Roof Install (SQ)" value={num(derived.highRoofInstallSquares)} />
              <Row label="Steep-Slope (SQ)" value={num(derived.steepSlopeSquares)} />
              <Row label="Eave + Valley Ice Barrier (SQ)" value={num(derived.eaveIceBarrierSquares + derived.valleyMembraneSquares)} />
              <Row label="Remaining Underlayment (SQ)" value={num(derived.remainingUnderlaymentSquares)} />
              <Row label="Starter (LF)" value={num(derived.starterLengthFt)} />
              <Row label="Gutter Apron (LF)" value={num(derived.gutterApronLengthFt)} />
              <Row label="Rake Drip Edge (LF)" value={num(derived.rakeDripEdgeLengthFt)} />
              <Row label="Ridge Cap (LF)" value={num(derived.ridgeCapLengthFt)} />
            </dl>
          </div>
          {m && Object.keys(originalValues).length > 0 && (
            <div className="brd-card rounded-sm p-5">
              <h2 className="text-sm font-semibold text-brd-gold-bright uppercase tracking-wide mb-3">
                Originally Extracted Values
              </h2>
              <p className="text-xs text-brd-text-dim mb-2">
                Preserved for audit even after manual correction.
              </p>
              <dl className="text-xs space-y-1.5 text-brd-text-dim">
                {Object.entries(originalValues).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2">
                    <dt>{k}</dt>
                    <dd className="text-brd-text">{Array.isArray(v) ? JSON.stringify(v) : String(v)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-brd-text-dim">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
