// THE LEAD QUEUE AND THE ASSIGN CONTROL (19/09/2026) — written once, because the
// Sales tickets screen and a ticket's own page both hand a lead to somebody, and
// two copies of "who may assign, and what happens then" are two answers free to
// disagree. The rules are modules/sales/leads; the server refuses what this
// does not offer.
"use client";
import { useState } from "react";
import Link from "next/link";
import { useStudioLocale } from "@/components/studio2/locale";
import { leadsDict } from "@/shared/studio/leads";
import { btn, btnRow, fmtDateTime } from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";

const LATE = "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300";
const WAITING = "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300";

/** A lead's state as a chip, or nothing for a ticket somebody is working in time. */
export function LeadStateChip({ ticket }) {
  const tr = leadsDict(useStudioLocale());
  const text = tr.state(ticket?.leadState || "");
  if (!text) return null;
  const late = String(ticket.leadState).startsWith("late");
  return <span className={`rounded-full px-2 py-0.5 text-xs font-600 ${late ? LATE : WAITING}`}>{text}</span>;
}

/**
 * CHOOSE SOMEBODY AND ASSIGN. `onAssign(ticketId, collaboratorId)` resolves to
 * the refusal token or "" — the caller owns the request and the reload.
 */
export function AssignControl({ ticket, people = [], onAssign, label }) {
  const tr = leadsDict(useStudioLocale());
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const choices = people.filter((p) => p.id !== ticket.assignedToCollaboratorId);
  const go = async () => {
    setBusy(true); setError("");
    const refusal = await onAssign(ticket.id, to);
    setBusy(false);
    if (refusal) setError(tr.refuse[refusal] || refusal); else setTo("");
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Field label={tr.choosePerson} as="select" value={to} onChange={setTo} className="min-w-[14rem]"
        options={[{ value: "", label: "—" }, ...choices.map((p) => ({ value: p.id, label: p.alias }))]} />
      <button type="button" className={ticket.assignedToCollaboratorId ? btnRow : btn} disabled={busy || !to} onClick={go}>
        {label || (ticket.assignedToCollaboratorId ? tr.reassign : tr.assign)}
      </button>
      {error && <span role="alert" className="text-xs text-rose-600 dark:text-rose-300">{error}</span>}
    </div>
  );
}

/**
 * THE MANAGER'S QUEUE — every lead nobody is on, late ones first. Drawn only for
 * somebody who may assign (`canAssign` from the server); for anybody else the
 * server has already left these tickets out.
 */
export function LeadQueue({ slug, tickets = [], people = [], onAssign }) {
  const tr = leadsDict(useStudioLocale());
  const waiting = tickets
    .filter((t) => !t.assignedToCollaboratorId)
    .sort((a, b) => Number(String(b.leadState).startsWith("late")) - Number(String(a.leadState).startsWith("late"))
      || String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
  if (!waiting.length) return null;
  return (
    <section className="rounded-geex border border-amber-200 bg-amber-50/60 p-5 dark:border-amber-500/30 dark:bg-amber-500/[0.06]">
      <h3 className="font-display text-base font-800 text-slate-900 dark:text-white">{tr.queueTitle(waiting.length)}</h3>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{tr.queueSub}</p>
      <ul className="mt-4 divide-y divide-amber-200/70 dark:divide-white/10">
        {waiting.map((t) => (
          <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-sm text-slate-900 dark:text-white">
                <Link href={`/${slug}/crm-sales-tickets/${t.id}`} className="font-mono text-xs text-brand-700 hover:underline dark:text-brand-300">{t.ref}</Link>
                <span className="font-600">{t.clientName}</span>
                {t.title && t.title !== t.clientName && <span className="text-slate-500 dark:text-slate-400">· {t.title}</span>}
                <LeadStateChip ticket={t} />
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {[t.campaignName, [t.contactPhone, t.contactEmail].filter(Boolean).join(" · "), t.leadDueAt ? tr.dueBy(fmtDateTime(t.leadDueAt)) : ""]
                  .filter(Boolean).join(" — ")}
              </p>
            </div>
            <AssignControl ticket={t} people={people} onAssign={onAssign} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Send an assignment; resolves to the refusal token, or "" when it went through. */
export async function assignLead(slug, ticketId, to) {
  const res = await fetch(`/api/studios/${slug}/sales/tickets`, {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: ticketId, action: "assign", to }),
  });
  if (res.ok) return "";
  const out = await res.json().catch(() => ({}));
  return String(out.error || "failed");
}
