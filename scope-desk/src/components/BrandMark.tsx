export function BrandMark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dims = size === "lg" ? "text-3xl" : size === "sm" ? "text-lg" : "text-2xl";
  return (
    <div className="flex flex-col leading-none">
      <span className={`brd-heading ${dims} font-semibold tracking-wide text-brd-text`}>
        BLACK RIDGE <span className="text-brd-gold">ROOFING</span>
      </span>
      <span className="brd-eyebrow mt-1">Elevated Roofing &amp; Exterior Systems</span>
    </div>
  );
}
