"use client";

// PLANS BY PERIOD (22/09/2026) — the envelope above the campaigns.
//
// THE QUESTION IT ANSWERS is the one the register and the calendar both duck:
// "what are we doing this quarter, what is it allowed to cost, and is any of it
// actually filed under it". A campaign has been the largest unit Marketing had,
// so a period's budget could only ever be added up by hand.
//
// A CAMPAIGN NAMES ITS PLAN; NOTHING IS INFERRED FROM DATES. A campaign running
// from March into April would otherwise belong to two quarters and be counted
// in both. The price of an explicit link is a campaign somebody forgot to file,
// which is why every plan carries `unplanned` — the live campaigns inside its
// dates that belong to no plan, NAMED rather than counted, with a one-click way
// to file each of them.
//
// FILING IS AN EDIT OF THE CAMPAIGN, so it goes through the campaigns route and
// needs `marketing.campaigns.edit`, not the plan's own right. Somebody who may
// write the plan but not the campaigns sees the gap and cannot close it, which
// is the correct half-power rather than a missing button.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import { useStudioLocale } from "@/components/studio2/locale";
import {
  panel, h2, sub, btn, btnGhost, btnRow, btnRowDanger, money, fmtDate, Dialog, Empty,
} from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";
import { marketingPlansDict } from "@/shared/studio/marketingPlans";
import { marketingDeptDict } from "@/shared/studio/marketingDept";

const KINDS = ["month", "quarter", "half", "year", "custom"];
const BLANK = {
  id: "", name: "", periodKind: "quarter", startOn: "", endOn: "",
  objectives: "", ownerCollaboratorId: "", budget: "", expectedLeads: "", expectedRevenue: "",
};
const blank = (v) => (v === null || v === undefined ? "" : String(v));

export default function StudioMarketingPlans({ slug }) {
  const locale = useStudioLocale();
  const tr = marketingPlansDict(locale);
  const dept = marketingDeptDict(locale);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/marketing/plans`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setError(tr.refuse[body.error] || body.error || tr.failed); return; }
    setError("");
    setData(body);
  }, [slug, tr]);

  useEffect(() => {
    let alive = true;
    (async () => { if (alive) await reload(); })();
    return () => { alive = false; };
  }, [reload]);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <ScreenSkeleton loadingLabel={tr.loading} />;

  const { plans = [], people = [], currency = "", sources = {}, unconverted = 0 } = data;
  const cash = (n) => `${money(n || 0, currency)}${currency ? ` ${currency}` : ""}`;

  const save = async () => {
    setBusy(true);
    const body = { ...form, id: form.id || undefined };
    const res = await fetch(`/api/studios/${slug}/marketing/plans`, {
      method: form.id ? "PUT" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const answer = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(tr.refuse[answer.error] || answer.error || tr.failed); return; }
    setError("");
    setForm(null);
    await reload();
  };

  const remove = async (id) => {
    if (!window.confirm(tr.confirmDelete)) return;
    const res = await fetch(`/api/studios/${slug}/marketing/plans`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const answer = await res.json().catch(() => ({}));
    if (!res.ok) { setError(tr.refuse[answer.error] || answer.error || tr.failed); return; }
    setError("");
    await reload();
  };

  // FILING GOES THROUGH THE CAMPAIGN'S OWN DOOR — there is no second writer of
  // a campaign's fields, which is the same rule that keeps the calendar
  // read-only.
  const file = async (campaignId, planId) => {
    const res = await fetch(`/api/studios/${slug}/marketing/campaigns`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: campaignId, planId }),
    });
    const answer = await res.json().catch(() => ({}));
    if (!res.ok) { setError(tr.refuse[answer.error] || answer.error || tr.failed); return; }
    setError("");
    await reload();
  };

  return (
    <div className="space-y-4">
      <section className={panel}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 max-w-2xl">
            <h2 className={h2}>{tr.title}</h2>
            <p className={sub}>{tr.sub}</p>
          </div>
          <div className="flex gap-2">
            <Link className={btnGhost} href={`/${slug}/marketing-campaigns`}>{tr.openRegister}</Link>
            {data.canCreate && (
              <button type="button" className={btn} onClick={() => setForm({ ...BLANK })}>{tr.add}</button>
            )}
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">{error}</p>}
        {/* WHAT WAS NOT READ, said in words. "No spend" and "nothing was read"
            are different sentences, and a zero that means the second is a lie. */}
        {!sources.finance && <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">{tr.noFinance}</p>}
        {unconverted > 0 && (
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{tr.unconverted(unconverted)}</p>
        )}
      </section>

      {plans.length === 0 ? (
        <section className={panel}><Empty title={tr.none} body={tr.noneHint} /></section>
      ) : (
        plans.map((p) => (
          <PlanCard
            key={p.id} plan={p} tr={tr} dept={dept} cash={cash} slug={slug}
            canEdit={data.canEdit} canDelete={data.canDelete} canFile={data.canFile}
            onEdit={() => setForm({
              id: p.id, name: p.name, periodKind: p.periodKind,
              startOn: p.startOn, endOn: p.endOn, objectives: p.objectives,
              ownerCollaboratorId: p.ownerCollaboratorId,
              budget: blank(p.budget), expectedLeads: blank(p.expectedLeads),
              expectedRevenue: blank(p.expectedRevenue),
            })}
            onDelete={() => remove(p.id)}
            onFile={(campaignId) => file(campaignId, p.id)}
          />
        ))
      )}

      {form && (
        <Dialog title={form.id ? tr.edit : tr.add} onClose={() => setForm(null)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tr.name} value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))} inputProps={{ maxLength: 200 }} />
            <Field label={tr.periodKind} as="select" value={form.periodKind}
              onChange={(v) => setForm((f) => ({ ...f, periodKind: v }))}
              options={KINDS.map((k) => ({ value: k, label: tr.kinds[k] }))} />
            {form.periodKind === "custom" ? (
              <>
                <Field label={tr.startOn} type="date" value={form.startOn}
                  onChange={(v) => setForm((f) => ({ ...f, startOn: v }))} />
                <Field label={tr.endOn} type="date" value={form.endOn}
                  onChange={(v) => setForm((f) => ({ ...f, endOn: v }))} />
              </>
            ) : (
              /* ONE DATE, NOT TWO. The whole month or quarter is taken from any
                 day inside it, so two plans called Q1 cannot disagree about
                 when Q1 starts. */
              <div className="sm:col-span-2">
                <Field label={tr.anyDayIn} type="date" value={form.startOn}
                  onChange={(v) => setForm((f) => ({ ...f, startOn: v }))} />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{tr.anyDayInHint}</p>
              </div>
            )}
            <div className="sm:col-span-2">
              <Field label={tr.objectives} as="textarea" value={form.objectives}
                onChange={(v) => setForm((f) => ({ ...f, objectives: v }))} inputProps={{ maxLength: 4000 }} />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{tr.objectivesHint}</p>
            </div>
            <Field label={tr.owner} as="select" value={form.ownerCollaboratorId}
              onChange={(v) => setForm((f) => ({ ...f, ownerCollaboratorId: v }))}
              options={[{ value: "", label: tr.nobody },
                ...people.map((p) => ({ value: p.id, label: p.alias || p.id }))]} />
            <Field label={tr.budget} type="number" value={form.budget}
              onChange={(v) => setForm((f) => ({ ...f, budget: v }))} />
            <Field label={tr.expectedLeads} type="number" value={form.expectedLeads}
              onChange={(v) => setForm((f) => ({ ...f, expectedLeads: v }))} />
            <Field label={tr.expectedRevenue} type="number" value={form.expectedRevenue}
              onChange={(v) => setForm((f) => ({ ...f, expectedRevenue: v }))} />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className={btnGhost} onClick={() => setForm(null)}>{tr.cancel}</button>
            <button type="button" className={btn} disabled={busy} onClick={save}>{tr.save}</button>
          </div>
        </Dialog>
      )}
    </div>
  );
}

function PlanCard({ plan, tr, dept, cash, slug, canEdit, canDelete, canFile, onEdit, onDelete, onFile }) {
  const p = plan;
  const period = p.period ? tr.period(p.period.token, p.period.n, p.period.year) : "";
  return (
    <section className={panel}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-base font-800 text-[var(--geex-ink)]">{p.name}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {[period, `${fmtDate(p.startOn)} → ${fmtDate(p.endOn)}`, p.ownerAlias && `${tr.owner}: ${p.ownerAlias}`]
              .filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {canEdit && <button type="button" className={btnRow} onClick={onEdit}>{tr.edit}</button>}
          {canDelete && <button type="button" className={btnRowDanger} onClick={onDelete}>{tr.remove}</button>}
        </div>
      </div>

      {p.objectives && (
        <p className="mt-3 whitespace-pre-line text-sm text-slate-700 dark:text-slate-200">{p.objectives}</p>
      )}

      {/* NO BUDGET IS ITS OWN SENTENCE, never a row of noughts: "nobody has set
          one" and "an envelope of nothing" are different answers. */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Figure label={tr.budget} value={p.budget === null ? tr.noBudget : cash(p.budget)} />
        <Figure label={tr.allocated} value={cash(p.allocated)} hint={tr.allocatedHint}
          tone={p.over ? "text-rose-600 dark:text-rose-300" : ""} />
        <Figure label={tr.left} value={p.left === null ? "—" : cash(p.left)}
          tone={p.left !== null && p.left < 0 ? "text-rose-600 dark:text-rose-300" : ""} />
        <Figure label={tr.spent} value={cash(p.spent)}
          hint={p.remaining === null ? "" : `${tr.remaining}: ${cash(p.remaining)}`} />
      </div>
      {p.over && <p className="mt-2 text-xs text-rose-600 dark:text-rose-300">{tr.over}</p>}

      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        {[tr.campaignsIn(p.campaigns), p.unbudgeted > 0 && tr.unbudgeted(p.unbudgeted)].filter(Boolean).join(" · ")}
      </p>

      {/* WHAT THE PERIOD WAS FOR, MEASURED. A plan's two targets were stored
          from the day plans shipped and read by nothing at all until now. */}
      {(p.attainment?.leads?.target !== null || p.attainment?.revenue?.target !== null) && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <PlanTarget label={tr.expectedLeads} at={p.attainment.leads} tr={tr} />
          <PlanTarget label={tr.expectedRevenue} at={p.attainment.revenue} tr={tr} money={cash} />
        </div>
      )}

      <div className="mt-4">
        <p className="text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">{tr.members}</p>
        {(p.members || []).length === 0 ? (
          <>
            <p className="mt-1 text-xs text-slate-400">{tr.noMembers}</p>
            <p className="text-[11px] text-slate-400">{tr.noMembersHint}</p>
          </>
        ) : (
          <ul className="mt-2 space-y-1">
            {p.members.map((c) => (
              <li key={c.id} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <Link href={`/${slug}/marketing-campaigns`} className="font-600 text-[var(--geex-ink)] hover:underline">
                  {c.name}
                </Link>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {[c.reference, dept.status(c.status),
                    c.budget === null ? tr.noBudget : cash(c.budget),
                    `${tr.spent}: ${cash(c.spent)}`].filter(Boolean).join(" — ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* THE FILING GAP, NAMED. Their money is in no plan's total, and a number
          alone would not say which campaigns to go and file. */}
      {(p.unplanned || []).length > 0 && (
        <div className="mt-4 rounded-xl bg-amber-50/60 p-3 dark:bg-amber-500/[0.06]">
          <p className="text-xs font-600 text-amber-800 dark:text-amber-300">{tr.unplanned}</p>
          <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80">{tr.unplannedHint}</p>
          <ul className="mt-2 space-y-1">
            {p.unplanned.map((c) => (
              <li key={c.id} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="font-600 text-[var(--geex-ink)]">{c.name}</span>
                <span className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  {[c.reference, dept.status(c.status), c.budget === null ? tr.noBudget : cash(c.budget)]
                    .filter(Boolean).join(" — ")}
                  {canFile && (
                    <button type="button" className={btnRow} onClick={() => onFile(c.id)}>{tr.fileHere}</button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/** One of a plan's targets, against what its campaigns brought in. */
function PlanTarget({ label, at, tr, money }) {
  if (!at || at.target === null) return null;
  const show = (n) => (money ? money(n) : String(n));
  return (
    <span className={at.met ? "text-emerald-700 dark:text-emerald-300" : "text-slate-500 dark:text-slate-400"}>
      <span className="font-600">{label}:</span>{" "}
      {tr.ofTarget(show(at.actual), show(at.target))}
      {at.share !== null && <span className="num ms-1">({Math.round(at.share * 100)}%)</span>}
    </span>
  );
}

function Figure({ label, value, hint, tone = "" }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
      <p className="text-xs font-600 text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`num mt-1 text-lg font-800 text-[var(--geex-ink)] ${tone}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}
