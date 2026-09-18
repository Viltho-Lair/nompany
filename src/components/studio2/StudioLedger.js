"use client";

import { useCallback, useState } from "react";
import nextDynamic from "next/dynamic";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import { useStudioLocale } from "@/components/studio2/locale";
import { ledgerDict } from "@/shared/studio/ledger";
import { reconciliationDict } from "@/shared/studio/reconciliation";
import { useReload } from "@/components/studio2/useReload";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { moneyText } from "@/shared/money";
import { Field } from "@/components/fields/Field";
import StudioDate from "@/components/fields/StudioDate";
import FinanceSetupNotice from "@/components/studio2/FinanceSetupNotice";

const btn = "rounded-full bg-brand-600 px-4 py-2 text-sm font-600 text-white hover:bg-brand-700 disabled:opacity-50";
const btnGhost = "rounded-full border border-slate-200 px-4 py-2 text-sm font-600 text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5";

// ONE SEND FOR EVERY WRITE ON THIS SCREEN, answering with the refusal's words
// rather than its token, and reloading on success so the trial balance and the
// statements move with the entry that moved them.
async function write(url, method, body) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const out = await res.json().catch(() => ({}));
  return res.ok ? { ok: true, out } : { ok: false, error: String(out.error || "failed") };
}

// THE LEDGER — and until now this section had no screen at all.
//
// `finance-ledger` fell through `StudioFinance`'s view switch to the CASH
// screen, so a studio granted `finance.ledger.view` opened a page of invoices:
// the trial balance, the journal, the profit and loss and the balance sheet
// were all computed by a route nothing in the product called. That is the
// project `/costs` routing bug in a second place, and the shape CLAUDE.md names
// — a section that silently renders the wrong screen is how a right ends up
// exercising nothing (invariant 16).
//
// IT READS ONE ROUTE. Everything below comes from a single GET, because the
// trial balance and the two statements are computed from ONE read of the
// journal — serving them separately would be four reads and four chances for
// the profit and the trial balance to be computed a second apart.
const PeriodsPanel = nextDynamic(() => import("@/components/studio2/PeriodsPanel"),
  { loading: () => <ScreenSkeleton /> });
const ReconciliationPanel = nextDynamic(() => import("@/components/studio2/ReconciliationPanel"),
  { loading: () => <ScreenSkeleton /> });
// THE TAX RETURN reads invoices, credit notes and bills — not the journal (vat.md
// says why) — so it is its own panel with its own read, and it is drawn only
// for a studio with a VAT rate.
const TaxReturnPanel = nextDynamic(() => import("@/components/studio2/TaxReturnPanel"),
  { loading: () => <ScreenSkeleton /> });

// Through shared/money, which shows a currency's own decimals: this was fixed
// at two places and hid the third decimal of every dinar amount.
const money = (n) => moneyText(n);

export default function StudioLedger({ slug }) {
  const locale = useStudioLocale();
  const tr = ledgerDict(locale);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("trial");

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/finance/ledger`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setError(body.error || "failed"); return; }
    setData(body);
  }, [slug, setData, setError]);

  useReload(load);
  useLiveUpdates(slug, "finance-ledger", load);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <ScreenSkeleton />;

  const { trialBalance = {}, journal = [], profitAndLoss = {}, balanceSheet = {} } = data;
  const rows = trialBalance.rows || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-800 text-slate-900 dark:text-white">{tr.title}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tr.lead}</p>
      </div>

      <FinanceSetupNotice items={data.setup} slug={slug} canFix={data.canFixSetup} />

      <div role="tablist" className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-white/10">
        {[["trial", tr.trial], ["journal", tr.journal], ["accounts", tr.accounts], ["pl", tr.pl], ["bs", tr.bs],
          ...(data.taxEnabled ? [["tax", tr.tax]] : []),
          ["reconcile", reconciliationDict(locale).tab], ["periods", tr.periods]]
          .map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
              className={`-mb-px border-b-2 px-4 py-2 font-display text-sm font-600 transition-colors ${
                tab === k
                  ? "border-brand-600 text-slate-900 dark:text-white"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"}`}>
              {label}
            </button>
          ))}
      </div>

      {tab === "trial" && (
        <section className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                <th className="py-1 pe-3 text-start">{tr.account}</th>
                <th className="py-1 pe-3 text-end">{tr.debit}</th>
                <th className="py-1 text-end">{tr.credit}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.accountId} className="border-t border-slate-100 dark:border-white/5">
                  <td className="py-1.5 pe-3 text-slate-700 dark:text-slate-200">
                    <span className="font-mono text-xs text-slate-400 dark:text-slate-500">{r.code}</span> {r.name}
                  </td>
                  <td className="num py-1.5 pe-3 text-end text-slate-600 dark:text-slate-300">{r.debit ? money(r.debit) : ""}</td>
                  <td className="num py-1.5 text-end text-slate-600 dark:text-slate-300">{r.credit ? money(r.credit) : ""}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {/* THE TWO SIDES ARE SHOWN SEPARATELY AND NOT AS A DIFFERENCE. A
                  trial balance that printed one "out by" figure would hide
                  which side is wrong, which is the only thing the report is
                  read for when it does not balance. */}
              <tr className="border-t-2 border-slate-200 font-600 dark:border-white/10">
                <td className="py-1.5 pe-3 text-slate-900 dark:text-white">{tr.total}</td>
                {/* `totalDebit`/`totalCredit`, READ OFF THE MODEL. A first
                    draft guessed `debit`/`credit` — the per-ROW field names —
                    and the footer printed 0.00 under two columns of real
                    figures, which looks like a broken report rather than a
                    wrong field. Found by opening the screen. */}
                <td className="num py-1.5 pe-3 text-end text-slate-900 dark:text-white">{money(trialBalance.totalDebit)}</td>
                <td className="num py-1.5 text-end text-slate-900 dark:text-white">{money(trialBalance.totalCredit)}</td>
              </tr>
            </tfoot>
          </table>
          {trialBalance.balanced === false && (
            <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
              {tr.unbalanced}
            </p>
          )}
        </section>
      )}

      {tab === "journal" && data.canPost && (
        <EntryForm slug={slug} accounts={data.accounts || []} tr={tr} onPosted={load} />
      )}

      {tab === "accounts" && (
        <AccountsPanel slug={slug} accounts={data.accounts || []} rows={rows} canEdit={!!data.canPost} tr={tr} onSaved={load} />
      )}

      {tab === "journal" && (
        <section className="space-y-2">
          {journal.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">{tr.noEntries}</p>
          ) : journal.map((e) => (
            <div key={e.id} className="rounded-xl border border-slate-200 px-3 py-2 dark:border-white/10">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-mono text-slate-900 dark:text-white">{e.reference}</span>
                <span className="text-slate-500 dark:text-slate-400">{e.date}</span>
                <span className="text-slate-600 dark:text-slate-300">{e.memo}</span>
                <span className="ms-auto text-xs text-slate-400 dark:text-slate-500">{e.source?.kind}</span>
                {e.reversedByEntryId && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-white/5 dark:text-slate-400">{tr.reversed}</span>}
                {e.reversalOfEntryId && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-white/5 dark:text-slate-400">{tr.isReversal}</span>}
                {data.canReverse && !e.reversedByEntryId && !e.reversalOfEntryId && (
                  <ReverseButton slug={slug} entry={e} tr={tr} onDone={load} />
                )}
              </div>
              <ul className="mt-1 space-y-0.5">
                {(e.lines || []).map((l, i) => (
                  <li key={i} className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>{rows.find((r) => r.accountId === l.accountId)?.name || l.accountId}</span>
                    <span className="num">{l.debit ? money(l.debit) : `(${money(l.credit)})`}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {tab === "pl" && (
        <Statement tr={tr}
          groups={[[tr.income, profitAndLoss.income, profitAndLoss.totalIncome],
            [tr.expenses, profitAndLoss.expense, profitAndLoss.totalExpense]]}
          total={profitAndLoss.profit} totalLabel={tr.profit} />
      )}
      {/* THE RETAINED RESULT IS SHOWN rather than folded into equity: no
          account holds it until a year-end moves it, so a sheet that hid it
          would report every trading studio out of balance. */}
      {tab === "bs" && (
        <Statement tr={tr}
          groups={[[tr.assets, balanceSheet.asset, balanceSheet.totalAssets],
            [tr.liabilities, balanceSheet.liability, balanceSheet.totalLiabilities],
            [tr.equity, balanceSheet.equity, balanceSheet.totalEquity]]}
          total={balanceSheet.totalAssets} totalLabel={tr.assets}
          note={balanceSheet.balanced ? tr.retained(balanceSheet.retainedResult) : tr.outBy(balanceSheet.difference)} />
      )}

      {tab === "reconcile" && <ReconciliationPanel slug={slug} locale={locale} />}

      {tab === "periods" && <PeriodsPanel slug={slug} locale={locale} />}

      {tab === "tax" && data.taxEnabled && <TaxReturnPanel slug={slug} locale={locale} />}
    </div>
  );
}

// ONE COMPONENT FOR BOTH STATEMENTS. They differ in what the sections are
// called and what the closing figure means; the shape — named sections of
// accounts with a total each — is identical, and two copies would be two places
// a rounding choice could drift.
function Statement({ groups, total, totalLabel, note, tr }) {
  return (
    <section className="space-y-4">
      {groups.map(([name, rows, groupTotal]) => (
        <div key={name}>
          <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{name}</h3>
          {(rows || []).length === 0 ? (
            <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">{tr.nothingHere}</p>
          ) : (
            <ul className="mt-1 space-y-0.5">
              {(rows || []).map((r) => (
                <li key={r.accountId || r.code} className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                  <span>
                    <span className="font-mono text-xs text-slate-400 dark:text-slate-500">{r.code}</span> {r.name}
                  </span>
                  <span className="num">{money(r.amount)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-1 flex justify-between border-t border-slate-100 pt-1 text-sm font-600 text-slate-900 dark:border-white/5 dark:text-white">
            <span>{name}</span><span className="num">{money(groupTotal)}</span>
          </p>
        </div>
      ))}
      <p className="flex justify-between border-t-2 border-slate-200 pt-2 font-display text-sm font-700 text-slate-900 dark:border-white/10 dark:text-white">
        <span>{totalLabel}</span><span className="num">{money(total)}</span>
      </p>
      {note && <p className="text-xs text-slate-400 dark:text-slate-500">{note}</p>}
    </section>
  );
}

// A HAND-KEYED ENTRY. The server refuses anything that does not balance; the
// chip says so before anybody presses Post, in whole minor units so a float
// crumb never reads as "out by 0.00". Retired accounts are not offered.
function EntryForm({ slug, accounts, tr, onPosted }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [memo, setMemo] = useState("");
  const blank = () => ({ accountId: "", debit: "", credit: "" });
  const [lines, setLines] = useState([blank(), blank()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const live = accounts.filter((a) => a.active !== false);
  const minor = (v) => Math.round((Number(v) || 0) * 1000);
  const debit = lines.reduce((s, l) => s + minor(l.debit), 0);
  const credit = lines.reduce((s, l) => s + minor(l.credit), 0);
  const filled = lines.filter((l) => l.accountId && (minor(l.debit) > 0) !== (minor(l.credit) > 0));
  const ready = filled.length >= 2 && filled.length === lines.filter((l) => l.accountId || l.debit || l.credit).length
    && debit === credit && debit > 0;
  const set = (i, k, v) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l)));

  if (!open) return <button className={btn} onClick={() => setOpen(true)}>{tr.newEntry}</button>;
  return (
    <section className="rounded-2xl border border-brand-500/40 p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={tr.date} filled={!!date}><StudioDate value={date} onChange={setDate} /></Field>
        <div className="sm:col-span-2"><Field label={tr.memo} value={memo} onChange={setMemo} /></div>
      </div>
      <div className="mt-3 space-y-2">
        {lines.map((l, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_9rem_9rem_auto]">
            <Field label={tr.account} as="select" value={l.accountId} onChange={(v) => set(i, "accountId", v)}
              options={[{ value: "", label: tr.chooseAccount }, ...live.map((a) => ({ value: a.id, label: `${a.code} ${a.name}` }))]} />
            <Field label={tr.debit} type="number" value={l.debit} onChange={(v) => set(i, "debit", v)} />
            <Field label={tr.credit} type="number" value={l.credit} onChange={(v) => set(i, "credit", v)} />
            <button className={`${btnGhost} self-end`} disabled={lines.length <= 2}
              onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} aria-label="remove">×</button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button className={btnGhost} onClick={() => setLines((ls) => [...ls, blank()])}>{tr.addLine}</button>
        {(debit > 0 || credit > 0) && <span className={`rounded-full px-3 py-1 text-xs font-600 ${debit === credit && debit > 0
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
          : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"}`}>
          {debit === credit && debit > 0 ? tr.balancedChip : tr.difference(money(Math.abs(debit - credit) / 1000))}
        </span>}
        <span className="flex-1" />
        <button className={btnGhost} onClick={() => { setOpen(false); setError(""); }}>{tr.cancel}</button>
        <button className={btn} disabled={busy || !ready} onClick={async () => {
          setBusy(true); setError("");
          const r = await write(`/api/studios/${slug}/finance/ledger`, "POST", {
            date, memo,
            lines: filled.map((l) => ({ accountId: l.accountId, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0 })),
          });
          setBusy(false);
          if (!r.ok) { setError(tr.problem(r.error)); return; }
          setOpen(false); setMemo(""); setLines([blank(), blank()]);
          await onPosted();
        }}>{busy ? tr.posting : tr.post}</button>
      </div>
      {error && <p className="mt-2 text-sm text-rose-600 dark:text-rose-300">{error}</p>}
    </section>
  );
}

// REVERSING ASKS WHY. The reason becomes the mirror entry's memo, which is the
// only place anybody reading the journal later will find it.
function ReverseButton({ slug, entry, tr, onDone }) {
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  if (!asking) return <button className="text-xs font-600 text-brand-700 hover:underline dark:text-brand-300" onClick={() => setAsking(true)}>{tr.reverse}</button>;
  return (
    <span className="flex w-full flex-wrap items-end gap-2">
      <span className="min-w-60 flex-1"><Field label={tr.reverseReason} value={reason} onChange={setReason} /></span>
      <button className={btnGhost} onClick={() => setAsking(false)}>{tr.cancel}</button>
      <button className={btn} disabled={!reason.trim()} onClick={async () => {
        const r = await write(`/api/studios/${slug}/finance/ledger`, "PATCH", { id: entry.id, reason });
        if (!r.ok) { setError(tr.problem(r.error)); return; }
        setAsking(false); await onDone();
      }}>{tr.reverse}</button>
      {error && <span className="w-full text-sm text-rose-600 dark:text-rose-300">{error}</span>}
    </span>
  );
}

// THE CHART, WITH ITS BALANCES. A retired account stays listed — its postings
// are history — and says so. Every refusal comes back in words.
function AccountsPanel({ slug, accounts, rows, canEdit, tr, onSaved }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  // ON THE ACCOUNT'S OWN SIDE, and signed. Shown unsigned, an overdrawn bank
  // read as 7,000 in the bank — found by opening the screen. An asset or an
  // expense reads debit minus credit; the other three read credit minus debit;
  // a balance on the wrong side shows as a negative, the way the statements do.
  const net = (a) => {
    const r = rows.find((x) => x.accountId === a.id);
    if (!r) return 0;
    const d = (r.debit || 0) - (r.credit || 0);
    return a.type === "asset" || a.type === "expense" ? d : -d;
  };
  const save = async (method, body) => {
    setError("");
    const r = await write(`/api/studios/${slug}/finance/ledger/accounts`, method, body);
    if (!r.ok) { setError(tr.problem(r.error)); return false; }
    await onSaved(); return true;
  };
  return (
    <section className="space-y-3">
      {canEdit && !adding && <button className={btn} onClick={() => { setAdding(true); setEditing(null); }}>{tr.addAccount}</button>}
      {adding && <AccountForm accounts={accounts} tr={tr} onCancel={() => setAdding(false)}
        onSave={async (v) => { if (await save("POST", v)) setAdding(false); }} />}
      {error && <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <th className="py-1 pe-3 text-start">{tr.code}</th>
              <th className="py-1 pe-3 text-start">{tr.name}</th>
              <th className="py-1 pe-3 text-start">{tr.type}</th>
              <th className="py-1 pe-3 text-end">{tr.balance}</th>
              <th className="py-1" />
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (editing === a.id ? (
              <tr key={a.id}><td colSpan={5} className="py-2">
                <AccountForm account={a} accounts={accounts} tr={tr} onCancel={() => setEditing(null)}
                  onSave={async (v) => { if (await save("PUT", { id: a.id, ...v })) setEditing(null); }} />
              </td></tr>
            ) : (
              <tr key={a.id} className={`border-t border-slate-100 dark:border-white/5 ${a.active === false ? "opacity-60" : ""}`}>
                <td className="py-1.5 pe-3 font-mono text-xs text-slate-500 dark:text-slate-400">{a.code}</td>
                <td className="py-1.5 pe-3 text-slate-800 dark:text-slate-100">
                  {a.parentId && <span className="text-slate-400">↳ </span>}{a.name}
                  {a.active === false && <span className="ms-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-white/5">{tr.retired}</span>}
                  {a.type === "asset" && (a.cash || a.code === "1000" || a.code === "1010") && (
                    <span className="ms-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{tr.moneyTag}</span>
                  )}
                </td>
                <td className="py-1.5 pe-3 text-slate-500 dark:text-slate-400">{tr.typeLabel(a.type)}</td>
                <td className="num py-1.5 pe-3 text-end text-slate-700 dark:text-slate-200">{net(a) ? money(net(a)) : ""}</td>
                <td className="py-1.5 text-end">
                  {canEdit && (
                    <span className="flex justify-end gap-3 text-xs font-600">
                      <button className="text-brand-700 hover:underline dark:text-brand-300" onClick={() => { setEditing(a.id); setAdding(false); }}>{tr.rename}</button>
                      <button className="text-slate-500 hover:underline dark:text-slate-400"
                        onClick={() => save("PUT", { id: a.id, active: a.active === false })}>
                        {a.active === false ? tr.restore : tr.retire}
                      </button>
                    </span>
                  )}
                </td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AccountForm({ account, accounts, tr, onCancel, onSave }) {
  const [f, setF] = useState({
    code: account?.code || "", name: account?.name || "", type: account?.type || "expense", parentId: account?.parentId || "",
    cash: !!account?.cash,
  });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const parents = accounts.filter((a) => a.type === f.type && a.id !== account?.id && a.active !== false);
  return (
    <div className="rounded-2xl border border-brand-500/40 p-4">
      <div className="grid gap-3 sm:grid-cols-4">
        {/* THE CODE IS FIXED ONCE AN ACCOUNT EXISTS: the postings find accounts by it. */}
        <Field label={tr.code} required value={f.code} disabled={!!account} onChange={(v) => set("code", v)} />
        <Field label={tr.name} required value={f.name} onChange={(v) => set("name", v)} />
        <Field label={tr.type} as="select" value={f.type} onChange={(v) => setF((p) => ({ ...p, type: v, parentId: "" }))}
          options={["asset", "liability", "equity", "income", "expense"].map((t) => ({ value: t, label: tr.typeLabel(t) }))} />
        <Field label={tr.parent} as="select" value={f.parentId} onChange={(v) => set("parentId", v)}
          options={[{ value: "", label: tr.noParent }, ...parents.map((a) => ({ value: a.id, label: `${a.code} ${a.name}` }))]} />
      </div>
      {/* ONLY AN ASSET HOLDS MONEY, and the default Cash and Bank always do. */}
      {f.type === "asset" && account?.code !== "1000" && account?.code !== "1010" && (
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
          <input type="checkbox" checked={f.cash} onChange={(e) => set("cash", e.target.checked)} />
          {tr.cashFlag}
        </label>
      )}
      <div className="mt-3 flex gap-2">
        <button className={btn} disabled={busy || !f.name.trim() || !f.code.trim()} onClick={async () => {
          setBusy(true);
          const cash = f.type === "asset" ? f.cash : false;
          await onSave(account
            ? { name: f.name, type: f.type, parentId: f.parentId, ...(account.cash !== cash && f.type === "asset" ? { cash } : {}) }
            : { ...f, cash });
          setBusy(false);
        }}>{tr.save}</button>
        <button className={btnGhost} onClick={onCancel}>{tr.cancel}</button>
      </div>
    </div>
  );
}
