"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import nextDynamic from "next/dynamic";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import useLiveRows from "@/components/studio2/useLiveRows";
import RecordLink from "@/components/studio2/RecordLink";
import { Icon } from "@/components/studio2/icons";
import { StudioDataGridSkeleton } from "@/components/studio2/StudioDataGrid.skeleton";
import Combo from "@/components/studio2/Combo";
import { Field, BARE_CONTROL } from "@/components/fields/Field";
import StudioDate from "@/components/fields/StudioDate";
import { useFocusedRecord } from "@/components/studio2/useFocusedRecord";
import {
  panel, h2, sub, input, microLabel, label, btn, btnGhost, btnAmber, th,
  URGENCY_BADGE, URGENCY_TONE, money, fmtDate, prefKey, loadPref, savePref,
  Dialog, Toolbar, FilterButton, FilterPanel, ColumnPicker, Empty,
} from "@/components/studio2/ui";
import { linkToClient } from "@/modules/main/studioLinks";
import { COUNTRIES } from "@/shared/countries";
import { citiesFor } from "@/lib/cities";
import { CurrencySymbol } from "@/components/Currency";
import { rfqInfo, isUnresolved } from "@/modules/sales/salesAnalytics";
import SalesDashboard from "@/components/studio2/SalesDashboard";
import { useAnalyticsLevel } from "@/components/studio2/analyticsLevel";
import { StatusPill } from "@/components/studio2/StatusPill";

// Sales: clients and the tickets raised against them. Read access shows
// everything; the Manage grant is what reveals the create/edit controls — and
// the API enforces the same rule, so hiding a button is never the only defence.
// The chrome — dialogs, toolbars, charts — comes from studio2/ui so this screen
// and Technical's are the same product rather than two lookalikes.

// Ticket-stage colours now live in the shared StatusPill map (kind "sales").
// Columns the tickets table can show. Every one is toggleable; the Actions
// column is not on the list because it is always drawn.
const TICKET_COLUMNS = [
  { key: "createdAt", label: "Created" },
  { key: "ref", label: "Ref" },
  { key: "title", label: "Title" },
  { key: "client", label: "Client" },
  { key: "owner", label: "Owner" },
  // Not "Value": the figure is the latest quotation's total, never typed.
  { key: "value", label: "Value Quoted" },
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

// The tickets list is a Data Grid now — the toggleable column SET is still the
// user's (built into the grid's `columns` from the same TICKET_COLUMNS keys and
// the same saved preference), but sorting and client-side paging come from the
// grid. Loaded in its own async chunk (never folded into Sales' initial bundle)
// — see StudioDataGrid's header. The skeleton reserves the box for the default
// column count plus the always-drawn Open action while that chunk arrives.
const StudioDataGrid = nextDynamic(() => import("@/components/studio2/StudioDataGrid"), {
  ssr: false,
  loading: () => <StudioDataGridSkeleton columns={8} pageSize={10} ariaLabel="Loading tickets" />,
});
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
  // The tickets list is a paginated Data Grid now, which can't scroll to a row
  // that may sit on another page — so the ticket deep-link's scroll-and-ring
  // (useFocusedRecord("ticket")) is gone. Clients still use theirs.
  const focusClient = useFocusedRecord("client");
  const level = useAnalyticsLevel();
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
  //
  // An EDIT to a ticket or a client replaces that one row; everything else still
  // reloads the board. See useLiveRows for why only updates are safe to patch:
  // a create or a delete changes the list's length and order, and the summary
  // figures above it.
  useLiveRows(slug, "sales", {
    load,
    setData,
    into: { salesTickets: "tickets", salesClients: "clients" },
  });

  // An RFQ raised on a ticket changes what its RFQ column says, and that happens
  // in Technical — so this board watches that section too. NOT patched: a
  // Technical event names a row in `rfqs` or `quotations`, and what it changes
  // here is a DERIVED column on some ticket whose id the event never mentions.
  // The board cannot know which row to ask for, so it asks for all of them.
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
        : out.error === "already" ? "That ticket is already with Technical — you can send it again once the quotation comes back."
        : out.error === "no-technical" ? "This studio has no Technical section to send an RFQ to."
        : out.error === "forbidden" || out.error === "sales-required" ? "You're not allowed to raise an RFQ."
        : out.error === "ticket" ? "That ticket no longer exists - reload the page."
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

  const { canManage: canManageParent, canManageTickets, canManageClients, canManageSettings, clients, tickets, people, vocabulary, nav, liveColumns, services, hasTechnical } = data;
  // MANAGE IS ASKED OF THE SCREEN BEING SHOWN. `view` is the section key, and
  // the map is keyed the same way, so a sub-section grant answers for its own
  // screen and the parent's answer no longer stands in for all of them.
  const canManage = data.manage?.[view] ?? canManageParent;

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
        <Clients clients={clients} tickets={tickets} people={people} canManage={canManageClients} focus={focusClient}
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
        <Tickets tickets={tickets} people={people} canManage={canManageTickets} slug={slug} nav={nav}
          hasTechnical={hasTechnical} statuses={vocabulary.statuses || []} urgencies={vocabulary.urgencies || []}
          onAdd={() => setEditing({ kind: "ticket", row: null })}
          onEdit={(row) => setEditing({ kind: "ticket", row })}
          />
      </div>
    );
  }

  // Parent section: the Sales dashboard. It summarises every ticket in the
  // department, so it answers to sales.dashboard.view rather than riding in on
  // whatever sub-section grant got somebody this far.
  return (
    <div className="space-y-6">
      {banner}
      {data.canViewDashboard === false
        ? <Empty title="The dashboard isn't yours to see" body="This studio keeps its module dashboards behind a right of their own. The screens underneath are unaffected — pick one from the sidebar." />
        : <SalesOverview slug={slug} tickets={tickets} clients={clients} people={people} nav={nav} level={level} />}
    </div>
  );
}

// ---- dashboard -------------------------------------------------------------
// The department overview: the header, then the analytics dashboard (KPIs and
// widgets, in SalesDashboard), then the live view and the full ticket list.
// The dashboard itself is presentational and paid-rung-gated; this wrapper only
// supplies it the ticket list the screen already holds and the studio's rung.
function SalesOverview({ slug, tickets, clients, people, nav, level }) {
  const aliasOf = useMemo(() => Object.fromEntries(people.map((p) => [p.id, p.alias])), [people]);

  const recent = useMemo(
    () => [...tickets].sort((a, b) => (b.updatedAt || b.createdAt || "").localeCompare(a.updatedAt || a.createdAt || "")),
    [tickets],
  );

  return (
    <>
      <section className={panel}>
        <h2 className={h2}>Sales</h2>
        <p className={sub}>Opportunities, leads and tickets across the sales team. {clients.length} client{clients.length === 1 ? "" : "s"} on file.</p>
      </section>

      <SalesDashboard tickets={tickets} level={level} slug={slug} nav={nav} />

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
                  {["Title", "Client", "Owner", "Value Quoted", "RFQ", "Status", "Updated"].map((head) => (
                    <th key={head} className={`${th} text-start`}>{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map((t) => {
                  const rfq = rfqInfo(t, aliasOf);
                  return (
                    <tr key={t.id} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                      <td className="py-3 pe-3 font-600 text-slate-900 dark:text-white">{t.title}</td>
                      <td className="py-3 pe-3 text-slate-600 dark:text-slate-300">{t.clientName || "—"}</td>
                      <td className="py-3 pe-3 text-slate-600 dark:text-slate-300">{aliasOf[t.assignedToCollaboratorId] || "Unassigned"}</td>
                      <td className="py-3 pe-3 tabular-nums text-slate-600 dark:text-slate-300">{money(t.value)}</td>
                      <td className={`py-3 pe-3 text-xs font-600 ${rfq.tone}`}>{rfq.text}</td>
                      <td className="py-3 pe-3">
                        <StatusPill kind="sales" status={t.status} />
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
    </>
  );
}

// ---- tickets ---------------------------------------------------------------
// The list REPORTS. Acting on a ticket — Request RFQ, Send for Approval,
// Submit PO — happens on the ticket's own page, where the three sit together
// in the order they happen, rather than one of them being smuggled into a
// column of a table whose rows are links.
function Tickets({ tickets, people, canManage, slug, nav, hasTechnical, statuses, urgencies, onAdd, onEdit }) {
  const aliasOf = useMemo(() => Object.fromEntries(people.map((p) => [p.id, p.alias])), [people]);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [columns, setColumns] = useState(DEFAULT_TICKET_COLUMNS);
  const [showColumns, setShowColumns] = useState(false);

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

  // Augment each row with the values the grid sorts and renders on: the owner's
  // ALIAS (so the Owner column sorts by name, not by CollaboratorID), the RFQ
  // status object rfqInfo derives, and whether the ticket is still unresolved —
  // the amber start-edge stripe. Computed once here rather than per cell.
  const gridRows = useMemo(() => filtered.map((t) => ({
    ...t,
    ownerName: aliasOf[t.assignedToCollaboratorId] || "Unassigned",
    _rfq: rfqInfo(t, aliasOf),
    _unresolved: hasTechnical && isUnresolved(t),
  })), [filtered, aliasOf, hasTechnical]);

  // One column def per TICKET_COLUMNS key. The grid shows only the keys the
  // user has turned on (via `col`), in the fixed TICKET_COLUMNS order, then the
  // always-drawn Open action — which is what carries KEYBOARD navigation to the
  // ticket's own page now that the row is no longer a semantic link. `value` and
  // `probability` keep number-typed sorting but their original left alignment.
  const openTicket = (id) => window.location.assign(`/${slug}/sales-tickets/${id}`);
  const colDefs = useMemo(() => ({
    createdAt: { field: "createdAt", headerName: "Created", minWidth: 120, flex: 0.8,
      renderCell: ({ row }) => <span className="text-slate-500 dark:text-slate-400">{fmtDate(row.createdAt)}</span> },
    ref: { field: "ref", headerName: "Ref", minWidth: 110, flex: 0.7,
      renderCell: ({ row }) => <span className="num text-xs text-slate-500 dark:text-slate-400">{row.ref}</span> },
    title: { field: "title", headerName: "Title", minWidth: 180, flex: 1.4,
      renderCell: ({ row }) => (
        <span className="min-w-0">
          <span className="font-600 text-slate-900 dark:text-white">{row.title}</span>
          {row.urgency && row.urgency !== "Normal" && (
            <span className={`ms-2 text-xs font-600 ${URGENCY_TONE[row.urgency] || "text-slate-400"}`}>{row.urgency}</span>
          )}
        </span>
      ) },
    client: { field: "clientName", headerName: "Client", minWidth: 140, flex: 1,
      renderCell: ({ row }) => (row.clientName
        ? <RecordLink href={linkToClient(slug, row.clientId)} mono={false} title={`Open ${row.clientName}`}>{row.clientName}</RecordLink>
        : <span className="text-slate-400">—</span>) },
    owner: { field: "ownerName", headerName: "Owner", minWidth: 120, flex: 0.9,
      renderCell: ({ row }) => <span className="text-slate-600 dark:text-slate-300">{row.ownerName}</span> },
    value: { field: "value", headerName: "Value Quoted", type: "number", minWidth: 130, flex: 0.9,
      align: "left", headerAlign: "left",
      renderCell: ({ row }) => <span className="num text-slate-600 dark:text-slate-300">{money(row.value)}</span> },
    deadline: { field: "deadline", headerName: "Deadline", minWidth: 120, flex: 0.8,
      renderCell: ({ row }) => <span className="text-slate-600 dark:text-slate-300">{fmtDate(row.deadline)}</span> },
    status: { field: "status", headerName: "Status", minWidth: 120, flex: 0.7,
      renderCell: ({ row }) => <StatusPill kind="sales" status={row.status} /> },
    urgency: { field: "urgency", headerName: "Urgency", minWidth: 110, flex: 0.7,
      renderCell: ({ row }) => <span className={`rounded-full px-2.5 py-1 text-xs font-600 ${URGENCY_BADGE[row.urgency] || URGENCY_BADGE.Normal}`}>{row.urgency || "Normal"}</span> },
    // WHERE THE TICKET STANDS, and only that — Request RFQ lives on the ticket's
    // own page, not smuggled into a column of a row that is itself a link. Sort
    // is off: it reports a derived status, not a value worth ordering by.
    rfq: { field: "rfq", headerName: "RFQ", minWidth: 140, flex: 1, sortable: false,
      renderCell: ({ row }) => (
        <span className="min-w-0">
          {row._rfq.requested
            ? <span className={`block text-xs font-600 ${row._rfq.tone}`}>{row._rfq.text}</span>
            : <span className="text-slate-400">—</span>}
          {row.rfqCount > 1 && <span className="block text-[11px] text-slate-400">{row.rfqCount} raised</span>}
        </span>
      ) },
    probability: { field: "probability", headerName: "Prob.", type: "number", minWidth: 90, flex: 0.5,
      align: "left", headerAlign: "left",
      renderCell: ({ row }) => <span className="num font-600 text-slate-700 dark:text-slate-200">{Number(row.probability ?? 0)}%</span> },
    updatedAt: { field: "updatedAt", headerName: "Updated", minWidth: 120, flex: 0.8,
      renderCell: ({ row }) => <span className="text-slate-500 dark:text-slate-400">{fmtDate(row.updatedAt || row.createdAt)}</span> },
  }), [slug]);

  const gridColumns = useMemo(() => [
    ...TICKET_COLUMNS.filter((c) => col(c.key)).map((c) => colDefs[c.key]),
    {
      field: "_open", headerName: "", minWidth: 80, flex: 0.4, sortable: false,
      align: "right", headerAlign: "right",
      renderCell: ({ row }) => (
        <button type="button" className="text-xs font-600 text-brand-700 hover:underline dark:text-brand-300"
          onClick={(e) => { e.stopPropagation(); openTicket(row.id); }}>
          Open
        </button>
      ),
    },
  ], [colDefs, columns, hasTechnical]); // eslint-disable-line react-hooks/exhaustive-deps

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
          <Field label="Client" value={filters.client} onChange={(v) => setFilter({ client: v })} />
          <Field label="Status" as="select" value={filters.status} onChange={(v) => setFilter({ status: v })} options={statuses} />
          <Field label="Urgency" as="select" value={filters.urgency} onChange={(v) => setFilter({ urgency: v })} options={urgencies} />
          <div>
            <label className={microLabel}>Probability (%)</label>
            <div className="flex items-center gap-2">
              <Field label="Min" type="number" min="0" max="100" value={filters.probMin} onChange={(v) => setFilter({ probMin: v })} className="flex-1" />
              <span className="text-slate-400">–</span>
              <Field label="Max" type="number" min="0" max="100" value={filters.probMax} onChange={(v) => setFilter({ probMax: v })} className="flex-1" />
            </div>
          </div>
          <div>
            <label className={microLabel}>Value Quoted</label>
            <div className="flex items-center gap-2">
              <Field label="Min" type="number" min="0" value={filters.valueMin} onChange={(v) => setFilter({ valueMin: v })} className="flex-1" />
              <span className="text-slate-400">–</span>
              <Field label="Max" type="number" min="0" value={filters.valueMax} onChange={(v) => setFilter({ valueMax: v })} className="flex-1" />
            </div>
          </div>
          <div>
            <label className={microLabel}>Created</label>
            <div className="flex items-center gap-2">
              <Field label="From" filled={!!filters.createdFrom} className="flex-1"><StudioDate value={filters.createdFrom} onChange={(iso) => setFilter({ createdFrom: iso })} /></Field>
              <span className="text-slate-400">–</span>
              <Field label="To" filled={!!filters.createdTo} className="flex-1"><StudioDate value={filters.createdTo} onChange={(iso) => setFilter({ createdTo: iso })} /></Field>
            </div>
          </div>
          <div>
            <label className={microLabel}>Deadline</label>
            <div className="flex items-center gap-2">
              <Field label="From" filled={!!filters.deadlineFrom} className="flex-1"><StudioDate value={filters.deadlineFrom} onChange={(iso) => setFilter({ deadlineFrom: iso })} /></Field>
              <span className="text-slate-400">–</span>
              <Field label="To" filled={!!filters.deadlineTo} className="flex-1"><StudioDate value={filters.deadlineTo} onChange={(iso) => setFilter({ deadlineTo: iso })} /></Field>
            </div>
          </div>
          <div>
            <label className={microLabel}>Updated</label>
            <div className="flex items-center gap-2">
              <Field label="From" filled={!!filters.updatedFrom} className="flex-1"><StudioDate value={filters.updatedFrom} onChange={(iso) => setFilter({ updatedFrom: iso })} /></Field>
              <span className="text-slate-400">–</span>
              <Field label="To" filled={!!filters.updatedTo} className="flex-1"><StudioDate value={filters.updatedTo} onChange={(iso) => setFilter({ updatedTo: iso })} /></Field>
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
        {/* A Data Grid now — sortable columns, client-side paging, the same
            user-chosen column SET as before (built from TICKET_COLUMNS and the
            saved preference via `col`). Every cell reproduces the hand-rolled
            table it replaced: the mono ref, the title with its inline urgency
            tone, the client RecordLink, the owner alias, the value tabular via
            `.num`, deadlines through fmtDate, the shared StatusPill, the urgency
            badge, the RFQ status, probability, and the always-drawn Open action
            that navigates to the ticket's own page. A ticket still waiting to be
            handed to Technical keeps its amber start-edge stripe — an inset
            box-shadow (no layout cost) reading --sg-flag so it flips in dark
            mode. The whole row still opens the ticket (onRowClick). The list only
            REPORTS: acting on a ticket happens on its page, not in a column.
            The deep-link focus scroll-and-ring is the one thing not carried over
            — client paging can't scroll to a row that may sit on another page. */}
        <StudioDataGrid
          rows={gridRows}
          columns={gridColumns}
          getRowId={(r) => r.id}
          ariaLabel="Tickets"
          emptyLabel="No tickets match those filters."
          emptyIcon="ticket"
          className="[--sg-flag:251_191_36] dark:[--sg-flag:245_158_11]"
          onRowClick={(params) => openTicket(params.id)}
          getRowClassName={({ row }) => (row._unresolved ? "sg-flag" : "")}
          sx={{
            "& .MuiDataGrid-row": { cursor: "pointer" },
            "& .MuiDataGrid-row.sg-flag": { boxShadow: "inset 4px 0 0 rgb(var(--sg-flag))" },
          }}
        />
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
            <div key={i} className="flex items-start gap-2 rounded-xl border border-slate-200 bg-[var(--geex-inset)] p-3 dark:border-white/15">
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

// A client's own mark, uploaded the same way the studio's is and shown WHOLE
// rather than cropped — it is a company logo, not a face.
function ClientLogoField({ value, onChange }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef(null);

  async function upload(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setErr("Choose an image file."); return; }
    if (file.size > 2 * 1024 * 1024) { setErr("Images must be 2 MB or smaller."); return; }
    setBusy(true); setErr("");
    try {
      const form = new FormData();
      form.append("file", file);
      const up = await fetch("/api/media", { method: "POST", body: form });
      const media = await up.json().catch(() => ({}));
      if (!up.ok || !media.url) throw new Error("upload");
      onChange(media.url);
    } catch { setErr("We couldn't upload that logo."); }
    finally { setBusy(false); }
  }

  // Wrapped in the SAME <Field> box as Company name / Website beside it, so its
  // top edge lines up with theirs across the grid row and the preview and button
  // sit centred on one baseline — rather than a bare label-above control that
  // floated at a different height. `filled` keeps the label up, since the control
  // always shows something (a thumbnail, or "None").
  return (
    <Field label="Logo" filled error={err || undefined}>
      <div className="flex items-center gap-3 px-3.5 pb-1.5 pt-5">
        <span className="inline-flex h-6 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
          {value
            /* eslint-disable-next-line @next/next/no-img-element */
            ? <img src={value} alt="" className="h-full w-full object-contain" />
            : <span className="text-[9px] font-600 uppercase tracking-wide text-slate-400">None</span>}
        </span>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
        <div className="ms-auto flex items-center gap-1.5">
          <button type="button" disabled={busy} onClick={() => fileRef.current?.click()}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-600 text-[var(--geex-muted)] transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-white/15 dark:hover:bg-white/5">
            {busy ? "Uploading…" : value ? "Change" : "Upload"}
          </button>
          {value && (
            <button type="button" onClick={() => onChange("")}
              className="rounded-full px-2 py-1 text-xs font-600 text-slate-400 transition-colors hover:text-rose-600 dark:hover:text-rose-300">
              Remove
            </button>
          )}
        </div>
      </div>
    </Field>
  );
}

function ClientForm({ row, cities, positions, onSave, onCancel }) {
  const [f, setF] = useState({
    name: row?.name || "", industry: row?.industry || "", website: row?.website || "",
    logo: row?.logo || "", notes: row?.notes || "",
  });
  // Every contact and location the client already has, edited in place — the
  // form sends the WHOLE list back, so anything it doesn't show would be lost.
  const [contacts, setContacts] = useState(row?.contacts || []);
  const [locations, setLocations] = useState(row?.locations || []);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Company name" required value={f.name} onChange={(v) => setF((p) => ({ ...p, name: v }))} />
        <Field label="Industry" value={f.industry} onChange={(v) => setF((p) => ({ ...p, industry: v }))} />
        <Field label="Website" value={f.website} onChange={(v) => setF((p) => ({ ...p, website: v }))} />
        <ClientLogoField value={f.logo} onChange={(logo) => setF((p) => ({ ...p, logo }))} />
      </div>

      <RowList
        title="Contacts" help="The people you deal with there. A ticket folds its contact in here automatically."
        rows={contacts} onChange={setContacts} addLabel="Add contact"
        columns={[
          { key: "name", label: "Name" },
          { key: "position", label: "Position", options: positions },
          { key: "email", label: "Email", type: "email" },
          { key: "phone", label: "Phone" },
        ]}
      />

      <RowList
        title="Locations" help="Sites this client has. A ticket's location is folded in here too."
        rows={locations} onChange={setLocations} addLabel="Add location"
        columns={[
          { key: "name", label: "Site name" },
          { key: "country", label: "Country", options: COUNTRY_NAMES },
          { key: "city", label: "City", options: cities },
          { key: "url", label: "Map link" },
        ]}
      />

      <Field label="Notes" as="textarea" value={f.notes} onChange={(v) => setF((p) => ({ ...p, notes: v }))} className="mt-5" />

      <div className="mt-5 flex gap-3">
        <button className={btn} disabled={busy || !f.name.trim()} onClick={async () => {
          setBusy(true);
          await onSave({ name: f.name, industry: f.industry, website: f.website, logo: f.logo, notes: f.notes, contacts, locations });
          setBusy(false);
        }}>{busy ? "Saving…" : "Save client"}</button>
        <button className={btnGhost} onClick={onCancel}>Cancel</button>
      </div>
    </>
  );
}

export function TicketForm({ row, clients, vocabulary, services = [], cities = [], positions = [], studioDefaults = {}, onSave, onCancel }) {
  // Fields mirror the Old System's ticket. Mandatory: title, client, deadline,
  // type of industry. Value Quoted is NOT here on purpose — it is filled from
  // the latest quotation, and Client Budget is the client's own manual figure.
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
        <Field label="Title" required value={f.title} onChange={(v) => setF((p) => ({ ...p, title: v }))} className="sm:col-span-2" />

        <Field label="Client" required filled={!!f.clientName}
          hint={!row ? (matched ? `Existing client — ${(matched.contacts || []).length} contact${(matched.contacts || []).length === 1 ? "" : "s"} on file.` : "A name that isn't on the list creates a new client.") : undefined}>
          <Combo value={f.clientName} onChange={(v) => setF((p) => ({ ...p, clientName: v }))}
            options={clients.map((c) => c.name)} inputClassName={BARE_CONTROL} disabled={!!row} />
        </Field>

        <Field label="Deadline" required filled={!!f.deadline}>
          <StudioDate value={f.deadline} onChange={(iso) => setF((p) => ({ ...p, deadline: iso }))} />
        </Field>

        <Field label="Type of industry" required filled={!!f.industry}>
          <Combo value={f.industry} onChange={(v) => setF((p) => ({ ...p, industry: v }))}
            options={vocabulary.industries || []} inputClassName={BARE_CONTROL} />
        </Field>

        {/* The studio's currency sits IN the field, so the number is read together
            with what it is in. Value Quoted is derived, hence only a hint here. */}
        <Field label="Client budget" type="number" min="0" value={f.clientBudget} onChange={(v) => setF((p) => ({ ...p, clientBudget: v }))}
          prefix={studioDefaults.currency ? <CurrencySymbol code={studioDefaults.currency} /> : null}
          hint={<>The ticket&apos;s <span className="font-600">Value Quoted</span> is set automatically from its most recent quotation.</>} />

        {row && (
          <>
            <Field label="Status" as="select" required value={f.status} onChange={(v) => setF((p) => ({ ...p, status: v }))} options={vocabulary.statuses || []} />
            <Field label="Urgency" as="select" required value={f.urgency} onChange={(v) => setF((p) => ({ ...p, urgency: v }))} options={vocabulary.urgencies || []} />
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
        <Field label="Name" filled={!!f.contactName}>
          {knownContacts.length > 0
            ? <Combo value={f.contactName} onChange={pickContact} options={knownContacts.map((c) => c.name)} inputClassName={BARE_CONTROL} />
            : <input className={BARE_CONTROL} value={f.contactName} onChange={set("contactName")} />}
        </Field>
        <Field label="Position" filled={!!f.contactPosition}>
          <Combo value={f.contactPosition} onChange={(v) => setF((p) => ({ ...p, contactPosition: v }))}
            options={positions} inputClassName={BARE_CONTROL} />
        </Field>
        <Field label="Email" type="email" value={f.contactEmail} onChange={(v) => setF((p) => ({ ...p, contactEmail: v }))} />
        <Field label="Phone" value={f.contactPhone} onChange={(v) => setF((p) => ({ ...p, contactPhone: v }))} />
      </div>

      <p className="mt-5 text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">Location</p>
      <div className="mt-2 grid gap-4 sm:grid-cols-3">
        <Field label="Site name" filled={!!f.locationName}>
          {/* Choosing a saved site fills the rest of this block from what was
              stored with it. */}
          <Combo value={f.locationName}
            onChange={(v) => setF((p) => {
              const saved = clientLocations.find((l) => String(l.name || "").trim().toLowerCase() === v.trim().toLowerCase());
              return saved
                ? { ...p, locationName: v, locationCountry: saved.country || p.locationCountry, locationCity: saved.city || "", locationUrl: saved.url || "" }
                : { ...p, locationName: v };
            })}
            options={clientLocations.map((l) => l.name).filter(Boolean)} inputClassName={BARE_CONTROL} />
        </Field>
        <Field label="Country" filled={!!f.locationCountry}>
          <Combo value={f.locationCountry} onChange={(v) => setF((p) => ({ ...p, locationCountry: v, locationCity: "" }))}
            options={COUNTRY_NAMES} inputClassName={BARE_CONTROL} />
        </Field>
        <Field label="City" filled={!!f.locationCity}>
          <Combo value={f.locationCity} onChange={(v) => setF((p) => ({ ...p, locationCity: v }))}
            options={f.locationCountry ? citiesFor(codeOfCountry(f.locationCountry)) : cities} inputClassName={BARE_CONTROL} />
        </Field>
        <Field label="Map link" value={f.locationUrl} onChange={(v) => setF((p) => ({ ...p, locationUrl: v }))} />
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
              <div key={sv.id} className="rounded-xl border border-slate-200 bg-[var(--geex-inset)] p-3.5 dark:border-white/15">
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
            <li key={sv.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-[var(--geex-inset)] p-4 dark:border-white/15">
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
            <div><label className={label}>Name</label><input className={input} value={svc.name} onChange={(e) => setSvc((v) => ({ ...v, name: e.target.value }))} placeholder="Service name" /></div>
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
            <label key={o.key} className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-[var(--geex-inset)] px-3.5 py-2.5 text-sm dark:border-white/15">
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
