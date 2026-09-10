import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { BrandMark } from "@/components/BrandMark";
import { SignOutButton } from "@/components/SignOutButton";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen flex flex-col bg-brd-black">
      <header className="border-b border-brd-border bg-brd-charcoal/60 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <Link href="/dashboard">
            <BrandMark size="sm" />
          </Link>
          <nav className="hidden sm:flex items-center gap-5 text-sm text-brd-text-dim">
            <Link href="/dashboard" className="hover:text-brd-gold-bright transition-colors">
              Jobs
            </Link>
            <Link href="/orders" className="hover:text-brd-gold-bright transition-colors">
              Orders
            </Link>
            <Link href="/price-list" className="hover:text-brd-gold-bright transition-colors">
              Price List
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            {user && <span className="hidden sm:inline text-xs text-brd-text-dim">{user.name}</span>}
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</main>
      <footer className="border-t border-brd-border px-4 sm:px-6 py-4 text-center text-xs text-brd-text-dim">
        Black Ridge Roofing — Scope Desk (internal). Contractor-prepared documents; not an insurer-issued estimate.
      </footer>
    </div>
  );
}
