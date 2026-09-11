"use client";

import { useCallback, useEffect, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { useReload } from "@/components/studio2/useReload";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import { assetsDict } from "@/shared/studio/assets";
import { fmtDate } from "@/lib/format";
import { Field } from "@/components/fields/Field";

// WHICH MACHINE IS ON WHICH JOB — the screen `assets.utilisation` never had.
//
// THE RIGHT, THE MODULE AND THE ROUTE ALL EXISTED AND NOTHING RENDERED THEM.
// `assets/allocations` serves the register and the utilisation report together,
// `allocationProblem` refuses double-booking, `utilisation` charges each job the
// rate copied when the machine went out — and no component in the product
// fetched any of it. A studio could allocate plant only by calling the API by
// hand, which means in practice that nobody did: the equipment register's
// `hireRate` had been stored since the register shipped and read by nothing.
//
// Found by sweeping every route under /api/studios/[slug] for a component that
// fetches it. A route with no caller fails nothing — it answers correctly to
// anyone who asks, and the only symptom is a right on the access grid that
// cannot be exercised (invariant 16, from the screen end rather than the
// catalogue end).
//
// THE JOB PICKER DEGRADES RATHER THAN REFUSING. Engagements are a right of
// their own (`engagements.view`), and a plant manager who may book machines is
// frequently not somebody who may read the commercial spine. So the picker is
// attempted and falls back to a plain reference field when it is refused, which
// is the honest shape: the allocation is still writable, it just cannot offer a
// list the reader is not allowed to see.
export default function StudioPlantAllocation({ slug }) {
  const locale = useStudioLocale();
  const tr = assetsDict(locale);
  const [data, setData] = useState(null);
  const [deals, setDeals] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/assets/allocations`, { cache: "no-store" });
    if (!res.ok) { setError(tr.noAccessTo(tr.title)); return; }
    setData(await res.json());
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps
  useReload(load);

  // OPTIONAL, AND ITS FAILURE IS NOT AN ERROR. `null` means "not offered" and an
  // array means "offered" — distinguished deliberately, because an empty array
  // would render an empty dropdown and read as "there are no jobs" to somebody
  // who simply may not see them.
  useEffect(() => {
    let live = true;
    (async () => {
      const res = await fetch(`/api/studios/${slug}/main/engagements`, { cache: "no-store" });
      if (!live || !res.ok) return;
      const out = await res.json().catch(() => null);
      if (live && out?.engagements) setDeals(out.engagements);
    })();
    return () => { live = false; };
  }, [slug]);

  // WATCHED AT `assets`, WHERE ALLOCATIONS ARE WRITTEN — not at `engine-equipment`
  // where the machines live. A watch key names the section the rows are written
  // under (invariant 14), and `assetAllocations` is on the Assets ROOT.
  useLiveUpdates(slug, "assets", load);

  if (error) return <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>;
  if (!data) return <ScreenSkeleton />;

  const { allocations = [], assets = [], utilisation = null, canManage = false } = data;
  const nameOf = (id) => assets.find((a) => a.id === id)?.name || id;
  const dealOf = (id) => deals?.find((d) => d.id === id)?.ref || id;

  async function send(method, body) {
    setBusy(true);
    const res = await fetch(`/api/studios/${slug}/assets/allocations`, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const out = await res.json().catch(() => ({ error: "failed" }));
    setBusy(false);
    if (out?.error) {
      // The server's refusal token, said in the reader's language. `refuse` is
      // keyed by the exact token `allocationProblem` returns, so a new rule
      // there surfaces as an untranslated token rather than a wrong sentence.
      setError({
        from: tr.refuseFrom, order: tr.refuseOrder, asset: tr.refuseAsset,
        // `clash` is the token `allocationProblem` returns for a double booking.
        // This key read `overlap`, which nothing returns, so the one refusal
        // that matters most showed the raw word "clash" in both languages.
        deal: tr.refuseDeal, clash: tr.refuseOverlap,
      }[out.detail || out.error] || out.detail || out.error);
      return;
    }
    setError("");
    setDraft(null);
    await load();
  }

  const cell = "px-3 py-2 text-sm";
  const head = "px-3 py-2 text-start text-[12px] uppercase tracking-wide font-600 text-slate-400 dark:text-slate-500";

  // THE EMPTY STATE POINTS AT THE REGISTER, not at this screen. Allocation reads
  // the equipment records; with none, there is nothing to allocate and "no
  // allocations" would send somebody looking for an Add button that cannot help.
  if (assets.length === 0) {
    return (
      <div className="rounded-geex border border-slate-200/70 bg-white p-8 dark:border-white/10 dark:bg-[#20202c]">
        <h2 className="font-display text-lg font-800 text-slate-900 dark:text-white">{tr.noFleet}</h2>
        <p className="mt-2 max-w-xl text-sm text-slate-500 dark:text-slate-400">{tr.noFleetBody}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-800 text-slate-900 dark:text-white">{tr.title}</h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">{tr.lead}</p>
      </div>

      {typeof error === "string" && error && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>
      )}

      {utilisation && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Tile label={tr.totalCost} value={<span className="num">{utilisation.cost.toLocaleString()}</span>} />
          <Tile label={tr.totalDays} value={<span className="num">{utilisation.days}</span>} />
          {/* SHOWN EVEN WHEN NOUGHT, because "we charge for everything we run"
              is a real and reassuring answer, and hiding the row would make its
              absence indistinguishable from the metric not existing. */}
          <Tile label={tr.unrated} value={<span className="num">{utilisation.unratedDays}</span>} hint={tr.unratedHint} />
        </div>
      )}

      <section className="rounded-geex border border-slate-200/70 bg-white p-6 dark:border-white/10 dark:bg-[#20202c]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.allocations}</h3>
          {canManage && !draft && (
            <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-600 text-white"
              onClick={() => setDraft({ assetId: "", dealId: "", from: "", to: "", dailyRate: "" })}>
              {tr.allocate}
            </button>
          )}
        </div>

        {/* EVERY CONTROL THROUGH `Field`, which is the house rule and a
            standing instruction: a form whose controls are hand-rolled is a form
            whose labels and heights do not line up with the rest of the product.
            `tests/restructure.mjs` refuses a native <select> in source, which is
            what caught the first draft of this screen. */}
        {draft && (
          <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-5 dark:border-white/15">
            <Field label={tr.asset} as="select" required value={draft.assetId}
              onChange={(v) => {
                // THE REGISTER'S RATE IS OFFERED, NOT IMPOSED. It prefills so
                // the common case is one click, and stays editable because a
                // machine can go out at a negotiated rate — and whatever is
                // typed is what gets COPIED onto the allocation, which is the
                // number that job is charged forever after.
                const a = assets.find((x) => x.id === v);
                setDraft({ ...draft, assetId: v, dailyRate: a?.hireRate || "" });
              }}
              options={assets.map((a) => ({
                value: a.id,
                label: `${a.name}${a.assetTag ? ` \u00b7 ${a.assetTag}` : ""}${a.status ? ` \u00b7 ${a.status}` : ""}`,
              }))} />

            {/* THE JOB PICKER DEGRADES TO A PLAIN FIELD rather than refusing.
                `deals` is null when `engagements.view` was refused — see the
                fetch above — and an empty dropdown would read as "there are no
                jobs" to somebody who simply may not see them. */}
            {deals ? (
              <Field label={tr.deal} as="select" required value={draft.dealId}
                onChange={(v) => setDraft({ ...draft, dealId: v })}
                options={deals.map((d) => ({ value: d.id, label: `${d.ref} \u00b7 ${d.clientName || d.title}` }))} />
            ) : (
              <Field label={tr.deal} required value={draft.dealId}
                onChange={(v) => setDraft({ ...draft, dealId: v })} />
            )}

            <Field label={tr.from} type="date" required value={draft.from}
              onChange={(v) => setDraft({ ...draft, from: v })} />
            {/* A BLANK `to` IS A FACT — the machine is still out — so the hint
                says so rather than the field looking unfinished. */}
            <Field label={tr.to} type="date" value={draft.to} hint={tr.stillOut}
              onChange={(v) => setDraft({ ...draft, to: v })} />
            <Field label={tr.dailyRate} type="number" value={draft.dailyRate} hint={tr.dailyRateHint}
              onChange={(v) => setDraft({ ...draft, dailyRate: v })} />

            <div className="flex items-end gap-2 sm:col-span-5">
              <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-600 text-white disabled:opacity-50"
                disabled={busy} onClick={() => send("POST", { ...draft, dailyRate: Number(draft.dailyRate) || 0 })}>
                {busy ? tr.saving : tr.save}
              </button>
              <button className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-600 text-slate-700 dark:border-white/15 dark:text-slate-200"
                onClick={() => { setDraft(null); setError(""); }}>{tr.cancel}</button>
            </div>
          </div>
        )}

        {allocations.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400 dark:text-slate-500">{tr.noAllocations}</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[42rem]">
              <thead><tr>
                <th className={head}>{tr.asset}</th>
                <th className={head}>{tr.deal}</th>
                <th className={head}>{tr.from}</th>
                <th className={head}>{tr.to}</th>
                <th className={head}>{tr.dailyRate}</th>
                <th />
              </tr></thead>
              <tbody>
                {allocations.map((a) => (
                  <tr key={a.id} className="border-t border-slate-100 dark:border-white/10">
                    <td className={cell}>{nameOf(a.assetId)}</td>
                    <td className={cell}>{dealOf(a.dealId)}</td>
                    <td className={cell}>{fmtDate(a.from, locale)}</td>
                    {/* A BLANK `to` IS A FACT, not a missing value: the machine
                        is still out. Rendering an em dash would read as data
                        somebody forgot to enter. */}
                    <td className={cell}>{a.to ? fmtDate(a.to, locale) : <span className="text-slate-400 dark:text-slate-500">{tr.stillOut}</span>}</td>
                    <td className={`${cell} num`}>{Number(a.dailyRate) > 0 ? Number(a.dailyRate).toLocaleString() : "—"}</td>
                    <td className={cell}>
                      {canManage && (
                        <button className="text-slate-400 hover:text-rose-500" aria-label={tr.remove}
                          disabled={busy} onClick={() => send("DELETE", { id: a.id })}>×</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {utilisation && utilisation.byAsset.length > 0 && (
        <section className="grid gap-4 lg:grid-cols-2">
          <Report title={tr.byDeal} rows={utilisation.deals.map((d) => ({
            key: d.dealId, label: dealOf(d.dealId), days: d.days, cost: d.cost,
          }))} tr={tr} head={head} cell={cell} />
          <Report title={tr.byAsset} rows={utilisation.byAsset.map((a) => ({
            key: a.assetId, label: nameOf(a.assetId), days: a.days, cost: a.cost,
          }))} tr={tr} head={head} cell={cell} />
        </section>
      )}
    </div>
  );
}

function Tile({ label, value, hint }) {
  return (
    <div className="rounded-geex border border-slate-200/70 bg-white p-4 dark:border-white/10 dark:bg-[#20202c]" title={hint}>
      <p className="text-[12px] uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
      <p className="mt-1 font-display text-2xl font-800 text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}

function Report({ title, rows, tr, head, cell }) {
  return (
    <div className="rounded-geex border border-slate-200/70 bg-white p-6 dark:border-white/10 dark:bg-[#20202c]">
      <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{title}</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full">
          <thead><tr>
            <th className={head}>{title}</th>
            <th className={head}>{tr.days}</th>
            <th className={head}>{tr.cost}</th>
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-slate-100 dark:border-white/10">
                <td className={cell}>{r.label}</td>
                <td className={`${cell} num`}>{r.days}</td>
                <td className={`${cell} num`}>{r.cost.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
