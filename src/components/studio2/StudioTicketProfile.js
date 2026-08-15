"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/studio2/icons";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { panel, h2, sub, input, btn, btnGhost, money, fmtDate } from "@/components/studio2/ui";

// ONE TICKET, on its own page — the layout in the brief: the ticket's own
// information on the left with the client and the timeline down the right, and
// quotations and comments beneath.
//
// It reads the SAME endpoints the Sales board does rather than gaining one of
// its own: a ticket is not a new kind of record, it is one row of a list that
// already loads with its client and its people attached. Quotations come from
// Technical, which is where they are raised.

const card = `${panel} min-h-0`;

export default function StudioTicketProfile({ slug, ticketId }) {
  const [data, setData] = useState(null);
  const [quotations, setQuotations] = useState([]);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/sales`, { cache: "no-store" });
    if (!res.ok) { setError("You don't have access to Sales in this studio."); return; }
    setData(await res.json());
    // Quotations live in Technical. Not having that section is normal, not an
    // error, so a refusal here just leaves the panel empty.
    const tech = await fetch(`/api/studios/${slug}/technical`, { cache: "no-store" });
    if (tech.ok) setQuotations((await tech.json()).quotations || []);
  }, [slug]);

  useEffect(() => { load(); }, [load]);
  useLiveUpdates(slug, "sales", load);
  useLiveUpdates(slug, "technical", load);

  const ticket = data?.tickets?.find((t) => t.id === ticketId) || null;
  const client = data?.clients?.find((c) => c.id === ticket?.clientId) || null;
  const aliasOf = useMemo(
    () => Object.fromEntries((data?.people || []).map((p) => [p.id, p.alias])),
    [data],
  );
  const mine = useMemo(
    () => quotations.filter((q) => q.ticketId === ticketId),
    [quotations, ticketId],
  );

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

  const contact = { name: ticket.contactName, phone: ticket.contactPhone, email: ticket.contactEmail };
  // The timeline is built from what the ticket already records, so it cannot
  // drift from the row: no separate event log to keep in step.
  const events = [
    { at: ticket.createdAt, label: "Ticket created" },
    ...mine.map((q) => ({ at: q.createdAt, label: `Quotation ${q.ref || ""} raised`.trim() })),
    ...(ticket.comments || []).map((c) => ({ at: c.at, label: `Comment by ${aliasOf[c.byCollaboratorId] || "someone"}` })),
    ...(ticket.updatedAt && ticket.updatedAt !== ticket.createdAt ? [{ at: ticket.updatedAt, label: "Last updated" }] : []),
  ].filter((e) => e.at).sort((a, b) => String(a.at).localeCompare(String(b.at)));

  return (
    <div className="space-y-4">
      <Back slug={slug} title={ticket.title} ref_={ticket.ref} clientName={ticket.clientName} />

      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* ---- left column ---- */}
        <div className="space-y-4">
          <section className={card}>
            <div className="flex items-start justify-between gap-3">
              <h2 className={h2}>Ticket info</h2>
              {data.canManage && (
                // Editing lives on the list, which owns the form — this links
                // back to it rather than keeping a second copy of it here.
                <Link href={`/${slug}/sales-tickets?edit=${ticket.id}`} className={btnGhost}>Edit</Link>
              )}
            </div>
            <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <Field label="Reference" value={ticket.ref} mono />
              <Field label="Status" value={ticket.status} />
              <Field label="Urgency" value={ticket.urgency} />
              <Field label="Deadline" value={fmtDate(ticket.deadline)} />
              <Field label="Industry" value={ticket.industry} />
              <Field label="Owner" value={aliasOf[ticket.assignedToCollaboratorId] || "Unassigned"} />
              <Field label="Value" value={ticket.value ? money(ticket.value) : "—"} />
              <Field label="Client budget" value={ticket.clientBudget ? money(ticket.clientBudget) : "—"} />
              <Field label="Site" value={ticket.location?.name} />
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

          <section className={card}>
            <h2 className={h2}>Quotations</h2>
            {mine.length === 0 ? (
              <p className={sub}>No quotation has been raised against this ticket yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {mine.map((q) => (
                  <li key={q.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200/70 px-4 py-3 text-sm dark:border-white/10">
                    <span className="font-mono text-xs text-slate-500">{q.ref}</span>
                    <span className="font-600 text-slate-900 dark:text-white">{q.status}</span>
                    {q.total ? <span className="text-slate-600 dark:text-slate-300">{money(q.total)}</span> : null}
                    <span className="ms-auto text-xs text-slate-400">{fmtDate(q.createdAt)}</span>
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
