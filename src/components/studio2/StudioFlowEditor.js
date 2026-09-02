"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { stageLabel } from "@/shared/studio/stages";
// PURE, AND THEREFORE SAFE TO IMPORT INTO A BROWSER BUNDLE — the same reason
// StudioEngagements imports the registry directly. Nothing in
// platform/engagement touches Redis or Postgres, so the stage vocabulary and
// the validation rules a studio is about to break are the SAME code the server
// will judge their edit with, rather than a second copy that could disagree
// about what is allowed.
import { STAGE_REGISTRY } from "@/platform/engagement/registry";
import { BILLING_TRIGGERS, FLOW_TEMPLATES, templateProblems } from "@/platform/engagement/templates";
import { btn, btnGhost, btnRow, btnRowDanger, input, label as labelCls } from "@/components/studio2/ui";

const ALL_STAGES = Object.keys(STAGE_REGISTRY);
const SEEDS = new Map(FLOW_TEMPLATES.map((t) => [t.id, t]));

// WHETHER A BUILT-IN HAS BEEN EDITED, worked out here rather than asked for.
//
// The server merges seeds with a studio's overrides and returns one list, which
// is the right answer for every other reader — nothing else cares where a row
// came from. This screen does, because "Revert to built-in" and "Delete" are
// the same button doing two very different things, and a studio should be able
// to tell which before pressing it.
//
// Compared field by field against the seed the client already has in its bundle
// (templateProblems defaults to FLOW_TEMPLATES, so it was loaded either way).
// JSON.stringify of the whole row would answer this wrongly: the stored
// override is written by a different path and its keys need not be in the same
// order as the literal's.
const canon = (t) => JSON.stringify([
  t.name, [...(t.stages || [])], [...(t.heads || [])], [...(t.statusChain || [])],
  [...(t.costDrivers || [])], t.billingTrigger,
  Object.entries(t.cardinalityOverrides || {}).sort(),
]);
const isEdited = (t) => {
  const seed = SEEDS.get(t.id);
  return Boolean(seed) && canon(seed) !== canon(t);
};
const BANNER_BAD = "rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300";
const CHIP = "rounded-full border px-3 py-1 text-xs font-600 transition-colors";

/**
 * THE FLOW EDITOR — a studio's own flow templates and industries (Law 2).
 *
 * `tr` ARRIVES AS A PROP rather than through StudioSettings' words context.
 * That context is deliberately not exported: this component is imported BY
 * StudioSettings, so reading the context from it would close an import cycle
 * for the sake of one value that one component needs. The context exists there
 * because eleven components in that file need the words; here there is one.
 */
export default function StudioFlowEditor({ slug, tr }) {
  const locale = useStudioLocale();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState(null); // the template being edited, as a working copy

  // THE FETCH IS SEPARATE FROM THE STATE IT FEEDS, and both callers await it.
  //
  // The obvious shape — a `load()` that fetches AND sets state, called straight
  // from an effect body — is the one pattern this file may not use: it is the
  // largest warning class in the repo's lint backlog, and that backlog is
  // shrink-only, so a new file adding to it fails the build rather than merely
  // joining a crowd. Splitting it is better anyway. Every setState below
  // happens after an await, behind an `alive` check, so a studio that navigates
  // away mid-request does not have this component write to state it no longer
  // owns — which the called-from-the-effect version did on every unmount.
  const fetchFlows = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/settings/flows`, { cache: "no-store" });
    return res.ok ? await res.json() : null;
  }, [slug]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const next = await fetchFlows();
      if (!alive) return;
      if (next) setData(next); else setError(tr.flowsLoadFailed);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [fetchFlows, tr]);

  // ONE WRITER FOR BOTH SUBJECTS, and it always re-reads rather than assuming.
  // A saved template can change what an industry is allowed to point at, so the
  // screen's idea of either is only ever the server's most recent answer.
  const send = useCallback(async (body) => {
    setBusy(true); setError("");
    const res = await fetch(`/api/studios/${slug}/settings/flows`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      // The refusal's own words, not a generic failure. flows.ts produced them
      // about this edit, and they are the reason validating on write is worth
      // doing at all.
      setError(b.detail ? tr.flowRefused(b.detail) : tr.flowsLoadFailed);
      return false;
    }
    const next = await fetchFlows();
    if (next) setData(next);
    return true;
  }, [slug, tr, fetchFlows]);

  const drop = useCallback(async (query) => {
    setBusy(true); setError("");
    const res = await fetch(`/api/studios/${slug}/settings/flows?${query}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) { setError(tr.flowsLoadFailed); return; }
    const next = await fetchFlows();
    if (next) setData(next);
  }, [slug, tr, fetchFlows]);

  if (loading) {
    return (
      <section className="mt-8 rounded-geex border border-slate-200/70 p-5 dark:border-white/10">
        <div className="skel skel-text w-40" />
        <div className="mt-4 grid gap-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skel skel-text w-full" />)}
        </div>
      </section>
    );
  }
  if (!data) return <p className={`${BANNER_BAD} mt-8`}>{tr.flowsLoadFailed}</p>;

  const canManage = data.canManage;

  return (
    <section className="mt-8 rounded-geex border border-slate-200/70 p-5 dark:border-white/10">
      <h3 className="font-display text-base font-700 text-slate-900 dark:text-white">{tr.flowsHeading}</h3>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        {tr.flowsLead}
        {!canManage && tr.flowsAdminOnly}
      </p>

      {error && <p className={`${BANNER_BAD} mt-3`}>{error}</p>}

      <div className="mt-4 grid gap-2">
        {data.templates.map((t) => (
          <TemplateRow
            key={t.id}
            template={t}
            tr={tr}
            canManage={canManage}
            busy={busy}
            onEdit={() => setDraft(cloneTemplate(t))}
            onClone={() => setDraft({ ...cloneTemplate(t), id: freeId(data.templates), name: `${t.name} (2)` })}
            onRevert={() => drop(`template=${encodeURIComponent(t.id)}`)}
          />
        ))}
      </div>

      {draft && (
        <TemplateEditor
          draft={draft}
          setDraft={setDraft}
          tr={tr}
          locale={locale}
          busy={busy}
          onCancel={() => setDraft(null)}
          onSave={async () => { if (await send({ template: draft })) setDraft(null); }}
        />
      )}

      <Industries
        industries={data.industries}
        templates={data.templates}
        tr={tr}
        canManage={canManage}
        busy={busy}
        onSave={(industry) => send({ industry })}
        onDrop={(key) => drop(`industry=${encodeURIComponent(key)}`)}
      />
    </section>
  );
}

// A WORKING COPY, MUTABLE. The server sends frozen-shaped rows and the editor
// reorders arrays in place-ish; copying every array once here is cheaper than
// remembering not to mutate one of five.
function cloneTemplate(t) {
  return {
    id: t.id, name: t.name,
    stages: [...(t.stages || [])],
    heads: [...(t.heads || [])],
    statusChain: [...(t.statusChain || [])],
    costDrivers: [...(t.costDrivers || [])],
    billingTrigger: t.billingTrigger || "",
    cardinalityOverrides: { ...(t.cardinalityOverrides || {}) },
  };
}

/** A duplicate needs an id nothing else holds — the first letter that is free. */
function freeId(templates) {
  const taken = new Set(templates.map((t) => t.id));
  for (const c of "HIJKLMNOPQRSTUVWXYZ") if (!taken.has(c)) return c;
  return `T${Date.now().toString(36).slice(-4)}`;
}

function TemplateRow({ template, tr, canManage, busy, onEdit, onClone, onRevert }) {
  // BUILT-IN, EDITED, OR THEIRS — and the studio should be able to tell at a
  // glance, because "Revert to built-in" and "Delete" are the same button doing
  // two very different things depending on which this is.
  const isSeed = "ABCDEFG".includes(template.id) && template.id.length === 1;
  const badge = !isSeed ? tr.flowYours : isEdited(template) ? tr.flowEdited : tr.flowBuiltIn;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-[var(--geex-surface)] px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-600 text-slate-900 dark:text-white">{template.name}</p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
          {tr.flowStageCount((template.stages || []).length)}
          {" · "}
          {tr.billingNames[template.billingTrigger] || template.billingTrigger}
        </p>
      </div>
      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-600 text-slate-600 dark:bg-white/5 dark:text-slate-300">
        {badge}
      </span>
      {canManage && (
        <div className="flex flex-wrap gap-2 text-xs">
          <button type="button" className={btnRow} disabled={busy} onClick={onEdit}>{tr.flowEdit}</button>
          <button type="button" className={btnRow} disabled={busy} onClick={onClone}>{tr.flowClone}</button>
          <button type="button" className={btnRowDanger} disabled={busy} onClick={onRevert}>
            {isSeed ? tr.flowRevert : tr.flowDelete}
          </button>
        </div>
      )}
    </div>
  );
}

function TemplateEditor({ draft, setDraft, tr, locale, busy, onCancel, onSave }) {
  const set = (patch) => setDraft({ ...draft, ...patch });

  // VALIDATED AS THEY TYPE, by the SAME function the server refuses with. Not a
  // replacement for the server's check — the door still refuses — but the
  // difference between hearing "statusChain names a stage you removed" while
  // the stage list is still on screen and hearing it after a round trip.
  const problems = useMemo(
    () => templateProblems(ALL_STAGES, [draft]),
    [draft],
  );

  return (
    <div className="mt-4 rounded-geex border border-brand-200 p-4 dark:border-brand-500/30">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={labelCls}>{tr.flowNameLabel}</span>
          <input className={input} value={draft.name} onChange={(e) => set({ name: e.target.value })} />
        </label>
        <label className="block">
          <span className={labelCls}>{tr.flowBillingLabel}</span>
          <select className={input} value={draft.billingTrigger} onChange={(e) => set({ billingTrigger: e.target.value })}>
            <option value="">—</option>
            {BILLING_TRIGGERS.map((b) => (
              <option key={b} value={b}>{tr.billingNames[b] || b}</option>
            ))}
          </select>
        </label>
      </div>

      <OrderedStages
        legend={tr.flowStagesLabel}
        value={draft.stages}
        options={ALL_STAGES}
        tr={tr}
        locale={locale}
        empty={tr.flowNoStages}
        onChange={(stages) => {
          // REMOVING A STAGE PRUNES EVERY LIST THAT NAMED IT. Leaving them
          // would produce three refusals at the door for one edit the studio
          // thinks they made once — and the fix ("also remove it from heads")
          // is not something the screen should make them work out.
          const keep = new Set(stages);
          set({
            stages,
            heads: draft.heads.filter((s) => keep.has(s)),
            statusChain: draft.statusChain.filter((s) => keep.has(s)),
            costDrivers: draft.costDrivers.filter((s) => keep.has(s)),
            cardinalityOverrides: Object.fromEntries(
              Object.entries(draft.cardinalityOverrides).filter(([s]) => keep.has(s)),
            ),
          });
        }}
      />

      <OrderedStages
        legend={tr.flowStatusChainLabel}
        value={draft.statusChain}
        options={draft.stages}
        tr={tr}
        locale={locale}
        onChange={(statusChain) => set({ statusChain })}
      />

      <StageChecks
        legend={tr.flowHeadsLabel}
        value={draft.heads}
        options={draft.stages}
        locale={locale}
        onChange={(heads) => set({ heads })}
      />

      <StageChecks
        legend={tr.flowCostDriversLabel}
        value={draft.costDrivers}
        options={draft.stages}
        locale={locale}
        onChange={(costDrivers) => set({ costDrivers })}
      />

      <fieldset className="mt-4">
        <legend className={labelCls}>{tr.flowCardinalityLabel}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {draft.stages.map((s) => (
            <label key={s} className="flex items-center gap-2 text-sm">
              <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200">
                {stageLabel(s, STAGE_REGISTRY[s]?.label || s, locale)}
              </span>
              <select
                className={`${input} w-auto`}
                value={draft.cardinalityOverrides[s] || ""}
                onChange={(e) => {
                  const next = { ...draft.cardinalityOverrides };
                  if (e.target.value) next[s] = e.target.value; else delete next[s];
                  set({ cardinalityOverrides: next });
                }}
              >
                <option value="">{tr.flowCardDefault}</option>
                <option value="one">{tr.flowOne}</option>
                <option value="many">{tr.flowMany}</option>
              </select>
            </label>
          ))}
        </div>
      </fieldset>

      {problems.length > 0 && (
        <ul className={`${BANNER_BAD} mt-4 list-disc ps-6`}>
          {problems.map((p) => <li key={p}>{p}</li>)}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={btn} disabled={busy || problems.length > 0} onClick={onSave}>
          {busy ? tr.saving : tr.save}
        </button>
        <button type="button" className={btnGhost} disabled={busy} onClick={onCancel}>{tr.flowClose}</button>
      </div>
    </div>
  );
}

/**
 * An ORDERED list of stages: the sequence is the meaning.
 *
 * Up/down buttons rather than drag-and-drop, deliberately. Order matters twice
 * here — the stage list is the shape of the work and the status chain is a
 * precedence — and a keyboard user reordering a precedence with a pointer
 * gesture is not a thing this screen should require.
 */
function OrderedStages({ legend, value, options, tr, locale, empty, onChange }) {
  const available = options.filter((s) => !value.includes(s));
  const move = (i, by) => {
    const next = [...value];
    const j = i + by;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <fieldset className="mt-4">
      <legend className={labelCls}>{legend}</legend>
      {value.length === 0 && empty && (
        <p className="text-sm text-slate-400 dark:text-slate-500">{empty}</p>
      )}
      <ol className="grid gap-1.5">
        {value.map((s, i) => (
          <li key={s} className="flex items-center gap-2 rounded-lg bg-[var(--geex-surface)] px-3 py-1.5">
            <span className="num w-6 shrink-0 text-xs text-slate-400">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate text-sm text-slate-800 dark:text-slate-100">
              {stageLabel(s, STAGE_REGISTRY[s]?.label || s, locale)}
            </span>
            <button type="button" className={btnRow} aria-label={tr.flowMoveUp} onClick={() => move(i, -1)}>↑</button>
            <button type="button" className={btnRow} aria-label={tr.flowMoveDown} onClick={() => move(i, 1)}>↓</button>
            <button
              type="button"
              className={btnRowDanger}
              aria-label={tr.flowRemove}
              onClick={() => onChange(value.filter((x) => x !== s))}
            >
              ✕
            </button>
          </li>
        ))}
      </ol>
      {available.length > 0 && (
        <select
          className={`${input} mt-2`}
          value=""
          onChange={(e) => e.target.value && onChange([...value, e.target.value])}
        >
          <option value="">{tr.flowAddStage}</option>
          {available.map((s) => (
            <option key={s} value={s}>{stageLabel(s, STAGE_REGISTRY[s]?.label || s, locale)}</option>
          ))}
        </select>
      )}
    </fieldset>
  );
}

/** An UNORDERED set of stages — heads and cost drivers are memberships, not sequences. */
function StageChecks({ legend, value, options, locale, onChange }) {
  return (
    <fieldset className="mt-4">
      <legend className={labelCls}>{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((s) => {
          const on = value.includes(s);
          return (
            <button
              key={s}
              type="button"
              aria-pressed={on}
              className={`${CHIP} ${on
                ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300"
                : "border-slate-200 text-slate-600 dark:border-white/15 dark:text-slate-300"}`}
              onClick={() => onChange(on ? value.filter((x) => x !== s) : [...value, s])}
            >
              {stageLabel(s, STAGE_REGISTRY[s]?.label || s, locale)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * WHICH FLOW A TRADE STARTS ON.
 *
 * The templates are only half of Law 2: a studio that has built its own flow
 * still needs to say which work goes on it, and that is what an industry is —
 * the row a new deal reads to pick its template.
 */
function Industries({ industries, templates, tr, canManage, busy, onSave, onDrop }) {
  const [open, setOpen] = useState("");
  const [adding, setAdding] = useState(false);
  const blank = { key: "", name: "", primary: templates[0]?.id || "", secondary: "", note: "" };
  const editing = adding ? blank : industries.find((i) => i.key === open);

  return (
    <div className="mt-8">
      <h4 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.industriesHeading}</h4>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{tr.industriesLead}</p>

      <div className="mt-3 grid gap-1.5">
        {industries.map((i) => (
          <div key={i.key} className="flex flex-wrap items-center gap-3 rounded-xl bg-[var(--geex-surface)] px-4 py-2.5">
            <span className="min-w-0 flex-1 truncate text-sm text-slate-800 dark:text-slate-100">{i.name}</span>
            <span className="truncate text-xs text-slate-500 dark:text-slate-400">
              {templates.find((t) => t.id === i.primary)?.name || i.primary}
            </span>
            {canManage && (
              <button
                type="button"
                className={btnRow}
                disabled={busy}
                onClick={() => { setAdding(false); setOpen(open === i.key ? "" : i.key); }}
              >
                {tr.flowEdit}
              </button>
            )}
          </div>
        ))}
      </div>

      {canManage && (
        <button
          type="button"
          className={`${btnGhost} mt-3`}
          disabled={busy}
          onClick={() => { setOpen(""); setAdding(true); }}
        >
          {tr.industryAdd}
        </button>
      )}

      {editing && (
        <IndustryForm
          key={editing.key || "new"}
          entry={editing}
          isNew={adding}
          templates={templates}
          tr={tr}
          busy={busy}
          onCancel={() => { setOpen(""); setAdding(false); }}
          onSave={async (next) => { if (await onSave(next)) { setOpen(""); setAdding(false); } }}
          onDrop={() => { onDrop(editing.key); setOpen(""); }}
        />
      )}
    </div>
  );
}

function IndustryForm({ entry, isNew, templates, tr, busy, onCancel, onSave, onDrop }) {
  const [form, setForm] = useState(entry);
  const set = (patch) => setForm({ ...form, ...patch });

  // THE KEY IS DERIVED FROM THE NAME, and only for a new row. It is an
  // identifier a deal stores, so changing it later would orphan every deal that
  // named it — which is why an existing row's key is shown and never edited.
  const key = isNew
    ? form.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    : form.key;

  return (
    <div className="mt-3 rounded-geex border border-brand-200 p-4 dark:border-brand-500/30">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className={labelCls}>{tr.industryNameLabel}</span>
          <input className={input} value={form.name} onChange={(e) => set({ name: e.target.value })} />
        </label>
        <label className="block">
          <span className={labelCls}>{tr.industryPrimary}</span>
          <select className={input} value={form.primary} onChange={(e) => set({ primary: e.target.value })}>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>{tr.industrySecondary}</span>
          <select className={input} value={form.secondary} onChange={(e) => set({ secondary: e.target.value })}>
            <option value="">{tr.industryNone}</option>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>{tr.industryNote}</span>
          <input className={input} value={form.note} onChange={(e) => set({ note: e.target.value })} />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={btn}
          disabled={busy || !key || !form.name.trim()}
          onClick={() => onSave({ ...form, key })}
        >
          {busy ? tr.saving : tr.save}
        </button>
        <button type="button" className={btnGhost} disabled={busy} onClick={onCancel}>{tr.flowClose}</button>
        {!isNew && (
          <button type="button" className={btnRowDanger} disabled={busy} onClick={onDrop}>{tr.flowRevert}</button>
        )}
      </div>
    </div>
  );
}
