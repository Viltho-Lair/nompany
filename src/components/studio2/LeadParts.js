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
import { byScore, scoreSpread } from "@/modules/sales/scoring";
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
// HOW STRONG A LEAD LOOKS, with the reasons under it. The band is a WORD as
// well as a colour, because "hot" and "cold" have to survive being read by
// somebody who cannot tell the two chips apart.
const BAND_TONE = {
  hot: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  warm: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  cold: "bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-300",
};

function ScoreChip({ lead, tr }) {
  const [open, setOpen] = useState(false);
  if (!lead) return null;
  const met = lead.factors.filter((f) => f.met);
  const missing = lead.factors.filter((f) => !f.met);
  return (
    <span className="relative inline-flex">
      <button type="button" onClick={() => setOpen(!open)} title={tr.scoreOf(lead.score)}
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-600 ${BAND_TONE[lead.band]}`}>
        {tr.band(lead.band)} <span className="num opacity-80">{lead.score}</span>
      </button>
      {open && (
        <span className="absolute top-full z-10 mt-1 w-64 rounded-xl border border-slate-200 bg-white p-3 text-start shadow-lg dark:border-white/10 dark:bg-slate-900">
          {/* SPANS, NOT A LIST. This panel hangs off a chip that sits inside the
              row's <p>, and an <ul> inside a <p> is invalid HTML: React closes
              the paragraph early and the server and client markup stop
              matching, which surfaces as a hydration error rather than as
              anything visibly wrong. */}
          <span className="block text-xs font-600 text-slate-500 dark:text-slate-400">{tr.why}</span>
          {met.map((f) => (
            <span key={f.key} className="mt-0.5 flex justify-between gap-2 text-xs text-slate-700 dark:text-slate-200">
              <span>{tr.factor(f.key)}</span><span className="num">+{f.points}</span>
            </span>
          ))}
          {/* WHY THE NUMBER IS LOWER THAN THE REASONS ADD UP TO. Without this
              line a faded lead looks like one whose facts are worse, and the
              screen would be showing a deduction it never explains. */}
          {lead.fade?.lost > 0 && (
            <span className="mt-2 block border-t border-slate-100 pt-2 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
              {tr.faded(lead.fade.days, lead.fade.lost)}
            </span>
          )}
          {missing.length > 0 && (
            <span className="mt-2 block">
              <span className="block text-xs font-600 text-slate-500 dark:text-slate-400">{tr.missing}</span>
              {missing.map((f) => (
                <span key={f.key} className="mt-0.5 block text-xs text-slate-400">{tr.factor(f.key)}</span>
              ))}
            </span>
          )}
        </span>
      )}
    </span>
  );
}

export function LeadQueue({ slug, tickets = [], people = [], onAssign }) {
  const tr = leadsDict(useStudioLocale());
  // LATE FIRST, THEN STRONGEST. A deadline the studio set for itself outranks
  // how good a lead looks: missing it is a promise broken, and letting a hot
  // lead push a late one down the list would quietly make the promise worthless.
  const waiting = tickets
    .filter((t) => !t.assignedToCollaboratorId)
    .sort((a, b) => Number(String(b.leadState).startsWith("late")) - Number(String(a.leadState).startsWith("late"))
      || byScore({ score: a.lead?.score, createdAt: a.createdAt }, { score: b.lead?.score, createdAt: b.createdAt }));
  const spread = scoreSpread(waiting.map((t) => t.lead || {}));
  if (!waiting.length) return null;
  return (
    <section className="rounded-geex border border-amber-200 bg-amber-50/60 p-5 dark:border-amber-500/30 dark:bg-amber-500/[0.06]">
      <h3 className="font-display text-base font-800 text-slate-900 dark:text-white">{tr.queueTitle(waiting.length)}</h3>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{tr.queueSub}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {tr.spread(spread.hot, spread.warm, spread.cold)} — {tr.sortedByScore}
      </p>
      <ul className="mt-4 divide-y divide-amber-200/70 dark:divide-white/10">
        {waiting.map((t) => (
          <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-sm text-slate-900 dark:text-white">
                <Link href={`/${slug}/crm-sales-tickets/${t.id}`} className="font-mono text-xs text-brand-700 hover:underline dark:text-brand-300">{t.ref}</Link>
                <span className="font-600">{t.clientName}</span>
                {t.title && t.title !== t.clientName && <span className="text-slate-500 dark:text-slate-400">· {t.title}</span>}
                <LeadStateChip ticket={t} />
                <ScoreChip lead={t.lead} tr={tr} />
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
