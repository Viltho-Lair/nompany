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
// THE SERVER'S OWN RULE, IMPORTED RATHER THAN RESTATED. `platform/engine/types`
// is pure and imports nothing, which is what makes it safe to pull into a client
// bundle — and the whole reason it is pure is that the screen must refuse
// exactly what the server refuses. Two copies of "this field is required" are
// two copies free to disagree.
import { recordProblem } from "@/platform/engine/types";

// THE SECTION THE ROWS LIVE IN, WHICH IS THE ONE THIS SCREEN IS REACHED
// THROUGH — and it was not, which is why this comment is longer than it looks
// like it needs to be.
//
// This watched `administration-settings`, correctly, because both engine
// collections were addressed there. It fired for nobody who mattered: the
// stream route decides who hears an event with `sectionViewable(access,
// key)`, and that key answers from `administration.settings`, so a member
// holding exactly `engine.<typeKey>.view` — everybody this screen exists for —
// received nothing and the list silently never updated. The rows moved to the
// type's own section (`platform/engine/records.ts` carries the argument), so
// the key the event carries and the right that opens the screen are now the
// same question.

function refusal(tr, token) {
  switch (token) {
    // `wrong-state` is the type not declaring that status AT ALL, which on this
    // screen means the reader is holding a declaration the studio has since
    // edited. `not-allowed` is a move the chain does not offer. Two refusals,
    // two sentences, because they send somebody to two different places.
    case "wrong-state": return tr.refuseStatusUnknown;
    case "not-allowed": return tr.refuseNotAllowed;
    // `missing` is a required field left empty. The screen refuses it before
    // sending and the route refuses it again; both land here, so the reader is
    // told the same thing whichever door said no.
    case "missing": return tr.refuseMissing;
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

// HOW MANY ROWS ARE PUT IN THE DOM AT ONCE. Not a data page — every record is
// already in the browser (see the note on the controls below) — so this caps
// rendering, not fetching, and "Show more" costs no round trip. 50 is where a
// table stops being scannable, not where it stops being fast.
const PAGE = 50;

/** A blank form for this type: every declared field, and nothing else. */
const blankValues = (type) => Object.fromEntries(
  (type.fields || []).map((f) => [f.key, f.kind === "boolean" ? false : ""]),
);

// A COLUMN HEADER THAT SORTS, and says so. The arrow is drawn only on the
// active column: an arrow on every header tells a reader nothing about which
// one is in force, which is the state a plain table is already in.
function SortHead({ label, col, sort, onSort }) {
  const active = sort.key === col;
  return (
    <button type="button" onClick={() => onSort(col)}
      aria-label={label}
      className="inline-flex items-center gap-1 font-inherit hover:text-slate-900 dark:hover:text-white">
      {label}
      <span aria-hidden="true" className={active ? "text-slate-500 dark:text-slate-300" : "text-transparent"}>
        {sort.dir === "desc" ? "↓" : "↑"}
      </span>
    </button>
  );
}

export default function StudioRecords({ slug, typeKey }) {
  const tr = restDict(useStudioLocale());
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // `{ id, values }` — `id` absent means a record being created. One dialog for
  // both acts, because the form is built from the declaration either way and a
  // second copy of it would be free to offer different fields.
  const [form, setForm] = useState(null);

  // THE REGISTER'S CONTROLS, AND THEY ARE ALL IN THE BROWSER ON PURPOSE.
  //
  // The route returns a type's whole record set, so searching, filtering and
  // sorting here costs no round trip and cannot disagree with what is on
  // screen. That holds because of what a register IS: `engineRecords` is one
  // collection discriminated by `typeKey`, a type is a studio's own list of
  // its transmittals or its NCRs, and those run to hundreds rather than to the
  // tens of thousands that would force this onto the server. `limit` is the
  // hedge — the DOM is capped rather than the data, so a studio that does grow
  // one to a few thousand rows gets a slow search rather than a dead tab.
  //
  // WHEN TO MOVE IT: the day a type's own count makes the initial fetch slow,
  // which is a different problem from this one and wants a paged route, a
  // cursor and a server-side sort. Doing that now would buy nothing and cost
  // the "what you filtered is what you export" property below.
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState({ key: "", dir: "asc" });
  const [limit, setLimit] = useState(PAGE);

  // A NEW TYPE IS A NEW REGISTER, so its filters do not carry over. Without
  // this, clicking from NCRs to Audits keeps a status filter naming a status
  // the new type does not have, and the register renders empty — which reads
  // as "no audits" rather than as a filter nobody can see.
  //
  // ADJUSTED DURING RENDER, NOT IN AN EFFECT. React's own guidance for
  // "reset state when a prop changes", and it is not a style preference here:
  // an effect would paint one frame of the new register through the old
  // register's filter before correcting itself, and `react-hooks/
  // set-state-in-effect` refuses it — the lint budget is shrink-only, so a
  // warning is a build-level no.
  const [lastType, setLastType] = useState(typeKey);
  if (lastType !== typeKey) {
    setLastType(typeKey);
    setQuery(""); setStatus(""); setSort({ key: "", dir: "asc" }); setLimit(PAGE);
  }

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
  useLiveUpdates(slug, `engine-${typeKey}`, reload);

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
  const movesFrom = (from) => (type.transitions || []).filter((t) => t.from === from);
  const acting = canEdit || canDelete;

  // SEARCH READS THE WHOLE RECORD, not just the columns. A studio that put the
  // supplier's name in a field it did not choose as a column still expects to
  // find the row by typing it — and hiding a match because of a display choice
  // is the kind of thing people quietly stop trusting the search for.
  const needle = query.trim().toLowerCase();
  const matches = (r) => {
    if (!needle) return true;
    if (String(r.reference || "").toLowerCase().includes(needle)) return true;
    if (String(r.status || "").toLowerCase().includes(needle)) return true;
    return Object.values(r.values || {}).some((v) => String(v ?? "").toLowerCase().includes(needle));
  };

  const shown = (records || [])
    .filter((r) => (status ? r.status === status : true))
    .filter(matches)
    .sort((a, b) => {
      if (!sort.key) return 0;
      // REFERENCE AND STATUS ARE ON THE ROW; everything else is inside `values`.
      const pick = (r) => (sort.key === "reference" ? r.reference
        : sort.key === "status" ? r.status
        : r.values?.[sort.key]);
      const x = pick(a); const y = pick(b);
      // NUMBERS COMPARE AS NUMBERS. A money or number field sorted as text puts
      // 100 before 20, which is the bug that makes a sort look broken rather
      // than absent.
      const bothNum = typeof x === "number" && typeof y === "number";
      const n = bothNum ? x - y : String(x ?? "").localeCompare(String(y ?? ""), undefined, { numeric: true });
      return sort.dir === "desc" ? -n : n;
    });
  const page = shown.slice(0, limit);

  const toggleSort = (key) => setSort((s) =>
    (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  // WHAT IS EXPORTED IS WHAT IS FILTERED, all of it — `shown`, not `page`. An
  // export that silently stopped at the visible rows would be wrong in a way
  // nobody checks: a spreadsheet with 50 of 300 rows looks exactly like a
  // spreadsheet with 50 rows.
  const exportCsv = () => {
    const cols = ["reference", ...columns.map((f) => f.key), "status"];
    const heads = [tr.reference, ...columns.map((f) => f.label), tr.status];
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const body = shown.map((r) => cols.map((c) =>
      esc(c === "reference" ? r.reference : c === "status" ? r.status : r.values?.[c])).join(","));
    // A BOM, because Excel opens a UTF-8 CSV without one as mojibake and half
    // this product's registers are in Arabic.
    const blob = new Blob(["\uFEFF" + [heads.map(esc).join(","), ...body].join("\r\n")],
      { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${typeKey}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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

      {/* THE CONTROLS ONLY APPEAR WHEN THERE IS SOMETHING TO CONTROL. A search
          box over four rows is noise, and an empty register with a filter bar
          reads as a register whose filter is hiding everything. */}
      {records.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="w-56 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-white/15 dark:bg-[#191921] dark:text-white"
            value={query} aria-label={tr.recordSearch} placeholder={tr.recordSearch}
            onChange={(e) => { setQuery(e.target.value); setLimit(PAGE); }}
          />
          {(type.statuses || []).length > 0 && (
            /* THROUGH `Field`, like every other control in the product — and
               the status words are the STUDIO'S OWN, so they are used as both
               value and label rather than looked up in a dictionary of the
               product's built-in ladders. */
            <Field label={tr.status} as="select" className="w-44"
              value={status}
              onChange={(v) => { setStatus(v); setLimit(PAGE); }}
              options={[{ value: "", label: tr.recordFilterAll },
                ...(type.statuses || []).map((st) => ({ value: st, label: st }))]} />
          )}
          <span className="num text-[12px] text-slate-400 dark:text-slate-500">
            {tr.recordCount(shown.length, records.length)}
          </span>
          <button type="button" className={btnRow} onClick={exportCsv} disabled={!shown.length}>
            {tr.recordExport}
          </button>
        </div>
      )}

      {!records.length ? (
        <Empty title={tr.recordsEmpty} body={tr.recordsEmptyBody} />
      ) : !shown.length ? (
        /* A FILTER THAT MATCHES NOTHING IS NOT AN EMPTY REGISTER, and saying
           "nothing here yet" would send somebody to add a record they already
           have. */
        <Empty title={tr.recordSearchNothing} body={tr.recordsEmptyBody} />
      ) : (
        <section className={panel}>
          {/* THE TABLE SCROLLS INSIDE ITS OWN BOX. A studio may declare a type
              with a dozen columns, and a page that scrolls sideways is a
              different defect from a table that does. */}
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-slate-200/70 text-start dark:border-white/10">
                  {/* EVERY COLUMN SORTS, and the arrow says which way. A
                      header that looks inert is a header nobody clicks. */}
                  <th className={`${th} text-start`}>
                    <SortHead label={tr.reference} col="reference" sort={sort} onSort={toggleSort} />
                  </th>
                  {columns.map((f) => (
                    <th key={f.key} className={`${th} text-start`}>
                      <SortHead label={f.label} col={f.key} sort={sort} onSort={toggleSort} />
                    </th>
                  ))}
                  <th className={`${th} text-start`}>
                    <SortHead label={tr.status} col="status" sort={sort} onSort={toggleSort} />
                  </th>
                  {acting && <th className={`${th} text-end`}>{/* actions */}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {page.map((r) => (
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

          {shown.length > page.length && (
            <button type="button" className={`${btnRow} mt-4`} onClick={() => setLimit((n) => n + PAGE)}>
              {tr.recordMore}
            </button>
          )}
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
                  // REFUSED HERE TOO, not only at the route. The dialog has
                  // no <form>, so `required` on a control is inert — the
                  // browser never validates a button that does not submit —
                  // and a round trip to be told a field is empty is a round
                  // trip the reader can be spared.
                  if (recordProblem(type, form.values)) { setError(refusal(tr, "missing")); return; }
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
