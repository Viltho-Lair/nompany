// ONE PROJECT'S PAYMENT SCHEDULE — what may be claimed, what has been, and what
// the client is holding back.
//
// THE MIRROR OF THE COST BREAKDOWN, and it closes the gap that screen opened.
// Four slices built the cost side of a project in full; the revenue side stayed
// a single `value` with nothing saying when any of it might be billed. So a
// project could say it was over on Plant and could not say what had been
// invoiced — which is the half that decides whether there is money to be over
// with.
//
// THE TWO NUMBERS THIS SCREEN MUST NEVER CONFUSE are what has been INVOICED and
// what will be PAID. Retention is the difference, and a studio reading its
// invoiced total as its expected cash is wrong by exactly what its clients are
// withholding. Both are on screen, labelled, always.
"use client";
import { useCallback, useEffect, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { projectsDict } from "@/shared/studio/projects";
import ProjectHubTabs from "@/components/studio2/ProjectHubTabs";
import { RecordSkeleton } from "@/components/studio2/RecordSkeleton";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { panel, h2, sub, btn, btnGhost, btnRow, btnRowDanger, Empty, Dialog, StatTile, money, fmtDate } from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";
import ProgressClaimsPanel from "@/components/studio2/ProgressClaimsPanel";

function refusal(tr, token) {
  switch (token) {
    case "duplicate": return tr.refuseDuplicateMilestone;
    case "percent": return tr.refuseRetentionPercent;
    case "status": return tr.refuseMilestoneStatus;
    default: return token;
  }
}

export default function StudioProjectBilling({ slug, projectId }) {
  const tr = projectsDict(useStudioLocale());
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(null);
  const [terms, setTerms] = useState(null);

  const read = useCallback(async () => {
    const res = await fetch(
      `/api/studios/${slug}/projects/billing?projectId=${encodeURIComponent(projectId)}`,
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
  // The milestones are the project's own rows (`projectMilestones`, under the
  // project list). Whether one has been BILLED is not stored — it is derived from
  // the invoices naming it, and an invoice is written under Finance's Cash
  // section, so raising one there is exactly what this screen must notice.
  useLiveUpdates(slug, "projects-list", reload);
  useLiveUpdates(slug, "finance-cash", reload);

  const send = useCallback(async (method, payload) => {
    setError(""); setBusy(true);
    const res = await fetch(`/api/studios/${slug}/projects/billing`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(refusal(tr, out.error || "failed")); return false; }
    await reload();
    return true;
  }, [slug, reload, tr]);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <RecordSkeleton loadingLabel={tr.loadingBilling} />;

  const { project, billing, canCreate, canEdit, canDelete } = data;
  const ret = billing.retention;

  const openForm = (row) => setForm(row
    ? { ...row, percentOfValue: "" }
    : { code: "", name: "", amount: "", dueDate: "", notes: "", percentOfValue: "" });

  const saveForm = async () => {
    const payload = {
      code: form.code, name: form.name,
      amount: Number(form.amount) || 0,
      dueDate: form.dueDate || "", notes: form.notes,
    };
    const done = form.id
      ? await send("PUT", { ...payload, id: form.id })
      : await send("POST", { ...payload, projectId });
    if (done) setForm(null);
  };

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

      {/* THE HUB'S BAR — see StudioProjectCosts. */}
      <ProjectHubTabs slug={slug} projectId={projectId} active="billing" />
      <h2 className={h2}>{tr.paymentSchedule}</h2>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label={tr.totalScheduled} value={<span className="num">{money(billing.scheduled)}</span>}
          sub={billing.unscheduled >= 0
            ? `${tr.unscheduled}: ${money(billing.unscheduled)}`
            : tr.overScheduled}
          tone={billing.unscheduled < 0 ? "text-amber-700 dark:text-amber-300" : ""} />
        {/* INVOICED INCLUDES THE UNATTRIBUTED, always. A total that counted
            only claims somebody had filed against a line would understate
            what the client has been asked for. */}
        <StatTile label={tr.totalInvoiced} value={<span className="num">{money(billing.invoiced)}</span>}
          sub={`${tr.outstanding}: ${money(billing.outstanding)}`}
          tone={billing.outstanding > 0 ? "text-amber-700 dark:text-amber-300" : "text-emerald-600 dark:text-emerald-400"}
          accent="rgb(var(--chart-2))" />
        {/* THE NUMBER THIS SCREEN EXISTS FOR: work the studio has said is
            done and has not asked to be paid for. */}
        <StatTile label={tr.claimable} value={<span className="num">{money(billing.claimable)}</span>}
          sub={tr.claimableHint}
          tone={billing.claimable > 0 ? "text-emerald-600 dark:text-emerald-400" : ""}
          accent="rgb(var(--chart-3))" />
      </div>

      {/* ---- retention ----------------------------------------------------
          MONEY EARNED, INVOICED, AND DELIBERATELY NOT YET PAYABLE. It existed
          nowhere in the product before this, which meant a studio's invoiced
          total read as its expected cash and was wrong by whatever its clients
          were holding.

          RELEASING IT IS FINANCE'S ACT. Retention becomes money when somebody
          raises an invoice for it, and Finance owns that door — so this reports
          the position and says who has to act, rather than growing a second way
          to bill a client out of a project screen. */}
      <section className={panel}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className={h2}>{tr.retention}</h2>
            <p className={sub}>{tr.retentionSub}</p>
          </div>
          {canEdit && (
            <button type="button" className={btnRow} onClick={() => setTerms({
              retentionPercent: ret.percent ?? "",
              retentionReleaseDate: ret.releaseDate || "",
            })}>
              {tr.editRetention}
            </button>
          )}
        </div>

        {ret.percent === 0 ? (
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{tr.noRetentionAgreed}</p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <StatTile label={tr.retentionHeld} value={<span className="num">{money(ret.held)}</span>}
              sub={`${ret.percent}% ${tr.ofInvoiced}`} />
            <StatTile label={tr.retentionNet} value={<span className="num">{money(ret.net)}</span>}
              sub={tr.retentionNetHint} />
            {/* NULL IS NOT ZERO. "Nothing is due yet" and "nobody has said when
                anything is due" are different answers, and a 0 shown for both
                would state the first while meaning the second. */}
            <StatTile label={tr.retentionReleasable}
              value={<span className="num">{ret.releasable === null ? "—" : money(ret.releasable)}</span>}
              sub={ret.blocked === "no-release-date"
                ? tr.noReleaseDate
                : `${tr.releaseDue}: ${fmtDate(ret.releaseDate)}`}
              tone={ret.blocked ? "text-amber-700 dark:text-amber-300" : ""} />
          </div>
        )}
      </section>

      {/* KEPT IN ITS OWN RIGHT, never folded into the schedule: an invoice
          naming no milestone is real money, and one naming a milestone somebody
          has since deleted rejoins here rather than vanishing. */}
      {billing.unattributed > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
          <p className="text-sm font-700 text-amber-900 dark:text-amber-200">
            {tr.unattributedBilling}: <span className="num">{money(billing.unattributed)}</span>
          </p>
          <p className="mt-1 text-xs text-amber-800 dark:text-amber-200/90">{tr.unattributedBillingHint}</p>
        </div>
      )}

      {/* ---- the schedule ------------------------------------------------- */}
      <section className={panel}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className={h2}>{tr.paymentSchedule}</h2>
            <p className={sub}>{tr.paymentScheduleSub}</p>
          </div>
          {canCreate && (
            <button type="button" className={btn} onClick={() => openForm(null)}>{tr.addMilestone}</button>
          )}
        </div>

        {billing.blocked === "no-schedule" ? (
          <Empty title={tr.noMilestones} body={tr.noMilestonesHint} />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              {/* THE CLASSES ARE SPELLED OUT RATHER THAN REACHING FOR
                  `microLabel`, which the cost breakdown's table does too and
                  for the same reason: that token carries `block`, so on a `th`
                  it stops the cell being a cell and the whole header stacks
                  into one column. Nothing catches it — the markup is valid, the
                  classes are real, and the test suite never renders. Only
                  opening the screen showed it. */}
              <thead>
                <tr className="border-b border-slate-100 text-start dark:border-white/5">
                  <th className="px-4 py-3 text-start text-xs font-700 uppercase tracking-wide text-slate-500">{tr.milestoneCode}</th>
                  <th className="px-4 py-3 text-start text-xs font-700 uppercase tracking-wide text-slate-500">{tr.milestoneName}</th>
                  <th className="px-4 py-3 text-start text-xs font-700 uppercase tracking-wide text-slate-500">{tr.milestoneDue}</th>
                  <th className="px-4 py-3 text-end text-xs font-700 uppercase tracking-wide text-slate-500">{tr.milestoneAmount}</th>
                  <th className="px-4 py-3 text-end text-xs font-700 uppercase tracking-wide text-slate-500">{tr.milestoneInvoiced}</th>
                  <th className="px-4 py-3 text-end text-xs font-700 uppercase tracking-wide text-slate-500">{tr.milestoneRemaining}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {billing.milestones.map((m) => (
                  <tr key={m.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">{m.code}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                      {m.name}
                      <span className="ms-2 text-xs text-slate-500 dark:text-slate-400">
                        {m.status === "Ready" ? tr.milestoneReady : tr.milestonePending}
                        {m.billed === "full" ? ` · ${tr.billedInFull}`
                          : m.billed === "part" ? ` · ${tr.billedInPart}` : ""}
                      </span>
                      {/* LATE AND CLAIMABLE ARE DIFFERENT THINGS and are shown
                          apart: one is an invoice to raise, the other a date to
                          explain. */}
                      {m.overdue && (
                        <span className="ms-2 text-xs text-rose-600 dark:text-rose-300">{tr.milestoneOverdue}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {m.dueDate ? fmtDate(m.dueDate) : "—"}
                    </td>
                    <td className="num px-4 py-3 text-end text-slate-700 dark:text-slate-200">{money(m.amount)}</td>
                    <td className="num px-4 py-3 text-end text-slate-500 dark:text-slate-400">{money(m.invoiced)}</td>
                    <td className={`num px-4 py-3 text-end ${m.remaining < 0 ? "text-rose-600 dark:text-rose-300" : "text-slate-700 dark:text-slate-200"}`}>
                      {money(m.remaining)}
                    </td>
                    <td className="px-4 py-3 text-end">
                      <span className="inline-flex gap-2">
                        {canEdit && (
                          <button type="button" className={btnRow} disabled={busy}
                            onClick={() => send("PUT", {
                              id: m.id, status: m.status === "Ready" ? "Pending" : "Ready",
                            })}>
                            {m.status === "Ready" ? tr.markPending : tr.markReady}
                          </button>
                        )}
                        {canEdit && (
                          <button type="button" className={btnRow} disabled={busy}
                            onClick={() => openForm(m)}>{tr.edit}</button>
                        )}
                        {canDelete && (
                          <button type="button" className={btnRowDanger} disabled={busy}
                            onClick={() => send("DELETE", { id: m.id })}>{tr.delete}</button>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ---- progress claims (tier 6) ------------------------------------
          THE OTHER WAY A PROJECT IS BILLED: measured against its bill and
          certified, rather than a fixed schedule line. Its own panel and its
          own read, beside the schedule it complements. */}
      <ProgressClaimsPanel slug={slug} projectId={projectId} />

      {form && (
        <Dialog
          title={form.id ? tr.editMilestone : tr.addMilestone}
          onClose={() => setForm(null)}
          width="max-w-[640px]"
        >
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={tr.milestoneCode} required value={form.code || ""}
                onChange={(v) => setForm((f) => ({ ...f, code: v }))} inputProps={{ maxLength: 40 }} />
              <Field label={tr.milestoneDue} type="date" value={form.dueDate || ""}
                onChange={(v) => setForm((f) => ({ ...f, dueDate: v }))} />
            </div>
            <Field label={tr.milestoneName} required value={form.name || ""}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))} inputProps={{ maxLength: 200 }} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={tr.milestoneAmount} type="number" value={form.amount ?? ""}
                onChange={(v) => setForm((f) => ({ ...f, amount: v }))} inputProps={{ step: "0.01" }} />
              <div>
                {/* AN ENTRY CONVENIENCE, NOT A STORED FIELD. A percentage kept
                    on the record would silently re-price every line the moment
                    the project's value moved, and give one number two sources.
                    So this resolves to an amount here and is then forgotten. */}
                <Field label={tr.percentOfValue} type="number" value={form.percentOfValue ?? ""}
                  onChange={(v) => setForm((f) => ({
                    ...f,
                    percentOfValue: v,
                    amount: v === "" ? f.amount
                      : Math.round((Number(project?.value) || 0) * (Number(v) || 0)) / 100,
                  }))}
                  inputProps={{ step: "0.01", max: 100 }} />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{tr.percentOfValueHint}</p>
              </div>
            </div>
            <Field label={tr.notes} as="textarea" value={form.notes || ""}
              onChange={(v) => setForm((f) => ({ ...f, notes: v }))} inputProps={{ maxLength: 1000 }} />
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setForm(null)}>{tr.cancel}</button>
              <button type="button" className={btn} disabled={busy || !form.code?.trim() || !form.name?.trim()}
                onClick={saveForm}>{tr.save}</button>
            </div>
          </div>
        </Dialog>
      )}

      {terms && (
        <Dialog title={tr.editRetention} onClose={() => setTerms(null)} width="max-w-[520px]">
          <div className="space-y-4">
            <Field label={tr.retentionPercent} type="number" value={terms.retentionPercent ?? ""}
              onChange={(v) => setTerms((f) => ({ ...f, retentionPercent: v }))}
              inputProps={{ step: "0.01", min: 0, max: 100 }} />
            <Field label={tr.retentionReleaseDate} type="date" value={terms.retentionReleaseDate || ""}
              onChange={(v) => setTerms((f) => ({ ...f, retentionReleaseDate: v }))} />
            <p className="text-xs text-slate-500 dark:text-slate-400">{tr.retentionReleaseHint}</p>
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setTerms(null)}>{tr.cancel}</button>
              <button type="button" className={btn} disabled={busy}
                onClick={async () => {
                  const done = await send("PUT", {
                    retention: true, projectId,
                    retentionPercent: Number(terms.retentionPercent) || 0,
                    retentionReleaseDate: terms.retentionReleaseDate || "",
                  });
                  if (done) setTerms(null);
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
