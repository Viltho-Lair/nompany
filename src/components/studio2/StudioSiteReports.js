// DAILY SITE REPORTS — the site's own record of what each day was.
//
// THE DIARY BANNER IS THE POINT OF THE SCREEN. A contemporaneous record with a
// fortnight missing from the middle stops being contemporaneous, and the moment
// that matters is the moment somebody is relying on it — by which time the days
// cannot be reconstructed. So the gaps are shown at the top, while they are
// still recent enough to fill.
//
// OBSERVED AND BOOKED ARE BOTH SHOWN. A report says twelve joiners were on
// site; the timesheets say ten people booked hours. Neither corrects the other
// here — the disagreement is the finding, and deciding between them is a
// conversation rather than a rounding rule.
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { projectsDict } from "@/shared/studio/projects";
import ProjectHubTabs from "@/components/studio2/ProjectHubTabs";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { panel, h2, sub, btn, btnGhost, Empty, Dialog, microLabel, fmtDate } from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";

function refusal(tr, token) {
  switch (token) {
    case "duplicate": return tr.refuseDuplicateDay;
    case "submitted": return tr.refuseSubmittedEdit;
    case "already-submitted": return tr.refuseSubmittedEdit;
    case "negative-hours": return tr.refuseNegativeHours;
    case "idle-exceeds": return tr.refuseIdleExceeds;
    case "date": return tr.refuseNoDate;
    default: return token;
  }
}

// KEYED BY THE STORED TOKEN and translated on display, like every status in the
// product — what the API returns and the goldens pin is unchanged.
function causeLabel(tr, cause) {
  switch (cause) {
    case "weather": return tr.causeWeather;
    case "access": return tr.causeAccess;
    case "information": return tr.causeInformation;
    case "materials": return tr.causeMaterials;
    case "labour": return tr.causeLabour;
    case "other": return tr.causeOther;
    default: return "";
  }
}

const emptyDraft = () => ({
  reportDate: "", weather: "", workStopped: false,
  labour: [{ trade: "", headcount: "" }],
  plant: [{ description: "", count: "", idle: "" }],
  delays: [{ description: "", hoursLost: "", cause: "" }],
  progress: "", visitors: "",
});

export default function StudioSiteReports({ slug, projectId = "" }) {
  const tr = projectsDict(useStudioLocale());
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const read = useCallback(async () => {
    const q = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
    const res = await fetch(`/api/studios/${slug}/projects/reports${q}`, { cache: "no-store" });
    return { ok: res.ok, body: await res.json().catch(() => ({})) };
  }, [slug, projectId]);

  const apply = useCallback(({ ok, body }) => {
    if (!ok) { setError(body.error || "failed"); return; }
    setError("");
    setData(body);
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
  // Site reports and the timesheets they are read beside are both written under
  // `projects-list` — the project list owns the labour booked against a deal, so
  // one watch covers the whole payload.
  useLiveUpdates(slug, "projects-list", reload);

  const send = useCallback(async (method, payload) => {
    setError(""); setBusy(true);
    const res = await fetch(`/api/studios/${slug}/projects/reports`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(refusal(tr, out.error || "failed")); return false; }
    await reload();
    return true;
  }, [slug, reload, tr]);

  // PHOTOGRAPHS GO TO THE SHARED PRIVATE-MEDIA ROUTE, which verifies membership
  // before it writes and again before it serves — nothing new was built for
  // storage, and the blob URL never reaches a client that has not been checked.
  // The studio travels with the upload because a private blob is readable by
  // that studio's members and nobody else, and the server verifies that rather
  // than taking this screen's word for it.
  const attach = useCallback(async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("slug", slug);
      const res = await fetch("/api/media?kind=private", { method: "POST", body });
      const out = await res.json().catch(() => ({}));
      if (res.ok && out.url) {
        setForm((f) => (f ? { ...f, photos: [...(f.photos || []), out.url] } : f));
      } else {
        setError(tr.photoFailed);
      }
    } finally {
      setUploading(false);
    }
  }, [slug, tr]);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <ScreenSkeleton loadingLabel={tr.loadingReports} />;

  const { reports, diary, canCreate, canEdit } = data;

  return (
    <div className="space-y-6">
      {/* The hub's bar, when this diary is one project's — see ProjectHubTabs. */}
      {projectId && <ProjectHubTabs slug={slug} projectId={projectId} active="reports" />}
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className={h2}>{tr.siteReports}</h2>
          <p className={sub}>{tr.siteReportsSub}</p>
        </div>
        {canCreate && (
          <button type="button" className={btn}
            onClick={() => setForm({ ...emptyDraft(), projectId })}>{tr.newReport}</button>
        )}
      </div>

      {/* THE GAPS, WHILE THEY CAN STILL BE FILLED. Only against one project: a
          gap across every project at once is just the days nobody built
          anything, which is why the server returns this scoped or not at all. */}
      {diary && (
        <section className={panel}>
          <p className={microLabel}>{tr.diaryHeading}</p>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            {diary.daysSinceLast !== null && (
              <span className={diary.daysSinceLast > 2 ? "text-amber-600 dark:text-amber-300" : "text-slate-600 dark:text-slate-300"}>
                {tr.daysSinceLast(diary.daysSinceLast)}
              </span>
            )}
            <span className="text-slate-600 dark:text-slate-300">
              {tr.totalHoursLost}: <span className="num">{diary.totalHoursLost}</span>
            </span>
            <span className="text-slate-600 dark:text-slate-300">
              {tr.weatherHoursLost}: <span className="num">{diary.weatherHoursLost}</span>
            </span>
            <span className="text-slate-600 dark:text-slate-300">
              {tr.daysStopped}: <span className="num">{diary.daysWorkStopped}</span>
            </span>
          </div>
          {!diary.gaps.length ? (
            <p className="mt-2 text-xs text-slate-400">{tr.diaryComplete}</p>
          ) : (
            <div className="mt-2">
              <p className="text-xs font-600 text-amber-700 dark:text-amber-300">{tr.diaryGaps(diary.gaps.length)}</p>
              <ul className="mt-1 space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                {diary.gaps.map((g) => (
                  <li key={`${g.from}-${g.to}`}>{tr.diaryGapRange(fmtDate(g.from), fmtDate(g.to), g.days)}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {!reports.length ? (
        <Empty title={tr.noReports} body={tr.noReportsBody} />
      ) : (
        <div className="space-y-3">
          {reports.map((r) => {
            const t = r.totals || {};
            const lc = r.labourCheck || {};
            return (
              <section key={r.id} className={panel}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-slate-900 dark:text-white">
                      <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{r.reference}</span>
                      <span className="ms-2 font-600">{fmtDate(r.reportDate)}</span>
                      {r.status === "Submitted" && (
                        <span className="ms-2 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-600 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                          {tr.submittedBadge}
                        </span>
                      )}
                      {r.workStopped && (
                        <span className="ms-2 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-600 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                          {tr.workStoppedLabel}
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {tr.onSiteCount(t.headcount || 0)}
                      {t.hoursLost ? ` · ${tr.hoursLostCount(t.hoursLost)}` : ""}
                      {r.weather ? ` · ${r.weather}` : ""}
                    </p>
                    {r.status === "Submitted" && r.submittedByAlias && (
                      <p className="mt-1 text-xs text-slate-400">
                        {tr.submittedByOn(r.submittedByAlias, fmtDate(r.submittedAt))}
                      </p>
                    )}
                  </div>
                  {canEdit && r.editable && (
                    <button type="button" className={btn} disabled={busy}
                      onClick={() => send("PUT", { id: r.id, action: "submit" })}>{tr.submitReport}</button>
                  )}
                </div>

                {r.progress && (
                  <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{r.progress}</p>
                )}

                {(r.delays || []).length > 0 && (
                  <ul className="mt-3 space-y-1 text-xs">
                    {r.delays.map((d, i) => (
                      <li key={i} className="text-slate-600 dark:text-slate-300">
                        <span className="num font-600">{d.hoursLost}</span>
                        {d.cause ? ` · ${causeLabel(tr, d.cause)}` : ""} — {d.description}
                      </li>
                    ))}
                  </ul>
                )}

                {/* THE PHOTOGRAPHS, ON THE REPORT. They uploaded and stored from
                    the day this screen shipped and were rendered NOWHERE but the
                    edit dialog, as a list of file names — so the evidence a site
                    engineer went out and gathered was invisible to everybody who
                    read the report afterwards, which is the only audience it has.

                    THE URL IS THE MEDIA ROUTE'S, NOT THE BLOB'S. Uploads go to
                    /api/media?kind=private, which never hands out the Blob
                    address: the route re-checks membership and streams the bytes.
                    So an <img> here is gated by the same check that gated the
                    upload, and a copied link is worth nothing to somebody outside
                    the studio. */}
                {(r.photos || []).length > 0 && (
                  <div className="mt-3 border-t border-slate-100 pt-3 dark:border-white/5">
                    <p className={microLabel}>{tr.photosLabel}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {r.photos.map((url, i) => (
                        <a key={url} href={url} target="_blank" rel="noreferrer"
                          className="block h-24 w-32 overflow-hidden rounded-lg border border-slate-200 dark:border-white/10">
                          {/* eslint-disable-next-line @next/next/no-img-element --
                              next/image cannot optimise a private streaming route:
                              the optimiser fetches server-side without the reader's
                              cookie, so every photograph would 404. */}
                          <img src={url} alt={tr.photoAlt(r.reference, i + 1)}
                            loading="lazy" className="h-full w-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-3 border-t border-slate-100 pt-3 dark:border-white/5">
                  <p className={microLabel}>{tr.observedVsBooked}</p>
                  {/* NULL IS NOT NOUGHT: no timesheet covering the day is not
                      nobody working, so it says so rather than showing a zero. */}
                  {lc.onTimesheets === null || lc.onTimesheets === undefined ? (
                    <p className="text-xs text-slate-400">{tr.noTimesheetYet}</p>
                  ) : (
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {tr.observedLabel} <span className="num font-600">{lc.observed}</span>
                      {" · "}
                      {tr.bookedLabel} <span className="num font-600">{lc.onTimesheets}</span>
                      {" — "}
                      <span className={lc.agrees ? "text-emerald-600 dark:text-emerald-300" : "text-amber-600 dark:text-amber-300"}>
                        {lc.agrees ? tr.labourAgrees : tr.labourDiffers(lc.difference)}
                      </span>
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {form && (
        <Dialog title={tr.newReport} onClose={() => setForm(null)}>
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <Field type="date" label={tr.reportDate} value={form.reportDate} hint={tr.reportDateHint}
                onChange={(v) => setForm({ ...form, reportDate: v })} />
              <Field label={tr.weatherLabel} value={form.weather}
                onChange={(v) => setForm({ ...form, weather: v })} />
            </div>

            <Rows form={form} setForm={setForm} field="labour" label={tr.labourLabel}
              addLabel={tr.addLine} blank={{ trade: "", headcount: "" }}
              cols={[["trade", tr.tradeLabel, "text"], ["headcount", tr.headcountLabel, "number"]]} />

            <Rows form={form} setForm={setForm} field="plant" label={tr.plantLabel}
              addLabel={tr.addLine} blank={{ description: "", count: "", idle: "" }}
              cols={[["description", tr.plantDescription, "text"], ["count", tr.plantCount, "number"], ["idle", tr.plantIdle, "number"]]} />

            <Rows form={form} setForm={setForm} field="delays" label={tr.delaysLabel}
              addLabel={tr.addLine} blank={{ description: "", hoursLost: "", cause: "" }}
              cols={[
                ["description", tr.delayWhat, "text"],
                ["hoursLost", tr.delayHours, "number"],
                ["cause", tr.delayCause, "select", [
                  { value: "", label: "—" },
                  { value: "weather", label: tr.causeWeather },
                  { value: "access", label: tr.causeAccess },
                  { value: "information", label: tr.causeInformation },
                  { value: "materials", label: tr.causeMaterials },
                  { value: "labour", label: tr.causeLabour },
                  { value: "other", label: tr.causeOther },
                ]],
              ]} />

            <Field as="textarea" label={tr.progressLabel} value={form.progress}
              onChange={(v) => setForm({ ...form, progress: v })} />
            <Field label={tr.visitorsLabel} value={form.visitors}
              onChange={(v) => setForm({ ...form, visitors: v })} />

            <div>
              <p className={microLabel}>{tr.photosLabel}</p>
              {(form.photos || []).length > 0 && (
                <ul className="mb-2 space-y-1 text-xs">
                  {form.photos.map((url, i) => (
                    <li key={url} className="flex items-center justify-between gap-2">
                      <span className="truncate text-slate-500 dark:text-slate-400">{url.split("/").pop()}</span>
                      <button type="button" className={btnGhost}
                        onClick={() => setForm({
                          ...form, photos: form.photos.filter((_, j) => j !== i),
                        })}>{tr.removeLabel}</button>
                    </li>
                  ))}
                </ul>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { attach(e.target.files?.[0]); e.target.value = ""; }} />
              <button type="button" className={btnGhost} disabled={uploading}
                onClick={() => fileRef.current?.click()}>
                {uploading ? tr.photoUploading : tr.addPhoto}
              </button>
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setForm(null)}>{tr.cancel}</button>
              <button type="button" className={btn} disabled={busy}
                onClick={async () => {
                  const done = await send("POST", { ...form, photos: form.photos || [] });
                  if (done) setForm(null);
                }}>{tr.save}</button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}

/**
 * ONE EDITOR FOR THREE LISTS. Labour, plant and delays are the same shape — a
 * growing list of rows of named fields — and three hand-written copies of it
 * would be three places to fix the next time `Field` changes.
 */
const GRID = { 1: "", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-4" };

function Rows({ form, setForm, field, label, addLabel, blank, cols }) {
  const rows = form[field] || [];
  const set = (i, key) => (v) => {
    const next = rows.slice();
    next[i] = { ...rows[i], [key]: v };
    setForm({ ...form, [field]: next });
  };
  return (
    <div>
      <p className={microLabel}>{label}</p>
      <div className="space-y-2">
        {rows.map((row, i) => (
          // A LOOKUP, NOT AN INTERPOLATION. Tailwind's JIT scans source text
          // for whole class names, so `sm:grid-cols-${n}` generates nothing and
          // the row would silently stack instead of laying out in columns.
          <div key={i} className={`grid gap-2 ${GRID[cols.length] || "sm:grid-cols-2"}`}>
            {cols.map(([key, colLabel, type, options]) => (
              type === "select"
                ? <Field key={key} as="select" label={colLabel} value={row[key]}
                    options={options} onChange={set(i, key)} />
                : <Field key={key} type={type} label={colLabel} value={row[key]}
                    onChange={set(i, key)} />
            ))}
          </div>
        ))}
      </div>
      <button type="button" className={`${btnGhost} mt-2`}
        onClick={() => setForm({ ...form, [field]: [...rows, { ...blank }] })}>{addLabel}</button>
    </div>
  );
}
