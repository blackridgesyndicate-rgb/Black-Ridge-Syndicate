import { View, Text, StyleSheet } from "@react-pdf/renderer";
import type { PriceListItem } from "@prisma/client";
import { pdfTheme } from "@/lib/pdf/theme";
import { REASON_SELECTED_LABELS } from "@/lib/productReasons";
import type { LineItemDetail, FindingDetail } from "@/lib/types";

/**
 * Existing-to-proposed system comparison, and the "why these materials
 * were selected" rationale section. Both are driven entirely from the
 * revision's actual line items (joined to their PriceListItem metadata at
 * estimate-build time and carried on the line item itself where relevant)
 * and the claim's actual InspectionFinding records — never a canned
 * per-component narrative. An existing component is only described as
 * damaged when a matching field finding says so; otherwise it's marked
 * "not separately documented" rather than assumed.
 */

// Maps a canonical system component to the price-list codes that represent
// its removal and its replacement, so the table can be built from whatever
// is actually on this revision rather than a fixed 16-row template.
const COMPONENT_MAP: { label: string; removalCodes: string[]; proposedCodes: string[]; findingKeywords: string[] }[] = [
  { label: "Roof Covering (Shingles)", removalCodes: ["tear_off_laminated"], proposedCodes: ["laminated_shingles"], findingKeywords: ["shingle", "slope", "granule", "hail", "wind"] },
  { label: "Underlayment", removalCodes: [], proposedCodes: ["roofing_underlayment"], findingKeywords: ["underlayment", "felt"] },
  { label: "Ice & Water Membrane", removalCodes: [], proposedCodes: ["ice_water_barrier"], findingKeywords: ["ice", "water", "eave"] },
  { label: "Starter Shingles", removalCodes: [], proposedCodes: ["starter_course"], findingKeywords: ["starter"] },
  { label: "Drip Edge / Gutter Apron", removalCodes: [], proposedCodes: ["gutter_apron", "rake_drip_edge"], findingKeywords: ["drip edge", "gutter apron", "rake"] },
  { label: "Ridge Cap", removalCodes: [], proposedCodes: ["hip_ridge_cap"], findingKeywords: ["ridge cap", "hip"] },
  { label: "Ventilation", removalCodes: [], proposedCodes: ["ridge_vent", "roof_vents"], findingKeywords: ["vent", "ventilation"] },
  { label: "Pipe Flashing", removalCodes: [], proposedCodes: ["pipe_jack_flashing"], findingKeywords: ["pipe", "jack"] },
  { label: "Step / Wall Flashing", removalCodes: [], proposedCodes: ["step_flashing"], findingKeywords: ["step flashing", "wall flashing"] },
  { label: "Chimney Flashing", removalCodes: [], proposedCodes: ["chimney_flashing"], findingKeywords: ["chimney"] },
  { label: "Decking", removalCodes: [], proposedCodes: ["decking_replacement"], findingKeywords: ["deck", "sheathing", "rot", "soft"] },
];

function findMatchingFinding(findings: FindingDetail[], keywords: string[]): FindingDetail | null {
  const lower = (s: string) => s.toLowerCase();
  return (
    findings.find((f) => keywords.some((k) => lower(f.description).includes(k) || lower(f.category).includes(k))) ??
    null
  );
}

function findLineItem(items: LineItemDetail[], codes: string[]): LineItemDetail | null {
  return items.find((li) => li.priceListItemCode && codes.includes(li.priceListItemCode)) ?? null;
}

const compStyles = StyleSheet.create({
  table: { marginTop: 8, borderWidth: 1, borderColor: pdfTheme.border },
  headRow: { flexDirection: "row", backgroundColor: pdfTheme.black, paddingVertical: 5, paddingHorizontal: 4, gap: 6 },
  headCell: { color: pdfTheme.goldBright, fontSize: 6.2, textTransform: "uppercase", letterSpacing: 0.2, fontFamily: "Helvetica-Bold" },
  row: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 4, borderTopWidth: 1, borderTopColor: pdfTheme.border, gap: 6 },
  rowAlt: { backgroundColor: pdfTheme.bgTint },
  cell: { fontSize: 7, color: pdfTheme.text },
  cellDim: { fontSize: 6.3, color: pdfTheme.textDim },
  badge: { fontSize: 5.8, color: "#ffffff", paddingHorizontal: 4, paddingVertical: 1.5, borderRadius: 2, alignSelf: "flex-start" },
});

export function ExistingToProposedTable({ items, findings }: { items: LineItemDetail[]; findings: FindingDetail[] }) {
  const rows = COMPONENT_MAP.map((c) => {
    const proposed = findLineItem(items, c.proposedCodes);
    if (!proposed) return null;
    const removal = c.removalCodes.length ? findLineItem(items, c.removalCodes) : null;
    const finding = findMatchingFinding(findings, c.findingKeywords);
    return { component: c.label, removal, proposed, finding };
  }).filter((r): r is NonNullable<typeof r> => r !== null);

  if (rows.length === 0) return null;

  return (
    <View style={compStyles.table}>
      <View style={compStyles.headRow}>
        <Text style={[compStyles.headCell, { width: "14%" }]}>Component</Text>
        <Text style={[compStyles.headCell, { width: "17%" }]}>Observed Condition</Text>
        <Text style={[compStyles.headCell, { width: "22%" }]}>Proposed Replacement</Text>
        <Text style={[compStyles.headCell, { width: "19%" }]}>Code / Mfr. Requirement</Text>
        <Text style={[compStyles.headCell, { width: "22%" }]}>Field Verification</Text>
      </View>
      {rows.map((r, idx) => (
        <View key={r.component} style={[compStyles.row, idx % 2 === 1 ? compStyles.rowAlt : {}]} wrap={false}>
          <Text style={[compStyles.cell, { width: "14%" }]}>{r.component}</Text>
          <View style={{ width: "17%" }}>
            {r.finding ? (
              <>
                <Text style={compStyles.cell}>{r.finding.damageType.replace(/_/g, " ")}</Text>
                <Text style={compStyles.cellDim}>{r.finding.description}</Text>
              </>
            ) : (
              <Text style={compStyles.cellDim}>Not separately documented</Text>
            )}
          </View>
          <View style={{ width: "22%" }}>
            <Text style={compStyles.cell}>{r.proposed.description}</Text>
            {r.proposed.notes && <Text style={compStyles.cellDim}>{r.proposed.notes}</Text>}
          </View>
          <Text style={[compStyles.cell, { width: "19%" }]}>{r.proposed.codeCitation || "—"}</Text>
          <View style={{ width: "22%" }}>
            <View
              style={[
                compStyles.badge,
                { backgroundColor: r.finding ? "#3f7d4f" : "#8a8a92" },
              ]}
            >
              <Text>{r.finding ? "FIELD VERIFIED" : "VERIFICATION REQUIRED"}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const whyStyles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: pdfTheme.border, padding: 9, marginTop: 8 },
  productLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 3 },
  productName: { fontSize: 9, fontFamily: "Helvetica-Bold", color: pdfTheme.text, maxWidth: "70%" },
  reasonBadge: { fontSize: 6, color: "#ffffff", backgroundColor: pdfTheme.gold, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 2 },
  bodyText: { fontSize: 7.5, color: pdfTheme.text, lineHeight: 1.45, marginTop: 2 },
  metaText: { fontSize: 6.5, color: pdfTheme.textDim, marginTop: 4 },
});

export function WhyMaterialsSection({
  items,
  priceListByCode,
}: {
  items: LineItemDetail[];
  priceListByCode: Map<string, PriceListItem>;
}) {
  const cards = items
    .filter((li) => li.included && li.priceListItemCode)
    .map((li) => ({ li, p: priceListByCode.get(li.priceListItemCode as string) }))
    .filter((x): x is { li: LineItemDetail; p: PriceListItem } => !!x.p && !!x.p.technicalFunction);

  if (cards.length === 0) return null;

  return (
    <View>
      {cards.map(({ li, p }) => (
        <View key={li.id} style={whyStyles.card} wrap={false}>
          <View style={whyStyles.productLine}>
            <Text style={whyStyles.productName}>
              {p.manufacturer ? `${p.manufacturer} ` : ""}
              {p.productName || li.description}
            </Text>
            {p.reasonSelected && (
              <View style={whyStyles.reasonBadge}>
                <Text>{(REASON_SELECTED_LABELS[p.reasonSelected] ?? p.reasonSelected).toUpperCase()}</Text>
              </View>
            )}
          </View>
          <Text style={whyStyles.bodyText}>{p.technicalFunction}</Text>
          {p.climateSuitability && <Text style={whyStyles.bodyText}>{p.climateSuitability}</Text>}
          {p.warrantyRelevance && <Text style={whyStyles.bodyText}>{p.warrantyRelevance}</Text>}
          <Text style={whyStyles.metaText}>
            {p.standardOrUpgrade === "upgrade" ? "Optional upgrade" : "Standard scope"}
            {p.infoVerifiedDate ? ` · Product data verified` : " · Verify current spec sheet before submission"}
            {p.dataSheetUrl ? ` · ${p.dataSheetUrl}` : ""}
          </Text>
        </View>
      ))}
    </View>
  );
}
