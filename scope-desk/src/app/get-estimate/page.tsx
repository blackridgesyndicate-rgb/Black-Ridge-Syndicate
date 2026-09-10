"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { BrandMark } from "@/components/BrandMark";
import { REPORT_TYPE_COPY, ORDER_PRICE_CENTS, type ReportType } from "@/lib/orderIntake";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA",
  "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK",
  "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

function money(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

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
      className={`text-left rounded-sm p-6 border transition-colors ${
        selected ? "border-brd-gold bg-brd-charcoal-3" : "border-brd-border bg-brd-charcoal hover:border-brd-gold-dim"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="brd-eyebrow">{copy.title}</span>
        <span className="text-brd-gold-bright text-sm brd-heading">{money(ORDER_PRICE_CENTS[type])}</span>
      </div>
      <p className="text-sm text-brd-text-dim leading-relaxed">{copy.description}</p>
    </button>
  );
}

function GetEstimateForm() {
  const params = useSearchParams();
  const canceled = params.get("canceled") === "1";

  const [reportType, setReportType] = useState<ReportType | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("IL");
  const [zip, setZip] = useState("");

  // Insurance intake
  const [insuranceCarrier, setInsuranceCarrier] = useState("");
  const [claimNumber, setClaimNumber] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [dateOfLoss, setDateOfLoss] = useState("");
  const [causeOfLoss, setCauseOfLoss] = useState("");
  const [knownDamageDescription, setKnownDamageDescription] = useState("");

  // Retail intake
  const [desiredSystem, setDesiredSystem] = useState("");
  const [desiredManufacturer, setDesiredManufacturer] = useState("");
  const [warrantySelection, setWarrantySelection] = useState("");
  const [requestedTimeframe, setRequestedTimeframe] = useState("");
  const [knownLeaksConcerns, setKnownLeaksConcerns] = useState("");
  const [financingInterest, setFinancingInterest] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reportType) {
      setError("Please choose a report type above.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/public/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType,
          contactName,
          contactEmail,
          contactPhone: contactPhone || undefined,
          addressLine1,
          addressLine2: addressLine2 || undefined,
          city,
          state,
          zip,
          insuranceIntake:
            reportType === "insurance"
              ? {
                  insuranceCarrier: insuranceCarrier || undefined,
                  claimNumber: claimNumber || undefined,
                  policyNumber: policyNumber || undefined,
                  dateOfLoss: dateOfLoss || undefined,
                  causeOfLoss: causeOfLoss || undefined,
                  knownDamageDescription: knownDamageDescription || undefined,
                }
              : undefined,
          retailIntake:
            reportType === "retail"
              ? {
                  desiredSystem: desiredSystem || undefined,
                  desiredManufacturer: desiredManufacturer || undefined,
                  warrantySelection: warrantySelection || undefined,
                  requestedTimeframe: requestedTimeframe || undefined,
                  knownLeaksConcerns: knownLeaksConcerns || undefined,
                  financingInterest,
                }
              : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full px-4 py-12 bg-brd-black">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-center mb-10">
          <BrandMark size="lg" />
        </div>

        <h1 className="brd-heading text-2xl text-brd-text text-center mb-2">What type of roofing estimate do you need?</h1>
        <p className="text-sm text-brd-text-dim text-center mb-8">
          Your answer determines the questions, calculations, and report you receive.
        </p>

        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <ReportTypeCard type="insurance" selected={reportType === "insurance"} onSelect={() => setReportType("insurance")} />
          <ReportTypeCard type="retail" selected={reportType === "retail"} onSelect={() => setReportType("retail")} />
        </div>

        {canceled && (
          <p className="text-sm text-brd-text-dim border border-brd-border rounded-sm px-3 py-2 mb-6">
            Checkout was canceled. You can review your details and try again below.
          </p>
        )}

        {reportType && (
          <form onSubmit={onSubmit} className="brd-card rounded-sm p-6 space-y-6">
            <section className="space-y-4">
              <h2 className="brd-eyebrow">Contact &amp; Property</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <input required placeholder="Full name" value={contactName} onChange={(e) => setContactName(e.target.value)} className="brd-input rounded-sm px-3 py-2 text-sm" />
                <input required type="email" placeholder="Email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="brd-input rounded-sm px-3 py-2 text-sm" />
              </div>
              <input placeholder="Phone (optional)" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="brd-input w-full rounded-sm px-3 py-2 text-sm" />
              <input required placeholder="Property address line 1" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} className="brd-input w-full rounded-sm px-3 py-2 text-sm" />
              <input placeholder="Address line 2 (optional)" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} className="brd-input w-full rounded-sm px-3 py-2 text-sm" />
              <div className="grid grid-cols-3 gap-3">
                <input required placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} className="brd-input rounded-sm px-3 py-2 text-sm col-span-1" />
                <select required value={state} onChange={(e) => setState(e.target.value)} className="brd-input rounded-sm px-3 py-2 text-sm">
                  {US_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <input required placeholder="ZIP" value={zip} onChange={(e) => setZip(e.target.value)} className="brd-input rounded-sm px-3 py-2 text-sm" />
              </div>
            </section>

            {reportType === "insurance" && (
              <section className="space-y-3 pt-4 border-t border-brd-border">
                <h2 className="brd-eyebrow">Insurance Details (if known)</h2>
                <p className="text-xs text-brd-text-dim">
                  Only an address is required to get started — we&apos;ll identify what else is needed for your claim.
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <input placeholder="Insurance carrier" value={insuranceCarrier} onChange={(e) => setInsuranceCarrier(e.target.value)} className="brd-input rounded-sm px-3 py-2 text-sm" />
                  <input placeholder="Claim number" value={claimNumber} onChange={(e) => setClaimNumber(e.target.value)} className="brd-input rounded-sm px-3 py-2 text-sm" />
                  <input placeholder="Policy number" value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} className="brd-input rounded-sm px-3 py-2 text-sm" />
                  <input type="date" placeholder="Date of loss" value={dateOfLoss} onChange={(e) => setDateOfLoss(e.target.value)} className="brd-input rounded-sm px-3 py-2 text-sm" />
                </div>
                <input placeholder="Cause of loss (e.g. hail, wind)" value={causeOfLoss} onChange={(e) => setCauseOfLoss(e.target.value)} className="brd-input w-full rounded-sm px-3 py-2 text-sm" />
                <textarea placeholder="Describe known damage (optional)" value={knownDamageDescription} onChange={(e) => setKnownDamageDescription(e.target.value)} className="brd-input w-full rounded-sm px-3 py-2 text-sm" rows={3} />
              </section>
            )}

            {reportType === "retail" && (
              <section className="space-y-3 pt-4 border-t border-brd-border">
                <h2 className="brd-eyebrow">Project Preferences (if known)</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  <input placeholder="Desired roofing system" value={desiredSystem} onChange={(e) => setDesiredSystem(e.target.value)} className="brd-input rounded-sm px-3 py-2 text-sm" />
                  <input placeholder="Desired manufacturer" value={desiredManufacturer} onChange={(e) => setDesiredManufacturer(e.target.value)} className="brd-input rounded-sm px-3 py-2 text-sm" />
                  <input placeholder="Warranty interest" value={warrantySelection} onChange={(e) => setWarrantySelection(e.target.value)} className="brd-input rounded-sm px-3 py-2 text-sm" />
                  <input placeholder="Requested timeframe" value={requestedTimeframe} onChange={(e) => setRequestedTimeframe(e.target.value)} className="brd-input rounded-sm px-3 py-2 text-sm" />
                </div>
                <textarea placeholder="Known leaks or concerns (optional)" value={knownLeaksConcerns} onChange={(e) => setKnownLeaksConcerns(e.target.value)} className="brd-input w-full rounded-sm px-3 py-2 text-sm" rows={3} />
                <label className="flex items-center gap-2 text-sm text-brd-text-dim">
                  <input type="checkbox" checked={financingInterest} onChange={(e) => setFinancingInterest(e.target.checked)} />
                  I&apos;m interested in financing options
                </label>
              </section>
            )}

            {error && (
              <p className="text-sm text-brd-danger border border-brd-danger/40 bg-brd-danger/10 rounded-sm px-3 py-2">{error}</p>
            )}

            <button type="submit" disabled={loading} className="brd-btn-gold w-full rounded-sm py-2.5 text-sm tracking-wide">
              {loading ? "Redirecting to secure checkout…" : `Continue to Payment — ${money(ORDER_PRICE_CENTS[reportType])}`}
            </button>
            <p className="text-xs text-brd-text-dim text-center">
              Payment is processed securely by Stripe. You&apos;ll be redirected to complete checkout.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default function GetEstimatePage() {
  return (
    <Suspense fallback={null}>
      <GetEstimateForm />
    </Suspense>
  );
}
