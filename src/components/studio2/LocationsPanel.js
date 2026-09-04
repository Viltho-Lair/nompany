// THE PLACES THE STUDIO WORKS FROM — one panel, rendered by two screens.
//
// It lived inside StudioOperations while locations were Field Operations'. They
// are Administration's Master data now, and BOTH screens still show them: the
// rota because a dispatcher adding a site should not have to leave the rota,
// and Master data because that is where they live. Extracted rather than
// copied, so "one service, one route, one panel" holds all the way up.
//
// THREE GATES, NOT ONE. `canManage` used to answer for every button because a
// single right covered the whole screen. Master data takes the full CRUD
// ladder, so adding, editing and deleting are asked separately — a studio can
// let somebody correct an address without letting them delete a site a rota
// still points at. Each is the route's own answer, so a button is drawn only
// where the write would be accepted.
//
// SimpleForm CAME WITH IT. Its only caller was this panel, so leaving it behind
// would have left dead code in a file it no longer belonged to.
"use client";
import { useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { operationsDict } from "@/shared/studio/operations";
import { Dialog, panel, btn, btnGhost, Empty } from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";

// Operations keeps its own copy for the permits list; this is the same string.
// A shared token would be better and is a sweep of its own — several screens
// define these locally.
const btnDanger = "rounded-full border border-rose-200 px-4 py-2 font-display text-sm font-600 text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-60 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10";

export default function LocationsPanel({ rows, kinds, canManage, canCreate, canDelete, busy, send }) {
  const tr = operationsDict(useStudioLocale());
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);

  return (
    <>
      {canCreate && <button className={btn} onClick={() => setAdding(true)}>{tr.addLocation}</button>}
      {(adding || editing) && (
        <Dialog
          title={editing ? tr.editLocation : tr.newLocation}
          description={tr.placeWorkHappensSite}
          onClose={() => { setAdding(false); setEditing(null); }}
        >
        <SimpleForm title={editing ? tr.editLocation : tr.newLocation} busy={busy}
          fields={[
            { key: "name", label: tr.name, required: true, value: editing?.name || "" },
            { key: "kind", label: tr.kind, value: editing?.kind || kinds[0], options: kinds.map((k) => ({ value: k, text: k })) },
            { key: "city", label: tr.city, value: editing?.city || "" },
            { key: "address", label: tr.address, value: editing?.address || "" },
            { key: "mapUrl", label: tr.mapLink, value: editing?.mapUrl || "" },
            { key: "notes", label: tr.notes, area: true, value: editing?.notes || "" },
          ]}
          onCancel={() => { setAdding(false); setEditing(null); }}
          onSave={async (v) => { if (await send("locations", editing ? "PUT" : "POST", editing ? { ...v, id: editing.id } : v)) { setAdding(false); setEditing(null); } }} />
        </Dialog>
      )}

      {rows.length === 0 ? <Empty title={tr.noLocationsYet} body={tr.locationsPlacesWorkHappens} /> : (
        <section className={panel}>
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {rows.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-600 text-slate-900 dark:text-white">{l.name}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-600 text-slate-500 dark:bg-white/5 dark:text-slate-400">{l.kind}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {[l.address, l.city].filter(Boolean).join(", ") || tr.noAddress}
                    {l.mapUrl && (
                      <a href={l.mapUrl} target="_blank" rel="noopener noreferrer"
                        className="ms-2 text-brand-700 hover:underline dark:text-brand-300">map</a>
                    )}
                  </p>
                </div>
                {(canManage || canDelete) && (
                  <div className="flex gap-2">
                    {canManage && <button className={btnGhost} onClick={() => setEditing(l)}>{tr.edit}</button>}
                    {/* DELETE IS ITS OWN RIGHT. A rota or a permit pointing at
                        this place makes the route refuse with the counts, so
                        the danger button is honest about being refusable. */}
                    {canDelete && <button className={btnDanger} disabled={busy} onClick={() => send("locations", "DELETE", { id: l.id })}>{tr.delete}</button>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function SimpleForm({ title, fields, busy, onCancel, onSave }) {
  const tr = operationsDict(useStudioLocale());
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((f) => [f.key, f.value ?? ""])));
  const ready = fields.filter((f) => f.required).every((f) => String(values[f.key] ?? "").trim());

  return (
    <section className={`${panel} border-brand-500/40`}>
      <h3 className="font-display text-lg font-800 text-slate-900 dark:text-white">{title}</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          f.options ? (
            <Field key={f.key} label={f.label} as="select" required={f.required}
              value={values[f.key]}
              onChange={(v) => setValues((vv) => ({ ...vv, [f.key]: v }))}
              options={f.options.map((o) => ({ value: o.value, label: o.text }))} />
          ) : f.area ? (
            <Field key={f.key} label={f.label} as="textarea" required={f.required}
              value={values[f.key]}
              onChange={(v) => setValues((vv) => ({ ...vv, [f.key]: v }))}
              className="sm:col-span-2" />
          ) : (
            <Field key={f.key} label={f.label} required={f.required}
              value={values[f.key]}
              onChange={(v) => setValues((vv) => ({ ...vv, [f.key]: v }))} />
          )
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button className={btn} disabled={busy || !ready} onClick={() => onSave(values)}>{busy ? tr.saving : tr.save}</button>
        <button className={btnGhost} onClick={onCancel}>{tr.cancel}</button>
      </div>
    </section>
  );
}
