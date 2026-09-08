"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import WorldMap from "./WorldMap";
import { PanelBar } from "@/components/studio2/PanelBar";
import { readTheme, applyTheme, chooseTheme, THEME_MODES } from "@/lib/theme";
import { Panel, Ticker, Sparkline, BarRow, Donut, HeatGrid, SignupChart, fmt } from "./parts";
import { heatLevel } from "@/lib/data/pulse";

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
// THE THEME CONTROL IS THE PRODUCT'S OWN, not a third copy. Adding one here is
// what finally forced readTheme/applyTheme out of the two places that held them
// and into @/lib/theme — and those two DISAGREED, the console's copy toggling
// `dark` without ever clearing `light`, which lights every MUI control on a dark
// page. The wall, the console header and the public site now share one authority
// and one cookie, so a choice made on any of them is the choice everywhere.

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

export default function PulseWall({ initial, initialLive }) {
  const [data, setData] = useState(initial);
  const [live, setLive] = useState(initialLive);
  const [range, setRange] = useState(initial?.range || "30d");
  const [source, setSource] = useState(initial?.source || "all");
  const [mode, setMode] = useState("dots");
  const [clock, setClock] = useState("");
  const [ripples, setRipples] = useState([]);
  const [reduced, setReduced] = useState(false);
  // Seeded on mount rather than at render: the cookie is not readable on the
  // server, and guessing would flash the wrong control on a wall.
  const [theme, setTheme] = useState("light");
  const seen = useRef(new Set((initialLive?.arrivals || []).map((a) => `${a.kind}:${a.at}`)));

  // ---- preferences ---------------------------------------------------------
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    // A FRAME, not the effect body. The cookie is unreadable on the server, so
    // the control has to settle on the client — but setting state synchronously
    // inside an effect cascades a render (react-hooks/set-state-in-effect), and
    // the ESLint budget here is shrink-only.
    const id = requestAnimationFrame(() => setTheme(readTheme()));
    return () => cancelAnimationFrame(id);
  }, []);

  // Follow the OS while the choice is "system", the same as every other control.
  useEffect(() => {
    if (theme !== "system") return undefined;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const pickTheme = useCallback((next) => { setTheme(next); chooseTheme(next); }, []);

  // ---- the clock -----------------------------------------------------------
  // Rendered on the CLIENT only, after mount. A server-rendered clock is wrong
  // by the time it arrives and mismatches on hydration.
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString("en-GB", { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // ---- polling -------------------------------------------------------------
  useEffect(() => {
    let alive = true;
    const pull = () => {
      fetch(`/api/super/pulse?range=${range}&source=${source}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (alive && d) setData(d); })
        .catch(() => { /* a wall keeps showing the last good answer */ });
    };
    pull();
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
    pull();
    const id = setInterval(pull, LIVE_MS);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // ---- present -------------------------------------------------------------
  const present = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen({ navigationUI: "hide" });
    } catch { /* refused without a gesture, or unsupported — the wall is unharmed */ }
    // A wall's whole job is to stay lit. Best-effort: the lock is refused when
    // the tab is not visible, and dropped whenever it is hidden, which is fine —
    // nobody is watching a hidden wall.
    try { await navigator.wakeLock?.request("screen"); } catch {}
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "f") { e.preventDefault(); present(); return; }
      if (k === "t") {
        e.preventDefault();
        pickTheme(THEME_MODES[(THEME_MODES.indexOf(readTheme()) + 1) % THEME_MODES.length]);
        return;
      }
      const n = Number(e.key);
      if (n >= 1 && n <= MODES.length) setMode(MODES[n - 1].key);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [present, pickTheme]);

  // ---- derived -------------------------------------------------------------
  // Memoised because it feeds two useMemos below: a fresh [] on every render
  // would recompute the grid and the peak on every tick of the clock.
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
      className="grid h-[100dvh] w-full gap-3 p-3 pb-14"
      style={{
        background: "var(--ad-background)",
        color: "var(--ad-foreground)",
        gridTemplateColumns: "minmax(230px,1fr) minmax(0,3.2fr) minmax(260px,1.15fr)",
        gridTemplateRows: "auto 1fr 1fr 0.85fr",
        gridTemplateAreas: `"top top top" "legend map live" "cont map right" "sign sign sign"`,
      }}
    >
      {/* ---- header ---------------------------------------------------- */}
      <header style={{ gridArea: "top" }} className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {/* THE MARK, NOT THE WORD. `LogoMark` in components/landing is the usual
            way to draw it and cannot be used here: it imports motion/react,
            which Gate A forbids outside src/components/landing precisely so the
            console never pays its ~30 KB. Same asset, rendered plainly. */}
        <Link href="/super/dashboard/analytics" className="flex items-center gap-2.5" aria-label="Back to the console">
          <Image src="/brand/logo-icon.png" alt="nompany" width={30} height={30} priority className="h-[30px] w-[30px] object-contain" />
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
          <span className="num text-sm" style={{ color: "var(--ad-muted-foreground)" }}>{clock}</span>
          {/* The product's own three-way control — light / dark / system — on the
              one cookie every other surface reads. `T` cycles it. */}
          <div className="flex items-center gap-0.5 rounded-lg border p-0.5" style={{ borderColor: "var(--ad-border)" }} role="group" aria-label="Theme">
            {THEME_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => pickTheme(mode)}
                aria-pressed={theme === mode}
                title={`${mode[0].toUpperCase()}${mode.slice(1)} theme`}
                className={chip}
                style={theme === mode
                  ? { background: "var(--ad-primary)", color: "var(--ad-primary-foreground)" }
                  : { color: "var(--ad-muted-foreground)" }}
              >
                {mode === "light" ? "☀" : mode === "dark" ? "☾" : "◐"}
              </button>
            ))}
          </div>
          <button type="button" onClick={present} className={`${chip} border`} style={{ borderColor: "var(--ad-border)" }}>
            ⛶ Present
          </button>
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
      <PanelBar items={[{ key: "pulse", label: "Pulse" }]} active="pulse" onSelect={() => {}} sidebarInset={false} />
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
