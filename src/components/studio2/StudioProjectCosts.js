// ONE PROJECT'S COST BREAKDOWN — what it is allowed to cost, and what it has.
//
// A project has always had exactly ONE number: what the studio will be paid.
// Nothing said what any of it was allowed to COST, so "are we over on this
// trade" could not be asked. This is where that is answered.
//
// THE TWO NUMBERS THIS SCREEN MUST NEVER CONFUSE are a budget and a price. What
// a section of the bill was SOLD for is where a proposed breakdown starts, and
// it is not what the work will cost — the screen says so on the one control
// that puts those figures in, because accepting them unread is the mistake.
"use client";
import { useCallback, useEffect, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { projectsDict } from "@/shared/studio/projects";
// THE LIBRARY'S OWN WORDS. It is Administration's register, and its
// dictionary travels with it rather than being restated in Projects' —
// one surface, one module, and no barrel over the two.
import { costCodesDict } from "@/shared/studio/costCodes";
import { RecordSkeleton } from "@/components/studio2/RecordSkeleton";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { panel, h2, sub, btn, btnGhost, btnRow, btnRowDanger, microLabel, Empty, Dialog, StatTile, money } from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";

function refusal(tr, token) {
  switch (token) {
    case "duplicate": return tr.refuseDuplicateCode;
    case "already": return tr.refuseAlreadySeeded;
    case "no-bill": return tr.refuseNoBill;
    case "no-tender": return tr.refuseNoTenderBehind;
    default: return token;
  }
}

export default function StudioProjectCosts({ slug, projectId }) {
  const locale = useStudioLocale();
  const tr = projectsDict(locale);
  const lib = costCodesDict(locale);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(null);

  const read = useCallback(async () => {
    const res = await fetch(
      `/api/studios/${slug}/projects/costs?projectId=${encodeURIComponent(projectId)}`,
      { cache: "no-store" },
    );
    return { ok: res.ok, body: await res.json().catch(() => ({})) };
  }, [slug, projectId]);

  const apply = useCallback(({ ok, body }) => {
    if (!ok) { setError(body.error || "failed"); return; }
    setError("");
    setData(body);
  }, []);

  // The guarded load every record page uses: this can be pointed at a different
  // project while the first request is still in the air.
  useEffect(() => {
    let current = true;
    (async () => {
      const answer = await read();
      if (current) apply(answer);
    })();
    return () => { current = false; };
  }, [read, apply]);

  const reload = useCallback(async () => { apply(await read()); }, [read, apply]);
  // THREE SECTIONS, ONE REPORT, and that is the shape of a cost report rather
  // than an accident: the BUDGET is the project's own (`projectCosts`, under the
  // project list), the ACTUAL is Payables' bills, and the COMMITTED is the
  // purchase orders under Inventory's Project sheets. A screen watching only its
  // own section would show a budget that never moves against spend that does —
  // which is the one thing a cost report exists to prevent.
  useLiveUpdates(slug, "projects-list", reload);
  useLiveUpdates(slug, "finance-payables", reload);
  useLiveUpdates(slug, "inventory-sheets", reload);

  const send = useCallback(async (method, payload) => {
    setError(""); setBusy(true);
    const res = await fetch(`/api/studios/${slug}/projects/costs`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(refusal(tr, out.error || "failed")); return false; }
    await reload();
    return true;
  }, [slug, reload, tr]);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <RecordSkeleton loadingLabel={tr.loadingCosts} />;

  const { project, codes, costing, earned, canCreate, canEdit, canDelete, canSeedFromBill, canSeedFromLibrary } = data;

  // AN INDEX IS A RATIO, NOT MONEY, so it is not put through `money()` — two
  // decimals and no thousands separator. A dash where it is null: an index that
  // cannot be computed is not 0.00, and the two must not look alike.
  const idx = (n) => (n === null || n === undefined ? "—" : n.toFixed(2));
  const evBlocked = earned?.blocked;

  const openForm = (row) => setForm(row ? { ...row } : { code: "", name: "", budget: "", notes: "" });

  const saveForm = async () => {
    const payload = {
      code: form.code, name: form.name,
      budget: Number(form.budget) || 0, notes: form.notes,
    };
    const done = form.id
      ? await send("PUT", { ...payload, id: form.id })
      : await send("POST", { ...payload, projectId });
    if (done) setForm(null);
  };

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

      <div>
        <a href={`/${slug}/projects-list/${projectId}`} className="text-sm text-brand-700 hover:underline dark:text-brand-300">
          ← {tr.backToProject}
        </a>
        <h2 className={`${h2} mt-2`}>{project?.title}</h2>
        <p className={sub}>
          {project?.number ? <span className="font-mono text-xs">{project.number}</span> : null}
          {project?.clientName ? <>{project?.number ? " · " : ""}{project.clientName}</> : null}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className={panel}>
          <StatTile label={tr.totalBudget} value={<span className="num">{money(costing.budget)}</span>}
            sub={costing.unallocated >= 0
              ? `${tr.unallocated}: ${money(costing.unallocated)}`
              : tr.overAllocated}
            tone={costing.unallocated < 0 ? "text-amber-700 dark:text-amber-300" : ""} />
        </div>
        <div className={panel}>
          {/* SPENT INCLUDES THE UNCODED, always. A total that counted only what
              somebody had filed properly would say a job was inside its budget
              for exactly as long as its paperwork was behind. */}
          <StatTile label={tr.totalActual} value={<span className="num">{money(costing.actual)}</span>}
            sub={`${tr.costRemaining}: ${money(costing.remaining)}`}
            tone={costing.remaining < 0 ? "text-rose-600 dark:text-rose-300" : "text-emerald-600 dark:text-emerald-400"}
            accent="rgb(var(--chart-2))" />
        </div>
        <div className={panel}>
          {/* THE HEADLINE THIS SLICE ADDED. Spend alone said where a project had
              been; this says where it is going, and the variance beside it is
              the number somebody can still act on. */}
          <StatTile label={tr.totalForecast} value={<span className="num">{money(costing.forecast)}</span>}
            sub={`${tr.costCommitted}: ${money(costing.committed)} · ${tr.costVariance}: ${money(costing.variance)}`}
            tone={costing.variance < 0 ? "text-rose-600 dark:text-rose-300" : "text-emerald-600 dark:text-emerald-400"}
            accent="rgb(var(--chart-3))" />
        </div>
      </div>

      {/* THE RULE SAID OUT LOUD, because a forecast that equals the budget on a
          code nobody has spent anything on reads as a bug until you know why. */}
      <p className="text-xs text-slate-500 dark:text-slate-400">{tr.forecastNote}</p>

      {costing.uncoded > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
          <p className="text-sm font-700 text-amber-900 dark:text-amber-200">
            {tr.uncodedSpend}: <span className="num">{money(costing.uncoded)}</span>
          </p>
          <p className="mt-1 text-xs text-amber-800 dark:text-amber-200/90">{tr.uncodedSpendHint}</p>
        </div>
      )}

      {/* KEPT APART FROM THE UNCODED SPEND, because the two are fixed in
          different places: one is a bill Finance has not filed, the other a
          purchase order Procurement has not. */}
      {costing.uncommitted > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
          <p className="text-sm font-700 text-amber-900 dark:text-amber-200">
            {tr.uncommittedSpend}: <span className="num">{money(costing.uncommitted)}</span>
          </p>
          <p className="mt-1 text-xs text-amber-800 dark:text-amber-200/90">{tr.uncommittedSpendHint}</p>
        </div>
      )}

      {/* ---- earned value ------------------------------------------------
          THE JOIN. Every figure here existed already and nothing read two of
          them together: the budget came with the breakdown below, the progress
          has been in the planner since it was built, and what was spent is the
          same `actual` the codes roll up.

          WHY THE BLOCKED STATES ARE THREE SENTENCES AND NOT ONE. They send
          somebody to three different places — add a cost code, draw a plan, put
          dates on the project — and a single "not enough data" would leave them
          guessing which. */}
      {earned && (
        <section className={panel}>
          <div>
            <h2 className={h2}>{tr.earnedValue}</h2>
            <p className={sub}>{tr.earnedValueSub}</p>
          </div>

          {evBlocked === "no-budget" ? (
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{tr.evNoBudget}</p>
          ) : evBlocked === "no-plan" ? (
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{tr.evNoPlan}</p>
          ) : (
            <>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <StatTile label={tr.evEarned} value={<span className="num">{money(earned.ev)}</span>}
                  sub={tr.evCostVariance + ": " + money(earned.cv)}
                  tone={earned.cv < 0 ? "text-rose-600 dark:text-rose-300" : "text-emerald-600 dark:text-emerald-400"} />
                {/* WITHHELD RATHER THAN GUESSED when the project has no dates.
                    The cost half below still answers, which is the whole point
                    of `no-dates` being a partial state. */}
                <StatTile label={tr.evPlanned}
                  value={<span className="num">{earned.pv === null ? "—" : money(earned.pv)}</span>}
                  sub={earned.elapsed === null
                    ? tr.evNoDates
                    : tr.evElapsed(Math.round(earned.elapsed * 100))}
                  accent="rgb(var(--chart-2))" />
                <StatTile label={tr.evSpent} value={<span className="num">{money(earned.ac)}</span>}
                  sub={tr.evScheduleVariance + ": " + (earned.sv === null ? "—" : money(earned.sv))}
                  accent="rgb(var(--chart-3))" />
              </div>

              <div className="mt-4 flex flex-wrap items-baseline gap-x-8 gap-y-3">
                <span>
                  <span className={microLabel}>{tr.evScheduleIndex}</span>
                  <span className={`num text-lg font-800 ${earned.spi === null ? "text-slate-400"
                    : earned.spi < 1 ? "text-amber-700 dark:text-amber-300" : "text-emerald-600 dark:text-emerald-400"}`}>
                    {idx(earned.spi)}
                  </span>
                  {earned.spi !== null && (
                    <span className="ms-2 text-xs text-slate-500 dark:text-slate-400">
                      {earned.spi < 1 ? tr.evBehind : tr.evAhead}
                    </span>
                  )}
                </span>
                <span>
                  <span className={microLabel}>{tr.evCostIndex}</span>
                  <span className={`num text-lg font-800 ${earned.cpi === null ? "text-slate-400"
                    : earned.cpi < 1 ? "text-rose-600 dark:text-rose-300" : "text-emerald-600 dark:text-emerald-400"}`}>
                    {idx(earned.cpi)}
                  </span>
                  {earned.cpi !== null && (
                    <span className="ms-2 text-xs text-slate-500 dark:text-slate-400">
                      {earned.cpi < 1 ? tr.evOverCost : tr.evUnderCost}
                    </span>
                  )}
                </span>
                <span>
                  <span className={microLabel}>{tr.evAtCompletion}</span>
                  <span className="num text-lg font-800 text-slate-900 dark:text-white">
                    {earned.eac === null ? "—" : money(earned.eac)}
                  </span>
                  {earned.vac !== null && (
                    <span className={`ms-2 text-xs ${earned.vac < 0 ? "text-rose-600 dark:text-rose-300" : "text-slate-500 dark:text-slate-400"}`}>
                      {tr.evVarianceAtCompletion}: {money(earned.vac)}
                    </span>
                  )}
                </span>
              </div>

              {/* BOTH ASSUMPTIONS SAID OUT LOUD. A straight-line planned value
                  and a performance forecast sitting beside a ledger one are
                  each read as more than they are unless the screen says what
                  they rest on. */}
              <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">{tr.evStraightLine}</p>
              {earned.eac !== null && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{tr.evTwoForecasts}</p>
              )}
            </>
          )}
        </section>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className={h2}>{tr.costBreakdown}</h2>
          <p className={sub}>{tr.costBreakdownSub}</p>
        </div>
        {canCreate && (
          <button type="button" className={btn} onClick={() => openForm(null)}>{tr.addCostCode}</button>
        )}
      </div>

      {codes.length === 0 ? (
        <div className="space-y-4">
          <Empty title={tr.noCostCodesYet} body={tr.noCostCodesBody} />
          {/* OFFERED ONLY WHERE THERE IS A BILL, and only while the breakdown is
              empty — this is a starting point rather than a merge, which is why
              the server refuses it a second time. */}
          {canSeedFromBill && (
            <section className={panel}>
              <p className="text-sm font-600 text-slate-900 dark:text-white">{tr.seedFromBill}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{tr.seedFromBillHint}</p>
              <button type="button" className={`${btn} mt-3`} disabled={busy}
                onClick={() => send("POST", { seedFromBill: true, projectId })}>
                {tr.seedFromBill}
              </button>
            </section>
          )}
          {/* THE STUDIO'S OWN STANDARD, offered on the same terms and shown
              BESIDE the bill rather than instead of it. Both can be true on a
              handed-over project, and the choice is a real one: the bill is
              how this job was sold, the library is how the studio buys. */}
          {canSeedFromLibrary && (
            <section className={panel}>
              <p className="text-sm font-600 text-slate-900 dark:text-white">{lib.seedFromLibrary}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{lib.seedFromLibraryHint}</p>
              <button type="button" className={`${btn} mt-3`} disabled={busy}
                onClick={() => send("POST", { seedFromLibrary: true, projectId })}>
                {lib.seedFromLibrary}
              </button>
            </section>
          )}
        </div>
      ) : (
        <section className={`${panel} !p-0 overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-start dark:border-white/5">
                  <th className="px-4 py-3 text-start text-xs font-700 uppercase tracking-wide text-slate-500">{tr.costCode}</th>
                  <th className="px-4 py-3 text-start text-xs font-700 uppercase tracking-wide text-slate-500">{tr.costName}</th>
                  <th className="px-4 py-3 text-end text-xs font-700 uppercase tracking-wide text-slate-500">{tr.costBudget}</th>
                  <th className="px-4 py-3 text-end text-xs font-700 uppercase tracking-wide text-slate-500">{tr.costActual}</th>
                  <th className="px-4 py-3 text-end text-xs font-700 uppercase tracking-wide text-slate-500">{tr.costCommitted}</th>
                  <th className="px-4 py-3 text-end text-xs font-700 uppercase tracking-wide text-slate-500">{tr.costForecast}</th>
                  <th className="px-4 py-3 text-end text-xs font-700 uppercase tracking-wide text-slate-500">{tr.costVariance}</th>
                  <th />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {costing.codes.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">{c.code}</td>
                    <td className="px-4 py-3 text-slate-900 dark:text-white">{c.name}</td>
                    <td className="num px-4 py-3 text-end text-slate-700 dark:text-slate-200">
                      {/* A DASH, NOT 0.00 — nought is a budget and this code has
                          none, which is why `used` is null rather than zero. */}
                      {c.used === null ? <span className="text-slate-400">{tr.noBudgetSet}</span> : money(c.budget)}
                    </td>
                    <td className="num px-4 py-3 text-end text-slate-700 dark:text-slate-200">{money(c.actual)}</td>
                    <td className="num px-4 py-3 text-end text-slate-500 dark:text-slate-400">{money(c.committed)}</td>
                    <td className="num px-4 py-3 text-end text-slate-700 dark:text-slate-200">{money(c.forecast)}</td>
                    {/* VARIANCE, NOT REMAINING. Remaining answers "how much of
                        the allowance is left" and goes on saying yes while an
                        order nobody has invoiced eats all of it; variance is
                        the number that has already taken that into account. */}
                    <td className={`num px-4 py-3 text-end font-600 ${c.variance < 0 ? "text-rose-600 dark:text-rose-300" : "text-slate-900 dark:text-white"}`}>
                      {money(c.variance)}
                      {c.over && <span className="ms-2 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-700 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">{tr.overBudget}</span>}
                      {/* TWO DIFFERENT FLAGS. One is a number to explain, the
                          other an order somebody could still stop. */}
                      {c.willOverrun && <span className="ms-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-700 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">{tr.willOverrun}</span>}
                    </td>
                    <td className="px-4 py-3 text-end">
                      <span className="flex justify-end gap-2 text-xs">
                        {canEdit && (
                          <button type="button" className={btnRow}
                            onClick={() => openForm(codes.find((r) => r.id === c.id))}>{tr.edit}</button>
                        )}
                        {canDelete && (
                          <button type="button" className={btnRowDanger} disabled={busy}
                            onClick={() => send("DELETE", { id: c.id })}>{tr.deleteLine}</button>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {form && (
        <Dialog title={form.id ? tr.editCostCode : tr.addCostCode} onClose={() => setForm(null)} width="max-w-[620px]">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[9rem,1fr]">
              <Field label={tr.costCode} required value={form.code || ""}
                onChange={(v) => setForm((f) => ({ ...f, code: v }))} inputProps={{ maxLength: 40 }} />
              <Field label={tr.costName} required value={form.name || ""}
                onChange={(v) => setForm((f) => ({ ...f, name: v }))} inputProps={{ maxLength: 200 }} />
            </div>
            <Field label={tr.costBudget} type="number" value={form.budget ?? ""}
              onChange={(v) => setForm((f) => ({ ...f, budget: v }))} inputProps={{ min: "0", step: "0.01" }} />
            <Field label={tr.notes} as="textarea" value={form.notes || ""}
              onChange={(v) => setForm((f) => ({ ...f, notes: v }))} inputProps={{ maxLength: 1000 }} />
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setForm(null)}>{tr.cancel}</button>
              <button type="button" className={btn}
                disabled={busy || !form.code?.trim() || !form.name?.trim()}
                onClick={saveForm}>{tr.save}</button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
