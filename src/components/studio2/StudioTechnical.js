"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import RecordLink from "@/components/studio2/RecordLink";
import { Icon } from "@/components/studio2/icons";
import { useFocusedRecord } from "@/components/studio2/useFocusedRecord";
import {
  panel, h2, sub, input, inputRO, microLabel, label, btn, btnGhost, th, stripeOn, stripeOff,
  URGENCY_BADGE, money, fmtDate, fmtDateTime, prefKey, loadPref, savePref,
  Dialog, Toolbar, FilterButton, FilterPanel, ColumnPicker, Empty, StatTile,
  WidgetTitle, FunnelChart, BarBreakdown, Leaderboard, TimelineChart, ScatterChart,
} from "@/components/studio2/ui";
import { linkToTicket, linkToRfq, linkIf } from "@/lib/studioLinks";
import { isUnsent } from "@/lib/quotations";
import {
  quotationStats, rfqFunnel, urgencyBreakdown, handlerLeaderboard,
  quotationTimeline, completionScatter, averageTurnaround, quotationValue, isUnworked,
} from "@/lib/technicalAnalytics";

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
  Draft: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300",
  Sent: "bg-brand-500/10 text-brand-700 dark:text-brand-300",
  Approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  Rejected: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};
// The same tones as plain text, for the inline status <select>.
const Q_TEXT = {
  Draft: "text-slate-600 dark:text-slate-300",
  Sent: "text-brand-700 dark:text-brand-300",
  Approved: "text-emerald-700 dark:text-emerald-300",
  Rejected: "text-rose-600 dark:text-rose-400",
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

  async function send(kind, method, payload) {
    setError("");
    const url = kind ? `/api/studios/${slug}/technical/${kind}` : `/api/studios/${slug}/technical`;
    const res = await fetch(url, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(
        out.error === "sales-required" ? "Raising an RFQ needs Manage access to Sales."
        : out.error === "read-only" ? "You have view-only access to Technical."
        : out.error === "already" ? "That's already been done."
        : out.error === "ticket" ? "Pick a ticket."
        : out.error === "locked" ? "That quotation is locked — it can't be changed."
        : out.error === "not-approved" ? "Only an approved quotation can be locked."
        : out.error === "duplicate" ? "A quotation with that number already exists."
        : out.error === "number" ? "Give it a number."
        : out.error === "description" ? "Describe what is being quoted."
        : out.error === "handledBy" ? "Say who is handling it."
        : "That didn't save."
      );
      return false;
    }
    setRaising(false); setConverting(null); setEditingQuote(null); setCreatingQuote(false);
    await load();
    return true;
  }

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">Loading Technical…</p>;

  const { canManage, canRequestRfq, rfqs, quotations, openTickets, people, vocabulary, nav } = data;
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
            <ConvertRfq rfq={converting} vat={vocabulary.defaultVatRate} people={people}
              onCancel={closeConvert} onSave={(p) => send("quotations", "POST", { ...p, rfqId: converting.id })} />
          </Dialog>
        )}
        <RfqHandler
          rfqs={rfqs}
          canManage={canManage}
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
          <Dialog title={`${editingQuote.number} · ${editingQuote.title || ""}`}
            description={editingQuote.locked ? "Locked — view only." : "The number is fixed once assigned. Pricing recomputes on save."}
            onClose={closeEdit} width="max-w-[820px]">
            <QuoteEditor quote={editingQuote} statuses={vocabulary.quotationStatuses} people={people}
              aliasOf={aliasOf} canManage={canManage}
              onCancel={closeEdit} onSave={(p) => send("quotations", "PUT", { ...p, id: editingQuote.id })} />
          </Dialog>
        )}
        <Quotations quotations={quotations} canManage={canManage} slug={slug} nav={nav} focus={focusQuote}
          handlerName={handlerName} people={people}
          statuses={vocabulary.quotationStatuses || []} urgencies={vocabulary.urgencies || []}
          onAdd={() => setCreatingQuote(true)}
          onOpen={(q) => setEditingQuote(q)}
          onStatus={(q, status) => send("quotations", "PUT", { id: q.id, status })}
          onLock={(q) => send("quotations", "PUT", { id: q.id, locked: true })} />
      </div>
    );
  }

  // Parent section: the Technical dashboard.
  return (
    <div className="space-y-6">
      {banner}
      <TechnicalDashboard slug={slug} rfqs={rfqs} quotations={quotations} nav={nav} handlerName={handlerName} />
    </div>
  );
}

// ---- dashboard -------------------------------------------------------------
// An overview of quotations and how fast they turn around, then the RFQ side
// underneath — the two halves of what Technical is actually doing.
function TechnicalDashboard({ slug, rfqs, quotations, nav, handlerName }) {
  const stats = useMemo(() => quotationStats(quotations), [quotations]);
  const timeline = useMemo(() => quotationTimeline(quotations, 30), [quotations]);
  const scatter = useMemo(() => completionScatter(quotations), [quotations]);
  const turnaround = useMemo(() => averageTurnaround(quotations), [quotations]);
  const value = useMemo(() => quotationValue(quotations), [quotations]);
  const funnel = useMemo(() => rfqFunnel(rfqs), [rfqs]);
  const urgency = useMemo(() => urgencyBreakdown(quotations), [quotations]);
  const leaders = useMemo(() => handlerLeaderboard(quotations, handlerName), [quotations, handlerName]);
  const openRfqs = rfqs.filter((r) => r.status !== "Converted" && r.status !== "Rejected").length;

  const recent = useMemo(
    () => [...quotations].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")).slice(0, 5),
    [quotations],
  );

  const quotationsHref = nav?.["technical-quotations"] ? `/${slug}/technical-quotations` : "";
  const rfqHref = nav?.["technical-rfq"] ? `/${slug}/technical-rfq` : "";

  return (
    <>
      <section className={panel}>
        <h2 className={h2}>Technical</h2>
        <p className={sub}>Quotations, the RFQs behind them, and how long the work is taking.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatTile label="Quotations" value={stats.total} href={quotationsHref} />
          {(["Draft", "Sent", "Approved", "Rejected"]).map((s) => (
            <StatTile key={s} label={s} value={
              <span className="flex items-baseline gap-2">
                {stats[s]}
                <span className={`rounded-full px-2 py-0.5 text-xs font-600 ${Q_TONE[s]}`}>
                  {stats.total ? Math.round((stats[s] / stats.total) * 100) : 0}%
                </span>
              </span>
            } href={quotationsHref} />
          ))}
          <StatTile label="Open RFQs" value={openRfqs} href={rfqHref} />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <StatTile label="Pipeline value" value={money(value.all)} />
          <StatTile label="Approved value" value={money(value.approved)} tone="text-emerald-700 dark:text-emerald-300" />
          <StatTile label="Average turnaround" value={turnaround === null ? "—" : `${turnaround} day${turnaround === 1 ? "" : "s"}`} />
        </div>
      </section>

      {nav?.["technical-live"] && (
        <section className={`${panel} flex flex-wrap items-center justify-between gap-3`}>
          <div className="min-w-0">
            <p className={microLabel}>Live view</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              A full-screen quotations table that refreshes on its own. Columns are configured in{" "}
              {nav?.["technical-settings"]
                ? <a href={`/${slug}/technical-settings`} className="font-600 text-brand-700 hover:underline dark:text-brand-300">Technical → Settings</a>
                : <span className="font-600">Technical → Settings</span>}.
            </p>
          </div>
          <a href={`/${slug}/technical-live`} className={btn}>Open live view →</a>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={panel}>
          <WidgetTitle hint="New quotations, last 30 days">Volume</WidgetTitle>
          <div className="text-brand-500 dark:text-brand-300"><TimelineChart data={timeline} ariaLabel="New quotations over the last 30 days" /></div>
        </section>
        <section className={panel}>
          <WidgetTitle hint="Days from creation to approval, oldest to newest">Turnaround</WidgetTitle>
          <div className="text-emerald-500 dark:text-emerald-300">
            <ScatterChart points={scatter} ariaLabel="Days to approval per quotation" emptyLabel="No quotation has been approved yet." />
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={panel}>
          <WidgetTitle hint="RFQs by workflow status">RFQ funnel</WidgetTitle>
          <FunnelChart data={funnel} />
        </section>
        <section className={panel}>
          <WidgetTitle hint="Quotations by the urgency carried from the ticket">Urgency breakdown</WidgetTitle>
          <BarBreakdown data={urgency.map((d) => ({ ...d, color: { Critical: "bg-rose-500", High: "bg-amber-500", Normal: "bg-brand-500", Low: "bg-slate-400" }[d.label] }))} />
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={panel}>
          <WidgetTitle hint="Quotations handled, ranked">Handler leaderboard</WidgetTitle>
          <Leaderboard rows={leaders} valueKey="total" subtitle={(r) => `${r.approved} approved · ${r.open} open`} />
        </section>

        <section className={panel}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className={microLabel}>Recent</p>
            {quotationsHref && <a href={quotationsHref} className="text-xs font-600 text-brand-700 hover:underline dark:text-brand-300">See all →</a>}
          </div>
          {recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No quotations yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-white/5">
              {recent.map((q) => (
                <li key={q.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-600 text-slate-900 dark:text-white">{q.number}</p>
                    <p className="truncate text-xs text-slate-400 dark:text-slate-500">{q.title || q.description || "—"}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-600 ${Q_TONE[q.status] || Q_TONE.Draft}`}>{q.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
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

  const dirty = Boolean(draft && selected && (
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
          placeholder="Search"
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
                {canManage && (
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
                <RfqInfo label="Ticket" value={selected.ticketRef} mono />
                <RfqInfo label="Industry" value={selected.industry} />
                <RfqInfo label="Deadline" value={selected.deadline ? fmtDate(selected.deadline) : ""} />
                <RfqInfo label="Received" value={fmtDate(selected.createdAt)} />
                <RfqInfo label="Requested by" value={aliasOf[selected.requestedByCollaboratorId]} />
              </dl>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={label}>Status</label>
                  {/* Converted is never chosen by hand — it is what Convert does. */}
                  <select className={input} value={draft.status} disabled={!canManage || selected.status === "Converted"}
                    onChange={(e) => set({ status: e.target.value })}>
                    {statuses.filter((s) => s !== "Converted" || selected.status === "Converted")
                      .map((s) => (<option key={s} value={s}>{s}</option>))}
                  </select>
                </div>
                <div>
                  <label className={label}>Handled by</label>
                  <select className={input} value={draft.handledByCollaboratorId} disabled={!canManage}
                    onChange={(e) => set({ handledByCollaboratorId: e.target.value })}>
                    <option value="">Unassigned</option>
                    {people.map((p) => (<option key={p.id} value={p.id}>{p.alias}</option>))}
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className={label}>Description</label>
                <textarea rows={5} className={input} value={draft.description} disabled={!canManage}
                  onChange={(e) => set({ description: e.target.value })} />
              </div>

              {canManage && selected.status !== "Converted" && (
                <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 dark:border-white/5">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Convert into a quotation for{" "}
                    <span className="font-600 text-slate-700 dark:text-slate-200">
                      {aliasOf[draft.handledByCollaboratorId] || "whoever takes it"}
                    </span>.
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

function Quotations({ quotations, canManage, slug, nav, focus, handlerName, people, statuses, urgencies, onAdd, onOpen, onStatus, onLock }) {
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
        <input type="search" className={`${input} sm:max-w-xs`} placeholder="Search number, title, client or description…"
          value={query} onChange={(e) => setQuery(e.target.value)} />
        <FilterButton active={activeFilters} open={showFilters} onClick={() => setShowFilters((v) => !v)} />
        <button type="button" className={btnGhost} onClick={() => setShowColumns(true)}>Columns</button>
      </Toolbar>

      {showFilters && (
        <FilterPanel onClear={clearFilters}>
          <div>
            <label className={microLabel}>Handled by</label>
            <select className={input} value={filters.handledBy} onChange={(e) => setFilter({ handledBy: e.target.value })}>
              <option value="">Anyone</option>
              {people.map((p) => (<option key={p.id} value={p.id}>{p.alias}</option>))}
            </select>
          </div>
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
            <label className={microLabel}>Created from</label>
            <input type="date" className={input} value={filters.createdFrom} onChange={(e) => setFilter({ createdFrom: e.target.value })} />
          </div>
          <div>
            <label className={microLabel}>Created to</label>
            <input type="date" className={input} value={filters.createdTo} onChange={(e) => setFilter({ createdTo: e.target.value })} />
          </div>
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
                  // A quotation still in Draft is one nobody has sent — the
                  // same thing the sidebar's badge counts.
                  const unsent = isUnsent(q);
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
                      {col("title") && (
                        <td className="py-3 pe-3 ps-2">
                          <span className="font-600 text-slate-900 dark:text-white">{q.title || "—"}</span>
                          <span className="ms-2 inline-flex gap-1">
                            {q.rfqId && <RecordLink href={linkIf(nav?.["technical-rfq"], linkToRfq(slug, q.rfqId))} title="Open the RFQ">RFQ</RecordLink>}
                            {q.ticketId && <RecordLink href={linkIf(nav?.sales, linkToTicket(slug, q.ticketId))} title="Open the ticket">Ticket</RecordLink>}
                          </span>
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
                          {canManage && !q.locked ? (
                            <select value={q.status} onClick={(e) => e.stopPropagation()} onChange={(e) => onStatus(q, e.target.value)}
                              className={`rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-600 focus:border-brand-500 focus:outline-none dark:border-white/15 dark:bg-[#191921] ${Q_TEXT[q.status] || ""}`}>
                              {statuses.map((s) => (<option key={s} value={s}>{s}</option>))}
                            </select>
                          ) : (
                            <span className={`rounded-full px-2.5 py-1 text-xs font-600 ${Q_TONE[q.status] || Q_TONE.Draft}`}>{q.status}</span>
                          )}
                        </td>
                      )}
                      <td className="py-3 text-end">
                        <span className="inline-flex gap-2">
                          {canManage && q.status === "Approved" && !q.locked && (
                            <button className={btnGhost} title="Lock permanently — it becomes view-only" onClick={(e) => { e.stopPropagation(); onLock(q); }}>Lock</button>
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
        <div>
          <label className={label}>Ticket</label>
          <select className={input} value={ticketId} onChange={(e) => setTicketId(e.target.value)}>
            {tickets.map((t) => <option key={t.id} value={t.id}>{t.ref} — {t.title}</option>)}
          </select>
        </div>
        <div><label className={label}>What&apos;s needed</label><textarea rows={3} className={input} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
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

function ConvertRfq({ rfq, vat, people, onSave, onCancel }) {
  const [items, setItems] = useState([{ description: "", qty: 1, unitPrice: 0 }]);
  const [vatRate, setVatRate] = useState(vat);
  const [handledBy, setHandledBy] = useState("");
  const [description, setDescription] = useState(rfq.description || rfq.title || "");
  const [busy, setBusy] = useState(false);
  return (
    <>
      {/* What Sales sent over. Read-only here: urgency belongs to a Sales
          Leader, and the industry and services are what was sold. */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div><label className={label}>Client</label><input className={inputRO} value={rfq.clientName || "—"} readOnly /></div>
        <div>
          <label className={label}>Urgency <span className="font-500 normal-case text-slate-400">(set by Sales)</span></label>
          <div className={`${inputRO} flex items-center`}>
            <span className={`rounded-full px-2.5 py-1 text-xs font-600 ${URGENCY_BADGE[rfq.urgency] || URGENCY_BADGE.Normal}`}>{rfq.urgency || "Normal"}</span>
          </div>
        </div>
        <div><label className={label}>Industry <span className="font-500 normal-case text-slate-400">(set by Sales)</span></label><input className={inputRO} value={rfq.industry || "—"} readOnly /></div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Handled by</label>
          <select className={input} value={handledBy} onChange={(e) => setHandledBy(e.target.value)}>
            <option value="">— nobody yet —</option>
            {people.map((p) => (<option key={p.id} value={p.id}>{p.alias}</option>))}
          </select>
        </div>
        <div><label className={label}>Description</label><input className={input} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
      </div>

      <LineItems items={items} setItems={setItems} vatRate={vatRate} setVatRate={setVatRate} />
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        The quotation is numbered automatically and its lead is set to <span className="font-600">{rfq.ticketRef || rfq.reference}</span>.
      </p>
      <div className="mt-5 flex gap-3">
        <button className={btn} disabled={busy} onClick={async () => { setBusy(true); await onSave({ items, vatRate, handledBy, description }); setBusy(false); }}>
          {busy ? "Creating…" : "Create quotation"}
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
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const ready = f.number.trim() && f.description.trim() && f.handledBy.trim();
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className={label}>Number *</label><input className={input} value={f.number} onChange={set("number")} placeholder="Q-0001" /></div>
        <div>
          <label className={label}>Handled by *</label>
          <select className={input} value={f.handledBy} onChange={set("handledBy")}>
            <option value="">— select —</option>
            {people.map((p) => (<option key={p.id} value={p.id}>{p.alias}</option>))}
          </select>
        </div>
        <div className="sm:col-span-2"><label className={label}>Description *</label><textarea rows={3} className={input} value={f.description} onChange={set("description")} /></div>
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

function QuoteEditor({ quote, statuses, people, aliasOf, canManage, onSave, onCancel }) {
  const [items, setItems] = useState(quote.items?.length ? quote.items : [{ description: "", qty: 1, unitPrice: 0 }]);
  const [vatRate, setVatRate] = useState(quote.vatRate ?? 15);
  const [status, setStatus] = useState(quote.status);
  const [handledBy, setHandledBy] = useState(quote.handledBy || "");
  const [description, setDescription] = useState(quote.description || "");
  const [newComment, setNewComment] = useState("");
  const [busy, setBusy] = useState(false);
  const readOnly = quote.locked || !canManage;
  const comments = useMemo(
    () => [...(quote.comments || [])].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
    [quote.comments],
  );

  return (
    <>
      {/* Carried from Sales via the RFQ, and not editable here. */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div><label className={label}>Client</label><input className={inputRO} value={quote.clientName || "—"} readOnly /></div>
        <div>
          <label className={label}>Urgency <span className="font-500 normal-case text-slate-400">(set by Sales)</span></label>
          <div className={`${inputRO} flex items-center`}>
            <span className={`rounded-full px-2.5 py-1 text-xs font-600 ${URGENCY_BADGE[quote.urgency] || URGENCY_BADGE.Normal}`}>{quote.urgency || "Normal"}</span>
          </div>
        </div>
        <div><label className={label}>From</label><input className={inputRO} value={quote.leadLabel || "Internal"} readOnly /></div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <label className={label}>Number <span className="font-500 normal-case text-slate-400">(locked)</span></label>
          <input className={inputRO} value={quote.number} readOnly title="A quotation's number is fixed once assigned — it is the reference the client holds." />
        </div>
        <div>
          <label className={label}>Handled by</label>
          <select className={input} value={handledBy} disabled={readOnly} onChange={(e) => setHandledBy(e.target.value)}>
            <option value="">— nobody yet —</option>
            {people.map((p) => (<option key={p.id} value={p.id}>{p.alias}</option>))}
            {/* A handler typed in before collaborators were pickable still has
                to render, or saving would silently reassign the quotation. */}
            {handledBy && !people.some((p) => p.id === handledBy) && <option value={handledBy}>{handledBy}</option>}
          </select>
        </div>
        <div>
          <label className={label}>Status</label>
          <select className={input} value={status} disabled={readOnly} onChange={(e) => setStatus(e.target.value)}>
            {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="sm:col-span-3">
          <label className={label}>Description</label>
          <textarea rows={2} className={input} value={description} disabled={readOnly} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </div>

      <LineItems items={items} setItems={setItems} vatRate={vatRate} setVatRate={setVatRate} disabled={readOnly} />

      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/15 dark:bg-[#191921]">
        <p className={microLabel}>Comments</p>
        {comments.length === 0 ? (
          <p className="text-sm text-slate-400">No comments yet.</p>
        ) : (
          <ul className="mb-3 max-h-40 space-y-2 overflow-y-auto text-sm">
            {comments.map((c) => (
              <li key={c.id} className="rounded-lg bg-white p-2.5 text-slate-700 dark:bg-[#20202c] dark:text-slate-300">
                <div className="mb-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                  {aliasOf[c.byCollaboratorId] || "Someone"} · {fmtDateTime(c.createdAt)}
                </div>
                <div className="whitespace-pre-wrap">{c.text}</div>
              </li>
            ))}
          </ul>
        )}
        {!readOnly && (
          <>
            <label className={label}>Add a comment</label>
            <textarea rows={2} className={input} value={newComment} onChange={(e) => setNewComment(e.target.value)}
              placeholder="Appended on save and attributed to you." />
          </>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        Created {fmtDateTime(quote.createdAt)}{quote.completedAt ? ` · approved ${fmtDateTime(quote.completedAt)}` : ""}. The creation date cannot be changed.
      </p>

      <div className="mt-5 flex gap-3">
        {!readOnly && (
          <button className={btn} disabled={busy} onClick={async () => {
            setBusy(true);
            await onSave({ items, vatRate, status, handledBy, description, ...(newComment.trim() ? { newComment } : {}) });
            setBusy(false);
          }}>{busy ? "Saving…" : "Save quotation"}</button>
        )}
        <button className={btnGhost} onClick={onCancel}>Close</button>
      </div>
    </>
  );
}

// Shared line-item editor. Totals shown here are a preview — the server always
// recomputes them, so a tampered client can't change what's stored.
function LineItems({ items, setItems, vatRate, setVatRate, disabled = false }) {
  const totals = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.unitPrice) || 0), 0);
    const vat = subtotal * ((Number(vatRate) || 0) / 100);
    return { subtotal, vat, total: subtotal + vat };
  }, [items, vatRate]);
  const set = (idx, key, value) => setItems(items.map((it, i) => (i === idx ? { ...it, [key]: value } : it)));

  return (
    <>
      <p className="mt-5 text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">Lines</p>
      <div className="mt-2 space-y-2">
        {items.map((it, idx) => (
          <div key={idx} className="grid gap-2 sm:grid-cols-[1fr_90px_120px_40px]">
            <input className={input} placeholder="Description" value={it.description} disabled={disabled} onChange={(e) => set(idx, "description", e.target.value)} />
            <input className={input} type="number" min="0" placeholder="Qty" value={it.qty} disabled={disabled} onChange={(e) => set(idx, "qty", e.target.value)} />
            <input className={input} type="number" min="0" step="0.01" placeholder="Unit price" value={it.unitPrice} disabled={disabled} onChange={(e) => set(idx, "unitPrice", e.target.value)} />
            <button type="button" disabled={disabled} className="rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 disabled:opacity-40 dark:border-white/15"
              onClick={() => setItems(items.filter((_, i) => i !== idx))} aria-label="Remove line">×</button>
          </div>
        ))}
      </div>
      {!disabled && (
        <button type="button" className={`${btnGhost} mt-3`} onClick={() => setItems([...items, { description: "", qty: 1, unitPrice: 0 }])}>
          Add line
        </button>
      )}

      <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-slate-100 pt-4 dark:border-white/5">
        <div className="w-32">
          <label className={label}>VAT %</label>
          <input className={input} type="number" min="0" max="100" value={vatRate} disabled={disabled} onChange={(e) => setVatRate(e.target.value)} />
        </div>
        <dl className="text-sm tabular-nums">
          <div className="flex justify-between gap-8"><dt className="text-slate-500 dark:text-slate-400">Subtotal</dt><dd className="text-slate-700 dark:text-slate-200">{money(totals.subtotal)}</dd></div>
          <div className="flex justify-between gap-8"><dt className="text-slate-500 dark:text-slate-400">VAT</dt><dd className="text-slate-700 dark:text-slate-200">{money(totals.vat)}</dd></div>
          <div className="mt-1 flex justify-between gap-8 border-t border-slate-100 pt-1 dark:border-white/5">
            <dt className="font-700 text-slate-900 dark:text-white">Total</dt>
            <dd className="font-700 text-slate-900 dark:text-white">{money(totals.total)}</dd>
          </div>
        </dl>
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
          <div><label className={label}>Title</label><input className={input} value={c.title} disabled={!canManage} onChange={(e) => setC((v) => ({ ...v, title: e.target.value }))} /></div>
          <div><label className={label}>Introduction</label><textarea rows={3} className={input} value={c.intro} disabled={!canManage} onChange={(e) => setC((v) => ({ ...v, intro: e.target.value }))} /></div>
          <div><label className={label}>Terms</label><textarea rows={3} className={input} value={c.terms} disabled={!canManage} onChange={(e) => setC((v) => ({ ...v, terms: e.target.value }))} /></div>
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
