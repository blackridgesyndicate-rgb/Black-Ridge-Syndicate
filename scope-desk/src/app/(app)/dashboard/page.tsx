import Link from "next/link";
import { db } from "@/lib/db";

function statusColor(status: string) {
  switch (status) {
    case "closed":
      return "text-brd-text-dim border-brd-border";
    case "submitted":
    case "supplementing":
      return "text-brd-gold-bright border-brd-gold-dim";
    default:
      return "text-brd-success border-brd-success/40";
  }
}

export default async function DashboardPage() {
  const claims = await db.claim.findMany({
    include: { property: { include: { customer: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="brd-eyebrow mb-1">Scope Desk</p>
          <h1 className="brd-heading text-2xl sm:text-3xl text-brd-text">Jobs &amp; Claims</h1>
        </div>
        <Link href="/claims/new" className="brd-btn-gold rounded-sm px-4 py-2 text-sm">
          + New Property / Job
        </Link>
      </div>

      {claims.length === 0 ? (
        <div className="brd-card rounded-sm p-10 text-center">
          <p className="text-brd-text-dim">No jobs yet. Create your first property to get started.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {claims.map((claim) => (
            <Link
              key={claim.id}
              href={`/claims/${claim.id}`}
              className="brd-card rounded-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-brd-gold-dim transition-colors"
            >
              <div>
                <p className="text-brd-text font-medium">{claim.property.customer.name}</p>
                <p className="text-sm text-brd-text-dim">
                  {claim.property.addressLine1}, {claim.property.city}, {claim.property.state}{" "}
                  {claim.property.zip}
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                {claim.claimNumber && (
                  <span className="text-brd-text-dim">Claim #{claim.claimNumber}</span>
                )}
                <span className={`brd-tag rounded-sm px-2 py-1 border ${statusColor(claim.status)}`}>
                  {claim.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
