"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardHead, Button, Num, Icon } from "@/app/super/_components/ui";
import SuperDataGrid from "@/components/super/SuperDataGrid";
import { STUDIOS_COLUMNS, STUDIOS_PAGE_SIZE } from "@/components/super/studiosColumns";
import { planTagStyle } from "@/lib/planColors";
import SelectMenu from "@/components/fields/SelectMenu";
import { Badge } from "@/app/super/_components/ui";
import SubscriptionPanel, { STATUS } from "@/components/super/SubscriptionPanel";
import { seatLimit } from "@/shared/seats";

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

const fmtDay = (d) => {
  const t = Date.parse(`${d}T00:00:00Z`);
  return d && Number.isFinite(t) ? new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "—";
};

const Tag = ({ name, color }) => (
  <span className="plan-tag inline-flex rounded-full px-2.5 py-1 text-xs font-600" style={planTagStyle(color)}>
    {name}
  </span>
);

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
      // THE BAND beside the package when the studio is on one, so a Medium studio
      // reads "Medium · 50–99" and not a package it may be paying a fraction of.
      packageName: {
        valueGetter: (_v, row) => `${row.packageName} ${row.categoryLabel || ""}`,
        renderCell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5">
            <Tag name={row.packageName} color={row.packageColor} />
            {row.categoryLabel && <span className="text-xs text-[var(--ad-muted-foreground)]">{row.categoryLabel}</span>}
          </span>
        ),
      },
      tierName: { renderCell: ({ row }) => <Tag name={row.tierName} color={row.tierColor} /> },
      // WORKED OUT ON THE SERVER from the dates (shared/subscription), never
      // stored — so this column cannot say "active" about a studio whose
      // paid-until date has passed.
      subStatus: {
        renderCell: ({ row }) => {
          const st = STATUS[row.subStatus] || STATUS.active;
          return <Badge tone={st.tone}>{st.label}</Badge>;
        },
      },
      paidUntil: {
        align: "right",
        headerAlign: "right",
        valueGetter: (_v, row) => row.paidUntil || "",
        renderCell: ({ row }) => (
          <Num className="whitespace-nowrap text-[var(--ad-muted-foreground)]">
            {row.subKind === "comp" ? "—" : row.paidUntilLabel}
          </Num>
        ),
      },
      members: {
        align: "right",
        headerAlign: "right",
        valueGetter: (_v, row) => row.members,
        // USED / LIMIT. Over it is possible — a package's limit can drop under
        // a studio that already has more people — and is shown in red: nobody
        // is removed, but nobody more can join until it upgrades.
        renderCell: ({ row }) => (
          <Num className={row.maxMembers > 0 && row.members > row.maxMembers ? "font-600 text-[var(--ad-destructive-ink)]" : "text-[var(--ad-muted-foreground)]"}>
            {row.members}
            {row.maxMembers > 0 ? ` / ${row.maxMembers}` : " / no limit"}
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
          // A recorded payment moves this row's status and paid-until at once.
          onSubscriptionChanged={(patch) => setLive((rs) => rs.map((r) => (r.id === open.id
            ? { ...r, ...patch, paidUntilLabel: fmtDay(patch.paidUntil) }
            : r)))}
          onSaved={(patch) => {
            setLive((rs) => rs.map((r) => (r.id === patch.id ? { ...r, ...patch } : r)));
            setOpen(null);
          }}
        />
      )}
    </Card>
  );
}

function StudioDialog({ studio, packages, tiers, onClose, onSaved, onSubscriptionChanged }) {
  const [packageId, setPackageId] = useState(studio.packageId);
  // THE BAND on the chosen package (24/09/2026). Picking another package clears
  // it: a band belongs to its package.
  const [categoryId, setCategoryId] = useState(studio.categoryId || "");
  const chosenPackage = packages.find((p) => p.id === packageId) || null;
  const bands = chosenPackage?.type === "compound" ? chosenPackage.categories || [] : [];
  const bandLabel = (b) => `${b.label || "Band"} (${b.minEmployees || 0}–${b.maxEmployees || "∞"})`;
  const [tierId, setTierId] = useState(studio.tierId);
  // OUR HALF OF THE FEATURED-COMPANIES DECISION. Consent is the studio's and is
  // given in its own settings; this is only whether we have chosen to show a
  // studio that already agreed. Both are required, and neither can be set from
  // the other's screen — see shared/marketing/showcase.
  const [featured, setFeatured] = useState(Boolean(studio.featured));
  const [featuredOrder, setFeaturedOrder] = useState(String(studio.featuredOrder ?? 0));
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
      body: JSON.stringify({ packageId, categoryId: bands.length ? categoryId : "", tierId, featured, featuredOrder: Number(featuredOrder) || 0 }),
    });
    setBusy(false);
    if (!res.ok) { setError("That didn't save."); return; }
    const pkg = packages.find((p) => p.id === packageId);
    const tier = tiers.find((t) => t.id === tierId);
    onSaved({
      id: studio.id,
      packageId, tierId,
      categoryId: bands.length ? categoryId : "",
      categoryLabel: bands.find((b) => b.id === categoryId)?.label || "",
      featured, featuredOrder: Number(featuredOrder) || 0,
      packageName: pkg?.name || "—",
      packageColor: pkg?.color || "grey",
      // The band's size, else the package's ceiling; paid seats, when the
      // subscription has them, arrive with the next load of the page.
      maxMembers: seatLimit(0, pkg, bands.length ? categoryId : ""),
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
        className="relative flex max-h-[92vh] w-full max-w-[720px] flex-col overflow-hidden rounded-geex border shadow-[var(--ad-shadow-lg)]"
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

        <div className="space-y-5 overflow-y-auto px-5 py-5">
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
              <SelectMenu id="pkg" className="ad-select" value={packageId}
                onChange={(v) => { setPackageId(v); if (v !== packageId) setCategoryId(""); }} aria-label="Package"
                options={[{ value: "", label: "— none —" }, ...packages.map((p) => ({ value: p.id, label: p.isPublic ? p.name : `${p.name} (not on sale)` }))]}
              />
              {/* A PACKAGE NOBODY CAN BUY ANY MORE (e.g. the old Premium) is still
                  valid to sit on, but somebody should decide: move the studio to a
                  package that is sold, or keep it deliberately as an internal one. */}
              {chosenPackage && !chosenPackage.isPublic && (
                <p className="mt-1 text-xs text-[var(--ad-warning-ink,var(--ad-muted-foreground))]">
                  {chosenPackage.name} is not on the public price list. Move this studio to a package that is sold, or keep it on purpose.
                </p>
              )}
            </div>
            {bands.length > 0 && (
              <div className="sm:col-span-2">
                <label className="ad-label" htmlFor="band">Band</label>
                <SelectMenu id="band" className="ad-select" value={categoryId} onChange={setCategoryId} aria-label="Band"
                  options={[{ value: "", label: `— none (largest band, ${Math.max(...bands.map((b) => Number(b.maxEmployees) || 0))} people) —` }, ...bands.map((b) => ({ value: b.id, label: bandLabel(b) }))]}
                />
                <p className="mt-1 text-xs text-[var(--ad-muted-foreground)]">
                  The band sets how many people the studio may have. Seats recorded on the subscription below override it.
                </p>
              </div>
            )}
            <div>
              <label className="ad-label" htmlFor="tier">Tier</label>
              <SelectMenu id="tier" className="ad-select" value={tierId} onChange={setTierId} aria-label="Tier"
                options={[{ value: "", label: "— none —" }, ...tiers.map((t) => ({ value: t.id, label: t.name }))]}
              />
            </div>
          </div>

          {/* FEATURING IS NOT PUBLISHING. A studio appears on nompany.com only
              when it has ALSO agreed, in its own settings — so this switch makes
              a studio eligible and nothing more. The line below says which half
              is missing, because the alternative is somebody flipping this,
              checking the site, and finding nothing with no way to know why. */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <span className="ad-label">Featured on the website</span>
              <label className="mt-1 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--ad-primary)]"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                />
                <span>Eligible to appear</span>
              </label>
              <p className="mt-1 text-xs text-[var(--ad-muted-foreground)]">
                {studio.hasConsented
                  ? featured
                    ? "Consented and featured — this studio is on the site."
                    : "This studio has agreed; switch this on to show it."
                  : "This studio has NOT agreed to be named. Featuring it changes nothing until it does — consent is theirs to give, in their own settings."}
              </p>
            </div>
            <div>
              <label className="ad-label" htmlFor="featuredOrder">Order</label>
              <input
                id="featuredOrder"
                type="number"
                className="ad-input"
                value={featuredOrder}
                onChange={(e) => setFeaturedOrder(e.target.value)}
                aria-label="Featured order"
              />
              <p className="mt-1 text-xs text-[var(--ad-muted-foreground)]">
                Lowest first. Ties break alphabetically, so a repeated number
                does not reshuffle the page between visits.
              </p>
            </div>
          </div>

          {/* THE SUBSCRIPTION saves itself, action by action, rather than
              waiting for this dialog's Save: each one is an event with its own
              id, and holding a payment until somebody also saved the featured
              switch would be how one gets lost. */}
          <div className="border-t pt-5" style={{ borderColor: "var(--ad-border)" }}>
            <h4 className="mb-3 text-sm font-700">Subscription</h4>
            <SubscriptionPanel studioId={studio.id} onChanged={onSubscriptionChanged} packages={packages} tiers={tiers} />
          </div>

          {error && <p className="text-sm text-[var(--ad-destructive-ink)]">{error}</p>}
        </div>

        <div className="flex gap-3 border-t px-5 py-4" style={{ borderColor: "var(--ad-border)" }}>
          <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}
