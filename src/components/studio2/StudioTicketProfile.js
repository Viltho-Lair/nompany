"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { RecordSkeleton } from "@/components/studio2/RecordSkeleton";
import { miscDict } from "@/shared/studio/misc";
import Link from "next/link";
import { Icon } from "@/components/studio2/icons";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { panel, h2, sub, btn, btnGhost, money, fmtDate, Dialog } from "@/components/studio2/ui";
import { TicketForm } from "@/components/studio2/StudioSales";
import { Field } from "@/components/fields/Field";
import { Money } from "@/components/Currency";
import { canRequestRfqStatus } from "@/modules/sales/tickets";
import { CHAIN_LOST_REASON } from "@/modules/sales/pipeline";
import { rfqInfo } from "@/modules/sales/salesAnalytics";

// ONE TICKET, on its own page — the layout in the brief: the ticket's own
// information on the left with the client and the timeline down the right, and
// quotations and comments beneath.
//
// It reads ONE endpoint — the same /sales the board does. A ticket is not a new
// kind of record, it is one row of a list that already loads with its client,
// its people, its RFQs and its quotations attached. That matters here beyond
// tidiness: reading Technical directly would have made the Quotations box
// disappear for every Sales user without a Technical grant, which is most of
// them. What became of their own ticket is the ticket's story.

const card = `${panel} min-h-0`;

// The two things Sales does to a ticket from here, and what each one looks like
// while it is not available:
//
//   Request RFQ ⇄ Quotation Sent
//     Pressing it hands the ticket to Technical. It greys out into "Quotation
//     Sent" until the quotation comes back finished — then it lights up again,
//     because a second RFQ is how Sales asks for an edit to the last one. Only
//     the final quotation is ever considered.
//
//     ONCE THE QUOTATION IS APPROVED IT IS GONE, not greyed. Greying says "not
//     yet" and would be a lie: nothing is coming that brings it back. There is
//     nothing left to revise once the client's answer is in, and raising a
//     revision then would supersede the approved document and take its approval
//     with it. What follows an approval is the PO, which is the button below.
//
//   Send for Approval ⇄ Quotation Approved
//     Appears only once there is a finished quotation to send, and vanishes the
//     moment a new RFQ is raised — what is on file is out of date, so there is
//     nothing worth approving. Once every appointed approver has signed off it
//     reads "Quotation Approved".
const btnAction = "inline-flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-2.5 font-display text-sm font-600 transition-colors disabled:cursor-not-allowed";
const btnActionOn = `${btnAction} bg-amber-600 text-white hover:bg-amber-700`;
const btnActionOff = `${btnAction} bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-400`;
const btnApprove = `${btnAction} bg-emerald-600 text-white hover:bg-emerald-700`;
const btnApproved = `${btnAction} bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300`;

export default function StudioTicketProfile({ slug, ticketId }) {
  const tr = miscDict(useStudioLocale());
  const [data, setData] = useState(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [acting, setActing] = useState("");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [poOpen, setPoOpen] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/sales`, { cache: "no-store" });
    if (!res.ok) { setError(tr.accessSalesStudio); return; }
    setData(await res.json());
  }, [slug]);

  useEffect(() => { load(); }, [load]);
  useLiveUpdates(slug, "crm-sales", load);
  useLiveUpdates(slug, "engineering-docs", load);
  // An approver signing off is what turns "Send for Approval" into "Quotation
  // Approved", and that happens on the Tasks board.
  useLiveUpdates(slug, "tasks", load);

  const ticket = data?.tickets?.find((t) => t.id === ticketId) || null;
  const client = data?.clients?.find((c) => c.id === ticket?.clientId) || null;
  const aliasOf = useMemo(
    () => Object.fromEntries((data?.people || []).map((p) => [p.id, p.alias])),
    [data],
  );
  // Already narrowed to this ticket and already newest-first, server-side.
  const mine = ticket?.quotations || [];

  // One request, one refusal message, one reload — both buttons go through it.
  // `kind` is the endpoint under /sales/tickets and doubles as the busy flag.
  async function act(kind) {
    setActing(kind); setError(""); setNote("");
    const res = await fetch(`/api/studios/${slug}/sales/tickets/${kind}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId }),
    });
    const out = await res.json().catch(() => ({}));
    setActing("");
    if (!res.ok) {
      setError(
        out.error === "already" && kind === "rfq" ? tr.ticketAlreadyTechnicalCan
        : out.error === "already" ? tr.quotationAlreadySentApproval
        // A stale tab still showing the button, pressed after somebody else's
        // approval landed. Say what happened rather than "that didn't go through".
        : out.error === "approved" ? tr.ticketQuotationApprovedNothing
        : out.error === "rfq-pending" ? tr.newRfqOutstandingWait
        : out.error === "not-quoted" ? tr.noFinishedQuotationTicket
        : out.error === "no-tasks" ? tr.studioNoTasksSection
        : out.error === "no-technical" ? tr.studioNoTechnicalSection
        : out.error === "read-only" || out.error === "forbidden" ? tr.viewOnlyAccessSales
        : out.error === "ticket" ? tr.ticketNoLongerExists2
        : tr.didnGoThrough,
      );
      return;
    }
    // Nobody has been appointed to an authority this approval routes to, so it
    // can never complete. Worth saying at the moment of sending rather than
    // leaving somebody to wonder why it never moves.
    if (out.unrouted?.length) {
      setNote(`Sent — but nobody is appointed to ${out.unrouted.join(" and ")} in Task settings, so it cannot be approved until somebody is.`);
    }
    await load();
  }

  // ONE REQUEST, and the same refusal handling the other two buttons get. The
  // file is uploaded first and only its URL travels in the body, so a PO with a
  // failed upload is refused before a task is written rather than after.
  async function submitPo({ description, file }) {
    setBusy(true); setError(""); setNote("");
    let attachmentUrl = "";
    let attachmentName = "";
    if (file) {
      const form = new FormData();
      form.append("file", file);
      const up = await fetch("/api/media", { method: "POST", body: form });
      if (!up.ok) {
        setBusy(false);
        setError(up.status === 413 ? tr.fileTooLarge5 : tr.fileDidnUpload);
        return false;
      }
      attachmentUrl = (await up.json()).url;
      attachmentName = file.name;
    }
    const res = await fetch(`/api/studios/${slug}/sales/tickets/po`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId, description, attachmentUrl, attachmentName }),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(
        out.error === "evidence" ? tr.attachPoDescribeFinance
        : out.error === "already" ? tr.poAlreadySubmittedQuotation
        : out.error === "not-approved" ? tr.quotationApprovedBeforePo
        : out.error === "not-quoted" ? tr.noQuotationTicketYet
        : out.error === "no-tasks" ? tr.studioNoTasksSection2
        : out.error === "read-only" || out.error === "forbidden" ? tr.viewOnlyAccessSales
        : tr.didnGoThrough,
      );
      return false;
    }
    if (out.unrouted?.length) {
      setNote(`Sent — but nobody is appointed to ${out.unrouted.join(" and ")} in Task settings, so the PO cannot be approved until somebody is.`);
    }
    setPoOpen(false);
    await load();
    return true;
  }

  async function addComment() {
    if (!comment.trim()) return;
    setBusy(true); setError("");
    const res = await fetch(`/api/studios/${slug}/sales/tickets`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: ticketId, addComment: comment }),
    });
    setBusy(false);
    if (!res.ok) { setError(tr.commentDidnSave); return; }
    setComment("");
    await load();
  }

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <RecordSkeleton loadingLabel={tr.loadingTicket} />;
  if (!ticket) {
    return (
      <div className="space-y-4">
        <Back slug={slug} />
        <p className={`${panel} text-sm text-slate-500`}>{tr.ticketNoLongerExists}</p>
      </div>
    );
  }

  const currency = data.studioDefaults?.currency || "";
  const contact = { name: ticket.contactName, phone: ticket.contactPhone, email: ticket.contactEmail };
  const rfq = rfqInfo(ticket, aliasOf);

  // WHAT THE TWO BUTTONS SHOW, in one place. Every condition here is derived
  // from the ticket the server sent — the server decides the same questions
  // again on the way in, so a stale tab can offer something and still be
  // refused rather than getting away with it.
  const canAct = data.canManage && data.hasTechnical;
  // `quotationApproved` is the server's answer, read off the approval rather
  // than off the document — the same question requestRfq refuses on, so this
  // button is never drawn where pressing it would be turned down.
  const canRequestRfq = canAct && canRequestRfqStatus(ticket.status) && !ticket.quotationApproved;
  const approval = ticket.approval;
  const showApproval = canAct && data.hasTasks && !ticket.rfqPending
    && (ticket.hasFinishedQuotation || approval);
  // The PO follows the approval: it is offered once the quotation this ticket
  // is priced from has been signed off, and it reports its own progress after
  // that. `po` is null until one is sent.
  const po = ticket.po;
  const showPo = canAct && data.hasTasks && (approval?.approved || po);

  // The timeline is built from what the ticket already records, so it cannot
  // drift from the row: no separate event log to keep in step.
  const events = [
    { at: ticket.createdAt, label: tr.ticketCreated },
    ...mine.map((q) => ({
      at: q.createdAt,
      label: `Quotation ${q.number || ""}${Number(q.revision) > 1 ? ` Rev ${q.revision}` : ""} raised`.replace(/\s+/g, " ").trim(),
    })),
    ...(approval?.at ? [{ at: approval.at, label: tr.quotationApproved }] : []),
    ...(ticket.comments || []).map((c) => ({ at: c.at, label: `Comment by ${aliasOf[c.byCollaboratorId] || "someone"}` })),
    ...(ticket.updatedAt && ticket.updatedAt !== ticket.createdAt ? [{ at: ticket.updatedAt, label: tr.lastUpdated }] : []),
  ].filter((e) => e.at).sort((a, b) => String(a.at).localeCompare(String(b.at)));

  return (
    <div className="space-y-4">
      <Back slug={slug} title={ticket.title} ref_={ticket.ref} clientName={ticket.clientName} />

      {poOpen && (
        <Dialog title={tr.submitPoFinance}
          description={tr.whatClientSentFinance}
          onClose={() => setPoOpen(false)} width="max-w-[560px]">
          <PoForm busy={busy} onCancel={() => setPoOpen(false)} onSave={submitPo} />
        </Dialog>
      )}

      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
      {note && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">{note}</p>}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* ---- left column ---- */}
        <div className="space-y-4">
          <section className={card}>
            <div className="flex items-start justify-between gap-3">
              <h2 className={h2}>{tr.ticketInfo}</h2>
              {data.canManage && (
                <button type="button" className={btnGhost} onClick={() => setEditing(true)}>{tr.edit}</button>
              )}
            </div>
            <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <DetailField label={tr.reference} value={ticket.ref} mono />
              <DetailField label={tr.status} value={ticket.status} />
              {/* WHY THIS DEAL ENDED, WHERE THE DEAL IS READ. `lostReason` was
                  on the ticket schema from the beginning and written by
                  nothing; the pipeline's stage transition writes it now, and a
                  reason nobody is ever shown would be the same dead field with
                  a value in it.

                  The chain's own close stores a TOKEN (pipeline's
                  CHAIN_LOST_REASON) rather than a sentence, because a sentence
                  written by the code would be English sitting in the database
                  for an Arabic studio to read verbatim. What a PERSON typed is
                  data and is shown exactly as typed. */}
              {ticket.lostReason && (
                <DetailField
                  label={tr.lostReasonLabel}
                  value={ticket.lostReason === CHAIN_LOST_REASON ? tr.reasonRfqRejected : ticket.lostReason}
                />
              )}
              {ticket.closedAt && <DetailField label={tr.closedOn} value={fmtDate(ticket.closedAt)} />}
              <DetailField label={tr.urgency} value={ticket.urgency} />
              <DetailField label={tr.deadline} value={fmtDate(ticket.deadline)} />
              <DetailField label={tr.industry} value={ticket.industry} />
              <DetailField label={tr.owner} value={aliasOf[ticket.assignedToCollaboratorId] || tr.unassigned3} />
              {/* VALUE QUOTED: the latest quotation's total, never typed. */}
              <DetailField label={tr.valueQuoted} value={ticket.value ? <Money amount={ticket.value} currency={currency} /> : ""} />
              <DetailField label={tr.clientBudget} value={ticket.clientBudget ? <Money amount={ticket.clientBudget} currency={currency} /> : ""} />
              <DetailField label={tr.site} value={ticket.location?.name} />
              <DetailField label={tr.country} value={ticket.location?.country} />
              <DetailField label={tr.city} value={ticket.location?.city} />
              {ticket.location?.url && (
                <DetailField label={tr.map} value={<a href={ticket.location.url} target="_blank" rel="noopener noreferrer" className="text-brand-700 underline dark:text-brand-300">{tr.openMap}</a>} />
              )}
            </dl>
            {ticket.description && (
              <p className="mt-4 whitespace-pre-wrap border-t border-slate-100 pt-4 text-sm text-slate-600 dark:border-white/10 dark:text-slate-300">
                {ticket.description}
              </p>
            )}
          </section>

          {/* THE QUOTATION BOX. One row per quotation, LATEST ALWAYS ON TOP —
              that top row is the one the ticket is priced from, so it is the
              one somebody reaching this screen is looking for. A row opens the
              document in the Sales-side viewer, which is a copy to read: the
              builder belongs to Technical and stays there. */}
          <section className={card}>
            <h2 className={h2}>{tr.quotations}</h2>
            {mine.length === 0 ? (
              <p className={sub}>
                {ticket.rfqPending
                  ? tr.technicalTicketQuotationWill
                  : tr.noQuotationRaisedAgainst}
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {mine.map((q, i) => (
                  <li key={q.id}>
                    <Link
                      href={`/${slug}/crm-sales-tickets/${ticketId}/quotations/${q.id}`}
                      className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200/70 px-4 py-3 text-sm transition-colors hover:border-brand-500 hover:bg-slate-50 dark:border-white/10 dark:hover:border-brand-500/40 dark:hover:bg-white/5"
                    >
                      <span className="font-mono text-xs text-slate-500">{q.number || "—"}</span>
                      {Number(q.revision) > 1 && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-600 text-slate-500 dark:bg-white/10 dark:text-slate-300">Rev {q.revision}</span>
                      )}
                      {i === 0 && mine.length > 1 && (
                        <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-[11px] font-700 text-brand-700 dark:text-brand-300">{tr.latest}</span>
                      )}
                      <span className="font-600 text-slate-900 dark:text-white">{q.status}</span>
                      {q.total ? <span className="text-slate-600 dark:text-slate-300">{money(q.total)}</span> : null}
                      <span className="ms-auto text-xs text-slate-400">{fmtDate(q.createdAt)}</span>
                      <Icon name="chevronRight" className="h-4 w-4 shrink-0 text-slate-300 rtl:-scale-x-100" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={card}>
            <h2 className={h2}>{tr.comments}</h2>
            {(ticket.comments || []).length === 0 ? (
              <p className={sub}>{tr.nothingSaidYet}</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {ticket.comments.map((c) => (
                  <li key={c.id} className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-white/5">
                    <p className="text-sm text-slate-700 dark:text-slate-200">{c.text}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {aliasOf[c.byCollaboratorId] || tr.someone3} · {fmtDate(c.at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            {data.canManage && (
              <div className="mt-4 flex gap-3">
                <Field
                  label={tr.addComment}
                  value={comment}
                  onChange={(v) => setComment(v)}
                  className="flex-1"
                  inputProps={{ onKeyDown: (e) => { if (e.key === "Enter") addComment(); } }}
                />
                <button className={btn} onClick={addComment} disabled={busy || !comment.trim()}>
                  {busy ? tr.saving : tr.post}
                </button>
              </div>
            )}
          </section>
        </div>

        {/* ---- right column ---- */}
        <div className="space-y-4">
          {/* THE ACTIONS, directly above the client box — the first thing on
              this page, because handing the ticket over and sending the answer
              up are the only two things Sales does to a ticket from here. */}
          {(canRequestRfq || showApproval) && (
            <div className="space-y-2">
              {!canRequestRfq ? null : ticket.rfqPending ? (
                <button type="button" className={btnActionOff} disabled
                  title={tr.technicalTicketCanRequest}>
                  {tr.quotationSent}
                </button>
              ) : (
                <button type="button" className={btnActionOn} disabled={acting === "rfq"}
                  title={ticket.rfqCount > 0
                    ? tr.sendTicketBackTechnical
                    : tr.handTicketTechnicalPricing}
                  onClick={() => act("rfq")}>
                  {acting === "rfq" ? tr.sending : tr.requestRfq}
                </button>
              )}

              {showApproval && (
                approval?.approved ? (
                  <button type="button" className={btnApproved} disabled>
                    <Icon name="checkDouble" className="h-4 w-4" /> {tr.quotationApproved}
                  </button>
                ) : approval ? (
                  <button type="button" className={btnActionOff} disabled
                    title={tr.waitingOnApprovers(approval.required - approval.granted, approval.required)}>
                    Pending Approval ({approval.granted}/{approval.required})
                  </button>
                ) : (
                  <button type="button" className={btnApprove} disabled={acting === "approval"}
                    title={tr.sendLatestQuotationAppointed}
                    onClick={() => act("approval")}>
                    {acting === "approval" ? tr.sending : tr.sendApproval}
                  </button>
                )
              )}

              {/* SUBMIT PO — the last thing Sales does to a ticket. It appears
                  only once the quotation is APPROVED, because a purchase order
                  answers a document the studio has agreed to; before that there
                  is nothing for the client to have ordered. Pressing it sends
                  the client's order to Finance, who authorise it and issue the
                  project number the work is billed under. */}
              {showPo && (
                po?.approved ? (
                  <button type="button" className={btnApproved} disabled>
                    <Icon name="checkDouble" className="h-4 w-4" /> {tr.poApproved}
                  </button>
                ) : po ? (
                  <button type="button" className={btnActionOff} disabled
                    title={tr.waitingOnApprovers(po.required - po.granted, po.required)}>
                    {tr.poSubmitted} ({po.granted}/{po.required})
                  </button>
                ) : (
                  <button type="button" className={btnAction + " bg-brand-700 text-white hover:bg-brand-950"}
                    onClick={() => setPoOpen(true)}>
                    {tr.submitPo}
                  </button>
                )
              )}

              {/* What the RFQ column says, spelled out beside the buttons —
                  "Quotation Sent" says a request is out, this says who has it.
                  Both halves come from rfqInfo so the reference names whatever
                  the person named beside it is responsible for: the finished
                  quotation once there is one, the RFQ while there is not. */}
              {canRequestRfq && rfq.requested && (
                <p className={`text-center text-xs font-600 ${rfq.tone}`}>
                  {rfq.ref ? `${rfq.ref} · ` : ""}{rfq.text}
                </p>
              )}
            </div>
          )}

          <section className={card}>
            <div className="flex flex-col items-center text-center">
              <span className="inline-flex h-24 w-32 items-center justify-center overflow-hidden rounded-geex border border-slate-200/70 bg-white p-2 dark:border-white/10 dark:bg-white/5">
                {client?.logo
                  /* eslint-disable-next-line @next/next/no-img-element */
                  ? <img src={client.logo} alt="" className="h-full w-full object-contain" />
                  : <span className="font-display text-2xl font-800 text-brand-700 dark:text-brand-300">
                      {(ticket.clientName || "?").slice(0, 2).toUpperCase()}
                    </span>}
              </span>
              <p className="mt-2 font-600 text-slate-900 dark:text-white">{ticket.clientName}</p>
            </div>
            <dl className="mt-4 space-y-2 border-t border-slate-100 pt-4 dark:border-white/10">
              <DetailField label={tr.contactPerson} value={contact.name} stacked />
              <DetailField label={tr.number} value={contact.phone} stacked />
              <DetailField label={tr.email} value={contact.email} stacked />
            </dl>
          </section>

          <section className={card}>
            <h2 className={`${h2} text-center`}>{tr.ticketTimeline}</h2>
            <ol className="mt-4 space-y-3">
              {events.map((e, i) => (
                <li key={`${e.at}-${i}`} className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 text-end text-sm text-slate-600 dark:text-slate-300">{e.label}</span>
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="h-2.5 w-2.5 rounded-full bg-brand-600" />
                    {i < events.length - 1 && (
                      <span aria-hidden="true" className="absolute left-1/2 top-full h-3 w-px -translate-x-1/2 bg-slate-200 dark:bg-white/15" />
                    )}
                  </span>
                  <span className="w-20 shrink-0 text-xs text-slate-400">{fmtDate(e.at)}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      {/* The SAME form the list uses, opened here. Editing a ticket from its own
          page should not send you back to a list to do it — and importing the
          form rather than copying it means the two can never diverge. */}
      {editing && (
        <Dialog
          title={`Edit ${ticket.ref}`}
          description={tr.fieldsMarkedRequired}
          onClose={() => setEditing(false)}
        >
          <TicketForm
            row={ticket}
            clients={data.clients || []}
            vocabulary={data.vocabulary || {}}
            services={data.services || []}
            cities={data.salesCities || []}
            positions={data.salesContactPositions || []}
            studioDefaults={data.studioDefaults || {}}
            onCancel={() => setEditing(false)}
            onSave={async (payload) => {
              const res = await fetch(`/api/studios/${slug}/sales/tickets`, {
                method: "PUT", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...payload, id: ticket.id }),
              });
              if (!res.ok) { setError(tr.didnSave); return; }
              setEditing(false);
              await load();
            }}
          />
        </Dialog>
      )}
    </div>
  );
}

function Back({ slug, title, ref_, clientName }) {
  const tr = miscDict(useStudioLocale());
  return (
    <div className="flex items-center gap-3">
      <Link href={`/${slug}/crm-sales-tickets`} className={btnGhost}>{tr.back}</Link>
      <div className="min-w-0">
        <h1 className="truncate font-display text-xl font-800 text-slate-900 dark:text-white">{title || tr.ticket}</h1>
        {ref_ && (
          <p className="truncate text-xs text-slate-400">
            {ref_}{clientName ? ` · ${clientName}` : ""}
          </p>
        )}
      </div>
    </div>
  );
}

function DetailField({ label, value, mono, stacked }) {
  return (
    <div className={stacked ? "" : "min-w-0"}>
      <dt className="text-xs font-600 uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className={`mt-0.5 text-sm text-slate-700 dark:text-slate-200 ${mono ? "font-mono text-xs" : ""}`}>
        {value || <span className="text-slate-400">—</span>}
      </dd>
    </div>
  );
}

// THE PO ITSELF. Either the document or a description of it will do — a PO
// number read down the phone is a real thing — but neither is not a PO, and
// Submit stays shut until one of them is there. The server refuses the same
// pair, so a stale tab cannot get one past it.
function PoForm({ busy, onCancel, onSave }) {
  const tr = miscDict(useStudioLocale());
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const ready = Boolean(description.trim() || file);

  return (
    <>
      <div>
        <span className="mb-1 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {tr.attachThePo}
        </span>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 px-4 py-2 font-display text-sm font-600 text-[var(--geex-muted)] transition-colors hover:bg-slate-50 dark:border-white/15 dark:hover:bg-white/5">
          {file ? tr.changeFile : tr.chooseFile}
          <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </label>
        {file && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{file.name}</p>}
      </div>

      <div className="mt-4">
        <Field label={tr.description} as="textarea" hint={tr.poNumberValueAnything}
          value={description} onChange={(v) => setDescription(v)} />
      </div>

      <p className={`mt-3 text-xs ${ready ? "text-slate-500 dark:text-slate-400" : "text-amber-700 dark:text-amber-300"}`}>
        {ready
          ? tr.goesWhoeverHoldsManagement
          : tr.attachPoDescribeBoth}
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <button className={btn} disabled={busy || !ready} onClick={() => onSave({ description: description.trim(), file })}>
          {busy ? tr.sending : tr.submitPoFinance}
        </button>
        <button className={btnGhost} onClick={onCancel}>{tr.cancel}</button>
      </div>
    </>
  );
}
