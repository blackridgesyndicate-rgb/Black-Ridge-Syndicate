import { View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { pdfTheme } from "@/lib/pdf/theme";
import type { PhotoAsset } from "@/lib/pdf/photoAssets";

const DAMAGE_LABELS: Record<string, string> = {
  hail: "Hail",
  wind: "Wind",
  mechanical: "Mechanical",
  wear: "Wear",
  improper_installation: "Improper Installation",
  interior_water: "Interior Water",
  other: "Other",
};

const DAMAGE_COLORS: Record<string, string> = {
  hail: "#2f5f8a",
  wind: "#3f7d4f",
  mechanical: "#c07a2e",
  wear: "#7d7568",
  improper_installation: "#6b4f9c",
  interior_water: "#a53f3f",
  other: "#7d7568",
};

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 6 },
  card: { width: 152 },
  photo: { width: 152, height: 114, objectFit: "cover", borderWidth: 1, borderColor: pdfTheme.border },
  placeholder: {
    width: 152,
    height: 114,
    backgroundColor: pdfTheme.bgTint,
    borderWidth: 1,
    borderColor: pdfTheme.border,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: { fontSize: 6.5, color: pdfTheme.textDim, textAlign: "center", paddingHorizontal: 6 },
  caption: { fontSize: 7.5, color: pdfTheme.text, marginTop: 3 },
  badge: { fontSize: 6, color: "#ffffff", paddingHorizontal: 4, paddingVertical: 1.5, marginTop: 2, alignSelf: "flex-start" },
});

export function PhotoGallery({ assets }: { assets: PhotoAsset[] }) {
  if (assets.length === 0) return null;
  return (
    <View style={styles.grid}>
      {assets.map(({ photo, buffer }) => (
        <View key={photo.id} style={styles.card} wrap={false}>
          {buffer ? (
            // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer's Image is a PDF primitive, not a DOM <img>; it has no alt prop.
            <Image src={buffer} style={styles.photo} />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>Preview unavailable for this file format</Text>
            </View>
          )}
          <Text style={styles.caption}>{photo.caption || "Untitled photo"}</Text>
          {photo.damageClassification && (
            <Text style={[styles.badge, { backgroundColor: DAMAGE_COLORS[photo.damageClassification] ?? "#7d7568" }]}>
              {DAMAGE_LABELS[photo.damageClassification] ?? photo.damageClassification}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}
