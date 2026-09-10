import { db } from "@/lib/db";
import { WhiteLabelManager } from "@/components/WhiteLabelManager";

export default async function WhiteLabelPage() {
  const profiles = await db.whiteLabelProfile.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div>
      <p className="brd-eyebrow mb-1">Contractor Reseller Branding</p>
      <h1 className="brd-heading text-2xl sm:text-3xl text-brd-text mb-2">White-Label Profiles</h1>
      <p className="text-sm text-brd-text-dim mb-6 max-w-2xl">
        Assign a profile to a claim (from its Overview tab) to have that job&apos;s customer-facing reports carry the
        contractor&apos;s own branding, contact information, license number, and warranty language instead of Black
        Ridge Roofing&apos;s. Black Ridge Scope Desk still owns the internal record of every job regardless of which
        branding is shown.
      </p>
      <WhiteLabelManager initialProfiles={profiles} />
    </div>
  );
}
