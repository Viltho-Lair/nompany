// THE GENERIC RECORD SCREEN. One implementation for every declared type.
//
// IT KNOWS NOTHING ABOUT ANY TYPE. The columns it draws, the fields it offers
// and the moves it shows all come from the declaration the route returns beside
// the rows — which is why the GET payload carries `type` at all. Point it at a
// type declared this morning and it draws that type this morning; there is no
// branch here naming `transmittal` or anything else.
//
// THE SCAFFOLDING BELOW IS THE 22 LINES THAT WERE BYTE-IDENTICAL IN SEVEN
// HAND-BUILT SCREENS — read, apply, reload, send, refusal, the error banner and
// the loading skeleton. This is the copy that replaces them.
//
// EVERY WORD THE TYPE SUPPLIES IS RENDERED VERBATIM. Its label, its field
// labels and its status words were typed into a studio's type editor, so they
// are tenant DATA and are never translated — the rule section names, client
// names and role names already follow. The only translated strings on this
// screen are its own chrome, and they name no type.
//
// FOUR ACTS, ONE PER RIGHT, AND NOT ONE MORE THAN THE PAYLOAD ALLOWS.
// `engine.<typeKey>.<verb>` mints create, edit and delete for every declared
// type, so a screen offering only two of them would leave the third a right
// nothing can exercise (invariant 16) — which is the defect this whole phase
// exists to stop repeating. `canCreate`/`canEdit`/`canDelete` come off the
// payload and each gates exactly its own control (invariant 4): nothing here
// decides access, it only declines to draw what the server would refuse.
//
// MOVING IS ITS OWN ACT, never a status typed into the form. `records.ts` keeps
// that branch separate for a reason it states — routing an answer through a
// generic write is the shape that once let a rejected change order approve
// itself — and the screen must not smuggle it back in through a field.
"use client";
import { useCallback, useEffect, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { restDict } from "@/shared/studio/rest";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { panel, h2, th, btn, btnGhost, btnRow, btnRowDanger, Empty, Dialog, fmtDate, money } from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";
import StudioDate from "@/components/fields/StudioDate";
import { StatusPill } from "@/components/studio2/StatusPill";

// THE SECTION THE ROWS ACTUALLY LIVE IN, which is not the section the screen is
// reached through. Both engine collections are addressed under
// `administration-settings` (keys.ts, and `engineContext` says so), so that is
// the key a change event carries — `engine-<typeKey>` is where the nav puts the
// screen and no event is ever tagged with it. Subscribing to the visible key
// would compile, render and silently never fire.
const RECORDS_WATCH = "administration-settings";

function refusal(tr, token) {
  switch (token) {
    // `wrong-state` is the type not declaring that status AT ALL, which on this
    // screen means the reader is holding a declaration the studio has since
    // edited. `not-allowed` is a move the chain does not offer. Two refusals,
    // two sentences, because they send somebody to two different places.
    case "wrong-state": return tr.refuseStatusUnknown;
    case "not-allowed": return tr.refuseNotAllowed;
    default: return token;
  }
}

/**
 * A DECLARED FIELD BECOMES A CONTROL, and every one of the nine kinds in
 * `FIELD_KINDS` is handled — a closed set with a hole in it is not a closed
 * set, and a kind that fell through to nothing would render a field somebody
 * declared as no field at all.
 *
 * EVERY CONTROL IS A `Field`. The floating-label wrapper is the studio's one
 * form control; a bare input beside one is visibly a different shape, and this
 * screen draws forms it has never seen, so it cannot rely on anybody noticing.
 *
 * `collaborator` and `reference` fall through to a text input in phase 1 and are
 * named as such in the functionality file: the pickers they want are real work
 * and this screen does not fake them.
 *
 * `Field.onChange` HANDS OVER THE VALUE, not the event — for the input, the
 * textarea and the select alike — so every handler below takes `v`.
 */
function controlFor(tr, field, value, onChange) {
  // `key` IS PASSED EXPLICITLY ON EACH ELEMENT, never through this spread.
  // React reads `key` off the JSX call rather than off props, so a spread
  // carrying one is a warning at runtime and nothing at build time.
  const common = { label: field.label, required: !!field.required };

  if (field.kind === "boolean") {
    // A YES/NO SELECT rather than a checkbox: a checkbox is the one control the
    // Field wrapper has no shape for, and an unboxed one sitting between two
    // boxed fields is the misalignment this product keeps paying for. The empty
    // value IS "no" — `coerceValue` reads anything but yes/true/1 as false — so
    // there is no third state to lose.
    return (
      <Field key={field.key} {...common} as="select" value={value ? "yes" : ""}
        onChange={(v) => onChange(v === "yes")}
        options={[{ value: "", label: tr.no }, { value: "yes", label: tr.yes }]} />
    );
  }
  if (field.kind === "longtext") {
    return <Field key={field.key} {...common} as="textarea" value={value ?? ""} onChange={onChange} />;
  }
  if (field.kind === "select") {
    return (
      <Field key={field.key} {...common} as="select" value={value ?? ""} onChange={onChange}
        options={[
          // A REQUIRED SELECT OFFERS NO WAY BACK TO EMPTY, which is the whole of
          // what required can mean on a control that always shows something.
          ...(field.required ? [] : [{ value: "", label: "" }]),
          ...(field.options || []).map((o) => ({ value: String(o), label: String(o) })),
        ]} />
    );
  }
  if (field.kind === "date") {
    // THE STUDIO'S DATE FIELD, never a native `type="date"` input and never an
    // `@mui/x-date-pickers` import of this screen's own. StudioDate `import()`s
    // the picker from a client module, so MUI's date code and date-fns stay off
    // this route's first load — and there is exactly one copy of them, which
    // reaching for the picker directly anywhere else silently undoes.
    return (
      <Field key={field.key} {...common} filled={!!value}>
        <StudioDate value={value ?? ""} onChange={onChange} />
      </Field>
    );
  }
  if (field.kind === "number" || field.kind === "money") {
    return <Field key={field.key} {...common} type="number" value={value ?? ""} onChange={onChange} />;
  }
  // text, collaborator, reference. The last two are honest text boxes rather
  // than absent fields — see the note above.
  return <Field key={field.key} {...common} type="text" value={value ?? ""} onChange={onChange} />;
}

/**
 * ONE CELL. NULL IS NOT NOUGHT: a number nobody filled in renders as a dash,
 * because 0 is a real answer and "not filled in" is not, and a column showing
 * the same glyph for both is the bug this product has fixed a dozen times.
 * `coerceValue` hands back null for exactly that case, so the dash is the
 * store's own answer rather than this screen's guess.
 */
function cell(tr, field, value) {
  if (field.kind === "boolean") return value ? tr.yes : tr.no;
  if (value === null || value === undefined || value === "") return "—";
  if (field.kind === "date") return fmtDate(value);
  if (field.kind === "money") return money(value);
  return String(value);
}

/** A blank form for this type: every declared field, and nothing else. */
const blankValues = (type) => Object.fromEntries(
  (type.fields || []).map((f) => [f.key, f.kind === "boolean" ? false : ""]),
);

export default function StudioRecords({ slug, typeKey }) {
  const tr = restDict(useStudioLocale());
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // `{ id, values }` — `id` absent means a record being created. One dialog for
  // both acts, because the form is built from the declaration either way and a
  // second copy of it would be free to offer different fields.
  const [form, setForm] = useState(null);

  const read = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/records/${typeKey}`, { cache: "no-store" });
    return { ok: res.ok, body: await res.json().catch(() => ({})) };
  }, [slug, typeKey]);

  const apply = useCallback(({ ok, body }) => {
    if (!ok) { setError(body.error || "failed"); return; }
    setError("");
    setData(body);
  }, []);

  useEffect(() => {
    // GUARDED AGAINST THE ANSWER ARRIVING AFTER THE SCREEN MOVED ON. This
    // component is remounted with a different `typeKey` by a nav click, so two
    // reads can be in flight and the slower one must not win.
    let current = true;
    (async () => {
      const answer = await read();
      if (current) apply(answer);
    })();
    return () => { current = false; };
  }, [read, apply]);

  const reload = useCallback(async () => { apply(await read()); }, [read, apply]);
  useLiveUpdates(slug, RECORDS_WATCH, reload);

  const send = useCallback(async (method, payload) => {
    setError(""); setBusy(true);
    const res = await fetch(`/api/studios/${slug}/records/${typeKey}`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(refusal(tr, out.error || "failed")); return false; }
    await reload();
    return true;
  }, [slug, typeKey, reload, tr]);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <ScreenSkeleton loadingLabel={tr.recordsLoading} />;

  const { type, records, canCreate, canEdit, canDelete } = data;
  // COLUMNS RESOLVE THROUGH THE FIELDS, in the declaration's order. A column
  // naming a field the type no longer declares draws nothing rather than an
  // empty column header for ever — `typeProblem` refuses that on the way in,
  // and this is the reader's half of the same rule.
  const columns = (type.columns || [])
    .map((c) => (type.fields || []).find((f) => f.key === c))
    .filter(Boolean);
  const movesFrom = (status) => (type.transitions || []).filter((t) => t.from === status);
  const acting = canEdit || canDelete;

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className={h2}>{type.label}</h2>
        {canCreate && (
          <button type="button" className={btn}
            onClick={() => setForm({ values: blankValues(type) })}>
            {tr.recordNew}
          </button>
        )}
      </div>

      {!records.length ? (
        <Empty title={tr.recordsEmpty} body={tr.recordsEmptyBody} />
      ) : (
        <section className={panel}>
          {/* THE TABLE SCROLLS INSIDE ITS OWN BOX. A studio may declare a type
              with a dozen columns, and a page that scrolls sideways is a
              different defect from a table that does. */}
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-slate-200/70 text-start dark:border-white/10">
                  <th className={`${th} text-start`}>{tr.reference}</th>
                  {columns.map((f) => <th key={f.key} className={`${th} text-start`}>{f.label}</th>)}
                  <th className={`${th} text-start`}>{tr.status}</th>
                  {acting && <th className={`${th} text-end`}>{/* actions */}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {records.map((r) => (
                  <tr key={r.id}>
                    <td className="py-3 pe-4 font-mono text-xs text-slate-500 dark:text-slate-400">{r.reference}</td>
                    {columns.map((f) => (
                      <td key={f.key} className="py-3 pe-4 text-[var(--geex-ink)]">{cell(tr, f, r.values?.[f.key])}</td>
                    ))}
                    <td className="py-3 pe-4">
                      {/* THE STATUS WORD IS THE STUDIO'S OWN, so the pill is
                          handed it as an explicit `label`: `statusLabel` would
                          otherwise look a tenant's word up in a dictionary of
                          the product's built-in ladders, and a chance collision
                          there would translate a word nobody asked to have
                          translated. No `kind` either — this type's ladder is a
                          row, so it has no colour map and takes the neutral
                          fallback. */}
                      <StatusPill status={r.status} label={r.status} />
                    </td>
                    {acting && (
                      <td className="py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          {canEdit && movesFrom(r.status).map((t) => (
                            <button key={t.to} type="button" className={btnRow} disabled={busy}
                              onClick={() => send("PUT", { id: r.id, action: "move", to: t.to })}>
                              {tr.recordMove(t.to)}
                            </button>
                          ))}
                          {canEdit && (
                            <button type="button" className={btnRow} disabled={busy}
                              onClick={() => setForm({ id: r.id, values: { ...blankValues(type), ...(r.values || {}) } })}>
                              {tr.edit}
                            </button>
                          )}
                          {canDelete && (
                            <button type="button" className={btnRowDanger} disabled={busy}
                              onClick={() => {
                                if (confirm(tr.recordDeleteConfirm(r.reference))) send("DELETE", { id: r.id });
                              }}>
                              {tr.delete_}
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {form && (
        <Dialog title={type.label} onClose={() => setForm(null)}>
          <div className="space-y-3">
            {(type.fields || []).map((f) => controlFor(
              tr, f, form.values[f.key],
              (v) => setForm((prev) => ({ ...prev, values: { ...prev.values, [f.key]: v } })),
            ))}
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setForm(null)}>{tr.cancel}</button>
              <button type="button" className={btn} disabled={busy}
                onClick={async () => {
                  // CREATE AND EDIT ARE THE SAME BODY on two verbs, which is
                  // what the route already expects: POST mints the reference
                  // and the first declared status, PUT without an `action`
                  // rewrites the fields and touches neither.
                  const ok = form.id
                    ? await send("PUT", { id: form.id, values: form.values })
                    : await send("POST", { values: form.values });
                  if (ok) setForm(null);
                }}>{tr.save}</button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
