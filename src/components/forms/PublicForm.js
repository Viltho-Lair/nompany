// A STUDIO'S FORM, AS THE PUBLIC ANSWERS IT (19/09/2026) — and as its author
// previews it. ONE COMPONENT FOR BOTH, the questionnaire's own rule: a second
// "preview renderer" would be a second reading of every branch, free to disagree
// with the real one about exactly what an author opens a preview to check.
//
// The branching is modules/marketing/formsFlow's and the checks are
// modules/marketing/formsModel's — both pure, and both what the server applies
// again on arrival — so this page refuses what the server would refuse, and
// says why beside the question rather than after a round trip.
//
// BACK IS A STACK, NOT AN INDEX (20/09/2026). Once an answer can send somebody
// past three pages, "the page before this one" is a fact about where they have
// BEEN, and the list of pages is no longer it. Walking the path forward from
// the start would agree with the stack most of the time and disagree exactly
// when it matters — after somebody goes back and changes the answer that did
// the jumping.
//
// It wears no studio chrome and no nompany marketing: it is the studio's form,
// with the studio's name and logo at the top.
"use client";
import { useCallback, useMemo, useState } from "react";
import SelectMenu from "@/components/fields/SelectMenu";
import { askedOn, isLastPage, nextPageId } from "@/modules/marketing/formsFlow";
import { answerProblem, takesAnswer, gridField, isGrid } from "@/modules/marketing/formsModel";
import { publicFormDict } from "@/shared/forms";

const INPUT = "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/15 dark:bg-[#15151c] dark:text-white";
const CHOICE = "rounded-xl border px-4 py-2.5 text-start text-[15px] transition-colors";
const ON = "border-indigo-500 bg-indigo-50 text-indigo-900 dark:bg-indigo-500/15 dark:text-white";
const OFF = "border-slate-300 text-slate-700 hover:border-indigo-400 dark:border-white/15 dark:text-slate-200";
const OTHER = "__other__";
const ICONS = { star: ["★", "☆"], heart: ["♥", "♡"], thumb: ["👍", "👍"] };

export default function PublicForm({ form, onSubmit, onUpload, preview = false }) {
  const tr = publicFormDict(form.locale);
  const pages = useMemo(() => form.pages || [], [form.pages]);
  const [answers, setAnswers] = useState({});
  // The pages this person has actually been through, oldest first; the last is
  // where they are. Empty means "the first page", so a form with no answers yet
  // needs no special case.
  const [stack, setStack] = useState([]);
  const [fileNames, setFileNames] = useState({});
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [trap, setTrap] = useState("");

  const current = useMemo(
    () => pages.find((p) => p.id === stack[stack.length - 1]) || pages[0] || null,
    [pages, stack],
  );
  const asked = useMemo(() => (current ? askedOn(current, pages, answers) : []), [current, pages, answers]);
  const last = current ? isLastPage(current, pages, answers) : true;

  const set = useCallback((id, value) => {
    setAnswers((a) => ({ ...a, [id]: value }));
    setErrors((e) => ({ ...e, [id]: "" }));
  }, []);

  // THE PAGE'S OWN CHECK before moving on, the same function the server runs.
  // "OTHER" CHOSEN WITH NOTHING TYPED is no answer yet, not the word "__other__".
  const clean = () => Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, v === OTHER ? "" : v]));
  const check = () => {
    const problem = answerProblem(asked, clean());
    if (!problem) return true;
    setErrors({ [problem.questionId]: problem.error });
    return false;
  };

  const next = () => {
    if (!check()) return;
    const to = nextPageId(current, pages, clean());
    if (!to || to === "submit" || !pages.some((p) => p.id === to)) return;
    setStack((s) => [...(s.length ? s : [current.id]), to]);
    setError("");
  };
  const back = () => setStack((s) => s.slice(0, -1));

  const send = async () => {
    if (!check()) return;
    setBusy(true); setError("");
    const out = await onSubmit({ answers: clean(), website2: trap }).catch(() => ({ ok: false, error: "failed" }));
    setBusy(false);
    if (out?.ok) { setDone(out.confirmation || tr.thanks); return; }
    if (out?.questionId) setErrors({ [out.questionId]: out.error });
    else setError(tr.errors[out?.error] || tr.errors.failed);
  };

  const again = () => { setAnswers({}); setStack([]); setDone(null); setErrors({}); setFileNames({}); };

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
            {/* HOW FAR IN, NOT HOW FAR TO GO. A jump means the number of pages
                left is not known until the answers are in, so "page 2 of 5"
                would be a guess that changes under somebody mid-form. */}
            {pages.length > 1 && <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{tr.step(Math.max(1, stack.length))}</p>}
            {current.title && <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{current.title}</h2>}
            {current.lead && <p className="mt-1 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">{current.lead}</p>}

            <div className="mt-6 space-y-6">
              {asked.map((q) => (
                <Question key={q.id} q={q} answers={answers} onChange={set} preview={preview}
                  onUpload={onUpload} fileNames={fileNames} setFileNames={setFileNames}
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
              {stack.length > 1
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

function Question({ q, answers, onChange, error, tr, preview, onUpload, fileNames, setFileNames }) {
  const id = `q-${q.id}`;
  return (
    <div>
      {q.type !== "legal" && (
        <label htmlFor={id} className="block text-[15px] font-semibold text-slate-900 dark:text-white">
          {q.label}
          {q.required && takesAnswer(q.type) && <span className="ms-1 text-rose-500" aria-label={tr.required}>*</span>}
        </label>
      )}
      {q.description && <p className="mt-0.5 whitespace-pre-line text-sm text-slate-500 dark:text-slate-400">{q.description}</p>}
      {/* The author's picture, served by the media route like every other file
          this product hands out — never a URL somebody pasted. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {q.image && <img src={`/api/media/${q.image}`} alt="" className="mt-3 max-h-72 w-auto rounded-xl border border-slate-200 dark:border-white/10" />}
      <div className="mt-2">
        {isGrid(q.type)
          ? <Grid q={q} answers={answers} onChange={onChange} tr={tr} />
          : q.type === "file"
            ? <Files q={q} value={answers[q.id]} onChange={(v) => onChange(q.id, v)} tr={tr}
                preview={preview} onUpload={onUpload} fileNames={fileNames} setFileNames={setFileNames} />
            : control(q, answers[q.id], (v) => onChange(q.id, v), id, tr)}
      </div>
      {error && <p role="alert" className="mt-1.5 text-sm text-rose-600 dark:text-rose-300">{error}</p>}
    </div>
  );
}

/**
 * A GRID IS A TABLE ON A SCREEN AND A LIST ON A PHONE, and that is not a
 * styling preference: five columns of radio buttons at 375 pixels is either a
 * horizontal scroll or a row of targets too small to hit. Each row is its own
 * answer either way (`gridField`), so the two layouts write identical answers.
 */
function Grid({ q, answers, onChange, tr }) {
  const rows = q.rows || [];
  const columns = q.columns || [];
  const multi = q.type === "grid-multi";
  const valueOf = (i) => answers[gridField(q.id, i)];
  const toggle = (i, column) => {
    const field = gridField(q.id, i);
    if (!multi) { onChange(field, valueOf(i) === column ? "" : column); return; }
    const picked = Array.isArray(valueOf(i)) ? valueOf(i) : [];
    onChange(field, picked.includes(column) ? picked.filter((c) => c !== column) : [...picked, column]);
  };
  const on = (i, column) => {
    const v = valueOf(i);
    return multi ? Array.isArray(v) && v.includes(column) : v === column;
  };
  return (
    <>
      <table className="hidden w-full text-sm sm:table">
        <thead>
          <tr>
            <th className="w-1/3" />
            {columns.map((c) => (
              <th key={c} scope="col" className="px-2 pb-2 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row} className="border-t border-slate-100 dark:border-white/5">
              <th scope="row" className="py-2 pe-3 text-start font-medium text-slate-800 dark:text-slate-100">{row}</th>
              {columns.map((c) => (
                <td key={c} className="px-2 py-2 text-center">
                  <input type={multi ? "checkbox" : "radio"} name={`${q.id}-${i}`} checked={on(i, c)}
                    aria-label={`${row} — ${c}`} onChange={() => toggle(i, c)}
                    className="h-4 w-4 accent-indigo-600" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="space-y-3 sm:hidden">
        {rows.map((row, i) => (
          <div key={row} className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
            <p className="mb-2 text-sm font-medium text-slate-800 dark:text-slate-100">{row}</p>
            <div className="flex flex-wrap gap-2" role={multi ? "group" : "radiogroup"}>
              {columns.map((c) => (
                <button key={c} type="button" role={multi ? "checkbox" : "radio"} aria-checked={on(i, c)}
                  onClick={() => toggle(i, c)} className={`${CHOICE} py-1.5 text-sm ${on(i, c) ? ON : OFF}`}>{c}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {q.requireEachRow && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{tr.everyRow}</p>}
    </>
  );
}

/**
 * FILES GO UP AS THEY ARE CHOSEN, not when the form is sent. Holding them until
 * the end would mean a person who filled in nine questions and picked a 4 MB
 * file finds out at the last button that the form is full — and the answer
 * carries media ids, so the upload has to have happened before there is
 * anything to store.
 */
function Files({ q, value, onChange, tr, preview, onUpload, fileNames, setFileNames }) {
  const ids = Array.isArray(value) ? value : [];
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const max = q.maxFiles || 1;
  const full = ids.length >= max;

  const pick = async (list) => {
    setProblem("");
    const chosen = Array.from(list || []).slice(0, max - ids.length);
    if (!chosen.length) return;
    setBusy(true);
    const kept = [...ids];
    for (const file of chosen) {
      if (file.size > (q.maxFileMb || 1) * 1024 * 1024) { setProblem(tr.errors["too-large"]); continue; }
      const out = await onUpload?.(q.id, file).catch(() => ({ error: "failed" }));
      if (out?.id) { kept.push(out.id); setFileNames((n) => ({ ...n, [out.id]: out.name || file.name })); }
      else setProblem(tr.errors[out?.error] || tr.errors.failed);
    }
    setBusy(false);
    onChange(kept);
  };

  return (
    <div>
      <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">{tr.fileHint(max, q.maxFileMb || 1, q.fileKinds || [])}</p>
      {ids.map((mediaId) => (
        <div key={mediaId} className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-white/10">
          <span className="min-w-0 flex-1 truncate text-slate-800 dark:text-slate-100">{fileNames[mediaId] || tr.file}</span>
          <button type="button" className="text-xs font-semibold text-rose-600 hover:underline dark:text-rose-300"
            onClick={() => onChange(ids.filter((x) => x !== mediaId))}>{tr.removeFile}</button>
        </div>
      ))}
      {!full && (
        <label className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed px-4 py-2.5 text-sm font-semibold ${
          busy ? "border-slate-200 text-slate-400" : "border-slate-300 text-slate-700 hover:border-indigo-400 dark:border-white/15 dark:text-slate-200"}`}>
          <input type="file" className="hidden" multiple={max > 1} disabled={busy || preview}
            onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />
          {busy ? tr.uploading : preview ? tr.previewNoUpload : tr.addFile}
        </label>
      )}
      {problem && <p role="alert" className="mt-1.5 text-sm text-rose-600 dark:text-rose-300">{problem}</p>}
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
    case "short-text": case "email": case "phone": case "website": case "number":
    case "date": case "time": case "datetime": {
      const type = {
        email: "email", phone: "tel", website: "url", number: "number",
        date: "date", time: "time", datetime: "datetime-local",
      }[q.type] || "text";
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
      const [full, empty] = ICONS[q.icon] || ICONS.star;
      const steps = [];
      for (let i = min; i <= max; i += 1) steps.push(i);
      return (
        <div>
          <div className="flex flex-wrap gap-1.5" role="radiogroup">
            {steps.map((n) => (
              <button key={n} type="button" role="radio" aria-checked={Number(value) === n} onClick={() => onChange(n)}
                aria-label={String(n)}
                className={`h-10 min-w-10 rounded-lg border px-2 text-sm font-semibold transition-colors ${
                  q.type === "rating" ? (Number(value) >= n ? ON : OFF) : Number(value) === n ? ON : OFF}`}>
                {q.type === "rating" ? (Number(value) >= n ? full : empty) : n}
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
