"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardHead, CardBody, Table, Button, Badge } from "@/app/super/_components/ui";

// Packages and Tiers are the same screen with different fields, so they are one
// component driven by a field list rather than two that drift apart. A row is
// edited in place: there is no separate detail page for a record with five
// fields on it.
//
// `fields` describes what a record holds; `services` is passed only by Tiers,
// which is the one kind whose records point at another list.

const input = "ad-input";
const label = "ad-label";

export default function CatalogEditor({ kind, title, fields, services = null, onChanged }) {
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

  const blank = Object.fromEntries(fields.map((f) => [f.key, f.type === "switch" ? false : f.type === "services" ? [] : ""]));

  async function save() {
    const ok = draft.id ? await send("PUT", draft) : await send("POST", draft);
    if (ok) setDraft(null);
  }

  return (
    <>
      <Card className="mb-6">
        <CardHead
          title={title}
          sub={items === null ? "Loading…" : `${items.length} defined`}
          action={<Button onClick={() => setDraft({ ...blank })} disabled={busy}>Add</Button>}
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
                  ) : f.type === "services" ? (
                    <ServicePicker
                      services={services || []}
                      picked={draft[f.key] || []}
                      onChange={(serviceIds) => setDraft((d) => ({ ...d, [f.key]: serviceIds }))}
                    />
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

function render(f, it, services) {
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
  if (f.type === "number") {
    // Some zeros are a quantity and some are a meaning — "0 mo" reads as a
    // mistake where "Endless" reads as a decision.
    if (f.zeroLabel && Number(v || 0) === 0) return <span className="font-medium">{f.zeroLabel}</span>;
    return <span>{f.prefix || ""}{Number(v || 0).toLocaleString()}{f.suffix || ""}</span>;
  }
  return <span className="font-medium">{v || "—"}</span>;
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
