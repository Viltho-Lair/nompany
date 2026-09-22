"use client";

// EVENTS & WEBINARS (22/09/2026) — what is on, who signed up, and who came.
//
// THE EVENT OWNS ONE FACT AND BORROWS THE OTHER. Registrations are the
// registration form's replies, counted where Forms keeps them; attendance is
// the event's own, because nothing else in the product knows who walked in.
// The gap between the two is the number an event exists to produce.
//
// COUNTS WITHOUT THE FORMS RIGHT, NAMES WITH IT. A registrant's name is a
// sealed form answer, so `marketing.events.view` shows how many signed up and
// the register of who is fetched only for somebody who could open that form
// anyway — and the screen SAYS so rather than showing an empty list, which
// would read as nobody having registered.

import { useCallback, useEffect, useState } from "react";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import { useStudioLocale } from "@/components/studio2/locale";
import {
  panel, h2, sub, btn, btnGhost, btnRow, btnRowDanger, Dialog, Empty, fmtDateTime,
} from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";
import { marketingEventsDict } from "@/shared/studio/marketingEvents";

const KINDS = ["event", "webinar"];
const BLANK = {
  id: "", name: "", description: "", kind: "event", startsAt: "", endsAt: "",
  location: "", capacity: "", campaignId: "", formId: "", ownerCollaboratorId: "",
};
const blank = (v) => (v === null || v === undefined ? "" : String(v));

const STATE_TONE = {
  running: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  upcoming: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  past: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300",
};

export default function StudioMarketingEvents({ slug }) {
  const locale = useStudioLocale();
  const tr = marketingEventsDict(locale);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [openDoor, setOpenDoor] = useState("");

  const reload = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/marketing/events`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setError(tr.refuse[body.error] || body.error || tr.failed); return; }
    setError("");
    setData(body);
  }, [slug, tr]);

  useEffect(() => {
    let alive = true;
    (async () => { if (alive) await reload(); })();
    return () => { alive = false; };
  }, [reload]);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <ScreenSkeleton loadingLabel={tr.loading} />;

  const { events = [], people = [], campaigns = [], forms = [], sources = {} } = data;

  const save = async () => {
    setBusy(true);
    const res = await fetch(`/api/studios/${slug}/marketing/events`, {
      method: form.id ? "PUT" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...form, id: form.id || undefined }),
    });
    const answer = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(tr.refuse[answer.error] || answer.error || tr.failed); return; }
    setError("");
    setForm(null);
    await reload();
  };

  const remove = async (id) => {
    if (!window.confirm(tr.confirmDelete)) return;
    const res = await fetch(`/api/studios/${slug}/marketing/events`, {
      method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }),
    });
    const answer = await res.json().catch(() => ({}));
    if (!res.ok) { setError(tr.refuse[answer.error] || answer.error || tr.failed); return; }
    setError("");
    await reload();
  };

  return (
    <div className="space-y-4">
      <section className={panel}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 max-w-2xl">
            <h2 className={h2}>{tr.title}</h2>
            <p className={sub}>{tr.sub}</p>
          </div>
          {data.canCreate && (
            <button type="button" className={btn} onClick={() => setForm({ ...BLANK })}>{tr.add}</button>
          )}
        </div>
        {error && <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">{error}</p>}
        {/* WHAT COULD NOT BE READ, in words. A zero that means "nothing was
            read" is a lie about the studio's own sign-ups. */}
        {!sources.forms && <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">{tr.formsOff}</p>}
      </section>

      {events.length === 0 ? (
        <section className={panel}><Empty title={tr.none} body={tr.noneHint} /></section>
      ) : (
        events.map((e) => (
          <EventCard
            key={e.id} event={e} tr={tr} slug={slug}
            canEdit={data.canEdit} canDelete={data.canDelete}
            canSeeRegistrants={data.canSeeRegistrants}
            open={openDoor === e.id}
            onToggle={() => setOpenDoor(openDoor === e.id ? "" : e.id)}
            onEdit={() => setForm({
              id: e.id, name: e.name, description: e.description, kind: e.kind,
              startsAt: e.startsAt, endsAt: e.endsAt, location: e.location,
              capacity: blank(e.capacity), campaignId: e.campaignId, formId: e.formId,
              ownerCollaboratorId: e.ownerCollaboratorId,
            })}
            onDelete={() => remove(e.id)}
            onSaved={reload}
            onError={setError}
          />
        ))
      )}

      {form && (
        <Dialog title={form.id ? tr.edit : tr.add} onClose={() => setForm(null)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tr.name} value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))} inputProps={{ maxLength: 200 }} />
            <Field label={tr.kind} as="select" value={form.kind}
              onChange={(v) => setForm((f) => ({ ...f, kind: v }))}
              options={KINDS.map((k) => ({ value: k, label: tr.kinds[k] }))} />
            <Field label={tr.startsAt} type="datetime-local" value={form.startsAt}
              onChange={(v) => setForm((f) => ({ ...f, startsAt: v }))} />
            <Field label={tr.endsAt} type="datetime-local" value={form.endsAt}
              onChange={(v) => setForm((f) => ({ ...f, endsAt: v }))} />
            <div className="sm:col-span-2">
              <Field label={tr.location} value={form.location}
                onChange={(v) => setForm((f) => ({ ...f, location: v }))} inputProps={{ maxLength: 500 }} />
              {/* THE HINT FOLLOWS THE KIND, because "where" means an address
                  for one and a joining link for the other. */}
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {form.kind === "webinar" ? tr.webinarLocationHint : tr.locationHint}
              </p>
            </div>
            <div>
              <Field label={tr.capacity} type="number" value={form.capacity}
                onChange={(v) => setForm((f) => ({ ...f, capacity: v }))} />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{tr.capacityHint}</p>
            </div>
            <Field label={tr.owner} as="select" value={form.ownerCollaboratorId}
              onChange={(v) => setForm((f) => ({ ...f, ownerCollaboratorId: v }))}
              options={[{ value: "", label: tr.nobody },
                ...people.map((p) => ({ value: p.id, label: p.alias || p.id }))]} />
            <div>
              <Field label={tr.form} as="select" value={form.formId}
                onChange={(v) => setForm((f) => ({ ...f, formId: v }))}
                options={[{ value: "", label: tr.noForm }, ...forms.map((f) => ({ value: f.id, label: f.name }))]} />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{tr.formHint}</p>
            </div>
            <Field label={tr.campaign} as="select" value={form.campaignId}
              onChange={(v) => setForm((f) => ({ ...f, campaignId: v }))}
              options={[{ value: "", label: tr.noCampaign }, ...campaigns.map((c) => ({ value: c.id, label: c.name }))]} />
            <div className="sm:col-span-2">
              <Field label={tr.description} as="textarea" value={form.description}
                onChange={(v) => setForm((f) => ({ ...f, description: v }))} inputProps={{ maxLength: 4000 }} />
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className={btnGhost} onClick={() => setForm(null)}>{tr.cancel}</button>
            <button type="button" className={btn} disabled={busy} onClick={save}>{tr.save}</button>
          </div>
        </Dialog>
      )}
    </div>
  );
}

function EventCard({ event: e, tr, slug, canEdit, canDelete, canSeeRegistrants, open, onToggle, onEdit, onDelete, onSaved, onError }) {
  return (
    <section className={panel}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-base font-800 text-[var(--geex-ink)]">
            {e.name}
            <span className={`ms-2 rounded-full px-2 py-0.5 text-[11px] font-600 ${STATE_TONE[e.state] || STATE_TONE.upcoming}`}>
              {tr.states[e.state]}
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {[tr.kinds[e.kind], fmtDateTime(e.startsAt), e.location, e.campaignName, e.ownerAlias && `${tr.owner}: ${e.ownerAlias}`]
              .filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {canEdit && <button type="button" className={btnRow} onClick={onEdit}>{tr.edit}</button>}
          {canDelete && !e.deleteProblem && (
            <button type="button" className={btnRowDanger} onClick={onDelete}>{tr.remove}</button>
          )}
        </div>
      </div>

      {e.description && (
        <p className="mt-3 whitespace-pre-line text-sm text-slate-700 dark:text-slate-200">{e.description}</p>
      )}

      <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="font-600 text-[var(--geex-ink)]">{tr.registered(e.registered)}</span>
        {/* NO LIMIT IS ITS OWN WORD. "0 seats left" on an open webinar would
            say it was full. */}
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {e.seatsLeft === null ? tr.noCapacity
            : e.seatsLeft < 0 ? <span className="text-amber-700 dark:text-amber-300">{tr.over(-e.seatsLeft)}</span>
              : e.seatsLeft === 0 ? tr.full
                : tr.seatsLeft(e.seatsLeft)}
        </span>
      </p>

      {/* TURNOUT, ONCE THERE IS ONE. A rate of nought before anybody has been
          marked would read as a disaster rather than as an empty door. */}
      <p className="mt-1 text-sm">
        {e.rate === null || e.attended === 0 ? (
          <span className="text-xs text-slate-400">{e.formName ? tr.notYet : tr.noFormYet}</span>
        ) : (
          <>
            <span className="font-600 text-[var(--geex-ink)]">{tr.attendedOf(e.attended, e.registered)}</span>
            <span className="ms-2 text-xs text-slate-500 dark:text-slate-400">
              {[tr.turnout(Math.round(e.rate * 100)), e.noShows > 0 && tr.noShows(e.noShows)].filter(Boolean).join(" · ")}
            </span>
          </>
        )}
      </p>

      {e.formName && (
        canSeeRegistrants ? (
          <div className="mt-3">
            <button type="button" className={btnRow} onClick={onToggle}>
              {open ? tr.hideRegistrants : tr.registrants}
            </button>
            {open && <Door eventId={e.id} tr={tr} slug={slug} onSaved={onSaved} onError={onError} />}
          </div>
        ) : (
          // SAID, NOT SHOWN EMPTY. An empty list reads as nobody registering.
          <p className="mt-3 text-xs text-slate-400">{tr.cannotSeeRegistrants}</p>
        )
      )}
    </section>
  );
}

/**
 * THE DOOR. Fetched only when somebody opens it — a register of names is not
 * read for every event on the page just in case.
 *
 * THE WHOLE LIST IS SENT ON SAVE, not a tick at a time: a door is worked by
 * several people at once, and a flip-this-one patch loses whichever tick landed
 * second.
 */
function Door({ eventId, tr, slug, onSaved, onError }) {
  const [rows, setRows] = useState(null);
  const [came, setCame] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await fetch(`/api/studios/${slug}/marketing/events?id=${encodeURIComponent(eventId)}`, { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!alive) return;
      if (!res.ok) { onError(tr.refuse[body.error] || body.error || tr.failed); return; }
      setRows(body.registrants || []);
      setCame(new Set(body.attended || []));
    })();
    return () => { alive = false; };
  }, [eventId, slug, tr, onError]);

  if (!rows) return <p className="mt-2 text-xs text-slate-400">{tr.loading}</p>;
  if (!rows.length) return <p className="mt-2 text-xs text-slate-400">{tr.noRegistrants}</p>;

  const flip = (id) => setCame((s) => {
    const next = new Set(s);
    if (next.has(id)) next.delete(id); else next.add(id);
    setDone(false);
    return next;
  });

  const save = async () => {
    setBusy(true);
    const res = await fetch(`/api/studios/${slug}/marketing/events`, {
      method: "PUT", headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: eventId, action: "attendance", attended: [...came] }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { onError(tr.refuse[body.error] || body.error || tr.failed); return; }
    setDone(true);
    await onSaved();
  };

  return (
    <div className="mt-3">
      <ul className="space-y-1">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-1 text-sm dark:border-white/5">
            <span className="min-w-0">
              <span className="font-600 text-[var(--geex-ink)]">{r.name || "—"}</span>
              <span className="ms-2 text-xs text-slate-500 dark:text-slate-400">
                {[r.email, r.phone, fmtDateTime(r.at)].filter(Boolean).join(" · ")}
              </span>
            </span>
            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={came.has(r.id)} onChange={() => flip(r.id)} />
              {tr.markedAttended}
            </label>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center gap-2">
        <button type="button" className={btn} disabled={busy} onClick={save}>{tr.saveDoor}</button>
        {done && <span className="text-xs text-emerald-700 dark:text-emerald-300">{tr.saved}</span>}
      </div>
    </div>
  );
}
