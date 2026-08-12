"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import RecordLink from "@/components/studio2/RecordLink";
import { linkToProject, linkIf } from "@/lib/studioLinks";

const panel = "rounded-geex border border-slate-200/70 bg-white p-6 dark:border-white/10 dark:bg-[#20202c]";
const h2 = "font-display text-lg font-800 text-slate-900 dark:text-white";
const sub = "mt-1 text-sm text-slate-500 dark:text-slate-400";
const input =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-[#191921] dark:text-white";
const label = "mb-1 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400";
const btn = "rounded-full bg-brand-700 px-4 py-2 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60";
const btnGhost = "rounded-full border border-slate-200 px-4 py-2 font-display text-sm font-600 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5";
const btnDanger = "rounded-full border border-rose-200 px-4 py-2 font-display text-sm font-600 text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-60 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10";

const PERMIT_TONE = {
  Valid: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  Expiring: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  Expired: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  "Not yet valid": "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300",
};

const fmt = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB") : "—");
const dayName = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short" }) : "");

// OPERATIONS — where the work happens, who is on site when, and the paperwork
// that says they may be there. Discrete work items live in Tasks; this is about
// coverage, which is why a shift can clash with another or with approved leave.
// `view` is the ACTIVE SUB-SECTION key: the parent renders a dashboard and each
// sub-section selects its screen. The remaining tabs are tabs of one screen.
export default function StudioOperations({ slug, view = "operations" }) {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState(view === "operations-tracking" ? "tracking" : "schedule");
  useEffect(() => { setTab(view === "operations-tracking" ? "tracking" : "schedule"); }, [view]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/operations`, { cache: "no-store" });
    if (!res.ok) { setError("You don't have access to Operations in this studio."); return; }
    setData(await res.json());
  }, [slug]);
  useEffect(() => { load(); }, [load]);
  // Shifts and permits change from more than one desk — stay current.
  useLiveUpdates(slug, "operations", load);

  const send = useCallback(async (kind, method, payload) => {
    setError(""); setBusy(true);
    const res = await fetch(`/api/studios/${slug}/operations/${kind}`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(message(out)); return false; }
    await load();
    return true;
  }, [slug, load]);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">Loading Operations…</p>;

  const { canManage, locations, permits, shifts, projects, people, window, summary, vocabulary, nav } = data;

  const tabs = [
    ["schedule", `Schedule (${summary.shiftsThisWeek})`],
    ["permits", `Permits (${permits.length})`],
    ["locations", `Locations (${locations.length})`],
  ];

  if (view === "operations") {
    return (
      <div className="space-y-6">
        <OperationsDashboard slug={slug} data={data} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

      <section className={panel}>
        <div className="flex flex-wrap gap-8">
          {[["Shifts this week", summary.shiftsThisWeek, ""],
            ["Hours scheduled", summary.hoursThisWeek, ""],
            ["Permits expiring", summary.permitsExpiring, summary.permitsExpiring > 0 ? "text-amber-600 dark:text-amber-400" : ""],
            ["Permits expired", summary.permitsExpired, summary.permitsExpired > 0 ? "text-rose-600 dark:text-rose-400" : ""],
            ["Locations", summary.locations, ""]].map(([name, value, tone]) => (
            <div key={name}>
              <p className={`font-display text-3xl font-800 ${tone || "text-slate-900 dark:text-white"}`}>{value}</p>
              <p className="text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">{name}</p>
            </div>
          ))}
        </div>
      </section>

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

      {tab === "schedule" && (
        <Schedule shifts={shifts} people={people} locations={locations} window={window}
          canManage={canManage} busy={busy} send={send} />
      )}
      {tab === "permits" && (
        <Permits rows={permits} locations={locations} people={people} projects={projects} types={vocabulary.permitTypes}
          windowDays={vocabulary.expiryWindowDays} slug={slug} nav={nav} canManage={canManage} busy={busy} send={send} />
      )}
      {tab === "locations" && (
        <Locations rows={locations} kinds={vocabulary.locationKinds} canManage={canManage} busy={busy} send={send} />
      )}
    </div>
  );
}

function message(out) {
  if (out.error === "read-only") return "You have view-only access to Operations.";
  if (out.error === "duplicate") return "That name is already in use.";
  if (out.error === "clash") return `They're already scheduled ${out.startTime}–${out.endTime} that day.`;
  if (out.error === "on-leave") return `They're on approved ${String(out.type || "").toLowerCase()} leave ${fmt(out.from)} – ${fmt(out.to)}.`;
  if (out.error === "in-use") {
    const bits = [];
    if (out.permits) bits.push(`${out.permits} ${out.permits === 1 ? "permit" : "permits"}`);
    if (out.shifts) bits.push(`${out.shifts} ${out.shifts === 1 ? "shift" : "shifts"}`);
    return `Still used by ${bits.join(" and ")} — move those first.`;
  }
  if (out.error === "range") return "The end date can't be before the start date.";
  if (out.error === "time") return "Give the shift a date, a start and an end.";
  if (out.error === "person") return "Pick who is working.";
  return "That didn't save.";
}

// ---- schedule --------------------------------------------------------------
function Schedule({ shifts, people, locations, window, canManage, busy, send }) {
  const [adding, setAdding] = useState(false);

  // Group by day so the rota reads as a week, not a list. Stepped in UTC, the
  // same zone the server builds the window in — walking these in local time
  // drops or repeats a day for any viewer who isn't on UTC.
  const days = useMemo(() => {
    const out = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(`${window.from}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + i);
      const iso = d.toISOString().slice(0, 10);
      out.push({ iso, shifts: shifts.filter((s) => s.date === iso) });
    }
    return out;
  }, [shifts, window.from]);

  const later = shifts.filter((s) => s.date > window.to);

  return (
    <>
      {canManage && !adding && (
        <button className={btn} onClick={() => setAdding(true)} disabled={people.length === 0}>Schedule a shift</button>
      )}
      {adding && (
        <ShiftForm people={people} locations={locations} busy={busy}
          onCancel={() => setAdding(false)}
          onSave={async (v) => { if (await send("shifts", "POST", v)) setAdding(false); }} />
      )}

      <section className={panel}>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          {fmt(window.from)} – {fmt(window.to)}
        </p>
        <ul className="divide-y divide-slate-100 dark:divide-white/5">
          {days.map((d) => (
            <li key={d.iso} className="flex flex-wrap gap-4 py-3 first:pt-0 last:pb-0">
              <div className="w-24 shrink-0">
                <p className="font-600 text-slate-900 dark:text-white">{dayName(d.iso)}</p>
                <p className="text-xs text-slate-400">{fmt(d.iso)}</p>
              </div>
              <div className="min-w-0 flex-1">
                {d.shifts.length === 0 ? <p className="text-sm text-slate-400">No one scheduled</p> : (
                  <ul className="space-y-1.5">
                    {d.shifts.map((s) => (
                      <li key={s.id} className="flex flex-wrap items-center justify-between gap-3">
                        <span className="text-sm text-slate-600 dark:text-slate-300">
                          <span className="font-mono text-xs text-slate-400">{s.startTime}–{s.endTime}</span>
                          <span className="ms-2 font-600 text-slate-900 dark:text-white">{s.alias}</span>
                          {s.locationName && <span className="ms-2">· {s.locationName}</span>}
                          {s.role && <span className="ms-2 text-slate-400">· {s.role}</span>}
                          <span className="ms-2 text-xs text-slate-400">{s.hours}h</span>
                        </span>
                        {canManage && (
                          <button className="text-xs text-rose-600 hover:underline dark:text-rose-400"
                            disabled={busy} onClick={() => send("shifts", "DELETE", { id: s.id })}>remove</button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ul>
        {later.length > 0 && (
          <p className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-500 dark:border-white/5 dark:text-slate-400">
            {later.length} more {later.length === 1 ? "shift" : "shifts"} scheduled beyond this week.
          </p>
        )}
      </section>
    </>
  );
}

function ShiftForm({ people, locations, busy, onCancel, onSave }) {
  const [form, setForm] = useState({
    collaboratorId: people[0]?.id || "", date: "", startTime: "08:00", endTime: "17:00",
    locationId: "", role: "", notes: "",
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <section className={`${panel} border-brand-500/40`}>
      <h3 className="font-display text-lg font-800 text-slate-900 dark:text-white">Schedule a shift</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className={label}>Who <span className="text-rose-500">*</span></label>
          <select className={input} value={form.collaboratorId} onChange={set("collaboratorId")}>
            {people.map((p) => <option key={p.id} value={p.id}>{p.alias}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Date <span className="text-rose-500">*</span></label>
          <input type="date" className={input} value={form.date} onChange={set("date")} />
        </div>
        <div>
          <label className={label}>Location</label>
          <select className={input} value={form.locationId} onChange={set("locationId")}>
            <option value="">—</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Start</label>
          <input type="time" className={input} value={form.startTime} onChange={set("startTime")} />
        </div>
        <div>
          <label className={label}>End</label>
          <input type="time" className={input} value={form.endTime} onChange={set("endTime")} />
        </div>
        <div>
          <label className={label}>Role</label>
          <input className={input} value={form.role} onChange={set("role")} placeholder="e.g. Lead technician" />
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button className={btn} disabled={busy || !form.date || !form.collaboratorId} onClick={() => onSave(form)}>
          {busy ? "Saving…" : "Schedule"}
        </button>
        <button className={btnGhost} onClick={onCancel}>Cancel</button>
      </div>
    </section>
  );
}

// ---- permits ---------------------------------------------------------------
function Permits({ rows, locations, people, projects, types, windowDays, slug, nav, canManage, busy, send }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const attention = rows.filter((p) => p.state === "Expiring" || p.state === "Expired");

  return (
    <>
      {canManage && !adding && !editing && <button className={btn} onClick={() => setAdding(true)}>Add permit</button>}
      {(adding || editing) && (
        <PermitForm permit={editing} locations={locations} people={people} projects={projects} types={types} busy={busy}
          onCancel={() => { setAdding(false); setEditing(null); }}
          onSave={async (v) => { if (await send("permits", editing ? "PUT" : "POST", editing ? { ...v, id: editing.id } : v)) { setAdding(false); setEditing(null); } }} />
      )}

      {attention.length > 0 && (
        <div className="rounded-geex border border-amber-300/60 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
          <p className="font-display text-sm font-700 text-amber-800 dark:text-amber-200">
            Needs renewing — expired, or within {windowDays} days
          </p>
          <ul className="mt-2 space-y-1 text-sm text-amber-800 dark:text-amber-200">
            {attention.map((p) => (
              <li key={p.id}>
                {p.reference} · {p.title} — {p.state === "Expired"
                  ? `expired ${fmt(p.validTo)}`
                  : `expires ${fmt(p.validTo)} (${p.daysLeft} days)`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {rows.length === 0 ? <Empty title="No permits yet" body="Permits record what the studio is authorised to do, where, and until when." /> : (
        <section className={panel}>
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {rows.map((p) => (
              <li key={p.id} className="flex flex-wrap items-start justify-between gap-3 py-4 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-slate-400">{p.reference}</span>
                    <span className="font-600 text-slate-900 dark:text-white">{p.title}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-600 ${PERMIT_TONE[p.state]}`}>{p.state}</span>
                    {p.projectNumber && (
                      <RecordLink href={linkIf(nav?.projects, linkToProject(slug, p.projectId))} title="Open the project">{p.projectNumber}</RecordLink>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {[p.type, p.locationName, p.number && `no. ${p.number}`, p.issuer].filter(Boolean).join(" · ")}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {p.validFrom || p.validTo ? `${fmt(p.validFrom)} – ${fmt(p.validTo)}` : "No dates set"}
                    {p.holderAliases.length > 0 && ` · ${p.holderAliases.join(", ")}`}
                  </p>
                </div>
                {canManage && (
                  <div className="flex gap-2">
                    <button className={btnGhost} onClick={() => setEditing(p)}>Edit</button>
                    <button className={btnDanger} disabled={busy} onClick={() => send("permits", "DELETE", { id: p.id })}>Delete</button>
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

function PermitForm({ permit, locations, people, projects, types, busy, onCancel, onSave }) {
  const [form, setForm] = useState({
    title: permit?.title || "", type: permit?.type || types[0], number: permit?.number || "",
    issuer: permit?.issuer || "", locationId: permit?.locationId || "", projectId: permit?.projectId || "",
    validFrom: permit?.validFrom || "", validTo: permit?.validTo || "", notes: permit?.notes || "",
  });
  const [holders, setHolders] = useState(permit?.holderCollaboratorIds || []);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <section className={`${panel} border-brand-500/40`}>
      <h3 className="font-display text-lg font-800 text-slate-900 dark:text-white">{permit ? "Edit permit" : "New permit"}</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2">
          <label className={label}>Title <span className="text-rose-500">*</span></label>
          <input className={input} value={form.title} onChange={set("title")} />
        </div>
        <div>
          <label className={label}>Type</label>
          <select className={input} value={form.type} onChange={set("type")}>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Permit number</label>
          <input className={input} value={form.number} onChange={set("number")} />
        </div>
        <div>
          <label className={label}>Issued by</label>
          <input className={input} value={form.issuer} onChange={set("issuer")} />
        </div>
        <div>
          <label className={label}>Location</label>
          <select className={input} value={form.locationId} onChange={set("locationId")}>
            <option value="">—</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Project</label>
          <select className={input} value={form.projectId} onChange={set("projectId")}>
            <option value="">—</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.number}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Valid from</label>
          <input type="date" className={input} value={form.validFrom} onChange={set("validFrom")} />
        </div>
        <div>
          <label className={label}>Valid to</label>
          <input type="date" className={input} value={form.validTo} onChange={set("validTo")} />
        </div>
      </div>

      {people.length > 0 && (
        <div className="mt-5">
          <label className={label}>Covers</label>
          <div className="flex flex-wrap gap-2">
            {people.map((p) => {
              const on = holders.includes(p.id);
              return (
                <button key={p.id} type="button"
                  onClick={() => setHolders((h) => (on ? h.filter((x) => x !== p.id) : [...h, p.id]))}
                  className={`rounded-full px-3 py-1.5 text-xs font-600 transition-colors ${on
                    ? "bg-brand-600 text-white"
                    : "border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5"}`}>
                  {p.alias}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <button className={btn} disabled={busy || !form.title.trim()}
          onClick={() => onSave({ ...form, holderCollaboratorIds: holders })}>
          {busy ? "Saving…" : "Save"}
        </button>
        <button className={btnGhost} onClick={onCancel}>Cancel</button>
      </div>
    </section>
  );
}

// ---- locations -------------------------------------------------------------
function Locations({ rows, kinds, canManage, busy, send }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);

  return (
    <>
      {canManage && !adding && !editing && <button className={btn} onClick={() => setAdding(true)}>Add location</button>}
      {(adding || editing) && (
        <SimpleForm title={editing ? "Edit location" : "New location"} busy={busy}
          fields={[
            { key: "name", label: "Name", required: true, value: editing?.name || "" },
            { key: "kind", label: "Kind", value: editing?.kind || kinds[0], options: kinds.map((k) => ({ value: k, text: k })) },
            { key: "city", label: "City", value: editing?.city || "" },
            { key: "address", label: "Address", value: editing?.address || "" },
            { key: "mapUrl", label: "Map link", value: editing?.mapUrl || "" },
            { key: "notes", label: "Notes", area: true, value: editing?.notes || "" },
          ]}
          onCancel={() => { setAdding(false); setEditing(null); }}
          onSave={async (v) => { if (await send("locations", editing ? "PUT" : "POST", editing ? { ...v, id: editing.id } : v)) { setAdding(false); setEditing(null); } }} />
      )}

      {rows.length === 0 ? <Empty title="No locations yet" body="Locations are the places work happens — sites, offices, warehouses. Shifts and permits point at them." /> : (
        <section className={panel}>
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {rows.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-600 text-slate-900 dark:text-white">{l.name}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-600 text-slate-500 dark:bg-white/5 dark:text-slate-400">{l.kind}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {[l.address, l.city].filter(Boolean).join(", ") || "No address"}
                    {l.mapUrl && (
                      <a href={l.mapUrl} target="_blank" rel="noopener noreferrer"
                        className="ms-2 text-brand-700 hover:underline dark:text-brand-300">map</a>
                    )}
                  </p>
                </div>
                {canManage && (
                  <div className="flex gap-2">
                    <button className={btnGhost} onClick={() => setEditing(l)}>Edit</button>
                    <button className={btnDanger} disabled={busy} onClick={() => send("locations", "DELETE", { id: l.id })}>Delete</button>
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

// ---- shared bits -----------------------------------------------------------
function SimpleForm({ title, fields, busy, onCancel, onSave }) {
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((f) => [f.key, f.value ?? ""])));
  const ready = fields.filter((f) => f.required).every((f) => String(values[f.key] ?? "").trim());

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
              <input className={input} value={values[f.key]} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} />
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


// Deliberately empty of analytics for now — the parent section is a place.
function OperationsDashboard({ slug, data }) {
  const tiles = [{ label: "Locations", value: (data.locations || []).length, key: "operations" },
    { label: "Permits", value: (data.permits || []).length, key: "operations" },
    { label: "Tracking", value: "Open", key: "operations-tracking" }];
  return (
    <section className={panel}>
      <h2 className={h2}>Operations</h2>
      <p className={sub}>An overview of this section. Nothing is reported here yet.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {tiles.map((t) => (
          <a key={t.label} href={`/${slug}/${t.key}`}
            className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-brand-500 dark:border-white/15 dark:bg-[#191921] dark:hover:border-brand-500/40">
            <p className="mb-1 text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">{t.label}</p>
            <p className="font-display text-lg font-800 text-slate-900 dark:text-white">{t.value}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
