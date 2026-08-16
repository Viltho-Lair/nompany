"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import {
  panel, h2, sub, input, microLabel, label, btn, btnGhost, th, stripeOn, stripeOff,
  Dialog, Toolbar, Empty, StatTile,
} from "@/components/studio2/ui";
import { initialsOf } from "@/lib/initials";

const btnDanger = "rounded-full border border-rose-200 px-4 py-2 font-display text-sm font-600 text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-60 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10";
const td = "py-3 pe-3 align-middle";

const LEAVE_TONE = {
  Pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  Approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  Declined: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  Cancelled: "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400",
};

// Dates are dd/mm/yyyy everywhere in this product.
const fmt = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB") : "—");

// HUMAN RESOURCES. The employee record IS the collaborator row, so this screen
// edits the person who is already in the studio rather than creating a parallel
// people list — someone's department exists only here, inside this studio.
//
// That is the one place this differs from the Old System, which creates an
// employee and mints them a login. Here a person arrives by JOINING the studio
// and an admin approving them; HR then describes who they are, rather than
// bringing them into being. So there is no "add employee" — there is nobody to
// add who is not already here.
//
// `view` is the ACTIVE SUB-SECTION key. HR has exactly one sub-section —
// Employees — so the parent renders the dashboard and hr-employees renders the
// tabbed screen (People / Departments / Positions / Certifications / Leave),
// which are tabs of one screen rather than sub-sections of their own.
export default function StudioHr({ slug, view = "hr" }) {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("people");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/hr`, { cache: "no-store" });
    if (!res.ok) { setError("You don't have access to Human Resources in this studio."); return; }
    setData(await res.json());
  }, [slug]);
  useEffect(() => { load(); }, [load]);
  // HR records change from more than one desk — stay current.
  useLiveUpdates(slug, "hr", load);

  const send = useCallback(async (kind, method, payload) => {
    setError(""); setBusy(true);
    const res = await fetch(`/api/studios/${slug}/hr/${kind}`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(
        out.error === "read-only" ? "You have view-only access to Human Resources."
        : out.error === "duplicate" ? "That name is already in use."
        : out.error === "in-use" ? inUseMessage(out)
        : out.error === "overlap" ? `That overlaps leave already booked ${fmt(out.from)} – ${fmt(out.to)}.`
        : out.error === "already-decided" ? `That request was already ${String(out.status || "").toLowerCase()}.`
        : out.error === "range" ? "The end date can't be before the start date."
        : out.error === "forbidden" ? "You can't do that."
        : "That didn't save."
      );
      return false;
    }
    await load();
    return true;
  }, [slug, load]);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">Loading Human Resources…</p>;

  const { canManage: canManageParent, departments, positions, certifications, employees, vacations, expiring, headcount, vocabulary, me, nav } = data;
  // MANAGE IS ASKED OF THE SCREEN BEING SHOWN. `view` is the section key, and
  // the map is keyed the same way, so a sub-section grant answers for its own
  // screen and the parent's answer no longer stands in for all of them.
  const canManage = data.manage?.[view] ?? canManageParent;

  const pendingLeave = vacations.filter((v) => v.status === "Pending").length;
  const banner = error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>;

  if (view === "hr") {
    return (
      <div className="space-y-6">
        {banner}
        <HrDashboard slug={slug} nav={nav} employees={employees} departments={departments} positions={positions}
          certifications={certifications} headcount={headcount} expiring={expiring} pendingLeave={pendingLeave}
          windowDays={vocabulary.expiryWindowDays} />
      </div>
    );
  }

  const tabs = [
    ["people", `People (${employees.length})`],
    ["departments", `Departments (${departments.length})`],
    ["positions", `Positions (${positions.length})`],
    ["certifications", `Certifications (${certifications.length})`],
    ["leave", `Leave${pendingLeave ? ` (${pendingLeave})` : ""}`],
  ];

  return (
    <div className="space-y-6">
      {banner}

      <Overview headcount={headcount} departments={departments} expiring={expiring} windowDays={vocabulary.expiryWindowDays} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-full bg-slate-100 p-1 dark:bg-white/5">
          {tabs.map(([k, text]) => (
            <button key={k} type="button" onClick={() => setTab(k)}
              className={`rounded-full px-4 py-2 text-sm font-600 transition-colors ${tab === k ? "bg-white text-brand-950 shadow-sm dark:bg-[#20202c] dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>
              {text}
            </button>
          ))}
        </div>
        {!canManage && <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-600 text-slate-500 dark:bg-white/5 dark:text-slate-400">View only</span>}
      </div>

      {tab === "people" && (
        <People employees={employees} departments={departments} positions={positions}
          certifications={certifications} canManage={canManage} busy={busy}
          onSave={(collaboratorId, patch) => send("employees", "PUT", { collaboratorId, patch })} />
      )}
      {tab === "departments" && (
        <Departments rows={departments} employees={employees} canManage={canManage} busy={busy} send={send} />
      )}
      {tab === "positions" && (
        <Positions rows={positions} departments={departments} employees={employees} canManage={canManage} busy={busy} send={send} />
      )}
      {tab === "certifications" && (
        <Certifications rows={certifications} employees={employees} canManage={canManage} busy={busy} send={send} />
      )}
      {tab === "leave" && (
        <Leave rows={vacations} employees={employees} types={vocabulary.leaveTypes}
          canManage={canManage} meId={me.collaboratorId} busy={busy} send={send} />
      )}
    </div>
  );
}

function inUseMessage(out) {
  const bits = [];
  if (out.people) bits.push(`${out.people} ${out.people === 1 ? "person" : "people"}`);
  if (out.positions) bits.push(`${out.positions} ${out.positions === 1 ? "position" : "positions"}`);
  return `Still in use by ${bits.join(" and ")} — reassign them first.`;
}

// ---- dashboard -------------------------------------------------------------
function HrDashboard({ slug, nav, employees, departments, positions, certifications, headcount, expiring, pendingLeave, windowDays }) {
  const to = nav?.["hr-employees"] ? `/${slug}/hr-employees` : "";
  // Whose documents have already lapsed, rather than merely approaching — that
  // is the difference between a reminder and a problem.
  const lapsed = expiring.filter((e) => e.daysLeft < 0).length;

  return (
    <>
      <section className={panel}>
        <h2 className={h2}>Human Resources</h2>
        <p className={sub}>Who is here, what they do, and what needs renewing.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatTile label="People" value={headcount.total} href={to} />
          <StatTile label="Departments" value={departments.length} href={to} />
          <StatTile label="Positions" value={positions.length} href={to} />
          <StatTile label="Certifications" value={certifications.length} href={to} />
          <StatTile label="Unassigned" value={headcount.unassigned}
            tone={headcount.unassigned > 0 ? "text-amber-700 dark:text-amber-300" : ""} href={to} />
          <StatTile label="Leave pending" value={pendingLeave}
            tone={pendingLeave > 0 ? "text-amber-700 dark:text-amber-300" : ""} href={to} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={panel}>
          <p className={microLabel}>People by department</p>
          {departments.length === 0 ? (
            <p className="mt-2 text-sm text-slate-400">No departments yet.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {departments.map((d) => {
                const n = headcount.byDepartment[d.id] || 0;
                const share = headcount.total ? Math.round((n / headcount.total) * 100) : 0;
                return (
                  <li key={d.id} className="flex items-center gap-3 text-sm">
                    <span className="w-32 shrink-0 truncate text-slate-600 dark:text-slate-300" title={d.name}>{d.name}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                      <span className="block h-full rounded-full bg-brand-500" style={{ width: `${share}%` }} />
                    </span>
                    <span className="w-8 shrink-0 text-end font-600 tabular-nums text-slate-700 dark:text-slate-200">{n}</span>
                  </li>
                );
              })}
              {headcount.unassigned > 0 && (
                <li className="flex items-center gap-3 text-sm">
                  <span className="w-32 shrink-0 truncate text-amber-700 dark:text-amber-300">Unassigned</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                    <span className="block h-full rounded-full bg-amber-500"
                      style={{ width: `${headcount.total ? Math.round((headcount.unassigned / headcount.total) * 100) : 0}%` }} />
                  </span>
                  <span className="w-8 shrink-0 text-end font-600 tabular-nums text-amber-700 dark:text-amber-300">{headcount.unassigned}</span>
                </li>
              )}
            </ul>
          )}
        </section>

        <section className={panel}>
          <p className={microLabel}>Documents</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Expiring within {windowDays} days, or already lapsed.</p>
          {expiring.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">Nothing expiring — all clear.</p>
          ) : (
            <>
              {lapsed > 0 && (
                <p className="mt-3 text-sm font-600 text-rose-600 dark:text-rose-400">
                  {lapsed} already expired.
                </p>
              )}
              <ul className="mt-2 divide-y divide-slate-100 dark:divide-white/5">
                {expiring.slice(0, 8).map((e) => (
                  <li key={`${e.collaboratorId}-${e.kind}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0 truncate text-slate-700 dark:text-slate-200">{e.alias} <span className="text-slate-400">· {e.kind}</span></span>
                    <span className={`shrink-0 text-xs font-600 ${e.daysLeft < 0 ? "text-rose-600 dark:text-rose-400" : "text-amber-700 dark:text-amber-300"}`}>
                      {e.daysLeft < 0 ? `${Math.abs(e.daysLeft)}d overdue` : `${e.daysLeft}d`}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </>
  );
}

// ---- overview --------------------------------------------------------------
function Overview({ headcount, departments, expiring, windowDays }) {
  return (
    <section className={panel}>
      <div className="flex flex-wrap gap-8">
        <div>
          <p className="font-display text-3xl font-800 text-slate-900 dark:text-white">{headcount.total}</p>
          <p className="text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">People</p>
        </div>
        <div>
          <p className="font-display text-3xl font-800 text-slate-900 dark:text-white">{departments.length}</p>
          <p className="text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Departments</p>
        </div>
        {headcount.unassigned > 0 && (
          <div>
            <p className="font-display text-3xl font-800 text-amber-600 dark:text-amber-400">{headcount.unassigned}</p>
            <p className="text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Unassigned</p>
          </div>
        )}
      </div>

      {departments.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {departments.map((d) => (
            <span key={d.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-600 text-slate-600 dark:bg-white/5 dark:text-slate-300">
              {d.name} · {headcount.byDepartment[d.id] || 0}
            </span>
          ))}
        </div>
      )}

      {expiring.length > 0 && (
        <div className="mt-5 rounded-xl border border-amber-300/60 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
          <p className="font-display text-sm font-700 text-amber-800 dark:text-amber-200">
            Documents expiring within {windowDays} days
          </p>
          <ul className="mt-2 space-y-1 text-sm text-amber-800 dark:text-amber-200">
            {expiring.map((e) => (
              <li key={`${e.collaboratorId}-${e.kind}`}>
                {e.alias} — {e.kind} {e.daysLeft < 0 ? `expired ${Math.abs(e.daysLeft)} days ago` : `in ${e.daysLeft} days`} ({fmt(e.date)})
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

// ---- people ----------------------------------------------------------------
function People({ employees, departments, positions, certifications, canManage, busy, onSave }) {
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState("");
  const closeEditing = useCallback(() => setEditing(null), []);
  const certName = useMemo(() => Object.fromEntries(certifications.map((c) => [c.id, c.name])), [certifications]);

  // Keep the open editor on the freshly loaded row after a save.
  useEffect(() => {
    setEditing((cur) => (cur ? employees.find((e) => e.id === cur.id) || null : null));
  }, [employees]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) =>
      `${e.alias} ${e.employeeCode || ""} ${e.departmentName || ""} ${e.positionTitle || ""} ${e.mobile || ""}`.toLowerCase().includes(q));
  }, [employees, query]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <input type="search" className={`${input} sm:max-w-xs`} placeholder="Search name, code, department or position…"
          value={query} onChange={(e) => setQuery(e.target.value)} />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {filtered.length} of {employees.length}. Identity numbers are encrypted at rest.
        </p>
      </div>

      {editing && (
        <Dialog title={editing.alias} description="Employment details apply inside this studio only." onClose={closeEditing} width="max-w-[820px]">
          <EmployeeEditor person={editing} departments={departments} positions={positions}
            certifications={certifications} busy={busy} onCancel={closeEditing}
            onSave={async (patch) => { if (await onSave(editing.id, patch)) setEditing(null); }} />
        </Dialog>
      )}

      {employees.length === 0 ? (
        <Empty title="Nobody here yet" body="People arrive by joining the studio and being approved. HR describes who they are once they're in." />
      ) : filtered.length === 0 ? (
        <Empty title="Nobody matches" body="No one here matches that search." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((e) => {
            const certs = (e.certificationIds || []).map((id) => certName[id]).filter(Boolean);
            // Somebody with no department has not been placed yet.
            const unassigned = !e.departmentId;
            return (
              // Only the stripe COLOUR here, not the shared stripe's tint: the
              // panel already paints a background, and two same-specificity
              // background utilities would be settled by stylesheet order rather
              // than by intent.
              <section key={e.id} className={`${panel} border-s-4 ${unassigned ? "border-s-amber-400 dark:border-s-amber-500/70" : "border-s-transparent"}`}>
                <div className="flex items-start gap-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-500/10 font-display text-lg font-800 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                    {initialsOf(e.alias)}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <h3 className="font-display text-base font-700 text-slate-900 dark:text-white">{e.alias}</h3>
                      {e.role === "owner" && <span className="rounded-full bg-brand-700 px-2 py-0.5 text-[11px] font-600 text-white">owner</span>}
                      {e.isAdmin && <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-[11px] font-600 text-brand-700 dark:text-brand-300">admin</span>}
                    </div>
                    <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
                      {[e.employeeCode, e.positionTitle, e.departmentName].filter(Boolean).join("  ·  ") || <span className="text-amber-700 dark:text-amber-300">Not placed yet</span>}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Mobile: {e.mobile || "—"} · Joined: {fmt(e.dateOfJoin)}
                    </p>
                    {certs.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {certs.map((name) => (
                          <span key={name} className="rounded-full bg-brand-500/10 px-2 py-0.5 text-[11px] font-600 text-brand-700 dark:text-brand-300">{name}</span>
                        ))}
                      </div>
                    )}
                    <div className="mt-2"><Documents person={e} canManage={canManage} /></div>
                  </div>

                  {canManage && (
                    <button className={btnGhost} onClick={() => setEditing(e)}>Edit</button>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

// A view-only viewer sees that a document is on file and when it expires —
// never the number. That's the whole point of encrypting it at rest.
function Documents({ person, canManage }) {
  const items = [
    { kind: "ID", has: person.hasId, number: person.idNumber, expiry: person.idExpiry },
    { kind: "Passport", has: person.hasPassport, number: person.passportNumber, expiry: person.passportExpiry },
  ].filter((d) => d.has || d.expiry);

  if (items.length === 0) return <span className="text-xs text-slate-400">No documents on file</span>;
  return (
    <span className="flex flex-col gap-0.5">
      {items.map((d) => (
        <span key={d.kind} className="text-xs text-slate-600 dark:text-slate-300">
          <span className="font-600">{d.kind}</span>{" "}
          {canManage && d.number ? <span className="font-mono">{d.number}</span> : d.has ? "on file" : ""}
          {d.expiry && <span className="text-slate-400"> · exp {fmt(d.expiry)}</span>}
        </span>
      ))}
    </span>
  );
}

function EmployeeEditor({ person, departments, positions, certifications, busy, onCancel, onSave }) {
  const [form, setForm] = useState({
    departmentId: person.departmentId || "",
    positionId: person.positionId || "",
    employeeCode: person.employeeCode || "",
    dateOfJoin: person.dateOfJoin || "",
    mobile: person.mobile || "",
    idNumber: person.idNumber || "",
    idExpiry: person.idExpiry || "",
    passportNumber: person.passportNumber || "",
    passportExpiry: person.passportExpiry || "",
    certificationIds: person.certificationIds || [],
  });
  // A stored identity number is READ-ONLY until it is deliberately unlocked, so
  // editing somebody's phone number can never fat-finger over their passport.
  const [editId, setEditId] = useState(false);
  const [editPassport, setEditPassport] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Choosing a position implies its department, so the two can never disagree.
  const forDepartment = form.departmentId
    ? positions.filter((p) => !p.departmentId || p.departmentId === form.departmentId)
    : positions;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className={label}>Department</label>
          <select className={input} value={form.departmentId}
            onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value, positionId: "" }))}>
            <option value="">Unassigned</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Position</label>
          <select className={input} value={form.positionId} onChange={set("positionId")}>
            <option value="">—</option>
            {forDepartment.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Employee code</label>
          <input className={input} value={form.employeeCode} onChange={set("employeeCode")} placeholder="e.g. EMP-014" />
        </div>
        <div>
          <label className={label}>Date of joining</label>
          <input type="date" className={input} value={form.dateOfJoin} onChange={set("dateOfJoin")} />
        </div>
        <div>
          <label className={label}>Mobile</label>
          <input className={input} value={form.mobile} onChange={set("mobile")} />
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200/70 p-4 dark:border-white/10">
        <p className="font-display text-sm font-700 text-slate-900 dark:text-white">Identity documents</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Numbers are encrypted before they&apos;re stored, and only people who can manage HR can read them back.
          A stored number stays locked until you unlock it.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <label className="text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">ID number</label>
              <button type="button" onClick={() => setEditId((v) => !v)}
                className="rounded-md px-2 py-0.5 text-xs font-600 text-brand-700 hover:bg-brand-500/10 dark:text-brand-300">
                {editId ? "lock" : "edit"}
              </button>
            </div>
            <input className={`${input} disabled:cursor-not-allowed disabled:opacity-60`} value={form.idNumber} disabled={!editId} onChange={set("idNumber")} />
            <label className={`${microLabel} mt-2`}>ID expiry</label>
            <input type="date" className={input} value={form.idExpiry} onChange={set("idExpiry")} />
          </div>
          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <label className="text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">Passport number</label>
              <button type="button" onClick={() => setEditPassport((v) => !v)}
                className="rounded-md px-2 py-0.5 text-xs font-600 text-brand-700 hover:bg-brand-500/10 dark:text-brand-300">
                {editPassport ? "lock" : "edit"}
              </button>
            </div>
            <input className={`${input} disabled:cursor-not-allowed disabled:opacity-60`} value={form.passportNumber} disabled={!editPassport} onChange={set("passportNumber")} />
            <label className={`${microLabel} mt-2`}>Passport expiry</label>
            <input type="date" className={input} value={form.passportExpiry} onChange={set("passportExpiry")} />
          </div>
        </div>
      </div>

      {certifications.length > 0 && (
        <div className="mt-6">
          <label className={label}>Certifications held</label>
          <div className="flex flex-wrap gap-2">
            {certifications.map((c) => {
              const on = form.certificationIds.includes(c.id);
              return (
                <button key={c.id} type="button"
                  onClick={() => setForm((f) => ({
                    ...f,
                    certificationIds: on ? f.certificationIds.filter((x) => x !== c.id) : [...f.certificationIds, c.id],
                  }))}
                  className={`rounded-full px-3 py-1.5 text-xs font-600 transition-colors ${on
                    ? "bg-brand-600 text-white"
                    : "border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5"}`}>
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <button className={btn} disabled={busy} onClick={() => onSave(form)}>{busy ? "Saving…" : "Save"}</button>
        <button className={btnGhost} onClick={onCancel}>Cancel</button>
      </div>
    </>
  );
}

// ---- departments -----------------------------------------------------------
function Departments({ rows, employees, canManage, busy, send }) {
  const [form, setForm] = useState(null);
  const closeForm = useCallback(() => setForm(null), []);
  const count = (id) => employees.filter((e) => e.departmentId === id).length;

  return (
    <>
      <Toolbar canManage={canManage} label="Add department" onAdd={() => setForm({ row: null })} />

      {form && (
        <Dialog title={form.row ? `Edit ${form.row.name}` : "New department"} onClose={closeForm} width="max-w-[560px]">
          <SimpleForm busy={busy} onCancel={closeForm}
            fields={[
              { key: "name", label: "Name", required: true, value: form.row?.name || "" },
              { key: "code", label: "Code", value: form.row?.code || "", placeholder: "auto" },
              { key: "description", label: "Description", area: true, value: form.row?.description || "" },
            ]}
            onSave={async (values) => {
              if (await send("departments", form.row ? "PUT" : "POST", form.row ? { ...values, id: form.row.id } : values)) setForm(null);
            }} />
        </Dialog>
      )}

      {rows.length === 0 ? <Empty title="No departments yet" body="Departments group your people and give positions somewhere to belong." /> : (
        <section className={panel}>
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {rows.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-600 text-slate-900 dark:text-white">{d.name}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-500 dark:bg-white/5 dark:text-slate-400">{d.code}</span>
                    <span className="text-xs text-slate-400">{count(d.id)} {count(d.id) === 1 ? "person" : "people"}</span>
                  </div>
                  {d.description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{d.description}</p>}
                </div>
                {canManage && (
                  <div className="flex gap-2">
                    <button className={btnGhost} onClick={() => setForm({ row: d })}>Edit</button>
                    <button className={btnDanger} disabled={busy} onClick={() => send("departments", "DELETE", { id: d.id })}>Delete</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

// ---- positions -------------------------------------------------------------
function Positions({ rows, departments, employees, canManage, busy, send }) {
  const [form, setForm] = useState(null);
  const closeForm = useCallback(() => setForm(null), []);
  const count = (id) => employees.filter((e) => e.positionId === id).length;

  return (
    <>
      <Toolbar canManage={canManage} label="Add position" onAdd={() => setForm({ row: null })} />

      {form && (
        <Dialog title={form.row ? `Edit ${form.row.title}` : "New position"} onClose={closeForm} width="max-w-[560px]">
          <SimpleForm busy={busy} onCancel={closeForm}
            fields={[
              { key: "title", label: "Title", required: true, value: form.row?.title || "" },
              { key: "departmentId", label: "Department", value: form.row?.departmentId || "",
                options: [{ value: "", text: "—" }, ...departments.map((d) => ({ value: d.id, text: d.name }))] },
              { key: "headcountTarget", label: "Target headcount", type: "number", value: form.row?.headcountTarget || "" },
              { key: "description", label: "Description", area: true, value: form.row?.description || "" },
            ]}
            onSave={async (values) => {
              if (await send("positions", form.row ? "PUT" : "POST", form.row ? { ...values, id: form.row.id } : values)) setForm(null);
            }} />
        </Dialog>
      )}

      {rows.length === 0 ? <Empty title="No positions yet" body="Positions are the roles people hold — they can belong to a department." /> : (
        <section className={panel}>
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {rows.map((p) => {
              const held = count(p.id);
              // A role with a target it has not reached is a vacancy.
              const short = p.headcountTarget > 0 && held < p.headcountTarget;
              return (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-600 text-slate-900 dark:text-white">{p.title}</span>
                      {p.departmentName && <span className="text-xs text-slate-500 dark:text-slate-400">{p.departmentName}</span>}
                      <span className={`text-xs ${short ? "font-600 text-amber-700 dark:text-amber-300" : "text-slate-400"}`}>
                        {held} held{p.headcountTarget ? ` of ${p.headcountTarget}` : ""}
                      </span>
                    </div>
                    {p.description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{p.description}</p>}
                  </div>
                  {canManage && (
                    <div className="flex gap-2">
                      <button className={btnGhost} onClick={() => setForm({ row: p })}>Edit</button>
                      <button className={btnDanger} disabled={busy} onClick={() => send("positions", "DELETE", { id: p.id })}>Delete</button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}

// ---- certifications --------------------------------------------------------
function Certifications({ rows, employees, canManage, busy, send }) {
  const [form, setForm] = useState(null);
  const closeForm = useCallback(() => setForm(null), []);
  const held = (id) => employees.filter((e) => (e.certificationIds || []).includes(id)).length;

  return (
    <>
      <Toolbar canManage={canManage} label="Add certification" onAdd={() => setForm({ row: null })} />

      {form && (
        <Dialog title={form.row ? `Edit ${form.row.name}` : "New certification"} onClose={closeForm} width="max-w-[560px]">
          <SimpleForm busy={busy} onCancel={closeForm}
            fields={[
              { key: "name", label: "Name", required: true, value: form.row?.name || "" },
              { key: "issuer", label: "Issuer", value: form.row?.issuer || "" },
              { key: "validityMonths", label: "Valid for (months)", type: "number", value: form.row?.validityMonths || "" },
              { key: "notes", label: "Notes", area: true, value: form.row?.notes || "" },
            ]}
            onSave={async (values) => {
              if (await send("certifications", form.row ? "PUT" : "POST", form.row ? { ...values, id: form.row.id } : values)) setForm(null);
            }} />
        </Dialog>
      )}

      {rows.length === 0 ? <Empty title="No certifications yet" body="Define the qualifications your people hold, then tick them off on each person." /> : (
        <section className={panel}>
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {rows.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-600 text-slate-900 dark:text-white">{c.name}</span>
                    {c.issuer && <span className="text-xs text-slate-500 dark:text-slate-400">{c.issuer}</span>}
                    {c.validityMonths > 0 && <span className="text-xs text-slate-400">valid {c.validityMonths} months</span>}
                    <span className="text-xs text-slate-400">· {held(c.id)} held</span>
                  </div>
                  {c.notes && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{c.notes}</p>}
                </div>
                {canManage && (
                  <div className="flex gap-2">
                    <button className={btnGhost} onClick={() => setForm({ row: c })}>Edit</button>
                    <button className={btnDanger} disabled={busy} onClick={() => send("certifications", "DELETE", { id: c.id })}>Delete</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

// ---- leave -----------------------------------------------------------------
function Leave({ rows, employees, types, canManage, meId, busy, send }) {
  const [asking, setAsking] = useState(false);
  const closeAsk = useCallback(() => setAsking(false), []);

  return (
    <>
      <div className="flex justify-end">
        <button className={btn} onClick={() => setAsking(true)}>Request leave</button>
      </div>

      {asking && (
        <Dialog title="Request leave" description={canManage ? "Book it for yourself, or for somebody you manage." : "It goes to whoever manages HR for approval."}
          onClose={closeAsk} width="max-w-[620px]">
          <LeaveForm types={types} employees={employees} canManage={canManage} meId={meId} busy={busy}
            onCancel={closeAsk}
            onSave={async (form) => { if (await send("vacations", "POST", form)) setAsking(false); }} />
        </Dialog>
      )}

      {rows.length === 0 ? <Empty title="No leave booked" body={canManage ? "Requests from your people arrive here for approval." : "Your own leave requests appear here."} /> : (
        <section className={panel}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10">
                  {["Person", "Type", "From", "To", "Days", "Status"].map((head) => (
                    <th key={head} className={`${th} ps-2 text-start`}>{head}</th>
                  ))}
                  <th className={`${th} text-end`} />
                </tr>
              </thead>
              <tbody>
                {rows.map((v) => (
                  // A request nobody has decided on yet is the one needing action.
                  <tr key={v.id} className={`border-s-4 border-b border-slate-100 last:border-b-0 dark:border-white/5 ${v.status === "Pending" ? stripeOn : stripeOff}`}>
                    <td className={`${td} ps-2 font-600 text-slate-900 dark:text-white`}>{v.alias}</td>
                    <td className={`${td} ps-2 text-slate-600 dark:text-slate-300`}>{v.type}</td>
                    <td className={`${td} ps-2 text-slate-600 dark:text-slate-300`}>{fmt(v.from)}</td>
                    <td className={`${td} ps-2 text-slate-600 dark:text-slate-300`}>{fmt(v.to)}</td>
                    <td className={`${td} ps-2 tabular-nums text-slate-600 dark:text-slate-300`}>{v.days}</td>
                    <td className={`${td} ps-2`}>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-600 ${LEAVE_TONE[v.status]}`}>{v.status}</span>
                    </td>
                    <td className={`${td} text-end`}>
                      {v.status === "Pending" && (
                        <span className="flex flex-wrap justify-end gap-2">
                          {canManage && (
                            <>
                              <button className={btnGhost} disabled={busy} onClick={() => send("vacations", "PUT", { id: v.id, status: "Approved" })}>Approve</button>
                              <button className={btnGhost} disabled={busy} onClick={() => send("vacations", "PUT", { id: v.id, status: "Declined" })}>Decline</button>
                            </>
                          )}
                          {v.collaboratorId === meId && (
                            <button className={btnGhost} disabled={busy} onClick={() => send("vacations", "PUT", { id: v.id, status: "Cancelled" })}>Cancel</button>
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

function LeaveForm({ types, employees, canManage, meId, busy, onSave, onCancel }) {
  const [form, setForm] = useState({ collaboratorId: "", type: types[0], from: "", to: "", reason: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  // Inclusive of both ends, which is how leave is counted.
  const days = form.from && form.to
    ? Math.max(0, Math.round((new Date(form.to) - new Date(form.from)) / 86400000) + 1)
    : form.from ? 1 : 0;
  const backwards = form.from && form.to && form.to < form.from;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {canManage && (
          <div>
            <label className={label}>Person</label>
            <select className={input} value={form.collaboratorId} onChange={set("collaboratorId")}>
              <option value="">Me</option>
              {employees.filter((e) => e.id !== meId).map((e) => <option key={e.id} value={e.id}>{e.alias}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className={label}>Type</label>
          <select className={input} value={form.type} onChange={set("type")}>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div><label className={label}>From</label><input type="date" className={input} value={form.from} onChange={set("from")} /></div>
        <div><label className={label}>To</label><input type="date" className={input} value={form.to} onChange={set("to")} /></div>
      </div>
      <div className="mt-4"><label className={label}>Reason</label><textarea rows={2} className={input} value={form.reason} onChange={set("reason")} /></div>

      <p className={`mt-3 text-xs ${backwards ? "text-rose-600 dark:text-rose-400" : "text-slate-500 dark:text-slate-400"}`}>
        {backwards ? "The end date is before the start date." : days > 0 ? `That is ${days} day${days === 1 ? "" : "s"}.` : "Pick a start date."}
      </p>

      <div className="mt-5 flex gap-3">
        <button className={btn} disabled={busy || !form.from || backwards} onClick={() => onSave(form)}>{busy ? "Sending…" : "Submit"}</button>
        <button className={btnGhost} onClick={onCancel}>Cancel</button>
      </div>
    </>
  );
}

// ---- shared bits -----------------------------------------------------------
// One form shape covers departments, positions and certifications — they differ
// only in their fields, so there is no reason for three near-identical forms.
function SimpleForm({ fields, busy, onCancel, onSave }) {
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((f) => [f.key, f.value ?? ""])));
  const ready = fields.filter((f) => f.required).every((f) => String(values[f.key] || "").trim());

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.key} className={f.area ? "sm:col-span-2" : ""}>
            <label className={label}>{f.label}{f.required && <span className="text-rose-500"> *</span>}</label>
            {f.options ? (
              <select className={input} value={values[f.key]} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}>
                {f.options.map((o) => <option key={o.value} value={o.value}>{o.text}</option>)}
              </select>
            ) : f.area ? (
              <textarea rows={2} className={input} value={values[f.key]} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} />
            ) : (
              <input type={f.type || "text"} className={input} placeholder={f.placeholder || ""} value={values[f.key]}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} />
            )}
          </div>
        ))}
      </div>
      <div className="mt-5 flex gap-3">
        <button className={btn} disabled={busy || !ready} onClick={() => onSave(values)}>{busy ? "Saving…" : "Save"}</button>
        <button className={btnGhost} onClick={onCancel}>Cancel</button>
      </div>
    </>
  );
}
