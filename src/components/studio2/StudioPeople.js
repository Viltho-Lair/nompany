"use client";

import { useCallback, useEffect, useState } from "react";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { ADMIN_ROLE_ID } from "@/lib/permissions";

const panel = "rounded-geex border border-slate-200/70 bg-white p-6 dark:border-white/10 dark:bg-[#20202c]";
const h2 = "font-display text-lg font-800 text-slate-900 dark:text-white";
const sub = "mt-1 text-sm text-slate-500 dark:text-slate-400";
const input =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-[#191921] dark:text-white";
const btn = "rounded-full bg-brand-700 px-4 py-2 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60";
const btnGhost = "rounded-full border border-slate-200 px-4 py-2 font-display text-sm font-600 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5";
const btnDanger = "rounded-full border border-rose-200 px-4 py-2 font-display text-sm font-600 text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-60 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10";

// People & requests — who is in THIS studio, and who is asking to be.
// Everything shown here is the person's studio-local identity (their alias and
// role inside this studio); nothing about them in any other studio is visible.
export default function StudioPeople({ slug, canAdminister, myCollaboratorId }) {
  const [requests, setRequests] = useState([]);
  const [people, setPeople] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setError("");
    const calls = [fetch(`/api/studios/${slug}/collaborators`, { cache: "no-store" })];
    if (canAdminister) calls.push(fetch(`/api/studios/${slug}/requests`, { cache: "no-store" }));
    const [colRes, reqRes] = await Promise.all(calls);
    if (colRes.ok) setPeople((await colRes.json()).collaborators || []);
    // The roles this studio has defined, so a row can name what somebody holds
    // and the picker can offer the rest. Read-only here — they are authored on
    // the access screen.
    fetch(`/api/studios/${slug}/roles`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setRoles(d?.roles || []))
      .catch(() => {});
    if (reqRes?.ok) setRequests((await reqRes.json()).requests || []);
    setLoading(false);
  }, [slug, canAdminister]);

  useEffect(() => { load(); }, [load]);
  // A join request or a membership change — show it as it happens.
  useLiveUpdates(slug, "people", load);

  async function decide(request, action, alias, role) {
    setBusyId(request.id); setError("");
    const res = await fetch(`/api/studios/${slug}/requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: request.id, action, alias, role }),
    });
    setBusyId("");
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(
        data.error === "already-decided" ? "That request was already handled."
        // The package sets the ceiling, so the message says what to do about it
        // rather than just refusing.
        : data.error === "member-limit" ? `Your package allows ${data.limit} member${data.limit === 1 ? "" : "s"}. Upgrade, or remove someone first.`
        : "We couldn't complete that.");
    }
    load();
  }

  async function saveMember(person, patch) {
    setBusyId(person.id); setError("");
    const res = await fetch(`/api/studios/${slug}/collaborators`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collaboratorId: person.id, patch }),
    });
    setBusyId("");
    if (!res.ok) setError("We couldn't save that change.");
    load();
  }

  async function removeMember(person) {
    setBusyId(person.id); setError("");
    const res = await fetch(`/api/studios/${slug}/collaborators`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collaboratorId: person.id }),
    });
    setBusyId("");
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error === "owner-immutable" ? "The owner can't be removed." : "We couldn't remove that person.");
    }
    load();
  }

  if (loading) return <p className="text-sm text-slate-500">Loading people…</p>;

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

      {canAdminister && (
        <section className={panel}>
          <h2 className={h2}>Invite people</h2>
          <p className={sub}>Share your company code. They enter it on their account page and you approve the request — no links or tokens to pass around.</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <code className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 font-mono text-base font-700 text-slate-900 dark:border-white/15 dark:bg-[#191921] dark:text-white">{slug}</code>
            <button
              type="button"
              className={btnGhost}
              onClick={async () => { try { await navigator.clipboard.writeText(slug); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ } }}
            >
              {copied ? "Copied" : "Copy code"}
            </button>
          </div>
        </section>
      )}

      {canAdminister && (
        <section className={panel}>
          <div className="flex items-center gap-3">
            <h2 className={h2}>Requests to join</h2>
            {requests.length > 0 && (
              <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-700 text-white">{requests.length}</span>
            )}
          </div>
          <p className={sub}>Approving creates their profile inside this studio.</p>
          {requests.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">No one is waiting.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {requests.map((r) => <RequestRow key={r.id} request={r} busy={busyId === r.id} onDecide={decide} />)}
            </ul>
          )}
        </section>
      )}

      <section className={panel}>
        <h2 className={h2}>People in this studio</h2>
        <p className={sub}>
          {canAdminister ? "Names and roles here apply only inside this studio." : "Everyone with access to this studio."}
        </p>
        <ul className="mt-4 space-y-2">
          {people.map((p) => (
            <MemberRow
              key={p.id}
              person={p}
              roles={roles}
              isMe={p.id === myCollaboratorId}
              canAdminister={canAdminister}
              busy={busyId === p.id}
              onSave={saveMember}
              onRemove={removeMember}
            />
          ))}
        </ul>
      </section>
    </div>
  );
}

function RequestRow({ request, busy, onDecide }) {
  const [alias, setAlias] = useState(request.fullName || "");
  const [role, setRole] = useState("member");
  return (
    <li className="rounded-xl border border-slate-200/70 p-4 dark:border-white/10">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="font-600 text-slate-900 dark:text-white">{request.fullName || "Someone"}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{request.email}</p>
        </div>
        <span className="text-xs text-slate-400">asked {new Date(request.createdAt).toLocaleDateString("en-GB")}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div className="min-w-[180px] flex-1">
          <label className="mb-1 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Name in this studio</label>
          <input className={input} value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="e.g. Sara" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Role</label>
          <select className={input} value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button className={btn} disabled={busy} onClick={() => onDecide(request, "approve", alias, role)}>
          {busy ? "Working…" : "Approve"}
        </button>
        <button className={btnGhost} disabled={busy} onClick={() => onDecide(request, "decline")}>Decline</button>
      </div>
    </li>
  );
}

function MemberRow({ person, roles = [], isMe, canAdminister, busy, onSave, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [alias, setAlias] = useState(person.alias || "");
  // ONE ROLE PER PERSON in this picker. The model allows several and resolves
  // their union, but a dropdown is five seconds and a multi-select is a
  // decision — and assigning access should be the quick half of this job.
  const [roleId, setRoleId] = useState((person.roleIds || [])[0] || "");
  const held = roles.find((r) => r.id === (person.roleIds || [])[0]);
  // Either the old flag or the new role — both mean the same thing while the
  // legacy bridge stands, and the row must not call one of them something else.
  const isAdminNow = Boolean(person.isAdmin) || (person.roleIds || []).includes(ADMIN_ROLE_ID);
  const isOwner = person.role === "owner";

  if (editing) {
    return (
      <li className="flex flex-wrap items-end gap-3 rounded-xl border border-brand-500/40 p-4">
        <div className="min-w-[180px] flex-1">
          <label className="mb-1 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Name in this studio</label>
          <input className={input} value={alias} onChange={(e) => setAlias(e.target.value)} />
        </div>
        {/* THE ASSIGNMENT. A dropdown, because this is the frequent half of the
            job: naming what somebody does should take five seconds and never
            show a permission key. What the role MEANS is edited once, on the
            access screen. */}
        {roles.length > 0 && !isOwner && (
          <div className="min-w-[180px]">
            <label className="mb-1 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Role</label>
            <select className={input} value={roleId} onChange={(e) => setRoleId(e.target.value)}>
              <option value="">No role — no access</option>
              {roles.map((r) => (<option key={r.id} value={r.id}>{r.name}</option>))}
            </select>
          </div>
        )}
        <button className={btn} disabled={busy}
          onClick={() => { onSave(person, { alias, roleIds: roleId ? [roleId] : [] }); setEditing(false); }}>Save</button>
        <button className={btnGhost}
          onClick={() => { setAlias(person.alias || ""); setRoleId((person.roleIds || [])[0] || ""); setEditing(false); }}>Cancel</button>
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/70 px-4 py-3 dark:border-white/10">
      <div className="flex items-center gap-2.5">
        {/* The face if there is one, the initial if there is not. Same circle
            either way, so a list of people does not change shape depending on
            who has uploaded a picture. */}
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-500/10 font-display text-sm font-700 text-brand-700 dark:text-brand-300">
          {person.photo
            /* eslint-disable-next-line @next/next/no-img-element */
            ? <img src={person.photo} alt="" className="h-full w-full object-cover" />
            : (person.alias || "?").charAt(0).toUpperCase()}
        </span>
        <div>
          <p className="font-600 text-slate-900 dark:text-white">
            {person.alias || "Unnamed member"} {isMe && <span className="text-xs font-400 text-slate-400">(you)</span>}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isOwner ? "Owner" : isAdminNow ? "Admin" : held ? held.name : "No role"}
            {person.overrideCount > 0 && (
              <span className="ms-1.5 text-amber-700 dark:text-amber-300">
                +{person.overrideCount} exception{person.overrideCount === 1 ? "" : "s"}
              </span>
            )}
            {" · joined "}{new Date(person.createdAt).toLocaleDateString("en-GB")}
          </p>
        </div>
      </div>
      {canAdminister && !isOwner && (
        <div className="flex flex-wrap gap-2">
          {/* Not "Rename" any more: this row now sets the studio name AND the role,
              and a button that names half of what it opens sends people looking
              for the other half somewhere else. */}
          <button className={btnGhost} disabled={busy} onClick={() => setEditing(true)}>Edit</button>
          <button
            className={btnGhost}
            disabled={busy}
            /* Admin is a ROLE now, not a flag. Setting the flag made somebody
               all-powerful in a way no role could describe or constrain; giving
               them the Admin role says the same thing in the same language as
               every other grant, and can be taken back the same way. */
            onClick={() => onSave(person, isAdminNow
              ? { isAdmin: false, role: "member", roleIds: [] }
              : { isAdmin: false, role: "member", roleIds: [ADMIN_ROLE_ID] })}
          >
            {isAdminNow ? "Make member" : "Make admin"}
          </button>
          <button className={btnDanger} disabled={busy} onClick={() => onRemove(person)}>Remove</button>
        </div>
      )}
    </li>
  );
}
