"use client";

import { useMemo, useRef, useState } from "react";
import type { ClaimDetail, SupplementDetail } from "@/lib/types";
import { apiPost, apiDelete, apiUpload } from "@/lib/apiClient";
import { Field, TextInput, NumberInput, Select } from "@/components/ui/Field";
import { money } from "@/lib/format";

export function SupplementTab({ claim, onChanged }: { claim: ClaimDetail; onChanged: () => Promise<void> }) {
  const [label, setLabel] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(claim.supplements[0]?.id ?? null);
  const [creating, setCreating] = useState(false);

  const supplement = claim.supplements.find((s) => s.id === selectedId) ?? claim.supplements[0] ?? null;

  async function createSupplement() {
    if (!label.trim()) return;
    setCreating(true);
    try {
      const result = await apiPost(`/api/claims/${claim.id}/supplements`, { label });
      setLabel("");
      await onChanged();
      setSelectedId(result.supplement.id);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="brd-card rounded-sm p-6">
        <h2 className="text-sm font-semibold text-brd-gold-bright uppercase tracking-wide mb-4">Supplements</h2>
        <div className="flex flex-wrap items-end gap-3 mb-4">
          {claim.supplements.length > 0 && (
            <Field label="Active Supplement">
              <Select value={supplement?.id ?? ""} onChange={(e) => setSelectedId(e.target.value)} className="w-auto min-w-[220px]">
                {claim.supplements.map((s) => (
                  <option key={s.id} value={s.id}>{s.label} ({s.status})</option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="New Supplement Label">
            <TextInput value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Supplement 1 — Ventilation & Code Items" />
          </Field>
          <button onClick={createSupplement} disabled={creating} className="brd-btn-gold rounded-sm px-4 py-2 text-sm h-9">
            + Create Supplement
          </button>
        </div>
        {!supplement && <p className="text-sm text-brd-text-dim">Create a supplement to begin comparing against the carrier's estimate.</p>}
      </div>

      {supplement && <SupplementEditor key={supplement.id} claim={claim} supplement={supplement} onChanged={onChanged} />}
    </div>
  );
}

function SupplementEditor({
  claim,
  supplement,
  onChanged,
}: {
  claim: ClaimDetail;
  supplement: SupplementDetail;
  onChanged: () => Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [carrierForm, setCarrierForm] = useState({ description: "", quantity: 0, unit: "SQ", unitPrice: 0 });
  const [matchForm, setMatchForm] = useState({
    contractorLineItemId: "",
    contractorDescription: "",
    contractorQuantity: 0,
    contractorUnit: "SQ",
    contractorUnitPrice: 0,
    carrierItemId: "",
    reasonForSupplement: "",
    supportingCodeOrPhoto: "",
  });

  const latestRevisionItems = [...claim.revisions]
    .sort((a, b) => b.revisionNumber - a.revisionNumber)[0]?.lineItems ?? [];

  async function uploadCarrierEstimate() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("kind", "carrier_estimate");
      fd.append("file", file);
      await apiUpload(`/api/claims/${claim.id}/upload`, fd);
      if (fileRef.current) fileRef.current.value = "";
      await onChanged();
    } finally {
      setUploading(false);
    }
  }

  async function addCarrierItem() {
    if (!carrierForm.description.trim()) return;
    await apiPost(`/api/supplements/${supplement.id}/carrier-items`, carrierForm);
    setCarrierForm({ description: "", quantity: 0, unit: "SQ", unitPrice: 0 });
    await onChanged();
  }

  async function removeCarrierItem(id: string) {
    await apiDelete(`/api/carrier-items/${id}`);
    await onChanged();
  }

  async function addMatch() {
    if (!matchForm.contractorDescription.trim()) return;
    await apiPost(`/api/supplements/${supplement.id}/matches`, matchForm);
    setMatchForm({
      contractorLineItemId: "",
      contractorDescription: "",
      contractorQuantity: 0,
      contractorUnit: "SQ",
      contractorUnitPrice: 0,
      carrierItemId: "",
      reasonForSupplement: "",
      supportingCodeOrPhoto: "",
    });
    await onChanged();
  }

  async function removeMatch(id: string) {
    await apiDelete(`/api/supplement-matches/${id}`);
    await onChanged();
  }

  function pickContractorItem(id: string) {
    const li = latestRevisionItems.find((l) => l.id === id);
    if (!li) return;
    setMatchForm((f) => ({
      ...f,
      contractorLineItemId: li.id,
      contractorDescription: li.description,
      contractorQuantity: li.quantity,
      contractorUnit: li.unit,
      contractorUnitPrice: li.unitPrice,
    }));
  }

  const carrierTotals = new Map(supplement.carrierItems.map((c) => [c.id, c.quantity * c.unitPrice]));

  const summaryRows = useMemo(() => {
    return supplement.matches
      .map((m) => {
        const contractorTotal = m.contractorQuantity * m.contractorUnitPrice;
        const carrierTotal = m.carrierItemId ? carrierTotals.get(m.carrierItemId) ?? 0 : 0;
        return { match: m, contractorTotal, carrierTotal, diff: contractorTotal - carrierTotal };
      })
      .filter((r) => r.diff > 0);
  }, [supplement.matches, carrierTotals]);

  return (
    <div className="space-y-6">
      <div className="brd-card rounded-sm p-6">
        <h2 className="text-sm font-semibold text-brd-gold-bright uppercase tracking-wide mb-3">Carrier Estimate</h2>
        <div className="flex items-center gap-3 flex-wrap mb-4">
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.csv,.xml"
            className="text-sm text-brd-text-dim file:mr-3 file:brd-btn-ghost file:rounded-sm file:border file:px-3 file:py-1.5 file:text-sm"
          />
          <button onClick={uploadCarrierEstimate} disabled={uploading} className="brd-btn-ghost rounded-sm px-3 py-1.5 text-xs">
            {uploading ? "Uploading…" : "Upload Carrier Document"}
          </button>
        </div>

        {supplement.carrierItems.length > 0 && (
          <table className="w-full text-sm mb-4">
            <thead>
              <tr className="text-left text-brd-text-dim border-b border-brd-border">
                <th className="py-2 pr-3">Description</th>
                <th className="py-2 pr-3">Qty</th>
                <th className="py-2 pr-3">Unit</th>
                <th className="py-2 pr-3">Unit Price</th>
                <th className="py-2 pr-3">Total</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {supplement.carrierItems.map((c) => (
                <tr key={c.id} className="border-b border-brd-border/60">
                  <td className="py-2 pr-3">{c.description}</td>
                  <td className="py-2 pr-3">{c.quantity}</td>
                  <td className="py-2 pr-3">{c.unit}</td>
                  <td className="py-2 pr-3">{money(c.unitPrice)}</td>
                  <td className="py-2 pr-3">{money(c.quantity * c.unitPrice)}</td>
                  <td className="py-2"><button onClick={() => removeCarrierItem(c.id)} className="text-brd-danger text-xs">Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="grid sm:grid-cols-5 gap-3 items-end">
          <Field label="Carrier Item Description">
            <TextInput value={carrierForm.description} onChange={(e) => setCarrierForm((f) => ({ ...f, description: e.target.value }))} />
          </Field>
          <Field label="Qty">
            <NumberInput value={carrierForm.quantity} onValueChange={(v) => setCarrierForm((f) => ({ ...f, quantity: v ?? 0 }))} />
          </Field>
          <Field label="Unit">
            <TextInput value={carrierForm.unit} onChange={(e) => setCarrierForm((f) => ({ ...f, unit: e.target.value }))} />
          </Field>
          <Field label="Unit Price">
            <NumberInput value={carrierForm.unitPrice} onValueChange={(v) => setCarrierForm((f) => ({ ...f, unitPrice: v ?? 0 }))} />
          </Field>
          <button onClick={addCarrierItem} className="brd-btn-ghost rounded-sm px-3 py-2 text-sm h-9">+ Add</button>
        </div>
      </div>

      <div className="brd-card rounded-sm p-6">
        <h2 className="text-sm font-semibold text-brd-gold-bright uppercase tracking-wide mb-3">Side-by-Side Comparison</h2>
        {supplement.matches.length > 0 && (
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-xs sm:text-sm min-w-[900px]">
              <thead>
                <tr className="text-left text-brd-text-dim border-b border-brd-border">
                  <th className="py-2 pr-2">Contractor Item</th>
                  <th className="py-2 pr-2">Contractor Qty</th>
                  <th className="py-2 pr-2">Contractor Price</th>
                  <th className="py-2 pr-2">Carrier Item</th>
                  <th className="py-2 pr-2">Difference</th>
                  <th className="py-2 pr-2">Reason</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {supplement.matches.map((m) => {
                  const carrierItem = supplement.carrierItems.find((c) => c.id === m.carrierItemId);
                  const contractorTotal = m.contractorQuantity * m.contractorUnitPrice;
                  const carrierTotal = carrierItem ? carrierItem.quantity * carrierItem.unitPrice : 0;
                  const diff = contractorTotal - carrierTotal;
                  return (
                    <tr key={m.id} className="border-b border-brd-border/60">
                      <td className="py-2 pr-2">{m.contractorDescription}</td>
                      <td className="py-2 pr-2">{m.contractorQuantity} {m.contractorUnit}</td>
                      <td className="py-2 pr-2">{money(m.contractorUnitPrice)}</td>
                      <td className="py-2 pr-2">{carrierItem ? carrierItem.description : <span className="text-brd-danger">Missing from carrier estimate</span>}</td>
                      <td className={`py-2 pr-2 font-medium ${diff > 0 ? "text-brd-gold-bright" : "text-brd-text-dim"}`}>{money(diff)}</td>
                      <td className="py-2 pr-2">{m.reasonForSupplement}</td>
                      <td className="py-2"><button onClick={() => removeMatch(m.id)} className="text-brd-danger text-xs">Remove</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="grid sm:grid-cols-3 gap-4">
          {latestRevisionItems.length > 0 && (
            <div className="sm:col-span-3">
              <Field label="Pull From Current Estimate (optional)">
                <Select value={matchForm.contractorLineItemId} onChange={(e) => pickContractorItem(e.target.value)}>
                  <option value="">— Select a line item to prefill —</option>
                  {latestRevisionItems.map((li) => (
                    <option key={li.id} value={li.id}>{li.description}</option>
                  ))}
                </Select>
              </Field>
            </div>
          )}
          <Field label="Contractor Description">
            <TextInput value={matchForm.contractorDescription} onChange={(e) => setMatchForm((f) => ({ ...f, contractorDescription: e.target.value }))} />
          </Field>
          <Field label="Contractor Qty">
            <NumberInput value={matchForm.contractorQuantity} onValueChange={(v) => setMatchForm((f) => ({ ...f, contractorQuantity: v ?? 0 }))} />
          </Field>
          <Field label="Contractor Unit Price">
            <NumberInput value={matchForm.contractorUnitPrice} onValueChange={(v) => setMatchForm((f) => ({ ...f, contractorUnitPrice: v ?? 0 }))} />
          </Field>
          <Field label="Matching Carrier Item">
            <Select value={matchForm.carrierItemId} onChange={(e) => setMatchForm((f) => ({ ...f, carrierItemId: e.target.value }))}>
              <option value="">— None (missing from carrier estimate) —</option>
              {supplement.carrierItems.map((c) => (
                <option key={c.id} value={c.id}>{c.description}</option>
              ))}
            </Select>
          </Field>
          <Field label="Reason for Supplement">
            <TextInput value={matchForm.reasonForSupplement} onChange={(e) => setMatchForm((f) => ({ ...f, reasonForSupplement: e.target.value }))} />
          </Field>
          <Field label="Supporting Code / Photo Reference">
            <TextInput value={matchForm.supportingCodeOrPhoto} onChange={(e) => setMatchForm((f) => ({ ...f, supportingCodeOrPhoto: e.target.value }))} />
          </Field>
        </div>
        <div className="flex justify-end mt-3">
          <button onClick={addMatch} className="brd-btn-gold rounded-sm px-4 py-2 text-sm">+ Add Comparison Row</button>
        </div>
      </div>

      <div className="brd-card rounded-sm p-6">
        <h2 className="text-sm font-semibold text-brd-gold-bright uppercase tracking-wide mb-3">
          Supplement Summary — Missing or Underpaid Items
        </h2>
        {summaryRows.length === 0 ? (
          <p className="text-sm text-brd-text-dim">No underpaid or missing items identified yet.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {summaryRows.map((r) => (
                <tr key={r.match.id} className="border-b border-brd-border/60">
                  <td className="py-2 pr-3">{r.match.contractorDescription}</td>
                  <td className="py-2 pr-3 text-brd-gold-bright font-medium">{money(r.diff)}</td>
                  <td className="py-2 text-brd-text-dim">{r.match.reasonForSupplement}</td>
                </tr>
              ))}
              <tr>
                <td className="py-2 pr-3 font-semibold">Total Supplement Amount</td>
                <td className="py-2 pr-3 font-semibold text-brd-gold-bright">
                  {money(summaryRows.reduce((s, r) => s + r.diff, 0))}
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
