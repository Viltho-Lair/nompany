// A STUDIO'S FORM, AS THE PUBLIC ANSWERS IT (19/09/2026) — and as its author
// previews it. ONE COMPONENT FOR BOTH, the questionnaire's own rule: a second
// "preview renderer" would be a second reading of every branch, free to disagree
// with the real one about exactly what an author opens a preview to check.
//
// The branching is lib/questionnaireLogic's and the checks are
// modules/marketing/formsModel's — both pure, and both what the server applies
// again on arrival — so this page refuses what the server would refuse, and
// says why beside the question rather than after a round trip.
//
// It wears no studio chrome and no nompany marketing: it is the studio's form,
// with the studio's name and logo at the top.
"use client";
import { useMemo, useState } from "react";
import SelectMenu from "@/components/fields/SelectMenu";
import { visiblePages, visibleQuestions } from "@/lib/questionnaireLogic";
import { answerProblem, takesAnswer } from "@/modules/marketing/formsModel";
import { publicFormDict } from "@/shared/forms";

const INPUT = "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/15 dark:bg-[#15151c] dark:text-white";
const CHOICE = "rounded-xl border px-4 py-2.5 text-start text-[15px] transition-colors";
const ON = "border-indigo-500 bg-indigo-50 text-indigo-900 dark:bg-indigo-500/15 dark:text-white";
const OFF = "border-slate-300 text-slate-700 hover:border-indigo-400 dark:border-white/15 dark:text-slate-200";
const OTHER = "__other__";

export default function PublicForm({ form, onSubmit, preview = false }) {
  const tr = publicFormDict(form.locale);
  const pages = useMemo(() => form.pages || [], [form.pages]);
  const [answers, setAnswers] = useState({});
  const [pageId, setPageId] = useState("");
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [trap, setTrap] = useState("");

  // THE PAGES THIS PERSON'S ANSWERS LEAD THROUGH, by id rather than index —
  // an answer that reveals or hides a page must not move somebody elsewhere.
  const live = useMemo(() => visiblePages(pages, answers), [pages, answers]);
  const index = Math.max(0, live.findIndex((p) => p.id === pageId));
  const current = live[index] || live[0] || null;
  const asked = useMemo(() => (current ? visibleQuestions(current, pages, answers) : []), [current, pages, answers]);
  const last = index >= live.length - 1;

  const set = (id, value) => {
    setAnswers((a) => ({ ...a, [id]: value }));
    setErrors((e) => ({ ...e, [id]: "" }));
  };

  // THE PAGE'S OWN CHECK before moving on, the same function the server runs.
  // "OTHER" CHOSEN WITH NOTHING TYPED is no answer yet, not the word "__other__".
  const clean = () => Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, v === OTHER ? "" : v]));
  const check = () => {
    const problem = answerProblem(asked, clean());
    if (!problem) return true;
    setErrors({ [problem.questionId]: problem.error });
    return false;
  };

  const next = () => { if (check()) { setPageId(live[index + 1]?.id || ""); setError(""); } };
  const back = () => setPageId(live[index - 1]?.id || "");

  const send = async () => {
    if (!check()) return;
    setBusy(true); setError("");
    const out = await onSubmit({ answers: clean(), website2: trap }).catch(() => ({ ok: false, error: "failed" }));
    setBusy(false);
    if (out?.ok) { setDone(out.confirmation || tr.thanks); return; }
    if (out?.questionId) setErrors({ [out.questionId]: out.error });
    else setError(tr.errors[out?.error] || tr.errors.failed);
  };

  const again = () => { setAnswers({}); setPageId(""); setDone(null); setErrors({}); };

  return (
    <div dir={form.locale === "ar" ? "rtl" : "ltr"} lang={form.locale}
      className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      {preview && (
        <p className="mb-4 rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">{tr.preview}</p>
      )}
      <header className="mb-6 flex items-center gap-3">
        {/* The studio's own uploaded logo, already sized; next/image would add a
            loader and nothing a 40-pixel mark needs. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {form.studio?.logo && <img src={form.studio.logo} alt="" className="h-10 w-10 rounded-lg object-contain" />}
        <div className="min-w-0">
          {form.studio?.name && <p className="text-sm text-slate-500 dark:text-slate-400">{form.studio.name}</p>}
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{form.name}</h1>
        </div>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#1c1c25] sm:p-8">
        {!form.accepting && !preview ? (
          <div className="py-6 text-center">
            <p className="text-lg font-semibold text-slate-900 dark:text-white">{tr.closed}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tr.closedBody}</p>
          </div>
        ) : done !== null ? (
          <div className="py-6 text-center">
            <p className="whitespace-pre-line text-lg font-semibold text-slate-900 dark:text-white">{done}</p>
            <button type="button" onClick={again} className="mt-5 text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-300">{tr.again}</button>
          </div>
        ) : !current ? null : (
          <>
            {live.length > 1 && <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{tr.pageOf(index + 1, live.length)}</p>}
            {current.title && <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{current.title}</h2>}
            {current.lead && <p className="mt-1 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">{current.lead}</p>}

            <div className="mt-6 space-y-6">
              {asked.map((q) => (
                <Question key={q.id} q={q} value={answers[q.id]} onChange={(v) => set(q.id, v)}
                  error={errors[q.id] ? tr.errors[errors[q.id]] || tr.errors.required : ""} tr={tr} />
              ))}
            </div>

            {/* A FIELD NOBODY SEES. A person never fills it in; a bot that fills
                in everything does, and is thanked without anything being kept. */}
            <input type="text" name="website2" tabIndex={-1} autoComplete="off" aria-hidden="true"
              value={trap} onChange={(e) => setTrap(e.target.value)}
              className="absolute -start-[9999px] h-0 w-0 opacity-0" />

            {error && <p role="alert" className="mt-6 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

            <div className="mt-8 flex items-center justify-between gap-3">
              {index > 0
                ? <button type="button" onClick={back} className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5">{tr.back}</button>
                : <span />}
              {last
                ? <button type="button" onClick={send} disabled={busy} className="rounded-full bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">{busy ? tr.sending : tr.send}</button>
                : <button type="button" onClick={next} className="rounded-full bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">{tr.next}</button>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Question({ q, value, onChange, error, tr }) {
  const id = `q-${q.id}`;
  const heading = (
    <>
      {q.type !== "legal" && (
        <label htmlFor={id} className="block text-[15px] font-semibold text-slate-900 dark:text-white">
          {q.label}
          {q.required && takesAnswer(q.type) && <span className="ms-1 text-rose-500" aria-label={tr.required}>*</span>}
        </label>
      )}
      {q.description && <p className="mt-0.5 whitespace-pre-line text-sm text-slate-500 dark:text-slate-400">{q.description}</p>}
    </>
  );
  return (
    <div>
      {heading}
      <div className="mt-2">{control(q, value, onChange, id, tr)}</div>
      {error && <p role="alert" className="mt-1.5 text-sm text-rose-600 dark:text-rose-300">{error}</p>}
    </div>
  );
}

function control(q, value, onChange, id, tr) {
  const options = q.options || [];
  switch (q.type) {
    case "statement":
      return null;
    case "long-text":
      return <textarea id={id} rows={4} className={INPUT} value={value || ""} placeholder={q.placeholder || ""} onChange={(e) => onChange(e.target.value)} />;
    case "short-text": case "email": case "phone": case "website": case "number": case "date": {
      const type = { email: "email", phone: "tel", website: "url", number: "number", date: "date" }[q.type] || "text";
      const ltr = ["email", "phone", "website", "number"].includes(q.type);
      return <input id={id} type={type} dir={ltr ? "ltr" : undefined} className={INPUT} value={value ?? ""}
        placeholder={q.placeholder || ""} autoComplete={{ email: "email", phone: "tel" }[q.type] || "off"}
        onChange={(e) => onChange(q.type === "number" && e.target.value !== "" ? Number(e.target.value) : e.target.value)} />;
    }
    case "dropdown":
      return <SelectMenu id={id} value={value || ""} onChange={onChange} placeholder={tr.pick} className={INPUT}
        options={options.map((o) => ({ value: o, label: o }))} />;
    case "yes-no":
      return (
        <div className="flex gap-3" role="radiogroup">
          {options.map((o) => (
            <button key={o} type="button" role="radio" aria-checked={value === o} onClick={() => onChange(o)}
              className={`${CHOICE} min-w-24 ${value === o ? ON : OFF}`}>{o}</button>
          ))}
        </div>
      );
    case "legal": {
      const agree = options[0] || "";
      const on = value === agree;
      return (
        <label className="flex cursor-pointer items-start gap-3 text-[15px] text-slate-800 dark:text-slate-100">
          <input id={id} type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked ? agree : "")}
            className="mt-1 h-4 w-4 accent-indigo-600" />
          <span>
            <span className="whitespace-pre-line">{q.label}</span>
            {q.required && <span className="ms-1 text-rose-500">*</span>}
            {agree && <span className="mt-0.5 block text-sm text-slate-500 dark:text-slate-400">{agree}</span>}
          </span>
        </label>
      );
    }
    case "multiple-choice": {
      if (q.multiple) {
        const picked = Array.isArray(value) ? value : [];
        const toggle = (o) => onChange(picked.includes(o) ? picked.filter((x) => x !== o) : [...picked, o]);
        return (
          <div className="flex flex-col gap-2">
            {options.map((o) => (
              <button key={o} type="button" role="checkbox" aria-checked={picked.includes(o)} onClick={() => toggle(o)}
                className={`${CHOICE} ${picked.includes(o) ? ON : OFF}`}>{o}</button>
            ))}
          </div>
        );
      }
      const otherOn = q.other && value !== undefined && value !== "" && !options.includes(value);
      return (
        <div className="flex flex-col gap-2" role="radiogroup">
          {options.map((o) => (
            <button key={o} type="button" role="radio" aria-checked={value === o} onClick={() => onChange(o)}
              className={`${CHOICE} ${value === o ? ON : OFF}`}>{o}</button>
          ))}
          {q.other && (
            <button type="button" role="radio" aria-checked={otherOn} onClick={() => onChange(OTHER)}
              className={`${CHOICE} ${otherOn ? ON : OFF}`}>{tr.other}</button>
          )}
          {otherOn && (
            <input autoFocus className={INPUT} value={value === OTHER ? "" : value}
              onChange={(e) => onChange(e.target.value || OTHER)} />
          )}
        </div>
      );
    }
    case "rating": case "opinion-scale": case "nps": {
      const min = Number(q.min ?? (q.type === "nps" ? 0 : 1));
      const max = Number(q.max ?? (q.type === "nps" ? 10 : 5));
      const steps = [];
      for (let i = min; i <= max; i += 1) steps.push(i);
      return (
        <div>
          <div className="flex flex-wrap gap-1.5" role="radiogroup">
            {steps.map((n) => (
              <button key={n} type="button" role="radio" aria-checked={Number(value) === n} onClick={() => onChange(n)}
                className={`h-10 min-w-10 rounded-lg border px-2 text-sm font-semibold transition-colors ${
                  q.type === "rating" ? (Number(value) >= n ? ON : OFF) : Number(value) === n ? ON : OFF}`}>
                {q.type === "rating" ? "★" : n}
              </button>
            ))}
          </div>
          {(q.minLabel || q.maxLabel) && (
            <div className="mt-1.5 flex justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{q.minLabel}</span><span>{q.maxLabel}</span>
            </div>
          )}
        </div>
      );
    }
    default:
      return null;
  }
}
