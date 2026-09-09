import { View, Text } from "@react-pdf/renderer";
import { DocShell, tableStyles } from "@/lib/pdf/DocShell";
import type { ClaimDetail, SupplementDetail } from "@/lib/types";
import { money, dateStr } from "@/lib/format";

export function SupplementRequestDoc({ claim, supplement }: { claim: ClaimDetail; supplement: SupplementDetail }) {
  const carrierTotals = new Map(supplement.carrierItems.map((c) => [c.id, c.quantity * c.unitPrice]));
  const rows = supplement.matches
    .map((m) => {
      const contractorTotal = m.contractorQuantity * m.contractorUnitPrice;
      const carrierTotal = m.carrierItemId ? carrierTotals.get(m.carrierItemId) ?? 0 : 0;
      return { m, contractorTotal, carrierTotal, diff: contractorTotal - carrierTotal };
    })
    .filter((r) => r.diff > 0);
  const total = rows.reduce((s, r) => s + r.diff, 0);

  return (
    <DocShell
      docTitle="Supplement Request"
      docSubtitle={supplement.label}
      disclaimer="This supplement request itemizes work supported by the contractor's estimate, applicable code requirements, and/or photo documentation that was omitted or underpaid in the carrier's original estimate."
      infoLeft={[
        { label: "Property", value: `${claim.property.addressLine1}, ${claim.property.city}, ${claim.property.state} ${claim.property.zip}` },
        { label: "Insurance Carrier", value: claim.insuranceCarrier ?? "" },
      ]}
      infoRight={[
        { label: "Claim Number", value: claim.claimNumber ?? "" },
        { label: "Date Prepared", value: dateStr(new Date()) },
      ]}
    >
      <Text style={tableStyles.sectionHeading}>Requested Supplement Items</Text>
      {rows.length === 0 ? (
        <Text style={tableStyles.cell}>No missing or underpaid items have been identified yet.</Text>
      ) : (
        <View style={tableStyles.table}>
          <View style={tableStyles.headRow}>
            <Text style={[tableStyles.headCell, { width: "34%" }]}>Item</Text>
            <Text style={[tableStyles.headCell, { width: "16%" }]}>Contractor Qty</Text>
            <Text style={[tableStyles.headCell, { width: "16%" }]}>Amount Requested</Text>
            <Text style={[tableStyles.headCell, { width: "34%" }]}>Reason / Support</Text>
          </View>
          {rows.map((r, idx) => (
            <View key={r.m.id} style={[tableStyles.row, idx % 2 === 1 ? tableStyles.rowAlt : {}]} wrap={false}>
              <Text style={[tableStyles.cell, { width: "34%" }]}>{r.m.contractorDescription}</Text>
              <Text style={[tableStyles.cell, { width: "16%" }]}>{r.m.contractorQuantity} {r.m.contractorUnit}</Text>
              <Text style={[tableStyles.cell, { width: "16%" }]}>{money(r.diff)}</Text>
              <View style={{ width: "34%" }}>
                <Text style={tableStyles.cell}>{r.m.reasonForSupplement || "—"}</Text>
                {r.m.supportingCodeOrPhoto && <Text style={tableStyles.cellDim}>{r.m.supportingCodeOrPhoto}</Text>}
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={tableStyles.summaryBox}>
        <View style={tableStyles.summaryRow}>
          <Text style={tableStyles.summaryLabel}>Total Supplement Requested</Text>
          <Text style={tableStyles.summaryValueBold}>{money(total)}</Text>
        </View>
      </View>
    </DocShell>
  );
}
