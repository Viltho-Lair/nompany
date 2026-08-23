"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { panel, h2, sub, input, label, btn, btnGhost, Empty } from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";
import { LEVEL_VERBS, SCOPES, levelsFor, levelOf, keysForLevel } from "@/platform/access";

// THE ACCESS EDITOR.
//
// Defining what a job may do is rare and careful; assigning it is frequent and
// quick. They are opposite jobs, so they are separate screens — this is the
// rare one.
//
// IT NO LONGER NAMES THE ROLE. A role is a job title, and job titles are HR's:
// they are the list that used to be called Positions. What happens here is
// giving one of those jobs its ACCESS — so the button says "Create access", and
// where there was a free-text Name there is now a dropdown of the roles that
// exist. Typing a name here was how the two lists drifted apart in the first
// place: whoever wrote "Sales Engineer" on this screen and whoever wrote it on
// the HR one produced two rows that never met.
//
// Never a hundred checkboxes. Areas are collapsed and summarised in words, and
// each opens to a LADDER: none / view / edit / full, one control per row rather
// than four boxes. Powers that do not nest inside a ladder get their own line,
// so granting "lock a quotation" is a deliberate act instead of one tick among
// a hundred identical ones.

const LADDER_LABEL = { none: "None", view: "View", edit: "Edit", full: "Full" };

export default function StudioRoles({ slug }) {
  const [data, setData] = useState(null);
  // Fetched here rather than passed down: this is a client component and the
  // page that renders it is a server one, so asking is cheaper than plumbing.
  const [people, setPeople] = useState([]);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/roles`, { cache: "no-store" });
    if (!res.ok) { setError("Couldn't load roles."); return; }
    setData(await res.json());
  }, [slug]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch(`/api/studios/${slug}/collaborators`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setPeople(d?.collaborators || []))
      .catch(() => {});
  }, [slug]);

  async function save(role) {
    setBusy(true); setError("");
    const res = await fetch(`/api/studios/${slug}/roles`, {
      method: role.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(role),
    });
    setBusy(false);
    if (!res.ok) {
      const out = await res.json().catch(() => ({}));
      // The one refusal worth explaining properly: you cannot write a role
      // containing something you cannot do yourself.
      setError(out.error === "escalation"
        ? "You can only put things in a role that you can do yourself."
        : "That didn't save.");
      return;
    }
    setEditing(null);
    await load();
  }

  // No remove() here. Deleting a role is deleting a job title, which is HR's —
  // and HR's is the one that refuses while somebody still holds it. The DELETE
  // endpoint on /roles is still there and still guarded; this screen simply
  // stopped being a second door onto it.

  if (!data) return <p className="text-sm text-slate-500">Loading roles…</p>;
  const { roles = [], areas = [], canEdit } = data;

  if (editing) {
    return (
      <RoleEditor
        role={editing} roles={roles} areas={areas} busy={busy} error={error}
        onCancel={() => { setEditing(null); setError(""); }}
        onSave={save}
      />
    );
  }

  // Every role that could still be given access, which is all of them bar the
  // wildcard — Admin already holds everything by definition.
  const grantable = roles.filter((r) => !r.wildcard);

  return (
    <section className={panel}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className={h2}>Access</h2>
          <p className={sub}>
            What each role is allowed to do. The roles themselves are the studio&apos;s job titles, named in
            Human Resources; this is where one is given its access. Assign them to people on the list above.
          </p>
        </div>
        {canEdit && (
          // Deliberately NOT "new role". Nothing is created here — a role that
          // exists is picked and given its access, which is why the editor
          // opens on a dropdown rather than an empty name field.
          <button className={btn} disabled={grantable.length === 0}
            title={grantable.length === 0 ? "Every role already has its access set. New roles are named in Human Resources." : ""}
            onClick={() => setEditing({ ...(grantable[0] || {}), permissions: [...(grantable[0]?.permissions || [])], scopes: { ...(grantable[0]?.scopes || {}) } })}>
            Create access
          </button>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">{error}</p>}

      {canEdit && people.length > 0 && <WhyPanel slug={slug} people={people} areas={areas} />}

      {roles.length === 0 ? (
        <Empty title="No roles yet" body="Studios start with Admin, Manager, Team Lead, Member and Viewer. If yours has none, name one in Human Resources → Roles." />
      ) : (
        <ul className="mt-4 divide-y divide-slate-100 dark:divide-white/5">
          {roles.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-600 text-slate-900 dark:text-white">
                  {r.name}
                  {r.wildcard && (
                    <span className="ms-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-700 text-amber-700 dark:text-amber-300">
                      Everything, including future features
                    </span>
                  )}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{r.description}</p>
              </div>
              <span className="shrink-0 text-xs text-slate-400">
                {r.wildcard ? "—"
                  : (r.permissions || []).length === 0
                    ? <span className="font-600 text-amber-700 dark:text-amber-300">No access yet</span>
                    : `${r.permissions.length} permissions`}
              </span>
              {canEdit && (
                <span className="flex shrink-0 gap-2">
                  {/* NO DELETE HERE ANY MORE. A role is a job title, and
                      deleting one is HR's — where the check that nobody still
                      holds it lives. Two delete paths with two different guards
                      is how somebody ends up pointing at a role that is gone,
                      which reads as no access at all and looks like a bug. */}
                  <button className={btnGhost} onClick={() => setEditing({ ...r })}>Edit access</button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RoleEditor({ role, roles = [], areas, busy, error, onCancel, onSave }) {
  const [draft, setDraft] = useState(() => ({
    ...role,
    permissions: [...(role.permissions || [])],
    scopes: { ...(role.scopes || {}) },
  }));
  const [open, setOpen] = useState("");

  // SWITCHING ROLE SWITCHES EVERYTHING. The permissions and scopes on screen
  // belong to the role named above them, so picking a different one loads that
  // role's own — carrying the ticks across would be this screen quietly
  // proposing to give one job another job's access.
  const pickRole = (id) => {
    const next = roles.find((r) => r.id === id);
    if (!next) return;
    setDraft({ ...next, permissions: [...(next.permissions || [])], scopes: { ...(next.scopes || {}) } });
    setOpen("");
  };

  const held = useMemo(() => new Set(draft.permissions), [draft.permissions]);
  const groups = useMemo(() => {
    const out = new Map();
    for (const a of areas) {
      if (!out.has(a.group)) out.set(a.group, []);
      out.get(a.group).push(a);
    }
    return [...out.entries()];
  }, [areas]);

  // Setting a level REWRITES that area's ladder keys and leaves its extras
  // alone — an "also allow" is not part of the ladder, so moving the ladder
  // must not silently revoke it.
  const setLevel = (area, level) => setDraft((d) => {
    const ladder = new Set(LEVEL_VERBS.full.map((v) => `${area.key}.${v}`));
    const kept = d.permissions.filter((k) => !ladder.has(k));
    return { ...d, permissions: [...kept, ...keysForLevel(area, level)] };
  });

  const toggleExtra = (area, x) => setDraft((d) => {
    const key = `${area.key}.${x.key}`;
    return {
      ...d,
      permissions: d.permissions.includes(key)
        ? d.permissions.filter((k) => k !== key)
        : [...d.permissions, key],
    };
  });

  const setScope = (area, scope) =>
    setDraft((d) => ({ ...d, scopes: { ...d.scopes, [area.key]: scope } }));

  // The read-back. Access screens are dangerous because you cannot tell what you
  // just did, so this says it in sentences as you tick.
  const summary = useMemo(() => {
    const can = [];
    const cannot = [];
    for (const a of areas) {
      const lvl = levelOf(a, held);
      const extras = (a.extra || []).filter((x) => held.has(`${a.key}.${x.key}`)).map((x) => x.label.toLowerCase());
      if (lvl === "none" && !extras.length) { cannot.push(`${a.group} — ${a.label}`); continue; }
      const words = lvl === "none" ? [] : [LADDER_LABEL[lvl].toLowerCase()];
      can.push(`${a.group} — ${a.label}: ${[...words, ...extras].join(", ")}`);
    }
    return { can, cannot };
  }, [areas, held]);

  if (draft.wildcard) {
    return (
      <section className={panel}>
        <h2 className={h2}>{draft.name}</h2>
        <p className={sub}>
          This role holds every permission, including ones added in future releases.
          That is deliberate, and it is why its list cannot be edited — only its description.
        </p>
        <div className="mt-4">
          <Field label="Description" value={draft.description || ""}
            onChange={(v) => setDraft((d) => ({ ...d, description: v }))} />
        </div>
        <div className="mt-5 flex gap-3">
          <button className={btn} disabled={busy} onClick={() => onSave(draft)}>Save</button>
          <button className={btnGhost} onClick={onCancel}>Cancel</button>
        </div>
      </section>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr,20rem]">
      <section className={panel}>
        <h2 className={h2}>Access for {draft.name || "a role"}</h2>
        <p className={sub}>Everything this job may do. Areas are collapsed — open the ones you need.</p>

        {error && <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">{error}</p>}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            {/* NOT A NAME FIELD. Roles are named in Human Resources; this picks
                which of them is being granted access, so the two screens can
                never end up describing two different "Sales Engineer"s. */}
            <label className={label}>Role</label>
            <RolePicker roles={roles.filter((r) => !r.wildcard)} value={draft.id} onPick={pickRole} />
            <p className="mt-1 text-[11px] text-slate-400">
              Named in Human Resources → Roles. Add one there and it appears here.
            </p>
          </div>
          <div>
            <Field label="Description" value={draft.description || ""} hint="Raises and works tickets."
              onChange={(v) => setDraft((d) => ({ ...d, description: v }))} />
          </div>
        </div>

        <div className="mt-6 space-y-2">
          {groups.map(([group, list]) => {
            const isOpen = open === group;
            const line = list
              .map((a) => `${a.label}: ${LADDER_LABEL[levelOf(a, held)].toLowerCase()}`)
              .join(" · ");
            return (
              <div key={group} className="rounded-geex border border-slate-200/70 dark:border-white/10">
                <button type="button" onClick={() => setOpen(isOpen ? "" : group)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-3 px-4 py-3 text-start">
                  <span className="font-600 text-slate-900 dark:text-white">{group}</span>
                  <span className="min-w-0 flex-1 truncate text-xs text-slate-500 dark:text-slate-400">{line}</span>
                  <span className="text-slate-400">{isOpen ? "−" : "+"}</span>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100 px-4 py-3 dark:border-white/5">
                    {list.map((a) => (
                      <div key={a.key} className="border-b border-slate-100 py-3 last:border-b-0 dark:border-white/5">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="min-w-[9rem] text-sm text-slate-700 dark:text-slate-200">{a.label}</span>
                          {/* Only the rungs this area HAS. An area with no delete
                              has no "full" distinct from "edit", and offering
                              both would be two buttons doing the same thing. */}
                          <span className="inline-flex rounded-full border border-slate-200 p-0.5 dark:border-white/15">
                            {levelsFor(a).map((lvl) => {
                              const active = levelOf(a, held) === lvl;
                              return (
                                <button key={lvl} type="button" aria-pressed={active}
                                  onClick={() => setLevel(a, lvl)}
                                  className={`rounded-full px-3 py-1 text-xs font-600 transition-colors ${
                                    active ? "bg-brand-700 text-white" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                                  }`}>
                                  {LADDER_LABEL[lvl]}
                                </button>
                              );
                            })}
                          </span>

                          {/* Scope only where it means something. A disabled
                              control on every row teaches people to ignore it. */}
                          {a.scoped && (
                            <select className={`${input} w-auto`} value={draft.scopes[a.key] || "own"}
                              aria-label={`${a.label} scope`}
                              onChange={(e) => setScope(a, e.target.value)}>
                              {SCOPES.map((s) => (
                                <option key={s} value={s}>
                                  {s === "own" ? "Own records" : s === "department" ? "Their department" : "Everyone"}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>

                        {(a.extra || []).length > 0 && (
                          <div className="mt-2 flex flex-wrap items-center gap-4 ps-1">
                            <span className="text-xs text-slate-400">Also allow:</span>
                            {a.extra.map((x) => (
                              <label key={x.key} className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                <input type="checkbox" className="h-4 w-4 accent-brand-600"
                                  checked={held.has(`${a.key}.${x.key}`)}
                                  onChange={() => toggleExtra(a, x)} />
                                {x.label}
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex gap-3">
          <button className={btn} disabled={busy || !draft.id} onClick={() => onSave(draft)}>
            {busy ? "Saving…" : "Save access"}
          </button>
          <button className={btnGhost} onClick={onCancel}>Cancel</button>
        </div>
      </section>

      <aside className={`${panel} h-fit lg:sticky lg:top-4`}>
        <h3 className="font-display text-sm font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {draft.name?.trim() || "This role"} can
        </h3>
        {summary.can.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">Nothing yet.</p>
        ) : (
          <ul className="mt-2 space-y-1.5 text-sm text-slate-700 dark:text-slate-200">
            {summary.can.map((line) => <li key={line}>{line}</li>)}
          </ul>
        )}
        <p className="mt-5 text-xs text-slate-400">
          Cannot touch {summary.cannot.length} other area{summary.cannot.length === 1 ? "" : "s"}.
        </p>
      </aside>
    </div>
  );
}

// A SEARCH-AND-SELECT over the studio's roles, in place of the name field that
// used to be here.
//
// Searchable rather than a plain <select> because the list grows with the
// studio: a company with thirty job titles cannot find one in a native dropdown
// without scrolling past twenty-nine, and this is the control that decides
// WHICH job is about to have its permissions rewritten — picking the wrong one
// by a slip of the scroll wheel is the expensive mistake on this screen.
//
// A role that has no access yet is marked, because those are the ones somebody
// arriving here is usually looking for.
function RolePicker({ roles, value, onPick }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const box = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  const chosen = roles.find((r) => r.id === value);
  const q = query.trim().toLowerCase();
  const shown = q ? roles.filter((r) => `${r.name} ${r.description || ""}`.toLowerCase().includes(q)) : roles;

  return (
    <div ref={box} className="relative">
      <button type="button" aria-haspopup="listbox" aria-expanded={open}
        onClick={() => { setOpen((v) => !v); setQuery(""); }}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-start text-sm text-slate-900 transition-colors hover:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-[#191921] dark:text-white">
        <span className="truncate">{chosen?.name || "Pick a role…"}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-white/15 dark:bg-[#20202c]">
          <input autoFocus className={`${input} mb-1`} aria-label="Search roles"
            value={query} onChange={(e) => setQuery(e.target.value)} />
          <ul role="listbox" className="max-h-60 overflow-auto">
            {shown.length === 0 && (
              <li className="px-3 py-2 text-sm text-slate-400">Nothing matches. Roles are named in Human Resources.</li>
            )}
            {shown.map((r) => (
              <li key={r.id}>
                <button type="button" role="option" aria-selected={r.id === value}
                  onClick={() => onPick(r.id)}
                  className={`flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-start hover:bg-slate-50 dark:hover:bg-white/5 ${
                    r.id === value ? "bg-brand-500/10" : ""}`}>
                  <span className="flex items-center gap-2 text-sm font-600 text-slate-800 dark:text-slate-100">
                    {r.name}
                    {(r.permissions || []).length === 0 && (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-700 text-amber-700 dark:text-amber-300">
                        no access yet
                      </span>
                    )}
                  </span>
                  {r.description && <span className="truncate text-xs text-slate-500 dark:text-slate-400">{r.description}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// "Why can't Sara lock a quotation?" — the question people actually ask.
//
// It exists because the answer is otherwise unknowable without reading the
// database, and because a permission system nobody can interrogate is one
// people work around instead of using.
function WhyPanel({ slug, people, areas }) {
  const [who, setWho] = useState("");
  const [key, setKey] = useState("");
  const [answer, setAnswer] = useState(null);
  const [busy, setBusy] = useState(false);

  // Every action, named the way somebody would say it rather than as a key.
  const actions = useMemo(() => areas.flatMap((a) => [
    ...a.verbs.map((v) => ({ key: `${a.key}.${v}`, label: `${a.group} — ${a.label}: ${v}` })),
    ...(a.extra || []).map((x) => ({ key: `${a.key}.${x.key}`, label: `${a.group} — ${a.label}: ${x.label.toLowerCase()}` })),
  ]), [areas]);

  async function ask() {
    if (!who || !key) return;
    setBusy(true); setAnswer(null);
    const res = await fetch(`/api/studios/${slug}/access-check`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collaboratorId: who, permission: key }),
    });
    setBusy(false);
    setAnswer(res.ok ? await res.json() : { allowed: false, reason: "Couldn't check that." });
  }

  return (
    <div className="mt-5 rounded-geex border border-slate-200/70 p-4 dark:border-white/10">
      <p className="text-sm font-600 text-slate-700 dark:text-slate-200">Check what someone can do</p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <select className={`${input} w-auto`} value={who} aria-label="Person"
          onChange={(e) => { setWho(e.target.value); setAnswer(null); }}>
          <option value="">Who…</option>
          {people.map((p) => (<option key={p.id} value={p.id}>{p.alias || "Unnamed"}</option>))}
        </select>
        <select className={`${input} w-auto max-w-full`} value={key} aria-label="Action"
          onChange={(e) => { setKey(e.target.value); setAnswer(null); }}>
          <option value="">Do what…</option>
          {actions.map((a) => (<option key={a.key} value={a.key}>{a.label}</option>))}
        </select>
        <button className={btnGhost} disabled={busy || !who || !key} onClick={ask}>
          {busy ? "Checking…" : "Check"}
        </button>
      </div>
      {answer && (
        <p className={`mt-3 text-sm ${answer.allowed ? "text-emerald-700 dark:text-emerald-300" : "text-slate-600 dark:text-slate-300"}`}>
          <span className="font-700">{answer.allowed ? "Allowed. " : "Denied. "}</span>
          {answer.reason}
        </p>
      )}
    </div>
  );
}
