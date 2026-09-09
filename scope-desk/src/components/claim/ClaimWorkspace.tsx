"use client";

import { useCallback, useState } from "react";
import type { ClaimDetail } from "@/lib/types";
import { apiGet } from "@/lib/apiClient";
import { OverviewTab } from "@/components/claim/tabs/OverviewTab";
import { MeasurementsTab } from "@/components/claim/tabs/MeasurementsTab";
import { AccessoriesTab } from "@/components/claim/tabs/AccessoriesTab";
import { EstimateTab } from "@/components/claim/tabs/EstimateTab";
import { CodeReportTab } from "@/components/claim/tabs/CodeReportTab";
import { WeatherTab } from "@/components/claim/tabs/WeatherTab";
import { SupplementTab } from "@/components/claim/tabs/SupplementTab";
import { DocumentsTab } from "@/components/claim/tabs/DocumentsTab";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "measurements", label: "Measurements" },
  { key: "accessories", label: "Accessories & Inspection" },
  { key: "estimate", label: "Estimate" },
  { key: "code", label: "Code Report" },
  { key: "weather", label: "Weather" },
  { key: "supplement", label: "Supplement" },
  { key: "documents", label: "Documents" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function statusColor(status: string) {
  switch (status) {
    case "closed":
      return "text-brd-text-dim border-brd-border";
    case "submitted":
    case "supplementing":
      return "text-brd-gold-bright border-brd-gold-dim";
    default:
      return "text-brd-success border-brd-success/40";
  }
}

export function ClaimWorkspace({ initialClaim }: { initialClaim: ClaimDetail }) {
  const [claim, setClaim] = useState<ClaimDetail>(initialClaim);
  const [tab, setTab] = useState<TabKey>("overview");
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await apiGet(`/api/claims/${initialClaim.id}`);
      setClaim(data.claim);
    } finally {
      setRefreshing(false);
    }
  }, [initialClaim.id]);

  return (
    <div>
      <div className="brd-card rounded-sm p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="brd-eyebrow mb-1">{claim.claimNumber ? `Claim #${claim.claimNumber}` : "No claim number"}</p>
          <h1 className="brd-heading text-2xl text-brd-text">{claim.property.customer.name}</h1>
          <p className="text-sm text-brd-text-dim mt-1">
            {claim.property.addressLine1}
            {claim.property.addressLine2 ? `, ${claim.property.addressLine2}` : ""}, {claim.property.city},{" "}
            {claim.property.state} {claim.property.zip}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {refreshing && <span className="text-xs text-brd-text-dim">Syncing…</span>}
          <span className={`brd-tag rounded-sm px-2.5 py-1 border ${statusColor(claim.status)}`}>{claim.status}</span>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-brd-border mb-6 -mx-1 px-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3.5 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors ${
              tab === t.key
                ? "border-brd-gold text-brd-gold-bright"
                : "border-transparent text-brd-text-dim hover:text-brd-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab claim={claim} onChanged={refresh} />}
      {tab === "measurements" && <MeasurementsTab claim={claim} onChanged={refresh} />}
      {tab === "accessories" && <AccessoriesTab claim={claim} onChanged={refresh} />}
      {tab === "estimate" && <EstimateTab claim={claim} onChanged={refresh} />}
      {tab === "code" && <CodeReportTab claim={claim} onChanged={refresh} />}
      {tab === "weather" && <WeatherTab claim={claim} onChanged={refresh} />}
      {tab === "supplement" && <SupplementTab claim={claim} onChanged={refresh} />}
      {tab === "documents" && <DocumentsTab claim={claim} onChanged={refresh} />}
    </div>
  );
}
