"use client";

// THE DEAL FLOWS BOARD (05/10/2026) — the owner: "I should run nompany, not the
// flow … let the users feel free to improve their own flow based on their
// requirements with less steps and less code, less complexity and more
// interaction."
//
// One page per flow: its steps in order, the deals AT each step now, how many
// are late against the step's target, and the target itself — with the number
// the studio's own deals suggest, one click to take. Editing is the same page:
// move a step, drop one, add one, type a number. Everything a flow carried
// besides its steps follows from them on the server (`deriveFlowShape`), so
// there is nothing else to ask.
//
// THE SERVER DECIDES WHAT IS SOUND (modules/main/flowSteps `stepTargetProblem`)
// and refuses in words; this screen only keeps a draft and sends it.

import { useCallback, useMemo, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { dealFlowsDict } from "@/shared/studio/dealFlows";
import { stageLabel } from "@/shared/studio/stages";
import { useReload } from "@/components/studio2/useReload";
import { Icon } from "@/components/studio2/icons";
import { Dialog, btn, btnGhost, btnRow, btnRowDanger, input } from "@/components/studio2/ui";
import SelectMenu from "@/components/fields/SelectMenu";

const draftOf = (flow) => ({
  id: flow.id,
  name: flow.name,
  stages: flow.steps.map((s) => s.type),
  targets: Object.fromEntries(flow.steps.map((s) => [s.type, { days: s.target.days ?? "", from: s.target.from || "" }])),
});

const sameDraft = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export default function DealFlowsBoard({ slug }) {
  const locale = useStudioLocale();
  const tr = dealFlowsDict(locale);
  const word = useCallback((type, fallback) => stageLabel(type, fallback || type, locale), [locale]);
  const [data, setData] = useState(null);
  const [problem, setProblem] = useState("");
  const [openId, setOpenId] = useState("");
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(null);
  const [removing, setRemoving] = useState(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/main/flows`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setProblem(res.status === 403 ? tr.noAccess : tr.refusal(body.detail || body.error || "")); return; }
    setData(body);
    setProblem("");
  }, [slug, tr]);
  useReload(load);

  const flow = useMemo(() => {
    if (!data) return null;
    return data.flows.find((f) => f.id === openId) || data.flows.find((f) => f.isDefault) || data.flows[0] || null;
  }, [data, openId]);
  const base = useMemo(() => (flow ? draftOf(flow) : null), [flow]);
  const current = draft && flow && draft.id === flow.id ? draft : base;
  const dirty = Boolean(draft && base && draft.id === base.id && !sameDraft(draft, base));
  const canManage = Boolean(data?.canManage);

  async function post(payload) {
    setBusy(true); setProblem("");
    const res = await fetch(`/api/studios/${slug}/main/flows`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setProblem(tr.refusal(body.detail || body.error || "")); return null; }
    await load();
    return body;
  }

  const edit = (patch) => setDraft({ ...current, ...patch });
  const setTarget = (step, patch) => edit({ targets: { ...current.targets, [step]: { ...(current.targets[step] || { days: "", from: "" }), ...patch } } });
  const move = (i, by) => {
    const stages = [...current.stages];
    const j = i + by;
    if (j < 0 || j >= stages.length) return;
    [stages[i], stages[j]] = [stages[j], stages[i]];
    edit({ stages });
  };

  async function save() {
    const targets = {};
    for (const step of current.stages) {
      const t = current.targets[step] || { days: "", from: "" };
      targets[step] = { days: t.days === "" ? null : Number(t.days), from: t.from || "" };
    }
    const ok = await post({ action: "save", flow: { id: current.id, name: current.name, stages: current.stages, targets } });
    if (ok) setDraft(null);
  }

  if (!data) return problem ? <p className="text-sm text-rose-600 dark:text-rose-300">{problem}</p> : <p className="text-sm text-slate-400">{tr.loading}</p>;
  if (!flow) return null;

  const stepsById = Object.fromEntries(flow.steps.map((s) => [s.type, s]));
  const addable = data.stepTypes.filter((t) => !current.stages.includes(t));

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500 dark:text-slate-400">{tr.lead}</p>

      {/* THE STUDIO'S FLOWS, as tabs — most studios have one, and then this is
          just its name. */}
      <div className="flex flex-wrap items-center gap-2">
        {data.flows.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => { setOpenId(f.id); setDraft(null); }}
            className={`rounded-full px-4 py-1.5 font-display text-sm font-600 transition-colors ${f.id === flow.id
              ? "bg-brand-700 text-white"
              : "border border-slate-200 text-[var(--geex-muted)] hover:bg-slate-50 dark:border-white/15 dark:hover:bg-white/5"}`}
          >
            {f.name}
          </button>
        ))}
        {canManage && (
          <button type="button" className={btnRow} onClick={() => setAdding({ from: flow.id, name: "" })}>
            + {tr.addFlow}
          </button>
        )}
      </div>

      {problem && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{problem}</p>}

      <section className="rounded-geex border border-slate-200/70 bg-[var(--geex-surface)] p-5 dark:border-white/10 sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {canManage ? (
              <input
                aria-label={tr.name}
                className={`${input} max-w-sm font-display text-base font-700`}
                value={current.name}
                onChange={(e) => edit({ name: e.target.value })}
              />
            ) : (
              <h2 className="font-display text-lg font-800 text-[var(--geex-ink)]">{flow.name}</h2>
            )}
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              {tr.dealsSummary(flow.deals.open, flow.deals.done, flow.deals.cancelled)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {flow.isDefault
              ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-600 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{tr.isDefault}</span>
              : canManage && (
                <button type="button" className={btnRow} disabled={busy}
                  onClick={() => post({ action: "save", flow: { id: flow.id, isDefault: true } })}>
                  {tr.makeDefault}
                </button>
              )}
            {canManage && data.flows.length > 1 && (
              <button type="button" className={btnRowDanger} disabled={busy} onClick={() => setRemoving(flow)}>{tr.removeFlow}</button>
            )}
          </div>
        </div>

        <ol className="divide-y divide-slate-100 dark:divide-white/5">
          {current.stages.map((type, i) => {
            const s = stepsById[type];
            const t = current.targets[type] || { days: "", from: "" };
            const earlier = current.stages.slice(0, i);
            return (
              <li key={type} className="grid gap-3 py-3.5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)] lg:items-center">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-700 text-slate-500 dark:bg-white/5 dark:text-slate-400">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-700 text-[var(--geex-ink)]">{word(type, s?.label)}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {!s ? "" : !s.visible ? tr.hidden : (
                        <>
                          {tr.atStep(s.open)}
                          {s.late > 0 && <span className="font-600 text-rose-600 dark:text-rose-300"> · {tr.late(s.late)}</span>}
                          {s.judged > 0 && <> · {tr.onTime(s.met, s.judged)}</>}
                        </>
                      )}
                    </p>
                  </div>
                  {canManage && (
                    <div className="ms-auto flex shrink-0 items-center gap-1 lg:hidden">
                      <StepButtons tr={tr} i={i} last={current.stages.length - 1} onMove={move}
                        onRemove={() => edit({ stages: current.stages.filter((x) => x !== type) })} />
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {canManage ? (
                    <>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{tr.within}</span>
                      <input
                        type="number" min={1} max={3650} inputMode="numeric"
                        aria-label={`${tr.target} — ${word(type, s?.label)}`}
                        placeholder="—"
                        className={`${input} w-20 text-center`}
                        value={t.days}
                        onChange={(e) => setTarget(type, { days: e.target.value })}
                      />
                      <span className="text-xs text-slate-500 dark:text-slate-400">{tr.daysOf}</span>
                      <SelectMenu
                        aria-label={tr.daysOf}
                        className={`${input} w-auto min-w-[9rem]`}
                        value={t.from}
                        disabled={t.days === ""}
                        onChange={(v) => setTarget(type, { from: v })}
                        options={[{ value: "", label: tr.opening }, ...earlier.map((e) => ({ value: e, label: word(e, stepsById[e]?.label) }))]}
                      />
                    </>
                  ) : (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {s?.target.days
                        ? `${tr.within} ${s.target.days} ${tr.daysOf} ${s.target.from ? word(s.target.from, stepsById[s.target.from]?.label) : tr.opening}`
                        : tr.notMeasured}
                    </span>
                  )}
                  {canManage && s?.suggestion && String(t.days) !== String(s.suggestion.suggested) && (
                    <span className="flex w-full items-center gap-2 text-xs text-slate-500 dark:text-slate-400 lg:w-auto">
                      <span>{tr.suggestion(s.suggestion.average, s.suggestion.from, s.suggestion.suggested)}</span>
                      <button type="button" className={`${btnRow} text-xs`} onClick={() => setTarget(type, { days: String(s.suggestion.suggested) })}>{tr.use}</button>
                    </span>
                  )}
                  {canManage && (
                    <span className="ms-auto hidden items-center gap-1 lg:flex">
                      <StepButtons tr={tr} i={i} last={current.stages.length - 1} onMove={move}
                        onRemove={() => edit({ stages: current.stages.filter((x) => x !== type) })} />
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {canManage && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 dark:border-white/5">
            <SelectMenu
              aria-label={tr.addStep}
              className={`${input} w-auto min-w-[12rem]`}
              value=""
              placeholder={`+ ${tr.addStep}`}
              onChange={(v) => v && edit({ stages: [...current.stages, v] })}
              options={addable.map((type) => ({ value: type, label: word(type) }))}
            />
            <span className="ms-auto flex gap-2">
              {dirty && <button type="button" className={btnGhost} disabled={busy} onClick={() => setDraft(null)}>{tr.discard}</button>}
              <button type="button" className={btn} disabled={busy || !dirty} onClick={save}>{busy ? tr.saving : tr.save}</button>
            </span>
          </div>
        )}
      </section>

      <p className="text-xs text-slate-400 dark:text-slate-500">
        {tr.scanned(data.scanned, data.capped)}{data.unread > 0 && <> {tr.unread(data.unread)}</>}
      </p>

      {adding && (
        <Dialog title={tr.addFlow} onClose={() => setAdding(null)} width="max-w-[480px]">
          <div className="space-y-3">
            <label className="block text-xs font-600 text-slate-500 dark:text-slate-400">
              {tr.newFlowName}
              <input className={`${input} mt-1`} value={adding.name} onChange={(e) => setAdding({ ...adding, name: e.target.value })} />
            </label>
            <label className="block text-xs font-600 text-slate-500 dark:text-slate-400">
              {tr.addFlowFrom}
              <SelectMenu
                className={`${input} mt-1`}
                value={adding.from}
                onChange={(v) => setAdding({ ...adding, from: v })}
                options={[
                  ...data.flows.map((f) => ({ value: f.id, label: f.name, group: tr.yours })),
                  ...data.starters.filter((s) => !data.flows.some((f) => f.id === s.id)).map((s) => ({ value: s.id, label: s.name, group: tr.starter })),
                ]}
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className={btnGhost} onClick={() => setAdding(null)}>{tr.cancel}</button>
              <button type="button" className={btn} disabled={busy} onClick={async () => {
                const made = await post({ action: "add", from: adding.from, name: adding.name });
                if (made) { setAdding(null); setOpenId(made.id); setDraft(null); }
              }}>{tr.create}</button>
            </div>
          </div>
        </Dialog>
      )}

      {removing && (
        <Dialog title={tr.removeFlow} description={tr.removeFlowConfirm(removing.name)} onClose={() => setRemoving(null)} width="max-w-[480px]">
          <div className="flex justify-end gap-2">
            <button type="button" className={btnGhost} onClick={() => setRemoving(null)}>{tr.cancel}</button>
            <button type="button" className={btn} disabled={busy} onClick={async () => {
              const done = await post({ action: "remove", id: removing.id });
              setRemoving(null);
              if (done) { setOpenId(""); setDraft(null); }
            }}>{tr.removeFlow}</button>
          </div>
        </Dialog>
      )}
    </div>
  );
}

function StepButtons({ tr, i, last, onMove, onRemove }) {
  const icon = "inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-white/5 dark:hover:text-slate-200";
  return (
    <>
      <button type="button" className={icon} title={tr.moveUp} aria-label={tr.moveUp} disabled={i === 0} onClick={() => onMove(i, -1)}>
        <Icon name="arrowUp" className="h-4 w-4" />
      </button>
      <button type="button" className={icon} title={tr.moveDown} aria-label={tr.moveDown} disabled={i === last} onClick={() => onMove(i, 1)}>
        <Icon name="arrowDown" className="h-4 w-4" />
      </button>
      <button type="button" className={`${icon} hover:text-rose-600`} title={tr.removeStep} aria-label={tr.removeStep} disabled={last === 0} onClick={onRemove}>
        <Icon name="x" className="h-4 w-4" />
      </button>
    </>
  );
}
