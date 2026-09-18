"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Card, CardHead, CardBody, Badge, Avatar, Icon } from "../../_components/ui";
import SuperDataGrid from "@/components/super/SuperDataGrid";
import { USERS_COLUMNS, USERS_PAGE_SIZE } from "./columns";
import { ASSIGNABLE_ROLES, ROLE_OPTIONS, MEMBER_ROLE, SUPER_ROLE, STATUS } from "@/lib/platformRoles";
import SelectMenu from "@/components/fields/SelectMenu";

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
function RoleMenu({ row, onPick, onWarn, onStatus, onReset }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const pick = async (role) => run(() => onPick(role));
  const run = async (act) => {
    setOpen(false);
    setBusy(true);
    try {
      await act();
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
      const W = 232, H = 440;
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
              {/* THE SHARING FLAG'S TWO ANSWERS (18/09/2026). A warning email,
                  written to the audit log; and suspension, which stays a
                  person's click and is never taken because of a flag alone. */}
              <div className="border-t py-1" style={{ borderColor: "var(--ad-border)" }}>
                <button type="button" role="menuitem" className={item} onClick={() => run(onWarn)}>
                  <span className="flex-1">Send sharing warning</span>
                </button>
                {/* RESET PART OF THEIR SIGN-IN — for somebody locked out. Each is
                    offered only when they have it, asks first, and emails them. */}
                {[
                  ["two-factor", "Reset two-factor", row.twoFactor],
                  ["pin", "Reset PIN", row.pin],
                  ["passkeys", "Remove passkeys", row.passkeys > 0],
                ].filter(([, , has]) => has).map(([what, label]) => (
                  <button key={what} type="button" role="menuitem" className={item}
                    onClick={() => { if (window.confirm(`${label} for ${row.name}? They are emailed that it was done.`)) run(() => onReset(what)); }}>
                    <span className="flex-1">{label}</span>
                  </button>
                ))}
                {row.status === STATUS.suspended ? (
                  <button type="button" role="menuitem" className={item} onClick={() => run(() => onStatus("active"))}>
                    <span className="flex-1">Reactivate</span>
                  </button>
                ) : (
                  <button type="button" role="menuitem" className={item} style={{ color: "var(--ad-destructive)" }}
                    onClick={() => { if (window.confirm(`Suspend ${row.name}? They are signed out everywhere and cannot sign in.`)) run(() => onStatus("suspended")); }}>
                    <span className="flex-1">Suspend</span>
                  </button>
                )}
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
  // THE SHARING FILTERS (the owner, 18/09/2026): flagged accounts, and how
  // many places a person is signed in right now.
  const [sharing, setSharing] = useState("");
  const [sessions, setSessions] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (role && r.role !== role) return false;
      if (sharing === "flagged" && !r.flagged) return false;
      if (sharing === "warned" && !r.warned) return false;
      if (sessions && (sessions === "3" ? r.sessions < 3 : r.sessions !== Number(sessions))) return false;
      if (!q) return true;
      return r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
    });
  }, [rows, query, role, sharing, sessions]);
  const flaggedCount = useMemo(() => rows.filter((r) => r.flagged).length, [rows]);

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

  const warn = useCallback(async (row) => {
    setError(""); setNotice("");
    try {
      const res = await fetch(`/api/super/users/${row.id}/warn`, { method: "POST" });
      if (!res.ok) { setError("Couldn't send the warning email."); return; }
      setNotice(`Sharing warning sent to ${row.email}.`);
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    }
  }, [router]);

  const resetPart = useCallback(async (row, what) => {
    setError(""); setNotice("");
    try {
      const res = await fetch(`/api/super/users/${row.id}/reset`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ what }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError("Couldn't reset that."); return; }
      setNotice(data.emailSent ? `Reset done; ${row.email} was emailed.` : `Reset done, but the email to ${row.email} did not go.`);
      router.refresh();
    } catch {
      setError("Couldn't reach the server.");
    }
  }, [router]);

  const setStatus = useCallback(async (row, status) => {
    setError(""); setNotice("");
    try {
      const res = await fetch(`/api/super/users/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error === "super" ? "A super admin cannot be suspended here." : "Couldn't change that account.");
        return;
      }
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
      sessions: {
        renderCell: ({ row }) => <span className="num text-[var(--ad-muted-foreground)]">{row.sessions}</span>,
      },
      sharing: {
        valueGetter: (_v, row) => (row.flagged ? 2 : row.warned ? 1 : 0),
        renderCell: ({ row }) => (
          <span className="flex min-w-0 flex-col leading-tight"
            title={`${row.evictions7d} forced sign-outs in 7 days · ${row.newDevices30d} new devices in 30 days`}>
            {row.flagged ? <Badge tone="danger">Flagged</Badge> : <span className="text-[var(--ad-muted-foreground)]">—</span>}
            {row.warned ? <span className="mt-0.5 truncate text-xs text-[var(--ad-muted-foreground)]">Warned {row.warned}</span> : null}
          </span>
        ),
      },
      security: {
        sortable: false,
        valueGetter: (_v, row) => [row.twoFactor && "2FA", row.pin && "PIN", row.passkeys > 0 && `${row.passkeys} passkey${row.passkeys === 1 ? "" : "s"}`].filter(Boolean).join(" · "),
        renderCell: ({ value }) => <span className="truncate text-xs text-[var(--ad-muted-foreground)]">{value || "—"}</span>,
      },
      actions: {
        sortable: false,
        align: "right",
        renderCell: ({ row }) => (
          <RoleMenu row={row} onPick={(r) => assignRole(row.id, r)}
            onWarn={() => warn(row)} onStatus={(st) => setStatus(row, st)} onReset={(what) => resetPart(row, what)} />
        ),
      },
    };
    // `skeleton` is stripped: it is metadata for the placeholder, and MUI warns
    // about props it does not recognise on a column definition.
    return USERS_COLUMNS.map(({ skeleton, ...col }) => ({ ...col, ...(render[col.field] || {}) }));
  }, [assignRole, warn, setStatus, resetPart]);

  return (
    <Card className="overflow-hidden">
      <CardHead
        title="All Users"
        sub={flaggedCount
          ? `Every identity that can sign in to nompany · ${flaggedCount} flagged for sharing`
          : "Every identity that can sign in to nompany"}
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
            <SelectMenu
              className="ad-select w-40"
              aria-label="Filter by role"
              value={role}
              onChange={setRole}
              options={[{ value: "", label: "All roles" }, ...ROLE_OPTIONS]}
            />
            <SelectMenu
              className="ad-select w-40"
              aria-label="Filter by sharing"
              value={sharing}
              onChange={setSharing}
              options={[
                { value: "", label: "Any sharing" },
                { value: "flagged", label: "Flagged" },
                { value: "warned", label: "Warned" },
              ]}
            />
            <SelectMenu
              className="ad-select w-36"
              aria-label="Filter by active sessions"
              value={sessions}
              onChange={setSessions}
              options={[
                { value: "", label: "Any sessions" },
                { value: "0", label: "0 sessions" },
                { value: "1", label: "1 session" },
                { value: "2", label: "2 sessions" },
                { value: "3", label: "3+ sessions" },
              ]}
            />
          </div>
        }
      />

      {error ? (
        <CardBody className="pt-0">
          <p role="alert" className="text-sm" style={{ color: "var(--ad-destructive)" }}>{error}</p>
        </CardBody>
      ) : null}
      {notice && !error ? (
        <CardBody className="pt-0">
          <p role="status" className="text-sm text-[var(--ad-muted-foreground)]">{notice}</p>
        </CardBody>
      ) : null}

      <SuperDataGrid
        rows={filtered}
        columns={columns}
        pageSize={USERS_PAGE_SIZE}
        ariaLabel="Users"
        emptyIcon="users"
        emptyLabel={query || role || sharing || sessions ? "No users match that search." : "No users yet."}
      />
    </Card>
  );
}
