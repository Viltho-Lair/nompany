"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { Icon } from "@/components/studio2/icons";
import { useFocusedRecord } from "@/components/studio2/useFocusedRecord";
import {
  panel, h2, sub, input, inputRO, microLabel, label, btn, btnGhost, th, stripeOn, stripeOff,
  URGENCY_BADGE, money, fmtDate, fmtDateTime, prefKey, loadPref, savePref,
  Dialog, Toolbar, FilterButton, FilterPanel, ColumnPicker, Empty,
} from "@/components/studio2/ui";
import { isUnfinished } from "@/modules/technical/quotations";
import QuotationBuilder from "@/components/studio2/QuotationBuilder";
import { Field } from "@/components/fields/Field";
import StudioDate from "@/components/fields/StudioDate";
import TechnicalDashboard from "@/components/studio2/TechnicalDashboard";
import { useAnalyticsLevel } from "@/components/studio2/analyticsLevel";

// Technical: RFQs raised by Sales, and the quotations they become.
// Two different grants are in play — raising an RFQ needs Sales:manage, working
// it needs Technical:manage — so the buttons appear independently. The chrome
// comes from studio2/ui, so this section reads as the same product as Sales.

const RFQ_TONE = {
  New: "bg-brand-500/10 text-brand-700 dark:text-brand-300",
  "In-review": "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  Converted: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  Rejected: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};
const Q_TONE = {
  New: "bg-brand-500/10 text-brand-700 dark:text-brand-300",
  Draft: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  Completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  Sent: "bg-brand-500/10 text-brand-700 dark:text-brand-300",
  Approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  Rejected: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

// Columns the quotations table can show. Actions is always drawn, so it is not
// on the list.
const QUOTATION_COLUMNS = [
  { key: "number", label: "Number" },
  { key: "urgency", label: "Urgency" },
  { key: "title", label: "Title" },
  { key: "clientName", label: "Client" },
  { key: "description", label: "Description" },
  { key: "handledBy", label: "Handled by" },
  { key: "lead", label: "From" },
  { key: "latestComment", label: "Latest comment" },
  { key: "total", label: "Total" },
  { key: "createdAt", label: "Created" },
  { key: "status", label: "Status" },
];
const DEFAULT_QUOTATION_COLUMNS = ["number", "title", "clientName", "handledBy", "total", "status"];
const EMPTY_FILTERS = { handledBy: "", client: "", status: "", urgency: "", createdFrom: "", createdTo: "" };

const latestComment = (row) => {
  const all = Array.isArray(row.comments) ? row.comments : [];
  if (all.length === 0) return null;
  return [...all].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))[0];
};

// `view` is the ACTIVE SUB-SECTION key, so each sub-section is its own screen:
//   technical            -> the dashboard: quotation aggregates and analytics
//   technical-quotations -> the quotations list, editor and direct creation
//   technical-rfq        -> the RFQ queue and conversion
//   technical-settings   -> Live view columns + quotation cover copy
// technical-live renders full-screen outside the studio frame.
export default function StudioTechnical({ slug, view = "technical" }) {
  const [data, setData] = useState(null);
  const level = useAnalyticsLevel();
  const focusQuote = useFocusedRecord("quotation");
  const [error, setError] = useState("");
  const [creatingQuote, setCreatingQuote] = useState(false);
  const [raising, setRaising] = useState(false);
  const [converting, setConverting] = useState(null);
  const [editingQuote, setEditingQuote] = useState(null);
  // Stable, so each dialog's key/scroll-lock effect binds once instead of on
  // every keystroke in the form it wraps.
  const closeCreate = useCallback(() => setCreatingQuote(false), []);
  const closeRaise = useCallback(() => setRaising(false), []);
  const closeConvert = useCallback(() => setConverting(null), []);
  const closeEdit = useCallback(() => setEditingQuote(null), []);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/technical`, { cache: "no-store" });
    if (!res.ok) { setError("You don't have access to Technical in this studio."); return; }
    setData(await res.json());
  }, [slug]);
  useEffect(() => { load(); }, [load]);
  // Sales raised an RFQ, or someone revised a quotation — pick it up live.
  useLiveUpdates(slug, "technical", load);
  // A ticket moving in Sales is what puts a new RFQ within reach, so the
  // "Raise RFQ" list is watched too.
  useLiveUpdates(slug, "sales", load);

  // keepOpen is for the BUILDER. Every other caller is a dialog that should
  // close once its one job is done; the builder saves repeatedly and must stay
  // where it is, so it opts out of the closing rather than the closing being
  // spread across every caller.
  async function send(kind, method, payload, keepOpen = false) {
    setError("");
    const url = kind ? `/api/studios/${slug}/technical/${kind}` : `/api/studios/${slug}/technical`;
    const res = await fetch(url, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(
        out.error === "sales-required" || out.error === "forbidden" ? "Raising an RFQ needs Manage access to Sales."
        : out.error === "read-only" ? "You have view-only access to Technical."
        : out.error === "already" ? "That's already been done."
        // Refused at this door for the same reason the Sales button is not drawn:
        // an approval belongs to one quotation, and a revision would take it down
        // with the document it supersedes.
        : out.error === "approved" ? "That ticket's quotation has been approved — there is nothing left to revise."
        : out.error === "ticket" ? "Pick a ticket."
        : out.error === "locked" ? "That quotation is locked — it can't be changed. Unlock it first, on its own."
        : out.error === "not-approved" ? "Only an approved quotation can be locked."
        : out.error === "duplicate" ? "A quotation with that number already exists."
        : out.error === "number" ? "Give it a number."
        : out.error === "description" ? "Describe what is being quoted."
        : out.error === "handledBy" ? "Say who is handling it."
        : "That didn't save."
      );
      return false;
    }
    if (!keepOpen) { setRaising(false); setConverting(null); setEditingQuote(null); setCreatingQuote(false); }
    await load();
    return true;
  }

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">Loading Technical…</p>;

  const { canManage: canManageParent, canManageRfq, canManageQuotations, canRequestRfq, rfqs, quotations, openTickets, people, vocabulary, nav, nextQuotationNumber } = data;
  // MANAGE IS ASKED OF THE SCREEN BEING SHOWN. `view` is the section key, and
  // the map is keyed the same way, so a sub-section grant answers for its own
  // screen and the parent's answer no longer stands in for all of them.
  const canManage = data.manage?.[view] ?? canManageParent;

  const aliasOf = Object.fromEntries(people.map((p) => [p.id, p.alias]));
  // Handlers are collaborator ids, but a quotation created before that — or by
  // typing a name — holds the name itself. Show whichever resolves.
  const handlerName = (v) => (v ? aliasOf[v] || v : "—");

  const banner = error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>;

  if (view === "technical-settings") {
    return (
      <div className="space-y-6">
        {banner}
        <TechnicalSettings
          options={vocabulary.liveColumnOptions || []}
          selected={data.liveColumns || []}
          cover={data.cover || {}}
          canManage={data.canManageSettings}
          onSave={(patch) => send("", "PUT", patch)}
        />
      </div>
    );
  }

  if (view === "technical-rfq") {
    return (
      <div className="space-y-6">
        {banner}
        {raising && (
          <Dialog title="Raise an RFQ" description="Pick the ticket that needs pricing. Its details are copied across for Technical." onClose={closeRaise}>
            <RaiseRfq tickets={openTickets} onCancel={closeRaise} onSave={(p) => send("rfqs", "POST", p)} />
          </Dialog>
        )}
        {converting && (
          <Dialog title={`Quote ${converting.reference}`} description={`${converting.title} · ${converting.clientName || "—"}`} onClose={closeConvert}>
            <ConvertRfq rfq={converting} nextNumber={nextQuotationNumber} people={people}
              onCancel={closeConvert} onSave={(p) => send("quotations", "POST", { ...p, rfqId: converting.id })} />
          </Dialog>
        )}
        <RfqHandler
          rfqs={rfqs}
          canManage={canManageRfq}
          canRequestRfq={canRequestRfq}
          aliasOf={aliasOf}
          people={people}
          statuses={vocabulary.rfqStatuses || []}
          busy={false}
          onRaise={() => setRaising(true)}
          onSave={(id, patch) => send("rfqs", "PUT", { id, ...patch })}
          onConvert={(r) => setConverting(r)} />
      </div>
    );
  }

  if (view === "technical-quotations") {
    return (
      <div className="space-y-6">
        {banner}
        {creatingQuote && (
          <Dialog title="New quotation" description="Created without an RFQ, so it is marked Internal. Fields marked * are required." onClose={closeCreate} width="max-w-[560px]">
            <NewQuotation people={people} onCancel={closeCreate} onSave={(p) => send("quotations", "POST", p)} />
          </Dialog>
        )}
        {editingQuote && (
          <QuotationBuilder
            quote={quotations.find((q) => q.id === editingQuote.id) || editingQuote}
            canManage={canManageQuotations}
            catalogue={data.catalogue || []}
            currency={data.currency || ""}
            onClose={closeEdit}
            onSave={(p) => send("quotations", "PUT", { ...p, id: editingQuote.id }, true)} />
        )}
        <Quotations quotations={quotations} canManage={canManageQuotations} slug={slug} nav={nav} focus={focusQuote}
          handlerName={handlerName} people={people}
          statuses={vocabulary.quotationStatuses || []} urgencies={vocabulary.urgencies || []}
          onAdd={() => setCreatingQuote(true)}
          onOpen={(q) => setEditingQuote(q)}
          canUnlock={data.canUnlockQuotations}
          onLock={(q) => send("quotations", "PUT", { id: q.id, locked: true })}
          // ONLY the unlock, nothing beside it — the server refuses a request
          // that unlocks and edits in the same write.
          onUnlock={(q) => send("quotations", "PUT", { id: q.id, locked: false })} />
      </div>
    );
  }

  // Parent section: the Technical dashboard — a summary of every RFQ and
  // quotation, so it answers to technical.dashboard.view of its own.
  return (
    <div className="space-y-6">
      {banner}
      {data.canViewDashboard === false
        ? <Empty title="The dashboard isn't yours to see" body="This studio keeps its module dashboards behind a right of their own. The screens underneath are unaffected — pick one from the sidebar." />
        : <TechnicalDashboard rfqs={rfqs} quotations={quotations} handlerName={handlerName} level={level} currency={data.currency || ""} />}
    </div>
  );
}

// ---- RFQ queue -------------------------------------------------------------
// Requests for quotation sent by Sales. A New one is what Technical owes an
// answer on, so it carries the amber stripe until somebody picks it up.
// ---- RFQ handler -------------------------------------------------------------
// Every RFQ Sales has sent over, and one of them open beside the list.
//
// TWO PANES, not a table. An RFQ is a thing you work ON — read what Sales asked,
// decide who takes it, write down what you found, then convert it — and a table
// row has nowhere to do that. The list stays on screen so the queue is never out
// of sight while one is being handled.
//
// The information box is a DRAFT until Save. Nothing is written as you type,
// because half a decision saved is worse than none. Convert saves first and then
// opens the quotation, so converting can never silently discard what was typed.
function RfqHandler({ rfqs, canManage, canRequestRfq, aliasOf, people, statuses, busy, onRaise, onSave, onConvert }) {
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  // { id, values } — whose edits these are, so a draft can never be shown
  // against a different RFQ than the one it was typed into.
  const [edit, setEdit] = useState({ id: "", values: null });
  const [saved, setSaved] = useState(false);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rfqs;
    return rfqs.filter((r) =>
      [r.title, r.reference, r.clientName, r.industry, r.status]
        .some((v) => String(v || "").toLowerCase().includes(q)));
  }, [rfqs, query]);

  const selected = rfqs.find((r) => r.id === selectedId) || null;

  // DERIVED DURING RENDER, not in an effect. An effect runs after the render
  // that scheduled it, so the first frame of a newly opened RFQ had a record but
  // no draft — and the pane below reads the draft, which is why opening one
  // threw. Computing it here means the draft exists the moment the record does.
  //
  // Edits are kept against the id they were typed into, so a live update
  // arriving underneath cannot wipe them and switching RFQ cannot show them
  // against the wrong record.
  const draft = (edit.id === selectedId && edit.values)
    ? edit.values
    : (selected ? {
        status: selected.status || statuses[0] || "New",
        description: selected.description || "",
        handledByCollaboratorId: selected.handledByCollaboratorId || "",
      } : null);

  const converted = selected?.status === "Converted";
  const handlerName = aliasOf[selected?.handledByCollaboratorId] || "";
  const dirty = Boolean(draft && selected && !converted && (
    draft.status !== (selected.status || "")
    || draft.description !== (selected.description || "")
    || draft.handledByCollaboratorId !== (selected.handledByCollaboratorId || "")
  ));

  const set = (patch) => {
    setEdit({ id: selectedId, values: { ...draft, ...patch } });
    setSaved(false);
  };

  async function save() {
    if (!selected) return false;
    const ok = await onSave(selected.id, draft);
    if (ok) setEdit({ id: "", values: null });
    setSaved(Boolean(ok));
    return ok;
  }

  return (
    <section className={panel}>
      <div className="flex flex-wrap items-center gap-3">
        <input
          className={`${input} max-w-sm`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search RFQs"
        />
        <p className="text-sm text-slate-500 dark:text-slate-400">{shown.length} of {rfqs.length}</p>
        {canRequestRfq && <button className={`${btn} ms-auto`} onClick={onRaise}>Raise an RFQ</button>}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* ---- the queue ---- */}
        <div className="max-h-[560px] min-h-[240px] overflow-y-auto rounded-geex border border-slate-200/70 dark:border-white/10">
          {shown.length === 0 ? (
            <p className="p-4 text-sm text-slate-400">
              {query ? `Nothing matches “${query}”.` : "No RFQs have come over from Sales yet."}
            </p>
          ) : shown.map((r) => {
            const on = r.id === selectedId;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => { setSelectedId(r.id); setSaved(false); }}
                aria-pressed={on}
                className={`block w-full border-b border-slate-100 px-4 py-3 text-start transition-colors last:border-b-0 dark:border-white/5 ${
                  on ? "bg-brand-500/10" : "hover:bg-slate-50 dark:hover:bg-white/5"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-600 text-slate-900 dark:text-white">{r.title}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-700 ${URGENCY_BADGE[r.urgency] || URGENCY_BADGE.Normal}`}>
                    {r.urgency || "Normal"}
                  </span>
                </span>
                <span className="mt-0.5 block text-[11px] text-slate-400">
                  Received: {fmtDate(r.createdAt)} / Deadline: {r.deadline ? fmtDate(r.deadline) : "—"}
                </span>
              </button>
            );
          })}
        </div>

        {/* ---- the one being handled ---- */}
        <div className="min-h-[240px] rounded-geex border border-slate-200/70 p-5 dark:border-white/10">
          {!selected ? (
            <p className="text-sm text-slate-400">Choose an RFQ to see it here.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-start gap-3">
                {/* A converted RFQ is finished. Its quotation is what carries the
                    work now, so the record behind it stops being editable rather
                    than offering changes that would no longer mean anything. */}
                {converted ? (
                  <span className="rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-700 text-emerald-700 dark:text-emerald-300">
                    Converted{handlerName ? ` · handled by ${handlerName}` : ""}
                  </span>
                ) : canManage && (
                  <button className={btn} onClick={save} disabled={busy || !dirty}>
                    {saved && !dirty ? "Saved" : "Save"}
                  </button>
                )}
                <div className="min-w-0">
                  <h3 className="truncate font-display text-lg font-800 text-slate-900 dark:text-white">RFQ information</h3>
                  <p className="truncate font-mono text-xs text-slate-400">{selected.reference}</p>
                </div>
              </div>

              {/* What Sales sent. Read-only here: urgency belongs to a Sales
                  Leader, and the client, industry and deadline are what was sold. */}
              <dl className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                <RfqInfo label="Client" value={selected.clientName} />
                <RfqInfo label="Title" value={selected.title} />
                <RfqInfo label="Ticket" value={selected.ticketRef} mono />
                <RfqInfo label="Industry" value={selected.industry} />
                <RfqInfo label="Deadline" value={selected.deadline ? fmtDate(selected.deadline) : ""} />
                <RfqInfo label="Received" value={fmtDate(selected.createdAt)} />
                <RfqInfo label="Requested by" value={aliasOf[selected.requestedByCollaboratorId]} />
              </dl>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {/* Converted is never chosen by hand — it is what Convert does.
                    Who handles it is asked once, at conversion, rather than
                    being a second place to answer the same question. */}
                <Field label="Status" as="select" required value={draft.status}
                  disabled={!canManage || converted}
                  onChange={(v) => set({ status: v })}
                  options={statuses.filter((s) => s !== "Converted" || converted)} />
              </div>

              <Field className="mt-4" label="Description" as="textarea" value={draft.description}
                disabled={!canManage || converted}
                onChange={(v) => set({ description: v })} />

              {canManage && !converted && (
                <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 dark:border-white/5">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Convert this RFQ into a quotation. You choose who handles it next.
                  </p>
                  {/* Saves first: converting must never be the thing that loses
                      what was just typed into the box above it. */}
                  <button className={`${btn} ms-auto`} disabled={busy}
                    onClick={async () => { if (dirty && !(await save())) return; onConvert(selected); }}>
                    Convert
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function RfqInfo({ label: text, value, mono }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-600 uppercase tracking-wide text-slate-400">{text}</dt>
      <dd className={`mt-0.5 truncate text-sm text-slate-700 dark:text-slate-200 ${mono ? "font-mono text-xs" : ""}`}>
        {value || <span className="text-slate-400">—</span>}
      </dd>
    </div>
  );
}

function Quotations({ quotations, canManage, canUnlock, slug, nav, focus, handlerName, people, statuses, urgencies, onAdd, onOpen, onLock, onUnlock }) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [columns, setColumns] = useState(DEFAULT_QUOTATION_COLUMNS);
  const [showColumns, setShowColumns] = useState(false);

  // Read the saved preferences AFTER mount: localStorage does not exist on the
  // server, so reading it during render would make the first paint disagree
  // with the markup React sent.
  const colsKey = prefKey("technical", slug, "cols");
  const filtersKey = prefKey("technical", slug, "filters");
  useEffect(() => {
    const saved = loadPref(colsKey, null);
    setColumns(Array.isArray(saved) && saved.length ? saved.filter((k) => QUOTATION_COLUMNS.some((c) => c.key === k)) : DEFAULT_QUOTATION_COLUMNS);
    setFilters({ ...EMPTY_FILTERS, ...(loadPref(filtersKey, null) || {}) });
  }, [colsKey, filtersKey]);

  const col = (key) => columns.includes(key);
  const toggleCol = (key) => setColumns((prev) => {
    const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
    savePref(colsKey, next);
    return next;
  });
  const resetCols = () => { setColumns(DEFAULT_QUOTATION_COLUMNS); savePref(colsKey, DEFAULT_QUOTATION_COLUMNS); };
  const setFilter = (patch) => setFilters((prev) => { const next = { ...prev, ...patch }; savePref(filtersKey, next); return next; });
  const clearFilters = () => { setFilters(EMPTY_FILTERS); savePref(filtersKey, EMPTY_FILTERS); };
  const activeFilters = Object.values(filters).filter((v) => v !== "").length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const f = filters;
    return quotations.filter((r) => {
      if (f.status && r.status !== f.status) return false;
      if (f.handledBy && r.handledBy !== f.handledBy) return false;
      if (f.urgency && (r.urgency || "Normal") !== f.urgency) return false;
      if (f.client && !`${r.clientName || ""}`.toLowerCase().includes(f.client.toLowerCase())) return false;
      const created = (r.createdAt || "").slice(0, 10);
      if (f.createdFrom && created < f.createdFrom) return false;
      if (f.createdTo && created > f.createdTo) return false;
      if (q && !`${r.number || ""} ${r.title || ""} ${r.description || ""} ${r.clientName || ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [quotations, query, filters]);

  if (quotations.length === 0) {
    return (
      <>
        <Toolbar canManage={canManage} label="New quotation" onAdd={onAdd} />
        <Empty title="No quotations yet" body="Convert an RFQ to produce a priced quotation, or raise one here directly." />
      </>
    );
  }

  return (
    <>
      <Toolbar canManage={canManage} label="New quotation" onAdd={onAdd}>
        <input type="search" className={`${input} sm:max-w-xs`} aria-label="Search number, title, client or description"
          value={query} onChange={(e) => setQuery(e.target.value)} />
        <FilterButton active={activeFilters} open={showFilters} onClick={() => setShowFilters((v) => !v)} />
        <button type="button" className={btnGhost} onClick={() => setShowColumns(true)}>Columns</button>
      </Toolbar>

      {showFilters && (
        <FilterPanel onClear={clearFilters}>
          <Field label="Handled by" as="select" value={filters.handledBy}
            onChange={(v) => setFilter({ handledBy: v })}
            options={people.map((p) => ({ value: p.id, label: p.alias }))} />
          <Field label="Client" value={filters.client} onChange={(v) => setFilter({ client: v })} />
          <Field label="Status" as="select" value={filters.status}
            onChange={(v) => setFilter({ status: v })} options={statuses} />
          <Field label="Urgency" as="select" value={filters.urgency}
            onChange={(v) => setFilter({ urgency: v })} options={urgencies} />
          <Field label="Created from" filled={!!filters.createdFrom}>
            <StudioDate value={filters.createdFrom} onChange={(iso) => setFilter({ createdFrom: iso })} />
          </Field>
          <Field label="Created to" filled={!!filters.createdTo}>
            <StudioDate value={filters.createdTo} onChange={(iso) => setFilter({ createdTo: iso })} />
          </Field>
        </FilterPanel>
      )}

      {showColumns && (
        <ColumnPicker title="Quotation columns" columns={QUOTATION_COLUMNS} selected={columns}
          onToggle={toggleCol} onReset={resetCols} onClose={() => setShowColumns(false)} />
      )}

      <p className="text-sm text-slate-500 dark:text-slate-400">{filtered.length} of {quotations.length} quotation{quotations.length === 1 ? "" : "s"}.</p>

      <section className={panel}>
        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">No quotations match those filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10">
                  {/* ps-2 matches the body cells, which are pushed in by the
                      4px status stripe down the start edge of every row. */}
                  {QUOTATION_COLUMNS.filter((c) => col(c.key)).map((c) => (
                    <th key={c.key} className={`${th} ps-2 text-start`}>{c.label}</th>
                  ))}
                  <th className={`${th} text-end`} />
                </tr>
              </thead>
              <tbody>
                {filtered.map((q) => {
                  const comment = latestComment(q);
                  // New or Draft: work still owed. The stripe marks quotations
                  // nobody has finished, which is what the sidebar counts too.
                  const unsent = isUnfinished(q);
                  return (
                    <tr key={q.id} {...focus.focusProps(q.id)}
                      onClick={() => onOpen(q)}
                      tabIndex={0}
                      role="button"
                      aria-label={`${q.locked || !canManage ? "View" : "Open"} ${q.ref || "quotation"}`}
                      onKeyDown={(e) => { if (e.key === "Enter") onOpen(q); }}
                      className={`cursor-pointer border-s-4 border-b border-slate-100 align-top last:border-b-0 dark:border-white/5 ${
                        unsent ? stripeOn : stripeOff
                      } ${focus.focusProps(q.id).className || ""}`}>
                      {col("number") && (
                        <td className="py-3 pe-3 ps-2">
                          <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{q.number}</span>
                          {Number(q.revision) > 1 && <span className="ms-1.5 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-700 text-amber-700 dark:text-amber-300">Rev {q.revision}</span>}
                          {q.locked && <span className="ms-1.5 inline-flex align-middle text-slate-400" title="Locked — view only"><Icon name="lock" className="h-3.5 w-3.5" /></span>}
                        </td>
                      )}
                      {col("urgency") && (
                        <td className="py-3 pe-3 ps-2">
                          {q.urgency
                            ? <span className={`rounded-full px-2.5 py-1 text-xs font-600 ${URGENCY_BADGE[q.urgency] || URGENCY_BADGE.Normal}`}>{q.urgency}</span>
                            : <span className="text-slate-400">—</span>}
                        </td>
                      )}
                      {/* Title only. The RFQ and Ticket chips are gone: the whole
                          row already opens the builder, so two smaller targets
                          inside it sent people somewhere else by accident. The
                          links are still on the quotation itself — hidden here,
                          not severed. */}
                      {col("title") && (
                        <td className="py-3 pe-3 ps-2">
                          <span className="font-600 text-slate-900 dark:text-white">{q.title || "—"}</span>
                        </td>
                      )}
                      {col("clientName") && <td className="py-3 pe-3 ps-2 text-slate-600 dark:text-slate-300">{q.clientName || "—"}</td>}
                      {col("description") && <td className="max-w-xs py-3 pe-3 ps-2 text-slate-600 dark:text-slate-300"><span className="block truncate" title={q.description}>{q.description || "—"}</span></td>}
                      {col("handledBy") && <td className="py-3 pe-3 ps-2 text-slate-600 dark:text-slate-300">{handlerName(q.handledBy)}</td>}
                      {col("lead") && <td className="py-3 pe-3 ps-2 text-slate-600 dark:text-slate-300">{q.leadLabel || "Internal"}</td>}
                      {col("latestComment") && (
                        <td className="max-w-xs py-3 pe-3 ps-2 text-slate-600 dark:text-slate-300">
                          {comment
                            ? <span className="block truncate" title={`${handlerName(comment.byCollaboratorId)} · ${fmtDateTime(comment.createdAt)}\n${comment.text}`}>{comment.text}</span>
                            : <span className="text-slate-400">—</span>}
                        </td>
                      )}
                      {col("total") && <td className="py-3 pe-3 ps-2 tabular-nums text-slate-600 dark:text-slate-300">{money(q.total)}</td>}
                      {col("createdAt") && <td className="py-3 pe-3 ps-2 text-slate-500 dark:text-slate-400">{fmtDate(q.createdAt)}</td>}
                      {col("status") && (
                        <td className="py-3 pe-3 ps-2">
                          {/* READ, never set. A quotation's status is what has
                              happened to it — New until somebody opens the
                              builder, Draft while it is being built, Completed
                              when they submit. Offering it as a dropdown here
                              invited people to contradict the record. */}
                          <span className={`rounded-full px-2.5 py-1 text-xs font-600 ${Q_TONE[q.status] || Q_TONE.Draft}`}>{q.status}</span>
                        </td>
                      )}
                      <td className="py-3 text-end">
                        <span className="inline-flex gap-2">
                          {canManage && q.status === "Approved" && !q.locked && (
                            <button className={btnGhost} title="Lock — it becomes view-only" onClick={(e) => { e.stopPropagation(); onLock(q); }}>Lock</button>
                          )}
                          {/* Offered only to somebody who holds unlock. Locking
                              the wrong document used to have no remedy but a new
                              quotation with a new number, which is a worse lie
                              than the mistake. */}
                          {canUnlock && q.locked && (
                            <button className={btnGhost} title="Reopen this locked quotation" onClick={(e) => { e.stopPropagation(); onUnlock(q); }}>Unlock</button>
                          )}
                        </span>
                      </td>
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

// ---- forms -----------------------------------------------------------------
function RaiseRfq({ tickets, onSave, onCancel }) {
  const [ticketId, setTicketId] = useState(tickets[0]?.id || "");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  if (tickets.length === 0) {
    return (
      <>
        <p className="text-sm text-slate-500 dark:text-slate-400">Every open ticket already has an RFQ against it, so there is nothing to raise.</p>
        <div className="mt-5"><button className={btnGhost} onClick={onCancel}>Close</button></div>
      </>
    );
  }
  return (
    <>
      <div className="grid gap-4">
        <Field label="Ticket" as="select" required value={ticketId} onChange={(v) => setTicketId(v)}
          options={tickets.map((t) => ({ value: t.id, label: `${t.ref} — ${t.title}` }))} />
        <Field label="What's needed" as="textarea" value={description} onChange={(v) => setDescription(v)} />
      </div>
      <div className="mt-5 flex gap-3">
        <button className={btn} disabled={busy || !ticketId} onClick={async () => { setBusy(true); await onSave({ ticketId, description }); setBusy(false); }}>
          {busy ? "Raising…" : "Raise RFQ"}
        </button>
        <button className={btnGhost} onClick={onCancel}>Cancel</button>
      </div>
    </>
  );
}

function ConvertRfq({ rfq, nextNumber, people, onSave, onCancel }) {
  // No items and no VAT. Converting says a quotation exists, who owns it and
  // what it is called; what goes ON it belongs to the builder.
  const [handledBy, setHandledBy] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <>
      {/* What Sales sent over. Read-only here: urgency belongs to a Sales
          Leader, and the industry and services are what was sold. */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={label}>Quotation number</label>
          {/* Issued by the studio's numbering, not typed: a number somebody
              chose by hand is a number somebody can choose twice. */}
          <input className={inputRO} value={nextNumber || "Assigned on save"} readOnly />
        </div>
        <div><label className={label}>Client</label><input className={inputRO} value={rfq.clientName || "—"} readOnly /></div>
        <div><label className={label}>Title</label><input className={inputRO} value={rfq.title || "—"} readOnly /></div>
        <div>
          <label className={label}>Urgency <span className="font-500 normal-case text-slate-400">(set by Sales)</span></label>
          <div className={`${inputRO} flex items-center`}>
            <span className={`rounded-full px-2.5 py-1 text-xs font-600 ${URGENCY_BADGE[rfq.urgency] || URGENCY_BADGE.Normal}`}>{rfq.urgency || "Normal"}</span>
          </div>
        </div>
        <div><label className={label}>Industry <span className="font-500 normal-case text-slate-400">(set by Sales)</span></label><input className={inputRO} value={rfq.industry || "—"} readOnly /></div>
      </div>

      {/* One question, because converting only decides WHO takes it. The
          description comes across from the RFQ; retyping it here would give the
          same sentence two homes. */}
      <Field className="mt-4 sm:max-w-xs" label="Handled by" as="select" value={handledBy}
        onChange={(v) => setHandledBy(v)}
        options={people.map((p) => ({ value: p.id, label: p.alias }))} />

      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        The quotation is numbered automatically and its lead is set to <span className="font-600">{rfq.ticketRef || rfq.reference}</span>.
      </p>
      <div className="mt-5 flex gap-3">
        <button className={btn} disabled={busy || !handledBy} onClick={async () => { setBusy(true); await onSave({ handledByCollaboratorId: handledBy }); setBusy(false); }}>
          {busy ? "Converting…" : "Convert"}
        </button>
        <button className={btnGhost} onClick={onCancel}>Cancel</button>
      </div>
    </>
  );
}

// A quotation raised straight from the Quotations screen, with no RFQ behind
// it. Number, description and handled-by are all required, per the Old System.
function NewQuotation({ people, onSave, onCancel }) {
  const [f, setF] = useState({ number: "", description: "", handledBy: "" });
  const [busy, setBusy] = useState(false);
  const ready = f.number.trim() && f.description.trim() && f.handledBy.trim();
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Number" required value={f.number} onChange={(v) => setF((s) => ({ ...s, number: v }))} />
        <Field label="Handled by" as="select" value={f.handledBy} onChange={(v) => setF((s) => ({ ...s, handledBy: v }))}
          options={people.map((p) => ({ value: p.id, label: p.alias }))} />
        <Field className="sm:col-span-2" label="Description" required as="textarea" value={f.description}
          onChange={(v) => setF((s) => ({ ...s, description: v }))} />
      </div>
      <div className="mt-5 flex gap-3">
        <button className={btn} disabled={busy || !ready} onClick={async () => { setBusy(true); await onSave(f); setBusy(false); }}>
          {busy ? "Saving…" : "Create quotation"}
        </button>
        <button className={btnGhost} onClick={onCancel}>Cancel</button>
      </div>
    </>
  );
}


// ---- settings --------------------------------------------------------------
// Technical Settings: the Live view's columns, and the standing cover copy that
// heads a quotation document (the Old System's "Cover copy settings").
function TechnicalSettings({ options, selected, cover, canManage, onSave }) {
  const [cols, setCols] = useState(selected);
  const [c, setC] = useState({ title: cover.title || "", intro: cover.intro || "", terms: cover.terms || "" });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const toggle = (k) => { setSaved(false); setCols((v) => v.includes(k) ? v.filter((x) => x !== k) : [...v, k]); };
  const save = async (patch) => { setBusy(true); const ok = await onSave(patch); setBusy(false); setSaved(!!ok); };

  return (
    <div className="space-y-6">
      <section className={panel}>
        <h2 className={h2}>Cover copy</h2>
        <p className={sub}>The standing text that heads a quotation document.</p>
        <div className="mt-4 grid gap-4">
          <Field label="Title" value={c.title} disabled={!canManage}
            onChange={(v) => setC((prev) => ({ ...prev, title: v }))} />
          <Field label="Introduction" as="textarea" value={c.intro} disabled={!canManage}
            onChange={(v) => setC((prev) => ({ ...prev, intro: v }))} />
          <Field label="Terms" as="textarea" value={c.terms} disabled={!canManage}
            onChange={(v) => setC((prev) => ({ ...prev, terms: v }))} />
        </div>
        {canManage && (
          <div className="mt-5">
            <button className={btn} disabled={busy} onClick={() => save({ coverTitle: c.title, coverIntro: c.intro, coverTerms: c.terms })}>
              {busy ? "Saving..." : "Save cover copy"}
            </button>
          </div>
        )}
      </section>

      <section className={panel}>
        <h2 className={h2}>Live view</h2>
        <p className={sub}>Choose the quotation columns the Live view shows. This is a shared setting — it applies to everyone. At least one is kept.</p>
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
            <button className={btn} disabled={busy} onClick={() => save({ liveColumns: cols })}>{busy ? "Saving..." : "Save columns"}</button>
            {saved && <span className="text-sm text-emerald-700 dark:text-emerald-400">Saved</span>}
          </div>
        ) : (
          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">You have view-only access to Technical settings.</p>
        )}
      </section>
    </div>
  );
}
