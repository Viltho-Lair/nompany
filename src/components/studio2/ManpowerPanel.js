"use client";

import { useCallback, useState } from "react";
import { Field } from "@/components/fields/Field";
import { manpowerDict } from "@/shared/studio/manpower";
import { useReload } from "@/components/studio2/useReload";

// HOW MANY PEOPLE THE WORK NEEDS, AGAINST HOW MANY THERE ARE.
//
// The product has always known who it employs and what they do; it has never
// known what the work REQUIRES, so "can we take this job" was answered by
// somebody counting names on a whiteboard after the bid had gone in.
//
// A PLAN IS A DEMAND, NOT AN ASSIGNMENT. It says a project wants four site
// engineers between March and June, and deliberately not which four — naming
// people would make it a roster, and the dispatch board already is one for work
// that exists. This is for work that does not.
export default function ManpowerPanel({ slug, locale = "en" }) {
  const tr = manpowerDict(locale);
  const [data, setData] = useState(null);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const [day, setDay] = useState("");
  const [draft, setDraft] = useState(null);

  const load = useCallback(async () => {
    const qs = day ? `?day=${encodeURIComponent(day)}` : "";
    const res = await fetch(`/api/studios/${slug}/hr/manpower${qs}`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setProblem(body.error || "failed"); return; }
    setData(body);
    setDay((d) => d || body.day);
  }, [slug, day, setData, setDay, setProblem]);

  useReload(load);

  const send = useCallback(async (method, payload) => {
    setBusy(true); setProblem("");
    const res = await fetch(`/api/studios/${slug}/hr/manpower`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setProblem(body.detail || tr.problem(body.error) || "failed"); return false; }
    await load();
    return true;
  }, [slug, load, tr, setBusy, setProblem]);

  if (!data) return <p className="text-sm text-slate-500 dark:text-slate-400">…</p>;

  const { plans = [], gaps = [], upcoming = [], roles = [], projects = [], canManage } = data;
  // THE FIRST DAY EACH ROLE GOES SHORT, which is the sentence somebody can act
  // on — "we are short from the 3rd of March" rather than "we are short today".
  const firstShort = [];
  const seen = new Set();
  for (const d of upcoming) {
    if (seen.has(d.roleId)) continue;
    seen.add(d.roleId);
    firstShort.push(d);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.title}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tr.lead}</p>
        </div>
        <Field label={tr.day} type="date" className="w-full sm:ms-auto sm:w-44"
          value={day} onChange={(v) => setDay(v)} />
      </div>

      {problem && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
          {problem}
        </p>
      )}

      {/* ---- the gap on the chosen day ------------------------------------- */}
      {gaps.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{tr.nothingPlanned}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                <th className="py-1 pe-3 text-start">{tr.role}</th>
                <th className="py-1 pe-3 text-end">{tr.needed}</th>
                <th className="py-1 pe-3 text-end">{tr.have}</th>
                <th className="py-1 text-end">{tr.gap}</th>
              </tr>
            </thead>
            <tbody>
              {gaps.map((g) => (
                <tr key={g.roleId} className="border-t border-slate-100 dark:border-white/5">
                  <td className="py-1.5 pe-3 text-slate-700 dark:text-slate-200">
                    {g.roleName}
                    <span className="ms-2 text-xs text-slate-400 dark:text-slate-500">
                      {g.projects.map((p) => p.name).join(", ")}
                    </span>
                  </td>
                  <td className="num py-1.5 pe-3 text-end text-slate-600 dark:text-slate-300">{g.needed}</td>
                  <td className="num py-1.5 pe-3 text-end text-slate-600 dark:text-slate-300">{g.have}</td>
                  {/* SHORT AND SPARE ARE TWO FACTS, not one signed number: one
                      is a hiring decision and the other a reassignment. */}
                  <td className={`num py-1.5 text-end font-600 ${
                    g.short > 0 ? "text-rose-600 dark:text-rose-300"
                      : g.spare > 0 ? "text-emerald-600 dark:text-emerald-300"
                        : "text-slate-400 dark:text-slate-500"}`}>
                    {g.short > 0 ? tr.short(g.short) : g.spare > 0 ? tr.spare(g.spare) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ---- when each shortfall begins ------------------------------------ */}
      {firstShort.length > 0 && (
        <div className="rounded-xl bg-amber-50 px-4 py-3 dark:bg-amber-500/10">
          <h4 className="font-display text-sm font-700 text-amber-800 dark:text-amber-200">{tr.ahead}</h4>
          <ul className="mt-1 space-y-0.5">
            {firstShort.map((d) => (
              <li key={d.roleId} className="flex justify-between text-sm text-amber-800 dark:text-amber-200">
                <span>{d.roleName}</span>
                <span className="num">{tr.shortFrom(d.short, d.day)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ---- the plan ------------------------------------------------------ */}
      <div>
        <h4 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.thePlan}</h4>
        {plans.length === 0 ? (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tr.noLines}</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {plans.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-slate-700 dark:text-slate-200">{p.projectName}</span>
                <span className="text-slate-500 dark:text-slate-400">{p.roleName}</span>
                <span className="num text-slate-600 dark:text-slate-300">×{p.needed}</span>
                <span className="ms-auto text-xs text-slate-400 dark:text-slate-500">
                  {p.fromDay} → {p.toDay}
                </span>
                {canManage && (
                  <button
                    className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:text-rose-500"
                    disabled={busy}
                    onClick={() => send("DELETE", { id: p.id })}
                  >
                    {tr.remove}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {canManage && projects.length > 0 && roles.length > 0 && (
          draft ? (
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <Field label={tr.project} as="select" className="w-full sm:w-56"
                value={draft.projectId} onChange={(v) => setDraft({ ...draft, projectId: v })}
                options={projects.map((p) => ({ value: p.id, label: p.label }))} />
              <Field label={tr.role} as="select" className="w-full sm:w-48"
                value={draft.roleId} onChange={(v) => setDraft({ ...draft, roleId: v })}
                options={roles.map((r) => ({ value: r.id, label: r.name }))} />
              <Field label={tr.needed} type="number" className="w-full sm:w-24"
                value={draft.needed} onChange={(v) => setDraft({ ...draft, needed: v })} />
              <Field label={tr.from} type="date" className="w-full sm:w-40"
                value={draft.fromDay} onChange={(v) => setDraft({ ...draft, fromDay: v })} />
              <Field label={tr.to} type="date" className="w-full sm:w-40"
                value={draft.toDay} onChange={(v) => setDraft({ ...draft, toDay: v })} />
              <button
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-600 text-white disabled:opacity-50"
                disabled={busy || !draft.needed}
                onClick={async () => {
                  const done = await send("POST", { ...draft, needed: Number(draft.needed) });
                  if (done) setDraft(null);
                }}
              >
                {tr.add}
              </button>
              <button
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 dark:border-white/15 dark:text-slate-300"
                onClick={() => { setDraft(null); setProblem(""); }}
              >
                {tr.cancel}
              </button>
            </div>
          ) : (
            <button
              className="mt-3 rounded-lg border border-slate-200 px-3 py-2 text-sm font-600 text-slate-700 dark:border-white/15 dark:text-slate-200"
              onClick={() => setDraft({
                projectId: projects[0].id, roleId: roles[0].id, needed: "",
                fromDay: day, toDay: day,
              })}
            >
              {tr.add}
            </button>
          )
        )}
      </div>
    </div>
  );
}
