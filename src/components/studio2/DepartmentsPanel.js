// THE STUDIO'S OWN ORG CHART — Master data's second register.
//
// WHAT IT REPLACES ON SCREEN. This list used to be the product's sections: the
// HR headcount strip showed sixteen "departments", which were the fifteen nav
// entries plus Tasks, four of them screens that render nothing. A construction
// company was being offered Manufacturing & Production and Reports & BI as
// parts of its org chart. These are the studio's own rows now.
//
// THREE GATES, NOT ONE — the same ladder LocationsPanel takes, and for the same
// reason: Master data carries full CRUD, so adding, editing and deleting are
// asked separately and a button is drawn only where the write would be
// accepted.
//
// THE TREE IS DRAWN BY THE FUNCTION THE SCOPE USES. `orderedTree` is the same
// pure module `subtreeIds` lives in, which is what stops the screen's idea of
// who sits under whom from drifting from the server's idea of who a manager may
// see. Two walks would be two answers to one question.
"use client";
import { useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { operationsDict } from "@/shared/studio/operations";
import { orderedTree } from "@/shared/departments/tree";
import { Dialog, panel, btn, btnGhost, Empty } from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";

const btnDanger = "rounded-full border border-rose-200 px-4 py-2 font-display text-sm font-600 text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-60 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10";

// Section keys are the product's, so their labels come from the nav the studio
// is already reading rather than from a second list here — `sectionNames` is
// built by the screen from what it was served.
export default function DepartmentsPanel({
  rows, missing, sectionKeys, sectionNames, people,
  canCreate, canManage, canDelete, busy, send,
}) {
  const tr = operationsDict(useStudioLocale());
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);

  const tree = orderedTree(rows);
  const nameOf = (id) => rows.find((d) => d.id === id)?.name || "";
  const close = () => { setAdding(false); setEditing(null); };

  // A department may not be its own parent, and offering itself in the picker
  // is how somebody discovers that by being refused. Its DESCENDANTS are left
  // in: re-parenting under one of them is a real cycle, and the server refuses
  // it by name — a picker that silently omitted them would leave the studio
  // wondering where the row went.
  const parentOptions = [
    { value: "", label: tr.topLevel },
    ...tree.filter((d) => d.id !== editing?.id)
      .map((d) => ({ value: d.id, label: `${"— ".repeat(d.depth)}${d.name}` })),
  ];

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        {canCreate && <button className={btn} onClick={() => setAdding(true)}>{tr.addDepartment}</button>}
        {/* OFFERED, NEVER APPLIED. A studio that changed its field of work sees
            what the standard chart for the new trade would add and decides for
            itself — re-seeding on its behalf would overwrite an org chart it
            had already edited. */}
        {canCreate && missing.length > 0 && (
          <button className={btnGhost} disabled={busy} onClick={() => send("POST", { action: "add-standard" })}>
            {tr.addStandardDepartments}
          </button>
        )}
      </div>
      {missing.length > 0 && (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{tr.standardMissing(missing)}</p>
      )}

      {(adding || editing) && (
        <Dialog
          title={editing ? tr.editDepartment : tr.newDepartment}
          description={tr.departmentsOrgChart}
          onClose={close}
        >
          <DepartmentForm
            row={editing}
            busy={busy}
            parentOptions={parentOptions}
            sectionKeys={sectionKeys}
            sectionNames={sectionNames}
            people={people}
            tr={tr}
            onCancel={close}
            onSave={async (v) => {
              const ok = await send(editing ? "PUT" : "POST", editing ? { ...v, id: editing.id } : v);
              if (ok) close();
            }}
          />
        </Dialog>
      )}

      {rows.length === 0 ? (
        <Empty title={tr.noDepartmentsYet} body={tr.departmentsOrgChart} />
      ) : (
        <section className={`${panel} mt-4`}>
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {tree.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                {/* Indented by depth with a logical property, so the chart
                    mirrors in Arabic without a second rule. */}
                <div className="min-w-0" style={{ paddingInlineStart: `${d.depth * 1.25}rem` }}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-600 text-slate-900 dark:text-white">{d.name}</span>
                    {d.code && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-xs font-600 text-slate-500 dark:bg-white/5 dark:text-slate-400">
                        {d.code}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {d.parentId && <span>{tr.reportsInto}: {nameOf(d.parentId) || tr.unplaced}  ·  </span>}
                    <span>
                      {tr.worksIn}: {(d.sectionKeys || []).length
                        ? d.sectionKeys.map((k) => sectionNames[k] || k).join(", ")
                        : "—"}
                    </span>
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {canManage && <button className={btnGhost} onClick={() => setEditing(d)}>{tr.edit}</button>}
                  {canDelete && (
                    <button className={btnDanger} disabled={busy} onClick={() => send("DELETE", { id: d.id })}>
                      {tr.delete}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function DepartmentForm({ row, busy, parentOptions, sectionKeys, sectionNames, people, tr, onCancel, onSave }) {
  const [form, setForm] = useState({
    name: row?.name || "",
    code: row?.code || "",
    parentId: row?.parentId || "",
    managerCollaboratorId: row?.managerCollaboratorId || "",
    sectionKeys: row?.sectionKeys || [],
  });
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleSection = (key) => setForm((f) => ({
    ...f,
    sectionKeys: f.sectionKeys.includes(key)
      ? f.sectionKeys.filter((k) => k !== key)
      : [...f.sectionKeys, key],
  }));

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tr.name} value={form.name} onChange={set("name")} />
        <Field label={tr.code} value={form.code} onChange={set("code")} />
        <Field as="select" label={tr.reportsInto} value={form.parentId} onChange={set("parentId")}
          options={parentOptions} />
        <Field as="select" label={tr.manager} value={form.managerCollaboratorId}
          onChange={set("managerCollaboratorId")}
          options={[{ value: "", label: "—" },
            ...people.map((p) => ({ value: p.id, label: p.alias || "Unnamed" }))]} />
      </div>

      <div>
        <p className="text-[11px] font-600 uppercase tracking-wide text-slate-400">{tr.worksIn}</p>
        <div className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
          {sectionKeys.map((key) => (
            <label key={key} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5">
              <input type="checkbox" className="h-4 w-4 shrink-0 accent-brand-600"
                checked={form.sectionKeys.includes(key)} onChange={() => toggleSection(key)} />
              <span className="min-w-0 flex-1 truncate">{sectionNames[key] || key}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button className={btnGhost} onClick={onCancel}>{tr.cancel}</button>
        <button className={btn} disabled={busy || !form.name.trim()} onClick={() => onSave(form)}>
          {busy ? tr.saving : tr.save}
        </button>
      </div>
    </div>
  );
}
