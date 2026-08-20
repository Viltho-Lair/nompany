"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Card, CardHead, CardBody, Badge, Avatar, Icon } from "../../../_components/ui";
import SuperDataGrid from "@/components/super/SuperDataGrid";
import { USERS_COLUMNS, USERS_PAGE_SIZE } from "./columns";
import { ASSIGNABLE_ROLES, ROLE_OPTIONS, MEMBER_ROLE, SUPER_ROLE, STATUS } from "@/lib/platformRoles";

// The interactive half of the Users console. Rows arrive already ordered and
// already labelled by the server; this decides only what is shown — the search
// term and the role filter — plus role assignment.
//
// PAGING AND SORTING ARE THE GRID'S NOW. This file used to carry a hand-written
// pager: a seven-button window, an off-by-one clamp for when filtering strands
// you past the last page, and a "Showing 11–20 of 214" line that had to be kept
// in step with all of it. None of that was users-specific, and every list screen
// in the console had its own copy with its own bugs. The Data Grid owns it, and
// this file is ~90 lines shorter for it.
//
// Search and the role filter stay HERE rather than becoming the grid's quick
// filter, for one reason: the filter has to reach the underlying record, not the
// rendered cell. The `user` cell renders a name and an email stacked, and the
// grid's quick filter would match on whatever that cell stringifies to.

const STATUS_TONE = {
  [STATUS.active]: "success",
  [STATUS.inactive]: "muted",
  [STATUS.invited]: "warning",
  [STATUS.suspended]: "danger",
};

const roleTone = (role) => (role === SUPER_ROLE ? "danger" : role === MEMBER_ROLE ? "muted" : "info");

/* ---- the row menu -------------------------------------------------------- */

// `busy` is the menu's OWN state, not the table's.
//
// It used to live in UsersTable as `pendingId`, which meant every column
// definition was rebuilt — and the grid re-measured every column — the moment
// anyone clicked a role. Only one row is ever in flight, and it is this one, so
// it belongs here.
function RoleMenu({ row, onPick }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const pick = async (role) => {
    setOpen(false);
    setBusy(true);
    try {
      await onPick(role);
    } finally {
      setBusy(false);
    }
  };
  const ref = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      const inTrigger = ref.current?.contains(e.target);
      const inMenu = menuRef.current?.contains(e.target);
      if (!inTrigger && !inMenu) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item = "flex w-full items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-[var(--ad-accent)] text-start";

  // PORTALLED to <body>. The grid's virtual scroller clips anything positioned
  // outside a cell — the same reason the old overflow-x wrapper did — so an
  // absolutely-placed menu was cut off by the row it belongs to. Fixed
  // coordinates put it over the row and over the list instead of inside them.
  const [at, setAt] = useState(null);
  useEffect(() => {
    if (!open) { setAt(null); return; }
    const place = () => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const W = 208, H = 200;
      setAt({
        // Flip above when the row is near the bottom, so the last user's menu is
        // not half off the window.
        top: r.bottom + H > window.innerHeight ? Math.max(8, r.top - H) : r.bottom + 6,
        left: Math.min(Math.max(8, r.right - W), window.innerWidth - W - 8),
        width: W,
      });
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => { window.removeEventListener("scroll", place, true); window.removeEventListener("resize", place); };
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        className="ad-icon-btn h-8 w-8"
        aria-label={`Actions for ${row.name}`}
        aria-expanded={open}
        aria-haspopup="menu"
        disabled={busy}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name={busy ? "refresh" : "more"} className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
      </button>
      {open && at && typeof document !== "undefined" ? createPortal(
        <div
          role="menu"
          ref={menuRef}
          style={{
            position: "fixed", top: at.top, left: at.left, width: at.width,
            backgroundColor: "var(--ad-popover)",
            borderColor: "var(--ad-border)",
            color: "var(--ad-popover-foreground)",
          }}
          className="z-[100] overflow-hidden rounded-xl border shadow-[var(--ad-shadow-lg)]"
        >
          {row.roleLocked ? (
            // The owner's own row. Their role comes from the super-admin record,
            // not from this field, so there is nothing here to change.
            <p className="px-4 py-3 text-xs leading-snug text-[var(--ad-muted-foreground)]">
              Super Admin — managed on the owner account, not assignable here.
            </p>
          ) : (
            <>
              <div className="px-4 pb-1 pt-3 text-[11px] font-600 uppercase tracking-wider text-[var(--ad-muted-foreground)]">
                Assign role
              </div>
              {ASSIGNABLE_ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  role="menuitem"
                  className={item}
                  onClick={() => pick(r)}
                >
                  <span className="flex-1">{r}</span>
                  {row.role === r ? <Icon name="check" className="h-4 w-4 text-[var(--ad-primary)]" /> : null}
                </button>
              ))}
              <div className="border-t py-1" style={{ borderColor: "var(--ad-border)" }}>
                {/* Member is the absence of a role, so this clears the field
                    rather than storing a sixth value. */}
                <button
                  type="button"
                  role="menuitem"
                  className={item}
                  onClick={() => pick("")}
                >
                  <span className="flex-1">Remove role (Member)</span>
                  {row.role === MEMBER_ROLE ? <Icon name="check" className="h-4 w-4 text-[var(--ad-primary)]" /> : null}
                </button>
              </div>
            </>
          )}
        </div>,
        document.body,
      ) : null}
    </div>
  );
}

/* ---- the grid ------------------------------------------------------------ */

const studiosLabel = (studios) =>
  studios.length === 0 ? "—" : studios.length === 1 ? studios[0] : `${studios[0]} +${studios.length - 1}`;

export default function UsersTable({ rows }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (role && r.role !== role) return false;
      if (!q) return true;
      return r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
    });
  }, [rows, query, role]);

  const assignRole = useCallback(async (userId, platformRole) => {
    setError("");
    try {
      const res = await fetch(`/api/super/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platformRole }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error === "super" ? "A super admin's role cannot be changed here." : "Couldn't update that role.");
        return;
      }
      // The server owns the ordering, and a role change moves the row, so re-read
      // rather than patching the copy in state.
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    }
  }, [router]);

  // The layout comes from columns.js — shared with the skeleton — and only the
  // rendering is added here. `valueGetter` is set on every column so sorting and
  // the accessible cell text follow the underlying value rather than the JSX.
  const columns = useMemo(() => {
    const render = {
      user: {
        valueGetter: (_v, row) => row.name,
        renderCell: ({ row }) => (
          <span className="flex min-w-0 items-center gap-3">
            <Avatar name={row.name} size={32} />
            <span className="min-w-0 leading-tight">
              <span className="block truncate font-500">{row.name}</span>
              <span className="block truncate text-xs text-[var(--ad-muted-foreground)]">{row.email}</span>
            </span>
          </span>
        ),
      },
      role: { renderCell: ({ row }) => <Badge tone={roleTone(row.role)}>{row.role}</Badge> },
      studios: {
        valueGetter: (_v, row) => studiosLabel(row.studios),
        renderCell: ({ value }) => <span className="truncate text-[var(--ad-muted-foreground)]">{value}</span>,
      },
      status: { renderCell: ({ row }) => <Badge tone={STATUS_TONE[row.status]}>{row.status}</Badge> },
      lastActive: {
        renderCell: ({ row }) => (
          <span className="truncate text-[var(--ad-muted-foreground)]">{row.lastActive}</span>
        ),
      },
      actions: {
        sortable: false,
        align: "right",
        renderCell: ({ row }) => <RoleMenu row={row} onPick={(r) => assignRole(row.id, r)} />,
      },
    };
    // `skeleton` is stripped: it is metadata for the placeholder, and MUI warns
    // about props it does not recognise on a column definition.
    return USERS_COLUMNS.map(({ skeleton, ...col }) => ({ ...col, ...(render[col.field] || {}) }));
  }, [assignRole]);

  return (
    <Card className="overflow-hidden">
      <CardHead
        title="All Users"
        sub="Every identity that can sign in to nompany"
        action={
          <div className="flex items-center gap-2">
            <div className="relative">
              {/* `start-3` — one utility, mirrored by the browser. It used to be
                  an `ltr:left-3 rtl:right-3` pair. */}
              <Icon
                name="search"
                className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ad-muted-foreground)]"
              />
              <input
                className="ad-input w-56 ps-9"
                placeholder="Search users…"
                aria-label="Search users"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <select
              className="ad-select w-40"
              aria-label="Filter by role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="">All roles</option>
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        }
      />

      {error ? (
        <CardBody className="pt-0">
          <p role="alert" className="text-sm" style={{ color: "var(--ad-destructive)" }}>{error}</p>
        </CardBody>
      ) : null}

      <SuperDataGrid
        rows={filtered}
        columns={columns}
        pageSize={USERS_PAGE_SIZE}
        ariaLabel="Users"
        emptyIcon="users"
        emptyLabel={query || role ? "No users match that search." : "No users yet."}
      />
    </Card>
  );
}
