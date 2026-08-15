"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardHead, CardBody, Badge, Icon } from "../../../_components/ui";
import { CurrencySymbol } from "@/components/Currency";
import { crossRate, currency, fmtRate, quotedCodes, searchCurrencies } from "@/lib/currencies";

// "Currency Exchange Rates Today" — the full-width band under the KPI tiles.
//
// One USD-based table arrives from /api/super/exchange-rates (fetched at most
// once a day, server side). EVERY pair on screen is derived from it here, in the
// browser: changing the base or any of the four targets is a division, not a
// request. That is the whole reason the API is only ever hit once a day no
// matter how much anyone fiddles with the pickers.

const STORE_KEY = "super:fx:selection";
const DEFAULT_BASE = "USD";
const DEFAULT_TARGETS = ["EUR", "SAR", "GBP", "JPY"];
const TILE_COLORS = ["var(--ad-chart-1)", "var(--ad-chart-2)", "var(--ad-chart-4)", "var(--ad-chart-5)"];

// The API stamps its payload in seconds; both stamps are UTC by definition.
function fmtUtc(unix) {
  if (!unix) return "—";
  return new Date(unix * 1000).toLocaleString("en-GB", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }) + " UTC";
}

function untilLabel(unix) {
  const secs = Number(unix || 0) - Math.floor(Date.now() / 1000);
  if (secs <= 0) return "due now";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `in ${h}h ${m}m` : `in ${m}m`;
}

/* ---- the searchable currency dropdown ------------------------------------ */

function CurrencyPicker({ value, codes, exclude = [], onPick, compact = false, tint }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  const options = useMemo(() => {
    const pool = codes.filter((c) => c === value || !exclude.includes(c));
    return searchCurrencies(query, pool);
  }, [codes, exclude, query, value]);

  // Close on an outside click or Escape, and focus the search box on open so the
  // whole interaction is "click, type three letters, Enter".
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    inputRef.current?.focus();
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const choose = (code) => {
    onPick(code);
    setOpen(false);
    setQuery("");
  };

  const meta = currency(value);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-2 rounded-md border px-3 text-start transition-colors hover:border-[var(--ad-primary)] ${
          compact ? "py-1.5" : "py-2.5"
        }`}
        style={{ borderColor: "var(--ad-border)", backgroundColor: "var(--ad-background)" }}
      >
        <span className="min-w-0">
          <span
            className={`block font-semibold ${compact ? "text-sm" : "text-base"}`}
            style={tint ? { color: tint } : undefined}
          >
            {meta.code}
          </span>
          {compact ? null : (
            <span className="mt-0.5 block truncate text-xs text-[var(--ad-muted-foreground)]">{meta.name}</span>
          )}
        </span>
        <Icon name="chevronDown" className="h-4 w-4 shrink-0 text-[var(--ad-muted-foreground)]" />
      </button>

      {open ? (
        <div
          className="absolute z-30 mt-1 w-full min-w-[15rem] overflow-hidden rounded-md border shadow-lg"
          style={{ borderColor: "var(--ad-border)", backgroundColor: "var(--ad-popover)" }}
        >
          <div className="border-b p-2" style={{ borderColor: "var(--ad-border)" }}>
            <div className="relative">
              <Icon
                name="search"
                className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ad-muted-foreground)]"
              />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setOpen(false);
                  if (e.key === "Enter" && options[0]) choose(options[0].code);
                }}
                placeholder="Search currency…"
                className="ad-input ps-8 text-sm"
              />
            </div>
          </div>
          <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
            {options.length === 0 ? (
              <li className="px-3 py-6 text-center text-xs text-[var(--ad-muted-foreground)]">No currency matches</li>
            ) : (
              options.map((c) => (
                <li key={c.code}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={c.code === value}
                    onClick={() => choose(c.code)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-start text-sm transition-colors hover:bg-[var(--ad-accent)]"
                  >
                    <span className="w-10 shrink-0 font-semibold">{c.code}</span>
                    <span className="min-w-0 flex-1 truncate text-[var(--ad-muted-foreground)]">{c.name}</span>
                    {c.code === value ? (
                      <Icon name="check" className="h-3.5 w-3.5 shrink-0 text-[var(--ad-primary)]" />
                    ) : null}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/* ---- one of the four rate tiles ------------------------------------------ */

function RateTile({ base, code, rate, codes, exclude, color, onPick }) {
  const inverse = rate ? 1 / rate : null;
  return (
    <div
      className="rounded-lg border p-4"
      style={{ borderColor: "var(--ad-border)", backgroundColor: "var(--ad-muted)" }}
    >
      <CurrencyPicker value={code} codes={codes} exclude={exclude} onPick={onPick} compact tint={color} />

      <p className="mt-3 flex items-baseline gap-1.5 text-2xl font-semibold leading-tight">
        <span>{fmtRate(rate)}</span>
        <span className="text-sm font-medium text-[var(--ad-muted-foreground)]">
          <CurrencySymbol code={code} />
        </span>
      </p>
      <p className="mt-1 text-xs text-[var(--ad-muted-foreground)]">
        for 1 <CurrencySymbol code={base} />
      </p>
      <p className="mt-2.5 border-t pt-2.5 text-xs text-[var(--ad-muted-foreground)]" style={{ borderColor: "var(--ad-border)" }}>
        1 <CurrencySymbol code={code} /> = {fmtRate(inverse)} <CurrencySymbol code={base} />
      </p>
    </div>
  );
}

/* ---- the box ------------------------------------------------------------- */

export default function CurrencyRates() {
  const [snap, setSnap] = useState(null);
  const [error, setError] = useState("");
  const [base, setBase] = useState(DEFAULT_BASE);
  const [targets, setTargets] = useState(DEFAULT_TARGETS);

  // Selections are read AFTER mount, never during render: the server has no
  // localStorage, so seeding state from it would mismatch on hydration.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
      if (saved?.base) setBase(saved.base);
      if (Array.isArray(saved?.targets) && saved.targets.length === 4) setTargets(saved.targets);
    } catch {
      /* a corrupt entry just means the defaults stand */
    }
  }, []);

  useEffect(() => {
    let live = true;
    fetch("/api/super/exchange-rates")
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`);
        return body;
      })
      .then((body) => live && setSnap(body))
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, []);

  const persist = useCallback((nextBase, nextTargets) => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ base: nextBase, targets: nextTargets }));
    } catch {
      /* private mode — the selection simply will not survive a reload */
    }
  }, []);

  const pickBase = (code) => {
    setBase(code);
    persist(code, targets);
  };
  const pickTarget = (i, code) => {
    const next = targets.map((t, j) => (j === i ? code : t));
    setTargets(next);
    persist(base, next);
  };

  const codes = useMemo(() => quotedCodes(snap?.rates), [snap]);
  const baseMeta = currency(base);

  const head = (
    <CardHead
      title="Currency Exchange Rates Today"
      sub="Published once a day by ExchangeRate-API — every pair below is derived from that one snapshot"
      action={
        snap ? (
          <Badge tone={snap.stale ? "warning" : "success"}>{snap.stale ? "Stale" : "Today"}</Badge>
        ) : null
      }
    />
  );

  if (error) {
    return (
      <Card>
        {head}
        <CardBody>
          <div className="flex items-center gap-3 text-sm text-[var(--ad-muted-foreground)]">
            <Icon name="alert" className="h-4 w-4 shrink-0 text-[var(--ad-warning)]" />
            <span>Exchange rates are unavailable ({error}).</span>
          </div>
        </CardBody>
      </Card>
    );
  }

  if (!snap) {
    return (
      <Card>
        {head}
        <CardBody>
          <div className="grid animate-pulse gap-6 lg:grid-cols-[minmax(0,15rem)_1fr]">
            <div className="h-24 rounded-lg bg-[var(--ad-muted)]" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-32 rounded-lg bg-[var(--ad-muted)]" />
              ))}
            </div>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      {head}
      <CardBody>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,15rem)_1fr]">
          {/* base picker — top-left of the box */}
          <div>
            <label className="ad-label text-xs uppercase tracking-wider text-[var(--ad-muted-foreground)]">
              Base currency
            </label>
            <CurrencyPicker value={base} codes={codes} exclude={targets} onPick={pickBase} />
            <p className="mt-3 text-xs text-[var(--ad-muted-foreground)]">
              Showing what <span className="font-medium text-[var(--ad-foreground)]">1 {baseMeta.code}</span> buys
              {baseMeta.country ? ` — ${baseMeta.country}` : ""}.
            </p>
          </div>

          {/* the four chosen currencies */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {targets.map((code, i) => (
              <RateTile
                key={`${code}-${i}`}
                base={base}
                code={code}
                rate={crossRate(snap.rates, base, code)}
                codes={codes}
                exclude={[base, ...targets.filter((_, j) => j !== i)]}
                color={TILE_COLORS[i]}
                onPick={(next) => pickTarget(i, next)}
              />
            ))}
          </div>
        </div>

        <div
          className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 border-t pt-4 text-xs text-[var(--ad-muted-foreground)]"
          style={{ borderColor: "var(--ad-border)" }}
        >
          <span className="inline-flex items-center gap-1.5">
            <Icon name="clock" className="h-3.5 w-3.5" />
            Updated {fmtUtc(snap.updatedAt)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Icon name="refresh" className="h-3.5 w-3.5" />
            Next update {fmtUtc(snap.nextUpdateAt)} ({untilLabel(snap.nextUpdateAt)})
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Icon name="globe" className="h-3.5 w-3.5" />
            Quoted against {snap.base} · {codes.length} currencies
          </span>
        </div>
      </CardBody>
    </Card>
  );
}
