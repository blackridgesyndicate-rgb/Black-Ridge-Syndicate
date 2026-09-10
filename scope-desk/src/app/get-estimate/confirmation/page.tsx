import { db } from "@/lib/db";
import { BrandMark } from "@/components/BrandMark";
import { REPORT_TYPE_COPY } from "@/lib/orderIntake";

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  const order = session_id
    ? await db.order.findUnique({ where: { stripeCheckoutSessionId: session_id } })
    : null;

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 bg-brd-black">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-10">
          <BrandMark size="lg" />
        </div>
        <div className="brd-card rounded-sm p-8 space-y-4">
          {order ? (
            <>
              <h1 className="brd-heading text-xl text-brd-text">Thank you, {order.contactName.split(" ")[0]}.</h1>
              <p className="text-sm text-brd-text-dim leading-relaxed">
                Your {REPORT_TYPE_COPY[order.reportType as "insurance" | "retail"].label.toLowerCase()} request for{" "}
                <span className="text-brd-text">{order.addressLine1}, {order.city}, {order.state} {order.zip}</span>{" "}
                has been received{order.status === "paid" ? " and payment confirmed" : ""}. A Black Ridge estimator
                will begin work and follow up at {order.contactEmail}.
              </p>
              {order.status !== "paid" && (
                <p className="text-xs text-brd-text-dim border border-brd-border rounded-sm px-3 py-2">
                  We&apos;re still confirming your payment — this page will update shortly. No action needed.
                </p>
              )}
            </>
          ) : (
            <>
              <h1 className="brd-heading text-xl text-brd-text">Thank you.</h1>
              <p className="text-sm text-brd-text-dim">
                Your request has been received. A Black Ridge estimator will be in touch shortly.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
