import "server-only";
import type { ClaimDetail } from "@/lib/types";
import { COMPANY, pdfTheme } from "@/lib/pdf/theme";

export interface ResolvedBranding {
  companyName: string;
  companyNameAccent: string; // the part of the name rendered in the accent color, e.g. "ROOFING"
  tagline: string;
  addressLine: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  license: string | null;
  salesRepName: string | null;
  workmanshipWarrantyText: string | null;
  primaryColor: string;
  accentColor: string;
  isWhiteLabel: boolean;
}

/**
 * Resolves which branding a generated PDF should carry. When a claim has an
 * active white-label profile, the customer-facing report uses the
 * contractor's own name/contact/license/colors throughout — Black Ridge
 * Scope Desk still owns the internal GeneratedDocument record regardless,
 * this only changes what's printed on the page.
 */
export function resolveBranding(claim: ClaimDetail): ResolvedBranding {
  const wl = claim.whiteLabelProfile;
  if (wl && wl.active) {
    const nameParts = wl.businessName.trim().split(/\s+/);
    const accent = nameParts.length > 1 ? nameParts[nameParts.length - 1] : wl.businessName;
    const lead = nameParts.length > 1 ? nameParts.slice(0, -1).join(" ") : "";
    return {
      companyName: lead ? `${lead} ` : "",
      companyNameAccent: accent,
      tagline: wl.workmanshipWarrantyText ? "" : "Roofing & Exterior Systems",
      addressLine:
        [wl.addressLine1, [wl.city, wl.state, wl.zip].filter(Boolean).join(", ")].filter(Boolean).join(", ") || null,
      phone: wl.phone,
      email: wl.email,
      website: wl.website,
      license: wl.licenseNumber,
      salesRepName: wl.salesRepName,
      workmanshipWarrantyText: wl.workmanshipWarrantyText,
      primaryColor: wl.brandPrimaryColor || pdfTheme.black,
      accentColor: wl.brandAccentColor || pdfTheme.gold,
      isWhiteLabel: true,
    };
  }

  return {
    companyName: "BLACK RIDGE ",
    companyNameAccent: "ROOFING",
    tagline: COMPANY.tagline,
    addressLine: COMPANY.addressLine,
    phone: COMPANY.phone,
    email: COMPANY.email,
    website: null,
    license: COMPANY.license,
    salesRepName: null,
    workmanshipWarrantyText: null,
    primaryColor: pdfTheme.black,
    accentColor: pdfTheme.gold,
    isWhiteLabel: false,
  };
}
