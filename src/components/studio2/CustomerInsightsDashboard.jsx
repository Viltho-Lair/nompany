"use client";

// CUSTOMER INSIGHTS (19/09/2026) — the owner's buying-pattern analysis, live
// rather than rebuilt from a month of exported invoices. Every customer's seven
// periods read as three blocks (3 + 3 + now), each block's level judged against
// the studio's own customers, and a named pattern from the three. The server
// does all of it (modules/sales/insights); this screen chooses the period, the
// measure and which customers to act on.
//
// THE ANALYSIS IS THE ADVANCED TIER: both widgets go through `gate()`, so a
// tier without them shows the locked teaser, and a studio that switched this
// part off never sees the widgets at all.
//
// NO LIVE UPDATES, deliberately. The analysis reads months of invoices,
// receipts and deals; re-running it because one ticket moved would cost the
// whole read for a change that cannot move a pattern until a period closes.

import { useCallback, useMemo, useState } from "react";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import { useReload } from "@/components/studio2/useReload";
import { useStudioLocale } from "@/components/studio2/locale";
import { panel, h2, sub, btn, btnGhost, Dialog, fmtDate, money } from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";
import { Widget } from "@/components/dashboard";
import { Scatter, PALETTE } from "@/components/charts";
import { useWidgetGate } from "@/components/studio2/analyticsLevel";
import { insightsDict } from "@/shared/studio/customerInsights";
import { PATTERNS, PERIOD_UNITS, MEASURES } from "@/modules/sales/insightsModel";

const DIRECT = "~direct";
const PAGE = 50;

// A COLOUR PER PATTERN, grouped by what the team should feel: good, watch, act.
const TONE = {
  loyal: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  growing: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  steady: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  new: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  returning: "bg-violet/10 text-violet",
  fading: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  slipping: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  stopped: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  lapsed: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  dormant: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300",
};
const LEVEL_TONE = ["text-slate-400", "text-amber-600 dark:text-amber-300", "text-sky-600 dark:text-sky-300", "text-emerald-600 dark:text-emerald-300"];

function Chip({ pattern, tr }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-600 ${TONE[pattern] || TONE.dormant}`}>{tr.pattern(pattern)}</span>;
}

// `initial` IS THIS SCREEN'S OWN /sales/insights BODY for the DEFAULT choices
// (month, value, not current), answered inside the studio page's render, so the
// dashboard paints at once. Changing a choice changes the reader and fetches, as
// it always did. Absent — refused, or over the ceiling — it fetches on mount.
export default function CustomerInsightsDashboard({ slug, initial }) {
  const locale = useStudioLocale();
  const tr = insightsDict(locale);
  const gate = useWidgetGate();
  const [opts, setOpts] = useState({ unit: "month", measure: "value", current: false });
  const [data, setData] = useState(initial ?? null);
  const [error, setError] = useState("");
  const [pattern, setPattern] = useState("");
  const [query, setQuery] = useState("");
  const [moved, setMoved] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [picked, setPicked] = useState(() => new Set());
  const [by, setBy] = useState("person");
  const [sending, setSending] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  // A STRING, so it is equal between renders whenever the choices are.
  const params = `unit=${opts.unit}&measure=${opts.measure}&current=${opts.current ? "1" : "0"}`;

  const reload = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/sales/insights?${params}`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setError(tr.refuse[body.error] || body.error || tr.failed); return; }
    setError("");
    setData(body);
  }, [slug, params, tr]);

  useReload(reload, initial);

  const customers = useMemo(() => data?.customers || [], [data]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers.filter((c) => (!pattern || c.pattern === pattern)
      && (!moved || (c.was && c.was !== c.pattern))
      && (!q || c.name.toLowerCase().includes(q)));
  }, [customers, pattern, moved, query]);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <ScreenSkeleton loadingLabel={tr.loading} />;

  const { currency = "", periods = [], bands = [], tiles = [], scatter = {}, sources = {}, can = {}, campaigns = [] } = data;
  const isValue = data.measure === "value";
  const amount = (n) => (isValue ? `${money(n || 0, currency)}${currency ? ` ${currency}` : ""}` : String(n || 0));
  const cash = (n) => `${money(n || 0, currency)}${currency ? ` ${currency}` : ""}`;
  const usedSources = ["invoices", "receipts", "deals"].filter((k) => sources[k]).map((k) => tr.sourceNames[k]);
  const toggle = (key) => setPicked((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  const csvHref = `/api/studios/${slug}/sales/insights?${params}&format=csv&lang=${locale}${pattern ? `&pattern=${pattern}` : ""}`;
  const labelOf = (label) => (label === DIRECT ? tr.direct : label);
  const points = (scatter[by] || []).map((p, i) => ({
    x: p.count, y: p.value, color: PALETTE[i % PALETTE.length],
    label: tr.pointLine(labelOf(p.label), p.count, cash(p.value)),
  }));

  const send = async () => {
    setBusy(true); setError("");
    const res = await fetch(`/api/studios/${slug}/sales/insights`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...opts, current: opts.current ? "1" : "0", lang: locale, customers: [...picked], campaignId: sending.campaignId, note: sending.note }),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(tr.refuse[out.error] || out.error || tr.failed); return; }
    setSending(null);
    setPicked(new Set());
    setNotice(tr.sentLine(out.raised || 0, out.skipped || 0));
    await reload();
  };

  return (
    <div className="space-y-4">
      <section className={panel}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 max-w-2xl">
            <h2 className={h2}>{tr.title}</h2>
            <p className={sub}>{tr.sub}</p>
          </div>
          {can.export && <a className={btnGhost} href={csvHref} download>{tr.download}</a>}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Field label={tr.unit} as="select" value={opts.unit}
            onChange={(v) => { setOpts((o) => ({ ...o, unit: v })); setShown(PAGE); }}
            options={PERIOD_UNITS.map((u) => ({ value: u, label: tr.units[u] }))} />
          <Field label={tr.measure} as="select" value={opts.measure}
            onChange={(v) => setOpts((o) => ({ ...o, measure: v }))}
            options={MEASURES.map((m) => ({ value: m, label: tr.measures[m] }))} />
          <Field label={tr.current} as="select" value={opts.current ? "1" : "0"}
            onChange={(v) => setOpts((o) => ({ ...o, current: v === "1" }))}
            options={[{ value: "0", label: tr.currentOff }, { value: "1", label: tr.currentOn }]} />
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          {usedSources.length ? tr.sources(usedSources) : tr.noSources}
          {data.unconverted ? ` ${tr.unconverted(data.unconverted)}` : ""}
        </p>
        {notice && <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">{notice}</p>}
        {error && <p className="mt-2 text-sm text-rose-600 dark:text-rose-300">{error}</p>}
      </section>

      <Widget title={tr.tilesTitle} hint={tr.bandsHint} {...gate("sales.customer-patterns")} lockedWhat={tr.title}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {tiles.map((t) => (
            <button key={t.pattern} type="button" title={tr.patternHint(t.pattern)}
              onClick={() => { setPattern(pattern === t.pattern ? "" : t.pattern); setShown(PAGE); }}
              className={`rounded-xl border p-3 text-start transition-colors ${pattern === t.pattern
                ? "border-brand-600 bg-brand-50/60 dark:border-brand-400 dark:bg-white/5"
                : "border-slate-200/70 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"}`}>
              <Chip pattern={t.pattern} tr={tr} />
              <p className="num mt-2 text-lg font-800 text-[var(--geex-ink)]">{t.customers}</p>
              <p className="num text-xs text-slate-500 dark:text-slate-400">{cash(t.value)}</p>
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {bands.map((b, i) => (
            <div key={i} className="rounded-xl bg-slate-50 p-3 text-xs dark:bg-white/5">
              <p className="font-600 text-[var(--geex-ink)]">
                {tr.blocks[i]} · {tr.periodLabel(periods[[0, 3, 6][i]])}{i < 2 ? ` – ${tr.periodLabel(periods[[2, 5][i]])}` : ""}
              </p>
              <p className="mt-1 text-slate-500 dark:text-slate-400">{tr.bandLine(amount(b.low), amount(b.high), b.customers)}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-end gap-3">
          <div className="min-w-[12rem] flex-1">
            <Field label={tr.search} value={query} onChange={(v) => { setQuery(v); setShown(PAGE); }} />
          </div>
          <div className="min-w-[12rem]">
            <Field label={tr.colPattern} as="select" value={pattern} onChange={(v) => { setPattern(v); setShown(PAGE); }}
              options={[{ value: "", label: tr.all }, ...PATTERNS.map((p) => ({ value: p, label: tr.pattern(p) }))]} />
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={moved} onChange={(e) => { setMoved(e.target.checked); setShown(PAGE); }} />
            {tr.movedOnly}
          </label>
        </div>

        {can.act && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-500 dark:text-slate-400">{tr.selected(picked.size)}</span>
            <button type="button" className={btnGhost}
              onClick={() => setPicked(new Set(filtered.filter((c) => !c.openDeal).slice(0, 100).map((c) => c.key)))}>{tr.selectAll}</button>
            {picked.size > 0 && <button type="button" className={btnGhost} onClick={() => setPicked(new Set())}>{tr.clear}</button>}
            {picked.size > 0 && (
              <button type="button" className={btn} onClick={() => setSending({ campaignId: "", note: "" })}>{tr.send(picked.size)}</button>
            )}
          </div>
        )}

        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">{tr.noCustomers}</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-slate-200/70 text-start text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
                  {can.act && <th className="w-8 py-2" />}
                  <th className="py-2 text-start font-600">{tr.colCustomer}</th>
                  <th className="py-2 text-start font-600">{tr.colPattern}</th>
                  {tr.blocks.map((b) => <th key={b} className="py-2 text-start font-600">{b}</th>)}
                  <th className="py-2 text-start font-600">{tr.colTotalValue}</th>
                  <th className="py-2 text-start font-600">{tr.colLastSale}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, shown).map((c) => {
                  const series = isValue ? c.value : c.count;
                  const peak = Math.max(1, ...series);
                  return (
                    <tr key={c.key} className="border-b border-slate-100 align-top last:border-0 dark:border-white/5">
                      {can.act && (
                        <td className="py-2.5">
                          <input type="checkbox" aria-label={c.name} disabled={c.openDeal}
                            checked={picked.has(c.key)} onChange={() => toggle(c.key)} />
                        </td>
                      )}
                      <td className="py-2.5 pe-3">
                        <p className="font-600 text-[var(--geex-ink)]">{c.name}</p>
                        {c.contact && (c.contact.phone || c.contact.email) && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">{[c.contact.name, c.contact.phone || c.contact.email].filter(Boolean).join(" · ")}</p>
                        )}
                        {c.openDeal && <p className="text-xs text-sky-600 dark:text-sky-300">{tr.openDeal}</p>}
                        <div className="mt-1.5 flex h-6 items-end gap-0.5" aria-hidden="true">
                          {series.map((v, i) => (
                            <span key={i} title={`${tr.periodLabel(periods[i])}: ${amount(v)}`}
                              className={`w-2 rounded-sm ${i === 6 ? "bg-brand-600" : "bg-slate-300 dark:bg-white/25"}`}
                              style={{ height: `${Math.max(v > 0 ? 12 : 4, (v / peak) * 100)}%`, opacity: v > 0 ? 1 : 0.4 }} />
                          ))}
                        </div>
                      </td>
                      <td className="py-2.5 pe-3">
                        <Chip pattern={c.pattern} tr={tr} />
                        <p className="num mt-1 text-xs text-slate-500 dark:text-slate-400">{c.signature}</p>
                        {c.was && c.was !== c.pattern && (
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{tr.colWas}: {tr.pattern(c.was)}</p>
                        )}
                      </td>
                      {c.blocks.map((v, i) => (
                        <td key={i} className="py-2.5 pe-3">
                          <p className={`text-xs font-600 ${LEVEL_TONE[c.levels[i]]}`}>{tr.level(c.levels[i])}</p>
                          <p className="num text-xs text-slate-500 dark:text-slate-400">{amount(v)}</p>
                        </td>
                      ))}
                      <td className="num py-2.5 pe-3">{cash(c.totalValue)}<p className="text-xs text-slate-500 dark:text-slate-400">{c.totalCount}</p></td>
                      <td className="py-2.5 text-xs text-slate-500 dark:text-slate-400">{c.lastSale ? fmtDate(c.lastSale) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length > shown && (
              <div className="mt-3 text-center">
                <button type="button" className={btnGhost} onClick={() => setShown((n) => n + PAGE)}>{tr.more(Math.min(PAGE, filtered.length - shown))}</button>
              </div>
            )}
          </div>
        )}
      </Widget>

      <Widget title={tr.scatterTitle} hint={tr.scatterHint} {...gate("sales.team-scatter")} lockedWhat={tr.scatterTitle}>
        <div className="mb-3 flex flex-wrap gap-2">
          {["person", "team", "channel"].map((k) => (
            <button key={k} type="button" onClick={() => setBy(k)} className={by === k ? btn : btnGhost}>{tr.by[k]}</button>
          ))}
        </div>
        {points.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">{tr.noScatter}</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
            <Scatter points={points} xTicks={["0", `${tr.salesAxis} ${Math.max(...points.map((p) => p.x))}`]}
              yTicks={["0", cash(Math.max(...points.map((p) => p.y)))]} />
            <ul className="space-y-2 text-sm">
              {(scatter[by] || []).slice(0, 12).map((p, i) => (
                <li key={p.label} className="flex items-center justify-between gap-3">
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
                    <span className="truncate">{labelOf(p.label)}</span>
                  </span>
                  <span className="num shrink-0 text-xs text-slate-500 dark:text-slate-400">{p.count} · {cash(p.value)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Widget>

      {sending && (
        <Dialog title={tr.sendTitle} description={tr.sendSub} onClose={() => setSending(null)} width="max-w-[520px]">
          <div className="space-y-4">
            {campaigns.length > 0 && (
              <Field label={tr.campaign} as="select" value={sending.campaignId}
                onChange={(v) => setSending((s) => ({ ...s, campaignId: v }))}
                options={[{ value: "", label: tr.campaignNone }, ...campaigns.map((c) => ({ value: c.id, label: c.label }))]} />
            )}
            <Field label={tr.note} as="textarea" value={sending.note} hint={tr.notePlaceholder}
              onChange={(v) => setSending((s) => ({ ...s, note: v }))} inputProps={{ maxLength: 1000 }} />
            {error && <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setSending(null)}>{tr.cancel}</button>
              <button type="button" className={btn} disabled={busy} onClick={send}>{tr.sendGo}</button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
