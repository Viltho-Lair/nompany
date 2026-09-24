"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccountLocale } from "@/components/public/locale";
import { accountDict } from "@/shared/account";
import { Icon } from "@/components/studio2/icons";
import SelectMenu from "@/components/fields/SelectMenu";
import { FIELDS_OF_WORK, OTHER_FIELD } from "@/shared/fieldsOfWork";
import { withNeeds } from "@/shared/tradeSections";
import { COUNTRIES, codeOfCountry } from "@/shared/countries";
import { citiesFor } from "@/lib/cities";
import { ERP_NONE, ERP_OTHER, ERP_SYSTEMS } from "@/lib/questionnaire";
import { fmtCurrencyAmount } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import {
  H2, SUB, INPUT, LABEL, BTN, BTN_GHOST, BANNER_BAD, slugify,
} from "@/components/public/accountKit";

// CREATING A STUDIO IS A SCREEN, NOT A POPUP — the owner's instruction,
// 17/09/2026. It used to be a dialog with a name, an address and a field of
// work, and the studio then opened with every department that field could
// conceivably touch. A field of work is a blunt instrument: two companies in
// the same trade can share almost nothing, and walking into a sidebar full of
// departments you never run is the first thing the product said to you.
//
// So there are four steps:
//
//   1. COMPANY      name, address, field of work — what the dialog asked —
//                   and, since 24/09/2026, the country, the city and the
//                   systems the company already runs: the registration
//                   questionnaire's company questions, moved here on the
//                   owner's instruction because they describe the company, and
//                   the company is the studio.
//   2. WHAT YOU DO  one yes/no question per department, PRE-ANSWERED from the
//                   field of work so most owners only correct a few. A "yes"
//                   can be narrowed to the parts of that department in use.
//   3. PLAN         the package (24/09/2026): the free one, or a paid one and
//                   its band, at the visitor's own regional price, PRE-SELECTED
//                   from what they chose on the pricing page (the signed choice
//                   the account page hands in as `intent`). A paid choice is a
//                   request until it is paid — there is no checkout yet — and
//                   the screen says so rather than implying a purchase.
//   4. REVIEW       what will be on and what will be off, and the package,
//                   before anything is written.
//
// NOTHING IS FINAL, and the screen says so: every answer is one switch in
// Studio settings → Sections. Asking up front is about not being shocked on
// arrival, not about locking anybody in.
//
// THE QUESTIONS AND THEIR ANSWERS ARE THE SERVER'S. `setup` is computed on the
// account page from the same catalogue the create route validates against
// (modules/main/studios), so the screen cannot offer a department the route
// would refuse, and the trade rules — which reach the stage registry — never
// ship to the browser. What IS shared is `withNeeds`, a pure rule, so the
// screen shows a dependency being switched on exactly as the server will.

const STEPS = 4;
// The step indexes, named: bare numbers in the footer are how a new step lands
// with the old Continue button still pointing past it.
const COMPANY = 0, DEPARTMENTS = 1, PLAN = 2, REVIEW = 3;

export default function CreateStudioScreen({ setup, intent = null, onDone, onCancel }) {
  const locale = useAccountLocale();
  const tr = accountDict(locale);
  const t = tr.setup;
  const departments = useMemo(() => setup?.departments || [], [setup]);
  const nameOf = useMemo(() => new Map(departments.map((d) => [d.key, d.name])), [departments]);
  const suggestedFor = (f) => setup?.suggested?.[f] || setup?.suggested?.[""] || departments.map((d) => d.key);

  const [step, setStepRaw] = useState(0);
  // The whole screen slides in once, on arrival. After that only the step body
  // moves, so opening the screen is one movement rather than two stacked.
  const [moved, setMoved] = useState(false);
  const setStep = (n) => { setMoved(true); setStepRaw(n); };
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // ---- step 1: the company ----------------------------------------------------
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [touchedSlug, setTouchedSlug] = useState(false);
  const [status, setStatus] = useState(null);
  const [field, setField] = useState("");
  const [fieldOther, setFieldOther] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [erps, setErps] = useState(() => new Set());
  const [erpOther, setErpOther] = useState("");
  const effectiveSlug = touchedSlug ? slugify(slug) : slugify(name);
  const cities = useMemo(() => citiesFor(codeOfCountry(country)), [country]);
  // "None" is exclusive, the way the questionnaire had it: saying you run no
  // system and naming one in the same breath is two answers to one question.
  function flipErp(e) {
    setErps((cur) => {
      const next = new Set(cur);
      if (next.has(e)) { next.delete(e); return next; }
      if (e === ERP_NONE) return new Set([ERP_NONE]);
      next.delete(ERP_NONE);
      next.add(e);
      return next;
    });
  }
  const erpLabel = (e) => (e === ERP_NONE ? t.erpNone : e === ERP_OTHER ? t.erpNotListed : e);

  // ---- step 3: the package ----------------------------------------------------
  // The same payload the pricing page draws from, so the figures are the
  // visitor's regional ones and the cards are whatever /super publishes.
  // `choice.packageId` "" is the free package: the absence of a paid choice,
  // never an id the create route has to recognise.
  const [pricing, setPricing] = useState(null);
  const [choice, setChoice] = useState(() => ({
    packageId: intent?.packageId || "",
    categoryId: intent?.categoryId || "",
    cycle: intent?.cycle === "yearly" ? "yearly" : "monthly",
  }));
  useEffect(() => {
    let alive = true;
    fetch("/api/pricing", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive) setPricing(d && Array.isArray(d.cards) ? d : false); })
      .catch(() => { if (alive) setPricing(false); });
    return () => { alive = false; };
  }, []);
  const cards = useMemo(() => pricing?.cards || [], [pricing]);
  const freeCard = cards.find((c) => c.type === "free") || null;
  const paidCards = cards.filter((c) => c.type === "compound");
  const premiumCards = cards.filter((c) => c.type === "premium");
  // A choice the catalogue no longer carries READS AS FREE — derived, not
  // reset in an effect — so the screen never posts an id the route would drop
  // without a word.
  const chosenCard = cards.find((c) => c.id === choice.packageId && c.type === "compound") || null;
  const chosenBand = chosenCard?.categories?.find((b) => b.id === choice.categoryId) || chosenCard?.categories?.[0] || null;
  const cardName = (c) => (c ? (locale === "ar" && c.nameAr) || c.name : "");
  const money = (n) => fmtCurrencyAmount(n, pricing?.currency || "USD");
  const choiceLabel = chosenCard
    ? [cardName(chosenCard), chosenBand?.label].filter(Boolean).join(" · ")
    : cardName(freeCard) || t.freeCard;

  useEffect(() => {
    if (!effectiveSlug) { setStatus(null); return; }
    const id = setTimeout(async () => {
      const res = await fetch(`/api/studios/available?slug=${encodeURIComponent(effectiveSlug)}`, { cache: "no-store" });
      if (res.ok) setStatus(await res.json());
    }, 350);
    return () => clearTimeout(id);
  }, [effectiveSlug]);

  // ---- step 2: what the company does ------------------------------------------
  // `yes` is what the OWNER answered. `on` below adds what those answers need,
  // which the owner cannot switch off while the need stands.
  const [yes, setYes] = useState(() => new Set(suggestedFor("")));
  const [offParts, setOffParts] = useState(() => new Set());
  const [filledFor, setFilledFor] = useState("");
  const [edited, setEdited] = useState(false);
  const [openParts, setOpenParts] = useState("");

  const on = useMemo(() => withNeeds(yes), [yes]);
  const neededBy = (key) => departments
    .filter((d) => yes.has(d.key) && (d.needs || []).includes(key))
    .map((d) => d.name);
  const suggested = suggestedFor(field);
  const matchesSuggestion = suggested.length === yes.size && suggested.every((k) => yes.has(k)) && offParts.size === 0;

  // THE ANSWERS FOLLOW THE FIELD UNTIL THE OWNER TOUCHES THEM. Changing the
  // field on step 1 and coming back re-fills step 2 — unless the owner has
  // already made it their own, in which case the reset link offers it instead
  // of overwriting their work.
  function enterDepartments() {
    if (!edited && filledFor !== field) {
      setYes(new Set(suggestedFor(field)));
      setOffParts(new Set());
      setFilledFor(field);
    }
    setStep(DEPARTMENTS);
  }
  function resetToSuggested() {
    setYes(new Set(suggestedFor(field)));
    setOffParts(new Set());
    setFilledFor(field);
    setEdited(false);
  }
  function answer(key, value) {
    setEdited(true);
    setYes((cur) => {
      const next = new Set(cur);
      if (value) next.add(key); else next.delete(key);
      return next;
    });
  }
  function flipPart(part) {
    setEdited(true);
    setOffParts((cur) => {
      const next = new Set(cur);
      if (next.has(part)) next.delete(part); else next.add(part);
      return next;
    });
  }

  // ---- step 4: create ---------------------------------------------------------
  async function create() {
    setBusy(true); setError("");
    const res = await fetch("/api/studios", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name, slug: effectiveSlug,
        fieldOfWork: field,
        fieldOfWorkOther: field === OTHER_FIELD ? fieldOther : "",
        country, city,
        erps: [...erps],
        erpOther: erps.has(ERP_OTHER) ? erpOther : "",
        // The package asked for. The route checks it against the catalogue
        // again and keeps it on the studio as a request; nothing is charged.
        plan: chosenCard ? { packageId: chosenCard.id, categoryId: chosenBand?.id || "", cycle: choice.cycle } : null,
        // What the owner answered — the server adds the same dependencies the
        // screen showed, and drops parts left unticked under a "no".
        sections: {
          roots: [...yes],
          offChildren: [...offParts].filter((p) => departments.some((d) => on.has(d.key) && d.parts.some((x) => x.key === p))),
        },
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) { onDone(); return; }
    // A refusal about the COMPANY sends the owner back to the step that can fix it.
    const companyError = ["slug-taken", "slug-reserved", "slug-invalid", "name", "field-invalid", "country-invalid"].includes(data.error);
    if (companyError) setStep(COMPANY);
    setError(
      data.error === "unverified" ? tr.confirmEmailAddressFirst
      : data.error === "free-studio-limit" ? tr.freeStudioLimit(data.limit)
      : data.error === "slug-taken" ? tr.codeTakenPickAnother
      : data.error === "slug-reserved" ? tr.codeReservedPickAnother
      : data.error === "slug-invalid" ? tr.use3LettersNumbers
      : data.error === "name" ? tr.giveStudioName
      : data.error === "field-invalid" ? tr.pickFieldFromList
      : data.error === "country-invalid" ? t.countryInvalid
      : data.error === "sections-empty" ? t.pickOne
      : data.error === "sections-invalid" ? t.sectionsInvalid
      : tr.couldnCreateStudio,
    );
  }

  // Escape backs out of the whole screen, as the dialog's did.
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && !busy) onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  const canLeaveCompany = Boolean(name.trim()) && Boolean(status?.available) && Boolean(country);
  const canLeaveDepartments = departments.some((d) => yes.has(d.key));
  const offList = departments.filter((d) => !on.has(d.key));
  const onList = departments.filter((d) => on.has(d.key));

  return (
    <section className="slide-in mx-auto flex min-h-full max-w-[760px] flex-col py-2" aria-labelledby="create-studio-title">
      {/* ---- header: back out, title, where you are ---- */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={onCancel} disabled={busy} aria-label={tr.cancel}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-white dark:hover:bg-white/5">
          <Icon name="arrowLeft" className="h-5 w-5 rtl:-scale-x-100" />
        </button>
        <div className="min-w-0">
          <h2 id="create-studio-title" className="font-display text-2xl font-700 text-slate-900 dark:text-white">{tr.createStudio}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t.stepOf(step + 1, STEPS)}</p>
        </div>
      </div>

      <ol className="mt-5 grid grid-cols-4 gap-2" aria-label={tr.createStudio}>
        {t.steps.map((label, i) => (
          <li key={label} aria-current={i === step ? "step" : undefined}>
            <span className={cn("block h-1.5 rounded-full transition-colors",
              i <= step ? "bg-brand-600" : "bg-slate-200 dark:bg-white/10")} />
            <span className={cn("mt-1.5 block text-xs font-600",
              i === step ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500")}>{label}</span>
          </li>
        ))}
      </ol>

      {error && <p className={cn(BANNER_BAD, "mt-5")} role="alert">{error}</p>}

      {/* `key` restarts the slide, so each step arrives rather than blinking in. */}
      <div key={step} className={cn("mt-6 flex-1", moved && "slide-in")}>
        {step === COMPANY && (
          <div className="grid gap-4">
            <p className={SUB}>{t.companyLead}</p>
            <div>
              <label className={LABEL} htmlFor="studio-name">{tr.companyName2}</label>
              <input id="studio-name" className={INPUT} value={name} autoFocus
                onChange={(e) => setName(e.target.value)} placeholder={tr.companyName} />
            </div>
            <div>
              <label className={LABEL} htmlFor="studio-slug">{tr.studioAddressCompanyCode}</label>
              <div className="flex items-center gap-2" dir="ltr">
                <span className="shrink-0 font-mono text-xs text-slate-500 dark:text-slate-400">{tr.nompanyCom}</span>
                <input id="studio-slug" className={INPUT} value={touchedSlug ? slug : effectiveSlug}
                  onChange={(e) => { setTouchedSlug(true); setSlug(e.target.value); }} placeholder="your-company" />
              </div>
              {effectiveSlug && status && (
                <p className={cn("mt-1 text-xs font-600", status.available ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-300")}>
                  {status.available ? `“${status.slug}” is available`
                    : status.reason === "taken" ? `“${status.slug}” is already taken`
                    : status.reason === "reserved" ? `“${status.slug}” is reserved`
                    : tr.use3LettersNumbers2}
                </p>
              )}
            </div>
            <div>
              <label className={LABEL}>{tr.fieldOfWorkLabel}</label>
              {/* SelectMenu, never a native <select> — see AccountHome's note. */}
              <SelectMenu
                className={INPUT}
                value={field}
                onChange={setField}
                placeholder={tr.fieldOfWorkSkip}
                options={[
                  { value: "", label: tr.fieldOfWorkSkip },
                  ...FIELDS_OF_WORK.map((f) => ({ value: f, label: f })),
                  { value: OTHER_FIELD, label: OTHER_FIELD },
                ]}
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{tr.fieldOfWorkHint}</p>
            </div>
            {field === OTHER_FIELD && (
              <div>
                <label className={LABEL} htmlFor="studio-field-other">{tr.fieldOfWorkOtherLabel}</label>
                <input id="studio-field-other" className={INPUT} value={fieldOther} maxLength={80}
                  onChange={(e) => setFieldOther(e.target.value)} />
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={LABEL}>{t.countryLabel}</label>
                <SelectMenu
                  className={INPUT}
                  value={country}
                  onChange={(v) => { setCountry(v); setCity(""); }}
                  placeholder={t.countryPlaceholder}
                  options={COUNTRIES.map((c) => ({ value: c.name, label: c.name }))}
                />
              </div>
              <div>
                <label className={LABEL}>{t.cityLabel}</label>
                {cities.length ? (
                  <SelectMenu className={INPUT} value={city} onChange={setCity} placeholder={t.cityPlaceholder}
                    options={[{ value: "", label: t.cityPlaceholder }, ...cities.map((c) => ({ value: c, label: c }))]} />
                ) : (
                  <input className={INPUT} value={city} maxLength={80} disabled={!country}
                    onChange={(e) => setCity(e.target.value)} placeholder={t.cityPlaceholder} aria-label={t.cityLabel} />
                )}
              </div>
            </div>
            <p className="-mt-2 text-xs text-slate-500 dark:text-slate-400">{t.countryHint}</p>
            <div>
              <p className={LABEL}>{t.erpsLabel}</p>
              <div className="flex flex-wrap gap-1.5">
                {ERP_SYSTEMS.map((e) => {
                  const picked = erps.has(e);
                  return (
                    <button key={e} type="button" aria-pressed={picked} onClick={() => flipErp(e)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-600 transition-colors",
                        picked
                          ? "border-brand-600 bg-brand-600 text-white"
                          : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-white/10 dark:text-slate-300",
                      )}>
                      {erpLabel(e)}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t.erpsHint}</p>
              {erps.has(ERP_OTHER) && (
                <input className={cn(INPUT, "mt-2")} value={erpOther} maxLength={80}
                  onChange={(e) => setErpOther(e.target.value)} placeholder={t.erpOtherLabel} aria-label={t.erpOtherLabel} />
              )}
            </div>
          </div>
        )}

        {step === DEPARTMENTS && (
          <div>
            <h3 className={H2}>{t.departmentsTitle}</h3>
            <p className={SUB}>{t.departmentsLead}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-brand-500/5 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300">
              <span className="min-w-0 flex-1">
                {field && field !== OTHER_FIELD ? t.suggestedFor(field) : t.suggestedNone}
              </span>
              {!matchesSuggestion && (
                <button type="button" onClick={resetToSuggested}
                  className="shrink-0 text-xs font-600 text-brand-700 hover:underline dark:text-brand-300">
                  {t.resetSuggestions}
                </button>
              )}
            </div>

            <ul className="mt-4 space-y-2">
              {departments.map((d) => {
                const q = t.questions[d.key];
                const isOn = on.has(d.key);
                const forced = isOn && !yes.has(d.key);
                const needers = forced ? neededBy(d.key) : [];
                const parts = d.parts || [];
                const partsOn = parts.filter((p) => !offParts.has(p.key)).length;
                const open = openParts === d.key;
                return (
                  <li key={d.key} className={cn(
                    "rounded-2xl border bg-white px-4 py-3 transition-colors dark:bg-[#20202c]",
                    isOn ? "border-brand-500/30" : "border-slate-200/70 dark:border-white/10",
                  )}>
                    <div className="flex flex-wrap items-start gap-3 sm:flex-nowrap">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-700 uppercase tracking-wide text-slate-400 dark:text-slate-500">{d.name}</p>
                        <p className="mt-0.5 font-600 text-slate-900 dark:text-white">{q?.q || d.name}</p>
                        {q?.d && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{q.d}</p>}
                        {forced && <p className="mt-1 text-xs font-600 text-brand-700 dark:text-brand-300">{t.neededBy(needers.join(", "))}</p>}
                      </div>
                      <div role="radiogroup" aria-label={q?.q || d.name}
                        className="inline-flex shrink-0 rounded-full bg-slate-100 p-0.5 dark:bg-white/5">
                        {[true, false].map((value) => {
                          const picked = value ? isOn : !isOn;
                          return (
                            <button key={String(value)} type="button" role="radio" aria-checked={picked}
                              disabled={forced && !value}
                              onClick={() => answer(d.key, value)}
                              className={cn(
                                "min-w-[3.5rem] rounded-full px-3 py-1.5 text-sm font-600 transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                                picked
                                  ? value ? "bg-brand-700 text-white" : "bg-white text-slate-900 shadow-sm dark:bg-[#2b2b38] dark:text-white"
                                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
                              )}>
                              {value ? t.yes : t.no}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {isOn && parts.length > 1 && (
                      <div className="mt-2 border-t border-slate-100 pt-2 dark:border-white/5">
                        <button type="button" aria-expanded={open} onClick={() => setOpenParts(open ? "" : d.key)}
                          className="inline-flex items-center gap-1 text-xs font-600 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
                          <Icon name="chevronDown" className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
                          {t.partsToggle(partsOn, parts.length)}
                        </button>
                        {open && (
                          <div className="mt-2">
                            <p className="text-xs text-slate-500 dark:text-slate-400">{t.partsLead}</p>
                            <div className="mt-2 grid gap-1 sm:grid-cols-2">
                              {parts.map((p) => (
                                <label key={p.key} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5">
                                  <input type="checkbox" className="h-4 w-4 accent-brand-600"
                                    checked={!offParts.has(p.key)} onChange={() => flipPart(p.key)} />
                                  <span className="min-w-0 truncate">{p.name}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {step === PLAN && (
          <div>
            <h3 className={H2}>{t.planTitle}</h3>
            <p className={SUB}>{t.planLead}</p>
            {pricing === null && <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{t.planLoading}</p>}
            {pricing === false && <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{t.planUnavailable}</p>}
            {pricing && (
              <>
                <div role="radiogroup" aria-label={t.planTitle} className="mt-3 inline-flex rounded-full bg-slate-100 p-0.5 dark:bg-white/5">
                  {["monthly", "yearly"].map((c) => (
                    <button key={c} type="button" role="radio" aria-checked={choice.cycle === c}
                      onClick={() => setChoice((x) => ({ ...x, cycle: c }))}
                      className={cn("rounded-full px-3 py-1.5 text-sm font-600 transition-colors",
                        choice.cycle === c ? "bg-white text-slate-900 shadow-sm dark:bg-[#2b2b38] dark:text-white" : "text-slate-500 dark:text-slate-400")}>
                      {c === "monthly" ? t.monthly : t.yearly}
                      {c === "yearly" && pricing.yearlyDiscountPct > 0 && (
                        <span className="ms-1 text-xs text-emerald-600 dark:text-emerald-400">{t.yearlySaves(pricing.yearlyDiscountPct)}</span>
                      )}
                    </button>
                  ))}
                </div>
                <ul className="mt-4 space-y-2">
                  {freeCard && (
                    <li>
                      <label className={cn("flex cursor-pointer items-start gap-3 rounded-2xl border bg-white px-4 py-3 dark:bg-[#20202c]",
                        !chosenCard ? "border-brand-500/60" : "border-slate-200/70 dark:border-white/10")}>
                        <input type="radio" name="plan" className="mt-1 h-4 w-4 accent-brand-600" checked={!chosenCard}
                          onChange={() => setChoice((x) => ({ ...x, packageId: "", categoryId: "" }))} />
                        <span className="min-w-0 flex-1">
                          <span className="block font-600 text-slate-900 dark:text-white">{cardName(freeCard)}</span>
                          <span className="block text-sm text-slate-500 dark:text-slate-400">
                            {t.usersUpTo(freeCard.minEmployees || 1, freeCard.maxEmployees)} · {freeCard.durationMonths > 0 ? t.freeFor(freeCard.durationMonths) : t.freeCard}
                          </span>
                        </span>
                      </label>
                    </li>
                  )}
                  {paidCards.map((c) => {
                    const on = choice.packageId === c.id;
                    const band = on ? chosenBand : c.categories?.[0];
                    return (
                      <li key={c.id}>
                        <div className={cn("rounded-2xl border bg-white px-4 py-3 dark:bg-[#20202c]",
                          on ? "border-brand-500/60" : "border-slate-200/70 dark:border-white/10")}>
                          <label className="flex cursor-pointer items-start gap-3">
                            <input type="radio" name="plan" className="mt-1 h-4 w-4 accent-brand-600" checked={on}
                              onChange={() => setChoice((x) => ({ ...x, packageId: c.id, categoryId: c.categories?.[0]?.id || "" }))} />
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-baseline gap-x-2">
                                <span className="font-600 text-slate-900 dark:text-white">{cardName(c)}</span>
                                {intent?.packageId === c.id && (
                                  <span className="text-xs font-600 text-brand-700 dark:text-brand-300">{t.chosenFromPricing}</span>
                                )}
                              </span>
                              {band && (
                                <span className="block text-sm text-slate-500 dark:text-slate-400">
                                  {t.usersUpTo(band.minEmployees, band.maxEmployees)} ·{" "}
                                  <span className="num">{money(choice.cycle === "yearly" ? band.yearly : band.monthly)}</span>{" "}
                                  {choice.cycle === "yearly" ? t.perYear : t.perMonth}
                                </span>
                              )}
                            </span>
                          </label>
                          {on && (c.categories?.length || 0) > 1 && (
                            <div className="mt-2 flex flex-wrap gap-1.5 ps-7">
                              {c.categories.map((b) => (
                                <button key={b.id} type="button" aria-pressed={chosenBand?.id === b.id}
                                  onClick={() => setChoice((x) => ({ ...x, categoryId: b.id }))}
                                  className={cn("rounded-full border px-3 py-1 text-xs font-600 transition-colors",
                                    chosenBand?.id === b.id
                                      ? "border-brand-600 bg-brand-600 text-white"
                                      : "border-slate-200 text-slate-600 dark:border-white/10 dark:text-slate-300")}>
                                  {b.label || t.usersUpTo(b.minEmployees, b.maxEmployees)}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                  {premiumCards.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-slate-200 px-4 py-3 dark:border-white/10">
                      <span className="min-w-0 flex-1">
                        <span className="block font-600 text-slate-900 dark:text-white">{cardName(c)}</span>
                        <span className="block text-sm text-slate-500 dark:text-slate-400">{t.largeNote}</span>
                      </span>
                      <a href={`/${locale}/contact`} className="text-sm font-600 text-brand-700 hover:underline dark:text-brand-300">{t.contactSales}</a>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 rounded-xl bg-brand-500/5 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300">
                  {chosenCard ? t.paidNote(choiceLabel) : t.freeNote(freeCard?.durationMonths || 3)}
                </p>
              </>
            )}
          </div>
        )}

        {step === REVIEW && (
          <div>
            <h3 className={H2}>{t.reviewTitle}</h3>
            <p className={SUB}>{t.reviewLead}</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-brand-500/30 bg-white p-4 dark:bg-[#20202c]">
                <p className="text-xs font-700 uppercase tracking-wide text-brand-700 dark:text-brand-300">{t.onHeading} · {onList.length}</p>
                <ul className="mt-2 space-y-1.5">
                  {onList.map((d) => {
                    const off = (d.parts || []).filter((p) => offParts.has(p.key)).length;
                    return (
                      <li key={d.key} className="flex items-center gap-2 text-sm text-slate-800 dark:text-slate-100">
                        <Icon name="checkBold" className="h-3.5 w-3.5 text-brand-600" />
                        <span className="min-w-0 flex-1 truncate">{d.name}</span>
                        {off > 0 && <span className="shrink-0 text-xs text-slate-400">{t.partsOff(off)}</span>}
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-white p-4 dark:border-white/10 dark:bg-[#20202c]">
                <p className="text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400">{t.offHeading} · {offList.length}</p>
                {offList.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t.noneOff}</p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {offList.map((d) => (
                      <li key={d.key} className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <Icon name="xBold" className="h-3.5 w-3.5" />
                        <span className="min-w-0 truncate">{nameOf.get(d.key)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-800 dark:text-slate-100">
              <span className="font-600">{t.planHeading}:</span> {choiceLabel}
            </p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t.alwaysThere}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.editLater}</p>
          </div>
        )}
      </div>

      {/* ---- footer: back and forward ---- */}
      <div className="sticky bottom-0 mt-6 flex flex-wrap items-center gap-3 border-t border-slate-200/70 bg-geex-bg py-4 dark:border-white/10 dark:bg-[#141420]">
        {step === COMPANY
          ? <button type="button" className={BTN_GHOST} onClick={onCancel} disabled={busy}>{tr.cancel}</button>
          : <button type="button" className={BTN_GHOST} onClick={() => setStep(step - 1)} disabled={busy}>{t.back}</button>}
        {step === DEPARTMENTS && !canLeaveDepartments && <span className="text-xs text-rose-600 dark:text-rose-300">{t.pickOne}</span>}
        <span className="flex-1" />
        {step === COMPANY && <button type="button" className={BTN} onClick={enterDepartments} disabled={!canLeaveCompany}>{t.continue}</button>}
        {step === DEPARTMENTS && <button type="button" className={BTN} onClick={() => setStep(PLAN)} disabled={!canLeaveDepartments}>{t.continue}</button>}
        {step === PLAN && <button type="button" className={BTN} onClick={() => setStep(REVIEW)} disabled={pricing === null}>{t.continue}</button>}
        {step === REVIEW && <button type="button" className={BTN} onClick={create} disabled={busy}>{busy ? tr.creating : tr.createStudioBtn}</button>}
      </div>
    </section>
  );
}
