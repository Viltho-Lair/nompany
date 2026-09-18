"use client";

import { useCallback, useState } from "react";
import { Field } from "@/components/fields/Field";
import { reconciliationDict } from "@/shared/studio/reconciliation";
import { useReload } from "@/components/studio2/useReload";
import { moneyText } from "@/shared/money";

// WHAT THE BANK SAYS, AGAINST WHAT THE BOOKS SAY.
//
// The ledger has always been able to report a bank balance and never to check
// it: every posting that touched the account was somebody's word for it, and
// the one document that could contradict them had nowhere to go.
//
// NOTHING IS MATCHED AUTOMATICALLY. Two payments of 500 in one week are
// indistinguishable by amount, and an automatic pairing would silently
// reconcile the wrong two and leave two real discrepancies cancelling each
// other out. The screen suggests; a person confirms.
export default function ReconciliationPanel({ slug, locale = "en" }) {
  const tr = reconciliationDict(locale);
  const [data, setData] = useState(null);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({ date: "", description: "", amount: "" });
  const [csv, setCsv] = useState("");
  const [dateOrder, setDateOrder] = useState("dmy");
  const [importNote, setImportNote] = useState("");
  const [rule, setRule] = useState({ contains: "", accountId: "", direction: "any", memo: "" });
  // ONE MONEY ACCOUNT AT A TIME: a statement is one account's. Empty is the
  // bank (1010), which is what every statement before this was typed against.
  const [accountId, setAccountId] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/finance/reconciliation${accountId ? `?account=${encodeURIComponent(accountId)}` : ""}`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setProblem(body.error || "failed"); return; }
    setData(body);
  }, [slug, accountId, setData, setProblem]);

  useReload(load);

  const send = useCallback(async (method, payload) => {
    setBusy(true); setProblem("");
    const res = await fetch(`/api/studios/${slug}/finance/reconciliation`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setProblem(body.detail || tr.problem(body.error) || "failed"); return false; }
    await load();
    return true;
  }, [slug, load, tr, setBusy, setProblem]);

  // A REFUSAL IS SAID. Reconciling needs the ledger's own right, and on Cash &
  // Bank somebody may hold the cash right without it; this read "…" for ever.
  if (!data) return <p className="text-sm text-slate-500 dark:text-slate-400">{problem ? tr.problem(problem) : "…"}</p>;

  const {
    hasBank, bookBalance, statementBalance, difference, matched,
    onStatementOnly = [], inBooksOnly = [], suggestions = [], book = [], canMatch,
    rules = [], ruleHits = {}, ruleAccounts = [],
  } = data;
  const accountName = (id) => { const a = ruleAccounts.find((x) => x.id === id); return a ? `${a.code} ${a.name}` : ""; };
  const ruleOf = (lineId) => rules.find((r) => r.id === ruleHits[lineId]);
  // A RULE IS OFFERED only where no posting already answers the line.
  const byRule = onStatementOnly.filter((l) => ruleOf(l.id) && !suggestions.some((s) => s.lineId === l.id));

  const suggestionFor = (lineId) => suggestions.find((s) => s.lineId === lineId);
  const entryOf = (id) => book.find((b) => b.entryId === id);
  // A currency's own decimals (shared/money) — two places hid a dinar's third.
  const n = (v) => moneyText(v);

  if (!hasBank) {
    return <p className="text-sm text-amber-700 dark:text-amber-300">{tr.noBankAccount}</p>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.title}</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tr.lead}</p>
        {(data.accounts || []).length > 1 && (
          <div className="mt-3 w-72">
            <Field label={tr.account} as="select" value={data.accountId}
              onChange={(v) => setAccountId(v)}
              options={data.accounts.map((a) => ({ value: a.id, label: `${a.code} ${a.name}` }))} />
          </div>
        )}
      </div>

      {problem && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
          {problem}
        </p>
      )}

      {/* THE DIFFERENCE IS NOT AN ERROR FIGURE. A healthy reconciliation has
          one — uncleared cheques are supposed to be there. What makes it wrong
          is the difference not being explained by the two lists below. */}
      <div className="grid gap-2 sm:grid-cols-3">
        {[[tr.books, bookBalance], [tr.statement, statementBalance], [tr.difference, difference]]
          .map(([label, value]) => (
            <div key={label} className="rounded-xl border border-slate-200 px-3 py-2 dark:border-white/10">
              <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
              <p className="num mt-0.5 text-lg font-700 text-slate-900 dark:text-white">{n(value)}</p>
            </div>
          ))}
      </div>
      <p className="text-xs text-slate-400 dark:text-slate-500">{tr.matchedN(matched)}</p>

      {/* ---- on the statement, not in the books --------------------------- */}
      <div>
        <h4 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.onStatement}</h4>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tr.onStatementLead}</p>
        {onStatementOnly.length === 0 ? (
          <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-300">{tr.allMatched}</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {onStatementOnly.map((l) => {
              const s = suggestionFor(l.id);
              const entry = s && entryOf(s.entryId);
              return (
                <li key={l.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-white/10">
                  <span className="text-slate-500 dark:text-slate-400">{l.date}</span>
                  <span className="text-slate-700 dark:text-slate-200">{l.description}</span>
                  <span className={`num ms-auto ${l.amount < 0 ? "text-rose-600 dark:text-rose-300" : "text-emerald-600 dark:text-emerald-300"}`}>
                    {n(l.amount)}
                  </span>
                  {/* SUGGESTED, NOT APPLIED. The button says what it would pair
                      with, so the person confirming can see whether it is
                      right. */}
                  {canMatch && entry && (
                    <button
                      className="rounded-lg bg-brand-600 px-2 py-1 text-xs font-600 text-white"
                      disabled={busy}
                      onClick={() => send("POST", { action: "match", lineId: l.id, entryId: entry.entryId })}
                    >
                      {tr.matchWith(entry.memo, s.daysApart)}
                    </button>
                  )}
                  {canMatch && !entry && ruleOf(l.id) && (
                    <button className="rounded-lg border border-brand-300 px-2 py-1 text-xs font-600 text-brand-700 dark:border-brand-400/40 dark:text-brand-200"
                      disabled={busy}
                      onClick={() => send("POST", { action: "post-by-rules", accountId: data.accountId, lineIds: [l.id] })}>
                      {tr.postByRule(accountName(ruleOf(l.id).accountId))}
                    </button>
                  )}
                  {canMatch && (
                    <button
                      className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:text-rose-500"
                      disabled={busy}
                      onClick={() => send("DELETE", { id: l.id })}
                    >
                      {tr.remove}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {canMatch && byRule.length > 1 && (
        <button className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-600 text-white disabled:opacity-50" disabled={busy}
          onClick={() => send("POST", { action: "post-by-rules", accountId: data.accountId, lineIds: byRule.map((l) => l.id) })}>
          {tr.applyAll(byRule.length)}
        </button>
      )}

      {/* ---- in the books, not on the statement --------------------------- */}
      <div>
        <h4 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.inBooks}</h4>
        {/* THE FIX IS USUALLY TIME. Calling this an error would send somebody
            chasing a cheque that is simply in the post. */}
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tr.inBooksLead}</p>
        {inBooksOnly.length === 0 ? (
          <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-300">{tr.nothingUncleared}</p>
        ) : (
          <ul className="mt-2 space-y-0.5">
            {inBooksOnly.map((b) => (
              <li key={b.entryId} className="flex flex-wrap gap-2 text-sm text-slate-600 dark:text-slate-300">
                <span className="text-slate-500 dark:text-slate-400">{b.date}</span>
                <span>{b.memo}</span>
                <span className="num ms-auto">{n(b.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ---- import a statement ------------------------------------------ */}
      {canMatch && (
        <div className="space-y-2 rounded-xl border border-slate-200 p-4 dark:border-white/10">
          <h4 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.importTitle}</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400">{tr.importLead}</p>
          <textarea className="h-28 w-full rounded-lg border border-slate-200 bg-white p-2 font-mono text-xs text-slate-800 dark:border-white/15 dark:bg-[#191921] dark:text-slate-100"
            aria-label={tr.importPaste} placeholder={tr.importPaste} value={csv} onChange={(e) => setCsv(e.target.value)} />
          <div className="flex flex-wrap items-end gap-2">
            <input type="file" accept=".csv,text/csv,text/plain" aria-label={tr.importPaste} className="text-xs"
              onChange={async (e) => { const f = e.target.files?.[0]; if (f) setCsv(await f.text()); }} />
            <Field label={tr.dateOrder} as="select" required className="w-48" value={dateOrder} onChange={setDateOrder}
              options={Object.entries(tr.dateOrders).map(([value, label]) => ({ value, label }))} />
            <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-600 text-white disabled:opacity-50"
              disabled={busy || !csv.trim()}
              onClick={async () => {
                setBusy(true); setProblem(""); setImportNote("");
                const res = await fetch(`/api/studios/${slug}/finance/reconciliation`, {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "import", accountId: data.accountId, csv, dateOrder }),
                });
                const body = await res.json().catch(() => ({}));
                setBusy(false);
                if (!res.ok) { setProblem(body.detail || tr.problem(body.error)); return; }
                setImportNote(tr.imported(body.imported, body.skipped, (body.refused || []).length));
                setCsv("");
                await load();
              }}>
              {tr.importButton}
            </button>
          </div>
          {importNote && <p className="text-sm text-emerald-700 dark:text-emerald-300">{importNote}</p>}
        </div>
      )}

      {/* ---- rules ------------------------------------------------------- */}
      {canMatch && (
        <div className="space-y-2 rounded-xl border border-slate-200 p-4 dark:border-white/10">
          <h4 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.rulesTitle}</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400">{tr.rulesLead}</p>
          {rules.length === 0 ? <p className="text-sm text-slate-400">{tr.noRules}</p> : (
            <ul className="space-y-1">
              {rules.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                  <span className="font-mono text-xs">“{r.contains}”</span>
                  <span>→ {accountName(r.accountId)}</span>
                  <span className="text-xs text-slate-400">{tr.directions[r.direction] || r.direction}</span>
                  <button className="ms-auto rounded-lg px-2 py-1 text-xs text-slate-400 hover:text-rose-500" disabled={busy}
                    onClick={() => send("POST", { action: "rule-remove", id: r.id })}>{tr.remove}</button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-end gap-2">
            <Field label={tr.contains} className="w-48" value={rule.contains} onChange={(v) => setRule({ ...rule, contains: v })} />
            <Field label={tr.postTo} as="select" className="w-56" value={rule.accountId} onChange={(v) => setRule({ ...rule, accountId: v })}
              options={ruleAccounts.map((a) => ({ value: a.id, label: `${a.code} ${a.name}` }))} />
            <Field label={tr.direction} as="select" required className="w-44" value={rule.direction} onChange={(v) => setRule({ ...rule, direction: v })}
              options={Object.entries(tr.directions).map(([value, label]) => ({ value, label }))} />
            <Field label={tr.memo} className="w-48" value={rule.memo} onChange={(v) => setRule({ ...rule, memo: v })} />
            <button className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-600 text-slate-700 disabled:opacity-50 dark:border-white/15 dark:text-slate-200"
              disabled={busy || rule.contains.trim().length < 3 || !rule.accountId}
              onClick={async () => { if (await send("POST", { action: "rule", ...rule })) setRule({ contains: "", accountId: "", direction: "any", memo: "" }); }}>
              {tr.addRule}
            </button>
          </div>
        </div>
      )}

      {/* ---- add a line --------------------------------------------------- */}
      {canMatch && (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 p-4 dark:border-white/10">
          <Field label={tr.date} type="date" className="w-full sm:w-40"
            value={draft.date} onChange={(v) => setDraft({ ...draft, date: v })} />
          <Field label={tr.description} className="w-full sm:w-64"
            value={draft.description} onChange={(v) => setDraft({ ...draft, description: v })} />
          {/* SIGNED: money out is negative, read the same way the ledger reads
              it, so nothing has to flip a sign at the point of matching. */}
          <Field label={tr.amount} type="number" className="w-full sm:w-32"
            value={draft.amount} onChange={(v) => setDraft({ ...draft, amount: v })} />
          <button
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-600 text-white disabled:opacity-50"
            disabled={busy || !draft.date || !draft.description.trim() || !Number(draft.amount)}
            onClick={async () => {
              const done = await send("POST", {
                action: "add", accountId: data.accountId, lines: [{ ...draft, amount: Number(draft.amount) }],
              });
              if (done) setDraft({ date: "", description: "", amount: "" });
            }}
          >
            {tr.addLine}
          </button>
        </div>
      )}
    </div>
  );
}
