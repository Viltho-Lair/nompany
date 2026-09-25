"use client";

import { useState } from "react";
import { fmtCurrencyAmount } from "@/lib/pricing";
import { billingDict } from "@/shared/studio/billing";

// PAYING BY BANK TRANSFER — the details to pay to, then "I've sent it" (the
// owner, 26/09/2026). Shown in the upgrade dialog once a package is requested
// and on the account page's Billing view; both hand it the same payload,
// GET /api/studios/<slug>/billing.
//
// IT NEVER BLOCKS THE STUDIO. It is a panel somebody opened, not a gate in
// front of the work: the studio stays reachable whatever is on it, and a claim
// only ever makes a studio MORE usable (it holds the ladder while nompany checks
// the bank — shared/billingClaims).
//
// THE CLAIM ID IS MINTED BEFORE IT IS SENT and replaced only after it lands, so
// pressing the button twice, or again after a timeout, is one claim.

const newId = () => (globalThis.crypto?.randomUUID?.() || `cl_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`);
// THE CUSTOMER'S OWN DAY, not UTC's: the day they sent it is the day on their
// bank's slip, and in Amman the UTC date is yesterday until three in the morning.
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const dmy = (d) => (/^\d{4}-\d{2}-\d{2}/.test(String(d || "")) ? String(d).slice(0, 10).split("-").reverse().join("/") : "");

const INPUT = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 dark:border-white/15 dark:bg-white/5 dark:text-white";
const LABEL = "mb-1 block text-xs font-600 text-slate-500 dark:text-slate-400";

function Copyable({ label, value, t, mono = false }) {
  const [done, setDone] = useState(false);
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <div className="min-w-0">
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <p className={`break-all text-sm font-600 ${mono ? "font-mono" : ""}`} dir="ltr">{value}</p>
      </div>
      <button type="button" className="shrink-0 rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:border-slate-300 dark:border-white/15 dark:text-slate-300"
        onClick={async () => { try { await navigator.clipboard.writeText(value.replace(/\s+/g, label === "IBAN" ? "" : " ")); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* no clipboard: the value is on screen */ } }}>
        {done ? t.copied : t.copy}
      </button>
    </div>
  );
}

export default function TransferPanel({ slug, data, locale = "en", onChanged }) {
  const t = billingDict(locale);
  const ar = locale === "ar";
  const req = data?.request || null;
  const open = (data?.claims || []).find((c) => c.kind === "transfer" && c.status === "pending") || null;
  const bank = data?.pay?.bankTransfer || null;
  const [claimId, setClaimId] = useState(newId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(() => ({
    amount: req ? String(req.total) : "", currency: req?.currency || bank?.accounts?.[0]?.currency || "",
    sentOn: today(), bankReference: "", payerName: "", note: "",
  }));
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const money = (n, c) => `${fmtCurrencyAmount(Number(n) || 0, c || "USD")} ${c || ""}`;

  async function post(body) {
    setBusy(true); setError("");
    const res = await fetch(`/api/studios/${slug}/billing`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(t.refusal[out.error] || t.failed); return false; }
    await onChanged?.();
    return true;
  }

  async function claim() {
    const ok = await post({ action: "claim-transfer", claimId, ...form, amount: Number(form.amount), currency: form.currency.toUpperCase() });
    if (ok) setClaimId(newId());
  }

  if (open) {
    return (
      <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950 dark:border-sky-400/30 dark:bg-sky-500/10 dark:text-sky-100">
        <p className="font-700">{t.pendingTitle}</p>
        <p className="mt-1">{t.pendingBody(money(open.amount, open.currency), dmy(open.sentOn), data?.holdHours ?? 48)}</p>
        <button type="button" disabled={busy} onClick={() => post({ action: "withdraw-claim", claimId: open.id })}
          className="mt-3 text-xs text-sky-800 underline underline-offset-2 dark:text-sky-200">{t.withdraw}</button>
        {error && <p className="mt-2 text-sm text-rose-600" role="alert">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4 text-sm">
      <div className="rounded-xl bg-slate-50 p-4 dark:bg-white/5">
        {req ? (
          <>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t.toPay}</p>
            <p className="font-display text-xl font-800 tabular-nums" dir="ltr">{money(req.total, req.currency)}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t.forPlan(req.packageName || req.packageId, req.cycle === "yearly" ? t.yearly : t.monthly)}</p>
          </>
        ) : <p className="text-slate-600 dark:text-slate-300">{t.noRequest}</p>}
      </div>

      {!bank ? <p className="text-slate-600 dark:text-slate-300">{t.noMethods}</p> : (
        <div>
          <p className="mb-1 font-700">{t.bankTitle}</p>
          {(ar ? bank.instructionsAr || bank.instructions : bank.instructions) && (
            <p className="mb-2 whitespace-pre-line text-slate-600 dark:text-slate-300">{ar ? bank.instructionsAr || bank.instructions : bank.instructions}</p>
          )}
          <div className="space-y-3">
            {bank.accounts.map((a) => (
              <div key={a.id} className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
                <p className="mb-1 text-xs font-600 uppercase tracking-wide text-slate-500">{a.currency ? t.currency(a.currency) : t.anyCurrency}</p>
                <Copyable label={t.accountName} value={a.accountName} t={t} />
                <Copyable label={t.bankName} value={a.bankName} t={t} />
                <Copyable label="IBAN" value={a.iban} t={t} mono />
                <Copyable label={t.swift} value={a.swift} t={t} mono />
                <Copyable label={t.bankAddress} value={a.bankAddress} t={t} />
              </div>
            ))}
            <div className="rounded-xl border border-dashed border-slate-300 p-3 dark:border-white/15">
              <Copyable label={t.reference} value={data.reference} t={t} mono />
              <p className="text-xs text-slate-500 dark:text-slate-400">{t.referenceHint}</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-400">{t.cardLater}</p>
        </div>
      )}

      {bank && (
        <fieldset className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
          <legend className="px-1 font-700">{t.claimTitle}</legend>
          <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{t.claimLead(data?.holdHours ?? 48)}</p>
          <div className="grid gap-3 sm:grid-cols-[1fr,6rem]">
            <label><span className={LABEL}>{t.amount}</span><input className={INPUT} type="number" min="0" step="any" dir="ltr" value={form.amount} onChange={(e) => set({ amount: e.target.value })} /></label>
            <label><span className={LABEL}>&nbsp;</span><input className={`${INPUT} uppercase`} maxLength={3} dir="ltr" placeholder="USD" value={form.currency} onChange={(e) => set({ currency: e.target.value })} /></label>
            <label><span className={LABEL}>{t.sentOn}</span><input className={INPUT} type="date" dir="ltr" max={today()} value={form.sentOn} onChange={(e) => set({ sentOn: e.target.value })} /></label>
            <span />
            <label className="sm:col-span-2"><span className={LABEL}>{t.bankReference}</span><input className={INPUT} dir="ltr" value={form.bankReference} onChange={(e) => set({ bankReference: e.target.value })} /><span className="mt-1 block text-xs text-slate-400">{t.bankReferenceHint}</span></label>
            <label className="sm:col-span-2"><span className={LABEL}>{t.payerName}</span><input className={INPUT} value={form.payerName} onChange={(e) => set({ payerName: e.target.value })} /></label>
            <label className="sm:col-span-2"><span className={LABEL}>{t.note}</span><textarea className={INPUT} rows={2} value={form.note} onChange={(e) => set({ note: e.target.value })} /></label>
          </div>
          <button type="button" onClick={claim} disabled={busy}
            className="mt-3 w-full rounded-full bg-brand-600 px-5 py-2.5 font-display text-sm font-700 text-white hover:bg-brand-700 disabled:opacity-60">
            {busy ? t.sending : t.claimSend}
          </button>
          {error && <p className="mt-2 text-sm text-rose-600" role="alert">{error}</p>}
        </fieldset>
      )}
    </div>
  );
}
