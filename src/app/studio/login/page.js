"use client";

import { useState } from "react";
import Image from "next/image";
import ThemeToggle from "@/components/ThemeToggle";

export default function StudioLoginPage() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, password, remember }),
      });
      if (!res.ok) {
        setError("Invalid User ID or password.");
        setLoading(false);
        return;
      }
      // Hard navigation (not router.push) so the browser makes a fresh request
      // carrying the just-set session cookie — the middleware guard then passes
      // and the dashboard loads. router.push can reuse a prefetched RSC payload
      // captured while unauthenticated, which silently keeps you on /login.
      window.location.assign("/studio");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  const input =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-[#223358] dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-[#223358]";

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#f4f6fb] px-5 dark:bg-[#141420]">
      <div className="absolute end-5 top-5">
        <ThemeToggle label="Toggle dark mode" />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="inline-flex rounded-2xl bg-white p-3 dark:bg-white">
            <Image src="/brand/logo-full.png" alt="MegaTech Arabia" width={130} height={130} className="h-16 w-auto object-contain" />
          </span>
          <h1 className="mt-5 font-display text-2xl font-800 text-slate-900 dark:text-white">
            MegaTech <span className="text-brand-500">Studio</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Sign in to your control panel.</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 rounded-geex border border-slate-200/70 shadow-geex-sm bg-white p-7 shadow-[0_20px_60px_-30px_rgba(2,32,89,0.25)] dark:border-white/10 dark:bg-[#20202c]">
          <div>
            <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400" htmlFor="userId">
              User ID
            </label>
            <input
              id="userId"
              name="userId"
              className={input}
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className={input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 cursor-pointer accent-brand-700"
            />
            Remember me for 30 days
          </label>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-full bg-brand-700 px-6 py-3 font-display text-sm font-600 tracking-wide text-white transition-colors hover:bg-brand-950 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">MegaTech Arabia · Content Studio</p>
      </div>
    </div>
  );
}
