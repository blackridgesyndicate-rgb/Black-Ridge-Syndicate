"use client";

import { useMemo, useState } from "react";
import type { ClaimDetail, LineItemDetail, RevisionDetail } from "@/lib/types";
import { apiPost, apiPatch, apiDelete } from "@/lib/apiClient";
import { Field, NumberInput, TextInput, Select } from "@/components/ui/Field";
import { computeInsuranceSummary, computeRetailSummary } from "@/lib/calc/estimate";
import { money, num } from "@/lib/format";

export function EstimateTab({ claim, onChanged }: { claim: ClaimDetail; onChanged: () => Promise<void> }) {
  const revisions = [...claim.revisions].sort((a, b) => b.revisionNumber - a.revisionNumber);
  const [selectedId, setSelectedId] = useState<string | null>(revisions[0]?.id ?? null);
  const [creating, setCreating] = useState(false);
  const revision = revisions.find((r) => r.id === selectedId) ?? revisions[0] ?? null;

  async function createRevision(mode: "duplicate_latest" | "fresh_from_price_list") {
    setCreating(true);
    try {
      const result = await apiPost(`/api/claims/${claim.id}/revisions`, { mode });
      await onChanged();
      setSelectedId(result.revision.id);
    } finally {
      setCreating(false);
    }
  }

  if (!revision) {
    return (
      <div className="brd-card rounded-sm p-8 text-center space-y-4">
        <p className="text-brd-text-dim">No estimate revision has been created yet.</p>
        <button
          onClick={() => createRevision("fresh_from_price_list")}
          disabled={creating}
          className="brd-btn-gold rounded-sm px-5 py-2.5 text-sm"
        >
          {creating ? "Creating…" : "Create Revision 1"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="brd-card rounded-sm p-4 flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2">
          <label className="brd-eyebrow">Revision</label>
          <Select value={revision.id} onChange={(e) => setSelectedId(e.target.value)} className="w-auto">
            {revisions.map((r) => (
              <option key={r.id} value={r.id}>
                #{r.revisionNumber} — {r.label ?? "Untitled"} ({r.status})
              </option>
            ))}
          </Select>
        </div>
        <button
          onClick={() => createRevision("duplicate_latest")}
          disabled={creating}
          className="brd-btn-ghost rounded-sm px-4 py-2 text-sm"
        >
          {creating ? "Creating…" : "+ New Revision (duplicate current)"}
        </button>
      </div>

      <RevisionEditor key={revision.id} claim={claim} revision={revision} onChanged={onChanged} />
    </div>
  );
}

function RevisionEditor({
  claim,
  revision,
  onChanged,
}: {
  claim: ClaimDetail;
  revision: RevisionDetail;
  onChanged: () => Promise<void>;
}) {
  const reportType = (claim.reportType ?? "insurance") as "insurance" | "retail";
  const isRetail = reportType === "retail";
  const [settings, setSettings] = useState({
    label: revision.label ?? "",
    status: revision.status,
    wastePercent: revision.wastePercent,
    taxRatePercent: revision.taxRatePercent,
    defaultDepreciationPercent: revision.defaultDepreciationPercent,
    deductible: revision.deductible,
    priorPayments: revision.priorPayments,
    overheadProfitPercent: revision.overheadProfitPercent,
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [newItem, setNewItem] = useState({
    category: "Roofing",
    description: "",
    unit: "SQ",
    quantity: 0,
    unitPrice: 0,
  });

  async function saveSettings() {
    setSavingSettings(true);
    try {
      await apiPatch(`/api/revisions/${revision.id}`, settings);
      await onChanged();
    } finally {
      setSavingSettings(false);
    }
  }

  async function addItem() {
    if (!newItem.description.trim()) return;
    setAddingItem(true);
    try {
      await apiPost(`/api/revisions/${revision.id}/line-items`, newItem);
      setNewItem({ category: "Roofing", description: "", unit: "SQ", quantity: 0, unitPrice: 0 });
      await onChanged();
    } finally {
      setAddingItem(false);
    }
  }

  async function updateItem(id: string, patch: Record<string, unknown>) {
    await apiPatch(`/api/line-items/${id}`, patch);
    await onChanged();
  }

  async function removeItem(id: string) {
    await apiDelete(`/api/line-items/${id}`);
    await onChanged();
  }

  const items = [...revision.lineItems].sort((a, b) => a.sortOrder - b.sortOrder);
  const insuranceSummary = useMemo(
    () => computeInsuranceSummary(items, settings.deductible, settings.priorPayments, settings.overheadProfitPercent),
    [items, settings.deductible, settings.priorPayments, settings.overheadProfitPercent]
  );
  const retailSummary = useMemo(
    () => computeRetailSummary(items, { overheadProfitPercent: settings.overheadProfitPercent }),
    [items, settings.overheadProfitPercent]
  );

  return (
    <div className="space-y-6">
      <div className="brd-card rounded-sm p-6">
        <h2 className="text-sm font-semibold text-brd-gold-bright uppercase tracking-wide mb-4">Revision Settings</h2>
        <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <Field label="Label">
            <TextInput value={settings.label} onChange={(e) => setSettings((s) => ({ ...s, label: e.target.value }))} />
          </Field>
          <Field label="Status">
            <Select value={settings.status} onChange={(e) => setSettings((s) => ({ ...s, status: e.target.value }))}>
              <option value="draft">draft</option>
              <option value="final">final</option>
            </Select>
          </Field>
          <Field label="Waste %">
            <NumberInput value={settings.wastePercent} onValueChange={(v) => setSettings((s) => ({ ...s, wastePercent: v ?? 0 }))} />
          </Field>
          <Field label="Tax Rate %">
            <NumberInput value={settings.taxRatePercent} onValueChange={(v) => setSettings((s) => ({ ...s, taxRatePercent: v ?? 0 }))} />
          </Field>
          {isRetail ? (
            <Field label="Overhead &amp; Profit %">
              <NumberInput value={settings.overheadProfitPercent} onValueChange={(v) => setSettings((s) => ({ ...s, overheadProfitPercent: v ?? 0 }))} />
            </Field>
          ) : (
            <>
              <Field label="Deductible ($)">
                <NumberInput value={settings.deductible} onValueChange={(v) => setSettings((s) => ({ ...s, deductible: v ?? 0 }))} />
              </Field>
              <Field label="Prior Payments ($)">
                <NumberInput value={settings.priorPayments} onValueChange={(v) => setSettings((s) => ({ ...s, priorPayments: v ?? 0 }))} />
              </Field>
            </>
          )}
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={saveSettings} disabled={savingSettings} className="brd-btn-gold rounded-sm px-4 py-2 text-sm">
            {savingSettings ? "Saving…" : "Save Settings & Recalculate"}
          </button>
        </div>
      </div>

      <div className="brd-card rounded-sm p-6">
        <h2 className="text-sm font-semibold text-brd-gold-bright uppercase tracking-wide mb-4">Line Items</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm min-w-[1100px]">
            <thead>
              <tr className="text-left text-brd-text-dim border-b border-brd-border">
                <th className="py-2 pr-2">Incl.</th>
                <th className="py-2 pr-2">Category</th>
                <th className="py-2 pr-2 min-w-[220px]">Description</th>
                <th className="py-2 pr-2 w-20">Qty</th>
                <th className="py-2 pr-2 w-16">Unit</th>
                <th className="py-2 pr-2 w-24">Unit Price</th>
                <th className="py-2 pr-2 w-24">Tax Rate %</th>
                <th className="py-2 pr-2 w-24">Tax</th>
                <th className="py-2 pr-2 w-24">{isRetail ? "Amount" : "RCV"}</th>
                {isRetail ? (
                  <th className="py-2 pr-2 w-20">Upgrade</th>
                ) : (
                  <>
                    <th className="py-2 pr-2 w-20">Depr. %</th>
                    <th className="py-2 pr-2 w-24">Depr. $</th>
                    <th className="py-2 pr-2 w-24">ACV</th>
                  </>
                )}
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((li) => (
                <LineItemRow key={li.id} item={li} isRetail={isRetail} onUpdate={updateItem} onRemove={removeItem} />
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid sm:grid-cols-5 gap-3 items-end mt-5 pt-4 border-t border-brd-border">
          <Field label="Category">
            <TextInput value={newItem.category} onChange={(e) => setNewItem((f) => ({ ...f, category: e.target.value }))} />
          </Field>
          <Field label="Description">
            <TextInput value={newItem.description} onChange={(e) => setNewItem((f) => ({ ...f, description: e.target.value }))} />
          </Field>
          <Field label="Qty">
            <NumberInput value={newItem.quantity} onValueChange={(v) => setNewItem((f) => ({ ...f, quantity: v ?? 0 }))} />
          </Field>
          <Field label="Unit">
            <TextInput value={newItem.unit} onChange={(e) => setNewItem((f) => ({ ...f, unit: e.target.value }))} />
          </Field>
          <Field label="Unit Price">
            <NumberInput value={newItem.unitPrice} onValueChange={(v) => setNewItem((f) => ({ ...f, unitPrice: v ?? 0 }))} />
          </Field>
        </div>
        <div className="flex justify-end mt-3">
          <button onClick={addItem} disabled={addingItem} className="brd-btn-ghost rounded-sm px-4 py-2 text-sm">
            + Add Custom Line Item
          </button>
        </div>
      </div>

      <div className="brd-card rounded-sm p-6 max-w-xl ml-auto">
        {isRetail ? (
          <>
            <h2 className="text-sm font-semibold text-brd-gold-bright uppercase tracking-wide mb-4">
              Retail Summary — Premium Roof Replacement Proposal
            </h2>
            <dl className="text-sm space-y-2">
              <Row label="Base Contract" value={money(retailSummary.baseContract)} />
              <Row label="Selected Upgrades" value={money(retailSummary.upgradesTotal)} />
              <Row label="Material Sales Tax" value={money(retailSummary.materialSalesTax)} />
              <Row label="Permit Allowance" value={money(retailSummary.permitAllowance)} />
              <Row label="Overhead &amp; Profit" value={money(retailSummary.overheadProfit)} />
              <Row label="Discount" value={money(-retailSummary.discount)} />
              <Row label="Total Contract Price" value={money(retailSummary.totalContractPrice)} bold accent />
            </dl>
          </>
        ) : (
          <>
            <h2 className="text-sm font-semibold text-brd-gold-bright uppercase tracking-wide mb-4">
              Insurance Summary — Contractor-Prepared Insurance Restoration Estimate
            </h2>
            <dl className="text-sm space-y-2">
              <Row label="Line-Item Subtotal" value={money(insuranceSummary.lineItemSubtotal)} />
              <Row label="Material Sales Tax" value={money(insuranceSummary.materialSalesTax)} />
              <Row label="Replacement Cost Value (RCV)" value={money(insuranceSummary.rcv)} bold />
              <Row label="Depreciation" value={money(insuranceSummary.depreciation)} />
              <Row label="Actual Cash Value (ACV)" value={money(insuranceSummary.acv)} bold />
              <Row label="Deductible" value={money(insuranceSummary.deductible)} />
              <Row label="Prior Payments" value={money(insuranceSummary.priorPayments)} />
              <Row label="Net Claim (due now)" value={money(insuranceSummary.netClaim)} bold accent />
              <Row label="Recoverable Depreciation" value={money(insuranceSummary.recoverableDepreciation)} />
              <Row label="Remaining Balance (upon completion)" value={money(insuranceSummary.remainingBalance)} />
            </dl>
          </>
        )}
      </div>
    </div>
  );
}

function LineItemRow({
  item,
  isRetail,
  onUpdate,
  onRemove,
}: {
  item: LineItemDetail;
  isRetail: boolean;
  onUpdate: (id: string, patch: Record<string, unknown>) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  return (
    <tr className="border-b border-brd-border/60 align-top">
      <td className="py-2 pr-2">
        <input
          type="checkbox"
          checked={item.included}
          onChange={(e) => onUpdate(item.id, { included: e.target.checked })}
        />
      </td>
      <td className="py-2 pr-2">
        <TextInput defaultValue={item.category} onBlur={(e) => onUpdate(item.id, { category: e.target.value })} className="w-28" />
      </td>
      <td className="py-2 pr-2">
        <TextInput defaultValue={item.description} onBlur={(e) => onUpdate(item.id, { description: e.target.value })} />
        {item.quantityOverridden && item.calculatedQuantity != null && (
          <p className="text-[10px] text-brd-gold-bright mt-0.5">
            System-calculated: {num(item.calculatedQuantity)} (overridden)
          </p>
        )}
        {item.codeCitation && <p className="text-[10px] text-brd-text-dim mt-0.5">Code: {item.codeCitation}</p>}
      </td>
      <td className="py-2 pr-2">
        <NumberInput value={item.quantity} onValueChange={(v) => onUpdate(item.id, { quantity: v ?? 0 })} />
      </td>
      <td className="py-2 pr-2">
        <TextInput defaultValue={item.unit} onBlur={(e) => onUpdate(item.id, { unit: e.target.value })} className="w-16" />
      </td>
      <td className="py-2 pr-2">
        <NumberInput value={item.unitPrice} onValueChange={(v) => onUpdate(item.id, { unitPrice: v ?? 0 })} />
      </td>
      <td className="py-2 pr-2">
        <NumberInput
          value={item.taxRatePercent}
          onValueChange={(v) => onUpdate(item.id, { taxRatePercent: v ?? 0 })}
          disabled={!item.taxable}
        />
      </td>
      <td className="py-2 pr-2 pt-3.5">{money(item.taxAmount)}</td>
      <td className="py-2 pr-2 pt-3.5 font-medium">{money(item.rcv)}</td>
      {isRetail ? (
        <td className="py-2 pr-2 pt-3">
          <input
            type="checkbox"
            checked={item.isUpgrade}
            onChange={(e) => onUpdate(item.id, { isUpgrade: e.target.checked })}
          />
        </td>
      ) : (
        <>
          <td className="py-2 pr-2">
            <NumberInput value={item.depreciationPercent} onValueChange={(v) => onUpdate(item.id, { depreciationPercent: v ?? 0 })} />
          </td>
          <td className="py-2 pr-2 pt-3.5">{money(item.depreciationAmount)}</td>
          <td className="py-2 pr-2 pt-3.5 font-medium">{money(item.acv)}</td>
        </>
      )}
      <td className="py-2 pt-3.5">
        <button onClick={() => onRemove(item.id)} className="text-brd-danger text-xs">
          ✕
        </button>
      </td>
    </tr>
  );
}

function Row({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""} ${accent ? "text-brd-gold-bright" : ""}`}>
      <dt className="text-brd-text-dim">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
