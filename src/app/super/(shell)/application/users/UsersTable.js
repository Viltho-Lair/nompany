"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Card, CardHead, CardBody, Badge, Avatar, Table, Icon } from "../../../_components/ui";
import { ASSIGNABLE_ROLES, ROLE_OPTIONS, MEMBER_ROLE, SUPER_ROLE, STATUS } from "@/lib/platformRoles";

// The interactive half of the Users console. Rows arrive already ordered and
// already labelled by the server; this decides only what is shown — the search
// term, the role filter and which page you are on — plus role assignment.

const PAGE_SIZE = 10;

const STATUS_TONE = {
  [STATUS.active]: "success",
  [STATUS.inactive]: "muted",
  [STATUS.invited]: "warning",
  [STATUS.suspended]: "danger",
};

const roleTone = (role) => (role === SUPER_ROLE ? "danger" : role === MEMBER_ROLE ? "muted" : "info");

// At most seven numbered buttons, centred on where you are — a platform with
// thousands of users must not render a thousand-button pager.
const PAGER_WIDTH = 7;
function pageWindow(current, pages) {
  const first = Math.max(1, Math.min(current - Math.floor(PAGER_WIDTH / 2), pages - PAGER_WIDTH + 1));
  const width = Math.min(PAGER_WIDTH, pages);
  return Array.from({ length: width }, (_, i) => first + i);
}

/* ---- the row menu -------------------------------------------------------- */

function RoleMenu({ row, onPick, busy }) {
  const [open, setOpen] = useState(false);
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

  // PORTALLED to <body>. The table scrolls sideways inside an overflow-x-auto
  // wrapper, and that wrapper clips anything positioned outside the cell — so an
  // absolutely-placed menu was being cut off by the row it belongs to. Fixed
  // coordinates put it over the row and over the list instead of inside them.
  const [at, setAt] = useState(null);
  useEffect(() => {
    if (!open) { setAt(null); return; }
    const place = () => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const W = 208, H = 200;
      setAt({
        // Flip above when the row is near the bottom, so the last user's menu
        // is not half off the window.
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
          className="z-[100] overflow-hidden rounded-lg border shadow-xl"
        >
          {row.roleLocked ? (
            // The owner's own row. Their role comes from the super-admin record,
            // not from this field, so there is nothing here to change.
            <p className="px-4 py-3 text-xs leading-snug text-[var(--ad-muted-foreground)]">
              Super Admin — managed on the owner account, not assignable here.
            </p>
          ) : (
            <>
              <div className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--ad-muted-foreground)]">
                Assign role
              </div>
              {ASSIGNABLE_ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  role="menuitem"
                  className={item}
                  onClick={() => { setOpen(false); onPick(r); }}
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
                  onClick={() => { setOpen(false); onPick(""); }}
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

/* ---- the table ----------------------------------------------------------- */

export default function UsersTable({ rows }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [pendingId, setPendingId] = useState("");
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (role && r.role !== role) return false;
      if (!q) return true;
      return r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
    });
  }, [rows, query, role]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // Narrowing the list can strand you past the last page, so clamp on render
  // rather than resetting in an effect (which would flash the wrong page first).
  const current = Math.min(page, pages);
  const start = (current - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

  async function assignRole(userId, platformRole) {
    setPendingId(userId);
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
    } finally {
      setPendingId("");
    }
  }

  return (
    <Card>
      <CardHead
        title="All Users"
        sub="Every identity that can sign in to nompany"
        action={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Icon name="search" className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ad-muted-foreground)] ltr:left-3 rtl:right-3" />
              <input
                className="ad-input w-56 ps-9"
                placeholder="Search users…"
                aria-label="Search users"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              />
            </div>
            <select
              className="ad-select w-40"
              aria-label="Filter by role"
              value={role}
              onChange={(e) => { setRole(e.target.value); setPage(1); }}
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

      <Table head={["User", "Role", "Studio", "Status", "Last active", { label: "", align: "end" }]}>
        {visible.length === 0 ? (
          <tr>
            <td colSpan={6} className="py-10 text-center text-sm text-[var(--ad-muted-foreground)]">
              No users match that search.
            </td>
          </tr>
        ) : (
          visible.map((u) => (
            <tr key={u.id}>
              <td>
                <span className="inline-flex items-center gap-3">
                  <Avatar name={u.name} size={36} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{u.name}</span>
                    <span className="block truncate text-xs text-[var(--ad-muted-foreground)]">{u.email}</span>
                  </span>
                </span>
              </td>
              <td><Badge tone={roleTone(u.role)}>{u.role}</Badge></td>
              <td className="whitespace-nowrap text-[var(--ad-muted-foreground)]">
                {u.studios.length === 0 ? "—" : u.studios.length === 1 ? u.studios[0] : `${u.studios[0]} +${u.studios.length - 1}`}
              </td>
              <td><Badge tone={STATUS_TONE[u.status]}>{u.status}</Badge></td>
              <td className="whitespace-nowrap text-[var(--ad-muted-foreground)]">{u.lastActive}</td>
              <td className="text-end">
                <RoleMenu row={u} busy={pendingId === u.id} onPick={(r) => assignRole(u.id, r)} />
              </td>
            </tr>
          ))
        )}
      </Table>

      <CardBody className="flex flex-wrap items-center justify-between gap-3 pt-4">
        <p className="text-xs text-[var(--ad-muted-foreground)]">
          {filtered.length === 0
            ? "No users to show"
            : `Showing ${start + 1}–${start + visible.length} of ${filtered.length} user${filtered.length === 1 ? "" : "s"}`}
          {filtered.length !== rows.length ? ` (filtered from ${rows.length})` : ""}
        </p>
        {pages > 1 ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="ad-btn ad-btn-outline ad-btn-sm"
              disabled={current === 1}
              onClick={() => setPage(current - 1)}
            >
              Previous
            </button>
            {pageWindow(current, pages).map((p) => (
              <button
                key={p}
                type="button"
                aria-current={p === current ? "page" : undefined}
                className={`ad-btn ad-btn-sm ${p === current ? "ad-btn-primary" : "ad-btn-outline"}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              className="ad-btn ad-btn-outline ad-btn-sm"
              disabled={current === pages}
              onClick={() => setPage(current + 1)}
            >
              Next
            </button>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
