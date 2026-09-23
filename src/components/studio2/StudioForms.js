// MARKETING → FORMS (19/09/2026) — the Google-Forms-shaped home the owner
// approved: templates along the top, the studio's forms below. A form opens in
// its editor (StudioFormEditor) at /<slug>/marketing-forms/<id>.
"use client";
import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import { useReload } from "@/components/studio2/useReload";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { useStudioLocale } from "@/components/studio2/locale";
import { Icon } from "@/components/studio2/icons";
import { h2, sub, btn, btnGhost, Empty, Dialog, fmtDate } from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";
import { formsDict } from "@/shared/studio/forms";

const STATUS_TONE = {
  Draft: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300",
  Open: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  Closed: "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400",
};
const TEMPLATE_ICON = { blank: "plus", enquiry: "mail", event: "calendar", feedback: "star" };

// `initial` IS THIS SCREEN'S OWN ROUTE BODY, answered inside the studio page's
// render, so the register paints with its rows rather than a skeleton and a
// second request. Absent — refused, or over the payload ceiling — it fetches.
export default function StudioForms({ slug, initial }) {
  const locale = useStudioLocale();
  const tr = formsDict(locale);
  const router = useRouter();
  const [data, setData] = useState(initial ?? null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/marketing/forms`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setError(tr.refuse[body.error] || body.error || "failed"); return; }
    setError(""); setData(body);
  }, [slug, tr]);
  useReload(reload, initial);
  useLiveUpdates(slug, "marketing-forms", reload);

  const create = async () => {
    setBusy(true); setError("");
    const res = await fetch(`/api/studios/${slug}/marketing/forms`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(creating),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(tr.refuse[out.error] || out.error || "failed"); return; }
    router.push(`/${slug}/marketing-forms/${out.form.id}`);
  };

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <ScreenSkeleton loadingLabel={tr.loading} />;
  const { forms = [], templates = [], canCreate } = data;

  return (
    <div className="space-y-8">
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
      <div>
        <h2 className={h2}>{tr.forms}</h2>
        <p className={sub}>{tr.formsSub}</p>
      </div>

      {canCreate && (
        <section>
          <h3 className="mb-3 text-sm font-700 text-slate-700 dark:text-slate-200">{tr.startNew}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {templates.map((t) => (
              <button key={t} type="button" onClick={() => setCreating({ template: t, name: t === "blank" ? "" : tr.template(t), locale })}
                className="rounded-geex border border-slate-200/70 bg-[var(--geex-surface)] p-4 text-start transition-colors hover:border-brand-500 dark:border-white/10">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-700 dark:text-brand-300">
                  <Icon name={TEMPLATE_ICON[t] || "form"} className="h-5 w-5" />
                </span>
                <span className="mt-3 block font-display text-sm font-700 text-slate-900 dark:text-white">{tr.template(t)}</span>
                <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{tr.templateHint(t)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="mb-3 text-sm font-700 text-slate-700 dark:text-slate-200">{tr.recent}</h3>
        {!forms.length ? (
          <Empty title={tr.noForms} body={tr.noFormsBody} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {forms.map((f) => (
              <Link key={f.id} href={`/${slug}/marketing-forms/${f.id}`}
                className="rounded-geex border border-slate-200/70 bg-[var(--geex-surface)] p-4 transition-colors hover:border-brand-500 dark:border-white/10">
                <p className="flex items-center gap-2">
                  <Icon name="form" className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <span className="min-w-0 flex-1 truncate font-600 text-slate-900 dark:text-white">{f.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-600 ${STATUS_TONE[f.status] || STATUS_TONE.Draft}`}>{tr.status(f.status)}</span>
                </p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  {[tr.responsesCount(f.responses), tr.langName(f.locale), f.createLead ? tr.makesLeads : "", fmtDate(f.updatedAt)].filter(Boolean).join(" · ")}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {creating && (
        <Dialog title={tr.newForm} description={tr.template(creating.template)} onClose={() => setCreating(null)} width="max-w-[520px]">
          <div className="space-y-4">
            <Field label={tr.name} required value={creating.name} inputProps={{ maxLength: 200 }}
              onChange={(v) => setCreating((c) => ({ ...c, name: v }))} />
            <Field label={tr.language} as="select" value={creating.locale}
              onChange={(v) => setCreating((c) => ({ ...c, locale: v }))}
              options={["en", "ar"].map((l) => ({ value: l, label: tr.langName(l) }))} />
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setCreating(null)}>{tr.cancel}</button>
              <button type="button" className={btn} disabled={busy || !creating.name.trim()} onClick={create}>
                {busy ? tr.creating : tr.create}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
