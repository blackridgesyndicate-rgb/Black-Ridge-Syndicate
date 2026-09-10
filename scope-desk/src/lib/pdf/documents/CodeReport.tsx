import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { DocShell, tableStyles } from "@/lib/pdf/DocShell";
import type { ClaimDetail } from "@/lib/types";
import { dateStr } from "@/lib/format";
import { ConstructionDetail } from "@/lib/pdf/diagrams/ConstructionDetail";

const styles = StyleSheet.create({
  detailGrid: { flexDirection: "column", gap: 6, marginTop: 4 },
});

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  const warnStyle = !value ? { color: "#8a3b3b" } : {};
  return (
    <View style={tableStyles.row}>
      <Text style={[tableStyles.cell, { width: "34%" }, warnStyle]}>{label}</Text>
      <Text style={[tableStyles.cell, { width: "66%" }, warnStyle]}>{value || "Verification required"}</Text>
    </View>
  );
}

export function CodeReportDoc({ claim }: { claim: ClaimDetail }) {
  const cr = claim.codeReport;

  return (
    <DocShell
      docTitle="Code-Enforcement Report"
      docSubtitle={cr?.verified ? "Citations Verified" : "Citations Unverified — Confirm Before Submission"}
      disclaimer="Code citations must be confirmed against the official municipal, county, state, or ICC source before being relied upon in an insurance submission. Fields marked 'Verification required' have not been confirmed."
      infoLeft={[
        { label: "Property", value: `${claim.property.addressLine1}, ${claim.property.city}, ${claim.property.state} ${claim.property.zip}` },
        { label: "Authority Having Jurisdiction", value: cr?.authorityHavingJurisdiction ?? "" },
      ]}
      infoRight={[
        { label: "Verification Date", value: dateStr(cr?.verificationDate) },
        { label: "Source URL", value: cr?.sourceUrl ?? "" },
      ]}
    >
      {!cr ? (
        <Text style={tableStyles.cell}>No code-enforcement data has been entered for this job yet.</Text>
      ) : (
        <>
          <Text style={tableStyles.sectionHeading}>Jurisdiction &amp; Permitting</Text>
          <View style={tableStyles.table}>
            <Row label="Authority Having Jurisdiction" value={cr.authorityHavingJurisdiction} />
            <Row label="Building Department Contact" value={cr.departmentContact} />
            <Row label="Adopted IRC/IBC Edition" value={cr.adoptedCodeEdition} />
            <Row label="Local Amendments" value={cr.localAmendments} />
            <Row label="Permit Requirements" value={cr.permitRequirements} />
            <Row label="Permit Fees" value={cr.permitFees} />
          </View>

          <Text style={tableStyles.sectionHeading}>Roofing Code Requirements</Text>
          <View style={tableStyles.table}>
            <Row label="Ice-Barrier Requirement" value={cr.iceBarrierRequirement} />
            <Row label="Drip-Edge Requirement" value={cr.dripEdgeRequirement} />
            <Row label="Valley-Lining Requirement" value={cr.valleyLiningRequirement} />
            <Row label="Underlayment Requirement" value={cr.underlaymentRequirement} />
            <Row label="Ventilation Requirement" value={cr.ventilationRequirement} />
            <Row label="Chimney-Cricket Requirement" value={cr.chimneyCricketRequirement} />
            <Row label="Re-Roofing / Layer Limitations" value={cr.reRoofLayerLimitation} />
            <Row label="Decking Requirement" value={cr.deckingRequirement} />
          </View>

          <Text style={tableStyles.sectionHeading}>Construction Detail Reference</Text>
          <View style={styles.detailGrid}>
            <ConstructionDetail type="ice_barrier" />
            <ConstructionDetail type="drip_edge" />
            <ConstructionDetail type="valley" />
            <ConstructionDetail type="cricket" />
          </View>

          {cr.notes && (
            <>
              <Text style={tableStyles.sectionHeading}>Notes</Text>
              <Text style={tableStyles.cell}>{cr.notes}</Text>
            </>
          )}
        </>
      )}
    </DocShell>
  );
}
