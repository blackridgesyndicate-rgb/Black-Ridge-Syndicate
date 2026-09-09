import { View, Text } from "@react-pdf/renderer";
import { DocShell, tableStyles } from "@/lib/pdf/DocShell";
import type { ClaimDetail, RevisionDetail } from "@/lib/types";
import { num, dateStr } from "@/lib/format";

export function MaterialOrderDoc({ claim, revision }: { claim: ClaimDetail; revision: RevisionDetail }) {
  const items = revision.lineItems.filter((i) => i.included).sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <DocShell
      docTitle="Material Order"
      docSubtitle={`Revision ${revision.revisionNumber}`}
      disclaimer="Internal material order for supplier purchasing. Quantities reflect the current approved estimate revision and include contractor waste factors where applicable."
      infoLeft={[
        { label: "Job Site", value: `${claim.property.addressLine1}, ${claim.property.city}, ${claim.property.state} ${claim.property.zip}` },
      ]}
      infoRight={[
        { label: "Order Date", value: dateStr(new Date()) },
        { label: "Job Reference", value: claim.claimNumber ?? claim.id.slice(0, 8) },
      ]}
    >
      <Text style={tableStyles.sectionHeading}>Materials &amp; Quantities</Text>
      <View style={tableStyles.table}>
        <View style={tableStyles.headRow}>
          <Text style={[tableStyles.headCell, { width: "50%" }]}>Item</Text>
          <Text style={[tableStyles.headCell, { width: "20%" }]}>Category</Text>
          <Text style={[tableStyles.headCell, { width: "15%" }]}>Quantity</Text>
          <Text style={[tableStyles.headCell, { width: "15%" }]}>Unit</Text>
        </View>
        {items.map((li, idx) => (
          <View key={li.id} style={[tableStyles.row, idx % 2 === 1 ? tableStyles.rowAlt : {}]} wrap={false}>
            <Text style={[tableStyles.cell, { width: "50%" }]}>{li.description}</Text>
            <Text style={[tableStyles.cell, { width: "20%" }]}>{li.category}</Text>
            <Text style={[tableStyles.cell, { width: "15%" }]}>{num(li.quantity)}</Text>
            <Text style={[tableStyles.cell, { width: "15%" }]}>{li.unit}</Text>
          </View>
        ))}
      </View>
    </DocShell>
  );
}
