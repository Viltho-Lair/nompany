"use client";

import { useCallback, useEffect, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { peopleDict } from "@/shared/studio/people";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { ADMIN_ROLE_ID } from "@/platform/access";
import { Field } from "@/components/fields/Field";
import { fmtDate } from "@/lib/format";

const panel = "rounded-geex border border-slate-200/70 bg-[var(--geex-surface)] p-6 dark:border-white/10";
const h2 = "font-display text-lg font-800 text-slate-900 dark:text-white";
const sub = "mt-1 text-sm text-slate-500 dark:text-slate-400";
const btn = "rounded-full bg-brand-700 px-4 py-2 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60";
const btnGhost = "rounded-full border border-slate-200 px-4 py-2 font-display text-sm font-600 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5";
const btnDanger = "rounded-full border border-rose-200 px-4 py-2 font-display text-sm font-600 text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-60 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10";

// People & requests — who is in THIS studio, and who is asking to be.
// Everything shown here is the person's studio-local identity (their alias and
// role inside this studio); nothing about them in any other studio is visible.
export default function StudioPeople({ slug, canAdminister, myCollaboratorId }) {
  const tr = peopleDict(useStudioLocale());
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
        data.error === "already-decided" ? tr.requestAlreadyHandled
        // The package sets the ceiling, so the message says what to do about it
        // rather than just refusing.
        : data.error === "member-limit" ? tr.nMembersAllowed(data.limit)
        : tr.couldnComplete);
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
    if (!res.ok) setError(tr.couldnSaveChange);
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
      setError(data.error === "owner-immutable" ? tr.ownerCanRemoved : tr.couldnRemovePerson);
    }
    load();
  }

  if (loading) return <p className="text-sm text-slate-500">{tr.loadingPeople}</p>;

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

      {canAdminister && (
        <section className={panel}>
          <h2 className={h2}>{tr.invitePeople}</h2>
          <p className={sub}>{tr.shareCompanyCodeThey}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <code className="rounded-xl border border-slate-200 bg-[var(--geex-inset)] px-4 py-2.5 font-mono text-base font-700 text-slate-900 dark:border-white/15 dark:text-white">{slug}</code>
            <button
              type="button"
              className={btnGhost}
              onClick={async () => { try { await navigator.clipboard.writeText(slug); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ } }}
            >
              {copied ? tr.copied : tr.copyCode}
            </button>
          </div>
        </section>
      )}

      {canAdminister && (
        <section className={panel}>
          <div className="flex items-center gap-3">
            <h2 className={h2}>{tr.requestsJoin}</h2>
            {requests.length > 0 && (
              <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-700 text-white">{requests.length}</span>
            )}
          </div>
          <p className={sub}>{tr.approvingCreatesProfileInside}</p>
          {requests.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">{tr.noOneWaiting}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {requests.map((r) => <RequestRow key={r.id} request={r} busy={busyId === r.id} onDecide={decide} />)}
            </ul>
          )}
        </section>
      )}

      <section className={panel}>
        <h2 className={h2}>{tr.peopleStudio}</h2>
        <p className={sub}>
          {canAdminister ? tr.namesRolesHereApply : tr.everyoneAccessStudio}
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
  const tr = peopleDict(useStudioLocale());
  const [alias, setAlias] = useState(request.fullName || "");
  const [role, setRole] = useState("member");
  return (
    <li className="rounded-xl border border-slate-200/70 p-4 dark:border-white/10">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="font-600 text-slate-900 dark:text-white">{request.fullName || tr.someone2}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{request.email}</p>
        </div>
        <span className="text-xs text-slate-400">asked {fmtDate(request.createdAt)}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <Field label={tr.nameStudio} value={alias} onChange={(v) => setAlias(v)} className="min-w-[180px] flex-1" />
        <Field label={tr.role} as="select" required value={role} onChange={(v) => setRole(v)}
          options={[{ value: "member", label: tr.member }, { value: "admin", label: tr.admin }]} />
        <button className={btn} disabled={busy} onClick={() => onDecide(request, "approve", alias, role)}>
          {busy ? tr.working : tr.approve}
        </button>
        <button className={btnGhost} disabled={busy} onClick={() => onDecide(request, "decline")}>{tr.decline}</button>
      </div>
    </li>
  );
}

function MemberRow({ person, roles = [], isMe, canAdminister, busy, onSave, onRemove }) {
  const tr = peopleDict(useStudioLocale());
  const [editing, setEditing] = useState(false);
  const [alias, setAlias] = useState(person.alias || "");
  // ONE ROLE PER PERSON in this picker. The model allows several and resolves
  // their union, but a dropdown is five seconds and a multi-select is a
  // decision — and assigning access should be the quick half of this job.
  const [roleId, setRoleId] = useState((person.roleIds || [])[0] || "");
  const held = roles.find((r) => r.id === (person.roleIds || [])[0]);
  // ADMIN IS A ROLE, and holding it is the only way to be one. There was an
  // `isAdmin` flag beside this saying the same thing separately; it is gone,
  // so there is now one answer to read instead of two that could disagree.
  const isAdminNow = (person.roleIds || []).includes(ADMIN_ROLE_ID);
  const isOwner = person.role === "owner";

  if (editing) {
    return (
      <li className="flex flex-wrap items-end gap-3 rounded-xl border border-brand-500/40 p-4">
        <Field label={tr.nameStudio} value={alias} onChange={(v) => setAlias(v)} className="min-w-[180px] flex-1" />
        {/* THE ASSIGNMENT. A dropdown, because this is the frequent half of the
            job: naming what somebody does should take five seconds and never
            show a permission key. What the role MEANS is edited once, on the
            access screen. */}
        {roles.length > 0 && !isOwner && (
          <Field label={tr.role} as="select" required value={roleId} onChange={(v) => setRoleId(v)} className="min-w-[180px]"
            options={[{ value: "", label: tr.noRoleNoAccess }, ...roles.map((r) => ({ value: r.id, label: r.name }))]} />
        )}
        <button className={btn} disabled={busy}
          onClick={() => { onSave(person, { alias, roleIds: roleId ? [roleId] : [] }); setEditing(false); }}>{tr.save}</button>
        <button className={btnGhost}
          onClick={() => { setAlias(person.alias || ""); setRoleId((person.roleIds || [])[0] || ""); setEditing(false); }}>{tr.cancel}</button>
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
            {person.alias || tr.unnamedMember2} {isMe && <span className="text-xs font-400 text-slate-400">{tr.you}</span>}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isOwner ? tr.owner : isAdminNow ? tr.admin : held ? held.name : tr.noRole}
            {person.overrideCount > 0 && (
              <span className="ms-1.5 text-amber-700 dark:text-amber-300">
                {tr.nExceptions(person.overrideCount)}
              </span>
            )}
            {tr.joinedSuffix2}{fmtDate(person.createdAt)}
          </p>
        </div>
      </div>
      {canAdminister && !isOwner && (
        <div className="flex flex-wrap gap-2">
          {/* Not "Rename" any more: this row now sets the studio name AND the role,
              and a button that names half of what it opens sends people looking
              for the other half somewhere else. */}
          <button className={btnGhost} disabled={busy} onClick={() => setEditing(true)}>{tr.edit}</button>
          {/* NO "Make admin" HERE. Admin is a ROLE — role_admin, the wildcard the
              studio ships with — so it is assigned where every other role is:
              the dropdown behind Edit. A button beside it was a second way to
              set the same field, one that skipped the picker and made the most
              powerful grant in the studio the easiest click on the row. Nothing
              is lost by its absence: Admin still appears in that dropdown, and
              taking it back is choosing something else there. */}
          <button className={btnDanger} disabled={busy} onClick={() => onRemove(person)}>{tr.remove}</button>
        </div>
      )}
    </li>
  );
}
