"use client";

import { useState } from "react";
import type { PriceListItem } from "@prisma/client";
import { apiPost, apiPatch, apiDelete } from "@/lib/apiClient";
import { Field, TextInput, NumberInput } from "@/components/ui/Field";

export function PriceListManager({ initialItems }: { initialItems: PriceListItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [form, setForm] = useState({
    category: "",
    code: "",
    description: "",
    unit: "SQ",
    defaultUnitPrice: 0,
    codeCitation: "",
  });
  const [saving, setSaving] = useState(false);

  async function reload() {
    const res = await fetch("/api/price-list", { cache: "no-store" });
    const data = await res.json();
    setItems(data.items);
  }

  async function addItem() {
    if (!form.description.trim() || !form.code.trim()) return;
    setSaving(true);
    try {
      await apiPost("/api/price-list", { ...form, taxable: true, calcRule: null });
      setForm({ category: "", code: "", description: "", unit: "SQ", defaultUnitPrice: 0, codeCitation: "" });
      await reload();
    } finally {
      setSaving(false);
    }
  }

  async function update(id: string, patch: Record<string, unknown>) {
    await apiPatch(`/api/price-list/${id}`, patch);
    await reload();
  }

  async function deactivate(id: string) {
    await apiDelete(`/api/price-list/${id}`);
    await reload();
  }

  const active = items.filter((i) => i.active);
  const byCategory = new Map<string, PriceListItem[]>();
  for (const item of active) {
    const list = byCategory.get(item.category) ?? [];
    list.push(item);
    byCategory.set(item.category, list);
  }

  return (
    <div className="space-y-6">
      {[...byCategory.entries()].map(([category, catItems]) => (
        <div key={category} className="brd-card rounded-sm p-5">
          <h2 className="text-sm font-semibold text-brd-gold-bright uppercase tracking-wide mb-3">{category}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-brd-text-dim border-b border-brd-border">
                  <th className="py-2 pr-3">Description</th>
                  <th className="py-2 pr-3 w-20">Unit</th>
                  <th className="py-2 pr-3 w-32">Unit Price</th>
                  <th className="py-2 pr-3">Code Citation</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {catItems.map((item) => (
                  <tr key={item.id} className="border-b border-brd-border/60">
                    <td className="py-2 pr-3">
                      <TextInput defaultValue={item.description} onBlur={(e) => update(item.id, { description: e.target.value })} />
                    </td>
                    <td className="py-2 pr-3">
                      <TextInput defaultValue={item.unit} onBlur={(e) => update(item.id, { unit: e.target.value })} />
                    </td>
                    <td className="py-2 pr-3">
                      <NumberInput value={item.defaultUnitPrice} onValueChange={(v) => update(item.id, { defaultUnitPrice: v ?? 0 })} />
                    </td>
                    <td className="py-2 pr-3">
                      <TextInput defaultValue={item.codeCitation ?? ""} onBlur={(e) => update(item.id, { codeCitation: e.target.value })} />
                    </td>
                    <td className="py-2">
                      <button onClick={() => deactivate(item.id)} className="text-brd-danger text-xs">Deactivate</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <div className="brd-card rounded-sm p-5">
        <h2 className="text-sm font-semibold text-brd-gold-bright uppercase tracking-wide mb-3">Add Custom Price-List Item</h2>
        <p className="text-xs text-brd-text-dim mb-3">
          Custom items added here have no automatic quantity formula — quantities are entered manually on each estimate.
        </p>
        <div className="grid sm:grid-cols-6 gap-3 items-end">
          <Field label="Category"><TextInput value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} /></Field>
          <Field label="Code (unique key)"><TextInput value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} /></Field>
          <Field label="Description"><TextInput value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></Field>
          <Field label="Unit"><TextInput value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} /></Field>
          <Field label="Unit Price"><NumberInput value={form.defaultUnitPrice} onValueChange={(v) => setForm((f) => ({ ...f, defaultUnitPrice: v ?? 0 }))} /></Field>
          <button onClick={addItem} disabled={saving} className="brd-btn-gold rounded-sm px-4 py-2 text-sm h-9">+ Add</button>
        </div>
      </div>

      <p className="text-xs text-brd-text-dim">{active.length} active item(s) in the catalog.</p>
    </div>
  );
}
