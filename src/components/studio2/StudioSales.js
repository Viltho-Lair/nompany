"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import RecordLink from "@/components/studio2/RecordLink";
import { Icon } from "@/components/studio2/icons";
import Combo from "@/components/studio2/Combo";
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
const microLabel = "mb-1 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400";
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

// `view` is the ACTIVE SUB-SECTION key, so each sub-section is its own screen:
//   sales           -> dashboard (empty for now)
//   sales-tickets   -> the tickets list + form
//   sales-clients   -> the clients list + form
//   sales-settings  -> Live view column selection
// sales-live renders full-screen outside the studio frame (see StudioSalesLive).
export default function StudioSales({ slug, view = "sales" }) {
  const [data, setData] = useState(null);
  const focusTicket = useFocusedRecord("ticket");
  const focusClient = useFocusedRecord("client");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null); // {kind:'client'|'ticket', row}
  // Stable, so the dialog's key/scroll-lock effect binds once instead of on
  // every keystroke in the form.
  const closeEditing = useCallback(() => setEditing(null), []);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/sales`, { cache: "no-store" });
    if (!res.ok) { setError("You don't have access to Sales in this studio."); return; }
    setData(await res.json());
  }, [slug]);
  useEffect(() => { load(); }, [load]);
  // A colleague raised or moved a ticket - reflect it without a refresh.
  useLiveUpdates(slug, "sales", load);

  async function send(kind, method, payload) {
    setError("");
    const url = kind ? `/api/studios/${slug}/sales/${kind}` : `/api/studios/${slug}/sales`;
    const res = await fetch(url, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(
        out.error === "duplicate" ? "A client with that name already exists."
        : out.error === "in-use" ? `That client still has ${out.tickets} ticket${out.tickets === 1 ? "" : "s"} - reassign or delete them first.`
        : out.error === "read-only" ? "You have view-only access to Sales."
        : out.error === "name" || out.error === "title" ? "Give it a name."
        : out.error === "client" ? "Name the client."
        : out.error === "deadline" ? "Deadline is required."
        : out.error === "industry" ? "Type of industry is required."
        : out.error === "services" ? "Pick at least one service. Add them in Sales → Settings."
        : out.error === "budget" ? "Client budget must be a non-negative number."
        : "That didn't save."
      );
      return false;
    }
    setEditing(null);
    await load();
    return true;
  }

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">Loading Sales...</p>;

  const { canManage, canManageSettings, clients, tickets, people, vocabulary, nav, liveColumns, services } = data;
  const banner = error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>;

  if (view === "sales-settings") {
    return (
      <div className="space-y-6">
        {banner}
        <SalesSettings
          options={vocabulary.liveColumnOptions || []}
          selected={liveColumns || []}
          services={services || []}
          cities={data.salesCities || []}
          positions={data.salesContactPositions || []}
          canManage={canManageSettings}
          onSaveVocab={(patch) => send("", "PUT", patch)}
          onService={(method, payload) => send("services", method, payload)}
        />
      </div>
    );
  }

  if (view === "sales-clients") {
    return (
      <div className="space-y-6">
        {banner}
        <Toolbar canManage={canManage} label="Add client" onAdd={() => setEditing({ kind: "client", row: null })} />
        {editing?.kind === "client" && (
          <ClientForm row={editing.row} onCancel={() => setEditing(null)}
            onSave={(payload) => send("clients", editing.row ? "PUT" : "POST", editing.row ? { ...payload, id: editing.row.id } : payload)} />
        )}
        <Clients clients={clients} canManage={canManage} focus={focusClient}
          onEdit={(row) => setEditing({ kind: "client", row })}
          onDelete={(row) => send("clients", "DELETE", { id: row.id })} />
      </div>
    );
  }

  if (view === "sales-tickets") {
    return (
      <div className="space-y-6">
        {banner}
        <Toolbar canManage={canManage} label="New ticket" onAdd={() => setEditing({ kind: "ticket", row: null })} />
        {/* Raising a ticket opens a DIALOG rather than unfolding a panel above
            the table: the form is long enough that inline it pushed the list
            it is about off the screen. */}
        {editing?.kind === "ticket" && (
          <Dialog
            title={editing.row ? `Edit ${editing.row.ref}` : "New ticket"}
            description="Fields marked * are required."
            onClose={closeEditing}
          >
            <TicketForm row={editing.row} clients={clients} people={people} vocabulary={vocabulary}
              services={services || []} cities={data.salesCities || []} positions={data.salesContactPositions || []}
              onCancel={closeEditing}
              onSave={(payload) => send("tickets", editing.row ? "PUT" : "POST", editing.row ? { ...payload, id: editing.row.id } : payload)} />
          </Dialog>
        )}
        <Tickets tickets={tickets} people={people} canManage={canManage} slug={slug} nav={nav} focus={focusTicket}
          onEdit={(row) => setEditing({ kind: "ticket", row })}
          onDelete={(row) => send("tickets", "DELETE", { id: row.id })} />
      </div>
    );
  }

  // Parent section: the Sales dashboard.
  return (
    <div className="space-y-6">
      {banner}
      <SalesDashboard slug={slug} tickets={tickets} clients={clients} />
    </div>
  );
}

// Modal shell for the Sales forms — backdrop, Escape, a locked page scroll and
// a titled header, matching the dialogs on the account pages so they open and
// dismiss the same way. The ticket form is taller than most viewports, so the
// BODY scrolls inside a dialog capped below the viewport height; the page
// behind it stays put rather than scrolling two things at once.
function Dialog({ title, description, onClose, children, width = "max-w-[720px]" }) {
  // RENDERED INTO document.body, not where it is written. `position: fixed` is
  // only viewport-relative while no ancestor establishes a containing block —
  // any transform, filter, backdrop-filter, perspective, contain or
  // will-change on something above it silently re-anchors `inset-0` to THAT
  // element's box instead. In the studio the dialog is written deep inside the
  // shell (page → ps-72 column → sticky header sibling → main), so one such
  // property anywhere up that chain crops the backdrop to the content column
  // and pushes it below the header. Portalling to the body puts the dialog
  // outside the whole chain, so it cannot be caught by a style added later
  // somewhere else.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  if (!mounted) return null; // no document to portal into until the client runs

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      {/* Light touch on purpose: a heavy tint flattened the whole studio —
          sidebar, header and the ticket list — into grey while the form was
          open. The blur separates the dialog from what is behind it, so the
          studio stays legible instead of being blanked out. */}
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm dark:bg-slate-950/30" onClick={onClose} />
      <div className={`relative flex max-h-[88vh] w-full flex-col overflow-hidden rounded-geex bg-white shadow-geex dark:bg-[#20202c] ${width}`}>
        <div className="flex items-start gap-3 border-b border-slate-200/70 px-6 py-4 dark:border-white/10">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-800 text-slate-900 dark:text-white">{title}</h3>
            {description && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            className="ms-auto inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5">
            <Icon name="close" className="h-[18px] w-[18px]" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

function Toolbar({ canManage, label, onAdd }) {
  return (
    <div className="flex justify-end">
      {canManage
        ? <button type="button" className={btn} onClick={onAdd}>{label}</button>
        : <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-600 text-slate-500 dark:bg-white/5 dark:text-slate-400">View only</span>}
    </div>
  );
}

// The Sales dashboard is deliberately empty of analytics for now - it exists so
// the parent section is a place rather than a redirect.
function SalesDashboard({ slug, tickets, clients }) {
  const tiles = [
    { label: "Tickets", value: tickets.length, key: "sales-tickets" },
    { label: "Clients", value: clients.length, key: "sales-clients" },
    { label: "Live view", value: "Open", key: "sales-live" },
  ];
  return (
    <section className={panel}>
      <h2 className={h2}>Sales</h2>
      <p className={sub}>An overview of this section. Nothing is reported here yet.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {tiles.map((t) => (
          <a key={t.key} href={`/${slug}/${t.key}`}
            className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-brand-500 dark:border-white/15 dark:bg-[#191921] dark:hover:border-brand-500/40">
            <p className={microLabel}>{t.label}</p>
            <p className="font-display text-lg font-800 text-slate-900 dark:text-white">{t.value}</p>
          </a>
        ))}
      </div>
    </section>
  );
}

// Sales Settings owns everything Sales needs to be configured with: the
// service catalogue tickets pick from, the vocabulary behind the contact and
// location fields, and the Live view's column selection.
function VocabList({ title, help, items, canManage, onChange }) {
  const [draft, setDraft] = useState("");
  const add = () => { const v = draft.trim(); if (!v) return; onChange([...items, v]); setDraft(""); };
  return (
    <div>
      <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{title}</h3>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{help}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.length === 0 && <span className="text-xs text-slate-400">None yet.</span>}
        {items.map((it) => (
          <span key={it} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-600 text-slate-700 dark:bg-white/5 dark:text-slate-200">
            {it}
            {canManage && (
              <button type="button" aria-label={`Remove ${it}`} className="text-slate-400 hover:text-rose-600"
                onClick={() => onChange(items.filter((x) => x !== it))}>×</button>
            )}
          </span>
        ))}
      </div>
      {canManage && (
        <div className="mt-3 flex gap-2">
          <input className={input} value={draft} onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} placeholder="Add and press Enter" />
          <button type="button" className={btnGhost} onClick={add}>Add</button>
        </div>
      )}
    </div>
  );
}

function SalesSettings({ options, selected, services, cities, positions, canManage, onSaveVocab, onService }) {
  const [cols, setCols] = useState(selected);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [svc, setSvc] = useState({ name: "", description: "" });
  const toggle = (key) => { setSaved(false); setCols((c) => c.includes(key) ? c.filter((x) => x !== key) : [...c, key]); };

  return (
    <div className="space-y-6">
      <section className={panel}>
        <h2 className={h2}>Services</h2>
        <p className={sub}>The catalogue a ticket picks from. Each service gets its own serviceId, and one that a ticket still references cannot be deleted.</p>
        <ul className="mt-4 space-y-2">
          {services.length === 0 && <li className="text-xs text-slate-400">No services yet — a ticket needs at least one, so add them here first.</li>}
          {services.map((sv) => (
            <li key={sv.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/15 dark:bg-[#191921]">
              <div className="min-w-0">
                <p className="font-display text-sm font-700 text-slate-900 dark:text-white">{sv.name}</p>
                {sv.description && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{sv.description}</p>}
                <p className="mt-0.5 font-mono text-[11px] text-slate-400">{sv.id}</p>
              </div>
              {canManage && (
                <button type="button" className={btnGhost} onClick={() => onService("DELETE", { id: sv.id })}>Delete</button>
              )}
            </li>
          ))}
        </ul>
        {canManage && (
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <div><label className={label}>Name</label><input className={input} value={svc.name} onChange={(e) => setSvc((v) => ({ ...v, name: e.target.value }))} placeholder="Audio-visual" /></div>
            <div><label className={label}>Description</label><input className={input} value={svc.description} onChange={(e) => setSvc((v) => ({ ...v, description: e.target.value }))} /></div>
            <div className="flex items-end">
              <button type="button" className={btn} disabled={!svc.name.trim()}
                onClick={async () => { const ok = await onService("POST", svc); if (ok) setSvc({ name: "", description: "" }); }}>Add service</button>
            </div>
          </div>
        )}
      </section>

      <section className={panel}>
        <h2 className={h2}>Vocabulary</h2>
        <p className={sub}>Suggestions offered on the ticket form. They are hints, not a closed list — anything can still be typed.</p>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          <VocabList title="Cities" help="Offered under a ticket's location." items={cities} canManage={canManage}
            onChange={(next) => onSaveVocab({ salesCities: next })} />
          <VocabList title="Contact positions" help="Offered as a contact's position." items={positions} canManage={canManage}
            onChange={(next) => onSaveVocab({ salesContactPositions: next })} />
        </div>
      </section>

      <section className={panel}>
        <h2 className={h2}>Live view</h2>
        <p className={sub}>Choose the ticket columns the Live view shows. At least one is kept.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {options.map((o) => (
            <label key={o.key} className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm dark:border-white/15 dark:bg-[#191921]">
              <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={cols.includes(o.key)} disabled={!canManage} onChange={() => toggle(o.key)} />
              <span className="text-slate-900 dark:text-white">{o.label}</span>
            </label>
          ))}
        </div>
        {canManage ? (
          <div className="mt-5 flex items-center gap-3">
            <button className={btn} disabled={busy} onClick={async () => { setBusy(true); const ok = await onSaveVocab({ liveColumns: cols }); setBusy(false); setSaved(!!ok); }}>
              {busy ? "Saving..." : "Save columns"}
            </button>
            {saved && <span className="text-sm text-emerald-700 dark:text-emerald-400">Saved</span>}
          </div>
        ) : (
          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">You have view-only access to Sales settings.</p>
        )}
      </section>
    </div>
  );
}

// ---- tickets ---------------------------------------------------------------
function Tickets({ tickets, people, canManage, slug, nav, focus, onEdit, onDelete, noClients }) {
  const aliasOf = useMemo(() => Object.fromEntries(people.map((p) => [p.id, p.alias])), [people]);

  // No "add a client first" gate: naming an unknown client on the ticket form
  // creates it, exactly as the Old System does.
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

function TicketForm({ row, clients, people, vocabulary, services = [], cities = [], positions = [], onSave, onCancel }) {
  // Fields mirror the Old System's ticket. Mandatory: title, client, deadline,
  // type of industry. Status, urgency and value are NOT here on purpose —
  // status is automated ("Lead" → "Opportunity" on RFQ request), urgency is a
  // Sales-Leader change made after creation, and value is filled from a
  // completed quotation. Client Budget is the client's own manual figure.
  const existing = row ? clients.find((c) => c.id === row.clientId) : null;
  const [f, setF] = useState({
    title: row?.title || "",
    clientName: row?.clientName || existing?.name || "",
    contactName: row?.contactName || "", contactEmail: row?.contactEmail || "",
    contactPhone: row?.contactPhone || "", contactPosition: row?.contactPosition || "",
    locationName: row?.location?.name || "", locationCity: row?.location?.city || "", locationUrl: row?.location?.url || "",
    deadline: row?.deadline || "", industry: row?.industry || "",
    clientBudget: row?.clientBudget ?? "",
    assignedToCollaboratorId: row?.assignedToCollaboratorId || "",
    description: row?.description || "",
  });
  const [serviceIds, setServiceIds] = useState(row?.serviceIds || []);
  const [reqs, setReqs] = useState(row?.serviceRequirements || {});
  const toggleService = (id) => setServiceIds((v) => v.includes(id) ? v.filter((x) => x !== id) : [...v, id]);
  const setReq = (id, field) => setReqs((r) => ({ ...r, [id]: { ...(r[id] || {}), [field]: !(r[id] || {})[field] } }));
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const ready = f.title.trim() && f.clientName.trim() && f.deadline && f.industry.trim() && serviceIds.length > 0;

  // The title, the close button and the scrolling belong to the Dialog this
  // opens inside, so the form itself renders fields only.
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><label className={label}>Title *</label><input className={input} value={f.title} onChange={set("title")} placeholder="Site survey for new branch" /></div>

        <div>
          <label className={label}>Client *</label>
          {/* Free text with suggestions: an unknown name creates the client. */}
          <input className={input} list="sales-client-names" value={f.clientName} onChange={set("clientName")} placeholder="Acme Trading" disabled={!!row} />
          <datalist id="sales-client-names">{clients.map((c) => <option key={c.id} value={c.name} />)}</datalist>
        </div>
        <div>
          <label className={label}>Deadline *</label>
          <input className={input} type="date" value={f.deadline} onChange={set("deadline")} />
        </div>
        <div>
          <label className={label}>Type of industry *</label>
          <Combo value={f.industry} onChange={(v) => setF((p) => ({ ...p, industry: v }))}
            options={vocabulary.industries || []} placeholder="Retail" />
        </div>
        <div><label className={label}>Client budget</label><input className={input} type="number" min="0" value={f.clientBudget} onChange={set("clientBudget")} placeholder="Optional reference figure" /></div>
      </div>

      <p className="mt-5 text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">Contact</p>
      <div className="mt-2 grid gap-4 sm:grid-cols-2">
        <div><label className={label}>Name</label><input className={input} value={f.contactName} onChange={set("contactName")} /></div>
        <div>
          <label className={label}>Position</label>
          <input className={input} list="sales-positions" value={f.contactPosition} onChange={set("contactPosition")} />
          <datalist id="sales-positions">{positions.map((x) => <option key={x} value={x} />)}</datalist>
        </div>
        <div><label className={label}>Email</label><input className={input} type="email" value={f.contactEmail} onChange={set("contactEmail")} /></div>
        <div><label className={label}>Phone</label><input className={input} value={f.contactPhone} onChange={set("contactPhone")} /></div>
      </div>

      <p className="mt-5 text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">Location</p>
      <div className="mt-2 grid gap-4 sm:grid-cols-3">
        <div><label className={label}>Site name</label><input className={input} value={f.locationName} onChange={set("locationName")} /></div>
        <div>
          <label className={label}>City</label>
          <Combo value={f.locationCity} onChange={(v) => setF((p) => ({ ...p, locationCity: v }))}
            options={cities} placeholder="Riyadh" />
        </div>
        <div><label className={label}>Map link</label><input className={input} value={f.locationUrl} onChange={set("locationUrl")} /></div>
      </div>

      <p className="mt-5 text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">Type of services *</p>
      {services.length === 0 ? (
        <p className="mt-2 rounded-xl border border-dashed border-slate-200 p-4 text-xs text-slate-500 dark:border-white/15 dark:text-slate-400">
          No services in the catalogue yet. Add them in Sales &rarr; Settings before raising a ticket.
        </p>
      ) : (
        <div className="mt-2 space-y-2">
          {services.map((sv) => {
            const on = serviceIds.includes(sv.id);
            return (
              <div key={sv.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-white/15 dark:bg-[#191921]">
                <label className="flex items-center gap-2.5 text-sm">
                  <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={on} onChange={() => toggleService(sv.id)} />
                  <span className="font-600 text-slate-900 dark:text-white">{sv.name}</span>
                </label>
                {on && (
                  <div className="mt-2 flex flex-wrap gap-4 ps-7 text-xs text-slate-600 dark:text-slate-300">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="h-3.5 w-3.5 accent-brand-600" checked={!!(reqs[sv.id] || {}).withoutInstallation} onChange={() => setReq(sv.id, "withoutInstallation")} />
                      Without installation
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="h-3.5 w-3.5 accent-brand-600" checked={!!(reqs[sv.id] || {}).withoutProgramming} onChange={() => setReq(sv.id, "withoutProgramming")} />
                      Without programming
                    </label>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Owner</label>
          <select className={input} value={f.assignedToCollaboratorId} onChange={set("assignedToCollaboratorId")}>
            <option value="">Unassigned</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.alias}</option>)}
          </select>
        </div>
      </div>
      <div className="mt-4"><label className={label}>Description</label><textarea rows={3} className={input} value={f.description} onChange={set("description")} /></div>

      <div className="mt-5 flex gap-3">
        <button className={btn} disabled={busy || !ready} onClick={async () => {
          setBusy(true);
          await onSave({
            title: f.title, clientName: f.clientName,
            contactName: f.contactName, contactEmail: f.contactEmail,
            contactPhone: f.contactPhone, contactPosition: f.contactPosition,
            location: { name: f.locationName, city: f.locationCity, url: f.locationUrl },
            deadline: f.deadline, industry: f.industry,
            serviceIds, serviceRequirements: reqs,
            clientBudget: f.clientBudget === "" ? null : f.clientBudget,
            assignedToCollaboratorId: f.assignedToCollaboratorId,
            description: f.description,
          });
          setBusy(false);
        }}>{busy ? "Saving…" : "Save ticket"}</button>
        <button className={btnGhost} onClick={onCancel}>Cancel</button>
      </div>
    </>
  );
}
