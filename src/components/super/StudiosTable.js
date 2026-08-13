"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardHead, CardBody, Table, Button } from "@/app/super/_components/ui";
import { toneOf } from "@/lib/planColors";

// Every studio, searchable, with its plan editable in place.
//
// A row opens a dialog rather than a page: the only things the console may
// change about a studio are its package and its tier, and a whole route for two
// selects would be more navigation than decision. The name, address and owner
// are shown but STATIC — they belong to the studio's own people, not to us.

const Tag = ({ name, color }) => {
  const t = toneOf(color);
  return (
    <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-600" style={{ backgroundColor: t.bg, color: t.fg }}>
      {name}
    </span>
  );
};

export default function StudiosTable({ rows, packages, tiers }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(null);      // the studio being edited
  const [live, setLive] = useState(rows);       // rows with any saved change applied

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return live;
    // Name is what the field is for, but matching the address and owner too
    // costs nothing and saves a second search box.
    return live.filter((r) =>
      r.name.toLowerCase().includes(q)
      || r.slug.toLowerCase().includes(q)
      || r.ownerName.toLowerCase().includes(q)
      || r.ownerEmail.toLowerCase().includes(q));
  }, [live, query]);

  return (
    <Card>
      <CardHead
        title="All studios"
        sub={`${shown.length} of ${live.length}`}
        action={
          <input
            className="ad-input w-56"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search studio name"
            aria-label="Search studio name"
          />
        }
      />
      <CardBody full>
        <Table head={["Studio", "Owner", "Plan", "Tier", "Members", { label: "Created", align: "end" }]}>
          {shown.length === 0 ? (
            <tr><td colSpan={6} className="text-[var(--ad-muted-foreground)]">
              {query ? `Nothing matches “${query}”.` : "No studios yet."}
            </td></tr>
          ) : shown.map((r) => (
            <tr
              key={r.id}
              onClick={() => setOpen(r)}
              className="cursor-pointer"
              tabIndex={0}
              role="button"
              aria-label={`Open ${r.name}`}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(r); } }}
            >
              <td>
                <span className="font-medium">{r.name}</span>
                <span className="block font-mono text-xs text-[var(--ad-muted-foreground)]">/{r.slug}</span>
              </td>
              <td>
                <span>{r.ownerName || "—"}</span>
                <span className="block text-xs text-[var(--ad-muted-foreground)]">{r.ownerEmail}</span>
              </td>
              <td><Tag name={r.packageName} color={r.packageColor} /></td>
              <td><Tag name={r.tierName} color={r.tierColor} /></td>
              <td className="text-[var(--ad-muted-foreground)]">
                {r.members}{r.maxMembers > 0 ? ` / ${r.maxMembers}` : ""}
              </td>
              <td className="text-end whitespace-nowrap text-[var(--ad-muted-foreground)]">{r.created}</td>
            </tr>
          ))}
        </Table>
      </CardBody>

      {open && (
        <StudioDialog
          studio={open}
          packages={packages}
          tiers={tiers}
          onClose={() => setOpen(null)}
          onSaved={(patch) => {
            setLive((rs) => rs.map((r) => (r.id === patch.id ? { ...r, ...patch } : r)));
            setOpen(null);
          }}
        />
      )}
    </Card>
  );
}

function StudioDialog({ studio, packages, tiers, onClose, onSaved }) {
  const [packageId, setPackageId] = useState(studio.packageId);
  const [tierId, setTierId] = useState(studio.tierId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  async function save() {
    setBusy(true); setError("");
    const res = await fetch(`/api/super/studios/${studio.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageId, tierId }),
    });
    setBusy(false);
    if (!res.ok) { setError("That didn't save."); return; }
    const pkg = packages.find((p) => p.id === packageId);
    const tier = tiers.find((t) => t.id === tierId);
    onSaved({
      id: studio.id,
      packageId, tierId,
      packageName: pkg?.name || "—",
      packageColor: pkg?.color || "grey",
      maxMembers: Number(pkg?.maxEmployees || 0),
      tierName: tier?.name || "—",
      tierColor: tier?.color || "",
    });
  }

  const Static = ({ label, value }) => (
    <div>
      <span className="ad-label">{label}</span>
      <p className="text-sm">{value || <span className="text-[var(--ad-muted-foreground)]">—</span>}</p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={studio.name}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative w-full max-w-[560px] overflow-hidden rounded-xl border shadow-2xl"
        style={{ backgroundColor: "var(--ad-card)", borderColor: "var(--ad-border)", color: "var(--ad-card-foreground)" }}
      >
        <div className="flex items-center gap-3 border-b px-5 py-4" style={{ borderColor: "var(--ad-border)" }}>
          <div className="min-w-0">
            <h3 className="truncate font-semibold">{studio.name}</h3>
            <p className="font-mono text-xs text-[var(--ad-muted-foreground)]">/{studio.slug}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            className="ad-icon-btn ms-auto h-8 w-8">×</button>
        </div>

        <div className="space-y-5 px-5 py-5">
          {/* Static: this is the studio's own record, shown for context. */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Static label="Owner" value={studio.ownerName} />
            <Static label="Owner email" value={studio.ownerEmail} />
            <Static label="Owner phone" value={studio.ownerPhone} />
            <Static label="Members" value={`${studio.members}${studio.maxMembers > 0 ? ` of ${studio.maxMembers}` : ""}`} />
          </div>

          {/* The two things the console may actually change. */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="ad-label" htmlFor="pkg">Package</label>
              <select id="pkg" className="ad-input" value={packageId} onChange={(e) => setPackageId(e.target.value)}>
                <option value="">— none —</option>
                {packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="ad-label" htmlFor="tier">Tier</label>
              <select id="tier" className="ad-input" value={tierId} onChange={(e) => setTierId(e.target.value)}>
                <option value="">— none —</option>
                {tiers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-[var(--ad-destructive)]">{error}</p>}
        </div>

        <div className="flex gap-3 border-t px-5 py-4" style={{ borderColor: "var(--ad-border)" }}>
          <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}
