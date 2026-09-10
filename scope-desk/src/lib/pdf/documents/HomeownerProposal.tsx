import { View, Text, StyleSheet } from "@react-pdf/renderer";
import type { PriceListItem } from "@prisma/client";
import { DocShellV2 } from "@/lib/pdf/DocShellV2";
import { tableStyles } from "@/lib/pdf/DocShell";
import type { ClaimDetail, RevisionDetail } from "@/lib/types";
import { money } from "@/lib/format";
import { pdfTheme } from "@/lib/pdf/theme";
import { PhotoGallery } from "@/lib/pdf/diagrams/PhotoGallery";
import type { PhotoAsset } from "@/lib/pdf/photoAssets";
import { computeRetailSummary } from "@/lib/calc/estimate";
import { ExistingToProposedTable, WhyMaterialsSection } from "@/lib/pdf/documents/SystemComparison";
import { PitchExplanationSection } from "@/lib/pdf/documents/PitchExplanation";

const DISCLAIMER =
  "This proposal reflects the scope of work discussed with you and is not an insurance claim document. Final pricing is confirmed upon signed acceptance. No coverage, claim, or carrier-related language applies to this retail project.";

const SECTIONS = [
  "Property Overview",
  "Roof Geometry & Pitch",
  "Existing Conditions",
  "Recommended Roofing System",
  "Why These Materials Were Selected",
  "Detailed Proposal & Optional Upgrades",
  "Financial Summary",
  "Documented Conditions",
];

const styles = StyleSheet.create({
  upgradeBadge: { fontSize: 5.8, color: "#ffffff", backgroundColor: pdfTheme.gold, paddingHorizontal: 4, paddingVertical: 1.5, borderRadius: 2, alignSelf: "flex-start", marginTop: 2 },
});

export function HomeownerProposalDoc({
  claim,
  revision,
  photoAssets,
  priceListByCode,
  coverPhoto,
}: {
  claim: ClaimDetail;
  revision: RevisionDetail;
  photoAssets: PhotoAsset[];
  priceListByCode: Map<string, PriceListItem>;
  coverPhoto: Buffer | null;
}) {
  const items = revision.lineItems.filter((i) => i.included).sort((a, b) => a.sortOrder - b.sortOrder);
  const byCategory = new Map<string, typeof items>();
  for (const item of items) {
    const list = byCategory.get(item.category) ?? [];
    list.push(item);
    byCategory.set(item.category, list);
  }
  const summary = computeRetailSummary(items, { overheadProfitPercent: revision.overheadProfitPercent });
  const tierLabel = revision.retailTierKey ? revision.retailTierKey.replace(/^\w/, (c) => c.toUpperCase()) : null;

  return (
    <DocShellV2
      claim={claim}
      docTitle="Premium Roof Replacement Proposal"
      docSubtitle={tierLabel ? `${tierLabel} Package` : undefined}
      revisionLabel={`Revision ${revision.revisionNumber}`}
      sections={SECTIONS}
      disclaimer={DISCLAIMER}
      preparedBy={claim.estimator}
      coverPhoto={coverPhoto}
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
        Thank you for the opportunity to present this proposal. We will complete the following scope of work at your
        property using quality materials and licensed, insured crews.
      </Text>

      <Text style={tableStyles.sectionHeading}>Roof Geometry &amp; Pitch</Text>
      <PitchExplanationSection measurement={claim.measurement} steepSlopePitchThreshold={revision.steepSlopePitchThreshold} />

      <Text style={tableStyles.sectionHeading}>Existing-to-Proposed System Comparison</Text>
      <ExistingToProposedTable items={items} findings={claim.findings} />

      <Text style={tableStyles.sectionHeading}>Why These Materials Were Selected</Text>
      <WhyMaterialsSection items={items} priceListByCode={priceListByCode} />

      <Text style={tableStyles.sectionHeading}>Detailed Proposal</Text>
      {[...byCategory.entries()].map(([category, catItems]) => (
        <View key={category}>
          <Text style={[tableStyles.cellDim, { marginTop: 6, marginBottom: 2, fontFamily: "Helvetica-Bold" }]}>{category}</Text>
          <View style={tableStyles.table}>
            {catItems.map((li, idx) => (
              <View key={li.id} style={[tableStyles.row, idx % 2 === 1 ? tableStyles.rowAlt : {}]}>
                <View style={{ width: "60%" }}>
                  <Text style={tableStyles.cell}>{li.description}</Text>
                  {li.isUpgrade && <Text style={styles.upgradeBadge}>OPTIONAL UPGRADE</Text>}
                </View>
                <Text style={[tableStyles.cell, { width: "20%" }]}>
                  {li.quantity} {li.unit}
                </Text>
                <Text style={[tableStyles.cell, { width: "20%" }]}>{money(li.rcv)}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}

      {photoAssets.length > 0 && (
        <>
          <Text style={tableStyles.sectionHeading}>Documented Conditions</Text>
          <PhotoGallery assets={photoAssets} />
        </>
      )}

      <Text style={tableStyles.sectionHeading}>Financial Summary</Text>
      <View style={tableStyles.summaryBox}>
        <View style={tableStyles.summaryRow}>
          <Text style={tableStyles.summaryLabel}>Base Contract</Text>
          <Text style={tableStyles.summaryValue}>{money(summary.baseContract)}</Text>
        </View>
        {summary.upgradesTotal > 0 && (
          <View style={tableStyles.summaryRow}>
            <Text style={tableStyles.summaryLabel}>Selected Upgrades</Text>
            <Text style={tableStyles.summaryValue}>{money(summary.upgradesTotal)}</Text>
          </View>
        )}
        <View style={tableStyles.summaryRow}>
          <Text style={tableStyles.summaryLabel}>Material Sales Tax</Text>
          <Text style={tableStyles.summaryValue}>{money(summary.materialSalesTax)}</Text>
        </View>
        {summary.permitAllowance > 0 && (
          <View style={tableStyles.summaryRow}>
            <Text style={tableStyles.summaryLabel}>Permit Allowance</Text>
            <Text style={tableStyles.summaryValue}>{money(summary.permitAllowance)}</Text>
          </View>
        )}
        {summary.discount > 0 && (
          <View style={tableStyles.summaryRow}>
            <Text style={tableStyles.summaryLabel}>Discount</Text>
            <Text style={tableStyles.summaryValue}>-{money(summary.discount)}</Text>
          </View>
        )}
        <View style={tableStyles.summaryRow}>
          <Text style={tableStyles.summaryLabel}>Total Contract Price</Text>
          <Text style={tableStyles.summaryValueBold}>{money(summary.totalContractPrice)}</Text>
        </View>
      </View>
    </DocShellV2>
  );
}
