"use client";

import { useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { operationsDict } from "@/shared/studio/operations";
import RecordLink from "@/components/studio2/RecordLink";
import { linkToProject, linkIf } from "@/modules/main/studioLinks";
import { Dialog, Empty, fmtDate, panel, btn, btnGhost } from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";
import StudioDate from "@/components/fields/StudioDate";
import { StatusPill } from "@/components/studio2/StatusPill";
import { permitDeletable, permitLive, permitMoves, permitStatusOf } from "@/modules/operations/permitModel";

// THE ONE PERMIT REGISTER'S PANEL (tier 5) — drawn by Quality & HSE's Permits
// screen, and by the Schedule screen's Permits tab until a studio has that
// register. One panel, so the two cannot show one register two ways.
//
// A PERMIT CARRIES TWO FACTS and both are drawn: WHERE IT STANDS (Requested,
// Issued, Closed, Cancelled — modules/operations/permitModel) and WHETHER IT IS
// IN FORCE (Valid, Expiring, Expired, from its dates). Only an issued permit's
// expiry is a warning: a request lapses with nothing to renew.
//
// `send(path, method, body)` is the screen's own writer, so the panel works
// against whichever route its screen answers to.

const label = "mb-1 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400";
const btnDanger = "rounded-full border border-rose-200 px-4 py-2 font-display text-sm font-600 text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-60 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10";
const fmt = fmtDate;
const STANDING_TONE = {
  Requested: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  Issued: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  Closed: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300",
  Cancelled: "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400",
};

export default function PermitsPanel({ rows, locations, people, projects, types, windowDays, slug, nav, canManage, busy, send }) {
  const tr = operationsDict(useStudioLocale());
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const attention = rows.filter((p) => permitLive(p) && (p.state === "Expiring" || p.state === "Expired"));
  const moveLabel = { Issued: tr.issuePermit, Closed: tr.closePermit, Cancelled: tr.cancelPermit };

  return (
    <>
      {canManage && <button className={btn} onClick={() => setAdding(true)}>{tr.addPermit}</button>}
      {(adding || editing) && (
        <Dialog
          title={editing ? tr.editPermit : tr.newPermit}
          description={tr.whatPermittedWhereUntil}
          onClose={() => { setAdding(false); setEditing(null); }}
        >
          <PermitForm permit={editing} locations={locations} people={people} projects={projects} types={types} busy={busy}
            onCancel={() => { setAdding(false); setEditing(null); }}
            onSave={async (v) => { if (await send("permits", editing ? "PUT" : "POST", editing ? { ...v, id: editing.id } : v)) { setAdding(false); setEditing(null); } }} />
        </Dialog>
      )}

      {attention.length > 0 && (
        <div className="rounded-geex border border-amber-300/60 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
          <p className="font-display text-sm font-700 text-amber-800 dark:text-amber-200">
            Needs renewing — expired, or within {windowDays} days
          </p>
          <ul className="mt-2 space-y-1 text-sm text-amber-800 dark:text-amber-200">
            {attention.map((p) => (
              <li key={p.id}>
                {p.reference} · {p.title} — {p.state === "Expired"
                  ? `expired ${fmt(p.validTo)}`
                  : `expires ${fmt(p.validTo)} (${p.daysLeft} days)`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {rows.length === 0 ? <Empty title={tr.noPermitsYet} body={tr.permitsRecordWhatStudio} /> : (
        <section className={panel}>
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {rows.map((p) => {
              const standing = permitStatusOf(p);
              const open = standing === "Requested" || standing === "Issued";
              return (
                <li key={p.id} className="flex flex-wrap items-start justify-between gap-3 py-4 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-slate-400">{p.reference}</span>
                      <span className="font-600 text-slate-900 dark:text-white">{p.title}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-600 ${STANDING_TONE[standing]}`}>{tr.permitStatus(standing)}</span>
                      {/* In force only means something for an issued permit. */}
                      {standing === "Issued" && <StatusPill kind="permit" status={p.state} />}
                      {p.projectNumber && (
                        <RecordLink href={linkIf(nav?.projects, linkToProject(slug, p.projectId))} title={tr.openProject}>{p.projectNumber}</RecordLink>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {[p.type, p.locationName, p.number && `no. ${p.number}`, p.issuer].filter(Boolean).join(" · ")}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {p.validFrom || p.validTo ? `${fmt(p.validFrom)} – ${fmt(p.validTo)}` : tr.noDatesSet}
                      {p.holderAliases.length > 0 && ` · ${p.holderAliases.join(", ")}`}
                    </p>
                  </div>
                  {canManage && (
                    <div className="flex flex-wrap gap-2">
                      {permitMoves(p).map((to) => (
                        <button key={to} className={to === "Cancelled" ? btnGhost : btn} disabled={busy}
                          onClick={() => send("permits", "PATCH", { id: p.id, status: to })}>
                          {moveLabel[to]}
                        </button>
                      ))}
                      {open && <button className={btnGhost} onClick={() => setEditing(p)}>{tr.edit}</button>}
                      {/* CANCELLED, NEVER DELETED: only a request nobody issued goes. */}
                      {permitDeletable(p) && (
                        <button className={btnDanger} disabled={busy} onClick={() => send("permits", "DELETE", { id: p.id })}>{tr.delete}</button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}

function PermitForm({ permit, locations, people, projects, types, busy, onCancel, onSave }) {
  const tr = operationsDict(useStudioLocale());
  const [form, setForm] = useState({
    title: permit?.title || "", type: permit?.type || types[0], number: permit?.number || "",
    issuer: permit?.issuer || "", locationId: permit?.locationId || "", projectId: permit?.projectId || "",
    validFrom: permit?.validFrom || "", validTo: permit?.validTo || "", notes: permit?.notes || "",
  });
  const [holders, setHolders] = useState(permit?.holderCollaboratorIds || []);
  // ON CREATE ONLY: an authority permit is recorded once it has been issued,
  // a permit to work starts as a request. Ticked by default because recording a
  // permit somebody already holds is what this register was used for.
  const [issued, setIssued] = useState(true);

  return (
    <section className={`${panel} border-brand-500/40`}>
      <h3 className="font-display text-lg font-800 text-slate-900 dark:text-white">{permit ? tr.editPermit : tr.newPermit}</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label={tr.title} required value={form.title}
          onChange={(v) => setForm((f) => ({ ...f, title: v }))} className="sm:col-span-2" />
        <Field label={tr.type} as="select" required value={form.type}
          onChange={(v) => setForm((f) => ({ ...f, type: v }))} options={types} />
        <Field label={tr.permitNumber} value={form.number}
          onChange={(v) => setForm((f) => ({ ...f, number: v }))} />
        <Field label={tr.issued} value={form.issuer}
          onChange={(v) => setForm((f) => ({ ...f, issuer: v }))} />
        <Field label={tr.location} as="select" value={form.locationId}
          onChange={(v) => setForm((f) => ({ ...f, locationId: v }))}
          options={locations.map((l) => ({ value: l.id, label: l.name }))} />
        <Field label={tr.project} as="select" value={form.projectId}
          onChange={(v) => setForm((f) => ({ ...f, projectId: v }))}
          options={projects.map((p) => ({ value: p.id, label: p.number }))} />
        <Field label={tr.valid} filled={!!form.validFrom}>
          <StudioDate value={form.validFrom} onChange={(iso) => setForm((f) => ({ ...f, validFrom: iso }))} />
        </Field>
        <Field label={tr.valid2} filled={!!form.validTo}>
          <StudioDate value={form.validTo} onChange={(iso) => setForm((f) => ({ ...f, validTo: iso }))} />
        </Field>
      </div>

      {!permit && (
        <label className="mt-4 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
          <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={issued} onChange={(e) => setIssued(e.target.checked)} />
          {tr.alreadyIssued}
        </label>
      )}

      {people.length > 0 && (
        <div className="mt-5">
          <label className={label}>{tr.covers}</label>
          <div className="flex flex-wrap gap-2">
            {people.map((p) => {
              const on = holders.includes(p.id);
              return (
                <button key={p.id} type="button"
                  onClick={() => setHolders((h) => (on ? h.filter((x) => x !== p.id) : [...h, p.id]))}
                  className={`rounded-full px-3 py-1.5 text-xs font-600 transition-colors ${on
                    ? "bg-brand-600 text-white"
                    : "border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5"}`}>
                  {p.alias}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <button className={btn} disabled={busy || !form.title.trim()}
          onClick={() => onSave({ ...form, holderCollaboratorIds: holders, ...(permit ? {} : { status: issued ? "Issued" : "Requested" }) })}>
          {busy ? tr.saving : tr.save}
        </button>
        <button className={btnGhost} onClick={onCancel}>{tr.cancel}</button>
      </div>
    </section>
  );
}
