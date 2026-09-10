"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { REPORT_TYPE_COPY, type ReportType } from "@/lib/orderIntake";

const inputCls = "brd-input w-full rounded-sm px-3 py-2 text-sm";
const labelCls = "brd-eyebrow block mb-1.5";

function ReportTypeCard({
  type,
  selected,
  onSelect,
}: {
  type: ReportType;
  selected: boolean;
  onSelect: () => void;
}) {
  const copy = REPORT_TYPE_COPY[type];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`text-left rounded-sm p-5 border transition-colors ${
        selected ? "border-brd-gold bg-brd-charcoal-3" : "border-brd-border bg-brd-charcoal hover:border-brd-gold-dim"
      }`}
    >
      <p className="brd-eyebrow mb-1.5">{copy.title}</p>
      <p className="text-sm text-brd-text-dim leading-relaxed">{copy.description}</p>
    </button>
  );
}

export default function NewClaimPage() {
  const router = useRouter();
  const [reportType, setReportType] = useState<ReportType>("insurance");
  const [form, setForm] = useState({
    homeownerName: "",
    phone: "",
    email: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "IL",
    zip: "",
    insuranceCarrier: "",
    claimNumber: "",
    policyNumber: "",
    dateOfLoss: "",
    causeOfLoss: "",
    adjusterName: "",
    adjusterPhone: "",
    adjusterEmail: "",
    estimator: "",
    inspectionDate: "",
    desiredSystem: "",
    desiredManufacturer: "",
    shingleStyleColor: "",
    warrantySelection: "",
    ventilationPreference: "",
    requestedTimeframe: "",
    knownLeaksConcerns: "",
    existingRoofInfo: "",
  });
  const [financingInterest, setFinancingInterest] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, reportType, financingInterest }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to create job");
      setLoading(false);
      return;
    }
    router.push(`/claims/${data.claim.id}`);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <p className="brd-eyebrow mb-1">New Job</p>
      <h1 className="brd-heading text-2xl sm:text-3xl text-brd-text mb-6">Create Property &amp; Claim</h1>

      <div className="mb-6">
        <h2 className="text-sm font-semibold text-brd-gold-bright uppercase tracking-wide mb-3">
          What type of roofing estimate do you need?
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <ReportTypeCard type="insurance" selected={reportType === "insurance"} onSelect={() => setReportType("insurance")} />
          <ReportTypeCard type="retail" selected={reportType === "retail"} onSelect={() => setReportType("retail")} />
        </div>
      </div>

      <form onSubmit={onSubmit} className="brd-card rounded-sm p-6 space-y-6">
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-brd-gold-bright uppercase tracking-wide">Homeowner</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Homeowner Name *</label>
              <input required className={inputCls} value={form.homeownerName} onChange={(e) => set("homeownerName", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input className={inputCls} value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Email</label>
              <input type="email" className={inputCls} value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
          </div>
        </section>

        <section className="space-y-4 pt-4 border-t border-brd-border">
          <h2 className="text-sm font-semibold text-brd-gold-bright uppercase tracking-wide">Property Address</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelCls}>Address Line 1 *</label>
              <input required className={inputCls} value={form.addressLine1} onChange={(e) => set("addressLine1", e.target.value)} placeholder="3950 Peartree Drive" />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Address Line 2</label>
              <input className={inputCls} value={form.addressLine2} onChange={(e) => set("addressLine2", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>City *</label>
              <input required className={inputCls} value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Lake in the Hills" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>State *</label>
                <input required className={inputCls} value={form.state} onChange={(e) => set("state", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>ZIP *</label>
                <input required className={inputCls} value={form.zip} onChange={(e) => set("zip", e.target.value)} placeholder="60156" />
              </div>
            </div>
          </div>
        </section>

        {reportType === "insurance" ? (
          <section className="space-y-4 pt-4 border-t border-brd-border">
            <h2 className="text-sm font-semibold text-brd-gold-bright uppercase tracking-wide">Insurance Claim</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Insurance Carrier</label>
                <input className={inputCls} value={form.insuranceCarrier} onChange={(e) => set("insuranceCarrier", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Claim Number</label>
                <input className={inputCls} value={form.claimNumber} onChange={(e) => set("claimNumber", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Policy Number</label>
                <input className={inputCls} value={form.policyNumber} onChange={(e) => set("policyNumber", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Date of Loss</label>
                <input type="date" className={inputCls} value={form.dateOfLoss} onChange={(e) => set("dateOfLoss", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Cause of Loss</label>
                <input className={inputCls} value={form.causeOfLoss} onChange={(e) => set("causeOfLoss", e.target.value)} placeholder="Hail, wind, etc." />
              </div>
              <div>
                <label className={labelCls}>Adjuster Name</label>
                <input className={inputCls} value={form.adjusterName} onChange={(e) => set("adjusterName", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Adjuster Phone</label>
                <input className={inputCls} value={form.adjusterPhone} onChange={(e) => set("adjusterPhone", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Adjuster Email</label>
                <input type="email" className={inputCls} value={form.adjusterEmail} onChange={(e) => set("adjusterEmail", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Estimator</label>
                <input className={inputCls} value={form.estimator} onChange={(e) => set("estimator", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Inspection Date</label>
                <input type="date" className={inputCls} value={form.inspectionDate} onChange={(e) => set("inspectionDate", e.target.value)} />
              </div>
            </div>
          </section>
        ) : (
          <section className="space-y-4 pt-4 border-t border-brd-border">
            <h2 className="text-sm font-semibold text-brd-gold-bright uppercase tracking-wide">Retail Project Preferences</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Desired Roofing System</label>
                <input className={inputCls} value={form.desiredSystem} onChange={(e) => set("desiredSystem", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Desired Manufacturer</label>
                <input className={inputCls} value={form.desiredManufacturer} onChange={(e) => set("desiredManufacturer", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Shingle Style / Color</label>
                <input className={inputCls} value={form.shingleStyleColor} onChange={(e) => set("shingleStyleColor", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Warranty Selection</label>
                <input className={inputCls} value={form.warrantySelection} onChange={(e) => set("warrantySelection", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Ventilation Preference</label>
                <input className={inputCls} value={form.ventilationPreference} onChange={(e) => set("ventilationPreference", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Requested Timeframe</label>
                <input className={inputCls} value={form.requestedTimeframe} onChange={(e) => set("requestedTimeframe", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Estimator</label>
                <input className={inputCls} value={form.estimator} onChange={(e) => set("estimator", e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Inspection Date</label>
                <input type="date" className={inputCls} value={form.inspectionDate} onChange={(e) => set("inspectionDate", e.target.value)} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Known Leaks or Concerns</label>
              <textarea className={inputCls} rows={2} value={form.knownLeaksConcerns} onChange={(e) => set("knownLeaksConcerns", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Existing Roof Information</label>
              <textarea className={inputCls} rows={2} value={form.existingRoofInfo} onChange={(e) => set("existingRoofInfo", e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm text-brd-text-dim">
              <input type="checkbox" checked={financingInterest} onChange={(e) => setFinancingInterest(e.target.checked)} />
              Customer is interested in financing options
            </label>
          </section>
        )}

        {error && (
          <p className="text-sm text-brd-danger border border-brd-danger/40 bg-brd-danger/10 rounded-sm px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="submit" disabled={loading} className="brd-btn-gold rounded-sm px-5 py-2.5 text-sm">
            {loading ? "Creating…" : "Create Job"}
          </button>
        </div>
      </form>
    </div>
  );
}
