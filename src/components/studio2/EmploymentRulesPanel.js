"use client";

import { useMemo, useState } from "react";
import SettingsFold from "@/components/studio2/SettingsFold";
import SelectMenu from "@/components/fields/SelectMenu";
import { employmentRuleProblems } from "@/modules/hr/leaveBalance";
import { statutoryProblems, presetFor } from "@/modules/hr/statutory";
import { codeOfCountry } from "@/shared/countries";

// THE STUDIO'S EMPLOYMENT RULES — tier 6. Leave (allowances, the longer-service
// figure, carry-over, working-day counting), then statutory pay: social
// security, end of service, and the UAE's WPS identifiers.
//
// A COUNTRY PRESET FILLS THE FORM AND SAVES NOTHING — the owner's choice:
// presets the studio confirms. The figures are the law's as researched for 2026
// (modules/hr/statutory says where each comes from), and a studio reads them
// before they touch anybody's pay.
//
// IT VALIDATES WITH THE SERVER'S OWN FUNCTIONS (`employmentRuleProblems`,
// `statutoryProblems`, both pure), so the screen refuses exactly what the
// settings route refuses, before the round trip. The whole set is sent on every
// save, because the route stores what it is sent.

const INPUT = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60 dark:border-white/15 dark:bg-[#191921] dark:text-white";
const BTN = "rounded-full bg-brand-700 px-4 py-2 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60";
const BTN_GHOST = "rounded-full border border-slate-200 px-3 py-1.5 font-display text-xs font-600 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5";
const LEAVE_FIELDS = ["days", "afterYears", "daysAfter", "carryOver"];
const text = (v) => (v === undefined || v === null || v === 0 ? "" : String(v));
// A resignation step's share is stored as a factor (0–1) and typed as a percentage.
const pct = (factor) => String(Math.round(Number(factor) * 10000) / 100);

function draftFrom(rules, types) {
  const ss = rules?.socialSecurity;
  const eos = rules?.endOfService;
  const wps = rules?.wps;
  return {
    workingDays: Boolean(rules?.workingDays),
    leave: Object.fromEntries(types.map((type) => {
      const r = rules?.leave?.[type];
      return [type, Object.fromEntries(LEAVE_FIELDS.map((f) => [f, r ? text(r[f]) : ""]))];
    })),
    ss: {
      employeePct: ss ? String(ss.employeePct) : "", employerPct: ss ? String(ss.employerPct) : "",
      ceiling: text(ss?.ceiling), coversEveryone: ss ? ss.coversEveryone !== false : true,
    },
    eos: {
      firstYears: text(eos?.firstYears), firstMonths: text(eos?.firstMonths), afterMonths: text(eos?.afterMonths),
      base: eos?.base || "wage", minYears: text(eos?.minYears), capMonths: text(eos?.capMonths),
      resignation: (eos?.resignation || []).map((s) => ({ underYears: String(s.underYears), paid: pct(s.factor) })),
    },
    wps: { employerId: wps?.employerId || "", routingCode: wps?.routingCode || "", scrFirst: Boolean(wps?.scrFirst) },
  };
}

const t = (v) => String(v ?? "").trim();

function payloadOf(draft) {
  const { ss, eos, wps } = draft;
  return {
    workingDays: draft.workingDays,
    // Blank days drops the type: that is "keep no balance", not a problem.
    leave: Object.fromEntries(Object.entries(draft.leave)
      .filter(([, r]) => t(r.days))
      .map(([type, r]) => [type, Object.fromEntries(LEAVE_FIELDS.map((f) => [f, t(r[f])]))])),
    // A SECTION WITH ITS DEFINING FIGURES BLANK IS SENT AS NULL — no such scheme.
    socialSecurity: t(ss.employeePct) || t(ss.employerPct)
      ? { employeePct: t(ss.employeePct), employerPct: t(ss.employerPct), ceiling: t(ss.ceiling), coversEveryone: ss.coversEveryone }
      : null,
    endOfService: t(eos.firstMonths) || t(eos.afterMonths)
      ? {
        firstYears: t(eos.firstYears), firstMonths: t(eos.firstMonths), afterMonths: t(eos.afterMonths),
        base: eos.base, minYears: t(eos.minYears), capMonths: t(eos.capMonths),
        resignation: eos.resignation.filter((s) => t(s.underYears))
          .map((s) => ({ underYears: Number(s.underYears), factor: Number(s.paid) / 100 })),
      }
      : null,
    wps: t(wps.employerId) || t(wps.routingCode)
      ? { employerId: t(wps.employerId), routingCode: t(wps.routingCode), scrFirst: wps.scrFirst }
      : null,
  };
}

function Num({ label, value, onChange, disabled }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-600 text-slate-500 dark:text-slate-400">{label}</span>
      <input className={INPUT} inputMode="decimal" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export default function EmploymentRulesPanel({ rules, leaveTypes = [], country = "", canManage, onSave, tr }) {
  const [draft, setDraft] = useState(() => draftFrom(rules, leaveTypes));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [filled, setFilled] = useState(false);
  const preset = presetFor(codeOfCountry(country));

  const problems = useMemo(() => {
    const payload = payloadOf(draft);
    return [
      ...employmentRuleProblems(payload, leaveTypes).map((p) => tr.ruleProblem(p.type, p.field)),
      ...statutoryProblems(payload).map((code) => tr.statProblem(code)),
    ];
  }, [draft, leaveTypes, tr]);

  const change = (fn) => { setSaved(false); setDraft((d) => fn(structuredClone(d))); };
  const setLeave = (type, field, value) => change((d) => { d.leave[type][field] = value; return d; });

  // FILLS THE FORM FROM THE PRESET, KEEPING WHAT IT DOES NOT COVER — a leave
  // type the preset says nothing about keeps whatever the studio typed.
  function fill() {
    if (!preset) return;
    const next = draftFrom({ ...preset, leave: { ...payloadOf(draft).leave, ...preset.leave } }, leaveTypes);
    // WPS identifiers are the studio's own and no preset has them.
    next.wps = draft.wps;
    setSaved(false);
    setFilled(true);
    setDraft(next);
  }

  async function save() {
    if (problems.length) return;
    setBusy(true);
    const ok = await onSave({ employmentRules: payloadOf(draft) });
    setBusy(false);
    setSaved(ok !== false);
    if (ok !== false) setFilled(false);
  }

  const off = !canManage;
  const leaveHeads = [tr.leaveDaysCol, tr.leaveAfterCol, tr.leaveDaysAfterCol, tr.leaveCarryCol];
  const h4 = "font-display text-sm font-700 text-slate-900 dark:text-white";
  const lead = "mt-1 text-xs text-slate-500 dark:text-slate-400";

  return (
    <SettingsFold heading={tr.employmentHeading} lead={tr.employmentLead}>
      {/* ---- the preset ---- */}
      <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm dark:bg-white/5">
        {!country ? (
          <p className="text-slate-500 dark:text-slate-400">{tr.presetNoCountry}</p>
        ) : !preset ? (
          <p className="text-slate-500 dark:text-slate-400">{tr.presetNone(country)}</p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            {canManage && <button type="button" className={BTN_GHOST} onClick={fill}>{tr.presetFill(country)}</button>}
            <p className="text-xs text-slate-500 dark:text-slate-400">{filled ? tr.presetFilled : tr.presetNote}</p>
          </div>
        )}
      </div>

      {/* ---- leave ---- */}
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="text-xs text-slate-500 dark:text-slate-400">
              <th className="py-2 pe-3 text-start font-600">{tr.leaveTypeCol}</th>
              {leaveHeads.map((h) => <th key={h} className="py-2 pe-3 text-start font-600">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {leaveTypes.map((type) => (
              <tr key={type}>
                <td className="py-1.5 pe-3 font-600 text-slate-800 dark:text-slate-200">{type}</td>
                {LEAVE_FIELDS.map((f, i) => (
                  <td key={f} className="py-1.5 pe-3">
                    <input className={INPUT} inputMode="decimal" value={draft.leave[type]?.[f] ?? ""}
                      disabled={off} aria-label={`${type} — ${leaveHeads[i]}`}
                      onChange={(e) => setLeave(type, f, e.target.value)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
        <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={draft.workingDays} disabled={off}
          onChange={(e) => change((d) => { d.workingDays = e.target.checked; return d; })} />
        {tr.leaveWorkingDays}
      </label>

      {/* ---- social security ---- */}
      <section className="mt-6">
        <h4 className={h4}>{tr.ssHeading}</h4>
        <p className={lead}>{tr.ssLead}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Num label={tr.ssEmployee} value={draft.ss.employeePct} disabled={off} onChange={(v) => change((d) => { d.ss.employeePct = v; return d; })} />
          <Num label={tr.ssEmployer} value={draft.ss.employerPct} disabled={off} onChange={(v) => change((d) => { d.ss.employerPct = v; return d; })} />
          <Num label={tr.ssCeiling} value={draft.ss.ceiling} disabled={off} onChange={(v) => change((d) => { d.ss.ceiling = v; return d; })} />
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
          <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={draft.ss.coversEveryone} disabled={off}
            onChange={(e) => change((d) => { d.ss.coversEveryone = e.target.checked; return d; })} />
          {tr.ssEveryone}
        </label>
      </section>

      {/* ---- end of service ---- */}
      <section className="mt-6">
        <h4 className={h4}>{tr.eosHeading}</h4>
        <p className={lead}>{tr.eosLead}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Num label={tr.eosFirstYears} value={draft.eos.firstYears} disabled={off} onChange={(v) => change((d) => { d.eos.firstYears = v; return d; })} />
          <Num label={tr.eosFirstMonths} value={draft.eos.firstMonths} disabled={off} onChange={(v) => change((d) => { d.eos.firstMonths = v; return d; })} />
          <Num label={tr.eosAfterMonths} value={draft.eos.afterMonths} disabled={off} onChange={(v) => change((d) => { d.eos.afterMonths = v; return d; })} />
          <label className="block">
            <span className="mb-1 block text-xs font-600 text-slate-500 dark:text-slate-400">{tr.eosBase}</span>
            <SelectMenu className={INPUT} value={draft.eos.base} disabled={off} aria-label={tr.eosBase}
              options={[{ value: "basic", label: tr.eosBaseBasic }, { value: "wage", label: tr.eosBaseWage }]}
              onChange={(v) => change((d) => { d.eos.base = v; return d; })} />
          </label>
          <Num label={tr.eosMinYears} value={draft.eos.minYears} disabled={off} onChange={(v) => change((d) => { d.eos.minYears = v; return d; })} />
          <Num label={tr.eosCap} value={draft.eos.capMonths} disabled={off} onChange={(v) => change((d) => { d.eos.capMonths = v; return d; })} />
        </div>
        <p className="mt-4 text-xs font-600 text-slate-500 dark:text-slate-400">{tr.eosResignation}</p>
        <div className="mt-2 space-y-2">
          {draft.eos.resignation.map((s, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <Num label={tr.eosUnderYears} value={s.underYears} disabled={off}
                onChange={(v) => change((d) => { d.eos.resignation[i].underYears = v; return d; })} />
              <Num label={tr.eosPaidPct} value={s.paid} disabled={off}
                onChange={(v) => change((d) => { d.eos.resignation[i].paid = v; return d; })} />
              {canManage && (
                <button type="button" className="px-1.5 pb-2 text-slate-400 transition-colors hover:text-rose-600"
                  aria-label={`${tr.eosResignation} ${i + 1}`}
                  onClick={() => change((d) => { d.eos.resignation.splice(i, 1); return d; })}>×</button>
              )}
            </div>
          ))}
          {canManage && (
            <button type="button" className={BTN_GHOST}
              onClick={() => change((d) => { d.eos.resignation.push({ underYears: "", paid: "" }); return d; })}>
              {tr.eosAddStep}
            </button>
          )}
        </div>
      </section>

      {/* ---- WPS ---- */}
      <section className="mt-6">
        <h4 className={h4}>{tr.wpsHeading}</h4>
        <p className={lead}>{tr.wpsLead}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Num label={tr.wpsEmployer} value={draft.wps.employerId} disabled={off} onChange={(v) => change((d) => { d.wps.employerId = v; return d; })} />
          <Num label={tr.wpsRouting} value={draft.wps.routingCode} disabled={off} onChange={(v) => change((d) => { d.wps.routingCode = v; return d; })} />
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
          <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={draft.wps.scrFirst} disabled={off}
            onChange={(e) => change((d) => { d.wps.scrFirst = e.target.checked; return d; })} />
          {tr.wpsScrFirst}
        </label>
      </section>

      {problems.length > 0 && (
        <ul className="mt-4 space-y-1 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
          {problems.map((p) => <li key={p}>{p}</li>)}
        </ul>
      )}

      {canManage && (
        <div className="mt-4">
          <button className={BTN} onClick={save} disabled={busy || problems.length > 0}>
            {busy ? tr.saving : saved ? tr.employmentSaved : tr.saveEmployment}
          </button>
        </div>
      )}
    </SettingsFold>
  );
}
