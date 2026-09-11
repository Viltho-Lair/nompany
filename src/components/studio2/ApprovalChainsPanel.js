"use client";

import { useMemo, useState } from "react";
import SettingsFold from "@/components/studio2/SettingsFold";
import SelectMenu from "@/components/fields/SelectMenu";
import { SEEDED_CHAINS, chainProblems } from "@/platform/approval/chains";
import { STUDIO_EDITABLE_CHAINS } from "@/platform/approval/store";
import { ALL_PERMISSIONS } from "@/platform/access";

// THE STUDIO'S APPROVAL CHAINS, ON ONE SCREEN — tier 5.
//
// NO SCREEN HAD EVER EDITED ONE. The docs said Finance's settings edited the
// bill chain; the only writer was an API that took every type and was the sole
// door for stock adjustments. All four are edited here now, through the one
// settings PUT, and Finance refuses them — one writer per chain.
//
// IT VALIDATES WITH THE SERVER'S OWN FUNCTION (`chainProblems`, pure), so the
// screen refuses exactly what the route refuses and says so in the same words
// before the round trip.
//
// A STEP OFFERS ITS OWN CHAIN'S RIGHTS, read off the seed — "approve" and
// "approve above the limit" for that document type — plus whatever the studio
// already stored. A list of two hundred permission keys is where a step naming
// something nobody holds gets typed.
//
// ALL FOUR ARE SENT ON EVERY SAVE, because the route stores what it is sent as
// the whole set; a chain identical to its seed is dropped there, so saving
// without changing anything forks nothing.

const INPUT = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60 dark:border-white/15 dark:bg-[#191921] dark:text-white";
const BTN = "rounded-full bg-brand-700 px-4 py-2 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60";
const BTN_GHOST = "rounded-full border border-slate-200 px-3 py-1.5 font-display text-xs font-600 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5";

const copy = (chains) => Object.fromEntries(STUDIO_EDITABLE_CHAINS.map((type) => {
  const chain = chains?.[type] || SEEDED_CHAINS[type];
  return [type, { ...chain, type, steps: (chain?.steps || []).map((s) => ({ ...s })) }];
}));

export default function ApprovalChainsPanel({ chains, canManage, onSave, tr }) {
  const [draft, setDraft] = useState(() => copy(chains));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const problems = useMemo(
    () => STUDIO_EDITABLE_CHAINS.flatMap((type) =>
      chainProblems(draft[type], ALL_PERMISSIONS).map((p) => `${tr.chainName(type)}: ${p}`)),
    [draft, tr],
  );

  const edit = (type, fn) => {
    setSaved(false);
    setDraft((d) => ({ ...d, [type]: fn({ ...d[type], steps: d[type].steps.map((s) => ({ ...s })) }) }));
  };
  const rightsFor = (type) => [...new Set([
    ...(SEEDED_CHAINS[type]?.steps || []).map((s) => s.permission),
    ...draft[type].steps.map((s) => s.permission),
  ])];

  async function save() {
    if (problems.length) return;
    setBusy(true);
    const ok = await onSave({
      approvalChains: Object.fromEntries(STUDIO_EDITABLE_CHAINS.map((type) => {
        const chain = draft[type];
        return [type, {
          type,
          ...(chain.noApprovalBelowFirstStep ? { noApprovalBelowFirstStep: true } : {}),
          steps: chain.steps.map((s) => ({ permission: s.permission, from: Number(s.from) || 0, label: String(s.label || "").trim() })),
        }];
      })),
    });
    setBusy(false);
    setSaved(ok !== false);
  }

  return (
    <SettingsFold heading={tr.approvalsHeading} lead={tr.approvalsLead}>
      <div className="mt-4 space-y-6">
        {STUDIO_EDITABLE_CHAINS.map((type) => {
          const chain = draft[type];
          const rights = rightsFor(type);
          return (
            <section key={type}>
              <h4 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.chainName(type)}</h4>
              <div className="mt-2 space-y-2">
                {chain.steps.map((step, i) => (
                  <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1.4fr_120px_auto] sm:items-center">
                    <input
                      className={INPUT}
                      value={step.label}
                      disabled={!canManage}
                      aria-label={`${tr.chainName(type)} — ${tr.stepLabel} ${i + 1}`}
                      placeholder={tr.stepLabel}
                      onChange={(e) => edit(type, (c) => { c.steps[i].label = e.target.value; return c; })}
                    />
                    <SelectMenu
                      className={INPUT}
                      value={step.permission}
                      disabled={!canManage}
                      aria-label={`${tr.chainName(type)} — ${tr.stepRight} ${i + 1}`}
                      options={rights.map((p) => ({ value: p, label: tr.rightName(p) }))}
                      onChange={(v) => edit(type, (c) => { c.steps[i].permission = v; return c; })}
                    />
                    <input
                      type="number" min="0"
                      className={INPUT}
                      value={step.from}
                      disabled={!canManage}
                      title={tr.stepFromHint}
                      aria-label={`${tr.chainName(type)} — ${tr.stepFrom} ${i + 1}`}
                      onChange={(e) => edit(type, (c) => { c.steps[i].from = e.target.value; return c; })}
                    />
                    {canManage && (
                      <button
                        type="button"
                        className="justify-self-start px-1.5 text-slate-400 transition-colors hover:text-rose-600 disabled:opacity-40"
                        aria-label={`${tr.removeStep} ${i + 1}`}
                        disabled={chain.steps.length === 1}
                        onClick={() => edit(type, (c) => { c.steps.splice(i, 1); return c; })}
                      >×</button>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {canManage && (
                  <button
                    type="button"
                    className={BTN_GHOST}
                    onClick={() => edit(type, (c) => {
                      const unused = rights.find((p) => !c.steps.some((s) => s.permission === p)) || rights[0];
                      const last = c.steps[c.steps.length - 1];
                      c.steps.push({ permission: unused, from: Number(last?.from) || 0, label: "" });
                      return c;
                    })}
                  >
                    {tr.addStep}
                  </button>
                )}
                <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-brand-600"
                    checked={Boolean(chain.noApprovalBelowFirstStep)}
                    disabled={!canManage}
                    onChange={(e) => edit(type, (c) => ({ ...c, noApprovalBelowFirstStep: e.target.checked }))}
                  />
                  {tr.noneBelowFirst}
                </label>
              </div>
            </section>
          );
        })}
      </div>

      {problems.length > 0 && (
        <ul className="mt-4 space-y-1 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
          {problems.map((p) => <li key={p}>{p}</li>)}
        </ul>
      )}

      {canManage && (
        <div className="mt-4">
          <button className={BTN} onClick={save} disabled={busy || problems.length > 0}>
            {busy ? tr.saving : saved ? tr.approvalsSaved : tr.saveApprovals}
          </button>
        </div>
      )}
    </SettingsFold>
  );
}
