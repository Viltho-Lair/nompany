"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardHead, Button, Num, Icon } from "@/app/super/_components/ui";
import SuperDataGrid from "@/components/super/SuperDataGrid";
import { STUDIOS_COLUMNS, STUDIOS_PAGE_SIZE } from "@/components/super/studiosColumns";
import { toneOf } from "@/lib/planColors";

// Every studio, searchable, with its plan editable in place.
//
// A row opens a dialog rather than a page: the only things the console may
// change about a studio are its package and its tier, and a whole route for two
// selects would be more navigation than decision. The name, address and owner
// are shown but STATIC — they belong to the studio's own people, not to us.
//
// The list is a Data Grid now, which is what gives it sorting and paging; the
// dialog and everything it saves are untouched.
//
// A plan tag's colour comes from the PACKAGE RECORD, not from the design tokens,
// and that is correct: the author picks it, it is content, and two studios on
// different plans have to be told apart at a glance. Every other colour on this
// screen is a token.

const Tag = ({ name, color }) => {
  const t = toneOf(color);
  return (
    <span
      className="inline-flex rounded-full px-2.5 py-1 text-xs font-600"
      style={{ backgroundColor: t.bg, color: t.fg }}
    >
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

  // Layout from studiosColumns.js — shared with the loading skeleton — plus the
  // rendering. `valueGetter` on every composite column so sorting follows the
  // record rather than the JSX, and `created` sorts on the ISO timestamp while
  // showing the formatted date.
  const columns = useMemo(() => {
    const render = {
      studio: {
        valueGetter: (_v, row) => row.name,
        renderCell: ({ row }) => (
          <span className="min-w-0 leading-tight">
            <span className="block truncate font-500">{row.name}</span>
            {/* A slug is an address. Monospaced, like every other identifier. */}
            <Num className="block truncate text-xs text-[var(--ad-muted-foreground)]">/{row.slug}</Num>
          </span>
        ),
      },
      owner: {
        valueGetter: (_v, row) => row.ownerName || row.ownerEmail,
        renderCell: ({ row }) => (
          <span className="min-w-0 leading-tight">
            <span className="block truncate">{row.ownerName || "—"}</span>
            <span className="block truncate text-xs text-[var(--ad-muted-foreground)]">{row.ownerEmail}</span>
          </span>
        ),
      },
      packageName: { renderCell: ({ row }) => <Tag name={row.packageName} color={row.packageColor} /> },
      tierName: { renderCell: ({ row }) => <Tag name={row.tierName} color={row.tierColor} /> },
      members: {
        align: "right",
        headerAlign: "right",
        valueGetter: (_v, row) => row.members,
        renderCell: ({ row }) => (
          <Num className="text-[var(--ad-muted-foreground)]">
            {row.members}
            {row.maxMembers > 0 ? ` / ${row.maxMembers}` : ""}
          </Num>
        ),
      },
      created: {
        align: "right",
        headerAlign: "right",
        // Sort on the timestamp, show the formatted date. Sorting the formatted
        // string puts "1 Apr 2026" before "2 Mar 2025".
        valueGetter: (_v, row) => row.createdAt || "",
        renderCell: ({ row }) => (
          <Num className="whitespace-nowrap text-[var(--ad-muted-foreground)]">{row.created}</Num>
        ),
      },
    };
    return STUDIOS_COLUMNS.map(({ skeleton, ...col }) => ({
      ...col,
      ...(render[col.field] || {}),
    }));
  }, []);

  return (
    <Card className="overflow-hidden">
      <CardHead
        title="All studios"
        sub={`${shown.length} of ${live.length}`}
        action={
          <div className="relative">
            <Icon
              name="search"
              className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ad-muted-foreground)]"
            />
            <input
              className="ad-input w-56 ps-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search studio name"
              aria-label="Search studio name"
            />
          </div>
        }
      />

      <SuperDataGrid
        rows={shown}
        columns={columns}
        pageSize={STUDIOS_PAGE_SIZE}
        ariaLabel="Studios"
        emptyIcon="briefcase"
        emptyLabel={query ? `Nothing matches “${query}”.` : "No studios yet."}
        onRowClick={({ row }) => setOpen(row)}
        sx={{ "& .MuiDataGrid-row": { cursor: "pointer" } }}
      />

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

  const Static = ({ label, value, mono = false }) => (
    <div>
      <span className="ad-label">{label}</span>
      {mono ? (
        <Num as="p" className="text-sm">{value || "—"}</Num>
      ) : (
        <p className="text-sm">{value || <span className="text-[var(--ad-muted-foreground)]">—</span>}</p>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={studio.name}>
      <div className="absolute inset-0 bg-[rgb(var(--ad-foreground-rgb)/0.4)]" onClick={onClose} />
      <div
        className="relative w-full max-w-[560px] overflow-hidden rounded-geex border shadow-[var(--ad-shadow-lg)]"
        style={{ backgroundColor: "var(--ad-card)", borderColor: "var(--ad-border)", color: "var(--ad-card-foreground)" }}
      >
        <div className="flex items-center gap-3 border-b px-5 py-4" style={{ borderColor: "var(--ad-border)" }}>
          <div className="min-w-0">
            <h3 className="truncate font-700">{studio.name}</h3>
            <Num className="text-xs text-[var(--ad-muted-foreground)]">/{studio.slug}</Num>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="ad-icon-btn ms-auto h-8 w-8">
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          {/* Static: this is the studio's own record, shown for context. */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Static label="Owner" value={studio.ownerName} />
            <Static label="Owner email" value={studio.ownerEmail} />
            <Static label="Owner phone" value={studio.ownerPhone} mono />
            <Static
              label="Members"
              mono
              value={`${studio.members}${studio.maxMembers > 0 ? ` of ${studio.maxMembers}` : ""}`}
            />
          </div>

          {/* The two things the console may actually change. */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="ad-label" htmlFor="pkg">Package</label>
              <select id="pkg" className="ad-select" value={packageId} onChange={(e) => setPackageId(e.target.value)}>
                <option value="">— none —</option>
                {packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="ad-label" htmlFor="tier">Tier</label>
              <select id="tier" className="ad-select" value={tierId} onChange={(e) => setTierId(e.target.value)}>
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
