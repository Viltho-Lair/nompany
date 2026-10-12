"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useReload } from "@/components/studio2/useReload";
import { fmtCurrencyAmount } from "@/lib/pricing";
import { quoteSeats, seatsOffered } from "@/shared/upgradeQuote";
import { upgradeDict } from "@/shared/studio/upgrade";
import { dirFor } from "@/shared/locale";
import TransferPanel from "./TransferPanel";
import type { Cycle, PriceList, UpgradeChoice } from "@/shared/upgradeQuote";
import type { OwnerBillingView } from "@/lib/data/customerBilling";

// WHAT `GET /upgrade` ANSWERS, as this dialog reads it. The price list's own
// type leaves a card's fields `unknown` because it is checked against stored
// rows; over the wire they are the JSON shapes below.
type Band = { id: string; label?: string; minEmployees?: number; maxEmployees?: number; perEmployee?: number };
type UpgradeCard = { id: string; type?: string; name?: string; nameAr?: string; minEmployees?: number; maxEmployees?: number; perEmployee?: number; categories?: Band[] };
type UpgradeData = {
  current: { packageId: string; tierId: string };
  requested: Partial<UpgradeChoice> | null;
  request: (UpgradeChoice & { total: number; requestedAt?: string }) | null;
  members: number;
  list: Omit<PriceList, "cards" | "tiers"> & { cards: UpgradeCard[]; tiers: { id: string; name?: string }[] };
};

// THE UPGRADE DIALOG — one component, opened from the studio header (Standard
// studios, owner only) and from the account page's list of owned studios (the
// owner, 24/09/2026).
//
// IT ASKS, IT DOES NOT CHARGE. There is no checkout yet: the owner picks a
// package, HOW MANY SEATS (12/10/2026 — never fewer than the people already
// in the studio), a tier and a cycle, sees the price band by band in their
// region's currency with tax, and sends the request. nompany takes the payment
// and records it against that plan, which is what moves the studio.
//
// ONCE ASKED, IT SAYS HOW TO PAY (26/09/2026): the bank details from /super →
// Payments and "I've sent the transfer" (components/billing/TransferPanel), the
// same panel the account page's Billing view shows. Closing it costs nothing —
// the studio stays open, and Billing has the same panel.
//
// THE PRICE ON SCREEN IS THE SERVER'S RULE, run here too (shared/upgradeQuote),
// so what the owner reads is what the request stores. The server quotes again
// on submit and its answer is the one kept.
//
// IT OPENS ON THE PACKAGE THEY PICKED WHEN SIGNING UP (studio.requestedPlan)
// when there is one; older studios open on the first package on sale.

const day = (iso: unknown) => {
  if (typeof iso !== "string") return "";
  const t = Date.parse(iso || "");
  return Number.isFinite(t) ? new Date(t).toLocaleDateString("en-GB") : "";
};

export default function UpgradeDialog({ slug, studioName, locale = "en", onClose }: {
  slug: string;
  studioName: string;
  locale?: string;
  onClose: () => void;
}) {
  const t = upgradeDict(locale);
  const ar = locale === "ar";
  const [data, setData] = useState<UpgradeData | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [choice, setChoice] = useState<UpgradeChoice | null>(null);
  const [billing, setBilling] = useState<OwnerBillingView | null>(null);

  const loadBilling = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/billing`, { cache: "no-store" });
    setBilling(res.ok ? await res.json() : null);
  }, [slug]);

  // A THROWN FETCH IS A FAILURE TOO, not an endless "…": a network error or a
  // body that is not JSON used to leave the dialog loading forever.
  const load = useCallback(async () => {
    setError("");
    let d: UpgradeData;
    try {
      const res = await fetch(`/api/studios/${slug}/upgrade`, { cache: "no-store" });
      if (!res.ok) { setError(t.failed); return; }
      d = await res.json();
    } catch {
      setError(t.failed);
      return;
    }
    setData(d);
    if (d.request) await loadBilling();
    const cards = d.list?.cards || [];
    const asked = d.request || d.requested;
    const pick = cards.find((c) => c.id === asked?.packageId) || cards[0];
    if (!pick) return;
    // THE SEATS START AT WHAT THEY ASKED FOR, else at the people already in the
    // studio — never below what the package sells.
    const { min } = seatsOffered(pick);
    const seats = Math.max(Number(asked?.seats) || 0, d.members || 0, min);
    // BASIC IS THE DEFAULT TIER, not "no tier" (the owner, 24/09/2026: "Basic is
    // No Tier, there is no need for No Tier as the Basic is the default"). The
    // tier named Basic, else the first one; a request already made keeps its own.
    const tiers = d.list?.tiers || [];
    const basic = tiers.find((t) => String(t.name || "").trim().toLowerCase() === "basic") || tiers[0];
    setChoice({
      packageId: pick.id,
      seats,
      tierId: d.request?.tierId || basic?.id || "",
      cycle: asked?.cycle === "yearly" ? "yearly" : "monthly",
    });
  }, [slug, t.failed, loadBilling]);
  useReload(load);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const cards = useMemo(() => data?.list?.cards || [], [data]);
  const card = cards.find((c) => c.id === choice?.packageId) || null;
  const quoted = data && choice ? quoteSeats(data.list, choice) : null;
  const range = seatsOffered(card);
  // A price that can be shown, or null — the refusal is kept apart because the
  // send button needs to know there was one.
  const quote = quoted && !("error" in quoted) ? quoted : null;
  const money = (n: number) => `${fmtCurrencyAmount(n, data?.list?.currency || "USD")} ${data?.list?.currency || ""}`;
  const name = (c: UpgradeCard | null | undefined) => (ar && c?.nameAr) || c?.name || "";

  async function send() {
    setBusy(true); setError("");
    const res = await fetch(`/api/studios/${slug}/upgrade`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(choice),
    });
    setBusy(false);
    if (!res.ok) {
      const out = await res.json().catch(() => ({}));
      setError(t.refusal[String(out?.error || "")] || t.failed);
      return;
    }
    setEditing(false);
    await load();
  }

  async function withdraw() {
    setBusy(true); setError("");
    const res = await fetch(`/api/studios/${slug}/upgrade`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) { setError(t.failed); return; }
    await load();
  }

  // The request being shown, or null while choosing — one value, so the branch
  // below reads it without asking again whether it exists.
  const pending = data?.request && !editing ? data.request : null;
  const pill = (active: boolean) => `rounded-full border px-3 py-1.5 text-sm transition-colors ${active
    ? "border-brand-600 bg-brand-600 text-white"
    : "border-slate-200 text-slate-700 hover:border-slate-300 dark:border-white/15 dark:text-slate-200"}`;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={t.title(studioName)} lang={locale} dir={dirFor(locale)}>
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200/70 bg-white p-6 text-slate-900 shadow-xl dark:border-white/10 dark:bg-[#111117] dark:text-white">
        <h2 className="font-display text-lg font-800">{t.title(studioName)}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.lead}</p>

        {!data && error ? (
          <div className="mt-5 space-y-3 text-sm">
            <p className="text-rose-600" role="alert">{error}</p>
            <button type="button" className={pill(false)} onClick={load}>{t.retry}</button>
          </div>
        ) : !data ? (
          <div className="mt-5 animate-pulse space-y-5" aria-busy="true">
            <div className="flex flex-wrap gap-2">
              {[20, 24, 16].map((w) => <div key={w} className="h-8 rounded-full bg-slate-100 dark:bg-white/10" style={{ width: `${w * 4}px` }} />)}
            </div>
            <div className="flex gap-2">
              {[20, 16].map((w) => <div key={w} className="h-8 rounded-full bg-slate-100 dark:bg-white/10" style={{ width: `${w * 4}px` }} />)}
            </div>
            <div className="h-28 rounded-xl bg-slate-50 dark:bg-white/5" />
            <div className="h-10 rounded-full bg-slate-100 dark:bg-white/10" />
          </div>
        ) : pending ? (
          <div className="mt-5 space-y-3 text-sm">
            <p>{t.pending(day(pending.requestedAt))}</p>
            <p className="font-600">
              {name(cards.find((c) => c.id === pending.packageId)) || pending.packageId}
              {" · "}{pending.cycle === "yearly" ? t.yearly : t.monthly}
              {" · "}{money(pending.total)}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" className={pill(false)} onClick={() => setEditing(true)} disabled={busy}>{t.change}</button>
              <button type="button" className={pill(false)} onClick={withdraw} disabled={busy}>{t.withdraw}</button>
            </div>
            <div className="border-t border-slate-100 pt-4 dark:border-white/10">
              {billing ? <TransferPanel slug={slug} data={billing} locale={locale} onChanged={loadBilling} /> : <p className="text-slate-500 dark:text-slate-400">{t.pendingNote}</p>}
            </div>
          </div>
        ) : cards.length === 0 ? (
          <p className="mt-5 text-sm">{t.noPackages}</p>
        ) : (
          <div className="mt-5 space-y-5">
            {data.requested && !data.request && <p className="text-xs text-slate-500 dark:text-slate-400">{t.asked}</p>}

            <div className="flex flex-wrap gap-2">
              {cards.map((c) => (
                <button key={c.id} type="button" className={pill(c.id === choice?.packageId)}
                  onClick={() => setChoice((ch) => ch && ({ ...ch, packageId: c.id, seats: Math.max(ch.seats, seatsOffered(c).min) }))}>
                  {name(c)}
                </button>
              ))}
            </div>

            <label className="block">
              <span className="mb-2 block text-xs font-600 uppercase tracking-wide text-slate-500">{t.seatsLabel}</span>
              <input type="number" inputMode="numeric" dir="ltr" min={Math.max(range.min, data.members || 0)} max={range.max || undefined} step={1}
                className="w-32 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm tabular-nums outline-none focus:border-brand-500 dark:border-white/15 dark:bg-white/5"
                value={choice?.seats || ""}
                onChange={(e) => { const v = Math.trunc(Number(e.target.value) || 0); setChoice((ch) => ch && ({ ...ch, seats: v })); }} />
              <span className="mt-1.5 block text-xs text-slate-500 dark:text-slate-400">{t.seatsHint(range.min, range.max, data.members || 0)}</span>
            </label>

            {(data.list.tiers || []).length > 0 && (
              <div>
                <p className="mb-2 text-xs font-600 uppercase tracking-wide text-slate-500">{t.tier}</p>
                <div className="flex flex-wrap gap-2">
                  {data.list.tiers.map((tier) => (
                    <button key={tier.id} type="button" className={pill(tier.id === choice?.tierId)}
                      onClick={() => setChoice((ch) => ch && ({ ...ch, tierId: tier.id }))}>
                      {tier.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {(["monthly", "yearly"] as Cycle[]).map((cy) => (
                <button key={cy} type="button" className={pill(choice?.cycle === cy)} onClick={() => setChoice((ch) => ch && ({ ...ch, cycle: cy }))}>
                  {cy === "yearly" ? t.yearly : t.monthly}
                </button>
              ))}
            </div>

            {quote && (
              <dl className="space-y-1 rounded-xl bg-slate-50 p-4 text-sm dark:bg-white/5">
                <div className="flex justify-between"><dt className="text-slate-500">{t.seats(quote.seats)}</dt></div>
                {quote.lines.map((l) => (
                  <div key={l.bandId || l.label} className="flex justify-between text-slate-600 dark:text-slate-300">
                    <dt>{t.seatLine(l.label, l.seats)}</dt><dd className="tabular-nums">{money(l.periodAmount)}</dd>
                  </div>
                ))}
                {quote.tierAmount > 0 && (
                  <div className="flex justify-between text-slate-600 dark:text-slate-300"><dt>{t.tierLine}</dt><dd className="tabular-nums">{money(quote.tierAmount)}</dd></div>
                )}
                <div className="flex justify-between"><dt>{t.subtotal}</dt><dd className="tabular-nums">{money(quote.amount)} {quote.cycle === "yearly" ? t.perYear : t.perMonth}</dd></div>
                <div className="flex justify-between"><dt>{t.tax(quote.taxPercent)}</dt><dd className="tabular-nums">{money(quote.tax)}</dd></div>
                <div className="flex justify-between font-700"><dt>{t.total}</dt><dd className="tabular-nums">{money(quote.total)}</dd></div>
              </dl>
            )}

            {quoted && "error" in quoted && choice && choice.seats > 0 && <p className="text-sm text-rose-600" role="alert">{t.refusal[quoted.error] || t.failed}</p>}
            {quote && quote.seats < (data.members || 0) && <p className="text-sm text-rose-600" role="alert">{t.refusal["fewer-than-members"]}</p>}

            <button type="button" onClick={send} disabled={busy || !quote || quote.seats < (data.members || 0)}
              className="w-full rounded-full bg-brand-600 px-5 py-2.5 font-display text-sm font-700 text-white hover:bg-brand-700 disabled:opacity-60">
              {busy ? t.sending : t.send}
            </button>
          </div>
        )}

        {error && data && <p className="mt-3 text-sm text-rose-600" role="alert">{error}</p>}
        <button type="button" onClick={onClose} className="mt-4 text-sm text-slate-500 hover:underline">{t.close}</button>
      </div>
    </div>
  );
}
