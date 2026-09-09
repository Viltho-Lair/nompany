"use client";

import { useCallback, useState } from "react";
import { Field } from "@/components/fields/Field";
import { attendanceDict } from "@/shared/studio/attendance";
import { useReload } from "@/components/studio2/useReload";

// WHO WAS THERE — a day's sheet, marked in one sweep.
//
// A supervisor marks a whole team at the start of a shift, so this posts a LIST
// and the server upserts each row. Marking the same sheet twice corrects it
// rather than doubling it: one row per person per day is what makes every
// figure downstream — days worked, hours, a payslip's unpaid deduction — have
// one answer.
export default function AttendancePanel({ slug, locale = "en" }) {
  const tr = attendanceDict(locale);
  const [data, setData] = useState(null);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const [day, setDay] = useState("");
  const [draft, setDraft] = useState({});
  const [saved, setSaved] = useState("");

  const load = useCallback(async () => {
    const qs = day ? `?day=${encodeURIComponent(day)}` : "";
    const res = await fetch(`/api/studios/${slug}/hr/attendance${qs}`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setProblem(body.error || "failed"); return; }
    setData(body);
    // THE DAY COMES BACK FROM THE SERVER on the first load, because the records
    // are UTC and a browser's idea of today is not.
    setDay((d) => d || body.day);
    setDraft({});
  }, [slug, day, setData, setDay, setDraft, setProblem]);

  useReload(load);

  if (!data) return <p className="text-sm text-slate-500 dark:text-slate-400">…</p>;

  const { sheet = [], month = [], canManage } = data;
  const valueOf = (row, field) => (draft[row.collaboratorId]?.[field] ?? row[field]);
  const dirty = Object.keys(draft).length > 0;

  const set = (row, field, v) => {
    setSaved("");
    setDraft((d) => ({
      ...d,
      [row.collaboratorId]: {
        status: row.status ?? "present", hours: row.hours ?? 0, notes: row.notes ?? "",
        ...d[row.collaboratorId], [field]: v,
      },
    }));
  };

  async function save() {
    setBusy(true); setProblem("");
    const marks = Object.entries(draft).map(([collaboratorId, m]) => ({
      collaboratorId,
      status: m.status,
      // A DAY NOBODY WORKED CANNOT CARRY HOURS — the server refuses it, and
      // sending nought rather than the typed number keeps a supervisor from
      // being told off for a field the screen still had on it.
      hours: m.status === "present" || m.status === "remote" ? Number(m.hours) || 0 : 0,
      notes: m.notes,
    }));
    const res = await fetch(`/api/studios/${slug}/hr/attendance`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ day, marks }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setProblem(body.detail || body.error || "failed"); return; }
    // PARTIAL IS REPORTED, NOT ROLLED BACK: a sheet of forty with one mistyped
    // row records the thirty-nine and says which one it could not.
    if (body.refused?.length) {
      setProblem(tr.someRefused(body.refused.length, body.refused[0]?.detail || ""));
    }
    setSaved(tr.savedN(body.saved || 0));
    await load();
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
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
          {problem}
        </p>
      )}
      {saved && !problem && (
        <p className="text-sm text-emerald-600 dark:text-emerald-300">{saved}</p>
      )}

      {/* ---- the day's sheet ---------------------------------------------- */}
      <div className="space-y-1">
        {sheet.map((row) => (
          <div key={row.collaboratorId}
            className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 px-3 py-2 dark:border-white/10">
            <span className="min-w-[9rem] flex-1 text-sm text-slate-700 dark:text-slate-200">{row.alias}</span>
            {/* NULL IS NOT `absent`: nothing has been said about this person
                today, and an unmarked row reads as unmarked. */}
            {!canManage ? (
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {row.status ? tr.status(row.status) : tr.unmarked}
              </span>
            ) : (
              <>
                <Field label={tr.statusLabel} as="select" className="w-full sm:w-40"
                  value={valueOf(row, "status") ?? ""}
                  onChange={(v) => set(row, "status", v)}
                  options={[{ value: "", label: tr.unmarked },
                    ...["present", "remote", "absent", "leave", "holiday"]
                      .map((s) => ({ value: s, label: tr.status(s) }))]} />
                <Field label={tr.hours} type="number" className="w-full sm:w-24"
                  value={valueOf(row, "hours") ?? 0}
                  onChange={(v) => set(row, "hours", v)} />
              </>
            )}
          </div>
        ))}
      </div>

      {canManage && (
        <button
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-600 text-white disabled:opacity-50"
          disabled={busy || !dirty}
          onClick={save}
        >
          {busy ? tr.saving : tr.save}
        </button>
      )}

      {/* ---- the month ---------------------------------------------------- */}
      <div>
        <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.month(data.period)}</h3>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                <th className="py-1 pe-3 text-start">{tr.person}</th>
                <th className="py-1 pe-3 text-end">{tr.worked}</th>
                <th className="py-1 pe-3 text-end">{tr.hours}</th>
                <th className="py-1 pe-3 text-end">{tr.absent}</th>
                <th className="py-1 pe-3 text-end">{tr.leave}</th>
                <th className="py-1 text-end">{tr.unrecorded}</th>
              </tr>
            </thead>
            <tbody>
              {month.map((m) => (
                <tr key={m.collaboratorId} className="border-t border-slate-100 dark:border-white/5">
                  <td className="py-1.5 pe-3 text-slate-700 dark:text-slate-200">{m.alias}</td>
                  <td className="num py-1.5 pe-3 text-end text-slate-600 dark:text-slate-300">{m.worked}</td>
                  <td className="num py-1.5 pe-3 text-end text-slate-600 dark:text-slate-300">{m.hours}</td>
                  <td className="num py-1.5 pe-3 text-end text-slate-600 dark:text-slate-300">{m.absent}</td>
                  <td className="num py-1.5 pe-3 text-end text-slate-600 dark:text-slate-300">{m.leave}</td>
                  {/* A DAY NOBODY MARKED IS NOT AN ABSENCE. It is the number a
                      studio watches fall as the habit takes hold, and the one a
                      payroll clerk checks before running a month. */}
                  <td className={`num py-1.5 text-end ${
                    m.unrecorded > 0 ? "text-amber-600 dark:text-amber-300" : "text-slate-400 dark:text-slate-500"}`}>
                    {m.unrecorded}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
