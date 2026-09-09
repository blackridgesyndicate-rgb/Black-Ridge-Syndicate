import { View, Text } from "@react-pdf/renderer";
import { DocShell, tableStyles } from "@/lib/pdf/DocShell";
import type { ClaimDetail, RevisionDetail } from "@/lib/types";
import { money, dateStr } from "@/lib/format";

export function HomeownerProposalDoc({ claim, revision }: { claim: ClaimDetail; revision: RevisionDetail }) {
  const items = revision.lineItems.filter((i) => i.included).sort((a, b) => a.sortOrder - b.sortOrder);
  const byCategory = new Map<string, typeof items>();
  for (const item of items) {
    const list = byCategory.get(item.category) ?? [];
    list.push(item);
    byCategory.set(item.category, list);
  }
  const totalInvestment = items.reduce((s, i) => s + i.rcv, 0);

  return (
    <DocShell
      docTitle="Homeowner Proposal"
      docSubtitle={`Prepared ${dateStr(new Date())}`}
      disclaimer="This proposal reflects the scope of work discussed with the homeowner. Final pricing may be adjusted upon insurance carrier approval. Black Ridge Roofing — Elevated Roofing & Exterior Systems."
      infoLeft={[
        { label: "Prepared For", value: claim.property.customer.name },
        { label: "Property", value: `${claim.property.addressLine1}, ${claim.property.city}, ${claim.property.state} ${claim.property.zip}` },
      ]}
      infoRight={[
        { label: "Phone", value: claim.property.customer.phone ?? "" },
        { label: "Email", value: claim.property.customer.email ?? "" },
      ]}
    >
      <Text style={tableStyles.cell}>
        Thank you for the opportunity to present this proposal. Black Ridge Roofing will complete the following
        scope of work at your property using quality materials and licensed, insured crews.
      </Text>

      {[...byCategory.entries()].map(([category, catItems]) => (
        <View key={category}>
          <Text style={tableStyles.sectionHeading}>{category}</Text>
          <View style={tableStyles.table}>
            {catItems.map((li, idx) => (
              <View key={li.id} style={[tableStyles.row, idx % 2 === 1 ? tableStyles.rowAlt : {}]}>
                <Text style={[tableStyles.cell, { width: "70%" }]}>{li.description}</Text>
                <Text style={[tableStyles.cell, { width: "30%" }]}>
                  {li.quantity} {li.unit}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ))}

      <View style={tableStyles.summaryBox}>
        <View style={tableStyles.summaryRow}>
          <Text style={tableStyles.summaryLabel}>Total Project Investment</Text>
          <Text style={tableStyles.summaryValueBold}>{money(totalInvestment)}</Text>
        </View>
      </View>
    </DocShell>
  );
}
