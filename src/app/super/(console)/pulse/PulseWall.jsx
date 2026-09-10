"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import WorldMap from "./WorldMap";
import { Panel, Ticker, Sparkline, BarRow, Donut, HeatGrid, SignupChart, fmt } from "./parts";
import { heatLevel } from "@/lib/data/pulse";
import { present } from "../../_components/Present";

// THE PULSE WALL — a screen meant to be left on a screen.
//
// WHAT IT MAY CLAIM is the whole design, and every panel here is answerable:
// continent-grade traffic (the finest thing /api/track keeps), country-grade
// studios (a fact each one typed about itself), and arrivals with real
// timestamps. The reference design's city dots, per-visitor flags and live page
// views are absent because the data is absent, and the legend says so in words
// rather than leaving a viewer to assume the map knows where anybody is.
//
// TWO POLLS, TWO SPEEDS. The aggregate refreshes every 60s; who-is-here every
// 20s, which is already faster than its source can change (lastSeenAt is stamped
// on a three-minute throttle). Nothing polls every two seconds, because there is
// nothing that could differ.
//
// THE WALL HAS NO THEME CONTROL OF ITS OWN ANY MORE. It carried the three-way
// chips and a `T` shortcut while it was the only full-bleed screen; the console
// header sits above it now and holds the one control for every console page,
// on the same cookie (@/lib/theme). Two controls on one screen is two places to
// look for the same thing, which is what the owner asked to be rid of.

const MODES = [
  { key: "dots", label: "Live dots" },
  { key: "heat", label: "Heatmap" },
  { key: "bubbles", label: "Bubbles" },
  { key: "arcs", label: "Arcs → HQ" },
];
const RANGES = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
];
// WHICH SYSTEM EACH PANEL IS ABOUT, said on the panel itself.
//
// The wall mixes measurements that are not the same population: the TRAFFIC
// panels are anonymous page views counted by /api/track, and the PRODUCT panels
// are signed-in people and the studios they belong to. Reading 14 on one and 3
// on another and assuming they are the same people is the mistake this stops.
const SOURCE = { www: "Website", erp: "Product" };

// AND THE TRAFFIC HALF IS NOW TWO SURFACES, switchable. Both the public site and
// the studio beacon to /api/track, into stores of their own, so "both" is the
// pair added rather than a third counter that could disagree with its parts.
const SOURCES = [
  { key: "all", label: "www + ERP" },
  { key: "www", label: "www" },
  { key: "erp", label: "ERP" },
];

const AGGREGATE_MS = 60_000;
const LIVE_MS = 20_000;

const chip = "rounded-md px-2 py-1 text-[11px] font-600 transition-colors";

// THE WALL'S MARK: a heartbeat trace in the logo ramp. The gradient id is
// fixed because the mark is drawn once per page; two on one page would share
// one definition, which is harmless since they are identical.
function PulseMark() {
  return (
    <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true" className="h-[30px] w-[30px]">
      <defs>
        <linearGradient id="pulse-mark-ramp" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#48caed" />
          <stop offset="55%" stopColor="#fe9e04" />
          <stop offset="100%" stopColor="#ff3333" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="9" fill="none" stroke="url(#pulse-mark-ramp)" strokeWidth="2" />
      <path d="M5 17h5l2.5-6 4 11 3-8 1.5 3H27" fill="none" stroke="url(#pulse-mark-ramp)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function PulseWall({ initial, initialLive }) {
  const [data, setData] = useState(initial);
  const [live, setLive] = useState(initialLive);
  const [range, setRange] = useState(initial?.range || "30d");
  const [source, setSource] = useState(initial?.source || "all");
  const [mode, setMode] = useState("dots");
  const [ripples, setRipples] = useState([]);
  const [reduced, setReduced] = useState(false);
  const seen = useRef(new Set((initialLive?.arrivals || []).map((a) => `${a.kind}:${a.at}`)));


  // ---- preferences ---------------------------------------------------------
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // ---- polling -------------------------------------------------------------
  // THE FIRST POLL WAITS A FULL INTERVAL when the server already painted this
  // exact range and source. It fired on mount, so every load read the whole
  // wall TWICE within a second — measured on production 10/09/2026: the page's
  // own read, then an identical 123-query /api/super/pulse straight after it.
  // Choosing another chip still asks immediately, because that answer is not
  // on the screen yet.
  const livePainted = useRef(Boolean(initialLive));
  const painted = useRef(`${initial?.range || "30d"}|${initial?.source || "all"}`);
  useEffect(() => {
    let alive = true;
    const pull = () => {
      fetch(`/api/super/pulse?range=${range}&source=${source}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (alive && d) setData(d); })
        .catch(() => { /* a wall keeps showing the last good answer */ });
    };
    if (painted.current !== `${range}|${source}`) pull();
    painted.current = "";
    const id = setInterval(pull, AGGREGATE_MS);
    return () => { alive = false; clearInterval(id); };
  }, [range, source]);

  useEffect(() => {
    let alive = true;
    const pull = () => {
      fetch("/api/super/pulse/live", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!alive || !d) return;
          setLive(d);
          // A RIPPLE IS A NEW ARRIVAL, not every arrival on every poll. Without
          // the seen-set the wall would replay its whole feed twice a minute,
          // which reads as a burst of activity that did not happen.
          const fresh = (d.arrivals || []).filter((a) => !seen.current.has(`${a.kind}:${a.at}`));
          for (const a of d.arrivals || []) seen.current.add(`${a.kind}:${a.at}`);
          // ONLY A STUDIO RIPPLES. A user registering carries no geography at
          // all — we know when, not where — and dropping their ripple on the map
          // anywhere, including HQ, would be the wall inventing a location. They
          // appear in the feed, where a timestamp is the whole claim.
          const placed = fresh.filter((a) => a.continent);
          if (placed.length) {
            const now = performance.now();
            setRipples((rs) => [
              ...rs.filter((r) => now - r.t < 2400),
              ...placed.map((a) => ({ t: now, continent: a.continent, kind: a.kind })),
            ]);
          }
        })
        .catch(() => {});
    };
    // Same reason: the server handed `initialLive` over a moment ago. Read
    // through a ref so this stays a mount-only effect.
    if (!livePainted.current) pull();
    livePainted.current = false;
    const id = setInterval(pull, LIVE_MS);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // ---- present -------------------------------------------------------------
  // The button and the clock live in the console header now
  // (_components/Present); the wall keeps the `F` key, calling the same function.
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // BARE LETTERS, SO THEY STAND DOWN FOR ANYTHING EDITABLE. This guard
      // arrived when Broadcast was a pane on this route — typing "for" into a
      // greeting went fullscreen on the f and flipped the theme on the t. The
      // pane is its own route now and this wall has no fields of its own, but a
      // shortcut that fires while somebody is typing is a bug waiting for the
      // first field anybody adds here.
      const el = e.target;
      if (el && (el.isContentEditable || /^(input|textarea|select)$/i.test(el.tagName || ""))) return;
      const k = e.key.toLowerCase();
      if (k === "f") { e.preventDefault(); present(); return; }
      const n = Number(e.key);
      if (n >= 1 && n <= MODES.length) setMode(MODES[n - 1].key);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ---- derived -------------------------------------------------------------
  // Memoised because it feeds two useMemos below: a fresh [] on every render
  // would recompute the grid and the peak on every render, live polls included.
  const continents = useMemo(() => data?.continents || [], [data]);
  const peak = useMemo(() => continents.reduce((m, c) => Math.max(m, c.visits), 0), [continents]);
  const rangeLabel = RANGES.find((r) => r.key === range)?.label || range;

  const gridDays = useMemo(() => (data?.grid || []).map((g) => g.day), [data]);
  const gridRows = useMemo(() => {
    const grid = data?.grid || [];
    return continents
      .filter((c) => c.name !== "Others" || c.visits > 0)
      .map((c) => {
        const byDay = {};
        let total = 0;
        for (const g of grid) {
          const n = g.byContinent[c.name] || 0;
          byDay[g.day] = n;
          total += n;
        }
        return { name: c.name, byDay, total };
      });
  }, [data, continents]);

  const gridPeak = useMemo(
    () => gridRows.reduce((m, r) => Math.max(m, ...Object.values(r.byDay), 0), 0),
    [gridRows],
  );

  const cityCount = (data?.cities || []).length;
  const devices = data?.devices || [];
  const deviceColors = ["var(--ad-primary)", "var(--ad-warning)", "var(--ad-success)"];
  const countries = data?.studios?.countries || [];
  const topCountry = countries[0]?.n || 1;
  const sessions = (data?.points || []).map((p) => p.sessions);

  return (
    <div
      className="grid h-full w-full gap-3 overflow-hidden p-3"
      style={{
        gridTemplateColumns: "minmax(230px,1fr) minmax(0,3.2fr) minmax(260px,1.15fr)",
        gridTemplateRows: "auto 1fr 1fr 0.85fr",
        gridTemplateAreas: `"top top top" "legend map live" "cont map right" "sign sign sign"`,
      }}
    >
      {/* ---- header ---------------------------------------------------- */}
      <header style={{ gridArea: "top" }} className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {/* A PULSE, NOT THE COMPANY LOGO — the owner's instruction, 10/09/2026.
            The header above already carries the nompany mark; a second one here
            said the same thing twice. The trace is drawn in the logo's own ramp
            (cyan → amber → red, the colours Broadcast's default band uses), so
            it is still nompany's without being its logo. */}
        <Link href="/super/dashboard" className="flex items-center gap-2.5" aria-label="Back to the console">
          <PulseMark />
          <span className="text-base font-800 tracking-tight">Pulse</span>
        </Link>

        <div className="flex flex-wrap items-center gap-4">
          <Kpi label="Visitors today" value={data?.traffic?.today?.sessions ?? 0} delta={data?.traffic?.delta?.sessions} />
          <Kpi label="Page views today" value={data?.traffic?.today?.pageViews ?? 0} delta={data?.traffic?.delta?.pageViews} />
          <Kpi label="Studios" value={data?.studios?.total ?? 0} sub={`+${data?.studios?.thisWeek ?? 0} this week`} />
          <Kpi label="Active now" value={live?.activeNow ?? 0} sub={`of ${fmt(live?.people ?? 0)} people`} />
        </div>

        <div className="ms-auto flex items-center gap-2">
          {/* THE SOURCE TOGGLE, and it moves only the traffic panels — the map,
              the continent grid, the devices and the pages. "Right now" and the
              studio counts have no www/ERP split to make: a person signed into
              the product is not website traffic. */}
          <div className="flex items-center gap-0.5 rounded-lg border p-0.5" style={{ borderColor: "var(--ad-border)" }} role="group" aria-label="Traffic source">
            {SOURCES.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSource(s.key)}
                aria-pressed={source === s.key}
                className={chip}
                style={source === s.key
                  ? { background: "var(--ad-primary)", color: "var(--ad-primary-foreground)" }
                  : { color: "var(--ad-muted-foreground)" }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ---- legend ------------------------------------------------------ */}
      <Panel className="[grid-area:legend]" title="Legend" sub={`${SOURCE.www} · ${MODES.find((m) => m.key === mode)?.label}`}>
        <div className="flex h-full flex-col justify-between gap-3">
          <div className="space-y-1.5 text-[11px]">
            <LegendRow swatch="var(--ad-border)" label="Land — no traffic recorded" />
            <LegendRow swatch="var(--ad-primary)" label="Visitors, by continent" value={fmt(continents.reduce((s, c) => s + c.visits, 0))} />
            <LegendRow swatch="var(--ad-success)" label="Studio signed up" value={fmt(data?.studios?.thisWeek ?? 0)} />
            <LegendRow swatch="var(--ad-warning)" label="HQ — Amman" />
          </div>

          <div>
            <div className="flex h-2.5 overflow-hidden rounded-full">
              {[0.22, 0.38, 0.56, 0.78, 1].map((a) => (
                <span key={a} className="flex-1" style={{ background: `rgb(var(--ad-warning-rgb) / ${a})` }} />
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[10px]" style={{ color: "var(--ad-muted-foreground)" }}>
              <span>1 visit</span>
              <span>peak <b className="num">{fmt(peak)}</b></span>
            </div>
          </div>

          {/* THE HONEST SENTENCE, and it has to keep matching what is stored.
              It said "continent and day — no city" until the city counters
              landed; leaving that would have been a wall disclaiming precision
              it now has. The two figures below are DIFFERENT POPULATIONS — a
              visit the edge could not place, and every visit recorded before
              08/09/2026, is in the continent total and in no point — so the
              shortfall is stated rather than left to be inferred. */}
          <p className="text-[10px] leading-relaxed" style={{ color: "var(--ad-muted-foreground)" }}>
            {cityCount > 0 ? (
              <>
                {/* The explicit space is load-bearing: JSX drops whitespace at a
                    line boundary, so `</b> cities` on two lines renders as
                    "14cities". */}
                <b className="num">{fmt(cityCount)}</b>{" "}
                cities located from the edge&apos;s own headers — city centroid
                rounded to ~1 km. No IP, and no visitor is tied to a place.
              </>
            ) : (
              <>Traffic is recorded by <b>continent and day</b>. City points begin
                from 08/09/2026; earlier days have none.</>
            )}
          </p>
        </div>
      </Panel>

      {/* ---- map --------------------------------------------------------- */}
      <Panel
        className="[grid-area:map]"
        title="Where the traffic is"
        sub={`${SOURCE.www} · ${fmt(data?.traffic?.sessions ?? 0)} sessions · ${rangeLabel}`}
        bodyClass="relative flex flex-col"
      >
        <div className="pointer-events-none absolute inset-x-0 top-2 z-10 flex justify-center">
          <div className="pointer-events-auto flex gap-1 rounded-lg border p-1" style={{ background: "var(--ad-card)", borderColor: "var(--ad-border)" }}>
            {MODES.map((m, i) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMode(m.key)}
                className={chip}
                style={mode === m.key
                  ? { background: "var(--ad-primary)", color: "var(--ad-primary-foreground)" }
                  : { color: "var(--ad-muted-foreground)" }}
                title={`Press ${i + 1}`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <div className="pointer-events-none absolute end-4 top-2 z-10 flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              className={`${chip} pointer-events-auto border`}
              style={range === r.key
                ? { borderColor: "var(--ad-primary)", color: "var(--ad-primary)" }
                : { borderColor: "var(--ad-border)", color: "var(--ad-muted-foreground)" }}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1">
          <WorldMap
            mode={mode}
            continents={continents}
            cities={data?.cities || []}
            ripples={ripples}
            reducedMotion={reduced}
            rangeLabel={rangeLabel}
          />
        </div>
      </Panel>

      {/* ---- live -------------------------------------------------------- */}
      <Panel className="[grid-area:live]" title="Right now" sub={`${SOURCE.erp} · every ${LIVE_MS / 1000}s`} bodyClass="flex flex-col gap-2">
        <div className="flex items-end justify-between">
          <div>
            <Ticker value={live?.activeNow ?? 0} className="text-[40px] font-800 leading-none" />
            <p className="mt-0.5 text-[11px]" style={{ color: "var(--ad-muted-foreground)" }}>
              people active in the product
            </p>
          </div>
          <span className="flex items-center gap-1.5 text-[10px]" style={{ color: "var(--ad-muted-foreground)" }}>
            <span
              className={`inline-block h-2 w-2 rounded-full ${reduced ? "" : "animate-pulse"}`}
              style={{ background: "var(--ad-success)" }}
            />
            live
          </span>
        </div>

        <Sparkline points={sessions} />

        <div className="min-h-0 flex-1 overflow-hidden">
          <p className="mb-1 text-[10px] uppercase tracking-wider" style={{ color: "var(--ad-muted-foreground)" }}>
            Arrivals
          </p>
          <ul className="space-y-1">
            {(live?.arrivals || []).slice(0, 9).map((a) => (
              <li key={`${a.kind}:${a.at}`} className="flex items-center gap-2 text-[11px]">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: a.kind === "studio" ? "var(--ad-success)" : "var(--ad-primary)" }}
                />
                <span className="truncate" style={{ color: "var(--ad-foreground)" }}>{a.label}</span>
                <span className="shrink-0" style={{ color: "var(--ad-muted-foreground)" }}>
                  {a.kind === "studio" ? "signed up" : a.kind === "user" ? "registered" : "signed in"}
                </span>
                <span className="num ms-auto shrink-0" style={{ color: "var(--ad-muted-foreground)" }}>
                  {a.at.slice(11, 16)}
                </span>
              </li>
            ))}
            {(live?.arrivals || []).length === 0 ? (
              <li className="text-[11px]" style={{ color: "var(--ad-muted-foreground)" }}>
                nothing yet today
              </li>
            ) : null}
          </ul>
        </div>
      </Panel>

      {/* ---- continent x day --------------------------------------------- */}
      <Panel className="[grid-area:cont]" title="Continent by day" sub={`${SOURCE.www} · ${rangeLabel}`} bodyClass="overflow-auto">
        <HeatGrid rows={gridRows} days={gridDays} levelOf={(n) => heatLevel(n, gridPeak)} />
      </Panel>

      {/* ---- countries + devices ----------------------------------------- */}
      <Panel className="[grid-area:right]" title="Studios by country" sub={`${SOURCE.erp}${data?.studios?.unplaced ? ` · ${data.studios.unplaced} unplaced` : ""}`}>
        <div className="flex h-full flex-col justify-between gap-2">
          <div>
            {countries.length === 0 ? (
              <p className="text-[11px]" style={{ color: "var(--ad-muted-foreground)" }}>
                No studio has set a country yet.
              </p>
            ) : (
              countries.map((c) => (
                <BarRow key={c.code} lead={c.flag} label={c.name} value={c.n} pct={(c.n / topCountry) * 100} />
              ))
            )}
          </div>
          <div className="flex items-center gap-3">
            <Donut slices={devices.map((d, i) => ({ label: d.label, value: d.value, color: deviceColors[i % 3] }))} size={92} />
            <ul className="space-y-1 text-[11px]">
              {devices.map((d, i) => (
                <li key={d.label} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm" style={{ background: deviceColors[i % 3] }} />
                  <span style={{ color: "var(--ad-muted-foreground)" }}>{d.label}</span>
                  <span className="num" style={{ color: "var(--ad-foreground)" }}>{d.value}%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Panel>

      {/* ---- signups ------------------------------------------------------ */}
      <Panel
        className="[grid-area:sign]"
        title="Studios signed"
        sub={`${SOURCE.erp} · 90 days · bars are per day, the line is the running total`}
      >
        <SignupChart days={data?.signups || []} height={92} />
      </Panel>

      {/* THE BOTTOM BAR, the same strip the project sheets and Operations use —
          `sidebarInset` off, because the wall is full-bleed and a bar reserving
          288px for a sidebar that is not there sits visibly off-centre.
          One item: this screen has a single panel, and the bar is here so the
          wall matches the rest of the product rather than to switch anything. */}
    </div>
  );
}

function LegendRow({ swatch, label, value }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: swatch }} />
      <span className="truncate" style={{ color: "var(--ad-muted-foreground)" }}>{label}</span>
      {value != null ? <span className="num ms-auto" style={{ color: "var(--ad-foreground)" }}>{value}</span> : null}
    </div>
  );
}

function Kpi({ label, value, delta, sub }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--ad-muted-foreground)" }}>{label}</span>
      <span className="flex items-baseline gap-1.5">
        <Ticker value={value} className="text-lg font-800 leading-tight" />
        {/* NULL IS NOT ZERO: no arrow at all when there was nothing to compare
            against, rather than a confident 0%. */}
        {delta != null ? (
          <span className="num text-[11px]" style={{ color: delta >= 0 ? "var(--ad-success)" : "var(--ad-destructive)" }}>
            {delta >= 0 ? "▲" : "▼"}{Math.abs(delta)}%
          </span>
        ) : null}
        {sub ? <span className="text-[10px]" style={{ color: "var(--ad-muted-foreground)" }}>{sub}</span> : null}
      </span>
    </div>
  );
}
