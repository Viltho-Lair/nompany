"use client";

import { useMemo, useState } from "react";
import Combo from "@/components/studio2/Combo";
import { AiAssistant } from "@/components/landing/mascot/AiAssistant";
import { PointerProvider } from "@/components/landing/providers/PointerProvider";
import { LogoMark, Wordmark } from "@/components/landing/Logo";
import { INDUSTRIES } from "@/lib/industries";
import { COUNTRIES } from "@/lib/countries";
import { citiesFor } from "@/lib/cities";
import {
  AVERAGE_MINUTES, ERP_NONE, ERP_OTHER, ERP_SYSTEMS,
  fieldOf, isPageComplete, packageLabel,
} from "@/lib/questionnaire";

// The one-time survey between finishing registration and reaching the account.
//
// A FIXED, NON-SCROLLING SCREEN. The whole thing is one viewport tall and the
// page itself never scrolls: header, question area and footer are the three
// rows of a flex column, and only the question area may scroll INSIDE itself
// when a list is long. A survey that scrolls hides how much is left, which is
// the one thing the progress bar exists to tell you.
//
// The layout follows the wireframe exactly: logo top-left, title and lead top-
// centre, who you signed up as top-right, questions dead centre, Nova bottom-
// right with a speech bubble above her, and the timing + progress row along the
// bottom with its two arrows.
//
// It wears the LANDING design, not the studio's, because this is still the
// public side of the product — and it uses the landing's own themed component
// classes (.card, .field-input, .btn-primary), so light, dark and system all
// follow the visitor's saved choice with no work here.

const FIELD = "field-input w-full pe-9 text-sm";

// The option lists a question's `source` names. /super will eventually serve
// these alongside the questions; until then they come from the same modules the
// rest of the app uses.
function optionsFor(question, answers) {
  switch (question.source) {
    case "industries": return INDUSTRIES;
    case "countries": return COUNTRIES.map((c) => c.name);
    // Cities follow whichever question the author bound this one to.
    case "cities": return citiesFor(nameToCode(answers[question.dependsOn || "country"]));
    case "erps": return ERP_SYSTEMS;
    default: return question.options || [];
  }
}
// citiesFor() keys on the ISO code, while the visible answer is a country NAME.
const nameToCode = (name) =>
  COUNTRIES.find((c) => c.name === name)?.code || "";

export default function QuestionnaireFlow({ locale, initialPackage = "", email = "", pages = [], questionnaireId = "" }) {
  const [page, setPage] = useState(0);
  // The furthest page reached, so a page with nothing mandatory on it counts
  // once it has actually been shown rather than from the moment the survey
  // opens. Without this the bar starts part-full, which makes it a liar.
  const [furthest, setFurthest] = useState(0);
  const [answers, setAnswers] = useState({ intent: "", field: "", country: "", city: "", erps: [], otherErp: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const current = pages[page];
  const total = pages.length;
  const first = page === 0;
  const last = page === total - 1;
  const canAdvance = isPageComplete(current, answers);

  const set = (patch) => setAnswers((a) => ({ ...a, ...patch }));
  const goNext = () => setPage((p) => {
    const nextPage = Math.min(total - 1, p + 1);
    setFurthest((f) => Math.max(f, nextPage));
    return nextPage;
  });

  // A questionnaire authored with no pages yet must not take the screen down.
  if (!current) {
    return (
      <div className="landing-page flex h-screen items-center justify-center px-6 text-center">
        <p className="text-sm text-fg-muted">This questionnaire has no questions yet.</p>
      </div>
    );
  }

  async function submit() {
    setSaving(true); setError("");
    // The stored questionnaire has no field for the "Not Listed" free text, so
    // it is folded into the ERP list as "Not Listed: <what they typed>" — the
    // same way it has always been saved. Sending it as its own key would look
    // like it worked and be dropped by the API's whitelist.
    const erps = answers.erps.includes(ERP_OTHER) && answers.otherErp.trim()
      ? [...answers.erps.filter((e) => e !== ERP_OTHER), `${ERP_OTHER}: ${answers.otherErp.trim()}`]
      : answers.erps;
    try {
      const res = await fetch("/api/identity/questionnaire", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...answers, erps, packageKey: initialPackage }),
      });
      if (res.ok) { window.location.assign(`/${locale}/account`); return; }
      setError("We couldn't save your answers. Try again.");
    } catch {
      setError("Something went wrong. Try again.");
    }
    setSaving(false);
  }

  // Progress reflects PAGES DONE, not the page you happen to be looking at, so
  // stepping back to check an answer doesn't make the bar retreat. A page only
  // counts once it has been reached: a page whose questions are all optional is
  // "complete" the instant the survey loads, and crediting that before it has
  // been seen would show progress nobody has made.
  const done = pages.filter((p, i) => i <= furthest && isPageComplete(p, answers)).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <PointerProvider>
      <div className="landing-page flex h-screen flex-col overflow-hidden">
        {/* ---- top row: logo · title · who you are ---- */}
        <header className="grid shrink-0 grid-cols-2 items-start gap-4 px-5 py-5 sm:px-8 lg:grid-cols-[1fr_auto_1fr]">
          <a href={`/${locale}`} className="flex items-center gap-2.5 justify-self-start">
            <LogoMark size={34} />
            <Wordmark className="hidden text-lg sm:block" />
          </a>

          {/* On narrow screens the title drops below the logo row rather than
              fighting it for width. */}
          <div className="order-last col-span-2 text-center lg:order-none lg:col-span-1">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-fg sm:text-3xl">Questionnaire</h1>
            <p className="mt-1 text-sm text-fg-muted">Don&apos;t worry, it won&apos;t take long.</p>
          </div>

          <div className="justify-self-end text-end">
            <p className="max-w-[46vw] truncate text-sm font-500 text-fg sm:max-w-none">{email || "Signed in"}</p>
            <p className="mt-0.5 text-xs text-fg-muted">
              {/* Everyone starts on Free unless they arrived from a paid plan. */}
              {packageLabel(initialPackage, locale) || "Free"}
            </p>
          </div>
        </header>

        {/* ---- middle: the questions ---- */}
        <main className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-5 sm:px-8">
          <div className="flex max-h-full w-full max-w-3xl flex-col">
            {current.title && (
              <div className="shrink-0 text-center">
                <h2 className="font-display text-xl font-semibold text-fg sm:text-2xl">{current.title}</h2>
                {current.lead && <p className="mx-auto mt-1.5 max-w-xl text-sm text-fg-muted">{current.lead}</p>}
              </div>
            )}

            {/* The ONLY scrollable region on the screen: a long option list
                scrolls here rather than growing the page. */}
            <div className="card mt-4 min-h-0 flex-1 overflow-y-auto">
              <div className="space-y-5">
                {current.questions.map((q) => (
                  <Question key={q.id} question={q} answers={answers} set={set} />
                ))}
              </div>
            </div>

            {error && <p className="mt-3 shrink-0 text-center text-sm text-rose-500">{error}</p>}

            {/* The end of the survey is the END of the survey: submit appears on
                the last page, once that page is answered. Because forward is
                gated the same way, being here at all means every page before it
                is answered too. */}
            <div className="mt-4 flex h-11 shrink-0 items-center justify-center">
              {last && canAdvance ? (
                <button type="button" onClick={submit} disabled={saving} className="btn-primary disabled:opacity-60">
                  {saving ? "Saving…" : "Complete and continue"}
                </button>
              ) : (
                <p className="text-xs text-fg-dim">
                  {!canAdvance
                    ? "Answer the required questions to continue."
                    : "Answered — carry on to the next page."}
                </p>
              )}
            </div>
          </div>

          <NovaCorner hint={current.hint} />
        </main>

        {/* ---- bottom: how long, and where you are ---- */}
        <footer className="shrink-0 px-5 pb-6 sm:px-8">
          <p className="text-center text-xs text-fg-dim">Average completion time: {AVERAGE_MINUTES} mins~</p>
          <div className="mx-auto mt-2 flex w-full max-w-xl items-center gap-2">
            <Arrow dir="prev" disabled={first} onClick={() => setPage((p) => Math.max(0, p - 1))} />
            <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-line-soft">
              <div className="h-full rounded-full bg-gradient-to-r from-iris to-violet transition-[width] duration-500"
                style={{ width: `${pct}%` }} />
            </div>
            {/* Forward is earned: the page you are on has to be answered before
                it opens. Back is always free — checking what you put earlier is
                not a reason to be trapped. */}
            <Arrow dir="next" disabled={last || !canAdvance} onClick={goNext} />
          </div>
          <p className="mt-1.5 text-center text-[11px] text-fg-dim">Page {page + 1} of {total}</p>
        </footer>
      </div>
    </PointerProvider>
  );
}

// ---- the arrows either side of the bar --------------------------------------
// Disabled at each end rather than hidden, so the control keeps its shape and
// the bar never shifts sideways between pages.
function Arrow({ dir, disabled, onClick }) {
  const back = dir === "prev";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={back ? "Previous page" : "Next page"}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-fg-muted transition-colors hover:border-iris hover:text-fg disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-line disabled:hover:text-fg-muted"
    >
      <svg viewBox="0 0 24 24" className={`h-4 w-4 ${back ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m9 6 6 6-6 6" />
      </svg>
    </button>
  );
}

// ---- Nova, bottom right ------------------------------------------------------
// Hidden below `xl`: she is company, not content, and on a screen this height
// she would otherwise crowd the questions she is meant to be helping with.
function NovaCorner({ hint }) {
  if (!hint) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute bottom-0 end-0 hidden items-end xl:flex">
      <div className="relative">
        {/* Speech bubble, above her head, with a tail pointing down at her. */}
        <div className="surface absolute -top-2 end-16 w-60 rounded-2xl rounded-br-sm p-3.5 text-sm leading-snug text-fg-muted shadow-lg">
          {hint}
          <span className="absolute -bottom-1.5 end-6 h-3 w-3 rotate-45 border-b border-e border-line bg-[var(--color-ink-card)]" />
        </div>
        <div className="translate-y-6">
          <AiAssistant size={190} />
        </div>
      </div>
    </div>
  );
}

// ---- one question ------------------------------------------------------------
function Question({ question, answers, set }) {
  const options = useMemo(() => optionsFor(question, answers), [question, answers]);
  const key = fieldOf(question);
  const value = answers[key];

  if (question.type === "multiple-choice" && !question.multiple) {
    return (
      <Field question={question}>
        <div className="grid gap-3 sm:grid-cols-2">
          {(question.options || []).map((label, i) => {
            // What gets STORED can differ from what is shown — see optionValues.
            const v = question.optionValues?.[i] ?? label;
            return (
            <button
              key={label}
              type="button"
              onClick={() => set({ [key]: v })}
              aria-pressed={value === v}
              className={`rounded-xl border p-4 text-start transition-colors ${
                value === v
                  ? "border-iris bg-iris/10"
                  : "border-line hover:border-iris/50"
              }`}
            >
              <span className="block font-display text-base font-semibold text-fg">{label}</span>
              {question.optionNotes?.[i] && (
                <span className="mt-1 block text-sm leading-relaxed text-fg-muted">{question.optionNotes[i]}</span>
              )}
            </button>);
          })}
        </div>
      </Field>
    );
  }

  if (question.type === "dropdown") {
    // A dependent question stays put but goes quiet until its parent is answered
    // — removing it would make the page jump as you fill the one above.
    const blocked = question.dependsOn && !answers[question.dependsOn];
    return (
      <Field question={question}>
        <Combo
          value={value || ""}
          disabled={Boolean(blocked)}
          options={options}
          placeholder={blocked ? `Choose a ${question.dependsOn} first` : (question.placeholder || "")}
          inputClassName={FIELD}
          paperClassName="mt-1 card !p-0 overflow-hidden"
          onChange={(v) => set({ [key]: v, ...Object.fromEntries((question.resets || []).map((k) => [k, ""])) })}
        />
      </Field>
    );
  }

  if (question.type === "multiple-choice" && question.multiple) {
    return <MultiSelect question={question} options={options} answers={answers} set={set} />;
  }
  if (["short-text", "email", "long-text", "number", "date", "website", "phone"].includes(question.type)) {
    const Tag = question.type === "long-text" ? "textarea" : "input";
    const inputType = question.type === "number" ? "number" : question.type === "date" ? "date"
      : question.type === "email" ? "email" : "text";
    return (
      <Field question={question}>
        <Tag
          {...(Tag === "input" ? { type: inputType } : { rows: 3 })}
          value={value || ""}
          onChange={(e) => set({ [key]: e.target.value })}
          placeholder={question.placeholder || ""}
          className={FIELD}
        />
      </Field>
    );
  }
  // An element the builder can add but this screen does not render yet. Saying
  // so beats a blank space that looks like a bug.
  return (
    <Field question={question}>
      <p className="rounded-xl border border-dashed border-line px-3 py-2 text-sm text-fg-dim">
        “{question.type}” isn&apos;t supported on this screen yet.
      </p>
    </Field>
  );
}

function Field({ question, children }) {
  return (
    <div>
      {question.label && <label className="field-label">{question.label}</label>}
      {children}
    </div>
  );
}

// ---- multi-select with a search box ------------------------------------------
// "None" is exclusive: choosing it clears the rest, and choosing anything else
// clears it. Saying you run no ERP and then naming one is not an answer.
function MultiSelect({ question, options, answers, set }) {
  const [query, setQuery] = useState("");
  const key = fieldOf(question);
  const picked = Array.isArray(answers[key]) ? answers[key] : [];

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => String(o).toLowerCase().includes(q));
  }, [options, query]);

  function toggle(option) {
    const has = picked.includes(option);
    let next;
    if (option === ERP_NONE) next = has ? [] : [ERP_NONE];
    else {
      next = has ? picked.filter((p) => p !== option) : [...picked.filter((p) => p !== ERP_NONE), option];
    }
    set({ [key]: next });
  }

  return (
    <Field question={question}>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search systems"
        className={FIELD}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {shown.map((o) => {
          const on = picked.includes(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() => toggle(o)}
              aria-pressed={on}
              className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                on ? "border-iris bg-iris/15 text-fg" : "border-line text-fg-muted hover:border-iris/50 hover:text-fg"
              }`}
            >
              {o}
            </button>
          );
        })}
        {shown.length === 0 && <p className="text-sm text-fg-dim">Nothing matches “{query}”.</p>}
      </div>

      {picked.includes(ERP_OTHER) && (
        <input
          value={answers.otherErp || ""}
          onChange={(e) => set({ otherErp: e.target.value })}
          placeholder="Which one?"
          className={`${FIELD} mt-3`}
        />
      )}
    </Field>
  );
}
