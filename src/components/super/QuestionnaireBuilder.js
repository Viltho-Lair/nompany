"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ELEMENTS, GROUPS, TOGGLES, byType, hasOptions, isStructure, newQuestion,
} from "@/lib/questionnaireElements";
import { INDUSTRIES } from "@/lib/industries";
import { COUNTRIES } from "@/shared/countries";
import { ERP_SYSTEMS } from "@/lib/questionnaire";

// What each bound source actually contains, so a question wired to one can SHOW
// its choices instead of naming a list the author has to take on trust.
// These live in code rather than in the questionnaire, which is why they are
// read-only here — see the note the panel prints.
const SOURCE_LISTS = {
  industries: INDUSTRIES,
  countries: COUNTRIES.map((c) => c.name),
  erps: ERP_SYSTEMS,
};

// The questionnaire builder — Typeform's three-pane shape, for authoring only.
//
// LEFT   the pages in this questionnaire, plus Add content
// CENTRE the selected element, edited in place as it will be seen
// RIGHT   what kind of answer it takes, and the toggles that kind supports
//
// Deliberately absent, per the brief: Contacts, Automations, Research Flow,
// Invite, workspaces, Private, the response-limit meter and the assistant box.
// Workflow and Connect are gone too — this builds questions, it does not route
// them anywhere yet.
//
// A page holds ONE OR MORE elements, which is why the canvas renders a list and
// the left rail counts them: the questionnaire this feeds shows a page at a
// time, not a question at a time.

const btn = "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-600 transition-colors";
const dark = `${btn} bg-[var(--ad-foreground)] text-white hover:bg-[rgb(var(--ad-foreground-rgb)/0.75)] disabled:opacity-60`;
const ghost = `${btn} text-[var(--ad-foreground)] hover:bg-[var(--ad-muted)]`;
const field = "w-full rounded-lg border border-[var(--ad-border)] px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--ad-muted-foreground)]";

export default function QuestionnaireBuilder({ id }) {
  const [doc, setDoc] = useState(null);
  const [pageIdx, setPageIdx] = useState(0);
  const [selected, setSelected] = useState("");
  const [picker, setPicker] = useState(false);
  const [status, setStatus] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/super/questionnaires/${id}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d?.questionnaire) setDoc(d.questionnaire); })
      .catch(() => {});
    return () => { alive = false; };
  }, [id]);

  const page = doc?.pages?.[pageIdx] || null;
  const question = page?.questions?.find((q) => q.id === selected) || page?.questions?.[0] || null;

  // Every edit goes through here, so "unsaved" is never guessed at.
  const edit = useCallback((fn) => {
    setDoc((d) => { const next = structuredClone(d); fn(next); return next; });
    setDirty(true);
    setStatus("");
  }, []);

  async function save() {
    setStatus("Saving…");
    const res = await fetch(`/api/super/questionnaires/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: doc.name, route: doc.route, pages: doc.pages }),
    });
    if (res.ok) { setDirty(false); setStatus("Saved"); }
    else setStatus("Couldn't save");
  }

  function addPage() {
    edit((d) => {
      d.pages.push({ id: `qpg_${Math.random().toString(36).slice(2, 10)}`, title: `Page ${d.pages.length + 1}`, lead: "", questions: [] });
    });
    setPageIdx((doc?.pages?.length) || 0);
  }

  function addElement(type) {
    const qid = `qsn_${Math.random().toString(36).slice(2, 10)}`;
    edit((d) => {
      if (d.pages.length === 0) d.pages.push({ id: `qpg_${Math.random().toString(36).slice(2, 10)}`, title: "Page 1", lead: "", questions: [] });
      const target = d.pages[Math.min(pageIdx, d.pages.length - 1)];
      target.questions.push(newQuestion(type, qid));
    });
    setPageIdx((i) => Math.min(i, Math.max(0, (doc?.pages?.length || 1) - 1)));
    setSelected(qid);
    setPicker(false);
  }

  function patchQuestion(patch) {
    edit((d) => {
      const q = d.pages[pageIdx]?.questions.find((x) => x.id === question.id);
      if (q) Object.assign(q, patch);
    });
  }

  function removeQuestion(qid) {
    edit((d) => { d.pages[pageIdx].questions = d.pages[pageIdx].questions.filter((q) => q.id !== qid); });
    if (selected === qid) setSelected("");
  }

  function removePage(idx) {
    edit((d) => { d.pages.splice(idx, 1); });
    setPageIdx((i) => Math.max(0, Math.min(i, (doc?.pages?.length || 2) - 2)));
  }

  if (!doc) return <div className="flex min-h-screen w-full items-center justify-center bg-[var(--ad-muted)] text-sm text-[var(--ad-muted-foreground)]">Loading…</div>;

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[var(--ad-muted)] text-[var(--ad-foreground)]">
      {/* ---- top bar ---- */}
      <header className="flex shrink-0 items-center gap-3 border-b border-[var(--ad-border)] bg-[var(--ad-card)] px-4 py-2.5">
        <Link href="/super/questionnaires" className="text-sm text-[var(--ad-muted-foreground)] hover:text-[var(--ad-foreground)]">Questionnaires</Link>
        <span className="text-[var(--ad-muted-foreground)]">/</span>
        <input
          value={doc.name}
          onChange={(e) => edit((d) => { d.name = e.target.value; })}
          className="min-w-0 max-w-[240px] flex-1 rounded-md px-1.5 py-1 text-sm font-600 outline-none hover:bg-[var(--ad-muted)] focus:bg-[var(--ad-muted)]"
        />
        <span className="hidden font-mono text-[11px] text-[var(--ad-muted-foreground)] sm:inline">{doc.id}</span>

        <div className="ms-auto flex items-center gap-2">
          {/* The route this questionnaire answers to. Empty means it is authored
              but not yet asked for anywhere. */}
          <label className="hidden items-center gap-2 md:flex">
            <span className="text-xs font-600 uppercase tracking-wide text-[var(--ad-muted-foreground)]">Route</span>
            <input
              value={doc.route || ""}
              onChange={(e) => edit((d) => { d.route = e.target.value; })}
              placeholder="/en/questionnaire"
              className="w-44 rounded-lg border border-[var(--ad-border)] px-2.5 py-1.5 font-mono text-xs outline-none focus:border-[var(--ad-muted-foreground)]"
            />
          </label>
          <span className="text-xs text-[var(--ad-muted-foreground)]">{status || (dirty ? "Unsaved changes" : "")}</span>
          <button type="button" className={dark} onClick={save} disabled={!dirty}>Save</button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ---- left: pages ---- */}
        <aside className="flex w-[240px] shrink-0 flex-col border-e border-[var(--ad-border)] bg-[var(--ad-card)]">
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="text-xs font-700 uppercase tracking-wide text-[var(--ad-muted-foreground)]">Pages</h2>
            <button type="button" onClick={addPage} className={ghost} aria-label="Add page">+</button>
          </div>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-3">
            {doc.pages.length === 0 && <p className="px-1 text-xs text-[var(--ad-muted-foreground)]">No pages yet.</p>}
            {doc.pages.map((p, i) => (
              <div key={p.id}
                className={`group rounded-lg border px-3 py-2.5 transition-colors ${
                  i === pageIdx ? "border-[var(--ad-border)] bg-[var(--ad-muted)]" : "border-transparent hover:bg-[var(--ad-muted)]"}`}>
                <button type="button" onClick={() => { setPageIdx(i); setSelected(""); }} className="block w-full text-start">
                  <span className="flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[var(--ad-foreground)] text-[10px] font-700 text-white">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-600">{p.title || `Page ${i + 1}`}</span>
                  </span>
                  <span className="ms-7 block text-[11px] text-[var(--ad-muted-foreground)]">
                    {p.questions.length} element{p.questions.length === 1 ? "" : "s"}
                  </span>
                </button>
                <button type="button" onClick={() => removePage(i)}
                  className="ms-7 mt-1 hidden text-[11px] text-[var(--ad-destructive)] hover:underline group-hover:inline">Remove page</button>
              </div>
            ))}
          </div>
          <div className="border-t border-[var(--ad-border)] p-3">
            <button type="button" onClick={() => setPicker(true)} className={`${ghost} w-full justify-center border border-dashed border-[var(--ad-border)]`}>
              + Add content
            </button>
          </div>
        </aside>

        {/* ---- centre: the canvas ---- */}
        <main className="min-w-0 flex-1 overflow-y-auto p-6">
          {!page ? (
            <Empty onAdd={addPage} label="Add a page to begin." action="Add page" />
          ) : (
            <div className="mx-auto max-w-3xl">
              <div className="rounded-xl border border-[var(--ad-border)] bg-[var(--ad-card)] p-4">
                <input
                  value={page.title || ""}
                  onChange={(e) => edit((d) => { d.pages[pageIdx].title = e.target.value; })}
                  placeholder="Page title"
                  className="w-full rounded-md px-1.5 py-1 font-display text-lg font-700 outline-none hover:bg-[var(--ad-muted)] focus:bg-[var(--ad-muted)]"
                />
                <input
                  value={page.lead || ""}
                  onChange={(e) => edit((d) => { d.pages[pageIdx].lead = e.target.value; })}
                  placeholder="Page description (optional)"
                  className="mt-1 w-full rounded-md px-1.5 py-1 text-sm text-[var(--ad-muted-foreground)] outline-none hover:bg-[var(--ad-muted)] focus:bg-[var(--ad-muted)]"
                />
                {/* What Nova says while this page is open. She only appears when
                    there is something for her to say, so leaving this empty is
                    how you keep her off a page. */}
                <label className="mt-3 block border-t border-[var(--ad-border)] pt-3">
                  <span className="text-xs font-700 uppercase tracking-wide text-[var(--ad-muted-foreground)]">Nova says</span>
                  <input
                    value={page.hint || ""}
                    onChange={(e) => edit((d) => { d.pages[pageIdx].hint = e.target.value; })}
                    placeholder="Leave empty and Nova stays away"
                    className="mt-1 w-full rounded-md px-1.5 py-1 text-sm outline-none hover:bg-[var(--ad-muted)] focus:bg-[var(--ad-muted)]"
                  />
                </label>
              </div>

              {page.questions.length === 0 ? (
                <div className="mt-4"><Empty onAdd={() => setPicker(true)} label="This page has no elements yet." action="Add content" /></div>
              ) : (
                <div className="mt-4 space-y-3">
                  {page.questions.map((q, n) => (
                    <button key={q.id} type="button" onClick={() => setSelected(q.id)}
                      className={`block w-full rounded-xl border bg-[var(--ad-card)] p-6 text-start transition-colors ${
                        question?.id === q.id ? "border-[var(--ad-foreground)]" : "border-[var(--ad-border)] hover:border-[var(--ad-border)]"}`}>
                      <QuestionPreview q={q} n={n + 1} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>

        {/* ---- right: settings for the selected element ---- */}
        <aside className="w-[300px] shrink-0 overflow-y-auto border-s border-[var(--ad-border)] bg-[var(--ad-card)] p-4">
          {!question ? (
            <p className="text-sm text-[var(--ad-muted-foreground)]">Select an element to edit it.</p>
          ) : (
            <Settings q={question} onPatch={patchQuestion} onRemove={() => removeQuestion(question.id)} />
          )}
        </aside>
      </div>

      {picker && <ElementPicker onPick={addElement} onClose={() => setPicker(false)} />}
    </div>
  );
}

function Empty({ label, action, onAdd }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--ad-border)] bg-[var(--ad-card)] p-12 text-center">
      <p className="text-sm text-[var(--ad-muted-foreground)]">{label}</p>
      <button type="button" onClick={onAdd} className={`${dark} mt-4`}>{action}</button>
    </div>
  );
}

// ---- how an element looks on the canvas -------------------------------------
function QuestionPreview({ q, n }) {
  const def = byType(q.type);
  return (
    <>
      <p className="flex items-start gap-2">
        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[var(--ad-foreground)] text-[10px] font-700 text-white">{n}</span>
        <span className="font-display text-lg font-600">
          {q.label || def?.label}
          {q.required && <span className="ms-1 text-[var(--ad-destructive)]">*</span>}
        </span>
      </p>
      {q.description && <p className="ms-7 mt-1 text-sm text-[var(--ad-muted-foreground)]">{q.description}</p>}
      <div className="ms-7 mt-4">{renderAnswer(q)}</div>
      <p className="ms-7 mt-3 font-mono text-[10px] uppercase tracking-wide text-[var(--ad-muted-foreground)]">{def?.label}</p>
    </>
  );
}

function renderAnswer(q) {
  const box = "rounded-lg border border-[var(--ad-border)] bg-[var(--ad-muted)] px-3 py-2 text-sm text-[var(--ad-muted-foreground)]";
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  switch (q.type) {
    case "multiple-choice":
    case "picture-choice":
    case "ranking":
    case "legal":
    case "yes-no": {
      const opts = [...(q.options || []), ...(q.other ? ["Other"] : []), ...(q.none ? ["None"] : [])];
      return (
        <div className={q.vertical === false ? "flex flex-wrap gap-2" : "space-y-2"}>
          {opts.map((o, i) => (
            <div key={`${o}-${i}`} className="flex items-start gap-2 rounded-lg border border-[var(--ad-border)] bg-[var(--ad-muted)] px-3 py-2 text-sm">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-[var(--ad-border)] bg-[var(--ad-card)] text-[10px] font-600 text-[var(--ad-muted-foreground)]">
                {letters[i] || "•"}
              </span>
              <span className="min-w-0">
                {o}
                {/* Only when there is one — an empty description leaves no trace. */}
                {q.optionNotes?.[i]?.trim() && (
                  <span className="mt-0.5 block text-xs text-[var(--ad-muted-foreground)]">{q.optionNotes[i]}</span>
                )}
              </span>
            </div>
          ))}
        </div>
      );
    }
    case "dropdown":
      return <div className={`${box} flex items-center justify-between`}>{(q.options || [])[0] || "Choose…"}<span>▾</span></div>;
    case "matrix":
      return (
        <div className="overflow-x-auto">
          <table className="text-sm text-[var(--ad-muted-foreground)]">
            <thead><tr><th /> {(q.columns || []).map((c) => <th key={c} className="px-3 py-1 font-500">{c}</th>)}</tr></thead>
            <tbody>{(q.rows || []).map((r) => (
              <tr key={r}><td className="pe-3 py-1">{r}</td>{(q.columns || []).map((c) => (
                <td key={c} className="px-3 py-1 text-center"><span className="inline-block h-3.5 w-3.5 rounded-full border border-[var(--ad-border)]" /></td>))}</tr>))}
            </tbody>
          </table>
        </div>
      );
    case "nps":
    case "opinion-scale": {
      const min = Number(q.min ?? 0), max = Number(q.max ?? 10);
      const n = Math.max(0, Math.min(11, max - min + 1));
      return (
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: n }, (_, i) => (
            <span key={i} className="inline-flex h-8 w-8 items-center justify-center rounded border border-[var(--ad-border)] bg-[var(--ad-muted)] text-xs text-[var(--ad-muted-foreground)]">{min + i}</span>
          ))}
        </div>
      );
    }
    case "rating":
      return <div className="flex gap-1 text-xl text-[var(--ad-muted-foreground)]">{Array.from({ length: Number(q.max ?? 5) }, (_, i) => <span key={i}>★</span>)}</div>;
    case "long-text":
      return <div className={`${box} h-20`}>{q.placeholder || "Type your answer"}</div>;
    case "checkbox":
      return <div className="flex items-center gap-2 text-sm text-[var(--ad-muted-foreground)]"><span className="inline-block h-4 w-4 rounded border border-[var(--ad-border)]" /> {q.label || "Tick to agree"}</div>;
    case "signature":
      return <div className={`${box} h-16 italic`}>Signature</div>;
    case "file-upload":
      return <div className={`${box} border-dashed text-center`}>Drop a file, or browse</div>;
    case "welcome":
    case "statement":
    case "ending":
      return <span className="inline-flex rounded-lg bg-[var(--ad-foreground)] px-4 py-2 text-sm font-600 text-white">{q.buttonLabel || "Continue"}</span>;
    case "question-group":
      return <div className={`${box} border-dashed`}>Group — elements below belong together</div>;
    case "contact":
      return <div className="grid gap-2 sm:grid-cols-2">{["First name", "Last name", "Email", "Phone"].map((f) => <div key={f} className={box}>{f}</div>)}</div>;
    case "address":
      return <div className="grid gap-2">{["Address", "City", "Country"].map((f) => <div key={f} className={box}>{f}</div>)}</div>;
    default:
      return <div className={box}>{q.placeholder || "Type your answer"}</div>;
  }
}

// ---- the right-hand settings panel -------------------------------------------
function Settings({ q, onPatch, onRemove }) {
  const def = byType(q.type);
  const supports = def?.settings || [];
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xs font-700 uppercase tracking-wide text-[var(--ad-muted-foreground)]">Question</h3>
        <input value={q.label} onChange={(e) => onPatch({ label: e.target.value })} className={`${field} mt-2`} placeholder="Question" />
        <input value={q.description || ""} onChange={(e) => onPatch({ description: e.target.value })} className={`${field} mt-2`} placeholder="Description (optional)" />
      </div>

      <div>
        <h3 className="text-xs font-700 uppercase tracking-wide text-[var(--ad-muted-foreground)]">Answer</h3>
        <p className="mt-2 rounded-lg border border-[var(--ad-border)] bg-[var(--ad-muted)] px-3 py-2 text-sm">{def?.label}</p>
        {/* The type is fixed once chosen: changing it would silently discard the
            options or bounds that belong to the old one. Delete and re-add. */}
      </div>

      {/* What this question BINDS TO. The key is the field its answer is stored
          under — leave it blank and the answer is filed under the question's own
          id, which is fine for a new survey and wrong for one whose answers
          other code already reads. */}
      <div>
        <h3 className="text-xs font-700 uppercase tracking-wide text-[var(--ad-muted-foreground)]">Stored as</h3>
        <input value={q.key || ""} onChange={(e) => onPatch({ key: e.target.value.trim() })}
          className={`${field} mt-2 font-mono text-xs`} placeholder={q.id} />
      </div>

      {hasOptions(q.type) && (
        <div>
          <h3 className="text-xs font-700 uppercase tracking-wide text-[var(--ad-muted-foreground)]">Choices from</h3>
          {/* Some lists are far too long to type and two of them depend on
              another answer, so they are bound rather than authored. */}
          <select value={q.source || ""} onChange={(e) => onPatch({ source: e.target.value })} className={`${field} mt-2`}>
            <option value="">Choices below</option>
            <option value="industries">Industries</option>
            <option value="countries">Countries</option>
            <option value="cities">Cities (follows a country answer)</option>
            <option value="erps">ERP systems</option>
          </select>
          {q.source === "cities" && (
            <input value={q.dependsOn || ""} onChange={(e) => onPatch({ dependsOn: e.target.value.trim() })}
              className={`${field} mt-2 font-mono text-xs`} placeholder="country" />
          )}
          {q.source && <SourcePreview source={q.source} dependsOn={q.dependsOn} />}
        </div>
      )}

      {supports.length > 0 && (
        <div className="space-y-1">
          {supports.map((key) => (
            <label key={key} className="flex cursor-pointer items-center justify-between py-1.5 text-sm">
              {TOGGLES[key]}
              <input type="checkbox" checked={Boolean(q[key === "required" ? "required" : key])}
                onChange={(e) => onPatch({ [key]: e.target.checked })}
                className="h-4 w-8 cursor-pointer appearance-none rounded-full bg-[var(--ad-border)] transition-colors checked:bg-[var(--ad-foreground)]" />
            </label>
          ))}
        </div>
      )}

      {hasOptions(q.type) && !q.source && (
        <OptionEditor
          options={q.options || []}
          values={q.optionValues}
          notes={q.optionNotes}
          // Per-choice descriptions only reach the screen on the types that
          // render choices as CARDS. A chip or a dropdown row has nowhere to put
          // a second line, so offering the field there would be a lie.
          allowNotes={q.type === "multiple-choice" || q.type === "picture-choice"}
          onChange={(next) => onPatch(next)}
        />
      )}

      {(q.type === "nps" || q.type === "opinion-scale" || q.type === "rating" || q.type === "number") && (
        <div className="grid grid-cols-2 gap-2">
          {q.type !== "rating" && (
            <label className="text-xs font-600 uppercase tracking-wide text-[var(--ad-muted-foreground)]">
              Min
              <input type="number" value={q.min ?? ""} onChange={(e) => onPatch({ min: e.target.value === "" ? null : Number(e.target.value) })} className={`${field} mt-1`} />
            </label>
          )}
          <label className="text-xs font-600 uppercase tracking-wide text-[var(--ad-muted-foreground)]">
            Max
            <input type="number" value={q.max ?? ""} onChange={(e) => onPatch({ max: e.target.value === "" ? null : Number(e.target.value) })} className={`${field} mt-1`} />
          </label>
        </div>
      )}

      {"placeholder" in (def?.defaults || {}) && (
        <label className="block text-xs font-600 uppercase tracking-wide text-[var(--ad-muted-foreground)]">
          Placeholder
          <input value={q.placeholder || ""} onChange={(e) => onPatch({ placeholder: e.target.value })} className={`${field} mt-1`} />
        </label>
      )}

      <button type="button" onClick={onRemove} className="w-full rounded-lg border border-[rgb(var(--ad-destructive-rgb)/0.3)] px-3 py-2 text-sm font-600 text-[var(--ad-destructive)] hover:bg-[rgb(var(--ad-destructive-rgb)/0.1)]">
        Delete element
      </button>
    </div>
  );
}

// A bound list, shown rather than merely named. It is read-only: these lists
// are shared by the whole product — the same industries feed a studio's ticket
// form — so editing one here would quietly change it everywhere. Switching
// "Choices from" back to "Choices below" is how you get an editable list.
function SourcePreview({ source, dependsOn }) {
  const [open, setOpen] = useState(false);
  if (source === "cities") {
    return (
      <p className="mt-2 rounded-lg bg-[var(--ad-muted)] px-3 py-2 text-xs text-[var(--ad-muted-foreground)]">
        Follows the <span className="font-mono">{dependsOn || "country"}</span> answer — the cities of whichever
        country was chosen.
      </p>
    );
  }
  const list = SOURCE_LISTS[source] || [];
  return (
    <div className="mt-2 rounded-lg bg-[var(--ad-muted)] px-3 py-2">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-xs font-600 text-[var(--ad-foreground)]">
        {list.length} built-in choices
        <span className="text-[var(--ad-muted-foreground)]">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <ul className="mt-2 max-h-40 space-y-0.5 overflow-y-auto text-xs text-[var(--ad-muted-foreground)]">
          {list.map((o) => <li key={o}>{o}</li>)}
        </ul>
      )}
      <p className="mt-2 text-[11px] leading-snug text-[var(--ad-muted-foreground)]">
        Shared across the product, so read-only here. Switch to “Choices below” to write your own.
      </p>
    </div>
  );
}

function OptionEditor({ options, values, notes, allowNotes, onChange }) {
  const paired = Array.isArray(values);
  const noted = Array.isArray(notes);

  // One place builds the patch, so the parallel arrays can never end up
  // different lengths after an add or a remove.
  const emit = (nextOptions, nextValues, nextNotes) => {
    const patch = { options: nextOptions };
    if (paired) patch.optionValues = nextValues;
    // The notes array only starts existing once something is actually typed
    // into it, and disappears again when every line is emptied — so a question
    // with no descriptions carries no descriptions.
    const cleaned = (nextNotes || []).slice(0, nextOptions.length);
    if (cleaned.some((n) => String(n || "").trim())) patch.optionNotes = cleaned;
    else if (noted) patch.optionNotes = undefined;
    return onChange(patch);
  };

  const at = (arr, i) => (Array.isArray(arr) ? arr[i] ?? "" : "");

  return (
    <div>
      <h3 className="text-xs font-700 uppercase tracking-wide text-[var(--ad-muted-foreground)]">Choices</h3>
      <div className="mt-2 space-y-3">
        {options.map((o, i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <input value={o} className={field} placeholder="Label"
                onChange={(e) => emit(options.map((x, j) => (j === i ? e.target.value : x)), values, notes)} />
              {paired && (
                <input value={at(values, i)} className={`${field} w-24 font-mono text-xs`} placeholder="value"
                  onChange={(e) => emit(options, values.map((x, j) => (j === i ? e.target.value : x)), notes)} />
              )}
              <button type="button" aria-label="Remove choice" className="px-1.5 text-[var(--ad-muted-foreground)] hover:text-[var(--ad-destructive)]"
                onClick={() => emit(
                  options.filter((_, j) => j !== i),
                  paired ? values.filter((_, j) => j !== i) : values,
                  noted ? notes.filter((_, j) => j !== i) : notes,
                )}>×</button>
            </div>
            {allowNotes && (
              <input
                value={at(notes, i)}
                className={`${field} text-xs`}
                placeholder="Description (optional)"
                onChange={(e) => {
                  const base = Array.from({ length: options.length }, (_, j) => at(notes, j));
                  base[i] = e.target.value;
                  emit(options, values, base);
                }}
              />
            )}
          </div>
        ))}
      </div>
      <button type="button" className="mt-2 text-sm font-600 text-[var(--ad-foreground)] underline hover:text-[var(--ad-foreground)]"
        onClick={() => emit(
          [...options, `Choice ${options.length + 1}`],
          paired ? [...values, ""] : values,
          noted ? [...notes, ""] : notes,
        )}>Add choice</button>
    </div>
  );
}

// ---- "Add form elements" ------------------------------------------------------
function ElementPicker({ onPick, onClose }) {
  const [query, setQuery] = useState("");
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const matches = useMemo(() => {
    const s = query.trim().toLowerCase();
    return s ? ELEMENTS.filter((e) => e.label.toLowerCase().includes(s)) : ELEMENTS;
  }, [query]);

  const recommended = ["short-text", "multiple-choice", "long-text"];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgb(var(--ad-foreground-rgb)/0.5)] p-6" role="dialog" aria-modal="true" aria-label="Add form elements">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative my-auto w-full max-w-4xl overflow-hidden rounded-2xl bg-[var(--ad-card)] shadow-2xl">
        <div className="flex items-center gap-3 border-b border-[var(--ad-border)] px-6 py-4">
          <h3 className="text-sm font-700">Add form elements</h3>
          <button type="button" onClick={onClose} aria-label="Close"
            className="ms-auto inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--ad-muted-foreground)] hover:bg-[var(--ad-muted)]">×</button>
        </div>

        <div className="grid gap-6 p-6 md:grid-cols-[200px_1fr]">
          <div>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search form elements" className={field} />
            <h4 className="mt-5 text-xs font-700 uppercase tracking-wide text-[var(--ad-muted-foreground)]">Recommended</h4>
            <div className="mt-2 space-y-1.5">
              {recommended.map((t) => <PickerItem key={t} el={byType(t)} onPick={onPick} />)}
            </div>
          </div>

          <div className="grid max-h-[60vh] gap-x-8 gap-y-6 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
            {GROUPS.map((g) => {
              const items = matches.filter((e) => e.group === g);
              if (items.length === 0) return null;
              return (
                <div key={g}>
                  <h4 className="text-xs font-700 uppercase tracking-wide text-[var(--ad-muted-foreground)]">{g}</h4>
                  <div className="mt-2 space-y-1">
                    {items.map((el) => <PickerItem key={el.type} el={el} onPick={onPick} />)}
                  </div>
                </div>
              );
            })}
            {matches.length === 0 && <p className="text-sm text-[var(--ad-muted-foreground)]">Nothing matches “{query}”.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

const GROUP_TONE = {
  "Contact info": "bg-[rgb(var(--ad-destructive-rgb)/0.14)] text-[var(--ad-destructive)]",
  Choice: "bg-[rgb(var(--ad-primary-rgb)/0.14)] text-[var(--ad-primary)]",
  "Rating & ranking": "bg-[rgb(var(--ad-success-rgb)/0.14)] text-[var(--ad-success)]",
  Text: "bg-[rgb(var(--ad-info-rgb)/0.14)] text-[var(--ad-info)]",
  Other: "bg-[rgb(var(--ad-warning-rgb)/0.14)] text-[var(--ad-warning)]",
  Structure: "bg-[var(--ad-border)] text-[var(--ad-foreground)]",
};

function PickerItem({ el, onPick }) {
  if (!el) return null;
  return (
    <button type="button" onClick={() => onPick(el.type)}
      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-start text-sm transition-colors hover:bg-[var(--ad-muted)]">
      {/* Grouped by colour rather than 25 separate glyphs — the group is what
          tells you where to look, and the label carries the rest. */}
      <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-[10px] font-700 ${GROUP_TONE[el.group] || "bg-[var(--ad-muted)]"}`}>
        {el.label.slice(0, 1)}
      </span>
      {el.label}
    </button>
  );
}
