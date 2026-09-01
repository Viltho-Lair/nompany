"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import nextDynamic from "next/dynamic";
import { useStudioLocale } from "@/components/studio2/locale";
import { technicalDict, liveColumnLabel, leadDisplay } from "@/shared/studio/technical";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { Icon } from "@/components/studio2/icons";
import { StudioDataGridSkeleton } from "@/components/studio2/StudioDataGrid.skeleton";
import { useFocusedRecord } from "@/components/studio2/useFocusedRecord";
import {
  panel, h2, sub, input, inputRO, label, btn, btnGhost, btnRow,
  URGENCY_BADGE, money, fmtDate, fmtDateTime, useTablePrefs,
  Dialog, Toolbar, FilterButton, FilterPanel, ColumnPicker, Empty,
} from "@/components/studio2/ui";
import { isUnfinished } from "@/modules/technical/quotations";
import { sectionName } from "@/shared/studio/sections";
import QuotationBuilder from "@/components/studio2/QuotationBuilder";
import { Field, BARE_CONTROL } from "@/components/fields/Field";
import Combo from "@/components/studio2/Combo";
import StudioDate from "@/components/fields/StudioDate";
import ClientBlock, { EMPTY_CLIENT_BLOCK, clientBlockPayload } from "@/components/studio2/ClientBlock";
import TechnicalDashboard from "@/components/studio2/TechnicalDashboard";
import { useAnalyticsLevel } from "@/components/studio2/analyticsLevel";
import { StatusPill } from "@/components/studio2/StatusPill";

// Technical: RFQs raised by Sales, and the quotations they become.
// Two different grants are in play — raising an RFQ needs Sales:manage, working
// it needs Technical:manage — so the buttons appear independently. The chrome
// comes from studio2/ui, so this section reads as the same product as Sales.

// RFQ (kind "rfq") and quotation (kind "quotation") colours now live in the
// shared StatusPill map.

// Columns the quotations table can show. Actions is always drawn, so it is not
// on the list.
// THE KEYS ARE THE CONTRACT, THE LABELS ARE COPY — the saved column preference
// stores keys, so which column is which must not depend on the reader.
const quotationColumns = (tr) => [
  { key: "number", label: tr.colNumber },
  { key: "urgency", label: tr.colUrgency },
  { key: "title", label: tr.colTitle },
  { key: "clientName", label: tr.colClient },
  { key: "description", label: tr.colDescription },
  { key: "handledBy", label: tr.colHandledBy },
  { key: "lead", label: tr.colFrom },
  { key: "latestComment", label: tr.colLatestComment },
  { key: "total", label: tr.colTotal },
  { key: "createdAt", label: tr.colCreatedAt },
  { key: "status", label: tr.colStatus },
];
const QUOTATION_COLUMN_KEYS = [
  "number", "urgency", "title", "clientName", "description",
  "handledBy", "lead", "latestComment", "total", "createdAt", "status",
];
const DEFAULT_QUOTATION_COLUMNS = ["number", "title", "clientName", "handledBy", "total", "status"];

// The quotations list is a Data Grid now — the same component Sales' tickets
// list uses, so sorting, paging and the empty state are one implementation
// rather than two. Loaded in its own async chunk (never folded into Technical's
// initial bundle) — see StudioDataGrid's header. The skeleton reserves the box
// for the default six columns plus the always-drawn actions while it arrives.
const StudioDataGrid = nextDynamic(() => import("@/components/studio2/StudioDataGrid"), {
  ssr: false,
  loading: () => <StudioDataGridSkeleton columns={7} pageSize={10} />,
});
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
//   technical-settings   -> quotation numbering + Live view columns
// technical-live renders full-screen outside the studio frame.
export default function StudioTechnical({ slug, view = "engineering-docs", sectionNames = {} }) {
  const tr = technicalDict(useStudioLocale());
  const [data, setData] = useState(null);
  const level = useAnalyticsLevel();
  const focusQuote = useFocusedRecord("quotation");
  const [error, setError] = useState("");
  // A non-error notice — an action that succeeded but left something for the
  // studio to finish (an approval task with no approver to route to).
  const [notice, setNotice] = useState("");
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
    if (!res.ok) { setError(tr.accessTechnicalStudio); return; }
    setData(await res.json());
  }, [slug]);
  useEffect(() => { load(); }, [load]);

  // A deep link — /<slug>/technical-quotations?quotation=<id> — OPENS that
  // quotation rather than ringing its row. The list is a paginated Data Grid
  // now and cannot scroll to a row that may sit on another page, so the link
  // does the thing the ring was standing in for.
  const focusedQuoteId = focusQuote.focusedId;
  useEffect(() => {
    if (!focusedQuoteId || !data) return;
    const hit = (data.quotations || []).find((q) => q.id === focusedQuoteId);
    if (hit) setEditingQuote(hit);
  }, [focusedQuoteId, data]);

  // Sales raised an RFQ — pick it up live.
  useLiveUpdates(slug, "engineering-docs", load);
  // TWO REASONS THIS SECTION IS WATCHED, not one: a ticket moving in Sales is
  // what puts a new RFQ within reach, so the "Raise RFQ" list needs it — and a
  // revised quotation is now a CRM & Sales event too (restructure.ts's
  // SECTION_KEY_MAP moved technical-quotations to crm-sales-quotations), where
  // it used to publish on "engineering-docs" alongside the RFQ above.
  useLiveUpdates(slug, "crm-sales", load);

  // keepOpen is for the BUILDER. Every other caller is a dialog that should
  // close once its one job is done; the builder saves repeatedly and must stay
  // where it is, so it opts out of the closing rather than the closing being
  // spread across every caller.
  async function send(kind, method, payload, keepOpen = false) {
    setError("");
    setNotice("");
    const url = kind ? `/api/studios/${slug}/technical/${kind}` : `/api/studios/${slug}/technical`;
    const res = await fetch(url, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(
        out.error === "sales-required" || out.error === "forbidden" ? tr.raisingRfqNeedsManage
        : out.error === "read-only" ? tr.viewOnlyAccessTechnical2
        : out.error === "already" ? tr.alreadyDone
        // Refused at this door for the same reason the Sales button is not drawn:
        // an approval belongs to one quotation, and a revision would take it down
        // with the document it supersedes.
        : out.error === "approved" ? tr.ticketQuotationApprovedNothing
        : out.error === "ticket" ? tr.pickTicket
        : out.error === "locked" ? tr.quotationLockedCanChanged
        : out.error === "not-approved" ? tr.onlyApprovedQuotationCan
        : out.error === "number" ? tr.giveNumber
        : out.error === "description" ? tr.describeWhatBeingQuoted
        : out.error === "handledBy" ? tr.sayWhoHandling
        // New quotation contract: the server validates every field again, in
        // this order, so a client-side gate that lets one slip through still
        // reads back a sentence.
        : out.error === "sequence" ? tr.pickNumberingSequence
        : out.error === "client" ? tr.nameClient
        : out.error === "title" ? tr.giveTitle
        : out.error === "industry" ? tr.typeIndustryRequired
        : out.error === "deadline" ? tr.giveDeadline
        // Quotation numbering settings.
        : out.error === "prefix" ? tr.giveEverySequencePrefix
        : out.error === "prefix-duplicate" ? tr.twoSequencesSharePrefix
        // Internal approval routing.
        : out.error === "no-tasks" ? tr.studioNoTasksBoard
        : out.error === "has-ticket" ? tr.quotationLinkedSalesTicket
        : out.error === "not-completed" ? tr.completeQuotationBeforeSending
        : out.error === "notfound" ? tr.quotationNoLongerExists
        : tr.didnSave
      );
      return false;
    }
    if (!keepOpen) { setRaising(false); setConverting(null); setEditingQuote(null); setCreatingQuote(false); }
    await load();
    // The parsed body is returned (a truthy object), not a bare true, so a
    // caller can read what the action reported — e.g. an approval's `unrouted`
    // — while every `if (ok)` / `!ok` check still reads it as success.
    return out;
  }

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">{tr.loadingTechnical}</p>;

  const { canManage: canManageParent, canManageRfq, canManageQuotations, canRequestRfq, rfqs, quotations, openTickets, people, vocabulary, nav, sequences = [], defaultSequenceId } = data;
  // MANAGE IS ASKED OF THE SCREEN BEING SHOWN. `view` is the section key, and
  // the map is keyed the same way, so a sub-section grant answers for its own
  // screen and the parent's answer no longer stands in for all of them.
  const canManage = data.manage?.[view] ?? canManageParent;

  const aliasOf = Object.fromEntries(people.map((p) => [p.id, p.alias]));
  // Handlers are collaborator ids, but a quotation created before that — or by
  // typing a name — holds the name itself. Show whichever resolves.
  const handlerName = (v) => (v ? aliasOf[v] || v : "—");

  const banner = error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>;
  // Amber, not rose: the action worked, but there is a follow-up to do.
  const noticeBanner = notice && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">{notice}</p>;

  if (view === "engineering-docs-settings") {
    return (
      <div className="space-y-6">
        {banner}
        <TechnicalSettings
          options={vocabulary.liveColumnOptions || []}
          selected={data.liveColumns || []}
          sequences={sequences}
          defaultSequenceId={defaultSequenceId}
          canManage={data.canManageSettings}
          onSave={(patch) => send("", "PUT", patch)}
        />
      </div>
    );
  }

  if (view === "engineering-docs-rfq") {
    return (
      <div className="space-y-6">
        {banner}
        {raising && (
          <Dialog title={tr.raiseRfq} description={tr.pickTicketNeedsPricing} onClose={closeRaise}>
            <RaiseRfq tickets={openTickets} onCancel={closeRaise} onSave={(p) => send("rfqs", "POST", p)} />
          </Dialog>
        )}
        {converting && (
          <Dialog title={`Quote ${converting.reference}`} description={`${converting.title} · ${converting.clientName || "—"}`} onClose={closeConvert}>
            <ConvertRfq rfq={converting} nextNumber={sequences.find((s) => s.id === defaultSequenceId)?.nextNumber} people={people}
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

  if (view === "crm-sales-quotations") {
    return (
      <div className="space-y-6">
        {banner}
        {noticeBanner}
        {creatingQuote && (
          <Dialog title={tr.newQuotation} description={tr.createdWithoutRfqMarked} onClose={closeCreate} width="max-w-[560px]">
            <NewQuotation people={people} sequences={sequences} defaultSequenceId={defaultSequenceId}
              clients={vocabulary.clients || []} industries={vocabulary.industries || []}
              studioDefaults={data.studioDefaults || {}}
              onCancel={closeCreate} onSave={(p) => send("quotations", "POST", p)} />
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
        <Quotations quotations={quotations} canManage={canManageQuotations} slug={slug} nav={nav}
          sectionNames={sectionNames}
          handlerName={handlerName} people={people}
          statuses={vocabulary.quotationStatuses || []} urgencies={vocabulary.urgencies || []}
          onAdd={() => setCreatingQuote(true)}
          onOpen={(q) => setEditingQuote(q)}
          canUnlock={data.canUnlockQuotations}
          // An internal quotation has no Sales ticket to carry it into approval,
          // so Technical sends it for approval itself. `send` builds the URL as
          // /api/studios/<slug>/technical/quotations/approval — the endpoint the
          // backend exposes — and reloads, so the row's approved flag reflects
          // the result. `unrouted` means the task was created but Tasks settings
          // name no approver to receive it, so the studio is told to appoint one.
          onRequestApproval={async (q) => {
            const out = await send("quotations/approval", "POST", { quotationId: q.id });
            if (out && out.unrouted) setNotice(tr.sentApprovalButNo);
          }}
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
        ? <Empty title={tr.dashboardIsnYoursSee} body={tr.studioKeepsModuleDashboards} />
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
  const tr = technicalDict(useStudioLocale());
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
    // FULL SCREEN HEIGHT, and the two panes scroll inside it. This is a
    // workbench — the queue on one side, the RFQ being handled on the other —
    // and it used to be a 560px box in a scrolling page, so working on an RFQ
    // meant scrolling the page to read the bottom of the box and losing the
    // queue off the top. Now the box ends where the window ends and each pane
    // scrolls on its own, so the queue never leaves.
    //
    // ONLY FROM lg UP, where the two panes are side by side. Below it they
    // stack, and pinning a stack of two to the window height would squeeze
    // both into strips — a narrow screen scrolls the page instead, which is
    // what every other screen does there.
    //
    // The 7.5rem is what sits above and below: the studio's 88px header, which
    // this screen starts under, plus the 2rem of bottom padding the shell's
    // <main> carries. Measured, not guessed. The floor keeps it usable on a
    // short window rather than crushing the panes to nothing.
    <div className="flex flex-col gap-4 lg:h-[calc(100dvh-7.5rem)] lg:min-h-[26rem]">
      {/* THE SEARCH SITS ABOVE THE BOX, not in it. It acts on the queue inside,
          but it is the screen's own toolbar — the same place every other
          Technical screen keeps one — and inside the panel it read as another
          field belonging to whichever RFQ was open. */}
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <input
          className={`${input} max-w-sm`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={tr.searchRfqs}
        />
        <p className="text-sm text-slate-500 dark:text-slate-400">{shown.length} of {rfqs.length}</p>
        {canRequestRfq && <button className={`${btn} ms-auto`} onClick={onRaise}>{tr.raiseRfq}</button>}
      </div>

      <section className={`${panel} grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[320px_minmax(0,1fr)]`}>
        {/* ---- the queue ---- */}
        <div className="max-h-[26rem] overflow-y-auto rounded-geex border border-slate-200/70 lg:max-h-none lg:min-h-0 dark:border-white/10">
          {shown.length === 0 ? (
            <p className="p-4 text-sm text-slate-400">
              {query ? `Nothing matches “${query}”.` : tr.noRfqsComeOver}
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
        <div className="rounded-geex border border-slate-200/70 p-5 lg:min-h-0 lg:overflow-y-auto dark:border-white/10">
          {!selected ? (
            <p className="text-sm text-slate-400">{tr.chooseRfqSeeHere}</p>
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
                    {saved && !dirty ? tr.saved : tr.save}
                  </button>
                )}
                <div className="min-w-0">
                  <h3 className="truncate font-display text-lg font-800 text-slate-900 dark:text-white">{tr.rfqInformation}</h3>
                  <p className="truncate font-mono text-xs text-slate-400">{selected.reference}</p>
                </div>
              </div>

              {/* What Sales sent. Read-only here: urgency belongs to a Sales
                  Leader, and the client, industry and deadline are what was sold. */}
              <dl className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                <RfqInfo label={tr.client} value={selected.clientName} />
                <RfqInfo label={tr.title} value={selected.title} />
                <RfqInfo label={tr.ticket} value={selected.ticketRef} mono />
                <RfqInfo label={tr.industry} value={selected.industry} />
                <RfqInfo label={tr.deadline} value={selected.deadline ? fmtDate(selected.deadline) : ""} />
                <RfqInfo label={tr.received} value={fmtDate(selected.createdAt)} />
                <RfqInfo label={tr.requested} value={aliasOf[selected.requestedByCollaboratorId]} />
              </dl>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {/* Converted is never chosen by hand — it is what Convert does.
                    Who handles it is asked once, at conversion, rather than
                    being a second place to answer the same question. */}
                <Field label={tr.status} as="select" required value={draft.status}
                  disabled={!canManage || converted}
                  onChange={(v) => set({ status: v })}
                  options={statuses.filter((s) => s !== "Converted" || converted)} />
              </div>

              <Field className="mt-4" label={tr.description} as="textarea" value={draft.description}
                disabled={!canManage || converted}
                onChange={(v) => set({ description: v })} />

              {canManage && !converted && (
                <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 dark:border-white/5">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {tr.convertRfqIntoQuotation}
                  </p>
                  {/* Saves first: converting must never be the thing that loses
                      what was just typed into the box above it. */}
                  <button className={`${btn} ms-auto`} disabled={busy}
                    onClick={async () => { if (dirty && !(await save())) return; onConvert(selected); }}>
                    {tr.convert}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
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

// The tag beside a quotation's title saying WHICH SECTION it came from. A
// Sales-origin quotation wears the same mark the Sales section wears in the
// sidebar (icon name "crm-sales", from SECTION_ICONS), so the two screens read as
// one product; one raised straight from this screen wears a quiet neutral tag.
//
// IT NAMES THE SECTION, not the code's word for it. This used to read "Sales"
// and "Internal" out of the dictionary, which is a lie in any studio that
// renamed either department — the sidebar would say "Business Development" and
// the tag beside the quotation it raised would still say "Sales". The name
// comes from the same place the sidebar's does (sectionName, so a default
// section still reads Arabic in an Arabic studio and a tenant's own wording is
// left alone), and falls back to the dictionary word for somebody who cannot
// open that section and therefore was not handed its name.
// icons.js's own registry key for this badge is the bare word "sales"
// (`sales: "sales.png"`), unrelated to and unrenamed by the P0 restructure —
// an icon name is not a section key. tests/restructure.mjs's
// KNOWN_COLLISIONS allowlist knows about this one.

function OriginTag({ fromSales, sectionNames = {} }) {
  const tr = technicalDict(useStudioLocale());
  const locale = useStudioLocale();
  const key = fromSales ? "crm-sales" : "engineering-docs";
  const stored = sectionNames[key];
  const label = stored ? sectionName(key, stored, locale) : (fromSales ? tr.originSales : tr.originInternal);
  if (fromSales) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-500/10 px-2 py-0.5 text-[10px] font-700 leading-4 text-brand-700 dark:text-brand-300">
        <Icon name="sales" className="h-3 w-3" />
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-600 leading-4 text-slate-500 dark:bg-white/5 dark:text-slate-400">
      {label}
    </span>
  );
}

function Quotations({ quotations, canManage, canUnlock, slug, nav, sectionNames = {}, handlerName, people, statuses, urgencies, onAdd, onOpen, onLock, onUnlock, onRequestApproval }) {
  const tr = technicalDict(useStudioLocale());
  // THE KEYS ARE THE CONTRACT, THE LABELS ARE COPY — see quotationColumns.
  const QUOTATION_COLUMNS = useMemo(() => quotationColumns(tr), [tr]);
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showColumns, setShowColumns] = useState(false);
  const { columns, has: col, toggleCol, resetCols, filters, setFilter, clearFilters, activeFilters } =
    useTablePrefs("engineering-docs", slug, {
      columnKeys: QUOTATION_COLUMN_KEYS,
      defaultColumns: DEFAULT_QUOTATION_COLUMNS,
      emptyFilters: EMPTY_FILTERS,
    });

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

  // Augment each row with what the grid SORTS on. A cell may render a badge or a
  // truncated line, but the column beneath it has to order by something real —
  // so the handler's name, the lead label, the latest comment's text and the
  // unfinished flag are computed once here rather than per cell.
  const gridRows = useMemo(() => filtered.map((q) => {
    const comment = latestComment(q);
    return {
      ...q,
      handlerLabel: handlerName(q.handledBy),
      leadText: leadDisplay(tr, q.leadLabel),
      commentText: comment?.text || "",
      _comment: comment,
      // New or Draft: work still owed. The stripe marks quotations nobody has
      // finished, which is what the sidebar counts too.
      _unfinished: isUnfinished(q),
    };
  }), [filtered, handlerName, tr]);

  // One column def per QUOTATION_COLUMN_KEYS key, so the saved preference keeps
  // choosing columns by key exactly as it did for the hand-rolled table.
  const colDefs = useMemo(() => ({
    number: { field: "number", headerName: tr.colNumber, minWidth: 130, flex: 0.8,
      renderCell: ({ row }) => (
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="num text-xs text-slate-500 dark:text-slate-400">{row.number}</span>
          {Number(row.revision) > 1 && <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-700 text-amber-700 dark:text-amber-300">Rev {row.revision}</span>}
          {row.locked && <span className="inline-flex text-slate-400" title={tr.lockedViewOnly}><Icon name="lock" className="h-3.5 w-3.5" /></span>}
        </span>
      ) },
    urgency: { field: "urgency", headerName: tr.colUrgency, minWidth: 110, flex: 0.7,
      renderCell: ({ row }) => (row.urgency
        ? <span className={`rounded-full px-2.5 py-1 text-xs font-600 ${URGENCY_BADGE[row.urgency] || URGENCY_BADGE.Normal}`}>{row.urgency}</span>
        : <span className="text-slate-400">—</span>) },
    // Title only. The RFQ and Ticket chips are gone: the whole row already opens
    // the builder, so two smaller targets inside it sent people somewhere else
    // by accident. The links are still on the quotation itself — hidden here,
    // not severed.
    title: { field: "title", headerName: tr.colTitle, minWidth: 190, flex: 1.3,
      renderCell: ({ row }) => (
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate font-600 text-slate-900 dark:text-white">{row.title || "—"}</span>
          <OriginTag fromSales={row.fromSales} sectionNames={sectionNames} />
        </span>
      ) },
    clientName: { field: "clientName", headerName: tr.colClient, minWidth: 140, flex: 1,
      renderCell: ({ row }) => <span className="truncate text-slate-600 dark:text-slate-300">{row.clientName || "—"}</span> },
    description: { field: "description", headerName: tr.colDescription, minWidth: 160, flex: 1.2,
      renderCell: ({ row }) => <span className="truncate text-slate-600 dark:text-slate-300" title={row.description}>{row.description || "—"}</span> },
    handledBy: { field: "handlerLabel", headerName: tr.colHandledBy, minWidth: 130, flex: 0.9,
      renderCell: ({ row }) => <span className="truncate text-slate-600 dark:text-slate-300">{row.handlerLabel}</span> },
    lead: { field: "leadText", headerName: tr.colFrom, minWidth: 120, flex: 0.8,
      renderCell: ({ row }) => <span className="truncate text-slate-600 dark:text-slate-300">{row.leadText}</span> },
    latestComment: { field: "commentText", headerName: tr.colLatestComment, minWidth: 170, flex: 1.2,
      renderCell: ({ row }) => (row._comment
        ? <span className="truncate text-slate-600 dark:text-slate-300"
            title={`${handlerName(row._comment.byCollaboratorId)} · ${fmtDateTime(row._comment.createdAt)}\n${row._comment.text}`}>{row._comment.text}</span>
        : <span className="text-slate-400">—</span>) },
    total: { field: "total", headerName: tr.colTotal, type: "number", minWidth: 120, flex: 0.8,
      align: "left", headerAlign: "left",
      renderCell: ({ row }) => <span className="num text-slate-600 dark:text-slate-300">{money(row.total)}</span> },
    createdAt: { field: "createdAt", headerName: tr.colCreatedAt, minWidth: 120, flex: 0.8,
      renderCell: ({ row }) => <span className="text-slate-500 dark:text-slate-400">{fmtDate(row.createdAt)}</span> },
    // READ, never set. A quotation's status is what has happened to it — New
    // until somebody opens the builder, Draft while it is being built, Completed
    // when they submit. Offering it as a dropdown here invited people to
    // contradict the record.
    status: { field: "status", headerName: tr.colStatus, minWidth: 120, flex: 0.7,
      renderCell: ({ row }) => <StatusPill kind="quotation" status={row.status} /> },
  }), [tr, handlerName, sectionNames]);

  const gridColumns = useMemo(() => [
    ...QUOTATION_COLUMNS.filter((c) => col(c.key)).map((c) => colDefs[c.key]),
    {
      // Always drawn. Open/View is what carries KEYBOARD reach to the builder
      // now that the row is a grid row rather than a button, and the three
      // manage actions sit beside it. stopPropagation on every one of them, so a
      // button does not also fire the row click that opens the builder.
      field: "_actions", headerName: "", minWidth: 200, flex: 0.9, sortable: false,
      align: "right", headerAlign: "right",
      renderCell: ({ row }) => (
        <span className="inline-flex items-center gap-2">
          {/* Only an internal, completed, not-yet-approved quotation can be sent
              for approval from here — a Sales-origin one is approved from its
              ticket, and the server refuses this door for it ("has-ticket"). */}
          {canManage && !row.fromSales && row.status === "Completed" && !row.approved && (
            <button type="button" className={btnRow} title={tr.sendQuotationInternalApproval}
              onClick={(e) => { e.stopPropagation(); onRequestApproval(row); }}>{tr.requestApproval}</button>
          )}
          {canManage && row.status === "Approved" && !row.locked && (
            <button type="button" className={btnRow} title={tr.lockBecomesViewOnly}
              onClick={(e) => { e.stopPropagation(); onLock(row); }}>{tr.lock}</button>
          )}
          {/* Offered only to somebody who holds unlock. Locking the wrong
              document used to have no remedy but a new quotation with a new
              number, which is a worse lie than the mistake. */}
          {canUnlock && row.locked && (
            <button type="button" className={btnRow} title={tr.reopenLockedQuotation}
              onClick={(e) => { e.stopPropagation(); onUnlock(row); }}>{tr.unlock}</button>
          )}
          <button type="button" className="text-xs font-600 text-brand-700 hover:underline dark:text-brand-300"
            onClick={(e) => { e.stopPropagation(); onOpen(row); }}>
            {row.locked || !canManage ? tr.view : tr.open}
          </button>
        </span>
      ),
    },
  ], [QUOTATION_COLUMNS, colDefs, columns, canManage, canUnlock, tr]); // eslint-disable-line react-hooks/exhaustive-deps

  if (quotations.length === 0) {
    return (
      <>
        <Toolbar canManage={canManage} label={tr.newQuotation} onAdd={onAdd} />
        <Empty title={tr.noQuotationsYet} body={tr.convertRfqProducePriced} />
      </>
    );
  }

  return (
    <>
      <Toolbar canManage={canManage} label={tr.newQuotation} onAdd={onAdd}>
        <input type="search" className={`${input} sm:max-w-xs`} aria-label={tr.searchNumberTitleClient}
          value={query} onChange={(e) => setQuery(e.target.value)} />
        <FilterButton active={activeFilters} open={showFilters} onClick={() => setShowFilters((v) => !v)} />
        <button type="button" className={btnGhost} onClick={() => setShowColumns(true)}>{tr.columns}</button>
      </Toolbar>

      {showFilters && (
        <FilterPanel onClear={clearFilters}>
          <Field label={tr.handled} as="select" value={filters.handledBy}
            onChange={(v) => setFilter({ handledBy: v })}
            options={people.map((p) => ({ value: p.id, label: p.alias }))} />
          <Field label={tr.client} value={filters.client} onChange={(v) => setFilter({ client: v })} />
          <Field label={tr.status} as="select" value={filters.status}
            onChange={(v) => setFilter({ status: v })} options={statuses} />
          <Field label={tr.urgency} as="select" value={filters.urgency}
            onChange={(v) => setFilter({ urgency: v })} options={urgencies} />
          <Field label={tr.created} filled={!!filters.createdFrom}>
            <StudioDate value={filters.createdFrom} onChange={(iso) => setFilter({ createdFrom: iso })} />
          </Field>
          <Field label={tr.created2} filled={!!filters.createdTo}>
            <StudioDate value={filters.createdTo} onChange={(iso) => setFilter({ createdTo: iso })} />
          </Field>
        </FilterPanel>
      )}

      {showColumns && (
        <ColumnPicker title={tr.quotationColumns} columns={QUOTATION_COLUMNS} selected={columns}
          onToggle={toggleCol} onReset={resetCols} onClose={() => setShowColumns(false)} />
      )}

      <p className="text-sm text-slate-500 dark:text-slate-400">{tr.quotationCount(filtered.length, quotations.length)}</p>

      <section className={panel}>
        {/* A Data Grid now — the same one Sales' tickets list uses, so the two
            department tables are one component rather than two lookalikes:
            sortable headers, client-side paging, and the toggleable column SET
            still the user's (built from QUOTATION_COLUMNS and the saved
            preference via `col`, exactly as the hand-rolled table did). Every
            cell reproduces the table it replaced: the mono number with its Rev
            badge and lock icon, the urgency badge, the title with its origin
            tag, client, the truncated description, the handler, the lead, the
            latest comment, the total tabular via `.num`, the created date
            through fmtDate, and the shared StatusPill. The row still opens the
            builder (onRowClick), and the always-drawn actions column carries
            Open/View for the keyboard now that the row is no longer a button,
            alongside Request approval / Lock / Unlock. A quotation nobody has
            finished keeps its amber start-edge stripe — an inset box-shadow (no
            layout cost) reading --sg-flag so it flips in dark mode. The one
            thing not carried over is the deep-link scroll-and-ring, which
            client paging cannot target across pages — the same trade Sales made. */}
        <StudioDataGrid
          rows={gridRows}
          columns={gridColumns}
          getRowId={(r) => r.id}
          ariaLabel={tr.quotationsAria}
          emptyLabel={tr.noQuotationsMatchThose}
          emptyIcon="report"
          className="[--sg-flag:251_191_36] dark:[--sg-flag:245_158_11]"
          onRowClick={(params) => onOpen(params.row)}
          getRowClassName={({ row }) => (row._unfinished ? "sg-flag" : "")}
          sx={{
            "& .MuiDataGrid-row": { cursor: "pointer" },
            "& .MuiDataGrid-row.sg-flag": { boxShadow: "inset 4px 0 0 rgb(var(--sg-flag))" },
          }}
        />
      </section>
    </>
  );
}

// ---- forms -----------------------------------------------------------------
function RaiseRfq({ tickets, onSave, onCancel }) {
  const tr = technicalDict(useStudioLocale());
  const [ticketId, setTicketId] = useState(tickets[0]?.id || "");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  if (tickets.length === 0) {
    return (
      <>
        <p className="text-sm text-slate-500 dark:text-slate-400">{tr.everyOpenTicketAlready}</p>
        <div className="mt-5"><button className={btnGhost} onClick={onCancel}>{tr.close}</button></div>
      </>
    );
  }
  return (
    <>
      <div className="grid gap-4">
        <Field label={tr.ticket} as="select" required value={ticketId} onChange={(v) => setTicketId(v)}
          options={tickets.map((t) => ({ value: t.id, label: `${t.ref} — ${t.title}` }))} />
        <Field label={tr.whatNeeded} as="textarea" value={description} onChange={(v) => setDescription(v)} />
      </div>
      <div className="mt-5 flex gap-3">
        <button className={btn} disabled={busy || !ticketId} onClick={async () => { setBusy(true); await onSave({ ticketId, description }); setBusy(false); }}>
          {busy ? tr.raising : tr.raiseRfq2}
        </button>
        <button className={btnGhost} onClick={onCancel}>{tr.cancel}</button>
      </div>
    </>
  );
}

function ConvertRfq({ rfq, nextNumber, people, onSave, onCancel }) {
  const tr = technicalDict(useStudioLocale());
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
          <label className={label}>{tr.quotationNumber}</label>
          {/* Issued by the studio's numbering, not typed: a number somebody
              chose by hand is a number somebody can choose twice. */}
          <input className={inputRO} value={nextNumber || tr.assignedOnSave} readOnly />
        </div>
        <div><label className={label}>{tr.client}</label><input className={inputRO} value={rfq.clientName || "—"} readOnly /></div>
        <div><label className={label}>{tr.title}</label><input className={inputRO} value={rfq.title || "—"} readOnly /></div>
        <div>
          <label className={label}>{tr.urgency} <span className="font-500 normal-case text-slate-400">(set by Sales)</span></label>
          <div className={`${inputRO} flex items-center`}>
            <span className={`rounded-full px-2.5 py-1 text-xs font-600 ${URGENCY_BADGE[rfq.urgency] || URGENCY_BADGE.Normal}`}>{rfq.urgency || "Normal"}</span>
          </div>
        </div>
        <div><label className={label}>{tr.industry} <span className="font-500 normal-case text-slate-400">(set by Sales)</span></label><input className={inputRO} value={rfq.industry || "—"} readOnly /></div>
      </div>

      {/* One question, because converting only decides WHO takes it. The
          description comes across from the RFQ; retyping it here would give the
          same sentence two homes. */}
      <Field className="mt-4 sm:max-w-xs" label={tr.handled} as="select" value={handledBy}
        onChange={(v) => setHandledBy(v)}
        options={people.map((p) => ({ value: p.id, label: p.alias }))} />

      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        {tr.numberedAutomaticallyLeadSet} <span className="font-600">{rfq.ticketRef || rfq.reference}</span>.
      </p>
      <div className="mt-5 flex gap-3">
        <button className={btn} disabled={busy || !handledBy} onClick={async () => { setBusy(true); await onSave({ handledByCollaboratorId: handledBy }); setBusy(false); }}>
          {busy ? tr.converting : tr.convert}
        </button>
        <button className={btnGhost} onClick={onCancel}>{tr.cancel}</button>
      </div>
    </>
  );
}

// A quotation raised straight from the Quotations screen, with no RFQ behind
// it — so it is Internal. It now captures what an RFQ-born one already carries:
// client, industry and deadline, on top of a title and description, so an
// internal quotation is not a poorer record than a converted one.
//
// The NUMBER is not typed. It is issued by the chosen sequence server-side (a
// number a person picks by hand is a number they can pick twice, invariant 10),
// so the form only shows the sequence's advisory `nextNumber` as helper text.
//
// Client and Industry reuse the Sales ticket's exact pattern — a `Combo` (MUI
// Autocomplete, freeSolo) wrapped in a Field, whose options come from the API
// payload (never hardcoded vocabulary) and which lets a name that is not on the
// list through. On save, a typed client name that matches an existing client is
// sent as `clientId`; anything else is sent as a new `clientName`.
function NewQuotation({ people, sequences = [], defaultSequenceId, clients = [], industries = [], studioDefaults = {}, onSave, onCancel }) {
  const tr = technicalDict(useStudioLocale());
  const [f, setF] = useState({
    sequenceId: sequences.some((s) => s.id === defaultSequenceId) ? defaultSequenceId : (sequences[0]?.id || ""),
    clientName: "", title: "", industry: "", deadline: "", description: "", handledBy: "",
    // WHO WE SPEAK TO AND WHERE THE WORK IS. createQuotation has always taken
    // these and folded them onto the Client record through resolveClientFor,
    // exactly as createTicket does; this form simply never asked, so an
    // internal quotation created a client with no contact and no site. A new
    // site starts at the studio's own country and city, the same default a
    // ticket starts from.
    ...EMPTY_CLIENT_BLOCK,
    locationCountry: studioDefaults.country || "",
    locationCity: studioDefaults.city || "",
  });
  const [busy, setBusy] = useState(false);
  const set = (patch) => setF((s) => ({ ...s, ...patch }));

  const seq = sequences.find((s) => s.id === f.sequenceId) || null;
  // The client the typed name resolves to, if any — same case-insensitive,
  // whitespace-collapsed match the Sales ticket uses so "Acme  Co" and "acme co"
  // are one client, not two.
  const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
  const matched = clients.find((c) => norm(c.name) === norm(f.clientName)) || null;

  const ready = f.sequenceId && f.clientName.trim() && f.title.trim()
    && f.industry.trim() && f.deadline && f.description.trim();

  async function save() {
    setBusy(true);
    await onSave({
      sequenceId: f.sequenceId,
      // Existing client → its id; a name off the list → a new client by name.
      ...(matched ? { clientId: matched.id } : { clientName: f.clientName.trim() }),
      title: f.title.trim(),
      industry: f.industry.trim(),
      deadline: f.deadline,
      description: f.description.trim(),
      ...clientBlockPayload(f),
      ...(f.handledBy ? { handledBy: f.handledBy } : {}),
    });
    setBusy(false);
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {/* The number rides on the sequence; the helper shows the one the next
            quotation on it will carry, noted as assigned on save. */}
        <Field label={tr.sequence} as="select" required value={f.sequenceId}
          onChange={(v) => set({ sequenceId: v })}
          hint={seq ? `Number ${seq.nextNumber} — assigned on save` : tr.numberedAutomaticallySave}
          options={sequences.map((s) => ({ value: s.id, label: s.prefix ? `${s.label} (${s.prefix})` : s.label }))} />

        <Field label={tr.client} required filled={!!f.clientName}
          hint={matched ? tr.existingClient : (f.clientName.trim() ? tr.nameIsnListCreates : undefined)}>
          <Combo value={f.clientName} onChange={(v) => set({ clientName: v })}
            options={clients.map((c) => c.name)} inputClassName={BARE_CONTROL} />
        </Field>

        <Field className="sm:col-span-2" label={tr.title} required value={f.title}
          onChange={(v) => set({ title: v })} />

        <Field label={tr.typeIndustry} required filled={!!f.industry}>
          <Combo value={f.industry} onChange={(v) => set({ industry: v })}
            options={industries} inputClassName={BARE_CONTROL} />
        </Field>

        <Field label={tr.deadline} required filled={!!f.deadline}>
          <StudioDate value={f.deadline} onChange={(iso) => set({ deadline: iso })} />
        </Field>

        <Field className="sm:col-span-2" label={tr.description} required as="textarea" value={f.description}
          onChange={(v) => set({ description: v })} />

        {/* Handled by is now OPTIONAL — an internal quotation can be created
            before anyone is assigned it. */}
        <Field label={tr.handled} as="select" value={f.handledBy}
          onChange={(v) => set({ handledBy: v })}
          options={people.map((p) => ({ value: p.id, label: p.alias }))} />

        {/* Stamped by the server, shown read-only so the record's authorship is
            visible while it is being written. "You" and now stand in because the
            payload does not name the current collaborator. Routed through Field's
            read-only mode so they line up flush with Handled by beside them —
            same box, same height — instead of a stacked-label grey box that did
            not. */}
        <div className="grid grid-cols-2 gap-4">
          <Field label={tr.created3} readOnly value="You" />
          <Field label={tr.created4} readOnly value={fmtDate(new Date().toISOString())} />
        </div>
      </div>

      {/* The same block the Sales ticket raises a client with — one component,
          so a quotation captures the contact and the site exactly as a ticket
          does rather than a poorer version of it. Positions are offered from
          the contacts this client already has: Technical has no contact-position
          vocabulary of its own, and inventing a second one to hold the same
          words is how two lists drift. */}
      <ClientBlock value={f} onChange={(patch) => set(patch)} client={matched}
        positions={[...new Set((matched?.contacts || []).map((c) => c.position).filter(Boolean))]} />

      <div className="mt-5 flex gap-3">
        <button className={btn} disabled={busy || !ready} onClick={save}>
          {busy ? tr.saving : tr.createQuotation}
        </button>
        <button className={btnGhost} onClick={onCancel}>{tr.cancel}</button>
      </div>
    </>
  );
}


// ---- settings --------------------------------------------------------------
// Quotation numbering: the studio's list of sequences, each with a label, a
// prefix and a starting number, and which one Sales tickets default to.
//
// The number a quotation carries is issued from a sequence's counter, and a
// counter only moves forward (invariant 10) — so `start` is a floor, and an
// existing sequence's editable start is seeded from its advisory `nextNumber`
// rather than from 1, which would ask the server to reissue numbers a client
// already holds. The validation here mirrors the server's contract exactly
// (a prefix on every row, no two prefixes equal case-insensitively) so the
// error shows against the control before the round trip; the server checks
// again and `send` reads its "prefix"/"prefix-duplicate" back as a fallback.
//
// A new row can be the Sales default in the SAME save: it is minted with a
// stable client-side id (`seq-local-…`, which cannot collide with a server id)
// at add-time, and readSequences keeps whatever id the client sends. So every
// row — new or persisted — carries a real id that `defaultSequenceId` can point
// at, and adding a sequence and marking it default is one Save, not two.
function QuotationNumbering({ sequences, defaultSequenceId, canManage, onSave }) {
  const tr = technicalDict(useStudioLocale());
  // The id IS the row's React key and identity; existing rows already have a
  // server id, new ones are given a local id the moment they are added.
  const seed = () => sequences.map((s) => ({
    id: s.id, label: s.label || "", prefix: s.prefix || "",
    start: String(s.nextNumber ?? 1),
  }));
  const [rows, setRows] = useState(seed);
  const [defId, setDefId] = useState(defaultSequenceId || "");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  // A monotonic counter behind the local ids minted for new rows.
  const localSeq = useRef(0);

  const setRow = (id, patch) => { setSaved(false); setErr(""); setRows((rs) => rs.map((r) => r.id === id ? { ...r, ...patch } : r)); };
  const addRow = () => {
    setSaved(false); setErr("");
    const id = `seq-local-${localSeq.current++}-${Math.random().toString(36).slice(2, 8)}`;
    setRows((rs) => [...rs, { id, label: "", prefix: "", start: "1" }]);
  };
  const removeRow = (id) => {
    setSaved(false); setErr("");
    if (id === defId) setDefId("");
    setRows((rs) => rs.filter((r) => r.id !== id));
  };

  async function save() {
    // Mirror the server contract so the error lands against the control.
    if (rows.length === 0) { setErr(tr.addLeastOneSequence); return; }
    if (rows.some((r) => !r.prefix.trim())) { setErr(tr.giveEverySequencePrefix); return; }
    const lower = rows.map((r) => r.prefix.trim().toLowerCase());
    if (new Set(lower).size !== lower.length) { setErr(tr.twoSequencesSharePrefix); return; }
    setErr("");
    setBusy(true);
    const ok = await onSave({
      // Every row's id is sent, including a freshly-minted local one, so the
      // default below can reference a row created in this very save.
      sequences: rows.map((r) => ({
        id: r.id, label: r.label.trim(), prefix: r.prefix.trim(), start: Number(r.start) || 1,
      })),
      // If the chosen default was removed, fall back to the server's own choice.
      defaultSequenceId: rows.some((r) => r.id === defId) ? defId : "",
    });
    setBusy(false);
    setSaved(!!ok);
  }

  return (
    <section className={panel}>
      <h2 className={h2}>{tr.quotationNumbering}</h2>
      <p className={sub}>{tr.sequencesQuotationNumber}</p>

      <div className="mt-4 space-y-3">
        {rows.length === 0 && <p className="text-sm text-slate-400">{tr.noSequencesYetAdd}</p>}
        {rows.map((r) => (
          <div key={r.id} className="rounded-geex border border-slate-200/70 p-4 dark:border-white/10">
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_120px_auto]">
              <Field label={tr.label} value={r.label} disabled={!canManage}
                onChange={(v) => setRow(r.id, { label: v })} />
              <Field label={tr.prefix} value={r.prefix} disabled={!canManage}
                onChange={(v) => setRow(r.id, { prefix: v })} />
              <Field label={tr.start} type="number" min="1" value={r.start} disabled={!canManage}
                onChange={(v) => setRow(r.id, { start: v })} />
              {canManage && (
                <div className="flex items-center">
                  <button type="button" className={btnGhost} onClick={() => removeRow(r.id)}
                    disabled={rows.length === 1} title={rows.length === 1 ? tr.leastOneSequenceKept : tr.removeSequence}>
                    {tr.remove}
                  </button>
                </div>
              )}
            </div>
            <label className="mt-3 flex items-center gap-2.5 text-sm">
              <input type="radio" name="tech-default-sequence" className="h-4 w-4 accent-brand-600"
                checked={r.id === defId} disabled={!canManage}
                onChange={() => { setSaved(false); setDefId(r.id); }} />
              <span className="text-slate-700 dark:text-slate-200">{tr.defaultSalesTickets}</span>
            </label>
          </div>
        ))}
      </div>

      {err && <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">{err}</p>}

      {canManage ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" className={btnGhost} onClick={addRow}>{tr.addSequence}</button>
          <button type="button" className={btn} disabled={busy} onClick={save}>{busy ? tr.saving2 : tr.saveNumbering}</button>
          {saved && <span className="text-sm text-emerald-700 dark:text-emerald-400">{tr.saved}</span>}
        </div>
      ) : (
        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">{tr.viewOnlyAccessTechnical}</p>
      )}
    </section>
  );
}

// Technical Settings: the quotation numbering sequences and the Live view's columns.
function TechnicalSettings({ options, selected, sequences = [], defaultSequenceId, canManage, onSave }) {
  const tr = technicalDict(useStudioLocale());
  const [cols, setCols] = useState(selected);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const toggle = (k) => { setSaved(false); setCols((v) => v.includes(k) ? v.filter((x) => x !== k) : [...v, k]); };
  const save = async (patch) => { setBusy(true); const ok = await onSave(patch); setBusy(false); setSaved(!!ok); };

  return (
    <div className="space-y-6">
      <QuotationNumbering sequences={sequences} defaultSequenceId={defaultSequenceId} canManage={canManage} onSave={onSave} />

      <section className={panel}>
        <h2 className={h2}>{tr.liveView}</h2>
        <p className={sub}>{tr.chooseQuotationColumnsLive}</p>
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
            <button className={btn} disabled={busy} onClick={() => save({ liveColumns: cols })}>{busy ? tr.saving2 : tr.saveColumns}</button>
            {saved && <span className="text-sm text-emerald-700 dark:text-emerald-400">{tr.saved}</span>}
          </div>
        ) : (
          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">{tr.viewOnlyAccessTechnical}</p>
        )}
      </section>
    </div>
  );
}
