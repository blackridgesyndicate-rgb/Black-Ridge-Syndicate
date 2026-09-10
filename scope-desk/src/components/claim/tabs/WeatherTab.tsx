"use client";

import { useRef, useState } from "react";
import type { ClaimDetail } from "@/lib/types";
import { apiPost, apiDelete, apiUpload } from "@/lib/apiClient";
import { Field, TextInput, NumberInput, Select, TextArea, ComingSoon } from "@/components/ui/Field";
import { dateStr } from "@/lib/format";

const EVENT_TYPES = ["hail", "wind", "tornado", "thunderstorm", "other"];
const EVIDENCE_LEVELS: { value: string; label: string }[] = [
  { value: "area_reported", label: "Event reported in the area" },
  { value: "radar_indicated", label: "Radar-indicated storm near property" },
  { value: "verified_report_at_coordinate", label: "Verified report at property coordinates" },
  { value: "confirmed_property_damage", label: "Confirmed physical damage to this property" },
];
const CONFIDENCE_LEVELS = ["low", "medium", "high"];

export function WeatherTab({ claim, onChanged }: { claim: ClaimDetail; onChanged: () => Promise<void> }) {
  const [form, setForm] = useState({
    eventDate: "",
    eventType: "hail",
    hailSizeInches: null as number | null,
    windSpeedMph: null as number | null,
    distanceFromPropertyMiles: null as number | null,
    evidenceLevel: "area_reported",
    source: "NOAA NCEI Storm Events Database",
    sourceUrl: "https://www.ncdc.noaa.gov/stormevents/",
    confidenceLevel: "medium",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    setUploadMsg(null);
    try {
      const fd = new FormData();
      fd.append("kind", "weather_report");
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

  async function add() {
    if (!form.eventDate) return;
    setSaving(true);
    try {
      await apiPost(`/api/claims/${claim.id}/weather-events`, form);
      setForm((f) => ({ ...f, eventDate: "", notes: "" }));
      await onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await apiDelete(`/api/weather-events/${id}`);
    await onChanged();
  }

  return (
    <div className="space-y-6">
      <div className="brd-card rounded-sm p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-brd-gold-bright uppercase tracking-wide">Weather-Event History</h2>
            <p className="text-sm text-brd-text-dim mt-1 max-w-2xl">
              Enter events from NOAA/NWS/NCEI sources, or upload a verified weather-history report. Always record
              the evidence level honestly — a nearby weather event alone does not prove hail struck this roof.
            </p>
          </div>
          <div className="text-right shrink-0">
            <ComingSoon label="Automated NOAA API Lookup — Coming Soon" />
            <p className="text-xs text-brd-text-dim mt-1 max-w-[220px]">
              Live NOAA/NCEI API calls aren&apos;t wired up yet. Upload a report PDF below, or enter events manually.
            </p>
          </div>
        </div>

        <div className="mb-5 pb-5 border-b border-brd-border">
          <p className="brd-eyebrow mb-2">Upload Weather-History Report</p>
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
        </div>

        {claim.weatherEvents.length > 0 && (
          <div className="overflow-x-auto mb-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-brd-text-dim border-b border-brd-border">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Hail / Wind</th>
                  <th className="py-2 pr-3">Evidence Level</th>
                  <th className="py-2 pr-3">Confidence</th>
                  <th className="py-2 pr-3">Source</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {claim.weatherEvents.map((ev) => (
                  <tr key={ev.id} className="border-b border-brd-border/60">
                    <td className="py-2 pr-3">{dateStr(ev.eventDate)}</td>
                    <td className="py-2 pr-3 capitalize">{ev.eventType}</td>
                    <td className="py-2 pr-3">
                      {ev.hailSizeInches ? `${ev.hailSizeInches}" hail` : ""}
                      {ev.windSpeedMph ? ` ${ev.windSpeedMph} mph wind` : ""}
                    </td>
                    <td className="py-2 pr-3">{EVIDENCE_LEVELS.find((e) => e.value === ev.evidenceLevel)?.label ?? ev.evidenceLevel}</td>
                    <td className="py-2 pr-3 capitalize">{ev.confidenceLevel}</td>
                    <td className="py-2 pr-3">
                      {ev.sourceUrl ? (
                        <a href={ev.sourceUrl} target="_blank" rel="noreferrer" className="text-brd-gold-bright hover:underline">
                          {ev.source}
                        </a>
                      ) : (
                        ev.source
                      )}
                    </td>
                    <td className="py-2">
                      <button onClick={() => remove(ev.id)} className="text-brd-danger text-xs">Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Event Date"><TextInput type="date" value={form.eventDate} onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))} /></Field>
          <Field label="Event Type">
            <Select value={form.eventType} onChange={(e) => setForm((f) => ({ ...f, eventType: e.target.value }))}>
              {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
          <Field label="Distance From Property (mi)">
            <NumberInput value={form.distanceFromPropertyMiles} onValueChange={(v) => setForm((f) => ({ ...f, distanceFromPropertyMiles: v }))} />
          </Field>
          <Field label="Hail Size (inches)">
            <NumberInput value={form.hailSizeInches} onValueChange={(v) => setForm((f) => ({ ...f, hailSizeInches: v }))} />
          </Field>
          <Field label="Wind Speed (mph)">
            <NumberInput value={form.windSpeedMph} onValueChange={(v) => setForm((f) => ({ ...f, windSpeedMph: v }))} />
          </Field>
          <Field label="Confidence Level">
            <Select value={form.confidenceLevel} onChange={(e) => setForm((f) => ({ ...f, confidenceLevel: e.target.value }))}>
              {CONFIDENCE_LEVELS.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <div className="sm:col-span-3">
            <Field label="Evidence Level">
              <Select value={form.evidenceLevel} onChange={(e) => setForm((f) => ({ ...f, evidenceLevel: e.target.value }))}>
                {EVIDENCE_LEVELS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Source"><TextInput value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} /></Field>
          <div className="sm:col-span-2">
            <Field label="Source URL"><TextInput value={form.sourceUrl} onChange={(e) => setForm((f) => ({ ...f, sourceUrl: e.target.value }))} /></Field>
          </div>
          <div className="sm:col-span-3">
            <Field label="Notes"><TextArea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></Field>
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={add} disabled={saving} className="brd-btn-gold rounded-sm px-5 py-2.5 text-sm">
            {saving ? "Saving…" : "+ Add Weather Event"}
          </button>
        </div>
      </div>
    </div>
  );
}
