"use client";

// AUDIENCES & CONSENT (21/09/2026) — who this studio may contact, and the
// evidence for it. Rows arrive from the consent tick on a Marketing form, and
// by hand for the people who write in or telephone.
//
// THE LEDGER IS ADDED TO AND NEVER EDITED, and the screen says so rather than
// only behaving that way: there is no edit control and no delete, because a
// consent somebody could change afterwards proves nothing. A withdrawal is a
// new entry, which is why the row expands to its whole history.

import { Fragment, useCallback, useState } from "react";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import { useReload } from "@/components/studio2/useReload";
import { useStudioLocale } from "@/components/studio2/locale";
import { panel, h2, sub, btn, btnGhost, Dialog, fmtDate, StatTile, tileRow } from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";
import { audiencesDict } from "@/shared/studio/audiences";

const CHANNELS = ["email", "phone"];
const STATES = ["given", "withdrawn"];
const TONE = {
  given: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  withdrawn: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  unknown: "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300",
};

function State({ value, tr }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-600 ${TONE[value] || TONE.unknown}`}>{tr.state(value)}</span>;
}

// `initial` IS THIS SCREEN'S OWN ROUTE BODY, answered inside the studio page's
// render, so the register paints with its rows rather than a skeleton and a
// second request. Absent — refused, or over the payload ceiling — it fetches.
export default function StudioAudiences({ slug, initial }) {
  const locale = useStudioLocale();
  const tr = audiencesDict(locale);
  const [data, setData] = useState(initial ?? null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [channel, setChannel] = useState("");
  const [state, setState] = useState("");
  const [open, setOpen] = useState("");
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  const params = `q=${encodeURIComponent(query)}&channel=${channel}&state=${state}`;
  const reload = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/marketing/audiences?${params}`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setError(tr.refuse[body.error] || body.error || tr.failed); return; }
    setError("");
    setData(body);
  }, [slug, params, tr]);

  useReload(reload, initial);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <ScreenSkeleton loadingLabel={tr.loading} />;

  const { entries = [], totals = {}, can = {}, truncated, shown = 0 } = data;

  const save = async () => {
    setBusy(true); setError("");
    const res = await fetch(`/api/studios/${slug}/marketing/audiences`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(tr.refuse[out.error] || out.error || tr.failed); return; }
    setForm(null);
    // THE OUTCOME, NOT THE ACT: "added" alone let somebody believe a backdated
    // withdrawal had stopped contact when a later consent still stood.
    const changed = out.stateNow === form.state;
    setNotice(`${tr.recorded(tr.state(out.stateNow || form.state))}${changed ? "" : ` ${tr.recordedNoChange}`}`);
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
          {can.edit && (
            <button type="button" className={btn}
              onClick={() => setForm({ kind: "email", value: "", channel: "email", state: "given", at: "", evidence: "", note: "" })}>
              {tr.record}
            </button>
          )}
        </div>

        <div className={`mt-4 ${tileRow}`}>
          <StatTile label={tr.subjects} value={String(totals.subjects || 0)} accent="rgb(var(--chart-1))" />
          <StatTile label={tr.emailAllowed} value={String(totals.emailGiven || 0)} accent="rgb(var(--chart-2))"
            sub={`${totals.emailWithdrawn || 0} · ${tr.emailStopped}`} />
          <StatTile label={tr.phoneAllowed} value={String(totals.phoneGiven || 0)} accent="rgb(var(--chart-3))"
            sub={`${totals.phoneWithdrawn || 0} · ${tr.phoneStopped}`} />
          <StatTile label={tr.colLast} accent="rgb(var(--chart-4))"
            value={entries[0]?.lastAt ? fmtDate(entries[0].lastAt) : "—"} />
        </div>

        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{tr.appendOnly}</p>
        <p className="text-xs text-slate-400">{tr.notSending}</p>
        {notice && <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">{notice}</p>}
        {error && <p className="mt-2 text-sm text-rose-600 dark:text-rose-300">{error}</p>}
      </section>

      <section className={panel}>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[14rem] flex-1">
            <Field label={tr.search} value={query} onChange={setQuery} hint={tr.searchHint} />
          </div>
          <div className="min-w-[10rem]">
            <Field label={tr.filterChannel} as="select" value={channel} onChange={setChannel}
              options={[{ value: "", label: tr.any }, ...CHANNELS.map((c) => ({ value: c, label: tr.channel(c) }))]} />
          </div>
          <div className="min-w-[10rem]">
            <Field label={tr.filterState} as="select" value={state} onChange={setState}
              options={[{ value: "", label: tr.any }, ...STATES.map((s) => ({ value: s, label: tr.state(s) }))]} />
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">{tr.none}</p>
            <p className="mt-1 text-xs text-slate-400">{tr.noneHint}</p>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            {truncated && <p className="mb-2 text-xs text-slate-400">{tr.truncated(shown)}</p>}
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-200/70 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
                  <th className="py-2 text-start font-600">{tr.colAddress}</th>
                  <th className="py-2 text-start font-600">{tr.colEmail}</th>
                  <th className="py-2 text-start font-600">{tr.colPhone}</th>
                  <th className="py-2 text-start font-600">{tr.colLast}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  // A FRAGMENT IN A LIST STILL NEEDS THE KEY — the rows inside
                  // carry their own, which React does not accept in its place.
                  <Fragment key={e.subject}>
                    <tr className="border-b border-slate-100 last:border-0 dark:border-white/5">
                      <td className="py-2.5 pe-3">
                        <button type="button" className="text-start font-600 text-[var(--geex-ink)] underline-offset-2 hover:underline"
                          onClick={() => setOpen(open === e.subject ? "" : e.subject)}>
                          {e.value}
                        </button>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {tr.source(e.history[0]?.source || "")}
                        </p>
                      </td>
                      <td className="py-2.5 pe-3">{e.channels.email ? <State value={e.channels.email.state} tr={tr} /> : <span className="text-xs text-slate-400">—</span>}</td>
                      <td className="py-2.5 pe-3">{e.channels.phone ? <State value={e.channels.phone.state} tr={tr} /> : <span className="text-xs text-slate-400">—</span>}</td>
                      <td className="py-2.5 text-xs text-slate-500 dark:text-slate-400">{e.lastAt ? fmtDate(e.lastAt) : "—"}</td>
                    </tr>
                    {open === e.subject && (
                      <tr className="border-b border-slate-100 bg-slate-50/60 dark:border-white/5 dark:bg-white/5">
                        <td className="px-3 py-3" colSpan={4}>
                          <p className="mb-2 text-xs font-600 text-slate-500 dark:text-slate-400">{tr.history}</p>
                          <ul className="space-y-2">
                            {e.history.map((h, i) => (
                              <li key={i} className="text-xs text-slate-600 dark:text-slate-300">
                                <span className="num me-2 text-slate-400">{h.at ? fmtDate(h.at) : "—"}</span>
                                {tr.historyLine(tr.channel(h.channel), tr.state(h.state), tr.source(h.source))}
                                <p className="mt-0.5 text-slate-500 dark:text-slate-400">
                                  <span className="font-600">{tr.evidence}: </span>
                                  {h.evidence || tr.noEvidence}
                                </p>
                              </li>
                            ))}
                          </ul>
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

      {form && (
        <Dialog title={tr.recordTitle} description={tr.recordSub} onClose={() => setForm(null)} width="max-w-[560px]">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={tr.kind} as="select" value={form.kind}
                onChange={(v) => setForm((f) => ({ ...f, kind: v, channel: v }))}
                options={CHANNELS.map((c) => ({ value: c, label: tr.kinds[c] }))} />
              <Field label={tr.filterState} as="select" value={form.state}
                onChange={(v) => setForm((f) => ({ ...f, state: v }))}
                options={STATES.map((s) => ({ value: s, label: tr.state(s) }))} />
            </div>
            <Field label={tr.address} required value={form.value} onChange={(v) => setForm((f) => ({ ...f, value: v }))} />
            <Field label={tr.when} type="date" value={form.at} hint={tr.whenHint}
              onChange={(v) => setForm((f) => ({ ...f, at: v }))} />
            <Field label={tr.evidence} as="textarea" value={form.evidence} hint={tr.evidenceHint}
              onChange={(v) => setForm((f) => ({ ...f, evidence: v }))} />
            <Field label={tr.note} value={form.note} onChange={(v) => setForm((f) => ({ ...f, note: v }))} />
            {error && <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setForm(null)}>{tr.cancel}</button>
              <button type="button" className={btn} disabled={busy} onClick={save}>{tr.save}</button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
