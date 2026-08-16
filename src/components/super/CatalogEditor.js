"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardHead, CardBody, Table, Button, Badge, Icon } from "@/app/super/_components/ui";
import { toneOf, normalizeColor, PRESETS, DEFAULT_HEX } from "@/lib/planColors";

// Packages and Tiers are the same screen with different fields, so they are one
// component driven by a field list rather than two that drift apart. A row is
// edited in place: there is no separate detail page for a record with five
// fields on it.
//
// `fields` describes what a record holds; `services` is passed only by Tiers,
// which is the one kind whose records point at another list.

const input = "ad-input";
const label = "ad-label";

export default function CatalogEditor({ kind, title, fields, services = null, onChanged, settings = null }) {
  const [items, setItems] = useState(null);
  const [draft, setDraft] = useState(null);      // the row being added or edited
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/super/catalog/${kind}`, { cache: "no-store" });
    if (!res.ok) { setError("Couldn't load."); setItems([]); return; }
    setItems((await res.json()).items || []);
  }, [kind]);
  useEffect(() => { load(); }, [load]);

  const [settingsOpen, setSettingsOpen] = useState(false);

  async function send(method, payload) {
    setBusy(true); setError("");
    const res = await fetch(`/api/super/catalog/${kind}`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!res.ok) { setError("That didn't save."); return false; }
    await load();
    // Lets a parent that shows this list's records elsewhere refresh them —
    // renaming a service has to change the tiers that name it.
    onChanged?.();
    return true;
  }

  const blank = Object.fromEntries(fields.map((f) => [f.key,
    f.type === "switch" ? false : f.type === "services" ? [] : f.type === "color" ? DEFAULT_HEX : ""]));

  async function save() {
    const ok = draft.id ? await send("PUT", draft) : await send("POST", draft);
    if (ok) setDraft(null);
  }

  return (
    <>
      {settings && settingsOpen && (
        <CatalogSettings config={settings} onClose={() => setSettingsOpen(false)} />
      )}

      <Card className="mb-6">
        <CardHead
          title={title}
          sub={items === null ? "Loading…" : `${items.length} defined`}
          action={
            <span className="flex items-center gap-2">
              {/* The gear sits BESIDE Add because what it holds is not a record:
                  it qualifies every package at once, so it does not belong in
                  the list underneath. */}
              {settings && (
                <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)} aria-label={settings.title}>
                  <Icon name="settings" className="h-4 w-4" />
                </Button>
              )}
              <Button onClick={() => setDraft({ ...blank })} disabled={busy}>Add</Button>
            </span>
          }
        />
        <CardBody full>
          {error && <p className="px-5 pb-3 text-sm text-[var(--ad-destructive)]">{error}</p>}
          {items !== null && items.length === 0 && !draft ? (
            <p className="px-5 pb-5 text-sm text-[var(--ad-muted-foreground)]">Nothing here yet.</p>
          ) : (
            <Table head={[...fields.map((f) => f.label), { label: "", align: "end" }]}>
              {(items || []).map((it) => (
                <tr key={it.id}>
                  {fields.map((f) => <td key={f.key}>{render(f, it, services)}</td>)}
                  <td className="text-end whitespace-nowrap">
                    <Button variant="ghost" size="sm" onClick={() => setDraft({ ...blank, ...it })}>Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => send("DELETE", { id: it.id })} disabled={busy}>Delete</Button>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </CardBody>
      </Card>

      {draft && (
        <Card className="mb-6">
          <CardHead title={draft.id ? `Edit ${draft.name || "record"}` : `New ${title.replace(/s$/, "").toLowerCase()}`} />
          <CardBody>
            <div className="grid gap-5 sm:grid-cols-2">
              {fields.map((f) => (
                <div key={f.key} className={f.type === "services" ? "sm:col-span-2" : ""}>
                  <label className={label} htmlFor={`f-${f.key}`}>{f.label}</label>
                  {f.type === "switch" ? (
                    // A switch, not a checkbox: this is the one field that
                    // decides whether anybody outside the console sees the record.
                    <button
                      id={`f-${f.key}`} type="button" role="switch" aria-checked={Boolean(draft[f.key])}
                      onClick={() => setDraft((d) => ({ ...d, [f.key]: !d[f.key] }))}
                      className={`relative h-6 w-11 rounded-full transition-colors ${draft[f.key] ? "bg-[var(--ad-primary)]" : "bg-[var(--ad-muted)]"}`}
                    >
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${draft[f.key] ? "left-[22px]" : "left-0.5"}`} />
                    </button>
                  ) : f.type === "color" ? (
                    <ColorField
                      id={`f-${f.key}`}
                      value={draft[f.key]}
                      onChange={(color) => setDraft((d) => ({ ...d, [f.key]: color }))}
                    />
                  ) : f.type === "services" ? (
                    <ServicePicker
                      services={services || []}
                      picked={draft[f.key] || []}
                      onChange={(serviceIds) => setDraft((d) => ({ ...d, [f.key]: serviceIds }))}
                    />
                  ) : f.type === "computed" ? (
                    // Shown, never typed. The value is worked out from other
                    // fields, so an input here would invite somebody to enter a
                    // total that disagrees with the rate it comes from.
                    <p className="rounded-md border border-dashed px-3 py-2 text-sm font-medium"
                      style={{ borderColor: "var(--ad-border)", color: "var(--ad-muted-foreground)" }}>
                      {f.prefix || ""}{computeField(f, draft).toLocaleString()}{f.suffix || ""}
                    </p>
                  ) : (
                    <input
                      id={`f-${f.key}`} className={input}
                      type={f.type === "number" ? "number" : "text"}
                      min={f.type === "number" ? 0 : undefined}
                      value={draft[f.key] ?? ""}
                      placeholder={f.placeholder || ""}
                      onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                    />
                  )}
                  {f.hint && <p className="mt-1.5 text-xs text-[var(--ad-muted-foreground)]">{f.hint}</p>}
                </div>
              ))}
            </div>
            <div className="mt-5 flex gap-3">
              <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
              <Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
            </div>
          </CardBody>
        </Card>
      )}
    </>
  );
}

// A computed field's formula travels as DATA — field names and an operation —
// because it is declared in a server component and read in a client one, and a
// function cannot cross that boundary.
function computeField(f, row) {
  const n = (k) => Number(row?.[k]) || 0;
  if (Array.isArray(f.multiply)) {
    const parts = f.multiply.map(n);
    // A zero anywhere means the product is meaningless rather than zero — for
    // "no upper limit" the named fallback field is the answer.
    if (parts.some((v) => v === 0) && f.whenZero) return n(f.whenZero);
    return parts.reduce((a, b) => a * b, 1);
  }
  return n(f.key);
}

function render(f, it, services) {
  // A computed column reads the stored value like any other — the sum was done
  // when the record was saved, so the list is not recalculating anything.
  if (f.type === "computed") {
    const v = Number(it[f.key] || 0);
    return <span>{f.prefix || ""}{v.toLocaleString()}{f.suffix || ""}</span>;
  }
  const v = it[f.key];
  if (f.type === "switch") {
    return <Badge tone={v ? "success" : "secondary"}>{v ? "Public" : "Hidden"}</Badge>;
  }
  if (f.type === "services") {
    const names = (v || []).map((id) => services?.find((s) => s.id === id)?.name).filter(Boolean);
    if (names.length === 0) return <span className="text-[var(--ad-muted-foreground)]">None</span>;
    return (
      <span className="flex flex-wrap gap-1">
        {names.map((n) => <Badge key={n} tone="secondary">{n}</Badge>)}
      </span>
    );
  }
  if (f.type === "color") {
    // Shown as the thing it controls rather than as its own name — and as the
    // BADGE it will actually become, since that is what the colour is for.
    const t = toneOf(v);
    return (
      <span className="inline-flex items-center gap-2">
        <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-600" style={{ backgroundColor: t.bg, color: t.fg }}>
          {it.name || "Package"}
        </span>
        <span className="font-mono text-[11px] text-[var(--ad-muted-foreground)]">{t.hex}</span>
      </span>
    );
  }
  if (f.type === "number") {
    // Some zeros are a quantity and some are a meaning — "0 mo" reads as a
    // mistake where "Endless" reads as a decision.
    if (f.zeroLabel && Number(v || 0) === 0) return <span className="font-medium">{f.zeroLabel}</span>;
    return <span>{f.prefix || ""}{Number(v || 0).toLocaleString()}{f.suffix || ""}</span>;
  }
  return <span className="font-medium">{v || "—"}</span>;
}

// A colour, chosen three ways: the system picker for anything, a hex box for
// pasting an exact brand colour, and the shipped four as one-click swatches.
// The live badge is the point — a hex tells you nothing about whether the text
// on it will be readable, and the badge is derived from the same value.
function ColorField({ id, value, onChange }) {
  const hex = normalizeColor(value) || DEFAULT_HEX;
  const t = toneOf(hex);
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="color"
          value={hex}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded border bg-transparent p-0.5"
          style={{ borderColor: "var(--ad-border)" }}
          aria-label="Pick a colour"
        />
        <input
          className={`${input} w-28 font-mono text-xs`}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={DEFAULT_HEX}
          aria-label="Colour hex"
        />
        <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-600" style={{ backgroundColor: t.bg, color: t.fg }}>
          Preview
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.name}
            type="button"
            title={p.name}
            aria-label={p.name}
            onClick={() => onChange(p.hex)}
            className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
            style={{ backgroundColor: p.hex, borderColor: hex === p.hex ? "var(--ad-foreground)" : "transparent" }}
          />
        ))}
      </div>
    </div>
  );
}

function ServicePicker({ services, picked, onChange }) {
  if (services.length === 0) {
    return <p className="text-sm text-[var(--ad-muted-foreground)]">Add an ERP service below first.</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {services.map((s) => {
        const on = picked.includes(s.id);
        return (
          <button
            key={s.id} type="button" aria-pressed={on}
            onClick={() => onChange(on ? picked.filter((x) => x !== s.id) : [...picked, s.id])}
            className="rounded-full border px-3 py-1.5 text-sm transition-colors"
            style={{
              borderColor: on ? "var(--ad-primary)" : "var(--ad-border)",
              backgroundColor: on ? "color-mix(in oklab, var(--ad-primary) 12%, transparent)" : "transparent",
            }}
          >
            {s.name}
          </button>
        );
      })}
    </div>
  );
}

// The catalogue-wide settings dialog behind the gear. One small object, loaded
// when it is opened rather than with the page — nobody pays for it until they
// ask.
function CatalogSettings({ config, onClose }) {
  const [value, setValue] = useState(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let live = true;
    fetch("/api/super/catalog-settings", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (live) setValue(d?.settings || { yearlyDiscountPct: 0 }); })
      .catch(() => { if (live) setValue({ yearlyDiscountPct: 0 }); });
    return () => { live = false; };
  }, []);

  async function save() {
    setBusy(true);
    await fetch("/api/super/catalog-settings", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value),
    }).catch(() => {});
    setBusy(false); setSaved(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={config.title}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[440px] rounded-lg p-6 shadow-xl"
        style={{ backgroundColor: "var(--ad-card)", color: "var(--ad-card-foreground)" }}>
        <h3 className="text-base font-semibold">{config.title}</h3>
        <p className="mt-1 text-sm text-[var(--ad-muted-foreground)]">{config.sub}</p>

        {value === null ? (
          <p className="mt-5 text-sm text-[var(--ad-muted-foreground)]">Loading…</p>
        ) : (
          <div className="mt-5">
            <label className={label} htmlFor="yearly-discount">Yearly discount</label>
            <div className="flex items-center gap-2">
              <input id="yearly-discount" className={input} type="number" min="0" max="100" step="0.01"
                value={value.yearlyDiscountPct}
                onChange={(e) => { setValue({ ...value, yearlyDiscountPct: e.target.value }); setSaved(false); }} />
              <span className="text-sm text-[var(--ad-muted-foreground)]">%</span>
            </div>
            <p className="mt-1.5 text-xs text-[var(--ad-muted-foreground)]">
              Taken off the total cost when the public pricing page is switched to yearly.
              0 means a year costs twelve months.
            </p>
          </div>
        )}

        <div className="mt-6 flex gap-3">
          <Button onClick={save} disabled={busy || value === null}>{busy ? "Saving…" : saved ? "Saved" : "Save"}</Button>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
