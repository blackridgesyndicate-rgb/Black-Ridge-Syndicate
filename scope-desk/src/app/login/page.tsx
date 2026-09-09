"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BrandMark } from "@/components/BrandMark";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Sign in failed");
        setLoading(false);
        return;
      }
      const next = params.get("next") || "/dashboard";
      router.push(next);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 bg-brd-black">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-10">
          <BrandMark size="lg" />
        </div>
        <form onSubmit={onSubmit} className="brd-card rounded-sm p-8 space-y-5">
          <div>
            <h1 className="brd-heading text-xl text-brd-text mb-1">Scope Desk Sign In</h1>
            <p className="text-sm text-brd-text-dim">Private estimator access only.</p>
          </div>
          <div className="space-y-1.5">
            <label className="brd-eyebrow" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="brd-input w-full rounded-sm px-3 py-2 text-sm"
              placeholder="you@blackridgeroofing.com"
            />
          </div>
          <div className="space-y-1.5">
            <label className="brd-eyebrow" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="brd-input w-full rounded-sm px-3 py-2 text-sm"
              placeholder="••••••••"
            />
          </div>
          {error && (
            <p className="text-sm text-brd-danger border border-brd-danger/40 bg-brd-danger/10 rounded-sm px-3 py-2">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="brd-btn-gold w-full rounded-sm py-2.5 text-sm tracking-wide"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
          <p className="text-xs text-brd-text-dim pt-2 border-t border-brd-border">
            Demo credentials — estimator@blackridgeroofing.com / BlackRidge2024!
          </p>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
