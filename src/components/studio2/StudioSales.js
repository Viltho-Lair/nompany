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
import ClientBlock from "@/components/studio2/ClientBlock";
import { useFocusedRecord } from "@/components/studio2/useFocusedRecord";
import {
  panel, h2, sub, input, microLabel, label, btn, btnGhost, th,
  URGENCY_BADGE, URGENCY_TONE, money, fmtDate, useTablePrefs,
  Dialog, Toolbar, FilterButton, FilterPanel, ColumnPicker, Empty,
} from "@/components/studio2/ui";
import { linkToClient } from "@/modules/main/studioLinks";
import { COUNTRIES } from "@/shared/countries";
import { CurrencySymbol } from "@/components/Currency";
import { rfqInfo, isUnresolved } from "@/modules/sales/salesAnalytics";
import SalesDashboard from "@/components/studio2/SalesDashboard";
import { useAnalyticsLevel } from "@/components/studio2/analyticsLevel";
import { StatusPill } from "@/components/studio2/StatusPill";
import { useStudioLocale } from "@/components/studio2/locale";
import { salesDict, liveColumnLabel } from "@/shared/studio/sales";

// Sales: clients and the tickets raised against them. Read access shows
// everything; the Manage grant is what reveals the create/edit controls — and
// the API enforces the same rule, so hiding a button is never the only defence.
// The chrome — dialogs, toolbars, charts — comes from studio2/ui so this screen
// and Technical's are the same product rather than two lookalikes.

// Ticket-stage colours now live in the shared StatusPill map, keyed "sales" —
// StatusPill.js's STATUS_TONES is keyed by RECORD KIND, not by section, and
// was never part of the P0 restructure's renames.
// tests/restructure.mjs's KNOWN_COLLISIONS allowlist knows about this one.
// Columns the tickets table can show. Every one is toggleable; the Actions
// column is not on the list because it is always drawn.
// THE KEYS ARE THE CONTRACT, THE LABELS ARE COPY. The saved column preference
// stores keys, so the order and the identity of a column must not depend on the
// reader's language; only what it is CALLED does. Hence a key list here and a
// labelled list built from the dictionary at render.
const TICKET_COLUMN_KEYS = [
  "createdAt", "ref", "title", "client", "owner",
  // Not "Value": the figure is the latest quotation's total, never typed.
  "value", "deadline", "status", "urgency", "rfq", "probability", "updatedAt",
];
const ticketColumns = (words) => [
  { key: "createdAt", label: words.colCreated },
  { key: "ref", label: words.colRef },
  { key: "title", label: words.title },
  { key: "client", label: words.client },
  { key: "owner", label: words.colOwner },
  { key: "value", label: words.colValueQuoted },
  { key: "deadline", label: words.deadline },
  { key: "status", label: words.status },
  { key: "urgency", label: words.urgency },
  { key: "rfq", label: words.colRfq },
  { key: "probability", label: words.colProbability },
  { key: "updatedAt", label: words.colUpdated },
];
// The client editor's own Country column still picks from the full list; the
// code lookup and the city list moved to ClientBlock with the block that used
// them.
const COUNTRY_NAMES = COUNTRIES.map((c) => c.name);

const DEFAULT_TICKET_COLUMNS = ["ref", "title", "client", "status", "owner", "deadline", "rfq"];

// The tickets list is a Data Grid now — the toggleable column SET is still the
// user's (built into the grid's `columns` from the same TICKET_COLUMNS keys and
// the same saved preference), but sorting and client-side paging come from the
// grid. Loaded in its own async chunk (never folded into Sales' initial bundle)
// — see StudioDataGrid's header. The skeleton reserves the box for the default
// column count plus the always-drawn Open action while that chunk arrives.
const StudioDataGrid = nextDynamic(() => import("@/components/studio2/StudioDataGrid"), {
  ssr: false,
  loading: () => <StudioDataGridSkeleton columns={8} pageSize={10} />,
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
//   crm-sales-tickets   -> the tickets list + form
//   crm-sales-clients   -> the clients list + form
//   crm-sales-settings  -> services, vocabulary and the Live view columns
// crm-sales-live renders full-screen outside the studio frame (see StudioSalesLive).
export default function StudioSales({ slug, view = "crm-sales" }) {
  const tr = salesDict(useStudioLocale());
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
    if (!res.ok) { setError(tr.noAccessTo(tr.salesDepartment)); return; }
    setData(await res.json());
  }, [slug, tr]);
  useEffect(() => { load(); }, [load]);

  // A colleague raised or moved a ticket - reflect it without a refresh.
  //
  // An EDIT to a ticket or a client replaces that one row; everything else still
  // reloads the board. See useLiveRows for why only updates are safe to patch:
  // a create or a delete changes the list's length and order, and the summary
  // figures above it.
  useLiveRows(slug, "crm-sales", {
    load,
    setData,
    into: { salesTickets: "tickets", salesClients: "clients" },
  });

  // An RFQ raised on a ticket changes what its RFQ column says, and that happens
  // in Engineering & Documents — so this board watches that section too. NOT
  // patched: an Engineering & Documents event names a row in `rfqs`, and what it
  // changes here is a DERIVED column on some ticket whose id the event never
  // mentions. The board cannot know which row to ask for, so it asks for all of
  // them.
  //
  // QUOTATIONS ARE NOT WATCHED HERE ANY MORE. They moved WITH the section
  // (restructure.ts's SECTION_KEY_MAP: technical-quotations -> crm-sales-
  // quotations), so a quotation event now publishes on "crm-sales" — the
  // `useLiveRows` call above already covers it.
  useLiveUpdates(slug, "engineering-docs", load);

  async function send(kind, method, payload) {
    setError("");
    const url = kind ? `/api/studios/${slug}/sales/${kind}` : `/api/studios/${slug}/sales`;
    const res = await fetch(url, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(
        out.error === "duplicate" ? tr.errDuplicate
        : out.error === "in-use" ? tr.errInUse(Number(out.tickets) || 0)
        : out.error === "read-only" ? tr.errReadOnly
        : out.error === "name" || out.error === "title" ? tr.errName
        : out.error === "client" ? tr.errClient
        : out.error === "deadline" ? tr.errDeadline
        : out.error === "industry" ? tr.errIndustry
        : out.error === "services" ? tr.errServices
        : out.error === "budget" ? tr.errBudget
        : out.error === "already" ? tr.errAlready
        : out.error === "no-technical" ? tr.errNoTechnical
        : out.error === "forbidden" || out.error === "sales-required" ? tr.errRfqForbidden
        : out.error === "ticket" ? tr.errTicketGone
        : tr.saveFailed
      );
      return false;
    }
    setEditing(null);
    await load();
    return true;
  }

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">{tr.loadingSales}</p>;

  const { canManage: canManageParent, canManageTickets, canManageClients, canManageSettings, clients, tickets, people, vocabulary, nav, liveColumns, hasTechnical } = data;
  // MANAGE IS ASKED OF THE SCREEN BEING SHOWN. `view` is the section key, and
  // the map is keyed the same way, so a sub-section grant answers for its own
  // screen and the parent's answer no longer stands in for all of them.
  const canManage = data.manage?.[view] ?? canManageParent;

  const banner = error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>;

  if (view === "crm-sales-settings") {
    return (
      <div className="space-y-6">
        {banner}
        <SalesSettings
          options={vocabulary.liveColumnOptions || []}
          selected={liveColumns || []}
          cities={data.salesCities || []}
          positions={data.salesContactPositions || []}
          canManage={canManageSettings}
          onSaveVocab={(patch) => send("", "PUT", patch)}
        />
      </div>
    );
  }

  if (view === "crm-sales-clients") {
    return (
      <div className="space-y-6">
        {banner}
        {/* The client form is a DIALOG for the same reason the ticket one is:
            with contacts and locations it is long enough that inline it pushed
            the list it is about off the screen. */}
        {editing?.kind === "client" && (
          <Dialog
            title={editing.row ? tr.editNamed(editing.row.name) : tr.addClient}
            description={tr.clientFormHint}
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

  if (view === "crm-sales-tickets") {
    return (
      <div className="space-y-6">
        {banner}
        {/* Raising a ticket opens a DIALOG rather than unfolding a panel above
            the table: the form is long enough that inline it pushed the list
            it is about off the screen. */}
        {editing?.kind === "ticket" && (
          <Dialog
            title={editing.row ? tr.editNamed(editing.row.ref) : tr.newTicket}
            description={tr.ticketFormHint}
            onClose={closeEditing}
          >
            <TicketForm row={editing.row} clients={clients} vocabulary={vocabulary}
              cities={data.salesCities || []} positions={data.salesContactPositions || []}
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
        ? <Empty title={tr.dashboardLocked} body={tr.dashboardLockedBody} />
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
  const tr = salesDict(useStudioLocale());
  const aliasOf = useMemo(() => Object.fromEntries(people.map((p) => [p.id, p.alias])), [people]);

  const recent = useMemo(
    () => [...tickets].sort((a, b) => (b.updatedAt || b.createdAt || "").localeCompare(a.updatedAt || a.createdAt || "")),
    [tickets],
  );

  return (
    <>
      <SalesDashboard tickets={tickets} level={level} slug={slug} nav={nav} />

      {/* Live view — a full-screen, auto-refreshing tickets table. Its columns
          are a shared setting configured in Sales → Settings. */}
      {nav?.["crm-sales-live"] && (
        <section className={`${panel} flex flex-wrap items-center justify-between gap-3`}>
          <div className="min-w-0">
            <p className={microLabel}>{tr.liveView}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {tr.liveViewLeadBefore}
              {nav?.["crm-sales-settings"]
                ? <a href={`/${slug}/crm-sales-settings`} className="font-600 text-brand-700 hover:underline dark:text-brand-300">{tr.salesSettingsPath}</a>
                : <span className="font-600">{tr.salesSettingsPath}</span>}.
            </p>
          </div>
          <a href={`/${slug}/crm-sales-live`} className={btn}>{tr.openLiveView}</a>
        </section>
      )}

      <section className={panel}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className={microLabel}>{tr.allTickets}</p>
          {nav?.["crm-sales-tickets"] && <a href={`/${slug}/crm-sales-tickets`} className="text-xs font-600 text-brand-700 hover:underline dark:text-brand-300">{tr.openTicketsLink}</a>}
        </div>
        {recent.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">{tr.noTicketsYet}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-start dark:border-white/10">
                  {[tr.title, tr.client, tr.colOwner, tr.colValueQuoted, tr.colRfq, tr.status, tr.colUpdated].map((head) => (
                    <th key={head} className={`${th} text-start`}>{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map((row) => {
                  const rfq = rfqInfo(row, aliasOf);
                  return (
                    <tr key={row.id} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                      <td className="py-3 pe-3 font-600 text-slate-900 dark:text-white">{row.title}</td>
                      <td className="py-3 pe-3 text-slate-600 dark:text-slate-300">{row.clientName || "—"}</td>
                      <td className="py-3 pe-3 text-slate-600 dark:text-slate-300">{aliasOf[row.assignedToCollaboratorId] || tr.unassigned}</td>
                      <td className="py-3 pe-3 tabular-nums text-slate-600 dark:text-slate-300">{money(row.value)}</td>
                      <td className={`py-3 pe-3 text-xs font-600 ${rfq.tone}`}>{rfq.text}</td>
                      <td className="py-3 pe-3">
                        <StatusPill kind="sales" status={row.status} />
                      </td>
                      <td className="py-3 text-slate-500 dark:text-slate-400">{fmtDate(row.updatedAt || row.createdAt)}</td>
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
  const tr = salesDict(useStudioLocale());
  const TICKET_COLUMNS = useMemo(() => ticketColumns(tr), [tr]);
  const aliasOf = useMemo(() => Object.fromEntries(people.map((p) => [p.id, p.alias])), [people]);
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showColumns, setShowColumns] = useState(false);
  const { columns, has, toggleCol, resetCols, filters, setFilter, clearFilters, activeFilters } =
    useTablePrefs("crm-sales", slug, {
      columnKeys: TICKET_COLUMN_KEYS,
      defaultColumns: DEFAULT_TICKET_COLUMNS,
      emptyFilters: EMPTY_FILTERS,
    });

  // A column the studio has no Technical section for is off whatever the saved
  // preference says: RFQ is the one column whose existence is not this person's
  // choice, so the answer is the shared one AND that.
  const col = (key) => has(key) && (key !== "rfq" || hasTechnical);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const f = filters;
    const num = (v) => (v === "" || v == null ? null : Number(v));
    const probMin = num(f.probMin), probMax = num(f.probMax);
    const valMin = num(f.valueMin), valMax = num(f.valueMax);
    return tickets.filter((row) => {
      if (f.status && row.status !== f.status) return false;
      if (f.urgency && (row.urgency || "Normal") !== f.urgency) return false;
      if (f.client && !`${row.clientName || ""}`.toLowerCase().includes(f.client.toLowerCase())) return false;
      const p = Number(row.probability ?? 0);
      if (probMin != null && Number.isFinite(probMin) && p < probMin) return false;
      if (probMax != null && Number.isFinite(probMax) && p > probMax) return false;
      const value = Number(row.value ?? 0);
      if (valMin != null && Number.isFinite(valMin) && value < valMin) return false;
      if (valMax != null && Number.isFinite(valMax) && value > valMax) return false;
      const created = (row.createdAt || "").slice(0, 10);
      if (f.createdFrom && created < f.createdFrom) return false;
      if (f.createdTo && created > f.createdTo) return false;
      const deadline = (row.deadline || "").slice(0, 10);
      if (f.deadlineFrom && (!deadline || deadline < f.deadlineFrom)) return false;
      if (f.deadlineTo && (!deadline || deadline > f.deadlineTo)) return false;
      const updated = (row.updatedAt || row.createdAt || "").slice(0, 10);
      if (f.updatedFrom && updated < f.updatedFrom) return false;
      if (f.updatedTo && updated > f.updatedTo) return false;
      if (q && !`${row.title || ""} ${row.clientName || ""} ${row.ref || ""} ${row.description || ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tickets, query, filters]);

  // Augment each row with the values the grid sorts and renders on: the owner's
  // ALIAS (so the Owner column sorts by name, not by CollaboratorID), the RFQ
  // status object rfqInfo derives, and whether the ticket is still unresolved —
  // the amber start-edge stripe. Computed once here rather than per cell.
  const gridRows = useMemo(() => filtered.map((row) => ({
    ...row,
    ownerName: aliasOf[row.assignedToCollaboratorId] || tr.unassigned,
    _rfq: rfqInfo(row, aliasOf),
    _unresolved: hasTechnical && isUnresolved(row),
  })), [filtered, aliasOf, hasTechnical, tr]);

  // One column def per TICKET_COLUMNS key. The grid shows only the keys the
  // user has turned on (via `col`), in the fixed TICKET_COLUMNS order, then the
  // always-drawn Open action — which is what carries KEYBOARD navigation to the
  // ticket's own page now that the row is no longer a semantic link. `value` and
  // `probability` keep number-typed sorting but their original left alignment.
  const openTicket = (id) => window.location.assign(`/${slug}/crm-sales-tickets/${id}`);
  const colDefs = useMemo(() => ({
    createdAt: { field: "createdAt", headerName: tr.colCreated, minWidth: 120, flex: 0.8,
      renderCell: ({ row }) => <span className="text-slate-500 dark:text-slate-400">{fmtDate(row.createdAt)}</span> },
    ref: { field: "ref", headerName: tr.colRef, minWidth: 110, flex: 0.7,
      renderCell: ({ row }) => <span className="num text-xs text-slate-500 dark:text-slate-400">{row.ref}</span> },
    title: { field: "title", headerName: tr.title, minWidth: 180, flex: 1.4,
      renderCell: ({ row }) => (
        <span className="min-w-0">
          <span className="font-600 text-slate-900 dark:text-white">{row.title}</span>
          {row.urgency && row.urgency !== "Normal" && (
            <span className={`ms-2 text-xs font-600 ${URGENCY_TONE[row.urgency] || "text-slate-400"}`}>{row.urgency}</span>
          )}
        </span>
      ) },
    client: { field: "clientName", headerName: tr.client, minWidth: 140, flex: 1,
      renderCell: ({ row }) => (row.clientName
        ? <RecordLink href={linkToClient(slug, row.clientId)} mono={false} title={tr.openNamed(row.clientName)}>{row.clientName}</RecordLink>
        : <span className="text-slate-400">—</span>) },
    owner: { field: "ownerName", headerName: tr.colOwner, minWidth: 120, flex: 0.9,
      renderCell: ({ row }) => <span className="text-slate-600 dark:text-slate-300">{row.ownerName}</span> },
    value: { field: "value", headerName: tr.colValueQuoted, type: "number", minWidth: 130, flex: 0.9,
      align: "left", headerAlign: "left",
      renderCell: ({ row }) => <span className="num text-slate-600 dark:text-slate-300">{money(row.value)}</span> },
    deadline: { field: "deadline", headerName: tr.deadline, minWidth: 120, flex: 0.8,
      renderCell: ({ row }) => <span className="text-slate-600 dark:text-slate-300">{fmtDate(row.deadline)}</span> },
    status: { field: "status", headerName: tr.status, minWidth: 120, flex: 0.7,
      renderCell: ({ row }) => <StatusPill kind="sales" status={row.status} /> },
    urgency: { field: "urgency", headerName: tr.urgency, minWidth: 110, flex: 0.7,
      renderCell: ({ row }) => <span className={`rounded-full px-2.5 py-1 text-xs font-600 ${URGENCY_BADGE[row.urgency] || URGENCY_BADGE.Normal}`}>{row.urgency || "Normal"}</span> },
    // WHERE THE TICKET STANDS, and only that — Request RFQ lives on the ticket's
    // own page, not smuggled into a column of a row that is itself a link. Sort
    // is off: it reports a derived status, not a value worth ordering by.
    rfq: { field: "rfq", headerName: tr.colRfq, minWidth: 140, flex: 1, sortable: false,
      renderCell: ({ row }) => (
        <span className="min-w-0">
          {row._rfq.requested
            ? <span className={`block text-xs font-600 ${row._rfq.tone}`}>{row._rfq.text}</span>
            : <span className="text-slate-400">—</span>}
          {row.rfqCount > 1 && <span className="block text-[11px] text-slate-400">{tr.rfqRaisedCount(row.rfqCount)}</span>}
        </span>
      ) },
    probability: { field: "probability", headerName: tr.colProbability, type: "number", minWidth: 90, flex: 0.5,
      align: "left", headerAlign: "left",
      renderCell: ({ row }) => <span className="num font-600 text-slate-700 dark:text-slate-200">{Number(row.probability ?? 0)}%</span> },
    updatedAt: { field: "updatedAt", headerName: tr.colUpdated, minWidth: 120, flex: 0.8,
      renderCell: ({ row }) => <span className="text-slate-500 dark:text-slate-400">{fmtDate(row.updatedAt || row.createdAt)}</span> },
  }), [slug, tr]);

  const gridColumns = useMemo(() => [
    ...TICKET_COLUMNS.filter((c) => col(c.key)).map((c) => colDefs[c.key]),
    {
      field: "_open", headerName: "", minWidth: 80, flex: 0.4, sortable: false,
      align: "right", headerAlign: "right",
      renderCell: ({ row }) => (
        <button type="button" className="text-xs font-600 text-brand-700 hover:underline dark:text-brand-300"
          onClick={(e) => { e.stopPropagation(); openTicket(row.id); }}>
          {tr.openAction}
        </button>
      ),
    },
  ], [colDefs, columns, hasTechnical, tr]); // eslint-disable-line react-hooks/exhaustive-deps

  // No "add a client first" gate: naming an unknown client on the ticket form
  // creates it, exactly as the Old System does.
  if (tickets.length === 0) {
    return (
      <>
        <Toolbar canManage={canManage} label={tr.newTicket} onAdd={onAdd} />
        <Empty title={tr.ticketsEmptyTitle} body={tr.ticketsEmptyBody} />
      </>
    );
  }

  return (
    <>
      <Toolbar canManage={canManage} label={tr.newTicket} onAdd={onAdd}>
        <input type="search" className={`${input} sm:max-w-xs`} placeholder={tr.searchTickets}
          value={query} onChange={(e) => setQuery(e.target.value)} />
        <FilterButton active={activeFilters} open={showFilters} onClick={() => setShowFilters((v) => !v)} />
        <button type="button" className={btnGhost} onClick={() => setShowColumns(true)}>{tr.columnsButton}</button>
      </Toolbar>

      {showFilters && (
        <FilterPanel onClear={clearFilters}>
          <Field label={tr.client} value={filters.client} onChange={(v) => setFilter({ client: v })} />
          <Field label={tr.status} as="select" value={filters.status} onChange={(v) => setFilter({ status: v })} options={statuses} />
          <Field label={tr.urgency} as="select" value={filters.urgency} onChange={(v) => setFilter({ urgency: v })} options={urgencies} />
          <div>
            <label className={microLabel}>{tr.probabilityPct}</label>
            <div className="flex items-center gap-2">
              <Field label={tr.min} type="number" min="0" max="100" value={filters.probMin} onChange={(v) => setFilter({ probMin: v })} className="flex-1" />
              <span className="text-slate-400">–</span>
              <Field label={tr.max} type="number" min="0" max="100" value={filters.probMax} onChange={(v) => setFilter({ probMax: v })} className="flex-1" />
            </div>
          </div>
          <div>
            <label className={microLabel}>{tr.colValueQuoted}</label>
            <div className="flex items-center gap-2">
              <Field label={tr.min} type="number" min="0" value={filters.valueMin} onChange={(v) => setFilter({ valueMin: v })} className="flex-1" />
              <span className="text-slate-400">–</span>
              <Field label={tr.max} type="number" min="0" value={filters.valueMax} onChange={(v) => setFilter({ valueMax: v })} className="flex-1" />
            </div>
          </div>
          <div>
            <label className={microLabel}>{tr.colCreated}</label>
            <div className="flex items-center gap-2">
              <Field label={tr.from} filled={!!filters.createdFrom} className="flex-1"><StudioDate value={filters.createdFrom} onChange={(iso) => setFilter({ createdFrom: iso })} /></Field>
              <span className="text-slate-400">–</span>
              <Field label={tr.to} filled={!!filters.createdTo} className="flex-1"><StudioDate value={filters.createdTo} onChange={(iso) => setFilter({ createdTo: iso })} /></Field>
            </div>
          </div>
          <div>
            <label className={microLabel}>{tr.deadline}</label>
            <div className="flex items-center gap-2">
              <Field label={tr.from} filled={!!filters.deadlineFrom} className="flex-1"><StudioDate value={filters.deadlineFrom} onChange={(iso) => setFilter({ deadlineFrom: iso })} /></Field>
              <span className="text-slate-400">–</span>
              <Field label={tr.to} filled={!!filters.deadlineTo} className="flex-1"><StudioDate value={filters.deadlineTo} onChange={(iso) => setFilter({ deadlineTo: iso })} /></Field>
            </div>
          </div>
          <div>
            <label className={microLabel}>{tr.colUpdated}</label>
            <div className="flex items-center gap-2">
              <Field label={tr.from} filled={!!filters.updatedFrom} className="flex-1"><StudioDate value={filters.updatedFrom} onChange={(iso) => setFilter({ updatedFrom: iso })} /></Field>
              <span className="text-slate-400">–</span>
              <Field label={tr.to} filled={!!filters.updatedTo} className="flex-1"><StudioDate value={filters.updatedTo} onChange={(iso) => setFilter({ updatedTo: iso })} /></Field>
            </div>
          </div>
        </FilterPanel>
      )}

      {showColumns && (
        <ColumnPicker
          title={tr.ticketColumns}
          columns={TICKET_COLUMNS.filter((c) => c.key !== "rfq" || hasTechnical)}
          selected={columns} onToggle={toggleCol} onReset={resetCols}
          onClose={() => setShowColumns(false)}
        />
      )}

      <p className="text-sm text-slate-500 dark:text-slate-400">{tr.ticketCount(filtered.length, tickets.length)}</p>

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
          ariaLabel={tr.ticketsAria}
          emptyLabel={tr.noTicketsMatch}
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
  const tr = salesDict(useStudioLocale());
  const aliasOf = useMemo(() => Object.fromEntries(people.map((p) => [p.id, p.alias])), [people]);
  const ticketCount = useMemo(() => {
    const counts = {};
    for (const ticket of tickets) counts[ticket.clientId] = (counts[ticket.clientId] || 0) + 1;
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
        <Toolbar canManage={canManage} label={tr.addClient} onAdd={onAdd} />
        <Empty title={tr.clientsEmptyTitle} body={tr.clientsEmptyBody} />
      </>
    );
  }

  return (
    <>
      <Toolbar canManage={canManage} label={tr.addClient} onAdd={onAdd}>
        <input type="search" className={`${input} sm:max-w-xs`} placeholder={tr.searchClients}
          value={query} onChange={(e) => setQuery(e.target.value)} />
      </Toolbar>

      <p className="text-sm text-slate-500 dark:text-slate-400">{tr.clientsLead(filtered.length, clients.length)}</p>

      <section className={panel}>
        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">{tr.noClientsMatch}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-start dark:border-white/10">
                  {[tr.name, tr.contact, tr.location, tr.colTickets, tr.colDateAdded, tr.colAddedBy].map((head) => (
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
                                <a href={l.url} target="_blank" rel="noreferrer" title={tr.openLocation}
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
                          <button className={btnGhost} onClick={() => onEdit(c)}>{tr.edit}</button>
                          <button className={btnGhost} onClick={() => onDelete(c)}>{tr.delete_}</button>
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
  const tr = salesDict(useStudioLocale());
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
        <p className="mt-2 text-xs text-slate-400">{tr.noneYet}</p>
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
              <button type="button" aria-label={tr.remove} title={tr.remove}
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
  const tr = salesDict(useStudioLocale());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef(null);

  async function upload(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setErr(tr.pickImage); return; }
    if (file.size > 2 * 1024 * 1024) { setErr(tr.imageTooBig); return; }
    setBusy(true); setErr("");
    try {
      const form = new FormData();
      form.append("file", file);
      const up = await fetch("/api/media", { method: "POST", body: form });
      const media = await up.json().catch(() => ({}));
      if (!up.ok || !media.url) throw new Error("upload");
      onChange(media.url);
    } catch { setErr(tr.uploadFailed); }
    finally { setBusy(false); }
  }

  // Wrapped in the SAME <Field> box as Company name / Website beside it, so its
  // top edge lines up with theirs across the grid row and the preview and button
  // sit centred on one baseline — rather than a bare label-above control that
  // floated at a different height. `filled` keeps the label up, since the control
  // always shows something (a thumbnail, or "None").
  return (
    <Field label={tr.logo} filled error={err || undefined}>
      <div className="flex items-center gap-3 px-3.5 pb-1.5 pt-5">
        <span className="inline-flex h-6 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
          {value
            /* eslint-disable-next-line @next/next/no-img-element */
            ? <img src={value} alt="" className="h-full w-full object-contain" />
            : <span className="text-[9px] font-600 uppercase tracking-wide text-slate-400">{tr.none}</span>}
        </span>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
        <div className="ms-auto flex items-center gap-1.5">
          <button type="button" disabled={busy} onClick={() => fileRef.current?.click()}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-600 text-[var(--geex-muted)] transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-white/15 dark:hover:bg-white/5">
            {busy ? tr.uploading : value ? tr.changeLogo : tr.upload}
          </button>
          {value && (
            <button type="button" onClick={() => onChange("")}
              className="rounded-full px-2 py-1 text-xs font-600 text-slate-400 transition-colors hover:text-rose-600 dark:hover:text-rose-300">
              {tr.remove}
            </button>
          )}
        </div>
      </div>
    </Field>
  );
}

function ClientForm({ row, cities, positions, onSave, onCancel }) {
  const tr = salesDict(useStudioLocale());
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
        <Field label={tr.companyName} required value={f.name} onChange={(v) => setF((p) => ({ ...p, name: v }))} />
        <Field label={tr.industry} value={f.industry} onChange={(v) => setF((p) => ({ ...p, industry: v }))} />
        <Field label={tr.website} value={f.website} onChange={(v) => setF((p) => ({ ...p, website: v }))} />
        <ClientLogoField value={f.logo} onChange={(logo) => setF((p) => ({ ...p, logo }))} />
      </div>

      <RowList
        title={tr.contactsTitle} help={tr.contactsHelp}
        rows={contacts} onChange={setContacts} addLabel={tr.addContact}
        columns={[
          { key: "name", label: tr.name },
          { key: "position", label: tr.position, options: positions },
          { key: "email", label: tr.email, type: "email" },
          { key: "phone", label: tr.phone },
        ]}
      />

      <RowList
        title={tr.locationsTitle} help={tr.locationsHelp}
        rows={locations} onChange={setLocations} addLabel={tr.addLocation}
        columns={[
          { key: "name", label: tr.siteName },
          { key: "country", label: tr.country, options: COUNTRY_NAMES },
          { key: "city", label: tr.city, options: cities },
          { key: "url", label: tr.mapLink },
        ]}
      />

      <Field label={tr.notes} as="textarea" value={f.notes} onChange={(v) => setF((p) => ({ ...p, notes: v }))} className="mt-5" />

      <div className="mt-5 flex gap-3">
        <button className={btn} disabled={busy || !f.name.trim()} onClick={async () => {
          setBusy(true);
          await onSave({ name: f.name, industry: f.industry, website: f.website, logo: f.logo, notes: f.notes, contacts, locations });
          setBusy(false);
        }}>{busy ? tr.saving : tr.saveClient}</button>
        <button className={btnGhost} onClick={onCancel}>{tr.cancel}</button>
      </div>
    </>
  );
}

export function TicketForm({ row, clients, vocabulary, cities = [], positions = [], studioDefaults = {}, onSave, onCancel }) {
  const tr = salesDict(useStudioLocale());
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
  // THE STUDIO'S OWN SERVICE ACTIONS, not a Sales-only catalogue. These are
  // plain strings from Studio Settings — the same list Inventory and Projects
  // read — so `serviceIds` now holds action NAMES. The field kept its name
  // because the wire shape did not change; only where the values come from did.
  const serviceActions = Array.isArray(vocabulary?.serviceActions) ? vocabulary.serviceActions : [];
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
  // The title, the close button and the scrolling belong to the Dialog this
  // opens inside, so the form itself renders fields only.
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tr.title} required value={f.title} onChange={(v) => setF((p) => ({ ...p, title: v }))} className="sm:col-span-2" />

        <Field label={tr.client} required filled={!!f.clientName}
          hint={!row ? (matched ? tr.clientHintExisting((matched.contacts || []).length) : tr.clientHintNew) : undefined}>
          <Combo value={f.clientName} onChange={(v) => setF((p) => ({ ...p, clientName: v }))}
            options={clients.map((c) => c.name)} inputClassName={BARE_CONTROL} disabled={!!row} />
        </Field>

        <Field label={tr.deadline} required filled={!!f.deadline}>
          <StudioDate value={f.deadline} onChange={(iso) => setF((p) => ({ ...p, deadline: iso }))} />
        </Field>

        <Field label={tr.typeOfIndustry} required filled={!!f.industry}>
          <Combo value={f.industry} onChange={(v) => setF((p) => ({ ...p, industry: v }))}
            options={vocabulary.industries || []} inputClassName={BARE_CONTROL} />
        </Field>

        {/* The studio's currency sits IN the field, so the number is read together
            with what it is in. Value Quoted is derived, hence only a hint here. */}
        <Field label={tr.clientBudget} type="number" min="0" value={f.clientBudget} onChange={(v) => setF((p) => ({ ...p, clientBudget: v }))}
          prefix={studioDefaults.currency ? <CurrencySymbol code={studioDefaults.currency} /> : null}
          hint={<>{tr.valueQuotedHintBefore}<span className="font-600">{tr.valueQuotedHintTerm}</span>{tr.valueQuotedHintAfter}</>} />

        {row && (
          <>
            <Field label={tr.status} as="select" required value={f.status} onChange={(v) => setF((p) => ({ ...p, status: v }))} options={vocabulary.statuses || []} />
            <Field label={tr.urgency} as="select" required value={f.urgency} onChange={(v) => setF((p) => ({ ...p, urgency: v }))} options={vocabulary.urgencies || []} />
          </>
        )}

        <div className="sm:col-span-2">
          <label className={label}>{tr.probabilityOf(f.probability)}</label>
          <div className="flex items-center gap-3">
            <input type="range" min="0" max="100" step="1" value={f.probability}
              onChange={(e) => setF((s) => ({ ...s, probability: Number(e.target.value) }))}
              className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-brand-600 dark:bg-white/10" />
            <input type="number" min="0" max="100" value={f.probability} className={`${input} w-24`}
              onChange={(e) => setF((s) => ({ ...s, probability: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }))} />
          </div>
        </div>
      </div>

      {/* THE SHARED BLOCK. These eight fields, their known-contact and saved-site
          autofill and their country/city cascade used to live here and nowhere
          else, which is why the internal-quotation form asked for none of them.
          One component, two forms — see ClientBlock. */}
      <ClientBlock value={f} onChange={(patch) => setF((p) => ({ ...p, ...patch }))}
        client={matched} positions={positions} cities={cities} />

      <p className="mt-5 text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">{tr.servicesHeading}</p>
      {serviceActions.length === 0 ? (
        <p className="mt-2 rounded-xl border border-dashed border-slate-200 p-4 text-xs text-slate-500 dark:border-white/15 dark:text-slate-400">
          {tr.noServicesForTicket}
        </p>
      ) : (
        <div className="mt-2 space-y-2">
          {serviceActions.map((action) => {
            const on = serviceIds.includes(action);
            return (
              <div key={action} className="rounded-xl border border-slate-200 bg-[var(--geex-inset)] p-3.5 dark:border-white/15">
                <label className="flex items-center gap-2.5 text-sm">
                  <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={on} onChange={() => toggleService(action)} />
                  <span className="font-600 text-slate-900 dark:text-white">{action}</span>
                </label>
                {on && (
                  <div className="mt-2 flex flex-wrap gap-4 ps-7 text-xs text-slate-600 dark:text-slate-300">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="h-3.5 w-3.5 accent-brand-600" checked={!!(reqs[action] || {}).withoutInstallation} onChange={() => setReq(action, "withoutInstallation")} />
                      {tr.withoutInstallation}
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="h-3.5 w-3.5 accent-brand-600" checked={!!(reqs[action] || {}).withoutProgramming} onChange={() => setReq(action, "withoutProgramming")} />
                      {tr.withoutProgramming}
                    </label>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4"><label className={label}>{tr.description}</label><textarea rows={3} className={input} value={f.description} onChange={set("description")} /></div>

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
        }}>{busy ? tr.saving : tr.saveTicket}</button>
        <button className={btnGhost} onClick={onCancel}>{tr.cancel}</button>
      </div>
    </>
  );
}

// ---- settings --------------------------------------------------------------
// Sales Settings owns everything Sales needs to be configured with: the
// service catalogue tickets pick from, the vocabulary behind the contact and
// location fields, and the Live view's column selection.
function VocabList({ title, help, items, canManage, onChange }) {
  const tr = salesDict(useStudioLocale());
  const [draft, setDraft] = useState("");
  const add = () => { const v = draft.trim(); if (!v) return; onChange([...items, v]); setDraft(""); };
  return (
    <div>
      <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{title}</h3>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{help}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.length === 0 && <span className="text-xs text-slate-400">{tr.noneYet}</span>}
        {items.map((it) => (
          <span key={it} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-600 text-slate-700 dark:bg-white/5 dark:text-slate-200">
            {it}
            {canManage && (
              <button type="button" aria-label={tr.removeNamed(it)} className="text-slate-400 hover:text-rose-600"
                onClick={() => onChange(items.filter((x) => x !== it))}>×</button>
            )}
          </span>
        ))}
      </div>
      {canManage && (
        <div className="mt-3 flex gap-2">
          <input className={input} value={draft} onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} placeholder={tr.addAndEnter} />
          <button type="button" className={btnGhost} onClick={add}>{tr.add}</button>
        </div>
      )}
    </div>
  );
}

function SalesSettings({ options, selected, cities, positions, canManage, onSaveVocab }) {
  const tr = salesDict(useStudioLocale());
  const [cols, setCols] = useState(selected);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const toggle = (key) => { setSaved(false); setCols((c) => c.includes(key) ? c.filter((x) => x !== key) : [...c, key]); };

  return (
    <div className="space-y-6">
      <section className={panel}>
        <h2 className={h2}>{tr.vocabularyTitle}</h2>
        <p className={sub}>{tr.vocabularyLead}</p>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          <VocabList title={tr.citiesTitle} help={tr.citiesHelp} items={cities} canManage={canManage}
            onChange={(next) => onSaveVocab({ salesCities: next })} />
          <VocabList title={tr.positionsTitle} help={tr.positionsHelp} items={positions} canManage={canManage}
            onChange={(next) => onSaveVocab({ salesContactPositions: next })} />
        </div>
      </section>

      <section className={panel}>
        <h2 className={h2}>{tr.liveView}</h2>
        <p className={sub}>{tr.liveViewLead}</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {options.map((o) => (
            <label key={o.key} className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-[var(--geex-inset)] px-3.5 py-2.5 text-sm dark:border-white/15">
              <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={cols.includes(o.key)} disabled={!canManage} onChange={() => toggle(o.key)} />
              <span className="text-slate-900 dark:text-white">{liveColumnLabel(tr, o.key, o.label)}</span>
            </label>
          ))}
        </div>
        {canManage ? (
          <div className="mt-5 flex items-center gap-3">
            <button className={btn} disabled={busy} onClick={async () => { setBusy(true); const ok = await onSaveVocab({ liveColumns: cols }); setBusy(false); setSaved(!!ok); }}>
              {busy ? tr.saving : tr.saveColumns}
            </button>
            {saved && <span className="text-sm text-emerald-700 dark:text-emerald-400">{tr.saved}</span>}
          </div>
        ) : (
          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">{tr.settingsReadOnly}</p>
        )}
      </section>
    </div>
  );
}
