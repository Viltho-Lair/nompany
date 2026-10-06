"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { initialsOf } from "@/lib/initials";
import type { getDict } from "@/shared/i18n";

type SiteDict = ReturnType<typeof getDict>;
/** The signed-in person, as the header learns it from `/api/identity/me`. */
export type SignedIn = { email: string; name: string };

// Signed-in user menu for the public header: a round avatar button (company
// initial) that opens a dropdown with account links + Sign out. Replaces the
// Login/Sign-up buttons whenever a SaaS session is present.
export default function AccountMenu({ locale, company, dict, onSignedOut }: {
  locale: string;
  company: SignedIn | null;
  dict: SiteDict;
  onSignedOut?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Avatar + name represent the signed-in PERSON (owner), not the company.
  // `name`, which is what Nav hands over — this read `ownerName`, which
  // nothing ever set, so the menu showed the email and its initials for every
  // person who had a name on their profile (found typing this file, 06/10/2026).
  const personName = company?.name || company?.email || dict?.nav?.account || "Account";
  const initials = initialsOf(company?.name || company?.email);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); window.removeEventListener("keydown", onKey); };
  }, [open]);

  async function signOut() {
    setBusy(true);
    try { await fetch("/api/identity/logout", { method: "POST" }); } catch { /* ignore */ }
    setOpen(false);
    onSignedOut?.();
    router.push(`/${locale}`);
    router.refresh();
  }

  const item = "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-start text-sm font-500 text-steel-700 transition-colors hover:bg-steel-100 dark:text-slate-200 dark:hover:bg-white/5";

  const links = [
    { href: `/${locale}/account`, label: dict?.nav?.account || "My account" },
    { href: `/studio`, label: dict?.nav?.studio || "My Studio" },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={personName}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 font-display text-sm font-700 text-white transition-colors hover:bg-brand-700"
      >
        {initials}
      </button>

      {open && (
        <div className="absolute end-0 mt-2 w-60 rounded-2xl border border-steel-200 bg-white p-1.5 shadow-xl dark:border-white/10 dark:bg-steel-900" role="menu">
          <div className="border-b border-steel-100 px-3 py-2.5 dark:border-white/10">
            <p className="truncate text-sm font-700 text-brand-950 dark:text-white">{personName}</p>
            {(() => {
              // Secondary line: company + email, minus whatever is already the name.
              const secondary = [company?.name, company?.email].filter(Boolean).filter((x) => x !== personName).join(" · ");
              return secondary ? <p className="truncate text-xs text-steel-500 dark:text-slate-400">{secondary}</p> : null;
            })()}
          </div>
          <div className="py-1">
            {links.map((l) => (
              <Link key={l.href} href={l.href} role="menuitem" onClick={() => setOpen(false)} className={item}>
                {l.label}
              </Link>
            ))}
          </div>
          <div className="border-t border-steel-100 pt-1 dark:border-white/10">
            <button type="button" onClick={signOut} disabled={busy} role="menuitem" className={`${item} text-red-600 hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-500/10`}>
              {busy ? "…" : (dict?.nav?.signout || "Sign out")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
