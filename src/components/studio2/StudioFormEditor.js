// ONE FORM, EDITED (19/09/2026) — Questions, Responses and Settings, the three
// tabs the owner approved, with a live preview that IS the public page
// (components/forms/PublicForm) and sharing by link, QR code and embed code.
//
// The editor holds the whole form and saves it whole; the server cleans the
// definition and the settings against each other (modules/marketing/formsModel)
// and refuses an OPEN form into a shape that would stop it working, so what the
// public sees is never an edit caught halfway.
"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import { useStudioLocale } from "@/components/studio2/locale";
import { panel, h2, btn, btnGhost, btnRow, btnRowDanger, fmtDateTime } from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";
import PublicForm from "@/components/forms/PublicForm";
import { formsDict } from "@/shared/studio/forms";
import { FORM_TYPES, hasChoices, takesAnswer, openProblems, LEAD_FIELD_KEYS } from "@/modules/marketing/formsModel";

const rid = (p) => `${p}_${Math.random().toString(36).slice(2, 10)}`;
const STATUS_TONE = {
  Draft: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300",
  Open: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  Closed: "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400",
};

// THE CHOICES A NEW QUESTION STARTS WITH are in the FORM's language — the
// public reads them — not the editor's.
const STARTING = {
  en: { choice: "Choice", yes: "Yes", no: "No", agree: "I agree" },
  ar: { choice: "الخيار", yes: "نعم", no: "لا", agree: "أوافق" },
};

function newQuestion(type, tr, formLocale) {
  const w = STARTING[formLocale] || STARTING.en;
  const q = { id: rid("fq"), type, label: type === "statement" ? "" : tr.typeName(type), description: "", required: false };
  if (type === "multiple-choice" || type === "dropdown") q.options = [`${w.choice} 1`, `${w.choice} 2`];
  if (type === "multiple-choice") { q.multiple = false; q.other = false; }
  if (type === "yes-no") q.options = [w.yes, w.no];
  if (type === "legal") { q.options = [w.agree]; q.required = true; }
  if (type === "rating") { q.min = 1; q.max = 5; }
  if (type === "opinion-scale") { q.min = 1; q.max = 5; q.minLabel = ""; q.maxLabel = ""; }
  if (type === "nps") { q.min = 0; q.max = 10; q.minLabel = ""; q.maxLabel = ""; }
  return q;
}

export default function StudioFormEditor({ slug, formId }) {
  const tr = formsDict(useStudioLocale());
  const router = useRouter();
  const [data, setData] = useState(null);
  const [doc, setDoc] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState("questions");
  const [pageIdx, setPageIdx] = useState(0);
  const [selected, setSelected] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const api = `/api/studios/${slug}/marketing/forms`;

  const load = useCallback(async () => {
    const res = await fetch(`${api}?id=${encodeURIComponent(formId)}`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setError(tr.refuse[body.error] || body.error || "failed"); return; }
    setData(body);
    setDoc({ name: body.form.name, locale: body.form.locale, definition: body.form.definition, settings: body.form.settings });
    setDirty(false);
  }, [api, formId, tr]);
  useEffect(() => {
    let current = true;
    (async () => { if (current) await load(); })();
    return () => { current = false; };
  }, [load]);

  const edit = useCallback((fn) => {
    setDoc((d) => { const next = structuredClone(d); fn(next); return next; });
    setDirty(true); setNote("");
  }, []);

  const put = async (payload) => {
    setBusy(true); setError("");
    const res = await fetch(api, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: formId, ...payload }) });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(tr.refuse[out.error] || tr.problem(out.error) || out.error || "failed"); return false; }
    return true;
  };
  const save = async () => {
    if (await put({ name: doc.name, locale: doc.locale, definition: doc.definition, settings: doc.settings })) {
      setNote(tr.saved); await load(); return true;
    }
    return false;
  };
  const setStatus = async (status) => {
    if (dirty && !(await save())) return;
    if (await put({ action: "status", status })) await load();
  };
  const remove = async () => {
    if (!window.confirm(tr.confirmDelete)) return;
    const res = await fetch(api, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: formId }) });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) { setError(tr.refuse[out.error] || out.error || "failed"); return; }
    router.push(`/${slug}/marketing-forms`);
  };

  const problems = useMemo(() => (doc ? openProblems(doc.definition, doc.settings) : []), [doc]);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data || !doc) return <ScreenSkeleton loadingLabel={tr.loading} />;
  const { form, canEdit } = data;
  const readOnly = !canEdit;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/${slug}/marketing-forms`} className="text-sm text-slate-500 hover:underline dark:text-slate-400">{tr.back}</Link>
        <span className="text-slate-300">/</span>
        <input value={doc.name} disabled={readOnly} onChange={(e) => edit((d) => { d.name = e.target.value; })} aria-label={tr.name}
          className="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-1 font-display text-lg font-800 text-slate-900 outline-none hover:bg-slate-100 focus:bg-slate-100 dark:text-white dark:hover:bg-white/5 dark:focus:bg-white/5" />
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-600 ${STATUS_TONE[form.status] || STATUS_TONE.Draft}`}>{tr.status(form.status)}</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">{note || (dirty ? tr.unsaved : "")}</span>
        <button type="button" className={btnGhost} onClick={() => setShowPreview((v) => !v)}>{showPreview ? tr.hidePreview : tr.preview}</button>
        {!readOnly && <button type="button" className={btn} disabled={busy || !dirty} onClick={save}>{busy ? tr.saving : tr.save}</button>}
      </div>

      <div role="tablist" className="flex gap-1 border-b border-slate-200 dark:border-white/10">
        {[["questions", tr.tabQuestions], ["responses", `${tr.tabResponses} (${data.responses})`], ["settings", tr.tabSettings]].map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-600 transition-colors ${tab === key
              ? "border-brand-600 text-brand-700 dark:text-brand-300"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"}`}>{label}</button>
        ))}
      </div>

      {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

      <div className={showPreview ? "grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" : ""}>
        <div className="min-w-0">
          {tab === "questions" && (
            <Questions doc={doc} edit={edit} tr={tr} readOnly={readOnly}
              pageIdx={Math.min(pageIdx, doc.definition.pages.length - 1)} setPageIdx={setPageIdx}
              selected={selected} setSelected={setSelected} />
          )}
          {tab === "responses" && <Responses slug={slug} formId={formId} doc={doc} tr={tr} />}
          {tab === "settings" && (
            <Settings slug={slug} data={data} doc={doc} edit={edit} tr={tr} readOnly={readOnly}
              problems={problems} busy={busy} setStatus={setStatus} remove={remove} />
          )}
        </div>
        {showPreview && (
          <div className="min-w-0 rounded-geex border border-slate-200/70 bg-slate-50 dark:border-white/10 dark:bg-[#121218]">
            <PublicForm key={JSON.stringify(doc.definition)} preview
              form={{ name: doc.name, locale: doc.locale, pages: doc.definition.pages, accepting: true, studio: {} }}
              onSubmit={async () => ({ ok: true, confirmation: doc.settings.confirmation })} />
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Questions ------------------------------------------------------------------

function Questions({ doc, edit, tr, readOnly, pageIdx, setPageIdx, selected, setSelected }) {
  const pages = doc.definition.pages;
  const page = pages[pageIdx] || null;
  const [adding, setAdding] = useState(false);
  const everyQuestion = pages.flatMap((p) => p.questions);

  const addPage = () => {
    edit((d) => { d.definition.pages.push({ id: rid("fp"), title: tr.page(d.definition.pages.length + 1), lead: "", questions: [] }); });
    setPageIdx(pages.length);
  };
  const removePage = (i) => { edit((d) => { d.definition.pages.splice(i, 1); }); setPageIdx(Math.max(0, i - 1)); };
  const addQuestion = (type) => {
    const q = newQuestion(type, tr, doc.locale);
    edit((d) => {
      if (!d.definition.pages.length) d.definition.pages.push({ id: rid("fp"), title: tr.page(1), lead: "", questions: [] });
      d.definition.pages[Math.min(pageIdx, d.definition.pages.length - 1)].questions.push(q);
    });
    setSelected(q.id); setAdding(false);
  };
  const patch = (qid, fn) => edit((d) => {
    const q = d.definition.pages[pageIdx]?.questions.find((x) => x.id === qid);
    if (q) fn(q);
  });
  const move = (i, by) => edit((d) => {
    const qs = d.definition.pages[pageIdx].questions;
    const j = i + by;
    if (j < 0 || j >= qs.length) return;
    [qs[i], qs[j]] = [qs[j], qs[i]];
  });
  const removeQuestion = (qid) => edit((d) => {
    d.definition.pages[pageIdx].questions = d.definition.pages[pageIdx].questions.filter((q) => q.id !== qid);
    // A rule that showed the removed question shows nothing now; drop it here
    // rather than leave the server to, so the editor never displays a dead rule.
    for (const p of d.definition.pages) for (const q of p.questions) {
      if (q.reveals) q.reveals = q.reveals.map((r) => ({ ...r, show: r.show.filter((s) => s !== qid) })).filter((r) => r.show.length);
    }
  });

  return (
    <div className="grid gap-5 lg:grid-cols-[200px_minmax(0,1fr)]">
      <aside className="space-y-1">
        <p className="px-2 text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400">{tr.pages}</p>
        {pages.map((p, i) => (
          <button key={p.id} type="button" onClick={() => { setPageIdx(i); setSelected(""); }}
            className={`block w-full rounded-lg px-3 py-2 text-start text-sm transition-colors ${i === pageIdx
              ? "bg-brand-500/10 font-600 text-brand-800 dark:text-brand-200" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"}`}>
            <span className="block truncate">{p.title || tr.page(i + 1)}</span>
            <span className="text-[11px] text-slate-400">{p.questions.length}</span>
          </button>
        ))}
        {!readOnly && <button type="button" className={`${btnRow} mt-2 w-full text-sm`} onClick={addPage}>+ {tr.addPage}</button>}
      </aside>

      {!page ? null : (
        <div className="min-w-0 space-y-3">
          <section className={panel}>
            <Field label={tr.pageTitle} value={page.title} disabled={readOnly} inputProps={{ maxLength: 200 }}
              onChange={(v) => edit((d) => { d.definition.pages[pageIdx].title = v; })} />
            <div className="mt-3">
              <Field label={tr.pageLead} as="textarea" value={page.lead || ""} disabled={readOnly} inputProps={{ maxLength: 1000 }}
                onChange={(v) => edit((d) => { d.definition.pages[pageIdx].lead = v; })} />
            </div>
            {!readOnly && pages.length > 1 && (
              <button type="button" className={`${btnRowDanger} mt-3 text-xs`} onClick={() => removePage(pageIdx)}>{tr.removePage}</button>
            )}
          </section>

          {!page.questions.length && <p className="px-1 text-sm text-slate-500 dark:text-slate-400">{tr.noQuestions}</p>}
          {page.questions.map((q, i) => (
            <QuestionCard key={q.id} q={q} i={i} count={page.questions.length} open={selected === q.id}
              onOpen={() => setSelected(selected === q.id ? "" : q.id)} tr={tr} readOnly={readOnly}
              others={everyQuestion.filter((x) => x.id !== q.id && takesAnswer(x.type))}
              patch={(fn) => patch(q.id, fn)} move={(by) => move(i, by)} remove={() => removeQuestion(q.id)} />
          ))}

          {!readOnly && (adding ? (
            <section className={panel}>
              <p className="mb-3 text-sm font-600 text-slate-900 dark:text-white">{tr.addQuestion}</p>
              <div className="flex flex-wrap gap-2">
                {FORM_TYPES.map((t) => (
                  <button key={t} type="button" className={`${btnRow} text-sm`} onClick={() => addQuestion(t)}>{tr.typeName(t)}</button>
                ))}
              </div>
              <button type="button" className={`${btnGhost} mt-3`} onClick={() => setAdding(false)}>{tr.cancel}</button>
            </section>
          ) : (
            <button type="button" onClick={() => setAdding(true)}
              className="w-full rounded-geex border border-dashed border-slate-300 py-3 text-sm font-600 text-slate-600 hover:border-brand-500 hover:text-brand-700 dark:border-white/15 dark:text-slate-300">
              + {tr.addQuestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionCard({ q, i, count, open, onOpen, tr, readOnly, others, patch, move, remove }) {
  const set = (k) => (v) => patch((x) => { x[k] = v; });
  return (
    <section className={`${panel} ${open ? "ring-2 ring-brand-500/40" : ""}`}>
      <button type="button" onClick={onOpen} className="flex w-full items-start justify-between gap-3 text-start">
        <span className="min-w-0">
          <span className="text-[11px] font-700 uppercase tracking-wide text-slate-400">{tr.typeName(q.type)}{q.required ? " · *" : ""}</span>
          <span className="block truncate font-600 text-slate-900 dark:text-white">{q.label || "—"}</span>
          {q.reveals?.length ? <span className="text-[11px] text-brand-700 dark:text-brand-300">{tr.logic}</span> : null}
        </span>
      </button>
      {open && (
        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 dark:border-white/10">
          <Field label={tr.question} as="textarea" value={q.label} disabled={readOnly} onChange={set("label")} inputProps={{ maxLength: 300 }} />
          <Field label={tr.description} value={q.description || ""} disabled={readOnly} onChange={set("description")} inputProps={{ maxLength: 1000 }} />
          {["short-text", "long-text", "email", "phone", "website"].includes(q.type) && (
            <Field label={tr.placeholder} value={q.placeholder || ""} disabled={readOnly} onChange={set("placeholder")} inputProps={{ maxLength: 120 }} />
          )}
          {hasChoices(q.type) && <Choices q={q} tr={tr} readOnly={readOnly} patch={patch} />}
          {q.type === "multiple-choice" && (
            <div className="flex flex-wrap gap-4">
              <Toggle label={tr.multiple} on={Boolean(q.multiple)} disabled={readOnly} onChange={(v) => patch((x) => { x.multiple = v; if (v) x.other = false; })} />
              {!q.multiple && <Toggle label={tr.allowOther} on={Boolean(q.other)} disabled={readOnly} onChange={set("other")} />}
            </div>
          )}
          {["opinion-scale", "rating"].includes(q.type) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {q.type === "opinion-scale" && (
                <Field label={tr.scaleFrom} as="select" value={String(q.min ?? 1)} disabled={readOnly}
                  onChange={(v) => patch((x) => { x.min = Number(v); })} options={["0", "1"]} />
              )}
              <Field label={tr.scaleTo} as="select" value={String(q.max ?? 5)} disabled={readOnly}
                onChange={(v) => patch((x) => { x.max = Number(v); })} options={["3", "4", "5", "6", "7", "8", "9", "10"]} />
            </div>
          )}
          {["opinion-scale", "nps"].includes(q.type) && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={tr.lowLabel} value={q.minLabel || ""} disabled={readOnly} onChange={set("minLabel")} inputProps={{ maxLength: 60 }} />
              <Field label={tr.highLabel} value={q.maxLabel || ""} disabled={readOnly} onChange={set("maxLabel")} inputProps={{ maxLength: 60 }} />
            </div>
          )}
          {takesAnswer(q.type) && <Toggle label={tr.requiredToggle} on={Boolean(q.required)} disabled={readOnly} onChange={set("required")} />}
          {["multiple-choice", "dropdown", "yes-no"].includes(q.type) && others.length > 0 && (
            <Logic q={q} tr={tr} readOnly={readOnly} others={others} patch={patch} />
          )}
          {!readOnly && (
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" className={`${btnRow} text-xs`} disabled={i === 0} onClick={() => move(-1)}>{tr.moveUp}</button>
              <button type="button" className={`${btnRow} text-xs`} disabled={i === count - 1} onClick={() => move(1)}>{tr.moveDown}</button>
              <button type="button" className={`${btnRowDanger} text-xs`} onClick={remove}>{tr.remove}</button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Toggle({ label, on, onChange, disabled }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
      <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={on} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function Choices({ q, tr, readOnly, patch }) {
  const options = q.options || [];
  // Consent has exactly one "I agree"; Yes/No exactly two. Only the lists that
  // are the author's to shape grow and shrink.
  const fixed = q.type === "legal" || q.type === "yes-no";
  return (
    <div>
      <p className="mb-1.5 text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">{tr.choices}</p>
      <div className="space-y-2">
        {options.map((o, n) => (
          <div key={n} className="flex items-center gap-2">
            <input value={o} disabled={readOnly} maxLength={200} aria-label={`${tr.choices} ${n + 1}`}
              onChange={(e) => patch((x) => { x.options[n] = e.target.value; })}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-[var(--geex-surface)] px-3 py-1.5 text-sm dark:border-white/15" />
            {!readOnly && !fixed && options.length > 1 && (
              <button type="button" className={`${btnRowDanger} text-xs`} onClick={() => patch((x) => { x.options.splice(n, 1); })}>{tr.remove}</button>
            )}
          </div>
        ))}
      </div>
      {!readOnly && !fixed && (
        <button type="button" className={`${btnRow} mt-2 text-xs`} onClick={() => patch((x) => { x.options.push(`${tr.choices} ${x.options.length + 1}`); })}>+ {tr.addChoice}</button>
      )}
    </div>
  );
}

// BRANCHING, in its simplest honest form: "when the answer is X, show these".
// The rule is stored as the questionnaire's own `reveals`, so the public page,
// the server and the response summary all read it through one module.
function Logic({ q, tr, readOnly, others, patch }) {
  const rules = q.reveals || [];
  const options = q.options || [];
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/[0.03]">
      <p className="text-sm font-600 text-slate-900 dark:text-white">{tr.logic}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{tr.logicHint}</p>
      {rules.map((r, n) => (
        <div key={n} className="mt-3 space-y-2">
          <Field label={tr.whenAnswer} as="select" value={r.value || ""} disabled={readOnly}
            onChange={(v) => patch((x) => { x.reveals[n].value = v; x.reveals[n].op = q.multiple ? "includes" : "is"; })}
            options={options.map((o) => ({ value: o, label: o }))} />
          <p className="text-xs font-600 text-slate-500 dark:text-slate-400">{tr.thenShow}</p>
          <div className="flex flex-wrap gap-2">
            {others.map((o) => {
              const on = r.show.includes(o.id);
              return (
                <button key={o.id} type="button" disabled={readOnly} aria-pressed={on}
                  onClick={() => patch((x) => { const s = x.reveals[n].show; x.reveals[n].show = on ? s.filter((id) => id !== o.id) : [...s, o.id]; })}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${on
                    ? "border-brand-500 bg-brand-500/10 font-600 text-brand-800 dark:text-brand-200"
                    : "border-slate-200 text-slate-600 dark:border-white/15 dark:text-slate-300"}`}>
                  {o.label || tr.typeName(o.type)}
                </button>
              );
            })}
          </div>
          {!readOnly && <button type="button" className={`${btnRowDanger} text-xs`} onClick={() => patch((x) => { x.reveals.splice(n, 1); })}>{tr.removeRule}</button>}
        </div>
      ))}
      {!readOnly && (
        <button type="button" className={`${btnRow} mt-3 text-xs`}
          onClick={() => patch((x) => { x.reveals = [...(x.reveals || []), { op: x.multiple ? "includes" : "is", value: options[0] || "", show: [] }]; })}>
          + {tr.addRule}
        </button>
      )}
    </div>
  );
}

// ---- Settings (and sharing) ---------------------------------------------------------

function Settings({ slug, data, doc, edit, tr, readOnly, problems, busy, setStatus, remove }) {
  const { form, campaigns = [], salesOn, canDelete } = data;
  const s = doc.settings;
  const setS = (k) => (v) => edit((d) => { d.settings[k] = v; });
  const questions = doc.definition.pages.flatMap((p) => p.questions).filter((q) => takesAnswer(q.type) && q.type !== "legal");
  return (
    <div className="space-y-5">
      <section className={panel}>
        <h3 className={h2}>{tr.statusHeading}</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tr.statusHint}</p>
        {problems.length > 0 && form.status !== "Open" && (
          <ul className="mt-3 space-y-1 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
            {problems.map((p) => <li key={p}>{tr.problem(p)}</li>)}
          </ul>
        )}
        {!readOnly && (
          <div className="mt-4 flex flex-wrap gap-2">
            {form.status !== "Open" && <button type="button" className={btn} disabled={busy || problems.length > 0} onClick={() => setStatus("Open")}>{tr.openIt}</button>}
            {form.status === "Open" && <button type="button" className={btnRowDanger} disabled={busy} onClick={() => setStatus("Closed")}>{tr.closeIt}</button>}
            {form.status === "Closed" && <button type="button" className={btnRow} disabled={busy} onClick={() => setStatus("Draft")}>{tr.toDraft}</button>}
          </div>
        )}
      </section>

      <Share slug={slug} data={data} tr={tr} />

      <section className={`${panel} space-y-4`}>
        <Field label={tr.language} as="select" value={doc.locale} disabled={readOnly}
          onChange={(v) => edit((d) => { d.locale = v; })} options={["en", "ar"].map((l) => ({ value: l, label: tr.langName(l) }))} />
        <Field label={tr.campaign} as="select" value={s.campaignId} disabled={readOnly} hint={tr.campaignHint}
          onChange={setS("campaignId")} options={[{ value: "", label: tr.campaignNone }, ...campaigns.map((c) => ({ value: c.id, label: c.label }))]} />
        <div>
          <Toggle label={tr.createLead} on={Boolean(s.createLead)} disabled={readOnly || !salesOn} onChange={setS("createLead")} />
          <p className="ms-6 mt-0.5 text-xs text-slate-500 dark:text-slate-400">{salesOn ? tr.createLeadHint : tr.salesOff}</p>
        </div>
        {s.createLead && (
          <div className="grid gap-3 sm:grid-cols-2">
            {LEAD_FIELD_KEYS.map((k) => (
              <Field key={k} label={tr.leadField(k)} as="select" value={s.leadFields[k] || ""} disabled={readOnly}
                onChange={(v) => edit((d) => { d.settings.leadFields[k] = v; })}
                options={[{ value: "", label: tr.leadFieldNone }, ...questions.map((q) => ({ value: q.id, label: q.label || tr.typeName(q.type) }))]} />
            ))}
          </div>
        )}
        <Field label={tr.confirmation} as="textarea" value={s.confirmation} disabled={readOnly} hint={tr.confirmationHint}
          onChange={setS("confirmation")} inputProps={{ maxLength: 1000 }} />
        <Field label={tr.closesOn} type="date" value={s.closesOn} disabled={readOnly} hint={tr.closesOnHint} onChange={setS("closesOn")} />
      </section>

      {canDelete && (
        <button type="button" className={btnRowDanger} onClick={remove}>{tr.deleteForm}</button>
      )}
    </div>
  );
}

function Share({ slug, data, tr }) {
  const [copied, setCopied] = useState("");
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = `${origin}${data.path}`;
  const embed = `<iframe src="${url}" title="${data.form.name.replace(/"/g, "&quot;")}" width="100%" height="760" style="border:0;max-width:720px"></iframe>`;
  const copy = async (what, text) => {
    try { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(""), 1500); } catch { /* on screen to select by hand */ }
  };
  const qr = `/api/studios/${slug}/marketing/forms/qr?id=${encodeURIComponent(data.form.id)}`;
  return (
    <section className={panel}>
      <h3 className={h2}>{tr.share}</h3>
      {data.form.status !== "Open" ? (
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tr.shareDraft}</p>
      ) : (
        <div className="mt-3 space-y-5">
          <p className="text-sm text-slate-500 dark:text-slate-400">{tr.shareHint}</p>
          <div>
            <p className="mb-1 text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">{tr.link}</p>
            <div className="flex flex-wrap items-center gap-2">
              <code dir="ltr" className="min-w-0 max-w-full flex-1 truncate rounded-lg bg-slate-100 px-3 py-2 text-xs dark:bg-white/5">{url}</code>
              <button type="button" className={btnRow} onClick={() => copy("link", url)}>{copied === "link" ? tr.copied : tr.copy}</button>
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">{tr.qr}</p>
            <div className="flex flex-wrap items-end gap-3">
              {/* An SVG this studio's own route draws; there is nothing for next/image to optimise. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt={tr.qr} className="h-36 w-36 rounded-lg bg-white p-1" />
              <a href={`${qr}&download=1`} className={btnRow}>{tr.downloadQr}</a>
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">{tr.embed}</p>
            <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">{tr.embedHint}</p>
            <textarea readOnly dir="ltr" rows={3} value={embed} onFocus={(e) => e.target.select()}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs dark:border-white/15 dark:bg-white/5" />
            <button type="button" className={`${btnRow} mt-2`} onClick={() => copy("embed", embed)}>{copied === "embed" ? tr.copied : tr.copy}</button>
          </div>
        </div>
      )}
    </section>
  );
}

// ---- Responses ------------------------------------------------------------------------

function Responses({ slug, formId, doc, tr }) {
  const [data, setData] = useState(null);
  const api = `/api/studios/${slug}/marketing/forms/responses?id=${encodeURIComponent(formId)}`;
  useEffect(() => {
    let current = true;
    (async () => {
      const res = await fetch(api, { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (current && res.ok) setData(body);
    })();
    return () => { current = false; };
  }, [api]);
  if (!data) return <ScreenSkeleton loadingLabel={tr.loading} />;
  const { summary, responses = [] } = data;
  const questions = doc.definition.pages.flatMap((p) => p.questions).filter((q) => takesAnswer(q.type));
  const show = (v) => (Array.isArray(v) ? v.join(", ") : v === undefined || v === null ? "" : String(v));
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className={h2}>{tr.responsesHeading(summary.total)}</h3>
        {summary.total > 0 && <a href={`${api}&format=csv`} className={btn}>{tr.downloadCsv}</a>}
      </div>
      {!summary.total ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{tr.noResponses}</p>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {summary.fields.map((f) => {
              const most = Math.max(1, ...f.tallies.map((t) => t.count));
              return (
                <section key={f.field} className={panel}>
                  <p className="font-600 text-slate-900 dark:text-white">{f.label || "—"}{f.retired ? ` · ${tr.retired}` : ""}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{tr.answered(f.answered, f.skipped)}</p>
                  {f.tallies.length > 0 ? (
                    <ul className="mt-3 space-y-2">
                      {f.tallies.map((t) => (
                        <li key={t.value}>
                          <div className="flex justify-between text-sm"><span>{t.label}</span><span className="num">{t.count}</span></div>
                          <div className="mt-1 h-1.5 rounded-full bg-slate-100 dark:bg-white/10">
                            <div className="h-1.5 rounded-full bg-brand-600" style={{ width: `${Math.round((t.count / most) * 100)}%` }} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto text-sm text-slate-700 dark:text-slate-200">
                      {f.texts.slice(0, 50).map((t, n) => <li key={n} className="border-b border-slate-100 pb-1 dark:border-white/5">{t}</li>)}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
          <section className={`${panel} overflow-x-auto`}>
            <p className="mb-3 font-600 text-slate-900 dark:text-white">{tr.every}</p>
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="text-start text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <th className="pb-2 pe-3 text-start">{tr.when}</th>
                  {questions.slice(0, 4).map((q) => <th key={q.id} className="pb-2 pe-3 text-start">{q.label}</th>)}
                  <th className="pb-2 text-start">{tr.lead}</th>
                </tr>
              </thead>
              <tbody>
                {responses.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 dark:border-white/5">
                    <td className="py-2 pe-3 whitespace-nowrap text-slate-500 dark:text-slate-400">{fmtDateTime(r.createdAt)}</td>
                    {questions.slice(0, 4).map((q) => <td key={q.id} className="py-2 pe-3">{show(r.answers?.[q.id])}</td>)}
                    <td className="py-2">
                      {r.ticketId ? <Link href={`/${slug}/crm-sales-tickets/${r.ticketId}`} className="text-brand-700 hover:underline dark:text-brand-300">→</Link> : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
