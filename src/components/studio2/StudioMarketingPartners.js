"use client";

// PARTNERS, PR & INFLUENCERS (22/09/2026) — who brings the studio work.
//
// WHAT MAKES THIS A REGISTER WORTH KEEPING rather than an address book is that
// the figures are COUNTED. A partner owns the `utm_source` on the links they
// publish; a form records the tag it was arrived with; the reply carries the
// Sales ticket it became. So the chain from "their newsletter" to "a won deal"
// is read end to end, and nobody maintains a spreadsheet beside it.
//
// A PARTNER WITH NO TAG SHOWS NO FIGURES AT ALL, and the screen says why. A row
// of noughts would read as a partner whose links nobody clicked, when the truth
// is that nobody has given them a link.

import { useCallback, useState } from "react";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import { useReload } from "@/components/studio2/useReload";
import { useStudioLocale } from "@/components/studio2/locale";
import {
  panel, h2, sub, btn, btnGhost, btnRow, btnRowDanger, money, Dialog, Empty,
} from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";
import { marketingPartnersDict } from "@/shared/studio/marketingPartners";

const BLANK = {
  id: "", name: "", kind: "partner", source: "", contactName: "", email: "",
  phone: "", website: "", terms: "", notes: "", active: true, ownerCollaboratorId: "",
};

// `initial` IS THIS SCREEN'S OWN ROUTE BODY, answered inside the studio page's
// render, so the register paints with its rows rather than a skeleton and a
// second request. Absent — refused, or over the payload ceiling — it fetches.
export default function StudioMarketingPartners({ slug, initial }) {
  const locale = useStudioLocale();
  const tr = marketingPartnersDict(locale);
  const [data, setData] = useState(initial ?? null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/marketing/partners`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setError(tr.refuse[body.error] || body.error || tr.failed); return; }
    setError("");
    setData(body);
  }, [slug, tr]);

  useReload(reload, initial);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <ScreenSkeleton loadingLabel={tr.loading} />;

  const { partners = [], kinds = [], people = [], unclaimed = [], sources = {}, currency = "" } = data;
  const cash = (n) => `${money(n || 0, currency)}${currency ? ` ${currency}` : ""}`;

  const save = async () => {
    setBusy(true);
    const res = await fetch(`/api/studios/${slug}/marketing/partners`, {
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
    const res = await fetch(`/api/studios/${slug}/marketing/partners`, {
      method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }),
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
          {data.canCreate && (
            <button type="button" className={btn} onClick={() => setForm({ ...BLANK })}>{tr.add}</button>
          )}
        </div>
        {error && <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">{error}</p>}
        {/* WHAT COULD NOT BE READ, said in words: a count of nought must never
            be mistaken for a part of the product being switched off. */}
        {!sources.forms && <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">{tr.formsOff}</p>}
        {sources.forms && !sources.sales && (
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{tr.salesOff}</p>
        )}
      </section>

      {partners.length === 0 ? (
        <section className={panel}><Empty title={tr.none} body={tr.noneHint} /></section>
      ) : (
        partners.map((p) => (
          <section key={p.id} className={panel}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-display text-base font-800 text-[var(--geex-ink)]">
                  {p.name}
                  <span className="ms-2 rounded-full bg-brand-500/10 px-2 py-0.5 text-[11px] text-brand-800 dark:text-brand-200">
                    {tr.kinds[p.kind] || p.kind}
                  </span>
                  {!p.active && (
                    <span className="ms-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 dark:bg-white/10 dark:text-slate-300">
                      {tr.ended}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {[p.contactName, p.email, p.phone, p.website, p.ownerAlias && `${tr.owner}: ${p.ownerAlias}`]
                    .filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {data.canEdit && (
                  <button type="button" className={btnRow} onClick={() => setForm({
                    id: p.id, name: p.name, kind: p.kind, source: p.source, contactName: p.contactName,
                    email: p.email, phone: p.phone, website: p.website, terms: p.terms,
                    notes: p.notes, active: p.active, ownerCollaboratorId: p.ownerCollaboratorId,
                  })}>{tr.edit}</button>
                )}
                {data.canDelete && (
                  (p.results?.arrivals ?? 0) > 0
                    // SAID, NOT HIDDEN: a vanished button reads as a missing
                    // feature, and this one has a reason worth reading.
                    ? <span className="max-w-xs self-center text-[11px] text-slate-400">{tr.cannotDelete}</span>
                    : <button type="button" className={btnRowDanger} onClick={() => remove(p.id)}>{tr.remove}</button>
                )}
              </div>
            </div>

            {/* THE FIGURES, OR WHY THERE ARE NONE. */}
            {p.results === null ? (
              <p className="mt-3 text-xs text-slate-400">
                <span className="font-600">{tr.noSource}</span> · {tr.noSourceHint}
              </p>
            ) : p.results.arrivals === 0 ? (
              <p className="mt-3 text-xs text-slate-400">
                <code dir="ltr" className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-white/5">{p.source}</code>
                {" "}· {tr.nothingYet}
              </p>
            ) : (
              <p className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                <code dir="ltr" className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-white/5">{p.source}</code>
                <span className="font-600 text-[var(--geex-ink)]">{tr.brought(p.results.arrivals)}</span>
                <span className="text-slate-500 dark:text-slate-400">{tr.leads(p.results.leads)}</span>
                {p.results.won > 0 && (
                  <span className="font-600 text-emerald-700 dark:text-emerald-300">
                    {tr.won(p.results.won, cash(p.results.wonValue))}
                  </span>
                )}
                {/* NO LEADS IS NOT A WIN RATE OF NOUGHT. */}
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {p.results.winRate === null ? tr.noWinRate : tr.winRate(Math.round(p.results.winRate * 100))}
                </span>
              </p>
            )}

            {p.terms && <p className="mt-2 max-w-prose whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">{p.terms}</p>}
            {p.notes && <p className="mt-1 max-w-prose whitespace-pre-line text-xs text-slate-500 dark:text-slate-400">{p.notes}</p>}
          </section>
        ))
      )}

      {/* THE PARTNER NOBODY RECORDED. Somebody is sending people under these
          tags, and this is the only place in the product that can say so. */}
      {unclaimed.length > 0 && (
        <section className={panel}>
          <h3 className="font-display text-base font-800 text-[var(--geex-ink)]">{tr.unclaimed}</h3>
          <p className={sub}>{tr.unclaimedHint}</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {unclaimed.map((s) => (
              <li key={s.source} className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                {tr.unclaimedRow(s.source, s.n)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {form && (
        <Dialog title={form.id ? tr.edit : tr.add} onClose={() => setForm(null)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tr.name} value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))} inputProps={{ maxLength: 200 }} />
            <Field label={tr.kind} as="select" value={form.kind}
              onChange={(v) => setForm((f) => ({ ...f, kind: v }))}
              options={kinds.map((k) => ({ value: k, label: tr.kinds[k] || k }))} />
            <div className="sm:col-span-2">
              <Field label={tr.source} value={form.source}
                onChange={(v) => setForm((f) => ({ ...f, source: v }))} inputProps={{ maxLength: 120 }} />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{tr.sourceHint}</p>
            </div>
            <Field label={tr.contactName} value={form.contactName}
              onChange={(v) => setForm((f) => ({ ...f, contactName: v }))} inputProps={{ maxLength: 200 }} />
            <Field label={tr.email} value={form.email}
              onChange={(v) => setForm((f) => ({ ...f, email: v }))} inputProps={{ maxLength: 200 }} />
            <Field label={tr.phone} value={form.phone}
              onChange={(v) => setForm((f) => ({ ...f, phone: v }))} inputProps={{ maxLength: 60 }} />
            <Field label={tr.website} value={form.website}
              onChange={(v) => setForm((f) => ({ ...f, website: v }))} inputProps={{ maxLength: 500 }} />
            <Field label={tr.owner} as="select" value={form.ownerCollaboratorId}
              onChange={(v) => setForm((f) => ({ ...f, ownerCollaboratorId: v }))}
              options={[{ value: "", label: tr.nobody },
                ...people.map((x) => ({ value: x.id, label: x.alias || x.id }))]} />
            <Field label={tr.active} as="select" value={form.active ? "yes" : "no"}
              onChange={(v) => setForm((f) => ({ ...f, active: v === "yes" }))}
              options={[{ value: "yes", label: tr.active }, { value: "no", label: tr.ended }]} />
            <div className="sm:col-span-2">
              <Field label={tr.terms} as="textarea" value={form.terms}
                onChange={(v) => setForm((f) => ({ ...f, terms: v }))} inputProps={{ maxLength: 4000 }} />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{tr.termsHint}</p>
            </div>
            <div className="sm:col-span-2">
              <Field label={tr.notes} as="textarea" value={form.notes}
                onChange={(v) => setForm((f) => ({ ...f, notes: v }))} inputProps={{ maxLength: 4000 }} />
            </div>
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
