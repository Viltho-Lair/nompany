"use client";

import { useCallback, useState } from "react";
import { Field } from "@/components/fields/Field";
import { payrollDict } from "@/shared/studio/payroll";
import { useReload } from "@/components/studio2/useReload";

// PAYROLL — what people are paid, and the runs that pay them.
//
// `hr.employees.salary` has existed since the catalogue was written, labelled
// "See pay and salary", and nothing in this product stored a salary. This is
// the record that right was always describing, and `hr.payroll` is the one that
// opens the whole company's wage bill rather than one person's line.
//
// IT VALIDATES NOTHING ITSELF. `modules/hr/payroll` holds the rules and the
// server refuses on them.
export default function PayrollPanel({ slug, locale = "en" }) {
  const tr = payrollDict(locale);
  const [data, setData] = useState(null);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);
  const [period, setPeriod] = useState("");
  const [open, setOpen] = useState(null);

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

  if (!data) return <p className="text-sm text-slate-500 dark:text-slate-400">…</p>;

  const { people = [], runs = [], canManage, canApprove } = data;

  return (
    <div className="space-y-6">
      {problem && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
          {problem}
        </p>
      )}

      {/* ---- the runs ------------------------------------------------------ */}
      <section className="rounded-geex border border-slate-200/70 bg-[var(--geex-surface)] p-5 dark:border-white/10">
        <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.runs}</h3>

        {canManage && (
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <Field label={tr.period} type="month" className="w-full sm:w-44"
              value={period} onChange={(v) => setPeriod(v)} />
            <button
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-600 text-white disabled:opacity-50"
              disabled={busy || !period}
              onClick={async () => { if (await send({ action: "prepare", period })) setPeriod(""); }}
            >
              {tr.prepare}
            </button>
          </div>
        )}

        {runs.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{tr.noRuns}</p>
        ) : (
          <ul className="mt-3 space-y-1">
            {runs.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-white/10">
                <span className="font-mono text-slate-900 dark:text-white">{r.period}</span>
                <span className={`text-xs font-600 ${
                  r.status === "Paid" ? "text-emerald-600 dark:text-emerald-300"
                    : r.status === "Approved" ? "text-brand-600 dark:text-brand-300"
                      : "text-slate-400 dark:text-slate-500"}`}>
                  {tr.status(r.status)}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">{tr.people(r.totals?.people || 0)}</span>
                <span className="num ms-auto text-slate-700 dark:text-slate-200">{r.totals?.net}</span>
                {/* A NET BELOW NOUGHT IS REPORTED, NEVER CLAMPED — clamping would
                    forgive the difference and leave the ledger short by exactly
                    the amount nobody noticed. */}
                {(r.totals?.negative?.length > 0) && (
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                    {tr.negative(r.totals.negative.length)}
                  </span>
                )}
                <button
                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 dark:border-white/15 dark:text-slate-300"
                  onClick={async () => {
                    const res = await fetch(`/api/studios/${slug}/hr/payroll?run=${encodeURIComponent(r.id)}`);
                    const body = await res.json().catch(() => ({}));
                    if (res.ok) setOpen(body.run);
                  }}
                >
                  {tr.slips}
                </button>
                {/* INVARIANT 7 IS AT THE TRANSITION, not on the button: the
                    person who prepared the run is refused by name, whichever
                    rights they hold, so the button is offered and the server
                    answers. */}
                {canApprove && r.status === "Draft" && (
                  <button
                    className="rounded-lg bg-brand-600 px-2 py-1 text-xs font-600 text-white"
                    disabled={busy}
                    onClick={() => send({ action: "move", id: r.id, status: "Approved" })}
                  >
                    {tr.approve}
                  </button>
                )}
                {canManage && r.status === "Approved" && (
                  <>
                    <a
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 dark:border-white/15 dark:text-slate-300"
                      href={`/api/studios/${slug}/hr/payroll/bank?run=${encodeURIComponent(r.id)}`}
                      target="_blank" rel="noreferrer"
                    >
                      {tr.bankFile}
                    </a>
                    <button
                      className="rounded-lg bg-brand-600 px-2 py-1 text-xs font-600 text-white"
                      disabled={busy}
                      onClick={() => send({ action: "move", id: r.id, status: "Paid" })}
                    >
                      {tr.markPaid}
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---- one run's payslips ------------------------------------------- */}
      {open && (
        <section className="rounded-geex border border-brand-200 p-5 dark:border-brand-400/30">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">
              {tr.slipsFor(open.period)}
            </h3>
            <button className="ms-auto text-xs text-slate-400 hover:text-slate-600" onClick={() => setOpen(null)}>
              {tr.close}
            </button>
          </div>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  <th className="py-1 pe-3 text-start">{tr.person}</th>
                  <th className="py-1 pe-3 text-end">{tr.basic}</th>
                  <th className="py-1 pe-3 text-end">{tr.allowances}</th>
                  <th className="py-1 pe-3 text-end">{tr.deductions}</th>
                  <th className="py-1 text-end">{tr.net}</th>
                </tr>
              </thead>
              <tbody>
                {open.lines.map((l) => (
                  <tr key={l.collaboratorId} className="border-t border-slate-100 dark:border-white/5">
                    <td className="py-1.5 pe-3 text-slate-700 dark:text-slate-200">
                      {l.alias}
                      {/* UNPAID LEAVE IS PRO-RATED ON THE BASIC ALONE — an
                          allowance for a car does not stop because somebody took
                          a week unpaid. */}
                      {l.unpaidDays > 0 && (
                        <span className="ms-2 text-xs text-amber-600 dark:text-amber-300">
                          {tr.unpaid(l.unpaidDays)}
                        </span>
                      )}
                    </td>
                    <td className="num py-1.5 pe-3 text-end text-slate-600 dark:text-slate-300">{l.basic}</td>
                    <td className="num py-1.5 pe-3 text-end text-slate-600 dark:text-slate-300">{l.allowances}</td>
                    <td className="num py-1.5 pe-3 text-end text-slate-600 dark:text-slate-300">{l.deductions}</td>
                    <td className={`num py-1.5 text-end font-600 ${
                      l.net < 0 ? "text-rose-600 dark:text-rose-300" : "text-slate-900 dark:text-white"}`}>
                      {l.net}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ---- the pay records ---------------------------------------------- */}
      <section className="rounded-geex border border-slate-200/70 bg-[var(--geex-surface)] p-5 dark:border-white/10">
        <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.pay}</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tr.payLead}</p>
        <ul className="mt-2 space-y-1">
          {people.map((p) => (
            <li key={p.collaboratorId} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-slate-700 dark:text-slate-200">{p.alias}</span>
              {/* SOMEBODY WITH NO RECORD IS NOT PAID NOUGHT — nothing has been
                  decided about their pay, and they are exactly who a payroll
                  clerk is looking for. */}
              <span className={`num ms-auto ${p.basic === null ? "text-amber-600 dark:text-amber-300" : "text-slate-600 dark:text-slate-300"}`}>
                {p.basic === null ? tr.noPaySet : p.basic}
              </span>
              {canManage && (
                <button
                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 dark:border-white/15 dark:text-slate-300"
                  onClick={() => setEditing({
                    collaboratorId: p.collaboratorId, alias: p.alias,
                    basic: p.basic ?? "", iban: p.iban || "", bankName: p.bankName || "",
                    components: p.components || [],
                  })}
                >
                  {tr.edit}
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {editing && (
        <section className="rounded-geex border border-brand-200 p-5 dark:border-brand-400/30">
          <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.payFor(editing.alias)}</h3>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <Field label={tr.basic} type="number" className="w-full sm:w-36"
              value={editing.basic} onChange={(v) => setEditing({ ...editing, basic: v })} />
            <Field label={tr.iban} className="w-full sm:w-56"
              value={editing.iban} onChange={(v) => setEditing({ ...editing, iban: v })} />
            <Field label={tr.bank} className="w-full sm:w-44"
              value={editing.bankName} onChange={(v) => setEditing({ ...editing, bankName: v })} />
          </div>

          {/* AMOUNTS ARE POSITIVE AND THE KIND CARRIES THE SIGN. A deduction
              stored as a negative allowance is the same thing said twice, and
              the first report that sums allowances gets it wrong. */}
          <div className="mt-3 space-y-2">
            {editing.components.map((c, i) => (
              <div key={i} className="flex flex-wrap items-end gap-2">
                <Field label={tr.name} className="w-full sm:w-44"
                  value={c.label}
                  onChange={(v) => setEditing({ ...editing, components: editing.components.map((x, k) => k === i ? { ...x, label: v } : x) })} />
                <Field label={tr.kind} as="select" className="w-full sm:w-40"
                  value={c.kind}
                  onChange={(v) => setEditing({ ...editing, components: editing.components.map((x, k) => k === i ? { ...x, kind: v } : x) })}
                  options={[{ value: "allowance", label: tr.allowance }, { value: "deduction", label: tr.deduction }]} />
                <Field label={tr.amount} type="number" className="w-full sm:w-32"
                  value={c.amount}
                  onChange={(v) => setEditing({ ...editing, components: editing.components.map((x, k) => k === i ? { ...x, amount: v } : x) })} />
                <button
                  className="rounded-lg px-2 py-2 text-xs text-slate-400 hover:text-rose-500"
                  onClick={() => setEditing({ ...editing, components: editing.components.filter((_, k) => k !== i) })}
                >
                  {tr.remove}
                </button>
              </div>
            ))}
            <button
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 dark:border-white/15 dark:text-slate-300"
              onClick={() => setEditing({ ...editing, components: [...editing.components, { label: "", kind: "allowance", amount: "" }] })}
            >
              {tr.addComponent}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-600 text-white disabled:opacity-50"
              disabled={busy || editing.basic === ""}
              onClick={async () => {
                const done = await send({
                  action: "pay", ...editing, basic: Number(editing.basic),
                  components: editing.components.map((c) => ({ ...c, amount: Number(c.amount) })),
                });
                if (done) setEditing(null);
              }}
            >
              {tr.save}
            </button>
            <button
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 dark:border-white/15 dark:text-slate-300"
              onClick={() => { setEditing(null); setProblem(""); }}
            >
              {tr.cancel}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
