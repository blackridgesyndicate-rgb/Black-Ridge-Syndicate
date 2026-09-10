import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import { pdfTheme } from "@/lib/pdf/theme";
import { resolveBranding, type ResolvedBranding } from "@/lib/pdf/branding";
import { reportNumber, dateStr } from "@/lib/format";
import type { ClaimDetail } from "@/lib/types";

/**
 * Luxury report shell: a premium cover page, a bookmarked contents page
 * (real PDF outline navigation rather than a page-number table react-pdf's
 * single-pass renderer can't reliably compute in advance), then the
 * document body on a consistently black/charcoal/gold-branded page with a
 * repeating header and footer. Used by every generated document so every
 * report — insurance or retail — looks like it came from the same elite
 * national roofing company, not a spreadsheet export.
 */

const cover = StyleSheet.create({
  page: { backgroundColor: pdfTheme.black, color: "#ece9e2", fontFamily: "Helvetica" },
  goldRule: { height: 2, backgroundColor: pdfTheme.goldBright, marginVertical: 18 },
  brandRow: { paddingHorizontal: 44, paddingTop: 40 },
  brandName: { fontSize: 15, fontFamily: "Helvetica-Bold", letterSpacing: 1, color: "#ece9e2" },
  brandNameAccent: { color: pdfTheme.goldBright },
  tagline: { fontSize: 7.5, letterSpacing: 2, textTransform: "uppercase", color: pdfTheme.goldBright, marginTop: 4 },
  photoFrame: {
    marginHorizontal: 44,
    marginTop: 26,
    height: 230,
    borderWidth: 1,
    borderColor: "#3a3a42",
    backgroundColor: "#151519",
    alignItems: "center",
    justifyContent: "center",
  },
  photo: { width: "100%", height: "100%", objectFit: "cover" },
  photoPlaceholder: { fontSize: 8, color: "#5f5f68", letterSpacing: 1, textTransform: "uppercase" },
  titleBlock: { paddingHorizontal: 44, marginTop: 34 },
  eyebrow: { fontSize: 8, letterSpacing: 3, textTransform: "uppercase", color: pdfTheme.goldBright, marginBottom: 10 },
  titleLine: { fontSize: 21, fontFamily: "Helvetica-Bold", lineHeight: 1.25, color: "#ece9e2" },
  metaGrid: { flexDirection: "row", marginTop: 30, paddingHorizontal: 44, gap: 40 },
  metaCol: { flexDirection: "column", gap: 10 },
  metaLabel: { fontSize: 6.5, letterSpacing: 1.5, textTransform: "uppercase", color: "#8a8a92" },
  metaValue: { fontSize: 9.5, color: "#ece9e2", marginTop: 2 },
  footerBlock: {
    position: "absolute",
    bottom: 36,
    left: 44,
    right: 44,
    borderTopWidth: 1,
    borderTopColor: "#333339",
    paddingTop: 12,
  },
  confidential: { fontSize: 7, color: "#8a8a92", lineHeight: 1.5 },
});

const contentsStyles = StyleSheet.create({
  page: { backgroundColor: "#ffffff", fontFamily: "Helvetica", paddingHorizontal: 44, paddingVertical: 50 },
  eyebrow: { fontSize: 8, letterSpacing: 3, textTransform: "uppercase", color: pdfTheme.gold, marginBottom: 10 },
  heading: { fontSize: 18, fontFamily: "Helvetica-Bold", color: pdfTheme.text, marginBottom: 24 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: pdfTheme.border,
  },
  num: { width: 26, fontSize: 9.5, color: pdfTheme.gold, fontFamily: "Helvetica-Bold" },
  label: { fontSize: 10, color: pdfTheme.text, flexGrow: 1 },
  note: { fontSize: 7, color: pdfTheme.textDim, marginTop: 28, lineHeight: 1.5 },
});

const bodyStyles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: pdfTheme.text,
    paddingTop: 0,
    paddingBottom: 46,
    paddingHorizontal: 0,
  },
  header: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  brandName: { color: "#ece9e2", fontSize: 13, fontFamily: "Helvetica-Bold", letterSpacing: 0.5 },
  brandGold: { color: pdfTheme.goldBright },
  tagline: { color: pdfTheme.goldBright, fontSize: 6.5, letterSpacing: 1.2, marginTop: 3, textTransform: "uppercase" },
  docTitleBlock: { alignItems: "flex-end" },
  docTitle: { color: "#ece9e2", fontSize: 10, fontFamily: "Helvetica-Bold", textAlign: "right" },
  docSubtitle: { color: "#b8b3a8", fontSize: 7, marginTop: 2, textAlign: "right" },
  infoBar: {
    backgroundColor: pdfTheme.bgTint,
    paddingHorizontal: 32,
    paddingVertical: 11,
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: pdfTheme.border,
  },
  infoCol: { flexDirection: "column", gap: 1, maxWidth: "48%" },
  infoLabel: { fontSize: 6.3, color: pdfTheme.textDim, textTransform: "uppercase", letterSpacing: 0.7 },
  infoValue: { fontSize: 8.5, color: pdfTheme.text, marginBottom: 3 },
  body: { paddingHorizontal: 32, paddingTop: 14 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 32,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: pdfTheme.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: { fontSize: 6.3, color: pdfTheme.textDim, maxWidth: "70%" },
  footerRight: { alignItems: "flex-end" },
  pageNum: { fontSize: 6.5, color: pdfTheme.textDim },
  reportNum: { fontSize: 6, color: pdfTheme.textDim, marginTop: 1 },
});

interface DocShellV2Props {
  claim: ClaimDetail;
  docTitle: string;
  docSubtitle?: string;
  revisionLabel?: string;
  sections: string[];
  infoLeft: { label: string; value: string }[];
  infoRight: { label: string; value: string }[];
  disclaimer: string;
  preparedBy?: string | null;
  coverPhoto?: Buffer | null;
  children: ReactNode;
}

function Brand({ branding }: { branding: ResolvedBranding }) {
  return (
    <Text style={bodyStyles.brandName}>
      {branding.companyName}
      <Text style={bodyStyles.brandGold}>{branding.companyNameAccent}</Text>
    </Text>
  );
}

function CoverPage({
  claim,
  branding,
  docTitle,
  revisionLabel,
  coverPhoto,
  preparedBy,
}: {
  claim: ClaimDetail;
  branding: ResolvedBranding;
  docTitle: string;
  revisionLabel?: string;
  coverPhoto?: Buffer | null;
  preparedBy?: string | null;
}) {
  const address = `${claim.property.addressLine1}${claim.property.addressLine2 ? `, ${claim.property.addressLine2}` : ""}, ${claim.property.city}, ${claim.property.state} ${claim.property.zip}`;
  return (
    <Page size="LETTER" style={cover.page}>
      <View style={cover.brandRow}>
        <Text style={cover.brandName}>
          {branding.companyName}
          <Text style={cover.brandNameAccent}>{branding.companyNameAccent}</Text>
        </Text>
        {branding.tagline && <Text style={cover.tagline}>{branding.tagline}</Text>}
        <View style={cover.goldRule} />
      </View>

      <View style={cover.photoFrame}>
        {coverPhoto ? (
          <Image src={coverPhoto} style={cover.photo} />
        ) : (
          <Text style={cover.photoPlaceholder}>Property Photograph Not Yet Available</Text>
        )}
      </View>

      <View style={cover.titleBlock}>
        <Text style={cover.eyebrow}>{claim.reportType === "retail" ? "Retail Roof Bid" : "Insurance Claim Estimate"}</Text>
        <Text style={cover.titleLine}>{docTitle}</Text>
      </View>

      <View style={cover.metaGrid}>
        <View style={cover.metaCol}>
          <View>
            <Text style={cover.metaLabel}>Property Address</Text>
            <Text style={cover.metaValue}>{address}</Text>
          </View>
          <View>
            <Text style={cover.metaLabel}>Customer</Text>
            <Text style={cover.metaValue}>{claim.property.customer.name}</Text>
          </View>
        </View>
        <View style={cover.metaCol}>
          <View>
            <Text style={cover.metaLabel}>Date Prepared</Text>
            <Text style={cover.metaValue}>{dateStr(new Date())}</Text>
          </View>
          <View>
            <Text style={cover.metaLabel}>Report No. / Revision</Text>
            <Text style={cover.metaValue}>
              {reportNumber(claim.id, claim.createdAt)}
              {revisionLabel ? ` — ${revisionLabel}` : ""}
            </Text>
          </View>
        </View>
        <View style={cover.metaCol}>
          <View>
            <Text style={cover.metaLabel}>Prepared By</Text>
            <Text style={cover.metaValue}>{preparedBy || branding.salesRepName || branding.companyName + branding.companyNameAccent}</Text>
          </View>
        </View>
      </View>

      <View style={cover.footerBlock}>
        <Text style={cover.confidential}>
          CONFIDENTIAL — Prepared exclusively for the addressee above. This document contains proprietary pricing and
          scope information and is not intended for distribution beyond the customer, their insurance carrier (where
          applicable), and parties they authorize.
          {branding.license ? `  ${branding.license}` : ""}
        </Text>
      </View>
    </Page>
  );
}

function ContentsPage({ sections }: { sections: string[] }) {
  return (
    <Page size="LETTER" style={contentsStyles.page} bookmark="Report Contents">
      <Text style={contentsStyles.eyebrow}>Report Navigation</Text>
      <Text style={contentsStyles.heading}>Contents</Text>
      {sections.map((s, i) => (
        <View key={s} style={contentsStyles.row}>
          <Text style={contentsStyles.num}>{String(i + 1).padStart(2, "0")}</Text>
          <Text style={contentsStyles.label}>{s}</Text>
        </View>
      ))}
      <Text style={contentsStyles.note}>
        Use your PDF viewer&apos;s bookmarks/outline panel to jump directly to any section — each section below is
        bookmarked for navigation.
      </Text>
    </Page>
  );
}

export function DocShellV2({
  claim,
  docTitle,
  docSubtitle,
  revisionLabel,
  sections,
  infoLeft,
  infoRight,
  disclaimer,
  preparedBy,
  coverPhoto,
  children,
}: DocShellV2Props) {
  const branding = resolveBranding(claim);
  return (
    <Document title={`${branding.companyName}${branding.companyNameAccent} — ${docTitle}`} author={`${branding.companyName}${branding.companyNameAccent}`}>
      <CoverPage
        claim={claim}
        branding={branding}
        docTitle={docTitle}
        revisionLabel={revisionLabel}
        coverPhoto={coverPhoto}
        preparedBy={preparedBy}
      />
      <ContentsPage sections={sections} />
      <Page size="LETTER" style={bodyStyles.page} wrap bookmark={docTitle}>
        <View style={[bodyStyles.header, { backgroundColor: branding.primaryColor }]} fixed>
          <View>
            <Brand branding={branding} />
            {branding.tagline && <Text style={bodyStyles.tagline}>{branding.tagline}</Text>}
          </View>
          <View style={bodyStyles.docTitleBlock}>
            <Text style={bodyStyles.docTitle}>{docTitle}</Text>
            {docSubtitle && <Text style={bodyStyles.docSubtitle}>{docSubtitle}</Text>}
          </View>
        </View>

        <View style={bodyStyles.infoBar}>
          <View style={bodyStyles.infoCol}>
            {infoLeft.map((row, i) => (
              <View key={i}>
                <Text style={bodyStyles.infoLabel}>{row.label}</Text>
                <Text style={bodyStyles.infoValue}>{row.value || "—"}</Text>
              </View>
            ))}
          </View>
          <View style={bodyStyles.infoCol}>
            {infoRight.map((row, i) => (
              <View key={i}>
                <Text style={bodyStyles.infoLabel}>{row.label}</Text>
                <Text style={bodyStyles.infoValue}>{row.value || "—"}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={bodyStyles.body}>{children}</View>

        <View style={bodyStyles.footer} fixed>
          <Text style={bodyStyles.footerText}>{disclaimer}</Text>
          <View style={bodyStyles.footerRight}>
            <Text style={bodyStyles.reportNum}>{reportNumber(claim.id, claim.createdAt)}</Text>
            <Text style={bodyStyles.pageNum} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
          </View>
        </View>
      </Page>
    </Document>
  );
}

export { tableStyles } from "@/lib/pdf/DocShell";
