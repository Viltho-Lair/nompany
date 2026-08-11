"use client";

import { useMemo, useState } from "react";
import { INDUSTRIES } from "@/lib/industries";
import { COUNTRIES, flagEmoji, DEFAULT_COUNTRY } from "@/lib/countries";
import { citiesFor } from "@/lib/cities";
import { ERP_SYSTEMS, ERP_NONE, ERP_OTHER } from "@/lib/questionnaire";

// Full-screen onboarding survey, shown once between finishing registration and
// reaching the account. Three steps, one question-set each, so nothing feels
// like a form dump. Answers land on the user's own questionnaire document.

const STEPS = ["Your goal", "Your company", "Your systems"];

const field =
  "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 transition-colors focus:border-brand-400 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-brand-400/30";
const labelCls = "mb-2 block text-xs font-600 uppercase tracking-[0.14em] text-white/50";

export default function QuestionnaireFlow({ locale, initialPackage = "" }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [a, setA] = useState({
    intent: "", field: "", country: DEFAULT_COUNTRY, city: "",
    erps: [], erpOther: "", packageKey: initialPackage,
  });
  const set = (patch) => setA((prev) => ({ ...prev, ...patch }));

  const canNext = step === 0 ? !!a.intent : step === 1 ? !!a.field && !!a.country : true;

  async function finish() {
    setSaving(true); setError("");
    const erps = a.erps.includes(ERP_OTHER) && a.erpOther.trim()
      ? [...a.erps.filter((e) => e !== ERP_OTHER), `${ERP_OTHER}: ${a.erpOther.trim()}`]
      : a.erps;
    try {
      const res = await fetch("/api/identity/questionnaire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...a, erps }),
      });
      if (!res.ok) { setError("We couldn't save your answers. Try again."); setSaving(false); return; }
      window.location.assign(`/${locale}/account`);
    } catch {
      setError("Something went wrong. Try again.");
      setSaving(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-steel-900 px-5 py-16">
      <span aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(70%_120%_at_15%_0%,rgba(37,99,235,0.42),transparent),radial-gradient(60%_100%_at_100%_100%,rgba(59,130,246,0.28),transparent)]" />

      <div className="relative z-10 w-full max-w-2xl">
        {/* progress */}
        <div className="mb-10">
          <div className="flex items-center justify-between gap-4">
            {STEPS.map((s, i) => (
              <div key={s} className="flex flex-1 flex-col gap-2">
                <span className={`h-1 rounded-full transition-colors ${i <= step ? "bg-brand-400" : "bg-white/15"}`} />
                <span className={`text-[11px] font-600 uppercase tracking-[0.14em] ${i <= step ? "text-brand-300" : "text-white/35"}`}>
                  {s}
                </span>
              </div>
            ))}
          </div>
        </div>

        {step === 0 && <GoalStep value={a.intent} onPick={(intent) => { set({ intent }); setStep(1); }} />}
        {step === 1 && <CompanyStep a={a} set={set} />}
        {step === 2 && <SystemsStep a={a} set={set} />}

        {error && <p className="mt-6 text-sm text-rose-300" role="alert">{error}</p>}

        <div className="mt-10 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || saving}
            className="text-sm font-600 text-white/50 transition-colors hover:text-white disabled:invisible"
          >
            ← Back
          </button>

          {step < 2 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext}
              className="rounded-full bg-white px-7 py-3 font-display text-sm font-700 uppercase tracking-[0.12em] text-brand-950 transition-colors hover:bg-white/90 disabled:opacity-40"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={finish}
              disabled={saving}
              className="rounded-full bg-white px-7 py-3 font-display text-sm font-700 uppercase tracking-[0.12em] text-brand-950 transition-colors hover:bg-white/90 disabled:opacity-60"
            >
              {saving ? "Finishing…" : "Finish setup"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

// ---- step 1: why are you here ----------------------------------------------
function GoalStep({ value, onPick }) {
  const options = [
    { key: "create", title: "Create a studio", body: "Set up your company's workspace and invite your team into it." },
    { key: "join", title: "Join a studio", body: "Someone shared a company code with you and you're joining their workspace." },
  ];
  return (
    <section>
      <Heading kicker="Welcome aboard" title="What brings you to nompany?" lead="This just shapes what we show you next — you can do both later." />
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => onPick(o.key)}
            className={`group rounded-geex border p-6 text-start transition-all ${
              value === o.key
                ? "border-brand-400 bg-white/10"
                : "border-white/15 bg-white/[0.04] hover:border-white/30 hover:bg-white/[0.07]"
            }`}
          >
            <h3 className="font-display text-lg font-700 text-white">{o.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/60">{o.body}</p>
            <span className="mt-4 inline-block text-sm font-600 text-brand-300 opacity-0 transition-opacity group-hover:opacity-100">
              Choose →
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

// ---- step 2: company details ------------------------------------------------
function CompanyStep({ a, set }) {
  const cities = useMemo(() => citiesFor(a.country), [a.country]);
  return (
    <section>
      <Heading kicker="Step 2 of 3" title="Tell us about your company" lead="It helps us tune defaults — nothing here is published anywhere." />
      <div className="mt-8 space-y-5">
        <div>
          <label className={labelCls} htmlFor="industry">What field does your company work in?</label>
          <input
            id="industry" list="industry-options" className={field} value={a.field}
            onChange={(e) => set({ field: e.target.value })} placeholder="Start typing — e.g. Construction"
          />
          <datalist id="industry-options">
            {INDUSTRIES.map((i) => <option key={i} value={i} />)}
          </datalist>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="country">Country</label>
            <select
              id="country" className={`${field} [&>option]:bg-steel-900`} value={a.country}
              onChange={(e) => set({ country: e.target.value, city: "" })}
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{flagEmoji(c.code)} {c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="city">City</label>
            <input
              id="city" list="city-options" className={field} value={a.city}
              onChange={(e) => set({ city: e.target.value })} placeholder={cities[0] || "Your city"}
            />
            <datalist id="city-options">
              {cities.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---- step 3: existing systems ----------------------------------------------
function SystemsStep({ a, set }) {
  const [query, setQuery] = useState("");
  const none = a.erps.includes(ERP_NONE);
  const shown = ERP_SYSTEMS.filter((s) => s.toLowerCase().includes(query.trim().toLowerCase()));

  function toggle(system) {
    if (system === ERP_NONE) { set({ erps: none ? [] : [ERP_NONE] }); return; }
    const next = a.erps.filter((e) => e !== ERP_NONE);
    set({ erps: next.includes(system) ? next.filter((e) => e !== system) : [...next, system] });
  }

  return (
    <section>
      <Heading kicker="Step 3 of 3" title="Which systems do you use today?" lead="Pick any that apply — it tells us what you may want to bring across. Optional." />
      <div className="mt-8">
        <input
          className={field} value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Search systems…" aria-label="Search systems"
        />
        <div className="mt-4 flex max-h-64 flex-wrap gap-2 overflow-y-auto pe-1">
          {shown.map((s) => {
            const on = a.erps.includes(s);
            const dimmed = none && s !== ERP_NONE;
            return (
              <button
                key={s} type="button" onClick={() => toggle(s)} disabled={dimmed}
                className={`rounded-full border px-3.5 py-2 text-sm transition-colors ${
                  on ? "border-brand-400 bg-brand-400/20 text-white"
                     : "border-white/15 bg-white/[0.04] text-white/70 hover:border-white/30 hover:text-white"
                } ${dimmed ? "opacity-30" : ""}`}
              >
                {s}
              </button>
            );
          })}
          {shown.length === 0 && <p className="text-sm text-white/40">Nothing matches “{query}”.</p>}
        </div>
        {a.erps.includes(ERP_OTHER) && (
          <input
            className={`${field} mt-4`} value={a.erpOther}
            onChange={(e) => set({ erpOther: e.target.value })} placeholder="Which system is it?"
          />
        )}
      </div>
    </section>
  );
}

function Heading({ kicker, title, lead }) {
  return (
    <header>
      <p className="text-xs font-600 uppercase tracking-[0.16em] text-brand-300">{kicker}</p>
      <h1 className="mt-3 font-display text-3xl font-800 tracking-tight text-white sm:text-4xl" style={{ textWrap: "balance" }}>{title}</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/60">{lead}</p>
    </header>
  );
}
