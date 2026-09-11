"use client";

import { useMemo, useState } from "react";
import SettingsFold from "@/components/studio2/SettingsFold";
import { employmentRuleProblems } from "@/modules/hr/leaveBalance";

// THE STUDIO'S EMPLOYMENT RULES — tier 6. Leave allowances per type, the
// longer-service figure, carry-over, and whether leave counts working days.
//
// IT VALIDATES WITH THE SERVER'S OWN FUNCTION (`employmentRuleProblems`, pure),
// so the screen refuses exactly what the settings route refuses, in the
// reader's language, before the round trip. The whole set is sent on every
// save, because the route stores what it is sent.

const INPUT = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60 dark:border-white/15 dark:bg-[#191921] dark:text-white";
const BTN = "rounded-full bg-brand-700 px-4 py-2 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60";
const FIELDS = ["days", "afterYears", "daysAfter", "carryOver"];

const draftFrom = (rules, types) => ({
  workingDays: Boolean(rules?.workingDays),
  leave: Object.fromEntries(types.map((type) => {
    const r = rules?.leave?.[type];
    return [type, Object.fromEntries(FIELDS.map((f) => [f, r && r[f] ? String(r[f]) : ""]))];
  })),
});

// Blank days drops the type: that is "keep no balance", not a problem.
const payloadOf = (draft) => ({
  workingDays: draft.workingDays,
  leave: Object.fromEntries(Object.entries(draft.leave)
    .filter(([, r]) => String(r.days).trim())
    .map(([type, r]) => [type, Object.fromEntries(FIELDS.map((f) => [f, String(r[f]).trim()]))])),
});

export default function EmploymentRulesPanel({ rules, leaveTypes = [], canManage, onSave, tr }) {
  const [draft, setDraft] = useState(() => draftFrom(rules, leaveTypes));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const problems = useMemo(
    () => employmentRuleProblems(payloadOf(draft), leaveTypes).map((p) => tr.ruleProblem(p.type, p.field)),
    [draft, leaveTypes, tr],
  );

  const set = (type, field, value) => {
    setSaved(false);
    setDraft((d) => ({ ...d, leave: { ...d.leave, [type]: { ...d.leave[type], [field]: value } } }));
  };

  async function save() {
    if (problems.length) return;
    setBusy(true);
    const ok = await onSave({ employmentRules: payloadOf(draft) });
    setBusy(false);
    setSaved(ok !== false);
  }

  const heads = [tr.leaveDaysCol, tr.leaveAfterCol, tr.leaveDaysAfterCol, tr.leaveCarryCol];

  return (
    <SettingsFold heading={tr.employmentHeading} lead={tr.employmentLead}>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="text-xs text-slate-500 dark:text-slate-400">
              <th className="py-2 pe-3 text-start font-600">{tr.leaveTypeCol}</th>
              {heads.map((h) => <th key={h} className="py-2 pe-3 text-start font-600">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {leaveTypes.map((type) => (
              <tr key={type}>
                <td className="py-1.5 pe-3 font-600 text-slate-800 dark:text-slate-200">{type}</td>
                {FIELDS.map((f, i) => (
                  <td key={f} className="py-1.5 pe-3">
                    <input className={INPUT} inputMode="decimal" value={draft.leave[type]?.[f] ?? ""}
                      disabled={!canManage} aria-label={`${type} — ${heads[i]}`}
                      onChange={(e) => set(type, f, e.target.value)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
        <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={draft.workingDays}
          disabled={!canManage}
          onChange={(e) => { setSaved(false); setDraft((d) => ({ ...d, workingDays: e.target.checked })); }} />
        {tr.leaveWorkingDays}
      </label>

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
