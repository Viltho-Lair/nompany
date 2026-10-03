"use client";

import { useCallback, useMemo, useState } from "react";
import { Badge, Button, Card, CardBody, CardHead } from "@/app/super/_components/ui";
import SelectMenu from "@/components/fields/SelectMenu";
import { useReload } from "@/components/studio2/useReload";

// SECTIONS STILL BEING BUILT — the owner, 03/10/2026. A held-back section is
// hidden from every studio: not in the sidebar, refused by its API, absent from
// dashboards, shown as "being improved" in Studio settings and at its address.
// Nothing a studio recorded is touched, and lifting the hold gives every studio
// back exactly the switch it had (platform/db/releaseLocks).
//
// CHANGES ARE A DRAFT UNTIL SAVED, and saving says what it will do: a hold
// reaches every studio within about thirty seconds, so it is never a side
// effect of a stray click.
//
// PREVIEW STUDIOS see through every hold — the owner's own studio, where a
// section can be tried on real data before anybody else meets it.

const muted = "text-sm text-[var(--ad-muted-foreground)]";

function Switch({ on, disabled, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-amber-500" : "bg-[var(--ad-muted)]"} ${disabled ? "opacity-50" : ""}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? "end-0.5" : "start-0.5"}`} />
    </button>
  );
}

export default function SectionLocks() {
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState(null); // { locked: Set, previewStudios: string[] }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/super/section-locks", { cache: "no-store" });
    if (!res.ok) { setError("Could not load the sections."); return; }
    const d = await res.json();
    setData(d);
    setDraft({ locked: new Set(d.locks.locked), previewStudios: [...d.locks.previewStudios] });
  }, []);
  useReload(load);

  const changed = useMemo(() => {
    if (!data || !draft) return false;
    const a = [...draft.locked].sort().join(","), b = [...data.locks.locked].sort().join(",");
    return a !== b || draft.previewStudios.join(",") !== data.locks.previewStudios.join(",");
  }, [data, draft]);

  if (error && !data) return <p className={muted}>{error}</p>;
  if (!data || !draft) return <p className={muted}>Loading…</p>;

  const flip = (key, on) => {
    const next = new Set(draft.locked);
    if (on) next.add(key); else next.delete(key);
    setDraft({ ...draft, locked: next });
    setSaved(""); setConfirming(false);
  };
  const studioName = (id) => data.studios.find((s) => s.id === id)?.name || id;
  const heldCount = draft.locked.size;

  const save = async () => {
    setBusy(true); setError("");
    const res = await fetch("/api/super/section-locks", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locked: [...draft.locked], previewStudios: draft.previewStudios }),
    });
    setBusy(false); setConfirming(false);
    if (!res.ok) { setError("That did not save."); return; }
    const out = await res.json();
    setData({ ...data, locks: out.locks });
    setDraft({ locked: new Set(out.locks.locked), previewStudios: [...out.locks.previewStudios] });
    setSaved("Saved. Every studio follows within about thirty seconds.");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHead
          title="Held back while being built"
          sub="Switch on to hide a section from every studio. A section takes its sub-sections with it; a sub-section can be held back on its own."
          action={
            <div className="flex items-center gap-3">
              <span className={muted}>{heldCount ? `${heldCount} held back` : "Nothing held back"}</span>
              {confirming ? (
                <>
                  <Button variant="destructive" disabled={busy} onClick={save}>{busy ? "Saving…" : "Apply to every studio"}</Button>
                  <Button variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>Cancel</Button>
                </>
              ) : (
                <Button disabled={!changed || busy} onClick={() => setConfirming(true)}>Save</Button>
              )}
            </div>
          }
        />
        <CardBody>
          {error && <p className="mb-3 text-sm text-rose-600 dark:text-rose-400">{error}</p>}
          {saved && <p className="mb-3 text-sm text-emerald-600 dark:text-emerald-400">{saved}</p>}
          {confirming && (
            <p className="mb-4 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
              This changes what every studio sees, within about thirty seconds. Held-back sections disappear from the sidebar and their pages say they are being improved. Nothing anybody recorded is moved or lost.
            </p>
          )}
          <ul className="divide-y divide-[var(--ad-border)]">
            {data.sections.map((root) => {
              const rootHeld = draft.locked.has(root.key);
              return (
                <li key={root.key} className="py-3">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <span className="font-500">{root.name}</span>
                      <span className="ms-2 font-mono text-xs text-[var(--ad-muted-foreground)]">{root.key}</span>
                    </div>
                    {rootHeld && <Badge tone="warning">Held back</Badge>}
                    <Switch on={rootHeld} disabled={busy} label={`Hold back ${root.name}`} onChange={(on) => flip(root.key, on)} />
                  </div>
                  {root.children.length > 0 && (
                    <ul className="mt-2 space-y-1.5 ps-6">
                      {root.children.map((c) => {
                        const held = draft.locked.has(c.key);
                        return (
                          <li key={c.key} className="flex items-center gap-3 text-sm">
                            <div className="min-w-0 flex-1">
                              <span>{c.name}</span>
                              <span className="ms-2 font-mono text-xs text-[var(--ad-muted-foreground)]">{c.key}</span>
                            </div>
                            {rootHeld
                              ? <span className="text-xs text-[var(--ad-muted-foreground)]">held with its section</span>
                              : held ? <Badge tone="warning">Held back</Badge> : null}
                            <Switch on={held || rootHeld} disabled={busy || rootHeld} label={`Hold back ${c.name}`} onChange={(on) => flip(c.key, on)} />
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardHead title="Preview studios" sub="These studios see every held-back section, so a section can be tried on real data before anybody else meets it." />
        <CardBody>
          <div className="flex flex-wrap gap-2">
            {draft.previewStudios.length === 0 && <span className={muted}>None — every studio follows the holds.</span>}
            {draft.previewStudios.map((id) => (
              <span key={id} className="inline-flex items-center gap-2 rounded-full bg-[var(--ad-muted)] px-3 py-1 text-sm">
                {studioName(id)}
                <button type="button" aria-label={`Remove ${studioName(id)}`} disabled={busy}
                  onClick={() => { setDraft({ ...draft, previewStudios: draft.previewStudios.filter((x) => x !== id) }); setSaved(""); }}
                  className="text-[var(--ad-muted-foreground)] hover:text-[var(--ad-foreground)]">×</button>
              </span>
            ))}
          </div>
          <div className="mt-4 max-w-sm">
            <SelectMenu className="ad-input" value="" placeholder="Add a preview studio…" searchPlaceholder="Search studios"
              options={data.studios.filter((s) => !draft.previewStudios.includes(s.id)).map((s) => ({ value: s.id, label: `${s.name} (${s.slug})` }))}
              onChange={(id) => { if (id) { setDraft({ ...draft, previewStudios: [...draft.previewStudios, id] }); setSaved(""); } }} />
          </div>
          <p className={`${muted} mt-3`}>Saved with the holds above.</p>
        </CardBody>
      </Card>
    </div>
  );
}
