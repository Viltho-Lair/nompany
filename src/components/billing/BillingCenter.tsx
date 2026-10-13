"use client";

import { useCallback, useEffect, useState } from "react";
import { fmtCurrencyAmount } from "@/lib/pricing";
import { billingDict } from "@/shared/studio/billing";
import { lastDayOf } from "@/shared/seatPricing";
import SelectMenu from "@/components/fields/SelectMenu";
import TransferPanel from "./TransferPanel";
import type { InputHTMLAttributes } from "react";
import type { OwnerBillingView } from "@/lib/data/customerBilling";
import type { BillingProfile } from "@/lib/data/customerBilling";
import type { SeatView } from "@/lib/data/seatBilling";

type Words = ReturnType<typeof billingDict>;
type View = OwnerBillingView & { seats: SeatView };

// THE OWNER'S BILLING PAGE — /account → Billing (the owner, 26/09/2026: "they
// will still need to check their financial information"). On the account page
// rather than inside a studio, because this is the customer's business with
// nompany, not the studio's own Finance, and because a shut-down studio cannot
// be opened at all — the account page always can.
//
// One studio at a time: its subscription, its SEATS (12/10/2026 — the owner
// changes them here: more at once and billed on the next renewal, fewer from
// the renewal), what it is asked to pay and how, the transfers told to nompany
// and their answers, invoices and credit notes (each one a printable page),
// refund requests, and the billing details printed on invoices.

const newId = () => (globalThis.crypto?.randomUUID?.() || `rf_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`);
const dmy = (d: unknown) => (/^\d{4}-\d{2}-\d{2}/.test(String(d || "")) ? String(d).slice(0, 10).split("-").reverse().join("/") : "");
const when = (iso: unknown) => {
  if (typeof iso !== "string") return "";
  const t = Date.parse(iso || "");
  return Number.isFinite(t) ? new Date(t).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
};

const CARD = "rounded-geex border border-slate-200/70 bg-white p-5 dark:border-white/10 dark:bg-[#111117]";
const H2 = "mb-3 font-display text-base font-800 text-slate-900 dark:text-white";
const INPUT = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 dark:border-white/15 dark:bg-white/5 dark:text-white";
const BTN = "rounded-full bg-brand-600 px-4 py-2 font-display text-sm font-700 text-white hover:bg-brand-700 disabled:opacity-60";
const GHOST = "rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:border-slate-300 dark:border-white/15 dark:text-slate-200";

const TONE: Record<string, string> = {
  pending: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200",
  confirmed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200",
  refunded: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200",
  rejected: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200",
  declined: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200",
  withdrawn: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300",
};

export default function BillingCenter({ owned = [], locale = "en", initialSlug = "" }: {
  owned?: { slug: string; name: string }[];
  locale?: string;
  initialSlug?: string;
}) {
  const t = billingDict(locale);
  const [slug, setSlug] = useState(() => (owned.some((s) => s.slug === initialSlug) ? initialSlug : owned[0]?.slug || ""));
  const [data, setData] = useState<View | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!slug) return;
    setError("");
    const res = await fetch(`/api/studios/${slug}/billing`, { cache: "no-store" });
    if (!res.ok) { setError(t.failed); setData(null); return; }
    setData(await res.json());
  }, [slug, t.failed]);
  useEffect(() => {
    // Loads the chosen studio's billing whenever the choice changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(null);
    load();
  }, [load]);

  if (!owned.length) return <p className="text-sm text-slate-500">{t.noStudios}</p>;

  return (
    <div className="space-y-5 pb-10">
      <div>
        <h1 className="font-display text-2xl font-800 text-slate-900 dark:text-white">{t.title}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.lead}</p>
      </div>

      {owned.length > 1 && (
        <label className="block max-w-sm">
          <span className="mb-1 block text-xs font-600 uppercase tracking-wide text-slate-500">{t.pickStudio}</span>
          <SelectMenu className={INPUT} value={slug} aria-label={t.pickStudio} onChange={(v) => setSlug(v)}
            options={owned.map((s) => ({ value: s.slug, label: s.name }))} />
        </label>
      )}

      {!data ? <p className="text-sm text-slate-500">{error || t.loading}</p> : (
        <>
          <Status data={data} t={t} />
          <Seats key={slug} slug={slug} data={data} t={t} onChanged={load} />
          {data.paymentRequest && <RequestCard data={data} t={t} />}
          <section className={CARD}>
            <h2 className={H2}>{t.payTitle}</h2>
            <TransferPanel key={slug} slug={slug} data={data} locale={locale} onChanged={load} />
          </section>
          <Claims data={data} t={t} />
          <Documents slug={slug} data={data} t={t} onChanged={load} />
          <Profile slug={slug} data={data} t={t} />
        </>
      )}
    </div>
  );
}

function Status({ data, t }: { data: View; t: Words }) {
  const s = data.subscription;
  const lines: string[] = [];
  if (data.status === "trial") lines.push(t.freeUntil(dmy(s.paidUntil)));
  else if (data.status === "active") lines.push(t.paidUntil(dmy(s.paidUntil)));
  if (data.status === "due") lines.push(t.closesOn(dmy(data.dates.closesOn)));
  if (data.status === "closed" || data.status === "cancelled") lines.push(t.shutsDownOn(dmy(data.dates.shutsDownOn)));
  return (
    <section className={CARD}>
      <h2 className={H2}>{t.statusTitle}</h2>
      <p className="font-600">{t.status[data.status] || data.status}</p>
      {data.plan.packageName && <p className="text-sm text-slate-600 dark:text-slate-300">{t.onPlan(`${data.plan.packageName}${data.plan.tierName ? ` + ${data.plan.tierName}` : ""}`)}</p>}
      {lines.map((l) => <p key={l} className="text-sm text-slate-600 dark:text-slate-300">{l}</p>)}
      {data.holdUntil && <p className="mt-2 text-sm text-sky-800 dark:text-sky-200">{t.held(when(data.holdUntil))}</p>}
    </section>
  );
}

function Seats({ slug, data, t, onChanged }: { slug: string; data: View; t: Words; onChanged: () => Promise<unknown> }) {
  const v = data.seats;
  const [want, setWant] = useState(v.seatsNext || v.seats);
  const [changeId, setChangeId] = useState(newId);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const money = (n: unknown, c?: string) => `${fmtCurrencyAmount(Number(n) || 0, c || "USD")} ${c || ""}`;
  if (!v.onPlan) {
    return (
      <section className={CARD}>
        <h2 className={H2}>{t.seatsTitle}</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">{t.noSeatPlan}</p>
      </section>
    );
  }
  const renewsOn = dmy(data.subscription.paidUntil);
  async function save() {
    setBusy(true); setError(""); setMsg("");
    const res = await fetch(`/api/studios/${slug}/billing`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "change-seats", seats: want, changeId }),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(t.refusal[out.error] || t.failed); return; }
    setChangeId(newId());
    setMsg(out.charge ? t.seatsAdded(money(out.charge.amount, out.charge.currency)) : t.seatsReduced(renewsOn));
    await onChanged();
  }
  return (
    <section className={CARD}>
      <h2 className={H2}>{t.seatsTitle}</h2>
      <p className="font-600">{t.seatsUsed(v.members, v.seats)}</p>
      {v.seatsNext > 0 && <p className="text-sm text-slate-600 dark:text-slate-300">{t.seatsNextOn(v.seatsNext, renewsOn)}</p>}
      {v.perSeat.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
          {v.perSeat.map((b) => <li key={b.label}>{t.perSeat(`${b.label} (${b.max ? `${b.min}–${b.max}` : `${b.min}+`})`, money(b.rate, v.currency))}</li>)}
        </ul>
      )}
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="block"><span className="mb-1 block text-xs font-600 uppercase tracking-wide text-slate-500">{t.seatsField}</span>
          <input type="number" inputMode="numeric" dir="ltr" className={`${INPUT} w-28 tabular-nums`} step={1}
            min={Math.max(v.range?.min || 1, v.members)} max={v.range?.max || undefined}
            value={want || ""} onChange={(e) => { setWant(Math.trunc(Number(e.target.value) || 0)); setMsg(""); setError(""); }} /></label>
        <button type="button" className={BTN} disabled={busy || want === (v.seatsNext || v.seats)} onClick={save}>{busy ? t.sending : t.seatsApply}</button>
      </div>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{want > v.seats ? t.seatsAddNote : want < v.seats ? t.seatsReduceNote(renewsOn) : ""}</p>
      {msg && <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">{msg}</p>}
      {error && <p className="mt-2 text-sm text-rose-600" role="alert">{error}</p>}

      {v.accrued.length > 0 && (
        <div className="mt-4 border-t border-slate-100 pt-3 dark:border-white/10">
          <p className="mb-1 text-xs font-600 uppercase tracking-wide text-slate-500">{t.unbilledTitle}</p>
          <ul className="space-y-1 text-sm">
            {v.accrued.map((c) => (
              <li key={c.id} className="flex justify-between gap-3">
                <span>{t.unbilledLine(c.seatsBefore, c.seatsAfter, dmy(c.from), dmy(lastDayOf(c.to)))}</span>
                <span className="tabular-nums" dir="ltr">{money(c.amount, c.currency)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {v.next && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{t.nextRenewal(dmy(v.next.on), money(v.next.amount, v.next.currency), v.next.seats)}</p>}
    </section>
  );
}

function RequestCard({ data, t }: { data: View; t: Words }) {
  const r = data.paymentRequest;
  if (!r) return null;
  const money = (n: unknown) => `${fmtCurrencyAmount(Number(n) || 0, r.currency)} ${r.currency}`;
  return (
    <section className={CARD}>
      <h2 className={H2}>{t.requestTitle[r.kind]}</h2>
      <p className="mb-3 text-xs text-slate-500">{t.requestIssued(dmy(r.issuedOn))}</p>
      <dl className="space-y-1 text-sm">
        {r.lines.map((l, i) => (
          <div key={i} className="flex justify-between gap-3"><dt className="text-slate-600 dark:text-slate-300">{l.description}</dt><dd className="tabular-nums" dir="ltr">{money(l.amount)}</dd></div>
        ))}
        <div className="flex justify-between gap-3 border-t border-slate-100 pt-1 dark:border-white/10"><dt>{t.requestSubtotal}</dt><dd className="tabular-nums" dir="ltr">{money(r.subtotal)}</dd></div>
        <div className="flex justify-between gap-3"><dt>{t.requestTax(r.taxPercent)}</dt><dd className="tabular-nums" dir="ltr">{money(r.tax)}</dd></div>
        <div className="flex justify-between gap-3 font-700"><dt>{t.requestTotal}</dt><dd className="tabular-nums" dir="ltr">{money(r.total)}</dd></div>
      </dl>
    </section>
  );
}

function Claims({ data, t }: { data: View; t: Words }) {
  const money = (n: unknown, c?: string) => `${fmtCurrencyAmount(Number(n) || 0, c || "USD")} ${c || ""}`;
  return (
    <section className={CARD}>
      <h2 className={H2}>{t.claimsTitle}</h2>
      {data.claims.length === 0 ? <p className="text-sm text-slate-500">{t.noClaims}</p> : (
        <ul className="divide-y divide-slate-100 text-sm dark:divide-white/5">
          {data.claims.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
              <span className="font-600">{c.kind === "transfer" ? t.claimKind.transfer : t.claimKind.refund(c.invoiceNo)}</span>
              {c.kind === "transfer" && <span className="tabular-nums text-slate-600 dark:text-slate-300" dir="ltr">{money(c.amount, c.currency)} · {dmy(c.sentOn)}</span>}
              <span className={`rounded-full px-2 py-0.5 text-xs font-600 ${TONE[c.status] || TONE.withdrawn}`}>{t.claimStatus[c.status] || c.status}</span>
              {c.answer?.reason && <span className="basis-full text-xs text-slate-500 dark:text-slate-400">{c.answer.reason}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Documents({ slug, data, t, onChanged }: { slug: string; data: View; t: Words; onChanged: () => Promise<unknown> }) {
  const [asking, setAsking] = useState("");
  const [reason, setReason] = useState("");
  const [claimId, setClaimId] = useState(newId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const money = (n: unknown, c?: string) => `${fmtCurrencyAmount(Number(n) || 0, c || "USD")} ${c || ""}`;
  const pendingFor = (no: string) => data.claims.some((c) => c.kind === "refund" && c.status === "pending" && c.invoiceNo === no);
  const credited = (no: string) => data.documents.filter((d) => d.kind === "credit-note" && d.creditsInvoice === no).reduce((s, d) => s + d.total, 0);

  async function ask() {
    setBusy(true); setError("");
    const res = await fetch(`/api/studios/${slug}/billing`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "request-refund", claimId, invoiceNo: asking, reason }),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(t.refusal[out.error] || t.failed); return; }
    setClaimId(newId()); setAsking(""); setReason("");
    await onChanged();
  }

  return (
    <section className={CARD}>
      <h2 className={H2}>{t.docsTitle}</h2>
      {data.documents.length === 0 ? <p className="text-sm text-slate-500">{t.noDocs}</p> : (
        <ul className="divide-y divide-slate-100 text-sm dark:divide-white/5">
          {data.documents.map((d) => (
            <li key={d.number} className="py-2.5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-600">{d.kind === "credit-note" ? t.creditNote : t.invoice} <span className="font-mono" dir="ltr">{d.number}</span></span>
                <span className="text-slate-500">{dmy(d.issuedOn)}</span>
                <span className="tabular-nums" dir="ltr">{d.kind === "credit-note" ? "−" : ""}{money(d.total, d.currency)}</span>
                <a className={GHOST} href={`/api/studios/${slug}/billing/documents/${encodeURIComponent(d.number)}`} target="_blank" rel="noreferrer">{t.open}</a>
                {d.kind === "invoice" && credited(d.number) < d.total && !pendingFor(d.number) && asking !== d.number && (
                  <button type="button" className={GHOST} onClick={() => { setAsking(d.number); setError(""); }}>{t.askRefund}</button>
                )}
              </div>
              {asking === d.number && (
                <div className="mt-2 space-y-2">
                  <label className="block"><span className="mb-1 block text-xs text-slate-500">{t.refundReason}</span>
                    <textarea className={INPUT} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
                  <div className="flex gap-2">
                    <button type="button" className={BTN} disabled={busy} onClick={ask}>{busy ? t.sending : t.refundSend}</button>
                    <button type="button" className={GHOST} onClick={() => setAsking("")}>{t.cancel}</button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-2 text-sm text-rose-600" role="alert">{error}</p>}
    </section>
  );
}

function Profile({ slug, data, t }: { slug: string; data: View; t: Words }) {
  const [p, setP] = useState<BillingProfile>(data.profile);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const set = (patch: Partial<BillingProfile>) => { setP((x) => ({ ...x, ...patch })); setMsg(""); };
  async function save() {
    setBusy(true); setMsg("");
    const res = await fetch(`/api/studios/${slug}/billing`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save-profile", ...p }),
    });
    setBusy(false);
    setMsg(res.ok ? t.saved : t.failed);
  }
  const field = (key: keyof BillingProfile, label: string, extra: InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block"><span className="mb-1 block text-xs font-600 text-slate-500">{label}</span>
      <input className={INPUT} value={p[key] || ""} onChange={(e) => set({ [key]: e.target.value })} {...extra} /></label>
  );
  return (
    <section className={CARD}>
      <h2 className={H2}>{t.profileTitle}</h2>
      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{t.profileLead}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {field("name", t.profileName)}
        {field("taxNumber", t.profileTax, { dir: "ltr" })}
        <div className="sm:col-span-2">{field("address", t.profileAddress)}</div>
        {field("country", t.profileCountry, { maxLength: 2, dir: "ltr", className: `${INPUT} uppercase` })}
        {field("email", t.profileEmail, { type: "email", dir: "ltr" })}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button type="button" className={BTN} disabled={busy} onClick={save}>{t.save}</button>
        {msg && <span className="text-sm text-slate-500">{msg}</span>}
      </div>
    </section>
  );
}
