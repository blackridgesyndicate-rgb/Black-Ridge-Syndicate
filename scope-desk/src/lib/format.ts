export function money(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function num(n: number | null | undefined, decimals = 2): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: decimals });
}

export function dateStr(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function dateInputValue(d: string | Date | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

/** Deterministic human-facing report number derived from the claim id and
 * creation year — stable across regenerations without needing a database
 * counter (SQLite autoincrement can't attach to a non-id column). */
export function reportNumber(claimId: string, createdAt: string | Date): string {
  const year = (typeof createdAt === "string" ? new Date(createdAt) : createdAt).getFullYear();
  const suffix = claimId.slice(-6).toUpperCase();
  return `BRS-${year}-${suffix}`;
}
