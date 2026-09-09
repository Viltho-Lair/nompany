// THE STUDIO'S STANDARD COST CODES — Master data's third register.
//
// GROUPED IN THE READING ORDER THE SERVER SENDS, never re-sorted here. The
// route already returns `libraryView(rows)`, so the browser walks the list and
// breaks it where the group changes; sorting again on the client would be a
// second answer free to disagree with the one the seed writes into a project.
//
// RETIRE IS THE PRIMARY ACT AND DELETE IS THE EXCEPTION, which is why the
// buttons sit in that order. A code a project has taken cannot be deleted — the
// route refuses with the count — and retiring is what a studio actually wants:
// out of the picker, still readable on every job that holds it.
//
// THE DRIFT BLOCK IS ABSENT, NOT EMPTY, for a reader who may not open the
// projects. `drift` is null in that case because the server never read them,
// so there is nothing here to hide — the customer-360 rule.
"use client";
import { useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { costCodesDict } from "@/shared/studio/costCodes";
import { operationsDict } from "@/shared/studio/operations";
import { Dialog, panel, btn, btnGhost, Empty, sub } from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";

const btnDanger = "rounded-full border border-rose-200 px-4 py-2 font-display text-sm font-600 text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-60 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10";

export default function CostCodesPanel({
  codes, groups, drift, canManage, canCreate, canDelete, busy, send,
}) {
  const locale = useStudioLocale();
  const tr = costCodesDict(locale);
  const ops = operationsDict(locale);
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);

  const close = () => { setAdding(false); setEditing(null); };

  return (
    <>
      <p className={sub}>{tr.lead}</p>
      {canCreate && <button className={btn} onClick={() => setAdding(true)}>{tr.add}</button>}

      {(adding || editing) && (
        <Dialog title={editing ? tr.editCode : tr.newCode} onClose={close}>
          <CodeForm
            row={editing}
            groups={groups}
            busy={busy}
            tr={tr}
            ops={ops}
            onCancel={close}
            onSave={async (values) => {
              const payload = editing ? { ...values, id: editing.id } : values;
              if (await send(editing ? "PUT" : "POST", payload)) close();
            }}
          />
        </Dialog>
      )}

      {codes.length === 0 ? <Empty title={tr.empty} body={tr.emptyBody} /> : (
        <section className={panel}>
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {codes.map((row, i) => {
              // THE GROUP HEADING IS A CHANGE IN THE SERVER'S ORDER, not a
              // grouping computed here — see this file's header.
              const previous = i ? (codes[i - 1].group || "") : null;
              const heading = (row.group || "") !== previous
                ? (row.group || tr.ungrouped)
                : null;
              return (
                <li key={row.id} className="py-4 first:pt-0 last:pb-0">
                  {heading && (
                    <p className="mb-3 font-display text-xs font-700 uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      {heading}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="num font-600 text-slate-900 dark:text-white">{row.code}</span>
                        <span className="text-slate-600 dark:text-slate-300">{row.name}</span>
                        {row.archived && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-600 text-slate-500 dark:bg-white/5 dark:text-slate-400">
                            {tr.retired}
                          </span>
                        )}
                      </div>
                      {row.notes && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{row.notes}</p>}
                    </div>
                    {(canManage || canDelete) && (
                      <div className="flex gap-2">
                        {canManage && <button className={btnGhost} onClick={() => setEditing(row)}>{tr.edit}</button>}
                        {/* RETIRE BEFORE DELETE, deliberately: it is the act a
                            studio almost always wants, and it never destroys
                            what a running job's code means. */}
                        {canManage && (
                          <button className={btnGhost} disabled={busy}
                            onClick={() => send("PUT", { id: row.id, archived: !row.archived })}>
                            {row.archived ? tr.restore : tr.retire}
                          </button>
                        )}
                        {canDelete && (
                          <button className={btnDanger} disabled={busy}
                            onClick={() => send("DELETE", { id: row.id })}>{tr.delete}</button>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {drift && (
        <section className={panel}>
          <h3 className="font-display text-lg font-800 text-slate-900 dark:text-white">{tr.driftTitle}</h3>
          <p className={sub}>{tr.driftLead}</p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{tr.inUseCount(drift.inUse)}</p>
          {drift.offStandard.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{tr.driftNone}</p>
          ) : (
            <ul className="mt-3 space-y-1">
              {drift.offStandard.map((d) => (
                <li key={d.code} className="text-sm text-slate-700 dark:text-slate-200">
                  {tr.offStandard(d.code, d.projects)}
                </li>
              ))}
            </ul>
          )}
          {drift.unused.length > 0 && (
            <>
              <h4 className="mt-5 font-display text-sm font-700 text-slate-900 dark:text-white">{tr.unusedTitle}</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400">{tr.unusedLead}</p>
              <p className="num mt-1 text-sm text-slate-700 dark:text-slate-200">{drift.unused.join(", ")}</p>
            </>
          )}
        </section>
      )}
    </>
  );
}

function CodeForm({ row, groups, busy, tr, ops, onCancel, onSave }) {
  const [values, setValues] = useState(() => ({
    code: row?.code || "",
    name: row?.name || "",
    group: row?.group || "",
    notes: row?.notes || "",
  }));
  const set = (key) => (v) => setValues((vv) => ({ ...vv, [key]: v }));
  const ready = values.code.trim() && values.name.trim();

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tr.code} required value={values.code} onChange={set("code")} />
        <Field label={tr.name} required value={values.name} onChange={set("name")} />
        {/* FREE TEXT WITH THE STUDIO'S OWN GROUPS BESIDE IT, rather than a
            picker. A cost breakdown's top level is the studio's vocabulary, so
            the list can only come from its own rows — and typing a new one is
            how the first row in any group is ever made. A select would make
            that impossible; a select with an "other" option would make it two
            controls for one value. */}
        <div className="sm:col-span-2">
          <Field label={tr.group} value={values.group} onChange={set("group")} hint={tr.groupHint} />
          {groups.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {groups.map((g) => (
                <button key={g} type="button" onClick={() => set("group")(g)}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-600 text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5">
                  {g}
                </button>
              ))}
            </div>
          )}
        </div>
        <Field label={tr.notes} as="textarea" value={values.notes} onChange={set("notes")}
          className="sm:col-span-2" />
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button className={btn} disabled={busy || !ready} onClick={() => onSave(values)}>
          {busy ? ops.saving : ops.save}
        </button>
        <button className={btnGhost} onClick={onCancel}>{ops.cancel}</button>
      </div>
    </div>
  );
}
