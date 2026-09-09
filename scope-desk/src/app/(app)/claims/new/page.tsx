"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inputCls = "brd-input w-full rounded-sm px-3 py-2 text-sm";
const labelCls = "brd-eyebrow block mb-1.5";

export default function NewClaimPage() {
  const router = useRouter();
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
    estimator: "",
    inspectionDate: "",
  });
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
      body: JSON.stringify(form),
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
              <label className={labelCls}>Estimator</label>
              <input className={inputCls} value={form.estimator} onChange={(e) => set("estimator", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Inspection Date</label>
              <input type="date" className={inputCls} value={form.inspectionDate} onChange={(e) => set("inspectionDate", e.target.value)} />
            </div>
          </div>
        </section>

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
