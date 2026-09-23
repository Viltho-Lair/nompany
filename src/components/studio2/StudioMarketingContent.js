"use client";

// CONTENT & BRAND ASSETS (22/09/2026) — what was made for each campaign.
//
// THE GAP IT CLOSES. A campaign has carried a brief since this morning — who it
// is for, what it says, what it offers — and nowhere to put what was MADE from
// it. So the artwork lived in somebody's Drive, and "which logo was on the
// autumn adverts" had no answer inside the product that had the adverts in it.
//
// A NEW VERSION DOES NOT OVERWRITE THE OLD ONE. It is uploaded as its own asset
// and then marked as replacing the previous one, which stays and stays
// readable — the same revision chain Tendering's bid documents have used since
// the tender pack shipped (lib/revisions), shared rather than copied.
//
// THE FILE GOES TO /api/media FIRST, which verifies membership before it
// writes; this screen only ever sends the id it hands back. The bytes are
// served by the same route after a second check, so a link here is never a
// blob URL.

import { useCallback, useState } from "react";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import { useReload } from "@/components/studio2/useReload";
import { useStudioLocale } from "@/components/studio2/locale";
import {
  panel, h2, sub, btn, btnGhost, btnRow, btnRowDanger, Dialog, Empty, fmtDate,
} from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";
import { marketingContentDict } from "@/shared/studio/marketingContent";

const BLANK = { id: "", name: "", kind: "artwork", notes: "", campaignId: "", version: "", mediaId: "" };

// `initial` IS THIS SCREEN'S OWN ROUTE BODY, answered inside the studio page's
// render, so the register paints with its rows rather than a skeleton and a
// second request. Absent — refused, or over the payload ceiling — it fetches.
export default function StudioMarketingContent({ slug, initial }) {
  const locale = useStudioLocale();
  const tr = marketingContentDict(locale);
  const [data, setData] = useState(initial ?? null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [openVersions, setOpenVersions] = useState("");
  const [replacing, setReplacing] = useState(null);

  const reload = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/marketing/assets`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setError(tr.refuse[body.error] || body.error || tr.failed); return; }
    setError("");
    setData(body);
  }, [slug, tr]);

  useReload(reload, initial);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <ScreenSkeleton loadingLabel={tr.loading} />;

  const { groups = [], summary = {}, kinds = [], campaigns = [] } = data;
  const everyAsset = groups.flatMap((g) => g.assets);

  // ONE FILE AT A TIME, to the product's one upload door. The id it returns is
  // all this screen ever sends on: the bytes never pass through the register.
  const upload = async (file) => {
    setUploading(true);
    const body = new FormData();
    body.append("file", file);
    const res = await fetch(`/api/media?kind=private&slug=${encodeURIComponent(slug)}`, { method: "POST", body });
    const out = await res.json().catch(() => ({}));
    setUploading(false);
    if (!res.ok || !out?.file?.id) { setError(out?.error || tr.failed); return; }
    setForm((f) => ({ ...f, mediaId: out.file.id, name: f.name || out.file.filename || "" }));
  };

  const save = async () => {
    setBusy(true);
    const res = await fetch(`/api/studios/${slug}/marketing/assets`, {
      method: form.id ? "PUT" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...form, id: form.id || undefined }),
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
    const res = await fetch(`/api/studios/${slug}/marketing/assets`, {
      method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }),
    });
    const answer = await res.json().catch(() => ({}));
    if (!res.ok) { setError(tr.refuse[answer.error] || answer.error || tr.failed); return; }
    setError("");
    await reload();
  };

  const replace = async (id, replacementId) => {
    const res = await fetch(`/api/studios/${slug}/marketing/assets`, {
      method: "PUT", headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, action: "replace", replacementId }),
    });
    const answer = await res.json().catch(() => ({}));
    if (!res.ok) { setError(tr.refuse[answer.error] || answer.error || tr.failed); return; }
    setError("");
    setReplacing(null);
    await reload();
  };

  return (
    <div className="space-y-4">
      <section className={panel}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 max-w-2xl">
            <h2 className={h2}>{tr.title}</h2>
            <p className={sub}>{tr.sub}</p>
            {summary.total > 0 && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {tr.counts(summary.current || 0, summary.superseded || 0)}
              </p>
            )}
          </div>
          {data.canCreate && (
            <button type="button" className={btn} onClick={() => setForm({ ...BLANK })}>{tr.add}</button>
          )}
        </div>
        {error && <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">{error}</p>}
      </section>

      {groups.length === 0 ? (
        <section className={panel}><Empty title={tr.none} body={tr.noneHint} /></section>
      ) : (
        groups.map((g) => (
          <section key={g.campaignId || "~studio"} className={panel}>
            <h3 className="font-display text-base font-800 text-[var(--geex-ink)]">
              {g.campaignId ? g.name : tr.unattached}
            </h3>
            {/* THE UNATTACHED GROUP SAYS WHAT IT HOLDS, because it is two
                things at once: the brand's own files, and anything whose
                campaign was deleted out from under it. */}
            {!g.campaignId && <p className={sub}>{tr.unattachedHint}</p>}
            <ul className="mt-3 space-y-3">
              {g.assets.map((a) => (
                <li key={a.id} className="border-b border-slate-100 pb-3 last:border-0 dark:border-white/5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-600 text-[var(--geex-ink)]">
                        {a.name}
                        {a.version && (
                          <span className="ms-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 dark:bg-white/10 dark:text-slate-300">
                            {a.version}
                          </span>
                        )}
                        <span className="ms-2 rounded-full bg-brand-500/10 px-2 py-0.5 text-[11px] text-brand-800 dark:text-brand-200">
                          {tr.kinds[a.kind] || a.kind}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {[
                          a.file ? `${a.file.name} · ${tr.size(Math.max(1, Math.round((a.file.size || 0) / 1024)))}` : "",
                          a.byAlias && tr.by(a.byAlias),
                          fmtDate(a.createdAt),
                        ].filter(Boolean).join(" · ")}
                      </p>
                      {a.notes && <p className="mt-1 max-w-prose text-sm text-slate-600 dark:text-slate-300">{a.notes}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {/* NEVER A BLOB URL — the media route checks again before
                          it serves the bytes. */}
                      {a.mediaId && (
                        <a className={btnRow} href={`/api/media/${a.mediaId}`} target="_blank" rel="noreferrer">
                          {tr.openFile}
                        </a>
                      )}
                      {data.canEdit && (
                        <button type="button" className={btnRow}
                          onClick={() => setForm({
                            id: a.id, name: a.name, kind: a.kind, notes: a.notes,
                            campaignId: a.campaignId, version: a.version, mediaId: a.mediaId,
                          })}>{tr.edit}</button>
                      )}
                      {data.canEdit && (
                        <button type="button" className={btnRow}
                          onClick={() => setReplacing({ id: a.id, replacementId: "" })}>{tr.replacedBy}</button>
                      )}
                      {data.canDelete && (
                        a.deleteProblem
                          // SAID, NOT HIDDEN. A button that vanishes reads as a
                          // missing feature; a sentence says why it is kept.
                          ? <span className="self-center text-[11px] text-slate-400">{tr.cannotDelete}</span>
                          : <button type="button" className={btnRowDanger} onClick={() => remove(a.id)}>{tr.remove}</button>
                      )}
                    </div>
                  </div>

                  {a.versions?.length > 0 && (
                    <div className="mt-2">
                      <button type="button" className="text-xs text-brand-700 hover:underline dark:text-brand-300"
                        onClick={() => setOpenVersions(openVersions === a.id ? "" : a.id)}>
                        {openVersions === a.id ? tr.hideEarlier : tr.earlier(a.versions.length)}
                      </button>
                      {openVersions === a.id && (
                        <ul className="mt-1 space-y-1">
                          {a.versions.map((v) => (
                            <li key={v.id} className="flex flex-wrap items-baseline gap-2 text-xs text-slate-500 dark:text-slate-400">
                              <span className="font-600">{v.version || v.name}</span>
                              <span>{[v.file?.name, v.byAlias && tr.by(v.byAlias), fmtDate(v.createdAt)].filter(Boolean).join(" · ")}</span>
                              {v.mediaId && (
                                <a className="text-brand-700 hover:underline dark:text-brand-300"
                                  href={`/api/media/${v.mediaId}`} target="_blank" rel="noreferrer">{tr.openFile}</a>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {replacing && (
        <Dialog title={tr.replaceWith} onClose={() => setReplacing(null)}>
          <p className={sub}>{tr.replaceHint}</p>
          <div className="mt-4">
            <Field label={tr.replacePick} as="select" value={replacing.replacementId}
              onChange={(v) => setReplacing((r) => ({ ...r, replacementId: v }))}
              options={[{ value: "", label: "—" },
                ...everyAsset.filter((a) => a.id !== replacing.id)
                  .map((a) => ({ value: a.id, label: [a.name, a.version].filter(Boolean).join(" · ") }))]} />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className={btnGhost} onClick={() => setReplacing(null)}>{tr.cancel}</button>
            <button type="button" className={btn} disabled={!replacing.replacementId}
              onClick={() => replace(replacing.id, replacing.replacementId)}>{tr.save}</button>
          </div>
        </Dialog>
      )}

      {form && (
        <Dialog title={form.id ? tr.edit : tr.add} onClose={() => setForm(null)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tr.name} value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))} inputProps={{ maxLength: 200 }} />
            <Field label={tr.kind} as="select" value={form.kind}
              onChange={(v) => setForm((f) => ({ ...f, kind: v }))}
              options={kinds.map((k) => ({ value: k, label: tr.kinds[k] || k }))} />
            <Field label={tr.campaign} as="select" value={form.campaignId}
              onChange={(v) => setForm((f) => ({ ...f, campaignId: v }))}
              options={[{ value: "", label: tr.noCampaign }, ...campaigns.map((c) => ({ value: c.id, label: c.name }))]} />
            <div>
              <Field label={tr.version} value={form.version}
                onChange={(v) => setForm((f) => ({ ...f, version: v }))} inputProps={{ maxLength: 40 }} />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{tr.versionHint}</p>
            </div>
            {/* THE FILE IS SET ONCE, ON CREATE. Swapping the bytes under a name
                is exactly what the version chain exists to prevent. */}
            {!form.id && (
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {tr.file}
                </label>
                <input type="file" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
                {uploading && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{tr.uploading}</p>}
                {form.mediaId && !uploading && (
                  <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">✓</p>
                )}
              </div>
            )}
            <div className="sm:col-span-2">
              <Field label={tr.notes} as="textarea" value={form.notes}
                onChange={(v) => setForm((f) => ({ ...f, notes: v }))} inputProps={{ maxLength: 2000 }} />
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className={btnGhost} onClick={() => setForm(null)}>{tr.cancel}</button>
            <button type="button" className={btn} disabled={busy || uploading} onClick={save}>{tr.save}</button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
