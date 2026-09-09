import { db } from "@/lib/db";
import { PriceListManager } from "@/components/PriceListManager";

export default async function PriceListPage() {
  const items = await db.priceListItem.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <div>
      <p className="brd-eyebrow mb-1">Reusable Catalog</p>
      <h1 className="brd-heading text-2xl sm:text-3xl text-brd-text mb-6">Price List</h1>
      <PriceListManager initialItems={items} />
    </div>
  );
}
