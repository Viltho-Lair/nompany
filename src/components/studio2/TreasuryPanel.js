"use client";

import { useCallback, useState } from "react";
import { Field } from "@/components/fields/Field";
import { treasuryDict } from "@/shared/studio/treasury";
import { useReload } from "@/components/studio2/useReload";

// CASH THAT HAS NOT MOVED YET.
//
// The product knows what it is owed and what it owes, and has never been able
// to say when the bank account runs out — so "can we pay the subcontractors on
// the 30th" was answered by somebody adding up spreadsheets, and answered again
// next week.
//
// Three things, one question: post-dated cheques (ubiquitous in this product's
// region and modelled nowhere), the forecast they feed, and the letters of
// guarantee holding a studio's money at the bank.
export default function TreasuryPanel({ slug, locale = "en" }) {
  const tr = treasuryDict(locale);
  const [data, setData] = useState(null);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const [cheque, setCheque] = useState(null);
  const [guarantee, setGuarantee] = useState(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/finance/treasury`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setProblem(body.error || "failed"); return; }
    setData(body);
  }, [slug, setData, setProblem]);

  useReload(load);

  const send = useCallback(async (payload) => {
    setBusy(true); setProblem("");
    const res = await fetch(`/api/studios/${slug}/finance/treasury`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setProblem(body.detail || tr.problem(body.error) || "failed"); return false; }
    await load();
    return true;
  }, [slug, load, tr, setBusy, setProblem]);

  if (!data) return <p className="text-sm text-slate-500 dark:text-slate-400">…</p>;

  const {
    from, opening, cheques = [], guarantees = [], lockedUp = {}, buckets = [],
    shortfall: gap, canManage,
  } = data;
  const n = (v) => new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(Number(v) || 0);

  return (
    <div className="space-y-6">
      {problem && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
          {problem}
        </p>
      )}

      {/* ---- the forecast --------------------------------------------------- */}
      <section>
        <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.forecast}</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tr.forecastLead(n(opening))}</p>

        {/* NULL IS NOT "FINE": it means nothing in the horizon takes the
            account under, which is why the horizon is named. */}
        {gap ? (
          <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
            {tr.goesUnder(gap.from, n(gap.closing))}
          </p>
        ) : (
          <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-300">{tr.staysAbove(buckets.length)}</p>
        )}

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                <th className="py-1 pe-3 text-start">{tr.week}</th>
                <th className="py-1 pe-3 text-end">{tr.moneyIn}</th>
                <th className="py-1 pe-3 text-end">{tr.moneyOut}</th>
                <th className="py-1 text-end">{tr.closing}</th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((b) => (
                <tr key={b.from} className="border-t border-slate-100 dark:border-white/5">
                  <td className="py-1.5 pe-3 text-slate-600 dark:text-slate-300">{b.from}</td>
                  <td className="num py-1.5 pe-3 text-end text-emerald-600 dark:text-emerald-300">
                    {b.in ? n(b.in) : ""}
                  </td>
                  <td className="num py-1.5 pe-3 text-end text-rose-600 dark:text-rose-300">
                    {b.out ? n(b.out) : ""}
                  </td>
                  {/* THE CLOSING BALANCE IS CUMULATIVE, which is the point: a
                      week that is net positive can still be the week the
                      account goes under. */}
                  <td className={`num py-1.5 text-end font-600 ${
                    b.closing < 0 ? "text-rose-600 dark:text-rose-300" : "text-slate-900 dark:text-white"}`}>
                    {n(b.closing)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---- cheques -------------------------------------------------------- */}
      <section>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.cheques}</h3>
          {canManage && !cheque && (
            <button className="ms-auto rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 dark:border-white/15 dark:text-slate-300"
              onClick={() => setCheque({ direction: "in", party: "", number: "", amount: "", dueOn: from, bank: "" })}>
              {tr.addCheque}
            </button>
          )}
        </div>

        {cheque && (
          <div className="mt-2 flex flex-wrap items-end gap-2 rounded-xl border border-brand-200 p-4 dark:border-brand-400/30">
            {/* THE DIRECTION CARRIES THE SIGN, so the amount is always
                positive — the rule a payslip's allowances and deductions
                follow, and for the same reason. */}
            <Field label={tr.direction} as="select" className="w-full sm:w-36"
              value={cheque.direction} onChange={(v) => setCheque({ ...cheque, direction: v })}
              options={[{ value: "in", label: tr.incoming }, { value: "out", label: tr.outgoing }]} />
            <Field label={tr.party} required className="w-full sm:w-52"
              value={cheque.party} onChange={(v) => setCheque({ ...cheque, party: v })} />
            <Field label={tr.number} required className="w-full sm:w-32"
              value={cheque.number} onChange={(v) => setCheque({ ...cheque, number: v })} />
            <Field label={tr.amount} type="number" className="w-full sm:w-32"
              value={cheque.amount} onChange={(v) => setCheque({ ...cheque, amount: v })} />
            <Field label={tr.dueOn} type="date" className="w-full sm:w-40"
              value={cheque.dueOn} onChange={(v) => setCheque({ ...cheque, dueOn: v })} />
            <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-600 text-white disabled:opacity-50"
              disabled={busy}
              onClick={async () => {
                const done = await send({ action: "cheque", ...cheque, amount: Number(cheque.amount) });
                if (done) setCheque(null);
              }}>
              {tr.save}
            </button>
            <button className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 dark:border-white/15 dark:text-slate-300"
              onClick={() => { setCheque(null); setProblem(""); }}>
              {tr.cancel}
            </button>
          </div>
        )}

        {cheques.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{tr.noCheques}</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {cheques.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-white/10">
                <span className="font-mono text-slate-900 dark:text-white">{c.number}</span>
                <span className="text-slate-600 dark:text-slate-300">{c.party}</span>
                <span className="text-xs text-slate-400 dark:text-slate-500">{c.dueOn}</span>
                <span className={`num ms-auto ${c.direction === "in" ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300"}`}>
                  {c.direction === "in" ? "+" : "−"}{n(c.amount)}
                </span>
                <span className="w-20 text-end text-xs text-slate-500 dark:text-slate-400">{tr.status(c.status)}</span>
                {canManage && c.status === "held" && (
                  <button className="rounded-lg bg-brand-600 px-2 py-1 text-xs font-600 text-white" disabled={busy}
                    onClick={() => send({ action: "move", id: c.id, status: "deposited" })}>
                    {tr.deposit}
                  </button>
                )}
                {canManage && c.status === "deposited" && (
                  <>
                    <button className="rounded-lg bg-brand-600 px-2 py-1 text-xs font-600 text-white" disabled={busy}
                      onClick={() => send({ action: "move", id: c.id, status: "cleared" })}>
                      {tr.cleared}
                    </button>
                    {/* A BOUNCE AND A RETURN ARE DIFFERENT EVENTS — one is the
                        bank refusing it, the other the studio handing it back —
                        and a register calling both "cancelled" could not tell a
                        studio which customers pay in paper that fails. */}
                    <button className="rounded-lg border border-rose-200 px-2 py-1 text-xs text-rose-600 dark:border-rose-400/30 dark:text-rose-300"
                      disabled={busy}
                      onClick={() => send({ action: "move", id: c.id, status: "bounced" })}>
                      {tr.bounced}
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---- guarantees ----------------------------------------------------- */}
      <section>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.guarantees}</h3>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {tr.locked(n(lockedUp.margin), n(lockedUp.amount), lockedUp.count || 0)}
          </span>
          {canManage && !guarantee && (
            <button className="ms-auto rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 dark:border-white/15 dark:text-slate-300"
              onClick={() => setGuarantee({ reference: "", beneficiary: "", kind: "", amount: "", issuedOn: from, expiresOn: "", margin: "" })}>
              {tr.addGuarantee}
            </button>
          )}
        </div>

        {guarantee && (
          <div className="mt-2 flex flex-wrap items-end gap-2 rounded-xl border border-brand-200 p-4 dark:border-brand-400/30">
            <Field label={tr.reference} required className="w-full sm:w-36"
              value={guarantee.reference} onChange={(v) => setGuarantee({ ...guarantee, reference: v })} />
            <Field label={tr.beneficiary} required className="w-full sm:w-52"
              value={guarantee.beneficiary} onChange={(v) => setGuarantee({ ...guarantee, beneficiary: v })} />
            <Field label={tr.amount} type="number" className="w-full sm:w-32"
              value={guarantee.amount} onChange={(v) => setGuarantee({ ...guarantee, amount: v })} />
            <Field label={tr.margin} type="number" className="w-full sm:w-32"
              value={guarantee.margin} onChange={(v) => setGuarantee({ ...guarantee, margin: v })} />
            <Field label={tr.expiresOn} type="date" required className="w-full sm:w-40"
              value={guarantee.expiresOn} onChange={(v) => setGuarantee({ ...guarantee, expiresOn: v })} />
            <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-600 text-white disabled:opacity-50"
              disabled={busy}
              onClick={async () => {
                const done = await send({
                  action: "guarantee", ...guarantee,
                  amount: Number(guarantee.amount), margin: Number(guarantee.margin) || 0,
                });
                if (done) setGuarantee(null);
              }}>
              {tr.save}
            </button>
            <button className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 dark:border-white/15 dark:text-slate-300"
              onClick={() => { setGuarantee(null); setProblem(""); }}>
              {tr.cancel}
            </button>
          </div>
        )}

        {guarantees.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{tr.noGuarantees}</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {guarantees.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-white/10">
                <span className="font-mono text-slate-900 dark:text-white">{g.reference}</span>
                <span className="text-slate-600 dark:text-slate-300">{g.beneficiary}</span>
                <span className="num ms-auto text-slate-700 dark:text-slate-200">{n(g.amount)}</span>
                {/* `expired` IS NOT `released`, and the difference is money:
                    expiry at the bank does not return the margin. */}
                <span className={`w-24 text-end text-xs font-600 ${
                  g.state === "expired" ? "text-rose-600 dark:text-rose-300"
                    : g.state === "expiring" ? "text-amber-600 dark:text-amber-300"
                      : g.state === "released" ? "text-slate-400 dark:text-slate-500"
                        : "text-emerald-600 dark:text-emerald-300"}`}>
                  {tr.state(g.state)} {g.expiresOn}
                </span>
                {canManage && !g.released && (
                  <button className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 dark:border-white/15 dark:text-slate-300"
                    disabled={busy}
                    onClick={() => send({ action: "release", id: g.id })}>
                    {tr.release}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
