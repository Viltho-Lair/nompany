"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import RecordLink from "@/components/studio2/RecordLink";
import { Icon } from "@/components/studio2/icons";
import Combo from "@/components/studio2/Combo";
import { useFocusedRecord } from "@/components/studio2/useFocusedRecord";
import {
  panel, h2, sub, input, microLabel, label, btn, btnGhost, btnAmber, th, stripeOn, stripeOff,
  URGENCY_BADGE, URGENCY_TONE, URGENCY_DOT, money, fmtDate, prefKey, loadPref, savePref,
  Dialog, Toolbar, FilterButton, FilterPanel, ColumnPicker, Empty, StatTile,
  WidgetTitle, FunnelChart, BarBreakdown,
} from "@/components/studio2/ui";
import { linkToClient } from "@/lib/studioLinks";
import { COUNTRIES } from "@/lib/countries";
import { citiesFor } from "@/lib/cities";
import { salesFunnel, probabilityBuckets, atRiskTickets, rfqInfo, isUnresolved } from "@/lib/salesAnalytics";
import { daysUntil } from "@/lib/sla";

// Sales: clients and the tickets raised against them. Read access shows
// everything; the Manage grant is what reveals the create/edit controls — and
// the API enforces the same rule, so hiding a button is never the only defence.
// The chrome — dialogs, toolbars, charts — comes from studio2/ui so this screen
// and Technical's are the same product rather than two lookalikes.

const STATUS_TONE = {
  "Lead": "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300",
  "Opportunity": "bg-brand-500/10 text-brand-700 dark:text-brand-300",
  "Commit": "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "Closed Won": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "Closed Lost": "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  "Cancelled by Client": "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  "On-Hold": "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300",
  "Dropped": "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};
// Columns the tickets table can show. Every one is toggleable; the Actions
// column is not on the list because it is always drawn.
const TICKET_COLUMNS = [
  { key: "createdAt", label: "Created" },
  { key: "ref", label: "Ref" },
  { key: "title", label: "Title" },
  { key: "client", label: "Client" },
  { key: "owner", label: "Owner" },
  { key: "value", label: "Value" },
  { key: "deadline", label: "Deadline" },
  { key: "status", label: "Status" },
  { key: "urgency", label: "Urgency" },
  { key: "rfq", label: "RFQ" },
  { key: "probability", label: "Prob." },
  { key: "updatedAt", label: "Updated" },
];
const COUNTRY_NAMES = COUNTRIES.map((c) => c.name);
// citiesFor keys on the ISO code while the answer people give is a NAME.
const codeOfCountry = (name) => COUNTRIES.find((c) => c.name === name)?.code || "";

const DEFAULT_TICKET_COLUMNS = ["ref", "title", "client", "status", "owner", "deadline", "rfq"];
const EMPTY_FILTERS = {
  client: "", status: "", urgency: "",
  probMin: "", probMax: "",
  valueMin: "", valueMax: "",
  createdFrom: "", createdTo: "",
  deadlineFrom: "", deadlineTo: "",
  updatedFrom: "", updatedTo: "",
};

// `view` is the ACTIVE SUB-SECTION key, so each sub-section is its own screen:
//   sales           -> the dashboard: pipeline aggregates and analytics
//   sales-tickets   -> the tickets list + form
//   sales-clients   -> the clients list + form
//   sales-settings  -> services, vocabulary and the Live view columns
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

  // The ticket page's Edit button links back here with ?edit=<id>, because the
  // form lives with the list that owns it rather than being duplicated there.
  // Consumed once and stripped from the URL, so a refresh does not reopen it.
  useEffect(() => {
    if (!data) return;
    const want = new URLSearchParams(window.location.search).get("edit");
    if (!want) return;
    const row = (data.tickets || []).find((t) => t.id === want);
    if (row) setEditing({ kind: "ticket", row });
    const url = new URL(window.location.href);
    url.searchParams.delete("edit");
    window.history.replaceState({}, "", url);
  }, [data]);

  // A colleague raised or moved a ticket - reflect it without a refresh.
  useLiveUpdates(slug, "sales", load);
  // An RFQ raised on a ticket changes what its RFQ column says, and that
  // happens in Technical — so this board watches that section too.
  useLiveUpdates(slug, "technical", load);

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
        : out.error === "already" ? "That ticket is already with Technical."
        : out.error === "no-technical" ? "This studio has no Technical section to send an RFQ to."
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

  const { canManage, canManageSettings, clients, tickets, people, vocabulary, nav, liveColumns, services, hasTechnical } = data;
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
        {/* The client form is a DIALOG for the same reason the ticket one is:
            with contacts and locations it is long enough that inline it pushed
            the list it is about off the screen. */}
        {editing?.kind === "client" && (
          <Dialog
            title={editing.row ? `Edit ${editing.row.name}` : "Add client"}
            description="A client is a company you sell to. Fields marked * are required."
            onClose={closeEditing}
          >
            <ClientForm row={editing.row} cities={data.salesCities || []} positions={data.salesContactPositions || []}
              onCancel={closeEditing}
              onSave={(payload) => send("clients", editing.row ? "PUT" : "POST", editing.row ? { ...payload, id: editing.row.id } : payload)} />
          </Dialog>
        )}
        <Clients clients={clients} tickets={tickets} people={people} canManage={canManage} focus={focusClient}
          onAdd={() => setEditing({ kind: "client", row: null })}
          onEdit={(row) => setEditing({ kind: "client", row })}
          onDelete={(row) => send("clients", "DELETE", { id: row.id })} />
      </div>
    );
  }

  if (view === "sales-tickets") {
    return (
      <div className="space-y-6">
        {banner}
        {/* Raising a ticket opens a DIALOG rather than unfolding a panel above
            the table: the form is long enough that inline it pushed the list
            it is about off the screen. */}
        {editing?.kind === "ticket" && (
          <Dialog
            title={editing.row ? `Edit ${editing.row.ref}` : "New ticket"}
            description="Fields marked * are required."
            onClose={closeEditing}
          >
            <TicketForm row={editing.row} clients={clients} vocabulary={vocabulary}
              services={services || []} cities={data.salesCities || []} positions={data.salesContactPositions || []}
              studioDefaults={data.studioDefaults || {}}
              onCancel={closeEditing}
              onSave={(payload) => send("tickets", editing.row ? "PUT" : "POST", editing.row ? { ...payload, id: editing.row.id } : payload)} />
          </Dialog>
        )}
        <Tickets tickets={tickets} people={people} canManage={canManage} slug={slug} nav={nav} focus={focusTicket}
          hasTechnical={hasTechnical} statuses={vocabulary.statuses || []} urgencies={vocabulary.urgencies || []}
          onAdd={() => setEditing({ kind: "ticket", row: null })}
          onEdit={(row) => setEditing({ kind: "ticket", row })}
          onRequestRfq={(row) => send("tickets/rfq", "POST", { ticketId: row.id })} />
      </div>
    );
  }

  // Parent section: the Sales dashboard.
  return (
    <div className="space-y-6">
      {banner}
      <SalesDashboard slug={slug} tickets={tickets} clients={clients} people={people} nav={nav} />
    </div>
  );
}

// ---- dashboard -------------------------------------------------------------
// Opportunities, leads and tickets across the sales team: the aggregates first,
// then the whole list, then the pipeline analytics underneath.
function SalesDashboard({ slug, tickets, clients, people, nav }) {
  const aliasOf = useMemo(() => Object.fromEntries(people.map((p) => [p.id, p.alias])), [people]);

  const stats = useMemo(() => ({
    leads: tickets.filter((t) => t.status === "Lead").length,
    opportunities: tickets.filter((t) => t.status === "Opportunity").length,
    // Every "+ another RFQ" counts, not one per ticket — this is how much work
    // Sales has actually handed over.
    rfqRequested: tickets.reduce((a, t) => a + (t.rfqCount || 0), 0),
    pipelineValue: tickets.reduce((a, t) => a + (Number(t.value) || 0), 0),
  }), [tickets]);

  const tiles = [
    { label: "Leads", value: stats.leads, key: "sales-tickets" },
    { label: "Opportunities", value: stats.opportunities, key: "sales-tickets" },
    { label: "RFQ requested", value: stats.rfqRequested, key: "sales-tickets" },
    { label: "Pipeline value", value: money(stats.pipelineValue), key: "sales-tickets" },
  ];

  const recent = useMemo(
    () => [...tickets].sort((a, b) => (b.updatedAt || b.createdAt || "").localeCompare(a.updatedAt || a.createdAt || "")),
    [tickets],
  );

  return (
    <>
      <section className={panel}>
        <h2 className={h2}>Sales</h2>
        <p className={sub}>Opportunities, leads and tickets across the sales team. {clients.length} client{clients.length === 1 ? "" : "s"} on file.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {tiles.map((t) => (
            <StatTile key={t.label} label={t.label} value={t.value} href={nav?.[t.key] ? `/${slug}/${t.key}` : ""} />
          ))}
        </div>
      </section>

      {/* Live view — a full-screen, auto-refreshing tickets table. Its columns
          are a shared setting configured in Sales → Settings. */}
      {nav?.["sales-live"] && (
        <section className={`${panel} flex flex-wrap items-center justify-between gap-3`}>
          <div className="min-w-0">
            <p className={microLabel}>Live view</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              A full-screen tickets table that refreshes on its own. Columns are configured in{" "}
              {nav?.["sales-settings"]
                ? <a href={`/${slug}/sales-settings`} className="font-600 text-brand-700 hover:underline dark:text-brand-300">Sales → Settings</a>
                : <span className="font-600">Sales → Settings</span>}.
            </p>
          </div>
          <a href={`/${slug}/sales-live`} className={btn}>Open live view →</a>
        </section>
      )}

      <section className={panel}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className={microLabel}>All tickets</p>
          {nav?.["sales-tickets"] && <a href={`/${slug}/sales-tickets`} className="text-xs font-600 text-brand-700 hover:underline dark:text-brand-300">Open tickets →</a>}
        </div>
        {recent.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">No tickets yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-start dark:border-white/10">
                  {["Title", "Client", "Owner", "Value", "RFQ", "Status", "Updated"].map((head) => (
                    <th key={head} className={`${th} text-start`}>{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map((t) => {
                  const rfq = rfqInfo(t);
                  return (
                    <tr key={t.id} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                      <td className="py-3 pe-3 font-600 text-slate-900 dark:text-white">{t.title}</td>
                      <td className="py-3 pe-3 text-slate-600 dark:text-slate-300">{t.clientName || "—"}</td>
                      <td className="py-3 pe-3 text-slate-600 dark:text-slate-300">{aliasOf[t.assignedToCollaboratorId] || "Unassigned"}</td>
                      <td className="py-3 pe-3 tabular-nums text-slate-600 dark:text-slate-300">{money(t.value)}</td>
                      <td className={`py-3 pe-3 text-xs font-600 ${rfq.tone}`}>{rfq.text}</td>
                      <td className="py-3 pe-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-600 ${STATUS_TONE[t.status] || STATUS_TONE.Lead}`}>{t.status}</span>
                      </td>
                      <td className="py-3 text-slate-500 dark:text-slate-400">{fmtDate(t.updatedAt || t.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <SalesAnalytics slug={slug} tickets={tickets} nav={nav} />
    </>
  );
}

// Pipeline analytics: the funnel, a probability-weighted forecast, and what is
// about to go wrong.
function SalesAnalytics({ slug, tickets, nav }) {
  const funnel = useMemo(() => salesFunnel(tickets), [tickets]);
  const buckets = useMemo(() => probabilityBuckets(tickets), [tickets]);
  const atRisk = useMemo(() => atRiskTickets(tickets, 14), [tickets]);
  const forecast = useMemo(() => buckets.reduce((a, b) => a + b.weighted, 0), [buckets]);

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className={panel}>
          <WidgetTitle hint="Distinct tickets that reached each stage">Sales funnel</WidgetTitle>
          <FunnelChart data={funnel} />
        </section>

        <section className={panel}>
          <WidgetTitle hint={`Weighted forecast (value × probability): ${money(forecast)}`}>Probability forecast</WidgetTitle>
          <BarBreakdown data={buckets.map((b) => ({ label: b.label, value: b.count }))} />
          <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 dark:border-white/10">
            {buckets.map((b) => (
              <div key={b.label} className="flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-500 dark:text-slate-400">{b.label}</span>
                <span className="text-slate-400 dark:text-slate-500">
                  <span className="font-600 tabular-nums text-slate-600 dark:text-slate-300">{money(b.value)}</span> pipeline ·{" "}
                  <span className="font-600 tabular-nums text-emerald-600 dark:text-emerald-400">{money(b.weighted)}</span> weighted
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className={panel}>
        <WidgetTitle hint="Open tickets due within 14 days or flagged High/Critical">At-risk tickets</WidgetTitle>
        {atRisk.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">Nothing at risk — all clear.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {atRisk.slice(0, 8).map((t) => {
              const d = t.deadline ? daysUntil(t.deadline) : null;
              const overdue = d !== null && d < 0;
              return (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${URGENCY_DOT[t.urgency] || URGENCY_DOT.Normal}`} title={t.urgency || "Normal"} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-600 text-slate-900 dark:text-white">{t.title}</p>
                      <p className="truncate text-xs text-slate-400 dark:text-slate-500">{t.clientName || "—"} · {t.status}</p>
                    </div>
                  </div>
                  <span className={`shrink-0 text-xs font-600 ${overdue ? "text-rose-600 dark:text-rose-400" : "text-slate-500 dark:text-slate-400"}`}>
                    {d === null ? "No date" : overdue ? `${Math.abs(d)}d overdue` : `${d}d left`}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {nav?.["sales-tickets"] && (
          <div className="mt-3 text-end">
            <a href={`/${slug}/sales-tickets`} className="text-xs font-600 text-brand-700 hover:underline dark:text-brand-300">Open tickets →</a>
          </div>
        )}
      </section>
    </>
  );
}

// ---- tickets ---------------------------------------------------------------
function Tickets({ tickets, people, canManage, slug, nav, focus, hasTechnical, statuses, urgencies, onAdd, onEdit, onRequestRfq }) {
  const aliasOf = useMemo(() => Object.fromEntries(people.map((p) => [p.id, p.alias])), [people]);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [columns, setColumns] = useState(DEFAULT_TICKET_COLUMNS);
  const [showColumns, setShowColumns] = useState(false);
  const [rfqBusy, setRfqBusy] = useState("");

  // Read the saved preferences AFTER mount: localStorage does not exist on the
  // server, so reading it during render would make the first paint disagree
  // with the markup React sent.
  const colsKey = prefKey("sales", slug, "cols");
  const filtersKey = prefKey("sales", slug, "filters");
  useEffect(() => {
    const saved = loadPref(colsKey, null);
    setColumns(Array.isArray(saved) && saved.length ? saved.filter((k) => TICKET_COLUMNS.some((c) => c.key === k)) : DEFAULT_TICKET_COLUMNS);
    setFilters({ ...EMPTY_FILTERS, ...(loadPref(filtersKey, null) || {}) });
  }, [colsKey, filtersKey]);

  const col = (key) => columns.includes(key) && (key !== "rfq" || hasTechnical);
  const toggleCol = (key) => setColumns((prev) => {
    const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
    savePref(colsKey, next);
    return next;
  });
  const resetCols = () => { setColumns(DEFAULT_TICKET_COLUMNS); savePref(colsKey, DEFAULT_TICKET_COLUMNS); };
  const setFilter = (patch) => setFilters((prev) => { const next = { ...prev, ...patch }; savePref(filtersKey, next); return next; });
  const clearFilters = () => { setFilters(EMPTY_FILTERS); savePref(filtersKey, EMPTY_FILTERS); };
  const activeFilters = Object.values(filters).filter((v) => v !== "").length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const f = filters;
    const num = (v) => (v === "" || v == null ? null : Number(v));
    const probMin = num(f.probMin), probMax = num(f.probMax);
    const valMin = num(f.valueMin), valMax = num(f.valueMax);
    return tickets.filter((t) => {
      if (f.status && t.status !== f.status) return false;
      if (f.urgency && (t.urgency || "Normal") !== f.urgency) return false;
      if (f.client && !`${t.clientName || ""}`.toLowerCase().includes(f.client.toLowerCase())) return false;
      const p = Number(t.probability ?? 0);
      if (probMin != null && Number.isFinite(probMin) && p < probMin) return false;
      if (probMax != null && Number.isFinite(probMax) && p > probMax) return false;
      const value = Number(t.value ?? 0);
      if (valMin != null && Number.isFinite(valMin) && value < valMin) return false;
      if (valMax != null && Number.isFinite(valMax) && value > valMax) return false;
      const created = (t.createdAt || "").slice(0, 10);
      if (f.createdFrom && created < f.createdFrom) return false;
      if (f.createdTo && created > f.createdTo) return false;
      const deadline = (t.deadline || "").slice(0, 10);
      if (f.deadlineFrom && (!deadline || deadline < f.deadlineFrom)) return false;
      if (f.deadlineTo && (!deadline || deadline > f.deadlineTo)) return false;
      const updated = (t.updatedAt || t.createdAt || "").slice(0, 10);
      if (f.updatedFrom && updated < f.updatedFrom) return false;
      if (f.updatedTo && updated > f.updatedTo) return false;
      if (q && !`${t.title || ""} ${t.clientName || ""} ${t.ref || ""} ${t.description || ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tickets, query, filters]);

  async function requestRfq(row) {
    setRfqBusy(row.id);
    await onRequestRfq(row);
    setRfqBusy("");
  }

  // No "add a client first" gate: naming an unknown client on the ticket form
  // creates it, exactly as the Old System does.
  if (tickets.length === 0) {
    return (
      <>
        <Toolbar canManage={canManage} label="New ticket" onAdd={onAdd} />
        <Empty title="No tickets yet" body="A ticket is a piece of work you're chasing for a client — a lead, an enquiry, an opportunity." />
      </>
    );
  }

  return (
    <>
      <Toolbar canManage={canManage} label="New ticket" onAdd={onAdd}>
        <input type="search" className={`${input} sm:max-w-xs`} placeholder="Search title, client, ref or description…"
          value={query} onChange={(e) => setQuery(e.target.value)} />
        <FilterButton active={activeFilters} open={showFilters} onClick={() => setShowFilters((v) => !v)} />
        <button type="button" className={btnGhost} onClick={() => setShowColumns(true)}>Columns</button>
      </Toolbar>

      {showFilters && (
        <FilterPanel onClear={clearFilters}>
          <div>
            <label className={microLabel}>Client</label>
            <input className={input} placeholder="Client contains…" value={filters.client} onChange={(e) => setFilter({ client: e.target.value })} />
          </div>
          <div>
            <label className={microLabel}>Status</label>
            <select className={input} value={filters.status} onChange={(e) => setFilter({ status: e.target.value })}>
              <option value="">Any status</option>
              {statuses.map((s) => (<option key={s} value={s}>{s}</option>))}
            </select>
          </div>
          <div>
            <label className={microLabel}>Urgency</label>
            <select className={input} value={filters.urgency} onChange={(e) => setFilter({ urgency: e.target.value })}>
              <option value="">Any urgency</option>
              {urgencies.map((u) => (<option key={u} value={u}>{u}</option>))}
            </select>
          </div>
          <div>
            <label className={microLabel}>Probability (%)</label>
            <div className="flex items-center gap-2">
              <input type="number" min="0" max="100" placeholder="min" className={input} value={filters.probMin} onChange={(e) => setFilter({ probMin: e.target.value })} />
              <span className="text-slate-400">–</span>
              <input type="number" min="0" max="100" placeholder="max" className={input} value={filters.probMax} onChange={(e) => setFilter({ probMax: e.target.value })} />
            </div>
          </div>
          <div>
            <label className={microLabel}>Value</label>
            <div className="flex items-center gap-2">
              <input type="number" min="0" placeholder="min" className={input} value={filters.valueMin} onChange={(e) => setFilter({ valueMin: e.target.value })} />
              <span className="text-slate-400">–</span>
              <input type="number" min="0" placeholder="max" className={input} value={filters.valueMax} onChange={(e) => setFilter({ valueMax: e.target.value })} />
            </div>
          </div>
          <div>
            <label className={microLabel}>Created</label>
            <div className="flex items-center gap-2">
              <input type="date" className={input} value={filters.createdFrom} onChange={(e) => setFilter({ createdFrom: e.target.value })} />
              <span className="text-slate-400">–</span>
              <input type="date" className={input} value={filters.createdTo} onChange={(e) => setFilter({ createdTo: e.target.value })} />
            </div>
          </div>
          <div>
            <label className={microLabel}>Deadline</label>
            <div className="flex items-center gap-2">
              <input type="date" className={input} value={filters.deadlineFrom} onChange={(e) => setFilter({ deadlineFrom: e.target.value })} />
              <span className="text-slate-400">–</span>
              <input type="date" className={input} value={filters.deadlineTo} onChange={(e) => setFilter({ deadlineTo: e.target.value })} />
            </div>
          </div>
          <div>
            <label className={microLabel}>Updated</label>
            <div className="flex items-center gap-2">
              <input type="date" className={input} value={filters.updatedFrom} onChange={(e) => setFilter({ updatedFrom: e.target.value })} />
              <span className="text-slate-400">–</span>
              <input type="date" className={input} value={filters.updatedTo} onChange={(e) => setFilter({ updatedTo: e.target.value })} />
            </div>
          </div>
        </FilterPanel>
      )}

      {showColumns && (
        <ColumnPicker
          title="Ticket columns"
          columns={TICKET_COLUMNS.filter((c) => c.key !== "rfq" || hasTechnical)}
          selected={columns} onToggle={toggleCol} onReset={resetCols}
          onClose={() => setShowColumns(false)}
        />
      )}

      <p className="text-sm text-slate-500 dark:text-slate-400">{filtered.length} of {tickets.length} ticket{tickets.length === 1 ? "" : "s"}.</p>

      <section className={panel}>
        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">No tickets match those filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-start dark:border-white/10">
                  {/* ps-2 matches the body cells, which are pushed in by the
                      4px status stripe down the start edge of every row. */}
                  {TICKET_COLUMNS.filter((c) => col(c.key)).map((c) => (
                    <th key={c.key} className={`${th} ps-2 text-start`}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const rfq = rfqInfo(t);
                  // A ticket still waiting to be handed to Technical gets an
                  // amber stripe down its start edge, so what needs doing is
                  // visible without reading the RFQ column on every row.
                  const unresolved = hasTechnical && isUnresolved(t);
                  return (
                    <tr key={t.id} {...focus.focusProps(t.id)}
                      onClick={() => { window.location.assign(`/${slug}/sales-tickets/${t.id}`); }}
                      tabIndex={0}
                      role="link"
                      aria-label={`Open ${t.ref}`}
                      onKeyDown={(e) => { if (e.key === "Enter") window.location.assign(`/${slug}/sales-tickets/${t.id}`); }}
                      className={`cursor-pointer border-s-4 border-b border-slate-100 last:border-b-0 dark:border-white/5 ${
                        unresolved ? stripeOn : stripeOff
                      } ${focus.focusProps(t.id).className || ""}`}>
                      {col("createdAt") && <td className="py-3 pe-3 ps-2 text-slate-500 dark:text-slate-400">{fmtDate(t.createdAt)}</td>}
                      {col("ref") && <td className="py-3 pe-3 ps-2 font-mono text-xs text-slate-500 dark:text-slate-400">{t.ref}</td>}
                      {col("title") && (
                        <td className="py-3 pe-3 ps-2">
                          <span className="font-600 text-slate-900 dark:text-white">{t.title}</span>
                          {t.urgency && t.urgency !== "Normal" && (
                            <span className={`ms-2 text-xs font-600 ${URGENCY_TONE[t.urgency] || "text-slate-400"}`}>{t.urgency}</span>
                          )}
                        </td>
                      )}
                      {col("client") && (
                        <td className="py-3 pe-3 ps-2">
                          {t.clientName
                            ? <RecordLink href={linkToClient(slug, t.clientId)} mono={false} title={`Open ${t.clientName}`}>{t.clientName}</RecordLink>
                            : <span className="text-slate-400">—</span>}
                        </td>
                      )}
                      {col("owner") && <td className="py-3 pe-3 ps-2 text-slate-600 dark:text-slate-300">{aliasOf[t.assignedToCollaboratorId] || "Unassigned"}</td>}
                      {col("value") && <td className="py-3 pe-3 ps-2 tabular-nums text-slate-600 dark:text-slate-300">{money(t.value)}</td>}
                      {col("deadline") && <td className="py-3 pe-3 ps-2 text-slate-600 dark:text-slate-300">{fmtDate(t.deadline)}</td>}
                      {col("status") && (
                        <td className="py-3 pe-3 ps-2">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-600 ${STATUS_TONE[t.status] || STATUS_TONE.Lead}`}>{t.status}</span>
                        </td>
                      )}
                      {col("urgency") && (
                        <td className="py-3 pe-3 ps-2">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-600 ${URGENCY_BADGE[t.urgency] || URGENCY_BADGE.Normal}`}>{t.urgency || "Normal"}</span>
                        </td>
                      )}
                      {col("rfq") && (
                        <td className="py-3 pe-3 ps-2">
                          {!rfq.requested
                            ? (canManage && isUnresolved(t)
                                ? <button type="button" className={btnAmber} disabled={rfqBusy === t.id} onClick={() => requestRfq(t)}>
                                    {rfqBusy === t.id ? "Sending…" : "Request RFQ"}
                                  </button>
                                : <span className="text-slate-400">—</span>)
                            : (
                              <div>
                                <div className={`text-xs font-600 ${rfq.tone}`}>{rfq.text}</div>
                                {t.rfqCount > 1 && <div className="text-[11px] text-slate-400">{t.rfqCount} raised</div>}
                              </div>
                            )}
                        </td>
                      )}
                      {col("probability") && <td className="py-3 pe-3 ps-2 font-600 tabular-nums text-slate-700 dark:text-slate-200">{Number(t.probability ?? 0)}%</td>}
                      {col("updatedAt") && <td className="py-3 pe-3 ps-2 text-slate-500 dark:text-slate-400">{fmtDate(t.updatedAt || t.createdAt)}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

// ---- clients ---------------------------------------------------------------
// A table rather than cards: a client is read across its columns — who to call,
// where the site is, when it came in — and columns line those up between rows.
function Clients({ clients, tickets, people, canManage, focus, onAdd, onEdit, onDelete }) {
  const aliasOf = useMemo(() => Object.fromEntries(people.map((p) => [p.id, p.alias])), [people]);
  const ticketCount = useMemo(() => {
    const counts = {};
    for (const t of tickets) counts[t.clientId] = (counts[t.clientId] || 0) + 1;
    return counts;
  }, [tickets]);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => {
      const contacts = (c.contacts || []).map((p) => `${p.name} ${p.email} ${p.phone}`).join(" ");
      const locations = (c.locations || []).map((l) => `${l.name} ${l.city}`).join(" ");
      return `${c.name} ${c.code} ${c.industry || ""} ${contacts} ${locations}`.toLowerCase().includes(q);
    });
  }, [clients, query]);

  if (clients.length === 0) {
    return (
      <>
        <Toolbar canManage={canManage} label="Add client" onAdd={onAdd} />
        <Empty title="No clients yet" body="Add the companies you sell to. Tickets, and later quotations and projects, hang off them." />
      </>
    );
  }

  return (
    <>
      <Toolbar canManage={canManage} label="Add client" onAdd={onAdd}>
        <input type="search" className={`${input} sm:max-w-xs`} placeholder="Search name, contact or city…"
          value={query} onChange={(e) => setQuery(e.target.value)} />
      </Toolbar>

      <p className="text-sm text-slate-500 dark:text-slate-400">
        Clients added here or by naming a new one on a ticket. {filtered.length} of {clients.length}.
      </p>

      <section className={panel}>
        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">No clients match that search.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-start dark:border-white/10">
                  {["Name", "Contact", "Location", "Tickets", "Date added", "Added by"].map((head) => (
                    <th key={head} className={`${th} text-start`}>{head}</th>
                  ))}
                  <th className={`${th} text-end`} />
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} {...focus.focusProps(c.id)}
                    className={`border-b border-slate-100 align-top last:border-0 dark:border-white/5 ${focus.focusProps(c.id).className || ""}`}>
                    <td className="py-3 pe-3">
                      <p className="font-600 text-slate-900 dark:text-white">{c.name}</p>
                      <p className="font-mono text-[11px] text-slate-400">{c.code}</p>
                      {c.industry && <p className="text-xs text-slate-500 dark:text-slate-400">{c.industry}</p>}
                    </td>
                    <td className="py-3 pe-3">
                      {(c.contacts || []).length === 0 ? <span className="text-slate-400">—</span> : (
                        <div className="flex flex-col gap-1.5 text-xs">
                          {c.contacts.map((p, i) => (
                            <div key={i}>
                              {p.position && <span className="me-1 rounded-full bg-brand-500/10 px-1.5 py-0.5 text-[10px] font-600 text-brand-700 dark:text-brand-300">{p.position}</span>}
                              {p.name && <span className="font-600 text-slate-700 dark:text-slate-200">{p.name} · </span>}
                              <span className="text-slate-600 dark:text-slate-300">{p.email || "—"}</span>
                              {p.phone && <span className="text-slate-400"> · {p.phone}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3 pe-3">
                      {(c.locations || []).length === 0 ? <span className="text-slate-400">—</span> : (
                        <div className="flex flex-col gap-1.5 text-xs">
                          {c.locations.map((l, i) => (
                            <div key={i} className="flex items-center gap-1">
                              {l.name && <span className="font-600 text-slate-700 dark:text-slate-200">{l.name}</span>}
                              {l.city && <span className="text-slate-400">· {l.city}</span>}
                              {l.url && (
                                <a href={l.url} target="_blank" rel="noreferrer" title="Open location"
                                  className="text-brand-700 dark:text-brand-300"><Icon name="location" className="h-3.5 w-3.5" /></a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3 pe-3 tabular-nums text-slate-600 dark:text-slate-300">{ticketCount[c.id] || 0}</td>
                    <td className="py-3 pe-3 text-slate-500 dark:text-slate-400">{fmtDate(c.createdAt)}</td>
                    <td className="py-3 pe-3 text-slate-600 dark:text-slate-300">{aliasOf[c.createdByCollaboratorId] || "—"}</td>
                    <td className="py-3 text-end">
                      {canManage && (
                        <span className="inline-flex gap-2">
                          <button className={btnGhost} onClick={() => onEdit(c)}>Edit</button>
                          <button className={btnGhost} onClick={() => onDelete(c)}>Delete</button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

// ---- forms -----------------------------------------------------------------
// A repeatable row editor for the lists a client owns (contacts, locations).
// The Old System keeps SEVERAL of each — different people and sites for the
// same company — so editing one must never be a way to lose the others.
function RowList({ title, help, rows, columns, onChange, addLabel }) {
  const blank = Object.fromEntries(columns.map((c) => [c.key, ""]));
  const setCell = (i, key, value) => onChange(rows.map((r, n) => (n === i ? { ...r, [key]: value } : r)));
  return (
    <div className="mt-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">{title}</p>
          {help && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{help}</p>}
        </div>
        <button type="button" className={btnGhost} onClick={() => onChange([...rows, blank])}>{addLabel}</button>
      </div>
      {rows.length === 0 ? (
        <p className="mt-2 text-xs text-slate-400">None yet.</p>
      ) : (
        <div className="mt-2 space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/15 dark:bg-[#191921]">
              <div className="grid flex-1 gap-2 sm:grid-cols-2">
                {columns.map((c) => (
                  <div key={c.key}>
                    <label className={microLabel}>{c.label}</label>
                    {c.options
                      ? <Combo value={r[c.key] || ""} onChange={(v) => setCell(i, c.key, v)} options={c.options} placeholder={c.placeholder || ""} />
                      : <input className={input} type={c.type || "text"} value={r[c.key] || ""} placeholder={c.placeholder || ""}
                          onChange={(e) => setCell(i, c.key, e.target.value)} />}
                  </div>
                ))}
              </div>
              <button type="button" aria-label="Remove" title="Remove"
                className="mt-6 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-white hover:text-rose-600 dark:hover:bg-white/5"
                onClick={() => onChange(rows.filter((_, n) => n !== i))}>
                <Icon name="close" className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ClientForm({ row, cities, positions, onSave, onCancel }) {
  const [f, setF] = useState({
    name: row?.name || "", industry: row?.industry || "", website: row?.website || "", notes: row?.notes || "",
  });
  // Every contact and location the client already has, edited in place — the
  // form sends the WHOLE list back, so anything it doesn't show would be lost.
  const [contacts, setContacts] = useState(row?.contacts || []);
  const [locations, setLocations] = useState(row?.locations || []);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className={label}>Company name *</label><input className={input} value={f.name} onChange={set("name")} placeholder="Acme Trading Co." /></div>
        <div><label className={label}>Industry</label><input className={input} value={f.industry} onChange={set("industry")} /></div>
        <div><label className={label}>Website</label><input className={input} value={f.website} onChange={set("website")} placeholder="acme.com" /></div>
      </div>

      <RowList
        title="Contacts" help="The people you deal with there. A ticket folds its contact in here automatically."
        rows={contacts} onChange={setContacts} addLabel="Add contact"
        columns={[
          { key: "name", label: "Name" },
          { key: "position", label: "Position", options: positions, placeholder: "Procurement Manager" },
          { key: "email", label: "Email", type: "email" },
          { key: "phone", label: "Phone" },
        ]}
      />

      <RowList
        title="Locations" help="Sites this client has. A ticket's location is folded in here too."
        rows={locations} onChange={setLocations} addLabel="Add location"
        columns={[
          { key: "name", label: "Site name" },
          { key: "city", label: "City", options: cities, placeholder: "Riyadh" },
          { key: "url", label: "Map link" },
        ]}
      />

      <div className="mt-5"><label className={label}>Notes</label><textarea rows={3} className={input} value={f.notes} onChange={set("notes")} /></div>

      <div className="mt-5 flex gap-3">
        <button className={btn} disabled={busy || !f.name.trim()} onClick={async () => {
          setBusy(true);
          await onSave({ name: f.name, industry: f.industry, website: f.website, notes: f.notes, contacts, locations });
          setBusy(false);
        }}>{busy ? "Saving…" : "Save client"}</button>
        <button className={btnGhost} onClick={onCancel}>Cancel</button>
      </div>
    </>
  );
}

function TicketForm({ row, clients, vocabulary, services = [], cities = [], positions = [], studioDefaults = {}, onSave, onCancel }) {
  // Fields mirror the Old System's ticket. Mandatory: title, client, deadline,
  // type of industry. Value is NOT here on purpose — it is filled from an
  // approved quotation, and Client Budget is the client's own manual figure.
  // Status and urgency appear only when EDITING: on creation status is always
  // Lead (→ Opportunity on RFQ request) and urgency always Normal.
  const existing = row ? clients.find((c) => c.id === row.clientId) : null;

  const [f, setF] = useState({
    title: row?.title || "",
    clientName: row?.clientName || existing?.name || "",
    contactName: row?.contactName || "", contactEmail: row?.contactEmail || "",
    contactPhone: row?.contactPhone || "", contactPosition: row?.contactPosition || "",
    locationName: row?.location?.name || "",
    // A NEW ticket starts at the studio's own country and city; an existing
    // one keeps whatever it was raised with.
    locationCountry: row?.location?.country || (row ? "" : studioDefaults.country || ""),
    locationCity: row?.location?.city || (row ? "" : studioDefaults.city || ""),
    locationUrl: row?.location?.url || "",
    deadline: row?.deadline || "", industry: row?.industry || "",
    clientBudget: row?.clientBudget ?? "",
    description: row?.description || "",
    status: row?.status || "Lead", urgency: row?.urgency || "Normal",
    probability: Number(row?.probability ?? 0),
  });
  // The sites this client already has — what Site name searches, and where a
  // chosen site's country, city and map link are read back from. Locations are
  // stored on the CLIENT, so a site named once is offered on every later
  // ticket for them instead of being retyped.
  const clientLocations = useMemo(() => {
    const name = String(f.clientName || "").trim().toLowerCase();
    const c = clients.find((x) => String(x.name || "").trim().toLowerCase() === name);
    return Array.isArray(c?.locations) ? c.locations : [];
  }, [clients, f.clientName]);

  const [serviceIds, setServiceIds] = useState(row?.serviceIds || []);
  const [reqs, setReqs] = useState(row?.serviceRequirements || {});
  const toggleService = (id) => setServiceIds((v) => v.includes(id) ? v.filter((x) => x !== id) : [...v, id]);
  const setReq = (id, field) => setReqs((r) => ({ ...r, [id]: { ...(r[id] || {}), [field]: !(r[id] || {})[field] } }));
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const ready = f.title.trim() && f.clientName.trim() && f.deadline && f.industry.trim() && serviceIds.length > 0;

  // The client the typed name resolves to, if any. Its contacts become the
  // suggestions below, and picking one fills in the email and phone — which
  // stay editable afterwards, so a person can be corrected without leaving.
  const matched = useMemo(() => {
    const q = f.clientName.trim().toLowerCase().replace(/\s+/g, " ");
    return q ? clients.find((c) => String(c.name || "").trim().toLowerCase().replace(/\s+/g, " ") === q) || null : null;
  }, [clients, f.clientName]);
  const knownContacts = (matched?.contacts || []).filter((c) => c.name);

  function pickContact(name) {
    const hit = knownContacts.find((c) => String(c.name || "").trim().toLowerCase() === String(name || "").trim().toLowerCase());
    setF((s) => (hit
      ? { ...s, contactName: name, contactEmail: hit.email || "", contactPhone: hit.phone || "", contactPosition: hit.position || s.contactPosition }
      : { ...s, contactName: name }));
  }

  // The title, the close button and the scrolling belong to the Dialog this
  // opens inside, so the form itself renders fields only.
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><label className={label}>Title *</label><input className={input} value={f.title} onChange={set("title")} placeholder="Site survey for new branch" /></div>

        <div>
          <label className={label}>Client *</label>
          {/* Free text with suggestions: an unknown name creates the client. */}
          {/* freeSolo matters here: typing a name that is not on the list is how
              a new client gets created, which the datalist also allowed. */}
          <Combo value={f.clientName} onChange={(v) => setF((p) => ({ ...p, clientName: v }))}
            options={clients.map((c) => c.name)} placeholder="Acme Trading" disabled={!!row} />
          {!row && (
            <p className="mt-1 text-[11px] text-slate-400">
              {matched ? `Existing client — ${(matched.contacts || []).length} contact${(matched.contacts || []).length === 1 ? "" : "s"} on file.` : "A name that isn't on the list creates a new client."}
            </p>
          )}
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
        <div>
          <label className={label}>Client budget</label>
          <input className={input} type="number" min="0" value={f.clientBudget} onChange={set("clientBudget")} placeholder="Optional reference figure" />
          <p className="mt-1 text-[11px] text-slate-400">The ticket&apos;s <span className="font-600">Value</span> is set automatically from an approved quotation.</p>
        </div>

        {row && (
          <>
            <div>
              <label className={label}>Status</label>
              <select className={input} value={f.status} onChange={set("status")}>
                {(vocabulary.statuses || []).map((s) => (<option key={s} value={s}>{s}</option>))}
              </select>
            </div>
            <div>
              <label className={label}>Urgency</label>
              <select className={input} value={f.urgency} onChange={set("urgency")}>
                {(vocabulary.urgencies || []).map((u) => (<option key={u} value={u}>{u}</option>))}
              </select>
            </div>
          </>
        )}

        <div className="sm:col-span-2">
          <label className={label}>Probability — {f.probability}%</label>
          <div className="flex items-center gap-3">
            <input type="range" min="0" max="100" step="1" value={f.probability}
              onChange={(e) => setF((s) => ({ ...s, probability: Number(e.target.value) }))}
              className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-brand-600 dark:bg-white/10" />
            <input type="number" min="0" max="100" value={f.probability} className={`${input} w-24`}
              onChange={(e) => setF((s) => ({ ...s, probability: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }))} />
          </div>
        </div>
      </div>

      <p className="mt-5 text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">Contact</p>
      <div className="mt-2 grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Name</label>
          {knownContacts.length > 0
            ? <Combo value={f.contactName} onChange={pickContact} options={knownContacts.map((c) => c.name)} placeholder="Search existing contacts or type a new name" />
            : <input className={input} value={f.contactName} onChange={set("contactName")} />}
        </div>
        <div>
          <label className={label}>Position</label>
          <Combo value={f.contactPosition} onChange={(v) => setF((p) => ({ ...p, contactPosition: v }))}
            options={positions} placeholder="Procurement Manager" />
        </div>
        <div><label className={label}>Email</label><input className={input} type="email" value={f.contactEmail} onChange={set("contactEmail")} /></div>
        <div><label className={label}>Phone</label><input className={input} value={f.contactPhone} onChange={set("contactPhone")} /></div>
      </div>

      <p className="mt-5 text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">Location</p>
      <div className="mt-2 grid gap-4 sm:grid-cols-3">
        <div>
          <label className={label}>Site name</label>
          {/* Behaves like Contact name: search the sites this client already
              has, or type a new one. Choosing a saved site fills the rest of
              this block from what was stored with it. */}
          <Combo
            value={f.locationName}
            onChange={(v) => setF((p) => {
              const saved = clientLocations.find((l) => String(l.name || "").trim().toLowerCase() === v.trim().toLowerCase());
              return saved
                ? { ...p, locationName: v, locationCountry: saved.country || p.locationCountry, locationCity: saved.city || "", locationUrl: saved.url || "" }
                : { ...p, locationName: v };
            })}
            options={clientLocations.map((l) => l.name).filter(Boolean)}
            placeholder="Head office"
          />
        </div>
        <div>
          <label className={label}>Country</label>
          <Combo value={f.locationCountry} onChange={(v) => setF((p) => ({ ...p, locationCountry: v, locationCity: "" }))}
            options={COUNTRY_NAMES} placeholder={studioDefaults.country || "Saudi Arabia"} />
        </div>
        <div>
          <label className={label}>City</label>
          <Combo value={f.locationCity} onChange={(v) => setF((p) => ({ ...p, locationCity: v }))}
            options={f.locationCountry ? citiesFor(codeOfCountry(f.locationCountry)) : cities}
            placeholder={studioDefaults.city || "Riyadh"} />
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

      <div className="mt-4"><label className={label}>Description</label><textarea rows={3} className={input} value={f.description} onChange={set("description")} /></div>

      <div className="mt-5 flex gap-3">
        <button className={btn} disabled={busy || !ready} onClick={async () => {
          setBusy(true);
          await onSave({
            title: f.title, clientName: f.clientName,
            contactName: f.contactName, contactEmail: f.contactEmail,
            contactPhone: f.contactPhone, contactPosition: f.contactPosition,
            location: { name: f.locationName, country: f.locationCountry, city: f.locationCity, url: f.locationUrl },
            deadline: f.deadline, industry: f.industry,
            serviceIds, serviceRequirements: reqs,
            clientBudget: f.clientBudget === "" ? null : f.clientBudget,
            description: f.description,
            probability: f.probability,
            // Only an edit may move these; on creation they are automated.
            ...(row ? { status: f.status, urgency: f.urgency } : {}),
          });
          setBusy(false);
        }}>{busy ? "Saving…" : "Save ticket"}</button>
        <button className={btnGhost} onClick={onCancel}>Cancel</button>
      </div>
    </>
  );
}

// ---- settings --------------------------------------------------------------
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
        <p className={sub}>Choose the ticket columns the Live view shows. This is a shared setting — it applies to everyone. At least one is kept.</p>
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
