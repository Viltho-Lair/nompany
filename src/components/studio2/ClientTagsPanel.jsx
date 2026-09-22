"use client";

// CLIENT TAGS — Master data's fifth register (22/09/2026).
//
// A TAG IS A ROW WITH AN ID, so renaming one is a rename and nothing follows
// it: a client carries the id, an offer's eligibility carries the id, and both
// go on meaning the same group of people under the new name. That is the whole
// reason this is a register rather than a list in Studio settings — a taxonomy
// value is stored by NAME, so renaming one strands every record naming it.
//
// DELETING ONE UNTAGS NOBODY, and the panel says so: the clients keep the id
// and simply stop showing the name. See modules/administration/clientTags.

import { useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { clientTagsDict } from "@/shared/studio/clientTags";
import { Field } from "@/components/fields/Field";
import { btn, btnGhost, btnRow, btnRowDanger } from "@/components/studio2/ui";

// The colours a chip may carry. Names, not hex: the chip resolves them to the
// house classes, so a studio cannot type a colour the theme has no dark variant
// of and end up with white text on white.
export const TAG_COLOURS = ["slate", "emerald", "sky", "amber", "rose", "violet"];

const CHIP = {
  slate: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  sky: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  amber: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  rose: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  violet: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
};

/** One tag as it is worn. Exported: the client screen draws the same chip. */
export function TagChip({ tag, locale }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-600 ${CHIP[tag.colour] || CHIP.slate}`}>
      {locale === "ar" && tag.nameAr ? tag.nameAr : tag.name}
    </span>
  );
}

export default function ClientTagsPanel({ rows = [], canManage, canCreate, canDelete, busy, send }) {
  const locale = useStudioLocale();
  const tr = clientTagsDict(locale);
  const [adding, setAdding] = useState(null);
  const [editing, setEditing] = useState(null);

  const draft = adding || editing;
  const setDraft = adding ? setAdding : setEditing;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500 dark:text-slate-400">{tr.lead}</p>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{tr.empty}</p>
      ) : (
        <table className="w-full text-sm">
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="border-t border-slate-100 dark:border-white/5">
                <td className="py-2.5 pe-3"><TagChip tag={t} locale={locale} /></td>
                <td className="py-2.5 pe-3 text-slate-500 dark:text-slate-400">{t.name}</td>
                <td className="py-2.5 pe-3 text-slate-500 dark:text-slate-400">{t.nameAr || ""}</td>
                <td className="py-2.5 text-end">
                  <div className="flex justify-end gap-1">
                    {canManage && (
                      <button type="button" className={btnRow} onClick={() => { setAdding(null); setEditing({ ...t }); }}>{tr.edit}</button>
                    )}
                    {canDelete && (
                      <button type="button" className={btnRowDanger} disabled={busy}
                        onClick={() => send("DELETE", { id: t.id })}>{tr.remove}</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {canDelete && rows.length > 0 && <p className="text-xs text-slate-400">{tr.deleteNote}</p>}

      {draft ? (
        <div className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={tr.name} value={draft.name || ""} onChange={(v) => setDraft({ ...draft, name: v })} />
            <Field label={tr.nameAr} value={draft.nameAr || ""} onChange={(v) => setDraft({ ...draft, nameAr: v })} />
          </div>
          <div className="mt-3">
            <p className="mb-1 text-xs text-slate-400">{tr.colour}</p>
            <div className="flex flex-wrap gap-2">
              {TAG_COLOURS.map((c) => (
                <button key={c} type="button"
                  aria-label={c}
                  aria-pressed={(draft.colour || "slate") === c}
                  className={`rounded-full px-3 py-1 text-xs font-600 ${CHIP[c]} ${
                    (draft.colour || "slate") === c ? "ring-2 ring-brand-500" : ""}`}
                  onClick={() => setDraft({ ...draft, colour: c })}>
                  {tr.sample}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="button" className={btn} disabled={busy || !String(draft.name || "").trim()}
              onClick={async () => {
                const ok = await send(adding ? "POST" : "PUT", draft);
                if (ok) { setAdding(null); setEditing(null); }
              }}>{tr.save}</button>
            <button type="button" className={btnGhost} onClick={() => { setAdding(null); setEditing(null); }}>{tr.cancel}</button>
          </div>
        </div>
      ) : canCreate && (
        <button type="button" className={btn} onClick={() => { setEditing(null); setAdding({ name: "", nameAr: "", colour: "slate" }); }}>
          {tr.add}
        </button>
      )}
    </div>
  );
}
