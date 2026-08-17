"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/studio2/icons";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { panel, h2, sub, input, btn, btnGhost, money, fmtDate, Dialog } from "@/components/studio2/ui";
import { TicketForm } from "@/components/studio2/StudioSales";
import { Money } from "@/components/Currency";
import { canRequestRfqStatus } from "@/lib/tickets";
import { rfqInfo } from "@/lib/salesAnalytics";

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
  const [data, setData] = useState(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [acting, setActing] = useState("");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/sales`, { cache: "no-store" });
    if (!res.ok) { setError("You don't have access to Sales in this studio."); return; }
    setData(await res.json());
  }, [slug]);

  useEffect(() => { load(); }, [load]);
  useLiveUpdates(slug, "sales", load);
  useLiveUpdates(slug, "technical", load);
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
        out.error === "already" && kind === "rfq" ? "That ticket is already with Technical — you can send it again once the quotation comes back."
        : out.error === "already" ? "This quotation has already been sent for approval."
        : out.error === "rfq-pending" ? "A new RFQ is outstanding — wait for the revised quotation before sending it up."
        : out.error === "not-quoted" ? "There is no finished quotation on this ticket to approve yet."
        : out.error === "no-tasks" ? "This studio has no Tasks section to send the approval to."
        : out.error === "no-technical" ? "This studio has no Technical section to send an RFQ to."
        : out.error === "read-only" || out.error === "forbidden" ? "You have view-only access to Sales."
        : out.error === "ticket" ? "That ticket no longer exists — reload the page."
        : "That didn't go through.",
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

  async function addComment() {
    if (!comment.trim()) return;
    setBusy(true); setError("");
    const res = await fetch(`/api/studios/${slug}/sales/tickets`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: ticketId, addComment: comment }),
    });
    setBusy(false);
    if (!res.ok) { setError("That comment didn't save."); return; }
    setComment("");
    await load();
  }

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">Loading ticket…</p>;
  if (!ticket) {
    return (
      <div className="space-y-4">
        <Back slug={slug} />
        <p className={`${panel} text-sm text-slate-500`}>That ticket no longer exists.</p>
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
  const canRequestRfq = canAct && canRequestRfqStatus(ticket.status);
  const approval = ticket.approval;
  const showApproval = canAct && data.hasTasks && !ticket.rfqPending
    && (ticket.hasFinishedQuotation || approval);

  // The timeline is built from what the ticket already records, so it cannot
  // drift from the row: no separate event log to keep in step.
  const events = [
    { at: ticket.createdAt, label: "Ticket created" },
    ...mine.map((q) => ({
      at: q.createdAt,
      label: `Quotation ${q.number || ""}${Number(q.revision) > 1 ? ` Rev ${q.revision}` : ""} raised`.replace(/\s+/g, " ").trim(),
    })),
    ...(approval?.at ? [{ at: approval.at, label: "Quotation approved" }] : []),
    ...(ticket.comments || []).map((c) => ({ at: c.at, label: `Comment by ${aliasOf[c.byCollaboratorId] || "someone"}` })),
    ...(ticket.updatedAt && ticket.updatedAt !== ticket.createdAt ? [{ at: ticket.updatedAt, label: "Last updated" }] : []),
  ].filter((e) => e.at).sort((a, b) => String(a.at).localeCompare(String(b.at)));

  return (
    <div className="space-y-4">
      <Back slug={slug} title={ticket.title} ref_={ticket.ref} clientName={ticket.clientName} />

      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
      {note && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">{note}</p>}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* ---- left column ---- */}
        <div className="space-y-4">
          <section className={card}>
            <div className="flex items-start justify-between gap-3">
              <h2 className={h2}>Ticket info</h2>
              {data.canManage && (
                <button type="button" className={btnGhost} onClick={() => setEditing(true)}>Edit</button>
              )}
            </div>
            <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <Field label="Reference" value={ticket.ref} mono />
              <Field label="Status" value={ticket.status} />
              <Field label="Urgency" value={ticket.urgency} />
              <Field label="Deadline" value={fmtDate(ticket.deadline)} />
              <Field label="Industry" value={ticket.industry} />
              <Field label="Owner" value={aliasOf[ticket.assignedToCollaboratorId] || "Unassigned"} />
              {/* VALUE QUOTED: the latest quotation's total, never typed. */}
              <Field label="Value Quoted" value={ticket.value ? <Money amount={ticket.value} currency={currency} /> : ""} />
              <Field label="Client budget" value={ticket.clientBudget ? <Money amount={ticket.clientBudget} currency={currency} /> : ""} />
              <Field label="Site" value={ticket.location?.name} />
              <Field label="Country" value={ticket.location?.country} />
              <Field label="City" value={ticket.location?.city} />
              {ticket.location?.url && (
                <Field label="Map" value={<a href={ticket.location.url} target="_blank" rel="noopener noreferrer" className="text-brand-700 underline dark:text-brand-300">Open map</a>} />
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
            <h2 className={h2}>Quotations</h2>
            {mine.length === 0 ? (
              <p className={sub}>
                {ticket.rfqPending
                  ? "Technical has this ticket — the quotation will appear here once it is raised."
                  : "No quotation has been raised against this ticket yet."}
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {mine.map((q, i) => (
                  <li key={q.id}>
                    <Link
                      href={`/${slug}/sales-tickets/${ticketId}/quotations/${q.id}`}
                      className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200/70 px-4 py-3 text-sm transition-colors hover:border-brand-500 hover:bg-slate-50 dark:border-white/10 dark:hover:border-brand-500/40 dark:hover:bg-white/5"
                    >
                      <span className="font-mono text-xs text-slate-500">{q.number || "—"}</span>
                      {Number(q.revision) > 1 && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-600 text-slate-500 dark:bg-white/10 dark:text-slate-300">Rev {q.revision}</span>
                      )}
                      {i === 0 && mine.length > 1 && (
                        <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-[11px] font-700 text-brand-700 dark:text-brand-300">Latest</span>
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
            <h2 className={h2}>Comments</h2>
            {(ticket.comments || []).length === 0 ? (
              <p className={sub}>Nothing said yet.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {ticket.comments.map((c) => (
                  <li key={c.id} className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-white/5">
                    <p className="text-sm text-slate-700 dark:text-slate-200">{c.text}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {aliasOf[c.byCollaboratorId] || "Someone"} · {fmtDate(c.at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            {data.canManage && (
              <div className="mt-4 flex gap-3">
                <input
                  className={input}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addComment(); }}
                  placeholder="Add a comment"
                />
                <button className={btn} onClick={addComment} disabled={busy || !comment.trim()}>
                  {busy ? "Saving…" : "Post"}
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
                  title="Technical has this ticket. You can request another RFQ once the quotation comes back.">
                  Quotation Sent
                </button>
              ) : (
                <button type="button" className={btnActionOn} disabled={acting === "rfq"}
                  title={ticket.rfqCount > 0
                    ? "Send this ticket back to Technical to have the last quotation revised"
                    : "Hand this ticket to Technical for pricing"}
                  onClick={() => act("rfq")}>
                  {acting === "rfq" ? "Sending…" : "Request RFQ"}
                </button>
              )}

              {showApproval && (
                approval?.approved ? (
                  <button type="button" className={btnApproved} disabled>
                    <Icon name="checkDouble" className="h-4 w-4" /> Quotation Approved
                  </button>
                ) : approval ? (
                  <button type="button" className={btnActionOff} disabled
                    title={`Waiting on ${approval.required - approval.granted} of ${approval.required} approver${approval.required === 1 ? "" : "s"}`}>
                    Pending Approval ({approval.granted}/{approval.required})
                  </button>
                ) : (
                  <button type="button" className={btnApprove} disabled={acting === "approval"}
                    title="Send the latest quotation to the appointed Sales and Management approvers"
                    onClick={() => act("approval")}>
                    {acting === "approval" ? "Sending…" : "Send for Approval"}
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
              <Field label="Contact person" value={contact.name} stacked />
              <Field label="Number" value={contact.phone} stacked />
              <Field label="Email" value={contact.email} stacked />
            </dl>
          </section>

          <section className={card}>
            <h2 className={`${h2} text-center`}>Ticket timeline</h2>
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
          description="Fields marked * are required."
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
              if (!res.ok) { setError("That didn't save."); return; }
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
  return (
    <div className="flex items-center gap-3">
      <Link href={`/${slug}/sales-tickets`} className={btnGhost}>Back</Link>
      <div className="min-w-0">
        <h1 className="truncate font-display text-xl font-800 text-slate-900 dark:text-white">{title || "Ticket"}</h1>
        {ref_ && (
          <p className="truncate text-xs text-slate-400">
            {ref_}{clientName ? ` · ${clientName}` : ""}
          </p>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, mono, stacked }) {
  return (
    <div className={stacked ? "" : "min-w-0"}>
      <dt className="text-xs font-600 uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className={`mt-0.5 text-sm text-slate-700 dark:text-slate-200 ${mono ? "font-mono text-xs" : ""}`}>
        {value || <span className="text-slate-400">—</span>}
      </dd>
    </div>
  );
}
