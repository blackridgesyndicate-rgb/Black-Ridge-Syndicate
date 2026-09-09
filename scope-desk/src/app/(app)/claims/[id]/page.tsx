import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { claimDetailInclude } from "@/lib/types";
import { ClaimWorkspace } from "@/components/claim/ClaimWorkspace";

export default async function ClaimDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const claim = await db.claim.findUnique({ where: { id }, include: claimDetailInclude });
  if (!claim) notFound();
  return <ClaimWorkspace initialClaim={claim} />;
}
