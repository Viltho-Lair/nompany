"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { panel, h2, sub, input, label, btn, btnGhost, Empty } from "@/components/studio2/ui";
import { LEVEL_VERBS, SCOPES, levelsFor, levelOf, keysForLevel } from "@/lib/permissions";

// THE ROLE EDITOR.
//
// Defining a role is rare and careful; assigning one is frequent and quick.
// They are opposite jobs, so they are separate screens — this is the rare one.
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

  async function remove(id) {
    setBusy(true);
    const res = await fetch(`/api/studios/${slug}/roles`, {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
    });
    setBusy(false);
    if (!res.ok) { setError("That role can't be deleted."); return; }
    await load();
  }

  if (!data) return <p className="text-sm text-slate-500">Loading roles…</p>;
  const { roles = [], areas = [], canEdit } = data;

  if (editing) {
    return (
      <RoleEditor
        role={editing} areas={areas} busy={busy} error={error}
        onCancel={() => { setEditing(null); setError(""); }}
        onSave={save}
      />
    );
  }

  return (
    <section className={panel}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className={h2}>Roles</h2>
          <p className={sub}>What a job is allowed to do. Assign them to people on the list above.</p>
        </div>
        {canEdit && (
          <button className={btn} onClick={() => setEditing({ name: "", description: "", permissions: [], scopes: {} })}>
            New role
          </button>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">{error}</p>}

      {canEdit && people.length > 0 && <WhyPanel slug={slug} people={people} areas={areas} />}
      <MigratePanel slug={slug} onDone={load} />

      {roles.length === 0 ? (
        <Empty title="No roles yet" body="Studios start with a few; if yours has none, create one." />
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
                {r.wildcard ? "—" : `${(r.permissions || []).length} permissions`}
              </span>
              {canEdit && (
                <span className="flex shrink-0 gap-2">
                  <button className={btnGhost} onClick={() => setEditing({ ...r })}>Edit</button>
                  {!r.wildcard && (
                    <button className={btnGhost} disabled={busy} onClick={() => remove(r.id)}>Delete</button>
                  )}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RoleEditor({ role, areas, busy, error, onCancel, onSave }) {
  const [draft, setDraft] = useState(() => ({
    ...role,
    permissions: [...(role.permissions || [])],
    scopes: { ...(role.scopes || {}) },
  }));
  const [open, setOpen] = useState("");

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
          <label className={label}>Description</label>
          <input className={input} value={draft.description || ""}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} />
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
        <h2 className={h2}>{role.id ? `Edit ${role.name}` : "New role"}</h2>
        <p className={sub}>Everything this job may do. Areas are collapsed — open the ones you need.</p>

        {error && <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">{error}</p>}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Name</label>
            <input className={input} value={draft.name || ""} placeholder="Sales Engineer"
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
          </div>
          <div>
            <label className={label}>Description</label>
            <input className={input} value={draft.description || ""} placeholder="Raises and works tickets."
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} />
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
          <button className={btn} disabled={busy || !draft.name?.trim()} onClick={() => onSave(draft)}>
            {busy ? "Saving…" : "Save role"}
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

// Carrying a studio off the old section grants and onto roles.
//
// Shown to the owner only, and only while there is anything to carry — once
// everybody holds a role this disappears rather than sitting there inviting a
// second run.
function MigratePanel({ slug, onDone }) {
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");

  useEffect(() => {
    // A 403 here just means "not the owner", which is not an error worth
    // showing — the panel simply does not appear.
    fetch(`/api/studios/${slug}/migrate-access`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setPlan)
      .catch(() => {});
  }, [slug]);

  if (!plan) return null;
  const todo = (plan.plan || []).filter((r) => r.action === "assign" || r.action === "create");
  if (!todo.length && !done) return null;

  async function run() {
    setBusy(true);
    const res = await fetch(`/api/studios/${slug}/migrate-access`, { method: "POST" });
    setBusy(false);
    if (!res.ok) { setDone("That didn't work."); return; }
    const out = await res.json();
    setDone(`Done — ${out.assigned} people given a role, ${out.created} role${out.created === 1 ? "" : "s"} created.`);
    setPlan(null);
    onDone?.();
  }

  return (
    <div className="mt-5 rounded-geex border border-amber-500/30 bg-amber-500/5 p-4">
      <p className="text-sm font-600 text-slate-800 dark:text-slate-100">Move this studio onto roles</p>
      {done ? (
        <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">{done}</p>
      ) : (
        <>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {todo.length} {todo.length === 1 ? "person is" : "people are"} still on the old
            section grants. This gives each of them a role holding exactly what they can do
            today — nobody gains anything.
          </p>
          <ul className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
            {todo.slice(0, 8).map((r) => (
              <li key={r.id}>
                <span className="font-600">{r.alias || "Unnamed"}</span>
                {r.action === "assign" ? ` → ${r.roleName}` : ` → new role “${r.roleName}”`}
              </li>
            ))}
            {todo.length > 8 && <li className="text-slate-400">and {todo.length - 8} more…</li>}
          </ul>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            The old grants are left in place. They stop being consulted the moment somebody
            holds a role, so clearing a role puts that person back exactly as they were.
          </p>
          <button className={`${btn} mt-3`} disabled={busy} onClick={run}>
            {busy ? "Moving…" : `Move ${todo.length} ${todo.length === 1 ? "person" : "people"}`}
          </button>
        </>
      )}
    </div>
  );
}
