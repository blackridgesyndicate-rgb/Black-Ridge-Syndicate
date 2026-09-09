"use client";

import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      }}
      className="brd-btn-ghost rounded-sm px-3 py-1.5 text-xs tracking-wide"
    >
      Sign Out
    </button>
  );
}
