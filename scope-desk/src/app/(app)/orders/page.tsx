import Link from "next/link";
import { db } from "@/lib/db";
import { REPORT_TYPE_COPY } from "@/lib/orderIntake";
import { money, dateStr } from "@/lib/format";

function statusColor(status: string) {
  switch (status) {
    case "paid":
      return "text-brd-success border-brd-success/40";
    case "canceled":
    case "expired":
      return "text-brd-text-dim border-brd-border";
    default:
      return "text-brd-gold-bright border-brd-gold-dim";
  }
}

export default async function OrdersPage() {
  const orders = await db.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <div className="mb-6">
        <p className="brd-eyebrow mb-1">Scope Desk</p>
        <h1 className="brd-heading text-2xl sm:text-3xl text-brd-text">Orders</h1>
        <p className="text-sm text-brd-text-dim mt-1">
          Customer-submitted requests from the public order form. Paid orders are automatically converted into a job.
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="brd-card rounded-sm p-10 text-center">
          <p className="text-brd-text-dim">No orders yet.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="brd-card rounded-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <p className="text-brd-text font-medium">{order.contactName}</p>
                <p className="text-sm text-brd-text-dim">
                  {order.addressLine1}, {order.city}, {order.state} {order.zip}
                </p>
                <p className="text-xs text-brd-text-dim mt-1">
                  {REPORT_TYPE_COPY[order.reportType as "insurance" | "retail"].label} · {money(order.amountCents / 100)} ·{" "}
                  {dateStr(order.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`brd-tag rounded-sm px-2 py-1 border ${statusColor(order.status)}`}>
                  {order.status.replace("_", " ")}
                </span>
                {order.claimId && (
                  <Link href={`/claims/${order.claimId}`} className="brd-btn-ghost rounded-sm px-3 py-1.5 text-sm">
                    Open Job
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
