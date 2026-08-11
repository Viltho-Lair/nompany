"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import RecordLink from "@/components/studio2/RecordLink";
import { useFocusedRecord } from "@/components/studio2/useFocusedRecord";
import { linkToClient } from "@/lib/studioLinks";

// Sales: clients and the tickets raised against them. Read access shows
// everything; the Manage grant is what reveals the create/edit controls — and
// the API enforces the same rule, so hiding a button is never the only defence.

const panel = "rounded-geex border border-slate-200/70 bg-white p-6 dark:border-white/10 dark:bg-[#20202c]";
const h2 = "font-display text-lg font-800 text-slate-900 dark:text-white";
const sub = "mt-1 text-sm text-slate-500 dark:text-slate-400";
const input =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/15 dark:bg-[#191921] dark:text-white";
const label = "mb-1.5 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400";
const btn = "rounded-full bg-brand-700 px-4 py-2 font-display text-sm font-600 text-white transition-colors hover:bg-brand-950 disabled:opacity-60";
const btnGhost = "rounded-full border border-slate-200 px-4 py-2 font-display text-sm font-600 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5";

const STATUS_TONE = {
  "Lead": "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300",
  "Opportunity": "bg-brand-500/10 text-brand-700 dark:text-brand-300",
  "Commit": "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "Closed Won": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "Closed Lost": "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};
const URGENCY_TONE = {
  Critical: "text-rose-600 dark:text-rose-400",
  High: "text-amber-600 dark:text-amber-400",
};

export default function StudioSales({ slug }) {
  const [data, setData] = useState(null);
  const focusTicket = useFocusedRecord("ticket");
  const focusClient = useFocusedRecord("client");
  // A deep link decides which tab opens, so the record you asked for is visible.
  const [tab, setTab] = useState(focusClient.focusedId ? "clients" : "tickets");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null); // {kind:'client'|'ticket', row}

  // Following a link that lands on this same page never remounts it, so the tab
  // has to react to the query changing too — not just to the first render.
  useEffect(() => { if (focusClient.focusedId) setTab("clients"); }, [focusClient.focusedId]);
  useEffect(() => { if (focusTicket.focusedId) setTab("tickets"); }, [focusTicket.focusedId]);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/sales`, { cache: "no-store" });
    if (!res.ok) { setError("You don't have access to Sales in this studio."); return; }
    setData(await res.json());
  }, [slug]);
  useEffect(() => { load(); }, [load]);

  async function send(kind, method, payload) {
    setError("");
    const res = await fetch(`/api/studios/${slug}/sales/${kind}`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(
        out.error === "duplicate" ? "A client with that name already exists."
        : out.error === "in-use" ? `That client still has ${out.tickets} ticket${out.tickets === 1 ? "" : "s"} — reassign or delete them first.`
        : out.error === "read-only" ? "You have view-only access to Sales."
        : out.error === "name" || out.error === "title" ? "Give it a name."
        : out.error === "client" ? "Pick a client."
        : "That didn't save."
      );
      return false;
    }
    setEditing(null);
    await load();
    return true;
  }

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">Loading Sales…</p>;

  const { canManage, clients, tickets, people, vocabulary, nav } = data;

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-full bg-slate-100 p-1 dark:bg-white/5">
          {[["tickets", `Tickets (${tickets.length})`], ["clients", `Clients (${clients.length})`]].map(([key, text]) => (
            <button key={key} type="button" onClick={() => { setTab(key); setEditing(null); }}
              className={`rounded-full px-4 py-2 text-sm font-600 transition-colors ${tab === key ? "bg-white text-brand-950 shadow-sm dark:bg-[#20202c] dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>
              {text}
            </button>
          ))}
        </div>
        {canManage ? (
          <button type="button" className={btn} onClick={() => setEditing({ kind: tab === "clients" ? "client" : "ticket", row: null })}>
            {tab === "clients" ? "Add client" : "New ticket"}
          </button>
        ) : (
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-600 text-slate-500 dark:bg-white/5 dark:text-slate-400">View only</span>
        )}
      </div>

      {editing?.kind === "client" && (
        <ClientForm row={editing.row} onCancel={() => setEditing(null)}
          onSave={(payload) => send("clients", editing.row ? "PUT" : "POST", editing.row ? { ...payload, id: editing.row.id } : payload)} />
      )}
      {editing?.kind === "ticket" && (
        <TicketForm row={editing.row} clients={clients} people={people} vocabulary={vocabulary} onCancel={() => setEditing(null)}
          onSave={(payload) => send("tickets", editing.row ? "PUT" : "POST", editing.row ? { ...payload, id: editing.row.id } : payload)} />
      )}

      {tab === "tickets"
        ? <Tickets tickets={tickets} people={people} canManage={canManage} slug={slug} nav={nav} focus={focusTicket}
            onEdit={(row) => setEditing({ kind: "ticket", row })}
            onDelete={(row) => send("tickets", "DELETE", { id: row.id })}
            noClients={clients.length === 0} />
        : <Clients clients={clients} canManage={canManage} focus={focusClient}
            onEdit={(row) => setEditing({ kind: "client", row })}
            onDelete={(row) => send("clients", "DELETE", { id: row.id })} />}
    </div>
  );
}

// ---- tickets ---------------------------------------------------------------
function Tickets({ tickets, people, canManage, slug, nav, focus, onEdit, onDelete, noClients }) {
  const aliasOf = useMemo(() => Object.fromEntries(people.map((p) => [p.id, p.alias])), [people]);

  if (noClients) {
    return <Empty title="Add a client first" body="Tickets are raised against a client, so start there." />;
  }
  if (tickets.length === 0) {
    return <Empty title="No tickets yet" body="A ticket is a piece of work you're chasing for a client — a lead, an enquiry, an opportunity." />;
  }
  return (
    <section className={panel}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-start dark:border-white/10">
              {["Ref", "Title", "Client", "Status", "Owner", ""].map((h, i) => (
                <th key={h + i} className={`pb-3 text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400 ${i === 5 ? "text-end" : "text-start"}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id} {...focus.focusProps(t.id)} className={`border-b border-slate-100 last:border-0 dark:border-white/5 ${focus.focusProps(t.id).className || ""}`}>
                <td className="py-3 pe-3 font-mono text-xs text-slate-500 dark:text-slate-400">{t.ref}</td>
                <td className="py-3 pe-3">
                  <span className="font-600 text-slate-900 dark:text-white">{t.title}</span>
                  {t.urgency && t.urgency !== "Normal" && (
                    <span className={`ms-2 text-xs font-600 ${URGENCY_TONE[t.urgency] || "text-slate-400"}`}>{t.urgency}</span>
                  )}
                </td>
                <td className="py-3 pe-3">
                  {t.clientName
                    ? <RecordLink href={linkToClient(slug, t.clientId)} mono={false} title={`Open ${t.clientName}`}>{t.clientName}</RecordLink>
                    : <span className="text-slate-400">—</span>}
                </td>
                <td className="py-3 pe-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-600 ${STATUS_TONE[t.status] || STATUS_TONE.Lead}`}>{t.status}</span>
                </td>
                <td className="py-3 pe-3 text-slate-600 dark:text-slate-300">{aliasOf[t.assignedToCollaboratorId] || "Unassigned"}</td>
                <td className="py-3 text-end">
                  {canManage && (
                    <span className="inline-flex gap-2">
                      <button className={btnGhost} onClick={() => onEdit(t)}>Edit</button>
                      <button className={btnGhost} onClick={() => onDelete(t)}>Delete</button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---- clients ---------------------------------------------------------------
function Clients({ clients, canManage, focus, onEdit, onDelete }) {
  if (clients.length === 0) {
    return <Empty title="No clients yet" body="Add the companies you sell to. Tickets, and later quotations and projects, hang off them." />;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {clients.map((c) => (
        <section key={c.id} {...focus.focusProps(c.id)} className={`${panel} ${focus.focusProps(c.id).className || ""}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-display text-base font-700 text-slate-900 dark:text-white">{c.name}</h3>
              <p className="font-mono text-xs text-slate-400">{c.code}</p>
            </div>
            {canManage && (
              <span className="flex shrink-0 gap-2">
                <button className={btnGhost} onClick={() => onEdit(c)}>Edit</button>
                <button className={btnGhost} onClick={() => onDelete(c)}>Delete</button>
              </span>
            )}
          </div>
          {c.industry && <p className={sub}>{c.industry}</p>}
          {c.contacts?.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-300">
              {c.contacts.slice(0, 3).map((p, i) => (
                <li key={i} className="truncate">
                  <span className="font-600">{p.name || "Contact"}</span>
                  {p.position && <span className="text-slate-400"> · {p.position}</span>}
                  {p.email && <span className="text-slate-400"> · {p.email}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

function Empty({ title, body }) {
  return (
    <div className="rounded-geex border border-dashed border-slate-200 p-10 text-center dark:border-white/10">
      <h3 className="font-display text-base font-700 text-slate-900 dark:text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">{body}</p>
    </div>
  );
}

// ---- forms -----------------------------------------------------------------
function ClientForm({ row, onSave, onCancel }) {
  const [f, setF] = useState({
    name: row?.name || "", industry: row?.industry || "", website: row?.website || "",
    contactName: row?.contacts?.[0]?.name || "", contactEmail: row?.contacts?.[0]?.email || "",
    contactPhone: row?.contacts?.[0]?.phone || "", notes: row?.notes || "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  return (
    <section className={`${panel} border-brand-500/40`}>
      <h2 className={h2}>{row ? "Edit client" : "Add client"}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div><label className={label}>Company name *</label><input className={input} value={f.name} onChange={set("name")} placeholder="Acme Trading Co." /></div>
        <div><label className={label}>Industry</label><input className={input} value={f.industry} onChange={set("industry")} /></div>
        <div><label className={label}>Contact name</label><input className={input} value={f.contactName} onChange={set("contactName")} /></div>
        <div><label className={label}>Contact email</label><input className={input} value={f.contactEmail} onChange={set("contactEmail")} /></div>
        <div><label className={label}>Contact phone</label><input className={input} value={f.contactPhone} onChange={set("contactPhone")} /></div>
        <div><label className={label}>Website</label><input className={input} value={f.website} onChange={set("website")} /></div>
      </div>
      <div className="mt-4"><label className={label}>Notes</label><textarea rows={3} className={input} value={f.notes} onChange={set("notes")} /></div>
      <div className="mt-5 flex gap-3">
        <button className={btn} disabled={busy || !f.name.trim()} onClick={async () => {
          setBusy(true);
          await onSave({
            name: f.name, industry: f.industry, website: f.website, notes: f.notes,
            contacts: [{ name: f.contactName, email: f.contactEmail, phone: f.contactPhone }],
          });
          setBusy(false);
        }}>{busy ? "Saving…" : "Save client"}</button>
        <button className={btnGhost} onClick={onCancel}>Cancel</button>
      </div>
    </section>
  );
}

function TicketForm({ row, clients, people, vocabulary, onSave, onCancel }) {
  const [f, setF] = useState({
    title: row?.title || "", clientId: row?.clientId || clients[0]?.id || "",
    status: row?.status || vocabulary.statuses[0], urgency: row?.urgency || "Normal",
    contactName: row?.contactName || "", value: row?.value || "", deadline: row?.deadline || "",
    assignedToCollaboratorId: row?.assignedToCollaboratorId || "", description: row?.description || "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  return (
    <section className={`${panel} border-brand-500/40`}>
      <h2 className={h2}>{row ? `Edit ${row.ref}` : "New ticket"}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><label className={label}>Title *</label><input className={input} value={f.title} onChange={set("title")} placeholder="Site survey for new branch" /></div>
        <div>
          <label className={label}>Client *</label>
          <select className={input} value={f.clientId} onChange={set("clientId")} disabled={!!row}>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div><label className={label}>Contact</label><input className={input} value={f.contactName} onChange={set("contactName")} /></div>
        <div>
          <label className={label}>Status</label>
          <select className={input} value={f.status} onChange={set("status")}>
            {vocabulary.statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Urgency</label>
          <select className={input} value={f.urgency} onChange={set("urgency")}>
            {vocabulary.urgencies.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Owner</label>
          <select className={input} value={f.assignedToCollaboratorId} onChange={set("assignedToCollaboratorId")}>
            <option value="">Unassigned</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.alias}</option>)}
          </select>
        </div>
        <div><label className={label}>Estimated value</label><input className={input} type="number" min="0" value={f.value} onChange={set("value")} /></div>
      </div>
      <div className="mt-4"><label className={label}>Description</label><textarea rows={3} className={input} value={f.description} onChange={set("description")} /></div>
      <div className="mt-5 flex gap-3">
        <button className={btn} disabled={busy || !f.title.trim() || !f.clientId} onClick={async () => {
          setBusy(true); await onSave(f); setBusy(false);
        }}>{busy ? "Saving…" : "Save ticket"}</button>
        <button className={btnGhost} onClick={onCancel}>Cancel</button>
      </div>
    </section>
  );
}
