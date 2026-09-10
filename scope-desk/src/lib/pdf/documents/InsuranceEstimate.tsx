import { View, Text } from "@react-pdf/renderer";
import { DocShell, tableStyles, DISCLAIMER_ESTIMATE } from "@/lib/pdf/DocShell";
import type { ClaimDetail, RevisionDetail } from "@/lib/types";
import { computeInsuranceSummary } from "@/lib/calc/estimate";
import { money, num, dateStr } from "@/lib/format";
import { BarChart } from "@/lib/pdf/diagrams/BarChart";
import { pdfTheme } from "@/lib/pdf/theme";

export function InsuranceEstimateDoc({ claim, revision }: { claim: ClaimDetail; revision: RevisionDetail }) {
  const items = [...revision.lineItems].sort((a, b) => a.sortOrder - b.sortOrder);
  const included = items.filter((i) => i.included);
  const summary = computeInsuranceSummary(items, revision.deductible, revision.priorPayments);

  const categoryTotals = new Map<string, number>();
  for (const li of included) {
    categoryTotals.set(li.category, (categoryTotals.get(li.category) ?? 0) + li.rcv);
  }
  const categoryChartData = [...categoryTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([category, total]) => ({
      label: category,
      value: total,
      displayValue: `${money(total)} (${summary.rcv > 0 ? Math.round((total / summary.rcv) * 100) : 0}%)`,
    }));

  return (
    <DocShell
      docTitle="Contractor-Prepared Insurance Restoration Estimate"
      docSubtitle={`Revision ${revision.revisionNumber}${revision.label ? ` — ${revision.label}` : ""}`}
      disclaimer={DISCLAIMER_ESTIMATE}
      infoLeft={[
        { label: "Property", value: `${claim.property.addressLine1}, ${claim.property.city}, ${claim.property.state} ${claim.property.zip}` },
        { label: "Homeowner", value: claim.property.customer.name },
        { label: "Estimator", value: claim.estimator ?? "" },
      ]}
      infoRight={[
        { label: "Insurance Carrier", value: claim.insuranceCarrier ?? "" },
        { label: "Claim Number", value: claim.claimNumber ?? "" },
        { label: "Policy Number", value: claim.policyNumber ?? "" },
        { label: "Date of Loss", value: dateStr(claim.dateOfLoss) },
      ]}
    >
      <Text style={tableStyles.sectionHeading}>Line Items</Text>
      <View style={tableStyles.table}>
        <View style={tableStyles.headRow}>
          <Text style={[tableStyles.headCell, { width: "26%" }]}>Description</Text>
          <Text style={[tableStyles.headCell, { width: "8%" }]}>Qty</Text>
          <Text style={[tableStyles.headCell, { width: "8%" }]}>Unit</Text>
          <Text style={[tableStyles.headCell, { width: "12%" }]}>Unit Price</Text>
          <Text style={[tableStyles.headCell, { width: "10%" }]}>Tax</Text>
          <Text style={[tableStyles.headCell, { width: "12%" }]}>RCV</Text>
          <Text style={[tableStyles.headCell, { width: "12%" }]}>Depreciation</Text>
          <Text style={[tableStyles.headCell, { width: "12%" }]}>ACV</Text>
        </View>
        {included.map((li, idx) => (
          <View key={li.id} style={[tableStyles.row, idx % 2 === 1 ? tableStyles.rowAlt : {}]} wrap={false}>
            <View style={{ width: "26%" }}>
              <Text style={tableStyles.cell}>{li.description}</Text>
              <Text style={tableStyles.cellDim}>{li.category}</Text>
            </View>
            <Text style={[tableStyles.cell, { width: "8%" }]}>{num(li.quantity)}</Text>
            <Text style={[tableStyles.cell, { width: "8%" }]}>{li.unit}</Text>
            <Text style={[tableStyles.cell, { width: "12%" }]}>{money(li.unitPrice)}</Text>
            <Text style={[tableStyles.cell, { width: "10%" }]}>{money(li.taxAmount)}</Text>
            <Text style={[tableStyles.cell, { width: "12%" }]}>{money(li.rcv)}</Text>
            <Text style={[tableStyles.cell, { width: "12%" }]}>{money(li.depreciationAmount)}</Text>
            <Text style={[tableStyles.cell, { width: "12%" }]}>{money(li.acv)}</Text>
          </View>
        ))}
      </View>

      {categoryChartData.length > 1 && (
        <>
          <Text style={tableStyles.sectionHeading}>Cost Breakdown by Category</Text>
          <BarChart data={categoryChartData} barColor={pdfTheme.gold} />
        </>
      )}

      <View style={tableStyles.summaryBox}>
        <SummaryRow label="Line-Item Subtotal" value={money(summary.lineItemSubtotal)} />
        <SummaryRow label="Material Sales Tax" value={money(summary.materialSalesTax)} />
        <SummaryRow label="Replacement Cost Value (RCV)" value={money(summary.rcv)} bold />
        <SummaryRow label="Depreciation" value={money(summary.depreciation)} />
        <SummaryRow label="Actual Cash Value (ACV)" value={money(summary.acv)} bold />
        <SummaryRow label="Deductible" value={money(summary.deductible)} />
        <SummaryRow label="Prior Payments" value={money(summary.priorPayments)} />
        <SummaryRow label="Net Claim (Due Now)" value={money(summary.netClaim)} bold />
        <SummaryRow label="Recoverable Depreciation" value={money(summary.recoverableDepreciation)} />
        <SummaryRow label="Remaining Balance" value={money(summary.remainingBalance)} />
      </View>
    </DocShell>
  );
}

export function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={tableStyles.summaryRow}>
      <Text style={tableStyles.summaryLabel}>{label}</Text>
      <Text style={bold ? tableStyles.summaryValueBold : tableStyles.summaryValue}>{value}</Text>
    </View>
  );
}
