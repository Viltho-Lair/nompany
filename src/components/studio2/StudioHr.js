"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";

const panel = "rounded-geex border border-slate-200/70 bg-white p-6 dark:border-white/10 dark:bg-[#20202c]";
const h2 = "font-display text-lg font-800 text-slate-900 dark:text-white";
const sub = "mt-1 text-sm text-slate-500 dark:text-slate-400";
const input =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-[#191921] dark:text-white";
const label = "mb-1 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400";
const btn = "rounded-full bg-brand-700 px-4 py-2 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60";
const btnGhost = "rounded-full border border-slate-200 px-4 py-2 font-display text-sm font-600 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5";
const btnDanger = "rounded-full border border-rose-200 px-4 py-2 font-display text-sm font-600 text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-60 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10";
const th = "pb-3 text-start text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400";
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
// `view` is the ACTIVE SUB-SECTION key. HR has exactly one sub-section —
// Employees — so the parent renders a dashboard and hr-employees renders the
// existing tabbed screen (People / Departments / Positions / Certifications /
// Leave), which are tabs of one screen rather than sub-sections of their own.
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

  const { canManage, departments, positions, certifications, employees, vacations, expiring, headcount, vocabulary, me } = data;
  const pendingLeave = vacations.filter((v) => v.status === "Pending").length;

  const tabs = [
    ["people", `People (${employees.length})`],
    ["departments", `Departments (${departments.length})`],
    ["positions", `Positions (${positions.length})`],
    ["certifications", `Certifications (${certifications.length})`],
    ["leave", `Leave${pendingLeave ? ` (${pendingLeave})` : ""}`],
  ];

  if (view === "hr") {
    return (
      <div className="space-y-6">
        <HrDashboard slug={slug} employees={employees} departments={departments} positions={positions} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

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
  const certName = useMemo(() => Object.fromEntries(certifications.map((c) => [c.id, c.name])), [certifications]);

  return (
    <>
      {editing && (
        <EmployeeEditor
          person={editing}
          departments={departments}
          positions={positions}
          certifications={certifications}
          busy={busy}
          onCancel={() => setEditing(null)}
          onSave={async (patch) => { if (await onSave(editing.id, patch)) setEditing(null); }}
        />
      )}

      <section className={panel}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10">
                {["Person", "Code", "Department", "Position", "Joined", "Documents", ""].map((h, i) => (
                  <th key={h} className={`${th} ${i === 6 ? "text-end" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                  <td className={td}>
                    <span className="font-600 text-slate-900 dark:text-white">{e.alias}</span>
                    {e.role === "owner" && <span className="ms-2 text-xs text-slate-400">Owner</span>}
                    {(e.certificationIds || []).length > 0 && (
                      <span className="mt-1 flex flex-wrap gap-1">
                        {e.certificationIds.map((id) => (
                          <span key={id} className="rounded-full bg-brand-500/10 px-2 py-0.5 text-[11px] font-600 text-brand-700 dark:text-brand-300">
                            {certName[id] || "—"}
                          </span>
                        ))}
                      </span>
                    )}
                  </td>
                  <td className={`${td} font-mono text-xs text-slate-500 dark:text-slate-400`}>{e.employeeCode || "—"}</td>
                  <td className={`${td} text-slate-600 dark:text-slate-300`}>{e.departmentName || <span className="text-slate-400">Unassigned</span>}</td>
                  <td className={`${td} text-slate-600 dark:text-slate-300`}>{e.positionTitle || "—"}</td>
                  <td className={`${td} text-slate-600 dark:text-slate-300`}>{fmt(e.dateOfJoin)}</td>
                  <td className={td}><Documents person={e} canManage={canManage} /></td>
                  <td className={`${td} text-end`}>
                    {canManage && <button className={btnGhost} onClick={() => setEditing(e)}>Edit</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
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

  if (items.length === 0) return <span className="text-slate-400">—</span>;
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
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Choosing a position implies its department, so the two can never disagree.
  const forDepartment = form.departmentId
    ? positions.filter((p) => !p.departmentId || p.departmentId === form.departmentId)
    : positions;

  return (
    <section className={`${panel} border-brand-500/40`}>
      <h3 className="font-display text-lg font-800 text-slate-900 dark:text-white">{person.alias}</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Employment details apply inside this studio only.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          Numbers are encrypted before they're stored, and only people who can manage HR can read them back.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className={label}>ID number</label>
            <input className={input} value={form.idNumber} onChange={set("idNumber")} />
          </div>
          <div>
            <label className={label}>ID expiry</label>
            <input type="date" className={input} value={form.idExpiry} onChange={set("idExpiry")} />
          </div>
          <div>
            <label className={label}>Passport number</label>
            <input className={input} value={form.passportNumber} onChange={set("passportNumber")} />
          </div>
          <div>
            <label className={label}>Passport expiry</label>
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

      <div className="mt-6 flex flex-wrap gap-2">
        <button className={btn} disabled={busy} onClick={() => onSave(form)}>{busy ? "Saving…" : "Save"}</button>
        <button className={btnGhost} onClick={onCancel}>Cancel</button>
      </div>
    </section>
  );
}

// ---- departments -----------------------------------------------------------
function Departments({ rows, employees, canManage, busy, send }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const count = (id) => employees.filter((e) => e.departmentId === id).length;

  return (
    <>
      {canManage && !adding && !editing && (
        <button className={btn} onClick={() => setAdding(true)}>Add department</button>
      )}
      {(adding || editing) && (
        <SimpleForm
          title={editing ? "Edit department" : "New department"}
          busy={busy}
          fields={[
            { key: "name", label: "Name", required: true, value: editing?.name || "" },
            { key: "code", label: "Code", value: editing?.code || "", placeholder: "auto" },
            { key: "description", label: "Description", area: true, value: editing?.description || "" },
          ]}
          onCancel={() => { setAdding(false); setEditing(null); }}
          onSave={async (values) => {
            const ok = await send("departments", editing ? "PUT" : "POST", editing ? { ...values, id: editing.id } : values);
            if (ok) { setAdding(false); setEditing(null); }
          }}
        />
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
                    <button className={btnGhost} onClick={() => setEditing(d)}>Edit</button>
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
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const count = (id) => employees.filter((e) => e.positionId === id).length;

  return (
    <>
      {canManage && !adding && !editing && (
        <button className={btn} onClick={() => setAdding(true)}>Add position</button>
      )}
      {(adding || editing) && (
        <SimpleForm
          title={editing ? "Edit position" : "New position"}
          busy={busy}
          fields={[
            { key: "title", label: "Title", required: true, value: editing?.title || "" },
            { key: "departmentId", label: "Department", value: editing?.departmentId || "",
              options: [{ value: "", text: "—" }, ...departments.map((d) => ({ value: d.id, text: d.name }))] },
            { key: "headcountTarget", label: "Target headcount", type: "number", value: editing?.headcountTarget || "" },
            { key: "description", label: "Description", area: true, value: editing?.description || "" },
          ]}
          onCancel={() => { setAdding(false); setEditing(null); }}
          onSave={async (values) => {
            const ok = await send("positions", editing ? "PUT" : "POST", editing ? { ...values, id: editing.id } : values);
            if (ok) { setAdding(false); setEditing(null); }
          }}
        />
      )}

      {rows.length === 0 ? <Empty title="No positions yet" body="Positions are the roles people hold — they can belong to a department." /> : (
        <section className={panel}>
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {rows.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-600 text-slate-900 dark:text-white">{p.title}</span>
                    {p.departmentName && <span className="text-xs text-slate-500 dark:text-slate-400">{p.departmentName}</span>}
                    <span className="text-xs text-slate-400">
                      {count(p.id)} held{p.headcountTarget ? ` of ${p.headcountTarget}` : ""}
                    </span>
                  </div>
                  {p.description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{p.description}</p>}
                </div>
                {canManage && (
                  <div className="flex gap-2">
                    <button className={btnGhost} onClick={() => setEditing(p)}>Edit</button>
                    <button className={btnDanger} disabled={busy} onClick={() => send("positions", "DELETE", { id: p.id })}>Delete</button>
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

// ---- certifications --------------------------------------------------------
function Certifications({ rows, employees, canManage, busy, send }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const held = (id) => employees.filter((e) => (e.certificationIds || []).includes(id)).length;

  return (
    <>
      {canManage && !adding && !editing && (
        <button className={btn} onClick={() => setAdding(true)}>Add certification</button>
      )}
      {(adding || editing) && (
        <SimpleForm
          title={editing ? "Edit certification" : "New certification"}
          busy={busy}
          fields={[
            { key: "name", label: "Name", required: true, value: editing?.name || "" },
            { key: "issuer", label: "Issuer", value: editing?.issuer || "" },
            { key: "validityMonths", label: "Valid for (months)", type: "number", value: editing?.validityMonths || "" },
            { key: "notes", label: "Notes", area: true, value: editing?.notes || "" },
          ]}
          onCancel={() => { setAdding(false); setEditing(null); }}
          onSave={async (values) => {
            const ok = await send("certifications", editing ? "PUT" : "POST", editing ? { ...values, id: editing.id } : values);
            if (ok) { setAdding(false); setEditing(null); }
          }}
        />
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
                    <button className={btnGhost} onClick={() => setEditing(c)}>Edit</button>
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
  const [form, setForm] = useState({ collaboratorId: "", type: types[0], from: "", to: "", reason: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <>
      {!asking && <button className={btn} onClick={() => setAsking(true)}>Request leave</button>}

      {asking && (
        <section className={`${panel} border-brand-500/40`}>
          <h3 className="font-display text-lg font-800 text-slate-900 dark:text-white">Request leave</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            <div>
              <label className={label}>From</label>
              <input type="date" className={input} value={form.from} onChange={set("from")} />
            </div>
            <div>
              <label className={label}>To</label>
              <input type="date" className={input} value={form.to} onChange={set("to")} />
            </div>
          </div>
          <div className="mt-4">
            <label className={label}>Reason</label>
            <textarea rows={2} className={input} value={form.reason} onChange={set("reason")} />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button className={btn} disabled={busy || !form.from}
              onClick={async () => { if (await send("vacations", "POST", form)) { setAsking(false); setForm({ collaboratorId: "", type: types[0], from: "", to: "", reason: "" }); } }}>
              {busy ? "Sending…" : "Submit"}
            </button>
            <button className={btnGhost} onClick={() => setAsking(false)}>Cancel</button>
          </div>
        </section>
      )}

      {rows.length === 0 ? <Empty title="No leave booked" body={canManage ? "Requests from your people arrive here for approval." : "Your own leave requests appear here."} /> : (
        <section className={panel}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10">
                  {["Person", "Type", "From", "To", "Days", "Status", ""].map((h, i) => (
                    <th key={h} className={`${th} ${i === 6 ? "text-end" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((v) => (
                  <tr key={v.id} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                    <td className={`${td} font-600 text-slate-900 dark:text-white`}>{v.alias}</td>
                    <td className={`${td} text-slate-600 dark:text-slate-300`}>{v.type}</td>
                    <td className={`${td} text-slate-600 dark:text-slate-300`}>{fmt(v.from)}</td>
                    <td className={`${td} text-slate-600 dark:text-slate-300`}>{fmt(v.to)}</td>
                    <td className={`${td} text-slate-600 dark:text-slate-300`}>{v.days}</td>
                    <td className={td}>
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

// ---- shared bits -----------------------------------------------------------
// One form shape covers departments, positions and certifications — they differ
// only in their fields, so there is no reason for three near-identical forms.
function SimpleForm({ title, fields, busy, onCancel, onSave }) {
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((f) => [f.key, f.value ?? ""])));
  const required = fields.filter((f) => f.required);
  const ready = required.every((f) => String(values[f.key] || "").trim());

  return (
    <section className={`${panel} border-brand-500/40`}>
      <h3 className="font-display text-lg font-800 text-slate-900 dark:text-white">{title}</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
      <div className="mt-5 flex flex-wrap gap-2">
        <button className={btn} disabled={busy || !ready} onClick={() => onSave(values)}>{busy ? "Saving…" : "Save"}</button>
        <button className={btnGhost} onClick={onCancel}>Cancel</button>
      </div>
    </section>
  );
}

function Empty({ title, body }) {
  return (
    <div className={`${panel} text-center`}>
      <h3 className="font-display text-lg font-800 text-slate-900 dark:text-white">{title}</h3>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{body}</p>
    </div>
  );
}


// The HR dashboard is deliberately empty of analytics for now.
function HrDashboard({ slug, employees, departments, positions }) {
  const tiles = [
    { label: "Employees", value: employees.length },
    { label: "Departments", value: departments.length },
    { label: "Positions", value: positions.length },
  ];
  return (
    <section className={panel}>
      <h2 className={h2}>Human Resources</h2>
      <p className={sub}>An overview of this section. Nothing is reported here yet.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {tiles.map((t) => (
          <a key={t.label} href={`/${slug}/hr-employees`}
            className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-brand-500 dark:border-white/15 dark:bg-[#191921] dark:hover:border-brand-500/40">
            <p className="mb-1 text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">{t.label}</p>
            <p className="font-display text-lg font-800 text-slate-900 dark:text-white">{t.value}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
