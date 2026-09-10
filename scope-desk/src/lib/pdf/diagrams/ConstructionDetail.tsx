import type { ReactElement } from "react";
import { View, Text, Svg, Path, Line, Rect, Polygon, StyleSheet } from "@react-pdf/renderer";
import { pdfTheme } from "@/lib/pdf/theme";

/**
 * Small illustrative construction-detail cross-sections that accompany the
 * code-report citations. These are generic, standard-practice details (the
 * kind that show up in any roofing code reference) — not a survey or
 * measurement of this property — so each one is captioned as illustrative.
 */

const DECK = "#8a8377";
const MEMBRANE = "#2f5f8a";
const SHINGLE = "#4a4a52";
const METAL = "#7d7568";

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4, marginBottom: 8 },
  caption: { fontSize: 6.5, color: pdfTheme.textDim, fontStyle: "italic", flexShrink: 1 },
});

function IceBarrierSvg() {
  return (
    <Svg width={110} height={95} viewBox="0 0 110 95">
      {/* roof deck, sloped */}
      <Line x1={15} y1={65} x2={95} y2={20} stroke={DECK} strokeWidth={4} />
      {/* fascia */}
      <Rect x={8} y={65} width={7} height={14} fill={METAL} />
      {/* ice & water membrane wrapping the eave */}
      <Path d="M11,65 L15,65 L44,48" stroke={MEMBRANE} strokeWidth={5} fill="none" strokeLinecap="round" />
      {/* shingle courses above the membrane */}
      {[0, 1, 2, 3].map((i) => (
        <Line
          key={i}
          x1={44 + i * 12}
          y1={48 - i * 9}
          x2={52 + i * 12}
          y2={44 - i * 9}
          stroke={SHINGLE}
          strokeWidth={2.5}
        />
      ))}
      <Line x1={8} y1={88} x2={30} y2={88} stroke={pdfTheme.textDim} strokeWidth={0.5} />
      <Text x={2} y={94} fill={pdfTheme.textDim}>
        24&quot; min
      </Text>
    </Svg>
  );
}

function DripEdgeSvg() {
  return (
    <Svg width={110} height={80} viewBox="0 0 110 80">
      <Line x1={15} y1={65} x2={95} y2={20} stroke={DECK} strokeWidth={4} />
      <Rect x={8} y={65} width={7} height={14} fill={METAL} />
      {/* L-shaped drip edge metal wrapping the fascia edge */}
      <Path d="M6,63 L18,63 L18,58 L28,54" stroke={pdfTheme.gold} strokeWidth={3} fill="none" strokeLinecap="round" />
      <Path d="M6,63 L6,79" stroke={pdfTheme.gold} strokeWidth={3} strokeLinecap="round" />
      {[0, 1, 2].map((i) => (
        <Line
          key={i}
          x1={30 + i * 14}
          y1={54 - i * 10}
          x2={40 + i * 14}
          y2={49 - i * 10}
          stroke={SHINGLE}
          strokeWidth={2.5}
        />
      ))}
    </Svg>
  );
}

function ValleySvg() {
  return (
    <Svg width={110} height={80} viewBox="0 0 110 80">
      {/* two roof planes meeting at a valley centerline */}
      <Polygon points="55,10 8,70 55,70" fill="#efece4" stroke={DECK} strokeWidth={1} />
      <Polygon points="55,10 102,70 55,70" fill="#e5e1d6" stroke={DECK} strokeWidth={1} />
      {/* valley membrane */}
      <Line x1={55} y1={10} x2={55} y2={70} stroke={MEMBRANE} strokeWidth={5} />
      {/* shingle courses cut back from centerline */}
      {[0, 1, 2, 3].map((i) => (
        <Line key={`l${i}`} x1={18 + i * 4} y1={62 - i * 14} x2={50} y2={62 - i * 14} stroke={SHINGLE} strokeWidth={1.5} />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <Line key={`r${i}`} x1={60} y1={62 - i * 14} x2={92 - i * 4} y2={62 - i * 14} stroke={SHINGLE} strokeWidth={1.5} />
      ))}
    </Svg>
  );
}

function CricketSvg() {
  return (
    <Svg width={110} height={80} viewBox="0 0 110 80">
      {/* roof plane */}
      <Line x1={5} y1={65} x2={105} y2={65} stroke={DECK} strokeWidth={2} />
      {/* chimney */}
      <Rect x={55} y={20} width={22} height={45} fill="#8a3b3b" stroke="#5a2626" strokeWidth={1} />
      {/* cricket peak diverting water around the uphill side */}
      <Polygon points="30,65 55,65 42,42" fill="#efece4" stroke={DECK} strokeWidth={1.2} />
      <Line x1={42} y1={42} x2={42} y2={65} stroke={MEMBRANE} strokeWidth={2.5} />
      {/* water-diversion arrows */}
      <Path d="M40,50 L28,58" stroke={pdfTheme.gold} strokeWidth={1.5} />
      <Path d="M28,58 L32,54 M28,58 L32,60" stroke={pdfTheme.gold} strokeWidth={1.5} />
      <Path d="M44,50 L54,58" stroke={pdfTheme.gold} strokeWidth={1.5} />
      <Path d="M54,58 L50,54 M54,58 L52,61" stroke={pdfTheme.gold} strokeWidth={1.5} />
    </Svg>
  );
}

const DETAILS: Record<string, { render: () => ReactElement; caption: string }> = {
  ice_barrier: {
    render: IceBarrierSvg,
    caption: "Illustrative detail: self-adhered ice-barrier membrane wraps the eave edge beneath the shingle courses.",
  },
  drip_edge: {
    render: DripEdgeSvg,
    caption: "Illustrative detail: metal drip edge is set at the eave, over the fascia and under the starter course.",
  },
  valley: {
    render: ValleySvg,
    caption: "Illustrative detail: valley membrane runs the full length of the valley; shingles are cut back from the centerline.",
  },
  cricket: {
    render: CricketSvg,
    caption: "Illustrative detail: a cricket behind the chimney diverts water around it rather than damming against it.",
  },
};

export function ConstructionDetail({ type }: { type: keyof typeof DETAILS }) {
  const detail = DETAILS[type];
  if (!detail) return null;
  return (
    <View style={styles.wrap} wrap={false}>
      {detail.render()}
      <Text style={styles.caption}>{detail.caption}</Text>
    </View>
  );
}
