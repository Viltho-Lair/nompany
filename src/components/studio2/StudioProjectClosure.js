// CLOSING A PROJECT OUT — the punch list, practical completion, and the support
// clock that runs from handover.
//
// THE BLOCKERS ARE SHOWN, NOT JUST THE DISABLED BUTTON. A screen that says a
// job cannot be closed without saying why sends somebody hunting through the
// record; the server returns the reasons and this prints them.
//
// THE PUNCH LIST IS THE INSPECTIONS' OWN SNAGS, read rather than kept. A second
// list of defects would be two lists of the same snags, free to disagree the
// first time either was edited.
"use client";
import { useCallback, useEffect, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { projectsDict } from "@/shared/studio/projects";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { panel, h2, sub, btn, btnGhost, Empty, microLabel, fmtDate } from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";

function refusal(tr, token) {
  switch (token) {
    case "closed": return tr.refuseClosed;
    case "handover-before-completion": return tr.refuseHandoverBefore;
    case "warranty-negative": return tr.refuseWarrantyNegative;
    case "warranty-fraction": return tr.refuseWarrantyFraction;
    case "warranty-range": return tr.refuseWarrantyRange;
    default: return token;
  }
}

function blockerLabel(tr, token) {
  switch (token) {
    case "no-practical-completion": return tr.blockerNoCompletion;
    case "open-snags": return tr.blockerOpenSnags;
    default: return token;
  }
}

/** The support clock in one sentence, chosen by the state the server derived. */
function warrantyLine(tr, position) {
  switch (position.warrantyState) {
    case "none": return tr.warrantyNone;
    case "running": return tr.warrantyRunning(position.warrantyDaysLeft);
    case "expiring": return tr.warrantyExpiring(position.warrantyDaysLeft);
    case "expired": return tr.warrantyExpired(position.warrantyDaysLeft);
    // NOT "no support period" — the clock has not started, which is a different
    // thing from having none and from having run out.
    default: return tr.warrantyUnknown;
  }
}

export default function StudioProjectClosure({ slug, projectId }) {
  const tr = projectsDict(useStudioLocale());
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState(null);

  const read = useCallback(async () => {
    const res = await fetch(
      `/api/studios/${slug}/projects/closure?projectId=${encodeURIComponent(projectId)}`,
      { cache: "no-store" },
    );
    return { ok: res.ok, body: await res.json().catch(() => ({})) };
  }, [slug, projectId]);

  const apply = useCallback(({ ok, body }) => {
    if (!ok) { setError(body.error || "failed"); return; }
    setError("");
    setData(body);
    const c = (body.closures || [])[0];
    if (c) {
      setDraft({
        practicalCompletionAt: c.position.practicalCompletionAt || "",
        handoverAt: c.position.handoverAt || "",
        supportPeriodDays: String(c.position.supportPeriodDays ?? ""),
        finalAccountAt: c.finalAccountAt || "",
      });
    }
  }, []);

  useEffect(() => {
    let current = true;
    (async () => {
      const answer = await read();
      if (current) apply(answer);
    })();
    return () => { current = false; };
  }, [read, apply]);

  const reload = useCallback(async () => { apply(await read()); }, [read, apply]);
  // The project and the inspections closing it are both written under
  // `projects-list` — inspections sit there rather than in Quality & HSE, whose
  // section renders nothing and gates on no right (see SECTION_COLLECTIONS).
  useLiveUpdates(slug, "projects-list", reload);

  const send = useCallback(async (payload) => {
    setError(""); setBusy(true);
    const res = await fetch(`/api/studios/${slug}/projects/closure`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(refusal(tr, out.error || "failed")); return false; }
    await reload();
    return true;
  }, [slug, reload, tr]);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <ScreenSkeleton loadingLabel={tr.loadingClosure} />;

  const closure = (data.closures || [])[0];
  if (!closure) return <Empty title={tr.closure} body={tr.closureSub} />;

  const pos = closure.position || {};
  const punch = pos.punch || {};
  const { canEdit } = data;

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className={h2}>{tr.closure}</h2>
          <p className={sub}>{tr.closureSub}</p>
        </div>
        {pos.isClosed ? (
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-600 text-slate-600 dark:bg-white/5 dark:text-slate-300">
            {closure.closedByAlias
              ? tr.closedByOn(closure.closedByAlias, fmtDate(pos.closedAt))
              : tr.projectClosed}
          </span>
        ) : canEdit && (
          <button type="button" className={btn} disabled={busy || !pos.canClose}
            onClick={() => send({ id: closure.id, action: "close" })}>{tr.closeProject}</button>
        )}
      </div>

      {/* WHY IT CANNOT CLOSE, in words. A disabled button on its own is a dead
          end; these two sentences say where to go. */}
      {!pos.isClosed && (pos.blockers || []).length > 0 && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
          {tr.cannotCloseYet}{" "}
          {pos.blockers.map((b) => blockerLabel(tr, b)).join("; ")}.
        </p>
      )}

      <section className={panel}>
        <p className={microLabel}>{tr.punchListHeading}</p>
        <div className="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span className={punch.open > 0 ? "text-rose-600 dark:text-rose-300" : "text-slate-600 dark:text-slate-300"}>
            {tr.punchOpen}: <span className="num font-600">{punch.open}</span>
          </span>
          <span className="text-slate-600 dark:text-slate-300">
            {tr.punchClosed}: <span className="num font-600">{punch.closed}</span>
          </span>
          {punch.oldestOpenDays !== null && punch.oldestOpenDays !== undefined && (
            <span className="text-amber-600 dark:text-amber-300">{tr.oldestOpenSnag(punch.oldestOpenDays)}</span>
          )}
        </div>

        {!(closure.snags || []).length ? (
          <p className="mt-2 text-xs text-slate-400">{tr.punchClear}</p>
        ) : (
          <ul className="mt-3 space-y-1 text-xs">
            {closure.snags.map((sn) => {
              const open = sn.result === "pending" || sn.result === "fail";
              return (
                <li key={sn.id} className="flex flex-wrap items-baseline gap-x-2">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${open ? "bg-rose-500" : "bg-emerald-500"}`} />
                  <span className="font-mono text-slate-500 dark:text-slate-400">{sn.reference}</span>
                  <span className="text-slate-700 dark:text-slate-200">{sn.title}</span>
                  {sn.location && <span className="text-slate-400">· {sn.location}</span>}
                  {sn.scheduledDate && <span className="text-slate-400">· {fmtDate(sn.scheduledDate)}</span>}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className={panel}>
        <p className={microLabel}>{tr.warrantyHeading}</p>
        <p className={`mt-1 text-sm ${
          pos.warrantyState === "expired" ? "text-rose-600 dark:text-rose-300"
            : pos.warrantyState === "expiring" ? "text-amber-600 dark:text-amber-300"
              : "text-slate-600 dark:text-slate-300"
        }`}>
          {warrantyLine(tr, pos)}
          {/* NULL IS NOT A DATE. Where the clock has not started there is
              nothing to print, and printing today's date plus a year would
              invent one nobody agreed. */}
          {pos.warrantyEndsAt ? ` · ${tr.warrantyEnds} ${fmtDate(pos.warrantyEndsAt)}` : ""}
        </p>
      </section>

      {draft && (
        <section className={panel}>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field type="date" label={tr.practicalCompletion} value={draft.practicalCompletionAt}
              hint={tr.practicalCompletionHint} disabled={!canEdit || pos.isClosed}
              onChange={(v) => setDraft({ ...draft, practicalCompletionAt: v })} />
            <Field type="date" label={tr.handoverDate} value={draft.handoverAt}
              hint={tr.handoverHint} disabled={!canEdit || pos.isClosed}
              onChange={(v) => setDraft({ ...draft, handoverAt: v })} />
            <Field type="number" label={tr.supportPeriod} value={draft.supportPeriodDays}
              hint={tr.supportPeriodHint} disabled={!canEdit || pos.isClosed}
              onChange={(v) => setDraft({ ...draft, supportPeriodDays: v })} />
            <Field type="date" label={tr.finalAccount} value={draft.finalAccountAt}
              disabled={!canEdit || pos.isClosed}
              onChange={(v) => setDraft({ ...draft, finalAccountAt: v })} />
          </div>
          {canEdit && !pos.isClosed && (
            <div className="mt-3 flex justify-end">
              <button type="button" className={btnGhost} disabled={busy}
                onClick={() => send({
                  id: closure.id,
                  practicalCompletionAt: draft.practicalCompletionAt,
                  handoverAt: draft.handoverAt,
                  supportPeriodDays: Number(draft.supportPeriodDays || 0),
                  finalAccountAt: draft.finalAccountAt,
                })}>{tr.save}</button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
