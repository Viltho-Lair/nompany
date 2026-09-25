"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useReload } from "@/components/studio2/useReload";
import { fmtCurrencyAmount } from "@/lib/pricing";
import { quoteUpgrade } from "@/shared/upgradeQuote";
import { upgradeDict } from "@/shared/studio/upgrade";
import { dirFor } from "@/shared/locale";
import TransferPanel from "./TransferPanel";

// THE UPGRADE DIALOG — one component, opened from the studio header (Standard
// studios, owner only) and from the account page's list of owned studios (the
// owner, 24/09/2026).
//
// IT ASKS, IT DOES NOT CHARGE. There is no checkout yet: the owner picks a
// package, a band, a tier and a cycle, sees the price in their region's
// currency with tax, and sends the request. nompany takes the payment and
// records it against that package, which is what moves the studio.
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

const day = (iso) => {
  const t = Date.parse(iso || "");
  return Number.isFinite(t) ? new Date(t).toLocaleDateString("en-GB") : "";
};

export default function UpgradeDialog({ slug, studioName, locale = "en", onClose }) {
  const t = upgradeDict(locale);
  const ar = locale === "ar";
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [choice, setChoice] = useState(null);
  const [billing, setBilling] = useState(null);

  const loadBilling = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/billing`, { cache: "no-store" });
    setBilling(res.ok ? await res.json() : null);
  }, [slug]);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/upgrade`, { cache: "no-store" });
    if (!res.ok) { setError(t.failed); return; }
    const d = await res.json();
    setData(d);
    if (d.request) await loadBilling();
    const cards = d.list?.cards || [];
    const asked = d.request || d.requested;
    const pick = cards.find((c) => c.id === asked?.packageId) || cards[0];
    if (!pick) return;
    const bands = pick.categories || [];
    const band = bands.find((b) => b.id === (asked?.categoryId || "")) || bands[0];
    // BASIC IS THE DEFAULT TIER, not "no tier" (the owner, 24/09/2026: "Basic is
    // No Tier, there is no need for No Tier as the Basic is the default"). The
    // tier named Basic, else the first one; a request already made keeps its own.
    const tiers = d.list?.tiers || [];
    const basic = tiers.find((t) => String(t.name || "").trim().toLowerCase() === "basic") || tiers[0];
    setChoice({
      packageId: pick.id,
      categoryId: pick.type === "compound" ? band?.id || "" : "",
      tierId: d.request?.tierId || basic?.id || "",
      cycle: asked?.cycle === "yearly" ? "yearly" : "monthly",
    });
  }, [slug, t.failed, loadBilling]);
  useReload(load);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const cards = useMemo(() => data?.list?.cards || [], [data]);
  const card = cards.find((c) => c.id === choice?.packageId) || null;
  const quote = data && choice ? quoteUpgrade(data.list, choice) : null;
  const money = (n) => `${fmtCurrencyAmount(n, data?.list?.currency || "USD")} ${data?.list?.currency || ""}`;
  const name = (c) => (ar && c?.nameAr) || c?.name || "";

  async function send() {
    setBusy(true); setError("");
    const res = await fetch(`/api/studios/${slug}/upgrade`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(choice),
    });
    setBusy(false);
    if (!res.ok) { setError(t.failed); return; }
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

  const pending = data?.request && !editing;
  const pill = (active) => `rounded-full border px-3 py-1.5 text-sm transition-colors ${active
    ? "border-brand-600 bg-brand-600 text-white"
    : "border-slate-200 text-slate-700 hover:border-slate-300 dark:border-white/15 dark:text-slate-200"}`;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={t.title(studioName)} lang={locale} dir={dirFor(locale)}>
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200/70 bg-white p-6 text-slate-900 shadow-xl dark:border-white/10 dark:bg-[#20202c] dark:text-white">
        <h2 className="font-display text-lg font-800">{t.title(studioName)}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.lead}</p>

        {!data ? (
          <p className="mt-5 text-sm text-slate-500">{error || "…"}</p>
        ) : pending ? (
          <div className="mt-5 space-y-3 text-sm">
            <p>{t.pending(day(data.request.requestedAt))}</p>
            <p className="font-600">
              {name(cards.find((c) => c.id === data.request.packageId)) || data.request.packageId}
              {" · "}{data.request.cycle === "yearly" ? t.yearly : t.monthly}
              {" · "}{money(data.request.total)}
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
                  onClick={() => setChoice((ch) => ({ ...ch, packageId: c.id, categoryId: c.type === "compound" ? c.categories?.[0]?.id || "" : "" }))}>
                  {name(c)}
                </button>
              ))}
            </div>

            {card?.type === "compound" && (
              <div>
                <p className="mb-2 text-xs font-600 uppercase tracking-wide text-slate-500">{t.band}</p>
                <div className="flex flex-wrap gap-2">
                  {(card.categories || []).map((b) => (
                    <button key={b.id} type="button" className={pill(b.id === choice?.categoryId)}
                      onClick={() => setChoice((ch) => ({ ...ch, categoryId: b.id }))}>
                      {b.label || `${b.minEmployees}–${b.maxEmployees}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(data.list.tiers || []).length > 0 && (
              <div>
                <p className="mb-2 text-xs font-600 uppercase tracking-wide text-slate-500">{t.tier}</p>
                <div className="flex flex-wrap gap-2">
                  {data.list.tiers.map((tier) => (
                    <button key={tier.id} type="button" className={pill(tier.id === choice?.tierId)}
                      onClick={() => setChoice((ch) => ({ ...ch, tierId: tier.id }))}>
                      {tier.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {["monthly", "yearly"].map((cy) => (
                <button key={cy} type="button" className={pill(choice?.cycle === cy)} onClick={() => setChoice((ch) => ({ ...ch, cycle: cy }))}>
                  {cy === "yearly" ? t.yearly : t.monthly}
                </button>
              ))}
            </div>

            {quote && !quote.error && (
              <dl className="space-y-1 rounded-xl bg-slate-50 p-4 text-sm dark:bg-white/5">
                <div className="flex justify-between"><dt className="text-slate-500">{quote.seats > 0 ? t.seats(quote.seats) : t.unlimitedSeats}</dt></div>
                <div className="flex justify-between"><dt>{t.subtotal}</dt><dd className="tabular-nums">{money(quote.amount)} {quote.cycle === "yearly" ? t.perYear : t.perMonth}</dd></div>
                <div className="flex justify-between"><dt>{t.tax(quote.taxPercent)}</dt><dd className="tabular-nums">{money(quote.tax)}</dd></div>
                <div className="flex justify-between font-700"><dt>{t.total}</dt><dd className="tabular-nums">{money(quote.total)}</dd></div>
              </dl>
            )}

            <button type="button" onClick={send} disabled={busy || !quote || Boolean(quote.error)}
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
