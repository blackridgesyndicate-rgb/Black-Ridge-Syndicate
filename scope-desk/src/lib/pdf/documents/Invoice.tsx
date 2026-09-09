import { View, Text } from "@react-pdf/renderer";
import { DocShell, tableStyles } from "@/lib/pdf/DocShell";
import type { ClaimDetail, RevisionDetail } from "@/lib/types";
import { computeInsuranceSummary } from "@/lib/calc/estimate";
import { money, dateStr } from "@/lib/format";

export function InvoiceDoc({ claim, revision }: { claim: ClaimDetail; revision: RevisionDetail }) {
  const items = revision.lineItems.filter((i) => i.included).sort((a, b) => a.sortOrder - b.sortOrder);
  const summary = computeInsuranceSummary(revision.lineItems, revision.deductible, revision.priorPayments);
  const invoiceNumber = `INV-${claim.id.slice(0, 6).toUpperCase()}-R${revision.revisionNumber}`;

  return (
    <DocShell
      docTitle="Invoice"
      docSubtitle={invoiceNumber}
      disclaimer="Payable to Black Ridge Roofing. Please remit payment per the terms agreed in your signed contract. Contact our office with any billing questions."
      infoLeft={[
        { label: "Bill To", value: claim.property.customer.name },
        { label: "Property", value: `${claim.property.addressLine1}, ${claim.property.city}, ${claim.property.state} ${claim.property.zip}` },
      ]}
      infoRight={[
        { label: "Invoice Date", value: dateStr(new Date()) },
        { label: "Invoice Number", value: invoiceNumber },
      ]}
    >
      <Text style={tableStyles.sectionHeading}>Work Performed</Text>
      <View style={tableStyles.table}>
        <View style={tableStyles.headRow}>
          <Text style={[tableStyles.headCell, { width: "50%" }]}>Description</Text>
          <Text style={[tableStyles.headCell, { width: "15%" }]}>Qty</Text>
          <Text style={[tableStyles.headCell, { width: "17%" }]}>Unit Price</Text>
          <Text style={[tableStyles.headCell, { width: "18%" }]}>Total</Text>
        </View>
        {items.map((li, idx) => (
          <View key={li.id} style={[tableStyles.row, idx % 2 === 1 ? tableStyles.rowAlt : {}]} wrap={false}>
            <Text style={[tableStyles.cell, { width: "50%" }]}>{li.description}</Text>
            <Text style={[tableStyles.cell, { width: "15%" }]}>{li.quantity} {li.unit}</Text>
            <Text style={[tableStyles.cell, { width: "17%" }]}>{money(li.unitPrice)}</Text>
            <Text style={[tableStyles.cell, { width: "18%" }]}>{money(li.rcv)}</Text>
          </View>
        ))}
      </View>

      <View style={tableStyles.summaryBox}>
        <View style={tableStyles.summaryRow}>
          <Text style={tableStyles.summaryLabel}>Total (RCV)</Text>
          <Text style={tableStyles.summaryValue}>{money(summary.rcv)}</Text>
        </View>
        <View style={tableStyles.summaryRow}>
          <Text style={tableStyles.summaryLabel}>Prior Payments Received</Text>
          <Text style={tableStyles.summaryValue}>{money(summary.priorPayments)}</Text>
        </View>
        <View style={tableStyles.summaryRow}>
          <Text style={tableStyles.summaryLabel}>Balance Due</Text>
          <Text style={tableStyles.summaryValueBold}>{money(summary.rcv - summary.priorPayments)}</Text>
        </View>
      </View>
    </DocShell>
  );
}
