"use client";

import { useCallback, useState } from "react";
import { Field } from "@/components/fields/Field";
import { binsDict } from "@/shared/studio/bins";
import { useReload } from "@/components/studio2/useReload";

// WHERE THE STOCK IS.
//
// Inventory has always known how many of a thing a studio holds and never
// where, so a company with two sites could not tell whether the eleven pumps
// were eleven here or six here and five three hundred kilometres away.
//
// IT FETCHES ITS OWN DATA rather than riding in the Inventory payload. The bin
// split is only interesting on this tab, and putting it in the section's main
// response would make every open of every Inventory screen pay for it.
//
// IT VALIDATES NOTHING ITSELF. The rules are `modules/inventory/bins`, which
// the server refuses on, and this shows what came back — the same posture the
// numbering and unit editors take, so a second copy of the rules cannot drift.
export default function BinsPanel({ slug, locale = "en" }) {
  const tr = binsDict(locale);
  const [data, setData] = useState(null);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ code: "", name: "", locationId: "" });
  const [moving, setMoving] = useState(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/inventory/bins`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setProblem(body.error || "failed"); return; }
    setData(body);
    // The setters are named because the React Compiler infers them and
    // refuses to preserve a memoization whose stated deps are narrower
    // than the ones it found. They are stable, so this costs nothing.
  }, [slug, setData, setProblem]);

  useReload(load);

  // THE SERVER'S REASON, VERBATIM — `binProblems` names which field and what is
  // wrong with it, and replacing that with "couldn't save" would throw away the
  // only thing that tells somebody what to change.
  const send = useCallback(async (method, payload) => {
    setBusy(true); setProblem("");
    const res = await fetch(`/api/studios/${slug}/inventory/bins`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setProblem(body.detail || body.error || "failed"); return false; }
    await load();
    return true;
  }, [slug, load, setBusy, setProblem]);

  if (!data) return <p className="text-sm text-slate-500 dark:text-slate-400">…</p>;

  const { bins = [], locations = [], unbinned = [], negative = [], canManage } = data;
  const codeOf = (id) => bins.find((b) => b.id === id)?.code || "";
  // Every item the studio actually holds somewhere, each listed once.
  const movable = [
    ...unbinned.map((u) => [u.itemId, u.itemLabel]),
    ...bins.flatMap((b) => b.lines.map((l) => [l.itemId, l.itemLabel])),
  ].filter(([id], i, all) => all.findIndex(([x]) => x === id) === i);

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600 dark:text-slate-300">{tr.lead}</p>

      {problem && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
          {problem}
        </p>
      )}

      {/* A STUDIO WITH NO LOCATIONS CANNOT HAVE A BIN, and it is told which
          screen fixes that rather than being handed an empty dropdown. */}
      {locations.length === 0 ? (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
          {tr.noLocations}
        </p>
      ) : canManage && !adding && (
        <button
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-600 text-white"
          onClick={() => { setAdding(true); setDraft({ code: "", name: "", locationId: locations[0].id }); }}
        >
          {tr.addBin}
        </button>
      )}

      {adding && (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 p-4 dark:border-white/10">
          <Field label={tr.code} required className="w-full sm:w-36"
            value={draft.code} onChange={(v) => setDraft({ ...draft, code: v })} />
          <Field label={tr.binName} className="w-full sm:w-56"
            value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} />
          <Field label={tr.location} as="select" required className="w-full sm:w-52"
            value={draft.locationId}
            onChange={(v) => setDraft({ ...draft, locationId: v })}
            options={locations.map((l) => ({ value: l.id, label: l.name }))} />
          <button
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-600 text-white disabled:opacity-50"
            disabled={busy || !draft.code.trim()}
            onClick={async () => { if (await send("POST", draft)) setAdding(false); }}
          >
            {tr.addBin}
          </button>
          <button
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 dark:border-white/15 dark:text-slate-300"
            onClick={() => { setAdding(false); setProblem(""); }}
          >
            {tr.cancel}
          </button>
        </div>
      )}

      {/* ---- the bins ---------------------------------------------------- */}
      {bins.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{tr.noBins}</p>
      ) : (
        <div className="space-y-2">
          {bins.map((b) => (
            <div key={b.id} className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-600 text-slate-900 dark:text-white">{b.code}</span>
                {b.name && <span className="text-sm text-slate-600 dark:text-slate-300">{b.name}</span>}
                <span className="text-xs text-slate-400 dark:text-slate-500">{b.locationName}</span>
                <span className="ms-auto text-xs text-slate-500 dark:text-slate-400">
                  {b.lines.length === 0 ? tr.empty : tr.units(b.units)}
                </span>
                {canManage && (
                  <>
                    <button
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 dark:border-white/15 dark:text-slate-300"
                      onClick={() => setMoving({ toBinId: b.id, fromBinId: "", itemId: "", qty: "" })}
                    >
                      {tr.moveHere}
                    </button>
                    {/* A BIN STILL HOLDING SOMETHING IS REFUSED BY THE SERVER —
                        it would strand real units where nobody can pick them —
                        so the button is offered and the reason comes back. */}
                    <button
                      className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:text-rose-500"
                      disabled={busy}
                      onClick={() => send("DELETE", { id: b.id })}
                    >
                      {tr.remove}
                    </button>
                  </>
                )}
              </div>
              {b.lines.length > 0 && (
                <ul className="mt-2 space-y-0.5">
                  {b.lines.map((l) => (
                    <li key={l.itemId} className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                      <span>{l.itemLabel}</span>
                      <span className="num">{l.qty}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ---- the move dialog, which is also put-away --------------------- */}
      {moving && (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-brand-200 p-4 dark:border-brand-400/30">
          {/* A FIXED WIDTH RATHER THAN A MAXIMUM: these sit in a flex row,
              where max-width sets no base and an empty select shrinks to its
              content — the item picker rendered as a box too small to read.
              WHAT CAN ACTUALLY BE MOVED: whatever any bin holds, plus whatever
              is in no bin. Offering the whole catalogue would offer things the
              studio does not have. */}
          <Field label={tr.item} as="select" required className="w-full sm:w-64"
            value={moving.itemId}
            onChange={(v) => setMoving({ ...moving, itemId: v })}
            options={[{ value: "", label: "" }, ...movable.map(([id, label]) => ({ value: id, label }))]} />
          {/* PUT-AWAY IS A MOVE FROM NOWHERE, so "not in a bin" is the first
              option rather than a separate button. */}
          <Field label={tr.from} as="select" className="w-full sm:w-44"
            value={moving.fromBinId}
            onChange={(v) => setMoving({ ...moving, fromBinId: v })}
            options={[{ value: "", label: tr.anywhere },
              ...bins.filter((b) => b.id !== moving.toBinId).map((b) => ({ value: b.id, label: b.code }))]} />
          <Field label={tr.quantity} type="number" className="w-full sm:w-28"
            value={moving.qty} onChange={(v) => setMoving({ ...moving, qty: v })} />
          <span className="text-xs text-slate-400 dark:text-slate-500">→ {codeOf(moving.toBinId)}</span>
          <button
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-600 text-white disabled:opacity-50"
            disabled={busy || !moving.itemId || !(Number(moving.qty) > 0)}
            onClick={async () => {
              const done = await send("POST", { action: "move", ...moving, qty: Number(moving.qty) });
              if (done) setMoving(null);
            }}
          >
            {moving.fromBinId ? tr.move : tr.putAway}
          </button>
          <button
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 dark:border-white/15 dark:text-slate-300"
            onClick={() => { setMoving(null); setProblem(""); }}
          >
            {tr.cancel}
          </button>
        </div>
      )}

      {/* ---- what is in no bin at all ------------------------------------ */}
      <div>
        <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.unbinned}</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tr.unbinnedLead}</p>
        {unbinned.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{tr.nothingUnbinned}</p>
        ) : (
          <ul className="mt-2 space-y-0.5">
            {unbinned.map((u) => (
              <li key={u.itemId} className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                <span>{u.itemLabel}</span>
                <span className="num">{u.qty}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ---- bins holding less than nothing ------------------------------ */}
      {negative.length > 0 && (
        <div>
          <h3 className="font-display text-sm font-700 text-rose-600 dark:text-rose-300">{tr.negative}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tr.negativeLead}</p>
          <ul className="mt-2 space-y-0.5">
            {negative.map((n) => (
              <li key={`${n.binId}-${n.itemId}`} className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                <span>{codeOf(n.binId)} · {n.itemLabel}</span>
                <span className="num text-rose-600 dark:text-rose-300">{n.qty}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
