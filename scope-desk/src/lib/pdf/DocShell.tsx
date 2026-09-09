import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import { pdfTheme, COMPANY } from "@/lib/pdf/theme";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: pdfTheme.text,
    paddingTop: 0,
    paddingBottom: 46,
    paddingHorizontal: 0,
  },
  header: {
    backgroundColor: pdfTheme.black,
    paddingHorizontal: 32,
    paddingVertical: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  brandName: {
    color: "#ece9e2",
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
  },
  brandGold: {
    color: pdfTheme.goldBright,
  },
  tagline: {
    color: pdfTheme.goldBright,
    fontSize: 7,
    letterSpacing: 1.4,
    marginTop: 3,
    textTransform: "uppercase",
  },
  docTitleBlock: {
    alignItems: "flex-end",
  },
  docTitle: {
    color: "#ece9e2",
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },
  docSubtitle: {
    color: "#b8b3a8",
    fontSize: 7.5,
    marginTop: 2,
    textAlign: "right",
  },
  infoBar: {
    backgroundColor: pdfTheme.bgTint,
    paddingHorizontal: 32,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: pdfTheme.border,
  },
  infoCol: { flexDirection: "column", gap: 1, maxWidth: "48%" },
  infoLabel: { fontSize: 6.5, color: pdfTheme.textDim, textTransform: "uppercase", letterSpacing: 0.8 },
  infoValue: { fontSize: 9, color: pdfTheme.text, marginBottom: 3 },
  body: { paddingHorizontal: 32, paddingTop: 16 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: pdfTheme.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: { fontSize: 6.5, color: pdfTheme.textDim, maxWidth: "75%" },
  pageNum: { fontSize: 7, color: pdfTheme.textDim },
});

export function DocShell({
  docTitle,
  docSubtitle,
  infoLeft,
  infoRight,
  disclaimer,
  children,
}: {
  docTitle: string;
  docSubtitle?: string;
  infoLeft: { label: string; value: string }[];
  infoRight: { label: string; value: string }[];
  disclaimer: string;
  children: ReactNode;
}) {
  return (
    <Document title={`${COMPANY.name} — ${docTitle}`} author={COMPANY.name}>
      <Page size="LETTER" style={styles.page} wrap>
        <View style={styles.header} fixed>
          <View>
            <Text style={styles.brandName}>
              BLACK RIDGE <Text style={styles.brandGold}>ROOFING</Text>
            </Text>
            <Text style={styles.tagline}>{COMPANY.tagline}</Text>
          </View>
          <View style={styles.docTitleBlock}>
            <Text style={styles.docTitle}>{docTitle}</Text>
            {docSubtitle && <Text style={styles.docSubtitle}>{docSubtitle}</Text>}
          </View>
        </View>

        <View style={styles.infoBar}>
          <View style={styles.infoCol}>
            {infoLeft.map((row, i) => (
              <View key={i}>
                <Text style={styles.infoLabel}>{row.label}</Text>
                <Text style={styles.infoValue}>{row.value || "—"}</Text>
              </View>
            ))}
          </View>
          <View style={styles.infoCol}>
            {infoRight.map((row, i) => (
              <View key={i}>
                <Text style={styles.infoLabel}>{row.label}</Text>
                <Text style={styles.infoValue}>{row.value || "—"}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.body}>{children}</View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{disclaimer}</Text>
          <Text
            style={styles.pageNum}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

export const tableStyles = StyleSheet.create({
  table: { marginTop: 8, borderWidth: 1, borderColor: pdfTheme.border },
  headRow: {
    flexDirection: "row",
    backgroundColor: pdfTheme.black,
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  headCell: {
    color: pdfTheme.goldBright,
    fontSize: 6.8,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    fontFamily: "Helvetica-Bold",
  },
  row: {
    flexDirection: "row",
    paddingVertical: 4.5,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: pdfTheme.border,
  },
  rowAlt: { backgroundColor: pdfTheme.bgTint },
  cell: { fontSize: 8, color: pdfTheme.text },
  cellDim: { fontSize: 7, color: pdfTheme.textDim },
  sectionHeading: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: pdfTheme.text,
    marginTop: 14,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: pdfTheme.gold,
    paddingBottom: 3,
  },
  summaryBox: {
    marginTop: 14,
    alignSelf: "flex-end",
    width: 240,
    borderWidth: 1,
    borderColor: pdfTheme.border,
    padding: 10,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  summaryLabel: { fontSize: 8, color: pdfTheme.textDim },
  summaryValue: { fontSize: 8, color: pdfTheme.text },
  summaryValueBold: { fontSize: 9, color: pdfTheme.text, fontFamily: "Helvetica-Bold" },
});

export const DISCLAIMER_ESTIMATE =
  "This is a Contractor-Prepared Insurance Restoration Estimate prepared by Black Ridge Roofing. It is not an insurer-issued estimate, a licensed Xactimate export, or a guarantee of coverage. Final scope and pricing are subject to insurer review and mutual agreement.";
