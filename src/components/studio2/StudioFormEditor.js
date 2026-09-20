// ONE FORM, BUILT (rebuilt 20/09/2026 to the owner's design) — a full-page
// canvas of cards, the shape everybody who has ever made a form already knows.
//
// WHAT WAS WRONG WITH THE FIRST ONE, because it was not that anything was
// missing. Fifteen types, branching, lead mapping and sharing were all there
// and the owner's reading was "there is no types of questions to be added,
// nothing to be specified". Every one of those things was behind a click:
// question cards were collapsed to one line until you opened them, the type
// list only appeared after pressing "Add a question" — and could never be
// changed afterwards — and what the form DID with an answer was in another tab.
// A builder has to show its handles. So:
//
//  - every card is open, and carries its own TYPE DROPDOWN (a question's type
//    is now a thing you change, not a thing you chose once);
//  - duplicate, delete and Required are on the card, where the hand is;
//  - cards are dragged to reorder, within a section and between them;
//  - a section says where it leads, and an answer may override it;
//  - the toolbar that adds things floats beside the canvas — a bar at the
//    bottom on a phone, where a floating column would cover the card.
//
// The editor holds the whole form and saves it whole; the server cleans the
// definition and the settings against each other (modules/marketing/formsModel)
// and refuses an OPEN form into a shape that would stop it working, so what the
// public sees is never an edit caught halfway.
"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import { useStudioLocale } from "@/components/studio2/locale";
import { Icon } from "@/components/studio2/icons";
import { panel, h2, btn, btnGhost, btnRow, btnRowDanger, fmtDateTime } from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";
import SelectMenu from "@/components/fields/SelectMenu";
import PublicForm from "@/components/forms/PublicForm";
import { formsDict } from "@/shared/studio/forms";
import {
  FORM_TYPES, FILE_KINDS, FILE_MB_CHOICES, FORM_STORAGE_MB_CHOICES, MAX_FILES_PER_ANSWER, ACTION_OPS,
  hasChoices, takesAnswer, isGrid, isFile, canJump, actionOpTakesValue, openProblems, LEAD_FIELD_KEYS, SUBMIT,
} from "@/modules/marketing/formsModel";

const rid = (p) => `${p}_${Math.random().toString(36).slice(2, 10)}`;
const STATUS_TONE = {
  Draft: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300",
  Open: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  Closed: "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400",
};
// The face each type wears in the dropdown and on the card. Recognising a
// question by its shape is most of what makes a long form readable at a glance.
const TYPE_ICON = {
  "short-text": "type", "long-text": "list", email: "mail", phone: "phone", number: "tag",
  date: "calendar", time: "clock", datetime: "calendar", website: "globe",
  "multiple-choice": "dot", dropdown: "chevronDown", "yes-no": "check", legal: "shield",
  rating: "star", "opinion-scale": "activity", nps: "chart",
  "grid-single": "grid", "grid-multi": "table", file: "upload", statement: "type",
};
// The trigger wears what an input wears; SelectMenu draws only the panel.
const SELECT = "w-full rounded-lg border border-slate-200 bg-[var(--geex-surface)] px-3 py-2 text-sm dark:border-white/15";
const MB = 1024 * 1024;
const sizeMb = (bytes) => `${Math.round((Number(bytes) || 0) / MB * 10) / 10} MB`;

// THE CHOICES A NEW QUESTION STARTS WITH are in the FORM's language — the
// public reads them — not the editor's.
const STARTING = {
  en: { choice: "Option", yes: "Yes", no: "No", agree: "I agree", row: "Row", column: "Column" },
  ar: { choice: "خيار", yes: "نعم", no: "لا", agree: "أوافق", row: "صف", column: "عمود" },
};

/**
 * The fields a type needs, filled in. Used both for a NEW question and when a
 * question's type is CHANGED — which is why it takes what is already there:
 * changing Short answer to Dropdown must keep the question somebody wrote.
 */
function shapeFor(type, formLocale, from = {}) {
  const w = STARTING[formLocale] || STARTING.en;
  const q = {
    id: from.id || rid("fq"),
    type,
    label: from.label || "",
    description: from.description || "",
    required: type === "legal" ? true : Boolean(from.required) && takesAnswer(type),
    image: from.image || "",
  };
  if (hasChoices(type)) {
    const kept = (from.options || []).filter(Boolean);
    q.options = type === "yes-no" ? [w.yes, w.no]
      : type === "legal" ? [w.agree]
      : kept.length ? kept : [`${w.choice} 1`];
  }
  if (type === "multiple-choice") { q.multiple = Boolean(from.multiple); q.other = Boolean(from.other) && !from.multiple; }
  if (isGrid(type)) {
    q.rows = (from.rows || []).filter(Boolean).length ? from.rows : [`${w.row} 1`];
    q.columns = (from.columns || []).filter(Boolean).length ? from.columns : [`${w.column} 1`];
    q.requireEachRow = Boolean(from.requireEachRow);
  }
  if (isFile(type)) {
    q.fileKinds = from.fileKinds || [];
    q.maxFiles = from.maxFiles || 1;
    q.maxFileMb = from.maxFileMb || FILE_MB_CHOICES[FILE_MB_CHOICES.length - 1];
  }
  if (type === "rating") { q.min = 1; q.max = Number(from.max) >= 3 ? Number(from.max) : 5; q.icon = from.icon || "star"; }
  if (type === "opinion-scale") { q.min = Number(from.min) === 0 ? 0 : 1; q.max = Number(from.max) >= 3 ? Number(from.max) : 5; q.minLabel = from.minLabel || ""; q.maxLabel = from.maxLabel || ""; }
  if (type === "nps") { q.min = 0; q.max = 10; q.minLabel = from.minLabel || ""; q.maxLabel = from.maxLabel || ""; }
  if (["short-text", "long-text", "email", "phone", "website"].includes(type)) q.placeholder = from.placeholder || "";
  // A REVEAL SURVIVES A TYPE CHANGE ONLY WHERE IT STILL MEANS SOMETHING. The
  // rule compares against a CHOICE, so carrying one onto a paragraph question
  // would leave a rule that can never fire and nothing on screen saying why.
  if (hasChoices(type) && from.reveals?.length) q.reveals = from.reveals;
  if (canJump({ type, multiple: q.multiple }) && from.jumps?.length) q.jumps = from.jumps;
  return q;
}

export default function StudioFormEditor({ slug, formId, backHref }) {
  const tr = formsDict(useStudioLocale());
  const router = useRouter();
  const [data, setData] = useState(null);
  const [doc, setDoc] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState("questions");
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
    router.push(backHref || `/${slug}/marketing-forms`);
  };

  const problems = useMemo(() => (doc ? openProblems(doc.definition, doc.settings) : []), [doc]);

  if (error && !data) return <p className="p-6 text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data || !doc) return <ScreenSkeleton loadingLabel={tr.loading} />;
  const { form, canEdit } = data;
  const readOnly = !canEdit;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-[#0f0f14]">
      {/* THE BAR THAT NEVER SCROLLS AWAY: what this is, whether it is saved, and
          the two acts that change the world — preview and open. */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-[var(--geex-surface)] dark:border-white/10">
        <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 sm:px-5">
          <Link href={backHref || `/${slug}/marketing-forms`} aria-label={tr.back}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5">
            <Icon name="arrowLeft" className="h-4 w-4 rtl:rotate-180" />
          </Link>
          <input value={doc.name} disabled={readOnly} onChange={(e) => edit((d) => { d.name = e.target.value; })} aria-label={tr.name}
            className="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-1 font-display text-base font-800 text-slate-900 outline-none hover:bg-slate-100 focus:bg-slate-100 dark:text-white dark:hover:bg-white/5 dark:focus:bg-white/5 sm:text-lg" />
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-600 ${STATUS_TONE[form.status] || STATUS_TONE.Draft}`}>{tr.status(form.status)}</span>
          <span className="hidden text-xs text-slate-500 dark:text-slate-400 sm:inline">{note || (dirty ? tr.unsaved : "")}</span>
          <button type="button" className={btnGhost} onClick={() => setShowPreview((v) => !v)}>
            <Icon name={showPreview ? "eyeOff" : "eye"} className="h-4 w-4" />
            <span className="ms-1.5 hidden sm:inline">{showPreview ? tr.hidePreview : tr.preview}</span>
          </button>
          {!readOnly && <button type="button" className={btn} disabled={busy || !dirty} onClick={save}>{busy ? tr.saving : tr.save}</button>}
        </div>

        <div role="tablist" className="flex justify-center gap-1 px-3">
          {[["questions", tr.tabQuestions], ["responses", `${tr.tabResponses} (${data.responses})`], ["settings", tr.tabSettings]].map(([key, label]) => (
            <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-600 transition-colors ${tab === key
                ? "border-brand-600 text-brand-700 dark:text-brand-300"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"}`}>{label}</button>
          ))}
        </div>
      </header>

      {error && <p role="alert" className="mx-auto mt-4 w-full max-w-3xl px-4 text-sm text-rose-600 dark:text-rose-300">{error}</p>}

      <div className={`flex-1 ${showPreview ? "grid gap-0 xl:grid-cols-2" : ""}`}>
        <div className="min-w-0 overflow-x-hidden px-3 py-6 sm:px-6">
          {tab === "questions" && (
            <Canvas doc={doc} edit={edit} tr={tr} readOnly={readOnly} slug={slug}
              selected={selected} setSelected={setSelected} />
          )}
          {tab === "responses" && <div className="mx-auto max-w-4xl"><Responses slug={slug} formId={formId} doc={doc} tr={tr} /></div>}
          {tab === "settings" && (
            <div className="mx-auto max-w-3xl">
              <Settings slug={slug} data={data} doc={doc} edit={edit} tr={tr} readOnly={readOnly}
                problems={problems} busy={busy} setStatus={setStatus} remove={remove} />
            </div>
          )}
        </div>
        {showPreview && (
          <div className="min-w-0 border-t border-slate-200 bg-white dark:border-white/10 dark:bg-[#121218] xl:border-s xl:border-t-0">
            <PublicForm key={JSON.stringify(doc.definition)} preview
              form={{ name: doc.name, locale: doc.locale, pages: doc.definition.pages, accepting: true, studio: {} }}
              onSubmit={async () => ({ ok: true, confirmation: doc.settings.confirmation })} />
          </div>
        )}
      </div>
    </div>
  );
}

// ---- the canvas -----------------------------------------------------------------

function Canvas({ doc, edit, tr, readOnly, slug, selected, setSelected }) {
  const pages = doc.definition.pages;
  const [drag, setDrag] = useState(null);

  const addQuestion = (type = "short-text") => {
    const q = shapeFor(type, doc.locale);
    const pageIndex = Math.max(0, pages.findIndex((p) => p.questions.some((x) => x.id === selected)));
    edit((d) => {
      if (!d.definition.pages.length) d.definition.pages.push({ id: rid("fp"), title: "", lead: "", next: "", questions: [] });
      const page = d.definition.pages[Math.min(pageIndex, d.definition.pages.length - 1)];
      const at = page.questions.findIndex((x) => x.id === selected);
      page.questions.splice(at < 0 ? page.questions.length : at + 1, 0, q);
    });
    setSelected(q.id);
  };
  const addSection = () => {
    const page = { id: rid("fp"), title: "", lead: "", next: "", questions: [] };
    edit((d) => { d.definition.pages.push(page); });
    setSelected("");
  };

  // MOVING A CARD IS THE ONE EDIT THAT TOUCHES TWO PLACES AT ONCE, so it is
  // written here rather than in the card: take it out of wherever it is, put it
  // back where it was dropped, in one patch.
  const moveQuestion = (fromId, toPageIdx, toIdx) => edit((d) => {
    let moved = null;
    for (const p of d.definition.pages) {
      const i = p.questions.findIndex((q) => q.id === fromId);
      if (i >= 0) { [moved] = p.questions.splice(i, 1); break; }
    }
    if (!moved) return;
    const page = d.definition.pages[toPageIdx];
    if (!page) return;
    page.questions.splice(Math.max(0, Math.min(toIdx, page.questions.length)), 0, moved);
  });

  return (
    <div className="relative mx-auto w-full max-w-3xl lg:pe-20">
      {pages.map((page, pageIdx) => (
        <section key={page.id} className="mb-8">
          {pages.length > 1 && (
            <p className="mb-2 inline-block rounded-t-lg bg-brand-600 px-3 py-1 text-xs font-700 text-white">
              {tr.sectionOf(pageIdx + 1, pages.length)}
            </p>
          )}
          <div className={`${panel} border-s-4 border-s-brand-600`}>
            <input value={page.title} disabled={readOnly} maxLength={200} placeholder={tr.pageTitle}
              onChange={(e) => edit((d) => { d.definition.pages[pageIdx].title = e.target.value; })}
              className="w-full rounded-lg bg-transparent px-2 py-1 font-display text-lg font-700 text-slate-900 outline-none hover:bg-slate-50 focus:bg-slate-50 dark:text-white dark:hover:bg-white/5 dark:focus:bg-white/5" />
            <textarea value={page.lead || ""} disabled={readOnly} rows={1} maxLength={1000} placeholder={tr.pageLead}
              onChange={(e) => edit((d) => { d.definition.pages[pageIdx].lead = e.target.value; })}
              className="mt-1 w-full resize-y rounded-lg bg-transparent px-2 py-1 text-sm text-slate-600 outline-none hover:bg-slate-50 focus:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5 dark:focus:bg-white/5" />
            {!readOnly && pages.length > 1 && (
              <button type="button" className={`${btnRowDanger} mt-2 text-xs`}
                onClick={() => edit((d) => { d.definition.pages.splice(pageIdx, 1); })}>{tr.removeSection}</button>
            )}
          </div>

          <div className="mt-3 space-y-3">
            {page.questions.map((q, i) => (
              <QuestionCard key={q.id} q={q} tr={tr} readOnly={readOnly} slug={slug} formLocale={doc.locale}
                pages={pages} pageIdx={pageIdx} open={selected === q.id} onOpen={() => setSelected(q.id)}
                others={pages.flatMap((p) => p.questions).filter((x) => x.id !== q.id && takesAnswer(x.type))}
                dragging={drag === q.id}
                onDragStart={() => setDrag(q.id)}
                onDragEnd={() => setDrag(null)}
                onDrop={() => { if (drag && drag !== q.id) moveQuestion(drag, pageIdx, i); setDrag(null); }}
                patch={(fn) => edit((d) => {
                  const target = d.definition.pages[pageIdx].questions.find((x) => x.id === q.id);
                  if (target) fn(target);
                })}
                replace={(next) => edit((d) => {
                  const list = d.definition.pages[pageIdx].questions;
                  const at = list.findIndex((x) => x.id === q.id);
                  if (at >= 0) list[at] = next;
                })}
                duplicate={() => {
                  const copy = { ...structuredClone(q), id: rid("fq") };
                  // A COPY KEEPS NO RULES. Both a reveal and a jump are
                  // addressed to one question; two questions firing the same
                  // branch is never what "duplicate" meant.
                  delete copy.reveals; delete copy.jumps;
                  edit((d) => { d.definition.pages[pageIdx].questions.splice(i + 1, 0, copy); });
                  setSelected(copy.id);
                }}
                remove={() => edit((d) => {
                  d.definition.pages[pageIdx].questions = d.definition.pages[pageIdx].questions.filter((x) => x.id !== q.id);
                  // A rule that showed the removed question shows nothing now;
                  // drop it here rather than leave the server to, so the editor
                  // never displays a dead rule.
                  for (const p of d.definition.pages) for (const other of p.questions) {
                    if (other.reveals) {
                      other.reveals = other.reveals
                        .map((r) => ({ ...r, show: r.show.filter((s) => s !== q.id) }))
                        .filter((r) => r.show.length);
                    }
                  }
                })}
              />
            ))}
            {!page.questions.length && (
              <div onDragOver={(e) => e.preventDefault()} onDrop={() => { if (drag) moveQuestion(drag, pageIdx, 0); setDrag(null); }}
                className="rounded-geex border border-dashed border-slate-300 py-6 text-center text-sm text-slate-500 dark:border-white/15 dark:text-slate-400">
                {tr.noQuestions}
              </div>
            )}
          </div>

          {/* WHERE THIS SECTION LEADS. Below the questions because it is the
              last thing that happens on the page — and it is only a question at
              all once there is somewhere else to go. */}
          {pages.length > 1 && (
            <div className="mt-3 flex flex-wrap items-center gap-3 px-1">
              <span className="text-xs font-600 text-slate-500 dark:text-slate-400">{tr.afterSection(pageIdx + 1)}</span>
              <div className="min-w-56">
                <SelectMenu className={SELECT} value={page.next || ""} disabled={readOnly} aria-label={tr.afterSection(pageIdx + 1)}
                  onChange={(v) => edit((d) => { d.definition.pages[pageIdx].next = v; })}
                  options={destinations(pages, tr, pageIdx)} />
              </div>
            </div>
          )}
        </section>
      ))}

      {!readOnly && (
        <Toolbar tr={tr} onAddQuestion={() => addQuestion()} onAddSection={addSection} />
      )}
    </div>
  );
}

/** Everywhere a section or an answer may lead: on, to a named section, or out. */
function destinations(pages, tr, fromIdx) {
  return [
    { value: "", label: tr.continueNext },
    ...pages.map((p, i) => ({ value: p.id, label: tr.goToSection(i + 1, p.title) }))
      .filter((_o, i) => i !== fromIdx || pages.length === 1),
    { value: SUBMIT, label: tr.submitForm },
  ];
}

/**
 * THE TOOLBAR FLOATS BESIDE THE CANVAS ON A DESKTOP AND SITS UNDER IT ON A
 * PHONE. A floating column at 375 pixels covers the card being edited, which is
 * the one thing a builder's furniture must never do.
 */
function Toolbar({ tr, onAddQuestion, onAddSection }) {
  const buttons = [
    { key: "q", icon: "plus", label: tr.addQuestion, onClick: onAddQuestion },
    { key: "s", icon: "layers", label: tr.addSection, onClick: onAddSection },
  ];
  return (
    <>
      <div className="sticky bottom-4 z-20 mt-6 flex justify-center gap-2 lg:hidden">
        {buttons.map((b) => (
          <button key={b.key} type="button" onClick={b.onClick}
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-[var(--geex-surface)] px-4 py-2.5 text-sm font-600 shadow-lg dark:border-white/10">
            <Icon name={b.icon} className="h-4 w-4" />{b.label}
          </button>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 end-0 hidden lg:block">
        <div className="pointer-events-auto sticky top-32 flex flex-col gap-1 rounded-geex border border-slate-200 bg-[var(--geex-surface)] p-1.5 shadow-sm dark:border-white/10">
          {buttons.map((b) => (
            <button key={b.key} type="button" onClick={b.onClick} title={b.label} aria-label={b.label}
              className="rounded-lg p-2.5 text-slate-600 transition-colors hover:bg-brand-500/10 hover:text-brand-700 dark:text-slate-300 dark:hover:text-brand-300">
              <Icon name={b.icon} className="h-5 w-5" />
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// ---- one card -------------------------------------------------------------------

function QuestionCard({
  q, tr, readOnly, slug, formLocale, pages, pageIdx, open, onOpen, others, patch, replace, duplicate, remove,
  dragging, onDragStart, onDragEnd, onDrop,
}) {
  const [more, setMore] = useState(false);
  const set = (k) => (v) => patch((x) => { x[k] = v; });
  return (
    <section
      draggable={!readOnly}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      onClick={onOpen}
      className={`${panel} transition-shadow ${dragging ? "opacity-40" : ""} ${
        open ? "border-s-4 border-s-brand-600 shadow-md" : "border-s-4 border-s-transparent"}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <textarea value={q.label} disabled={readOnly} rows={1} maxLength={300} placeholder={tr.questionHint}
            onChange={(e) => patch((x) => { x.label = e.target.value; })}
            className="w-full resize-y rounded-lg bg-slate-50 px-3 py-2 text-[15px] font-600 text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-brand-500/30 dark:bg-white/5 dark:text-white dark:focus:bg-white/10" />
          {(more || q.description) && (
            <input value={q.description || ""} disabled={readOnly} maxLength={1000} placeholder={tr.description}
              onChange={(e) => patch((x) => { x.description = e.target.value; })}
              className="mt-1.5 w-full rounded-lg bg-transparent px-3 py-1 text-sm text-slate-500 outline-none hover:bg-slate-50 focus:bg-slate-50 dark:text-slate-400 dark:hover:bg-white/5" />
          )}
        </div>
        <div className="flex items-center gap-2">
          {!readOnly && <ImageButton slug={slug} tr={tr} patch={patch} />}
          <Icon name={TYPE_ICON[q.type] || "type"} className="h-4 w-4 shrink-0 text-slate-400" />
          <div className="w-48">
            <SelectMenu className={SELECT} value={q.type} disabled={readOnly} aria-label={tr.typeOf}
              onChange={(type) => replace(shapeFor(type, formLocale, q))}
              options={FORM_TYPES.map((t) => ({ value: t, label: tr.typeName(t) }))} />
          </div>
        </div>
      </div>

      {q.image && (
        <div className="mt-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/media/${q.image}`} alt="" className="max-h-48 rounded-xl border border-slate-200 dark:border-white/10" />
          {!readOnly && (
            <button type="button" className={`${btnRowDanger} mt-1.5 text-xs`} onClick={() => patch((x) => { x.image = ""; })}>{tr.removeImage}</button>
          )}
        </div>
      )}

      <div className="mt-3">
        <Body q={q} tr={tr} readOnly={readOnly} patch={patch} formLocale={formLocale} />
      </div>

      {/* THE FOOTER IS THE HAND'S END OF THE CARD: copy, bin, required. */}
      <div className="mt-4 flex flex-wrap items-center justify-end gap-1 border-t border-slate-100 pt-3 dark:border-white/10">
        {!readOnly && (
          <>
            <button type="button" onClick={duplicate} title={tr.duplicate} aria-label={tr.duplicate}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5">
              <Icon name="copy" className="h-4 w-4" />
            </button>
            <button type="button" onClick={remove} title={tr.remove} aria-label={tr.remove}
              className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/10">
              <Icon name="trash" className="h-4 w-4" />
            </button>
            <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-white/10" />
          </>
        )}
        {takesAnswer(q.type) && (
          <label className="flex items-center gap-2 px-1 text-sm text-slate-700 dark:text-slate-200">
            <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={Boolean(q.required)}
              disabled={readOnly || q.type === "legal"} onChange={(e) => set("required")(e.target.checked)} />
            {tr.requiredToggle}
          </label>
        )}
        <button type="button" onClick={() => setMore((v) => !v)} title={tr.moreOptions} aria-label={tr.moreOptions}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5">
          <Icon name="more" className="h-4 w-4" />
        </button>
      </div>

      {more && (
        <div className="mt-3 space-y-3 border-t border-slate-100 pt-3 dark:border-white/10">
          {canJump(q) && pages.length > 1 && <Jumps q={q} tr={tr} readOnly={readOnly} pages={pages} pageIdx={pageIdx} patch={patch} />}
          {hasChoices(q.type) && others.length > 0 && <Logic q={q} tr={tr} readOnly={readOnly} others={others} patch={patch} />}
        </div>
      )}
    </section>
  );
}

/** The type's own controls, drawn as the public will see them wherever that is honest. */
function Body({ q, tr, readOnly, patch, formLocale }) {
  if (isGrid(q.type)) return <GridEditor q={q} tr={tr} readOnly={readOnly} patch={patch} formLocale={formLocale} />;
  if (isFile(q.type)) return <FileEditor q={q} tr={tr} readOnly={readOnly} patch={patch} />;
  if (hasChoices(q.type)) return <Choices q={q} tr={tr} readOnly={readOnly} patch={patch} formLocale={formLocale} />;
  if (["rating", "opinion-scale", "nps"].includes(q.type)) return <ScaleEditor q={q} tr={tr} readOnly={readOnly} patch={patch} />;
  if (q.type === "statement") return null;
  return (
    <div className="space-y-2">
      <p className="border-b border-dashed border-slate-300 pb-1 text-sm text-slate-400 dark:border-white/15">
        {tr.typeName(q.type)}
      </p>
      {["short-text", "long-text", "email", "phone", "website"].includes(q.type) && (
        <input value={q.placeholder || ""} disabled={readOnly} maxLength={120} placeholder={tr.placeholder}
          onChange={(e) => patch((x) => { x.placeholder = e.target.value; })}
          className="w-full rounded-lg border border-slate-200 bg-[var(--geex-surface)] px-3 py-1.5 text-sm dark:border-white/15" />
      )}
    </div>
  );
}

function ImageButton({ slug, tr, patch }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const send = async (file) => {
    if (!file) return;
    if (file.size > 4 * MB) { setProblem(tr.imageTooBig); return; }
    setBusy(true); setProblem("");
    const body = new FormData();
    body.append("file", file);
    body.append("slug", slug);
    // PUBLIC, deliberately: a stranger filling the form has to be able to see
    // it, and the media route serves a public file to anybody with the id.
    const res = await fetch("/api/media", { method: "POST", body });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (out?.id) patch((x) => { x.image = out.id; });
    else setProblem(tr.imageTooBig);
  };
  return (
    <>
      <button type="button" title={tr.addImage} aria-label={tr.addImage} disabled={busy}
        onClick={() => input.current?.click()}
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5">
        <Icon name="image" className="h-4 w-4" />
      </button>
      <input ref={input} type="file" accept="image/*" className="hidden"
        onChange={(e) => { send(e.target.files?.[0]); e.target.value = ""; }} />
      {problem && <span className="text-xs text-rose-600 dark:text-rose-300">{problem}</span>}
    </>
  );
}

function Choices({ q, tr, readOnly, patch, formLocale }) {
  const options = q.options || [];
  const word = (STARTING[formLocale] || STARTING.en).choice;
  // Consent has exactly one "I agree"; Yes/No exactly two. Only the lists that
  // are the author's to shape grow and shrink.
  const fixed = q.type === "legal" || q.type === "yes-no";
  const mark = q.type === "dropdown" ? null : q.multiple ? "square" : "circle";
  return (
    <div className="space-y-2">
      {options.map((o, n) => (
        <div key={n} className="flex items-center gap-2">
          {q.type === "dropdown"
            ? <span className="w-5 text-center text-sm text-slate-400">{n + 1}.</span>
            : <span className={`h-4 w-4 shrink-0 border border-slate-300 dark:border-white/20 ${mark === "square" ? "rounded" : "rounded-full"}`} />}
          <input value={o} disabled={readOnly} maxLength={200} aria-label={`${tr.choices} ${n + 1}`}
            onChange={(e) => patch((x) => { x.options[n] = e.target.value; })}
            className="min-w-0 flex-1 border-b border-transparent bg-transparent px-1 py-1 text-sm outline-none hover:border-slate-200 focus:border-brand-500 dark:hover:border-white/15" />
          {!readOnly && !fixed && options.length > 1 && (
            <button type="button" aria-label={tr.remove} className="rounded p-1 text-slate-400 hover:text-rose-600"
              onClick={() => patch((x) => {
                const [gone] = x.options.splice(n, 1);
                // A jump or a reveal hangs off the CHOICE, so removing the
                // choice removes them; leaving them would be a rule pointing at
                // an answer nobody can give.
                if (x.jumps) x.jumps = x.jumps.filter((j) => j.value !== gone);
                if (x.reveals) x.reveals = x.reveals.filter((r) => r.value !== gone);
              })}>
              <Icon name="close" className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}
      {!readOnly && !fixed && (
        <div className="flex flex-wrap items-center gap-3 ps-7 pt-1">
          <button type="button" className="text-sm text-slate-500 hover:text-brand-700 dark:text-slate-400"
            onClick={() => patch((x) => { x.options.push(`${word} ${x.options.length + 1}`); })}>+ {tr.addChoice}</button>
          {q.type === "multiple-choice" && !q.multiple && !q.other && (
            <button type="button" className="text-sm font-600 text-brand-700 hover:underline dark:text-brand-300"
              onClick={() => patch((x) => { x.other = true; })}>+ {tr.allowOther}</button>
          )}
        </div>
      )}
      {q.type === "multiple-choice" && (
        <label className="flex items-center gap-2 pt-2 text-sm text-slate-700 dark:text-slate-200">
          <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={Boolean(q.multiple)} disabled={readOnly}
            onChange={(e) => patch((x) => {
              x.multiple = e.target.checked;
              // A MULTI-SELECT CANNOT JUMP: two answers would satisfy two
              // destinations and nothing could say which wins (formsModel).
              if (x.multiple) { x.other = false; delete x.jumps; }
            })} />
          {tr.multiple}
        </label>
      )}
    </div>
  );
}

function GridEditor({ q, tr, readOnly, patch, formLocale }) {
  const starting = STARTING[formLocale] || STARTING.en;
  const list = (key, addLabel, word, newWord) => (
    <div>
      <p className="mb-1.5 text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">{word}</p>
      <div className="space-y-1.5">
        {(q[key] || []).map((v, n) => (
          <div key={n} className="flex items-center gap-2">
            <span className="w-5 text-center text-sm text-slate-400">{n + 1}.</span>
            <input value={v} disabled={readOnly} maxLength={200} aria-label={`${word} ${n + 1}`}
              onChange={(e) => patch((x) => { x[key][n] = e.target.value; })}
              className="min-w-0 flex-1 border-b border-transparent bg-transparent px-1 py-1 text-sm outline-none hover:border-slate-200 focus:border-brand-500 dark:hover:border-white/15" />
            {!readOnly && (q[key] || []).length > 1 && (
              <button type="button" aria-label={tr.remove} className="rounded p-1 text-slate-400 hover:text-rose-600"
                onClick={() => patch((x) => { x[key].splice(n, 1); })}>
                <Icon name="close" className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
      {!readOnly && (
        <button type="button" className="mt-1.5 ps-7 text-sm text-slate-500 hover:text-brand-700 dark:text-slate-400"
          onClick={() => patch((x) => { x[key].push(`${newWord} ${x[key].length + 1}`); })}>+ {addLabel}</button>
      )}
    </div>
  );
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {list("rows", tr.addRow, tr.rows, starting.row)}
        {list("columns", tr.addColumn, tr.columns, starting.column)}
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
        <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={Boolean(q.requireEachRow)} disabled={readOnly}
          onChange={(e) => patch((x) => { x.requireEachRow = e.target.checked; })} />
        {tr.requireEachRow}
      </label>
    </div>
  );
}

function FileEditor({ q, tr, readOnly, patch }) {
  const kinds = q.fileKinds || [];
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1.5 text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">{tr.fileKinds}</p>
        <div className="flex flex-wrap gap-2">
          {FILE_KINDS.map((k) => {
            const on = kinds.includes(k);
            return (
              <button key={k} type="button" disabled={readOnly} aria-pressed={on}
                onClick={() => patch((x) => {
                  const list = x.fileKinds || [];
                  x.fileKinds = on ? list.filter((v) => v !== k) : [...list, k];
                })}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${on
                  ? "border-brand-500 bg-brand-500/10 font-600 text-brand-800 dark:text-brand-200"
                  : "border-slate-200 text-slate-600 dark:border-white/15 dark:text-slate-300"}`}>
                {tr.fileKind(k)}
              </button>
            );
          })}
        </div>
        {!kinds.length && <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{tr.fileKindsAny}</p>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={tr.maxFiles} as="select" value={String(q.maxFiles || 1)} disabled={readOnly}
          onChange={(v) => patch((x) => { x.maxFiles = Number(v); })}
          options={Array.from({ length: MAX_FILES_PER_ANSWER }, (_v, i) => String(i + 1))} />
        <Field label={tr.maxFileSize} as="select" value={String(q.maxFileMb || FILE_MB_CHOICES[0])} disabled={readOnly}
          onChange={(v) => patch((x) => { x.maxFileMb = Number(v); })}
          options={FILE_MB_CHOICES.map((mb) => ({ value: String(mb), label: `${mb} MB` }))} />
      </div>
    </div>
  );
}

function ScaleEditor({ q, tr, readOnly, patch }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        {q.type === "opinion-scale" && (
          <Field label={tr.scaleFrom} as="select" value={String(q.min ?? 1)} disabled={readOnly}
            onChange={(v) => patch((x) => { x.min = Number(v); })} options={["0", "1"]} />
        )}
        {q.type !== "nps" && (
          <Field label={tr.scaleTo} as="select" value={String(q.max ?? 5)} disabled={readOnly}
            onChange={(v) => patch((x) => { x.max = Number(v); })} options={["3", "4", "5", "6", "7", "8", "9", "10"]} />
        )}
        {q.type === "rating" && (
          <Field label={tr.ratingIcon} as="select" value={q.icon || "star"} disabled={readOnly}
            onChange={(v) => patch((x) => { x.icon = v; })}
            options={["star", "heart", "thumb"].map((i) => ({ value: i, label: tr.iconName(i) }))} />
        )}
      </div>
      {q.type !== "rating" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={tr.lowLabel} value={q.minLabel || ""} disabled={readOnly}
            onChange={(v) => patch((x) => { x.minLabel = v; })} inputProps={{ maxLength: 60 }} />
          <Field label={tr.highLabel} value={q.maxLabel || ""} disabled={readOnly}
            onChange={(v) => patch((x) => { x.maxLabel = v; })} inputProps={{ maxLength: 60 }} />
        </div>
      )}
    </div>
  );
}

/**
 * WHERE EACH ANSWER LEADS. One row per choice, because that is how the author
 * thinks about it — "if they say this, they go there" — and because a list of
 * rules would make the choices with no destination invisible.
 */
function Jumps({ q, tr, readOnly, pages, pageIdx, patch }) {
  const jumps = q.jumps || [];
  const to = (choice) => jumps.find((j) => j.value === choice)?.to || "";
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/[0.03]">
      <p className="text-sm font-600 text-slate-900 dark:text-white">{tr.jumps}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{tr.jumpsHint}</p>
      <div className="mt-3 space-y-2">
        {(q.options || []).map((choice) => (
          <div key={choice} className="flex flex-wrap items-center gap-2">
            <span className="min-w-40 flex-1 text-sm text-slate-700 dark:text-slate-200">{tr.jumpFor(choice)}</span>
            <div className="min-w-56">
              <SelectMenu className={SELECT} value={to(choice)} disabled={readOnly} aria-label={tr.jumpFor(choice)}
                onChange={(v) => patch((x) => {
                  const rest = (x.jumps || []).filter((j) => j.value !== choice);
                  x.jumps = v ? [...rest, { value: choice, to: v }] : rest;
                })}
                options={destinations(pages, tr, pageIdx)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// BRANCHING WITHIN A PAGE: "when the answer is X, show these". Stored as the
// questionnaire's own `reveals`, so the public page, the server and the
// response summary all read it through one module. It is the fine-grained
// counterpart of a jump, which moves between sections.
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
  const { form, campaigns = [], salesOn, canDelete, assignees = [], canAssign } = data;
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

      <Actions doc={doc} edit={edit} tr={tr} readOnly={readOnly} salesOn={salesOn}
        questions={questions} assignees={assignees} canAssign={canAssign} />

      <section className={`${panel} space-y-4`}>
        <Field label={tr.language} as="select" value={doc.locale} disabled={readOnly}
          onChange={(v) => edit((d) => { d.locale = v; })} options={["en", "ar"].map((l) => ({ value: l, label: tr.langName(l) }))} />
        <Field label={tr.campaign} as="select" value={s.campaignId} disabled={readOnly} hint={tr.campaignHint}
          onChange={setS("campaignId")} options={[{ value: "", label: tr.campaignNone }, ...campaigns.map((c) => ({ value: c.id, label: c.label }))]} />
        {(s.actions || []).length > 0 && (
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
        <div>
          <Field label={tr.storage} as="select" value={String(s.storageMb || FORM_STORAGE_MB_CHOICES[0])} disabled={readOnly}
            hint={tr.storageHint} onChange={(v) => edit((d) => { d.settings.storageMb = Number(v); })}
            options={FORM_STORAGE_MB_CHOICES.map((mb) => ({ value: String(mb), label: `${mb} MB` }))} />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {tr.storageUsed(sizeMb(s.storedBytes || 0), `${s.storageMb || FORM_STORAGE_MB_CHOICES[0]} MB`)}
          </p>
        </div>
      </section>

      {canDelete && (
        <button type="button" className={btnRowDanger} onClick={remove}>{tr.deleteForm}</button>
      )}
    </div>
  );
}

/**
 * WHAT AN ANSWER SETS OFF. The single "every answer becomes a lead" switch this
 * screen used to have is the first row of this list with "every answer" chosen,
 * which is exactly what the server reads an old form's stored switch as.
 */
function Actions({ doc, edit, tr, readOnly, salesOn, questions, assignees, canAssign }) {
  const actions = doc.settings.actions || [];
  const patch = (n, fn) => edit((d) => { fn(d.settings.actions[n]); });
  return (
    <section className={panel}>
      <h3 className={h2}>{tr.actionsHeading}</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{salesOn ? tr.actionsHint : tr.salesOff}</p>
      <div className="mt-4 space-y-3">
        {actions.map((a, n) => (
          <div key={a.id} className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
            <div className="flex flex-wrap items-end gap-2">
              <span className="pb-2 text-sm text-slate-500 dark:text-slate-400">{tr.actionWhen}</span>
              <div className="min-w-44 flex-1">
                <SelectMenu className={SELECT} value={a.when.op === "any" ? "" : a.when.questionId} disabled={readOnly || !salesOn} aria-label={tr.actionWhen}
                  onChange={(v) => patch(n, (x) => {
                    x.when.questionId = v;
                    if (!v) { x.when.op = "any"; x.when.value = ""; } else if (x.when.op === "any") x.when.op = "is";
                  })}
                  options={[{ value: "", label: tr.actionEvery }, ...questions.map((q) => ({ value: q.id, label: q.label || tr.typeName(q.type) }))]} />
              </div>
              {a.when.op !== "any" && (
                <>
                  <div className="min-w-32">
                    <SelectMenu className={SELECT} value={a.when.op} disabled={readOnly || !salesOn} aria-label={tr.actionsHeading}
                      onChange={(v) => patch(n, (x) => { x.when.op = v; if (!actionOpTakesValue(v)) x.when.value = ""; })}
                      options={ACTION_OPS.filter((op) => op !== "any").map((op) => ({ value: op, label: tr.actionOp(op) }))} />
                  </div>
                  {actionOpTakesValue(a.when.op) && (
                    <div className="min-w-40 flex-1">
                      <ValueField questionId={a.when.questionId} questions={questions} tr={tr}
                        value={a.when.value} disabled={readOnly || !salesOn}
                        onChange={(v) => patch(n, (x) => { x.when.value = v; })} />
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <span className="pb-2 text-sm font-600 text-slate-700 dark:text-slate-200">→ {tr.actionThen}</span>
              <div className="min-w-56 flex-1">
                <Field label={tr.assignTo} as="select" value={a.assignTo || ""} disabled={readOnly || !salesOn || !canAssign}
                  hint={canAssign ? "" : tr.assignHint}
                  onChange={(v) => patch(n, (x) => { x.assignTo = v; })}
                  options={[{ value: "", label: tr.assignNobody }, ...assignees.map((p) => ({ value: p.id, label: p.label }))]} />
              </div>
              {!readOnly && (
                <button type="button" className={`${btnRowDanger} mb-0.5 text-xs`}
                  onClick={() => edit((d) => { d.settings.actions.splice(n, 1); })}>{tr.removeAction}</button>
              )}
            </div>
          </div>
        ))}
      </div>
      {!readOnly && salesOn && (
        <button type="button" className={`${btnRow} mt-3 text-sm`}
          onClick={() => edit((d) => {
            d.settings.actions = [...(d.settings.actions || []), {
              id: rid("fa"), when: { questionId: "", op: "any", value: "" }, raise: "lead", assignTo: "",
            }];
          })}>+ {tr.addAction}</button>
      )}
    </section>
  );
}

/** The value a rule compares against: the question's own choices where it has them. */
function ValueField({ questionId, questions, value, onChange, disabled, tr }) {
  const q = questions.find((x) => x.id === questionId);
  if (q && (q.options || []).length) {
    return <SelectMenu className={SELECT} value={value || ""} disabled={disabled} onChange={onChange} aria-label={tr.actionValue}
      options={(q.options || []).map((o) => ({ value: o, label: o }))} />;
  }
  return <input value={value || ""} disabled={disabled} maxLength={200} placeholder={tr.actionValue}
    onChange={(e) => onChange(e.target.value)}
    className="w-full rounded-lg border border-slate-200 bg-[var(--geex-surface)] px-3 py-2 text-sm dark:border-white/15" />;
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
  const { summary, responses = [], files = {} } = data;
  const questions = doc.definition.pages.flatMap((p) => p.questions).filter((q) => takesAnswer(q.type));
  const show = (q, v) => {
    // A FILE ANSWER IS A LIST OF IDS, and an id is not an answer anybody can
    // read. The name is what the studio recognises, and the link is what they
    // actually want.
    if (isFile(q.type)) {
      const ids = Array.isArray(v) ? v : [];
      if (!ids.length) return "";
      return (
        <span className="flex flex-wrap gap-2">
          {ids.map((mediaId) => (
            <a key={mediaId} href={`/api/media/${mediaId}`} target="_blank" rel="noreferrer"
              className="text-brand-700 hover:underline dark:text-brand-300">
              {files[mediaId]?.name || tr.openFile}
            </a>
          ))}
        </span>
      );
    }
    return Array.isArray(v) ? v.join(", ") : v === undefined || v === null ? "" : String(v);
  };
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
                    {questions.slice(0, 4).map((q) => <td key={q.id} className="py-2 pe-3">{show(q, r.answers?.[q.id])}</td>)}
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
