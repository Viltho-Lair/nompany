"use client";

import { Fragment, useCallback, useState } from "react";
import { Field } from "@/components/fields/Field";
import { payrollDict } from "@/shared/studio/payroll";
import { useReload } from "@/components/studio2/useReload";
import { panel, btn, btnGhost, btnRow, btnRowPrimary, th, money, Dialog, StatTile, Empty } from "@/components/studio2/ui";

// PAYROLL — what people are paid, and the runs that pay them.
//
// `hr.employees.salary` has existed since the catalogue was written, labelled
// "See pay and salary", and nothing in this product stored a salary. This is
// the record that right was always describing, and `hr.payroll` is the one that
// opens the whole company's wage bill rather than one person's line.
//
// IT VALIDATES NOTHING ITSELF. `modules/hr/payroll` holds the rules and the
// server refuses on them.
//
// REDESIGNED 10/09/2026 because the first version stacked everything into three
// boxes of chips: runs as a strip of tiny inline buttons, raw unformatted
// numbers, a payslip table that appeared somewhere below, and a pay form opened
// inline in the middle of the page. It is a summary, then ONE of two views —
// the runs, or what people are paid — each a real table, with money formatted
// and a run's payslips opening directly under that run.

const RUN_TONE = {
  Draft: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300",
  Approved: "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200",
  Paid: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
};

// A PERIOD IS STORED AS 2026-09 and read as "September 2026". Latin digits in
// both languages, the same as the amounts beside it.
function monthLabel(period, locale) {
  const [y, m] = String(period || "").split("-").map(Number);
  if (!y || !m) return period || "";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-latn" : "en-GB", { month: "long", year: "numeric" })
    .format(new Date(y, m - 1, 1));
}

const sum = (rows, pick) => rows.reduce((t, r) => t + (Number(pick(r)) || 0), 0);

// ONLY THE LAST FOUR. The whole account number is on the record and in the bank
// file; a list of everybody's pay is not the place to print it in full.
const maskIban = (iban) => {
  const s = String(iban || "").replace(/\s+/g, "");
  return s ? `•••• ${s.slice(-4)}` : "";
};

const pill = "inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-600";

function RunPill({ status, tr }) {
  return <span className={`${pill} ${RUN_TONE[status] || RUN_TONE.Draft}`}>{tr.status(status)}</span>;
}

// ONE RUN'S PAYSLIPS, opened under the run itself: its four totals first, then
// the lines, then the totals again as a footer so a column can be checked.
function Payslips({ run, tr }) {
  const t = run.totals || {};
  const cells = [[tr.basic, t.basic], [tr.allowances, t.allowances], [tr.deductions, t.deductions], [tr.net, t.net]];
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        {cells.map(([label, value], i) => (
          <div key={label} className={`rounded-xl px-4 py-3 ${i === 3 ? "bg-brand-50 dark:bg-brand-500/10" : "bg-white dark:bg-white/5"}`}>
            <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
            <p className="num mt-0.5 font-display text-lg font-700 text-slate-900 dark:text-white">{money(value)}</p>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr>
              <th className={`${th} text-start`}>{tr.person}</th>
              <th className={`${th} text-end`}>{tr.basic}</th>
              <th className={`${th} text-end`}>{tr.allowances}</th>
              <th className={`${th} text-end`}>{tr.deductions}</th>
              <th className={`${th} text-end`}>{tr.net}</th>
            </tr>
          </thead>
          <tbody>
            {(run.lines || []).map((l) => (
              <tr key={l.collaboratorId} className="border-t border-slate-100 dark:border-white/5">
                <td className="py-2.5 pe-3 text-slate-800 dark:text-slate-100">
                  {l.alias}
                  {/* UNPAID LEAVE IS PRO-RATED ON THE BASIC ALONE — an allowance
                      for a car does not stop because somebody took a week unpaid. */}
                  {l.unpaidDays > 0 && (
                    <span className={`ms-2 ${pill} bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300`}>
                      {tr.unpaid(l.unpaidDays)}
                    </span>
                  )}
                </td>
                <td className="num py-2.5 pe-3 text-end text-slate-600 dark:text-slate-300">{money(l.basic)}</td>
                <td className="num py-2.5 pe-3 text-end text-slate-600 dark:text-slate-300">{money(l.allowances)}</td>
                <td className="num py-2.5 pe-3 text-end text-slate-600 dark:text-slate-300">{money(l.deductions)}</td>
                {/* A NET BELOW NOUGHT IS REPORTED, NEVER CLAMPED — clamping would
                    forgive the difference and leave the ledger short by exactly
                    the amount nobody noticed. */}
                <td className={`num py-2.5 text-end font-600 ${l.net < 0 ? "text-rose-600 dark:text-rose-300" : "text-slate-900 dark:text-white"}`}>
                  {money(l.net)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 dark:border-white/10">
              <td className="py-2.5 pe-3 font-600 text-slate-900 dark:text-white">{tr.total}</td>
              <td className="num py-2.5 pe-3 text-end font-600 text-slate-700 dark:text-slate-200">{money(t.basic)}</td>
              <td className="num py-2.5 pe-3 text-end font-600 text-slate-700 dark:text-slate-200">{money(t.allowances)}</td>
              <td className="num py-2.5 pe-3 text-end font-600 text-slate-700 dark:text-slate-200">{money(t.deductions)}</td>
              <td className="num py-2.5 text-end font-700 text-slate-900 dark:text-white">{money(t.net)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default function PayrollPanel({ slug, locale = "en" }) {
  const tr = payrollDict(locale);
  const [data, setData] = useState(null);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);
  const [period, setPeriod] = useState("");
  const [open, setOpen] = useState(null);
  const [pane, setPane] = useState("runs");

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/hr/payroll`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setProblem(body.error || "failed"); return; }
    setData(body);
  }, [slug, setData, setProblem]);

  useReload(load);

  const send = useCallback(async (payload) => {
    setBusy(true); setProblem("");
    const res = await fetch(`/api/studios/${slug}/hr/payroll`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setProblem(body.detail || tr.problem(body.error) || "failed"); return null; }
    await load();
    return body;
  }, [slug, load, tr, setBusy, setProblem]);

  // THE PAYSLIPS OPEN UNDER THEIR RUN, and a second press closes them.
  const toggleRun = async (id) => {
    if (open?.id === id) { setOpen(null); return; }
    const res = await fetch(`/api/studios/${slug}/hr/payroll?run=${encodeURIComponent(id)}`);
    const body = await res.json().catch(() => ({}));
    if (res.ok) setOpen(body.run);
  };

  if (!data) return <p className="text-sm text-slate-500 dark:text-slate-400">…</p>;

  const { people = [], runs = [], canManage, canApprove, isAdmin } = data;
  const withPay = people.filter((p) => p.basic !== null);
  const missing = people.length - withPay.length;
  const latest = runs[0];
  const awaiting = runs.filter((r) => r.status === "Draft").length;
  // SOMEBODY WITH NO RECORD IS NOT PAID NOUGHT — nothing has been decided about
  // their pay, and they are exactly who a payroll clerk is looking for, so they
  // come first.
  const ordered = [...people].sort((a, b) =>
    Number(b.basic === null) - Number(a.basic === null) || String(a.alias).localeCompare(String(b.alias)));

  const closeEditor = () => { setEditing(null); setProblem(""); };
  const patchComponent = (i, patch) =>
    setEditing({ ...editing, components: editing.components.map((x, k) => (k === i ? { ...x, ...patch } : x)) });

  return (
    <div className="space-y-6">
      {problem && !editing && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{problem}</p>
      )}

      {/* ---- what this is, and the one act that starts a month --------------- */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="font-display text-lg font-800 text-[var(--geex-ink)]">{tr.tab}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tr.lead}</p>
        </div>
        {canManage && (
          <div className="flex flex-wrap items-end gap-2">
            <Field label={tr.period} type="month" className="w-44" value={period} onChange={(v) => setPeriod(v)} />
            <button className={btn} disabled={busy || !period}
              onClick={async () => { if (await send({ action: "prepare", period })) { setPeriod(""); setPane("runs"); } }}>
              {tr.prepare}
            </button>
          </div>
        )}
      </div>

      {/* ---- the summary ------------------------------------------------------ */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label={tr.lastRun} value={latest ? money(latest.totals?.net) : "—"}
          sub={latest ? `${monthLabel(latest.period, locale)} · ${tr.status(latest.status)}` : tr.noRunYet} />
        <StatTile label={tr.onPayroll} value={withPay.length}
          sub={missing > 0 ? tr.withoutPay(missing) : tr.allHavePay} />
        <StatTile label={tr.monthlyBasic} value={money(sum(withPay, (p) => p.basic))} sub={tr.beforeExtras} />
        <StatTile label={tr.awaiting} value={awaiting}
          tone={awaiting ? "text-amber-700 dark:text-amber-300" : ""}
          sub={awaiting ? "" : tr.awaitingNone} />
      </div>

      {/* ---- one of two views -------------------------------------------------- */}
      <div role="tablist" aria-label={tr.tab} className="inline-flex rounded-full border border-slate-200 p-1 dark:border-white/10">
        {[["runs", tr.runs], ["pay", tr.viewPay]].map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={pane === key} onClick={() => setPane(key)}
            className={`rounded-full px-4 py-1.5 font-display text-sm font-600 transition-colors ${
              pane === key ? "bg-brand-700 text-white" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"}`}>
            {label}
          </button>
        ))}
      </div>

      {pane === "runs" && (
        <section className={panel}>
          {runs.length === 0 ? <Empty title={tr.noRunYet} body={tr.noRuns} /> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-sm">
                <thead>
                  <tr>
                    <th className={`${th} text-start`}>{tr.period}</th>
                    <th className={`${th} text-start`}>{tr.stateCol}</th>
                    <th className={`${th} text-end`}>{tr.peopleCol}</th>
                    <th className={`${th} text-end`}>{tr.gross}</th>
                    <th className={`${th} text-end`}>{tr.deductions}</th>
                    <th className={`${th} text-end`}>{tr.net}</th>
                    <th className={`${th} text-start`}>{tr.preparedBy}</th>
                    <th className={th} />
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => (
                    <Fragment key={r.id}>
                      <tr className="border-t border-slate-100 dark:border-white/5">
                        <td className="py-3 pe-3 font-600 text-slate-900 dark:text-white">{monthLabel(r.period, locale)}</td>
                        <td className="py-3 pe-3">
                          <RunPill status={r.status} tr={tr} />
                          {(r.totals?.negative?.length > 0) && (
                            <span className={`ms-2 ${pill} bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300`}>
                              {tr.negative(r.totals.negative.length)}
                            </span>
                          )}
                        </td>
                        <td className="num py-3 pe-3 text-end text-slate-600 dark:text-slate-300">{r.totals?.people || 0}</td>
                        <td className="num py-3 pe-3 text-end text-slate-600 dark:text-slate-300">{money(r.totals?.gross)}</td>
                        <td className="num py-3 pe-3 text-end text-slate-600 dark:text-slate-300">{money(r.totals?.deductions)}</td>
                        <td className="num py-3 pe-3 text-end font-700 text-slate-900 dark:text-white">{money(r.totals?.net)}</td>
                        <td className="py-3 pe-3 text-slate-500 dark:text-slate-400">{r.preparedByAlias || "—"}</td>
                        <td className="py-3 text-end">
                          <span className="inline-flex flex-wrap items-center justify-end gap-2">
                            <button type="button" className={btnRow} onClick={() => toggleRun(r.id)}>
                              {open?.id === r.id ? tr.hideSlips : tr.slips}
                            </button>
                            {/* THE PREPARER WAITS FOR SOMEBODY ELSE unless they are
                                the Admin — the server enforces it at the
                                transition; this only stops offering a button that
                                would be refused. */}
                            {canApprove && r.status === "Draft" && (r.preparedByMe && !isAdmin
                              ? <span className="text-xs text-slate-400 dark:text-slate-500">{tr.waitingOther}</span>
                              : (
                                <button type="button" className={btnRowPrimary} disabled={busy}
                                  onClick={() => send({ action: "move", id: r.id, status: "Approved" })}>
                                  {tr.approve}
                                </button>
                              ))}
                            {canManage && r.status === "Approved" && (
                              <>
                                <a className={btnRow} href={`/api/studios/${slug}/hr/payroll/bank?run=${encodeURIComponent(r.id)}`}
                                  target="_blank" rel="noreferrer">
                                  {tr.bankFile}
                                </a>
                                <button type="button" className={btnRowPrimary} disabled={busy}
                                  onClick={() => send({ action: "move", id: r.id, status: "Paid" })}>
                                  {tr.markPaid}
                                </button>
                              </>
                            )}
                          </span>
                        </td>
                      </tr>
                      {open?.id === r.id && (
                        <tr>
                          <td colSpan={8} className="bg-slate-50/70 px-4 py-5 dark:bg-white/[0.02]">
                            <Payslips run={open} tr={tr} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {pane === "pay" && (
        <section className={panel}>
          <p className="max-w-2xl text-sm text-slate-500 dark:text-slate-400">{tr.payLead}</p>
          {people.length === 0 ? <div className="mt-4"><Empty title={tr.noPeople} body="" /></div> : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr>
                    <th className={`${th} text-start`}>{tr.person}</th>
                    <th className={`${th} text-end`}>{tr.basic}</th>
                    <th className={`${th} text-end`}>{tr.allowances}</th>
                    <th className={`${th} text-end`}>{tr.deductions}</th>
                    <th className={`${th} text-start`}>{tr.account}</th>
                    <th className={th} />
                  </tr>
                </thead>
                <tbody>
                  {ordered.map((p) => {
                    const unset = p.basic === null;
                    // AMOUNTS ARE POSITIVE AND THE KIND CARRIES THE SIGN, so the
                    // two columns are two filters over one list.
                    const extra = sum((p.components || []).filter((c) => c.kind === "allowance"), (c) => c.amount);
                    const taken = sum((p.components || []).filter((c) => c.kind === "deduction"), (c) => c.amount);
                    return (
                      <tr key={p.collaboratorId} className="border-t border-slate-100 dark:border-white/5">
                        <td className="py-3 pe-3 font-600 text-slate-800 dark:text-slate-100">{p.alias}</td>
                        <td className="num py-3 pe-3 text-end text-slate-700 dark:text-slate-200">
                          {unset
                            ? <span className={`${pill} bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300`}>{tr.noPaySet}</span>
                            : money(p.basic)}
                        </td>
                        <td className="num py-3 pe-3 text-end text-slate-600 dark:text-slate-300">{unset ? "—" : money(extra)}</td>
                        <td className="num py-3 pe-3 text-end text-slate-600 dark:text-slate-300">{unset ? "—" : money(taken)}</td>
                        <td className="py-3 pe-3 text-slate-500 dark:text-slate-400">
                          {p.iban ? `${p.bankName ? `${p.bankName} · ` : ""}${maskIban(p.iban)}` : tr.noAccount}
                        </td>
                        <td className="py-3 text-end">
                          {canManage && (
                            <button type="button" className={btnRow}
                              onClick={() => setEditing({
                                collaboratorId: p.collaboratorId, alias: p.alias,
                                basic: p.basic ?? "", iban: p.iban || "", bankName: p.bankName || "",
                                components: p.components || [],
                              })}>
                              {tr.edit}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ---- one person's pay, in a dialog rather than wedged into the page -- */}
      {editing && (
        <Dialog title={tr.payFor(editing.alias)} onClose={closeEditor} width="max-w-[680px]">
          <div className="space-y-5">
            {problem && (
              <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{problem}</p>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={tr.basic} type="number" value={editing.basic}
                onChange={(v) => setEditing({ ...editing, basic: v })} />
              <Field label={tr.bank} value={editing.bankName}
                onChange={(v) => setEditing({ ...editing, bankName: v })} />
              <Field label={tr.iban} value={editing.iban}
                onChange={(v) => setEditing({ ...editing, iban: v })} />
            </div>

            {/* AMOUNTS ARE POSITIVE AND THE KIND CARRIES THE SIGN. A deduction
                stored as a negative allowance is the same thing said twice, and
                the first report that sums allowances gets it wrong. */}
            <div className="space-y-3">
              <p className="text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {tr.allowances} · {tr.deductions}
              </p>
              {editing.components.map((c, i) => (
                <div key={i} className="grid gap-3 sm:grid-cols-[1fr_10rem_8rem_auto] sm:items-end">
                  <Field label={tr.name} value={c.label} onChange={(v) => patchComponent(i, { label: v })} />
                  <Field label={tr.kind} as="select" value={c.kind} onChange={(v) => patchComponent(i, { kind: v })}
                    options={[{ value: "allowance", label: tr.allowance }, { value: "deduction", label: tr.deduction }]} />
                  <Field label={tr.amount} type="number" value={c.amount} onChange={(v) => patchComponent(i, { amount: v })} />
                  <button type="button" className="rounded-lg px-2 py-2 text-xs text-slate-400 hover:text-rose-500"
                    onClick={() => setEditing({ ...editing, components: editing.components.filter((_, k) => k !== i) })}>
                    {tr.remove}
                  </button>
                </div>
              ))}
              <button type="button" className={btnGhost}
                onClick={() => setEditing({ ...editing, components: [...editing.components, { label: "", kind: "allowance", amount: "" }] })}>
                {tr.addComponent}
              </button>
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={closeEditor}>{tr.cancel}</button>
              <button type="button" className={btn} disabled={busy || editing.basic === ""}
                onClick={async () => {
                  const done = await send({
                    action: "pay", ...editing, basic: Number(editing.basic),
                    components: editing.components.map((c) => ({ ...c, amount: Number(c.amount) })),
                  });
                  if (done) setEditing(null);
                }}>
                {tr.save}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
