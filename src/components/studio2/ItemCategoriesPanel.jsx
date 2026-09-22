"use client";

// ITEM CATEGORIES — Master data's sixth register (22/09/2026).
//
// THE TREE IS DRAWN FROM `orderedTree`, the same function the server hands the
// offers editor its list through, so the two cannot disagree about shape. A
// category carries an id, so renaming or re-nesting one touches no item and no
// offer — which is the whole reason this is a register and not a taxonomy.
//
// AND IT SAYS WHAT IT IS NOT. An item already has a "Type" that looks like a
// category and is the chosen supplier's product line; somebody arriving here
// needs telling once, on the screen, rather than discovering it when an offer
// misses half the shelf.

import { useMemo, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { itemCategoriesDict } from "@/shared/studio/itemCategories";
import { orderedTree, MAX_DEPARTMENT_DEPTH } from "@/shared/departments/tree";
import { Field } from "@/components/fields/Field";
import SelectMenu from "@/components/fields/SelectMenu";
import { btn, btnGhost, btnRow, btnRowDanger } from "@/components/studio2/ui";

const INPUT = "w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-white/15";

export default function ItemCategoriesPanel({ rows = [], suggestions = [], canManage, canCreate, canDelete, busy, send }) {
  const locale = useStudioLocale();
  const tr = itemCategoriesDict(locale);
  const [draft, setDraft] = useState(null);
  const [picked, setPicked] = useState([]);

  // `orderedTree` COUNTS FROM NOUGHT and `depthOf` counts from one — the server
  // refuses a child when `depthOf(parent) + 1 > MAX`. So the level is derived
  // once, here, rather than by each reader. `depth || 1` is the trap that cost
  // this a sandbox run: a real depth of 0 is falsy and reads as 1, which
  // indents the whole second level as though it were the first AND offers "add
  // inside" on a fourth-level row the server refuses.
  const tree = useMemo(
    () => orderedTree(rows).map((c) => ({ ...c, level: (Number(c.depth) || 0) + 1 })),
    [rows],
  );
  const label = (c) => (locale === "ar" && c.nameAr ? c.nameAr : c.name);
  // A category cannot sit inside itself, and the server refuses a cycle anyway;
  // leaving the row out of its own parent list is the courtesy, not the guard.
  const parents = tree
    .filter((c) => c.id !== draft?.id && c.level < MAX_DEPARTMENT_DEPTH)
    .map((c) => ({ value: c.id, label: `${"\u00a0\u00a0".repeat(c.level - 1)}${label(c)}` }));

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{tr.lead}</p>
        <p className="mt-1 text-xs text-slate-400">{tr.notItemType}</p>
      </div>

      {tree.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{tr.empty}</p>
      ) : (
        <table className="w-full text-sm">
          <tbody>
            {tree.map((c) => (
              <tr key={c.id} className="border-t border-slate-100 dark:border-white/5">
                <td className="py-2.5 pe-3">
                  <span style={{ paddingInlineStart: `${(c.level - 1) * 18}px` }} className="inline-block">
                    {label(c)}
                  </span>
                </td>
                <td className="py-2.5 pe-3 text-slate-500 dark:text-slate-400">{c.nameAr || ""}</td>
                <td className="py-2.5 text-end">
                  <div className="flex justify-end gap-1">
                    {canCreate && c.level < MAX_DEPARTMENT_DEPTH && (
                      <button type="button" className={btnRow}
                        onClick={() => setDraft({ name: "", nameAr: "", parentId: c.id })}>{tr.addChild}</button>
                    )}
                    {canManage && (
                      <button type="button" className={btnRow}
                        onClick={() => setDraft({ ...c, parentId: c.parentId || "" })}>{tr.edit}</button>
                    )}
                    {canDelete && (
                      <button type="button" className={btnRowDanger} disabled={busy}
                        onClick={() => send("DELETE", { id: c.id })}>{tr.remove}</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {canDelete && tree.length > 0 && <p className="text-xs text-slate-400">{tr.deleteNote}</p>}

      {draft ? (
        <div className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={tr.name} value={draft.name || ""} onChange={(v) => setDraft({ ...draft, name: v })} />
            <Field label={tr.nameAr} value={draft.nameAr || ""} onChange={(v) => setDraft({ ...draft, nameAr: v })} />
          </div>
          <div className="mt-3">
            <p className="mb-1 text-xs text-slate-400">{tr.parent}</p>
            <SelectMenu className={INPUT} value={draft.parentId || ""} aria-label={tr.parent}
              onChange={(v) => setDraft({ ...draft, parentId: v })}
              options={[{ value: "", label: tr.topLevel }, ...parents]} />
          </div>
          <div className="mt-4 flex gap-2">
            <button type="button" className={btn} disabled={busy || !String(draft.name || "").trim()}
              onClick={async () => { if (await send(draft.id ? "PUT" : "POST", draft)) setDraft(null); }}>
              {tr.save}
            </button>
            <button type="button" className={btnGhost} onClick={() => setDraft(null)}>{tr.cancel}</button>
          </div>
        </div>
      ) : canCreate && (
        <button type="button" className={btn} onClick={() => setDraft({ name: "", nameAr: "", parentId: "" })}>{tr.add}</button>
      )}

      {/* WHAT THE STUDIO ALREADY CALLS ITS GOODS — offered, never imported by
          itself. A supplier's line is frequently not a category, so a person
          picks; the server writes only the names it is sent. */}
      {canCreate && suggestions.length > 0 && (
        <section className="rounded-xl border border-dashed border-slate-300 p-4 dark:border-white/15">
          <p className="text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400">{tr.suggestions}</p>
          <p className="mb-2 mt-1 text-xs text-slate-400">{tr.suggestionsLead}</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((name) => {
              const on = picked.includes(name);
              return (
                <button key={name} type="button" aria-pressed={on}
                  className={`rounded-full px-3 py-1 text-xs font-600 ${on
                    ? "bg-brand-500/15 text-brand-700 ring-2 ring-brand-500 dark:text-brand-300"
                    : "bg-slate-500/10 text-slate-600 dark:text-slate-300"}`}
                  onClick={() => setPicked((p) => (on ? p.filter((x) => x !== name) : [...p, name]))}>
                  {name}
                </button>
              );
            })}
          </div>
          {picked.length > 0 && (
            <button type="button" className={`${btn} mt-3`} disabled={busy}
              onClick={async () => { if (await send("POST", { names: picked })) setPicked([]); }}>
              {tr.importChosen(picked.length)}
            </button>
          )}
        </section>
      )}
    </div>
  );
}
