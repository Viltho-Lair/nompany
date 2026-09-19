"use client";

import { useCallback, useState } from "react";
import { Card, toneBg, toneInk } from "@/app/super/_components/ui";
import Icon from "@/app/super/_components/Icon";
import { capabilitiesByDepartment, capabilityEnabled } from "@/lib/nova/capabilities";
import { useReload } from "@/components/studio2/useReload";
import NovaCredentials from "@/components/super/NovaCredentials";

// The switchboard reads the STRUCTURE from the shared registry (client-safe) and
// only the stored on/off overrides from the server, so the console and Nova's
// tool builder can never disagree about what a capability is. A toggle writes
// the whole `enabled` map back — one small object — and the row shows the
// built-in default when nothing has been set, so "on by default" is legible
// before anyone touches it.
//
// REDESIGNED 18/09/2026 — the owner: "the code is good, the design looks
// awful". The behaviour above is untouched; what changed is the reading of it.
// It was a paragraph of prose, the key form, and eleven identical cards of
// forty rows with badges saying `read` and `action` in lower case. Now: a
// summary that answers "how much of Nova is switched on" at a glance, a filter
// by kind and a search (forty rows is past scanning), department cards with
// their own count, and the key beside the list rather than above it (the
// "How it works" card that sat under it was removed on the owner's
// instruction, 18/09/2026) — the key is set once, the switches are what somebody comes here to flip.

// A mark per department, from the one icon set. A department the registry
// grows that is not listed here gets the neutral mark rather than breaking.
const DEPT_ICON = {
  Sales: "sales",
  Quotations: "rfp",
  Projects: "projects",
  Maintenance: "tools",
  Approvals: "verified",
  Quality: "hse",
  HR: "team",
  Finance: "wallet",
  Inventory: "box",
  Operations: "tracking",
  Home: "home",
};

const KINDS = [
  { id: "all", label: "All" },
  { id: "read", label: "Answers" },
  { id: "action", label: "Actions" },
];

export default function NovaSwitchboard() {
  const [config, setConfig] = useState(null);   // { enabled: {key: bool}, provider, model, keySet }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [kind, setKind] = useState("all");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/super/nova-config", { cache: "no-store" });
    if (!res.ok) { setError("Couldn't load the switchboard."); setConfig({ enabled: {} }); return; }
    setConfig((await res.json()).config || { enabled: {} });
  }, []);
  useReload(load);

  async function toggle(cap, on) {
    if (!config || busy) return;
    const enabled = { ...config.enabled, [cap.key]: on };
    setConfig({ enabled });   // optimistic — the switch answers instantly
    setBusy(true); setError("");
    const res = await fetch("/api/super/nova-config", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled }),
    });
    setBusy(false);
    if (!res.ok) { setError("That didn't save — reloading."); load(); return; }
    setConfig((await res.json()).config || { enabled });
  }

  const groups = capabilitiesByDepartment();

  // Counted over EVERY capability, never the filtered view — the summary says
  // how much of Nova is on, not how much of the current search is.
  const totals = (() => {
    const all = groups.flatMap((g) => g.capabilities);
    const on = (list) => (config ? list.filter((c) => capabilityEnabled(config, c)).length : 0);
    const reads = all.filter((c) => c.kind === "read");
    const actions = all.filter((c) => c.kind === "action");
    return {
      total: all.length, on: on(all),
      reads: reads.length, readsOn: on(reads),
      actions: actions.length, actionsOn: on(actions),
    };
  })();

  const q = query.trim().toLowerCase();
  const visible = groups
    .map((g) => ({
      ...g,
      shown: g.capabilities.filter((c) =>
        (kind === "all" || c.kind === kind) &&
        (!q || `${c.label} ${g.department} ${c.permissionKey || ""}`.toLowerCase().includes(q))),
    }))
    .filter((g) => g.shown.length > 0);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_23rem]">
      <div className="min-w-0 space-y-6">
        <Summary totals={totals} loading={config === null} />

        {/* ---- filter + search ------------------------------------------- */}
        <div className="flex flex-wrap items-center gap-3">
          <div role="tablist" aria-label="Kind" className="inline-flex rounded-xl border border-[var(--ad-border)] bg-[var(--ad-card)] p-1">
            {KINDS.map((k) => (
              <button
                key={k.id} type="button" role="tab" aria-selected={kind === k.id}
                onClick={() => setKind(k.id)}
                className={`rounded-lg px-3.5 py-1.5 text-sm font-600 transition-colors ${
                  kind === k.id ? "bg-[var(--ad-primary)] text-[var(--ad-primary-foreground)]" : "text-[var(--ad-muted-foreground)] hover:text-[var(--ad-foreground)]"
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>
          <label className="relative min-w-[14rem] flex-1">
            <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--ad-muted-foreground)]">
              <Icon name="search" className="h-4 w-4" />
            </span>
            <input
              type="search" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search capabilities, departments or rights"
              aria-label="Search capabilities"
              className="h-10 w-full rounded-xl border border-[var(--ad-border)] bg-[var(--ad-card)] ps-9 pe-3 text-sm outline-none focus:border-[var(--ad-primary)]"
            />
          </label>
        </div>

        {error && (
          <p role="alert" className="rounded-xl px-4 py-2.5 text-sm" style={{ backgroundColor: toneBg("danger"), color: toneInk("danger") }}>
            {error}
          </p>
        )}

        {/* ---- the departments ------------------------------------------- */}
        {config === null ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {[0, 1, 2, 3].map((i) => <Card key={i} className="h-48 animate-pulse" />)}
          </div>
        ) : visible.length === 0 ? (
          <Card className="px-6 py-12 text-center text-sm text-[var(--ad-muted-foreground)]">
            Nothing matches “{query}”.
          </Card>
        ) : (
          <div className="grid items-start gap-4 lg:grid-cols-2">
            {visible.map((g) => {
              const onHere = g.capabilities.filter((c) => capabilityEnabled(config, c)).length;
              return (
                <Card key={g.department} className="overflow-hidden">
                  <div className="flex items-center gap-3 border-b border-[var(--ad-border)] px-5 py-3.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: toneBg("primary"), color: toneInk("primary") }}>
                      <Icon name={DEPT_ICON[g.department] || "dot"} className="h-[18px] w-[18px]" />
                    </span>
                    <h2 className="min-w-0 flex-1 truncate font-display text-base font-700">{g.department}</h2>
                    <span className="num rounded-full bg-[var(--ad-muted)] px-2.5 py-0.5 text-xs font-600 text-[var(--ad-foreground)]">
                      {onHere} / {g.capabilities.length} on
                    </span>
                  </div>
                  <ul className="divide-y divide-[var(--ad-border)]">
                    {g.shown.map((cap) => (
                      <CapabilityRow
                        key={cap.key} cap={cap} busy={busy}
                        on={capabilityEnabled(config, cap)}
                        overridden={typeof config.enabled?.[cap.key] === "boolean"}
                        onToggle={toggle}
                      />
                    ))}
                  </ul>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ---- beside the list: the key --------------------------------------- */}
      <aside className="space-y-6 xl:sticky xl:top-0 xl:self-start">
        {/* THE KEY IS THE SAME ONE BROADCAST RUNS ON, and the form is the same
            component. Setting it here switches on the assistant AND the studio
            band's automated messages, because there is one credential; the card
            says so rather than leaving somebody to find out. */}
        <NovaCredentials note="One key for the platform. Nova's chat and Broadcast's automated messages both run on it." />
      </aside>
    </div>
  );
}

function Summary({ totals, loading }) {
  const pct = totals.total ? Math.round((totals.on / totals.total) * 100) : 0;
  return (
    <Card className="relative overflow-hidden p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -end-16 -top-20 h-56 w-56 rounded-full opacity-30 blur-3xl"
        style={{ background: "var(--ad-primary)" }}
      />
      <div className="relative flex flex-wrap items-center gap-6">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[var(--ad-primary-foreground)]" style={{ background: "var(--ad-primary)" }}>
            <Icon name="wizard" className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <p className="font-display text-lg font-700">What Nova can do</p>
            <p className="mt-1 max-w-xl text-sm text-[var(--ad-muted-foreground)]">
              Applies to every studio whose package includes Nova. Switching something on makes
              it available; it never gives anybody a right they do not already hold.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Stat label="On" value={loading ? "—" : `${totals.on}/${totals.total}`} />
          <Stat label="Answers" value={loading ? "—" : `${totals.readsOn}/${totals.reads}`} tone="info" />
          <Stat label="Actions" value={loading ? "—" : `${totals.actionsOn}/${totals.actions}`} tone="warning" />
        </div>
      </div>
      <div className="relative mt-5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--ad-muted)]">
        <span className="block h-full rounded-full transition-[width] duration-500" style={{ width: `${loading ? 0 : pct}%`, background: "var(--ad-primary)" }} />
      </div>
    </Card>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className="min-w-[5.5rem] rounded-xl border border-[var(--ad-border)] px-3.5 py-2.5">
      <p className="text-[11px] font-600 uppercase tracking-wider" style={{ color: tone ? toneInk(tone) : "var(--ad-muted-foreground)" }}>{label}</p>
      <p className="num mt-0.5 text-xl font-700">{value}</p>
    </div>
  );
}

function CapabilityRow({ cap, on, overridden, busy, onToggle }) {
  const action = cap.kind === "action";
  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: toneBg(action ? "warning" : "info"), color: toneInk(action ? "warning" : "info") }}
        title={action ? "Action — does something" : "Answer — reads and reports"}
      >
        <Icon name={action ? "zap" : "eye"} className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`text-sm font-600 ${on ? "" : "text-[var(--ad-muted-foreground)]"}`}>{cap.label}</span>
          {cap.scope === "own" && <Chip>Own records</Chip>}
          {cap.writes && <Chip>Confirms first</Chip>}
          {overridden && cap.defaultOn !== on && (
            <span className="inline-flex items-center gap-1 text-[11px] font-600" style={{ color: toneInk("primary") }} title={`Default is ${cap.defaultOn ? "on" : "off"}`}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "currentColor" }} />
              Changed
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate font-mono text-[11px] text-[var(--ad-muted-foreground)]">
          {cap.permissionKey || "any member"}
        </p>
      </div>
      <button
        type="button" role="switch" aria-checked={on} aria-label={cap.label} disabled={busy}
        onClick={() => onToggle(cap, !on)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ad-primary)] focus-visible:ring-offset-2 ${
          on ? "bg-[var(--ad-primary)]" : "bg-[var(--ad-border)]"
        } ${busy ? "opacity-60" : ""}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "start-[22px]" : "start-0.5"}`} />
      </button>
    </li>
  );
}

function Chip({ children }) {
  return (
    <span className="rounded-md bg-[var(--ad-muted)] px-1.5 py-0.5 text-[10.5px] font-600 text-[var(--ad-foreground)]">
      {children}
    </span>
  );
}
