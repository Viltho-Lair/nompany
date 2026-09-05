// THE TENDER REGISTER — Tendering & Estimating's first screen.
//
// The section has existed since the fifteen-section restructure and rendered
// nothing: it sat in NO_SCREEN_YET and held no right, because a right nothing
// can exercise is a bug. This is what it was waiting for.
//
// SORTED BY DEADLINE, NOT BY ENTRY DATE, and that is the whole design. A tender
// is a date with work attached; a register ordered by when somebody typed it in
// answers no question anybody has. Undated ones sink to the bottom — a tender
// with no closing date is not urgent, it is incomplete.
//
// THE REFUSALS ARE THE SAME FUNCTION THE SERVICE USES. `tenderProblem` comes
// from modules/tendering/stages, which has no server import for exactly this
// reason: the move this screen offers and the move the route accepts are one
// decision, so they cannot drift apart.
"use client";
import { useCallback, useEffect, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { tenderingDict } from "@/shared/studio/tendering";
import { statusLabel } from "@/shared/studio/statuses";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { panel, h2, sub, btn, btnGhost, microLabel, Empty, Dialog, StatTile, money, fmtDate } from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";
import { StatusPill } from "@/components/studio2/StatusPill";
import {
  TENDER_STAGES, LIVE_TENDER_STAGES, DECIDED_TENDER_STAGES,
  tenderStage, tenderProblem, isDecided, isSubmitted, isWonTender,
  daysToDeadline, isAtRisk,
} from "@/modules/tendering/stages";

// A tender closing within this many days is worth pulling to the top of the
// eye's attention. Named because it is a judgement about bidding, not a
// rendering detail.
const CLOSING_SOON_DAYS = 7;

function refusal(tr, token) {
  if (token === "already-decided") return tr.refuseAlreadyDecided;
  if (token === "not-submitted") return tr.refuseNotSubmitted;
  if (token === "already-submitted") return tr.refuseAlreadySubmitted;
  if (token === "reason-required") return tr.refuseReasonRequired;
  return token;
}

// How long is left, in words, with the tone the number deserves. A missed
// deadline is not "overdue" — it is gone, and the register's job is to make
// that impossible to overlook after the fact.
function Deadline({ tr, tender, nowMs }) {
  const days = daysToDeadline(tender.submissionDeadline, nowMs);
  if (days === null) return <span className="text-xs text-slate-400">{tr.noDeadline}</span>;

  const settled = isDecided(tender.status) || isSubmitted(tender.status);
  const missed = isAtRisk(tender.status, tender.submissionDeadline, nowMs);
  const tone = missed ? "font-600 text-rose-600 dark:text-rose-300"
    : !settled && days <= CLOSING_SOON_DAYS ? "font-600 text-amber-700 dark:text-amber-300"
      : "text-slate-500 dark:text-slate-400";

  const words = days < 0 ? (settled ? tr.overdueBy(Math.abs(days)) : tr.missed)
    : days === 0 ? (settled ? tr.dueToday : tr.missed)
      : tr.daysLeft(days);

  return (
    <span className={`text-xs ${tone}`}>
      {words} · {fmtDate(tender.submissionDeadline)}
    </span>
  );
}

export default function StudioTenders({ slug }) {
  const locale = useStudioLocale();
  const tr = tenderingDict(locale);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(null);
  const [move, setMove] = useState(null);
  const [reason, setReason] = useState("");

  const read = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/tendering/tenders`, { cache: "no-store" });
    return { ok: res.ok, body: await res.json().catch(() => ({})) };
  }, [slug]);

  const apply = useCallback(({ ok, body }) => {
    if (!ok) { setError(body.error || "failed"); return; }
    setError("");
    setData(body);
  }, []);

  useEffect(() => {
    let current = true;
    (async () => {
      const answer = await read();
      if (current) apply(answer);
    })();
    return () => { current = false; };
  }, [read, apply]);

  const reload = useCallback(async () => { apply(await read()); }, [read, apply]);
  useLiveUpdates(slug, reload);

  const send = useCallback(async (method, payload) => {
    setError(""); setBusy(true);
    const res = await fetch(`/api/studios/${slug}/tendering/tenders`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(out.error === "already-submitted" && method === "DELETE"
        ? tr.refuseDeleteSubmitted
        : refusal(tr, out.error || "failed"));
      return false;
    }
    await reload();
    return true;
  }, [slug, reload, tr]);

  // Where a tender may go: everything the service would not refuse on
  // structure. A placeholder reason is passed so `reason-required` does not
  // hide the very stages that ask for one — the dialog collects it.
  const targetsFor = useCallback((t) => TENDER_STAGES.filter((to) => (
    to !== t.status && !tenderProblem({ from: t.status, to, reason: "-" })
  )), []);

  const onPick = useCallback((tender, to) => {
    if (!to || to === tender.status) return;
    if (tenderStage(to)?.needsReason) { setReason(""); setMove({ tender, to }); return; }
    send("PUT", { id: tender.id, status: to });
  }, [send]);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <ScreenSkeleton loadingLabel={tr.loadingTenders} />;

  // THE CLOCK COMES WITH THE ANSWER. The screen never reads its own: the server
  // is the side that decides whether a tender is at risk, and one instant for
  // the whole list is what stops two rows a day apart reading the same.
  const nowMs = Date.parse(data.asOf) || 0;
  const tenders = data.tenders || [];
  const live = tenders.filter((t) => !isDecided(t.status));
  const decided = tenders.filter((t) => isDecided(t.status));
  const won = decided.filter((t) => isWonTender(t.status));
  const submitted = tenders.filter((t) => t.submittedAt).length;
  const closingSoon = live.filter((t) => {
    const d = daysToDeadline(t.submissionDeadline, nowMs);
    return d !== null && d >= 0 && d <= CLOSING_SOON_DAYS && !isSubmitted(t.status);
  }).length;

  // WON OVER DECIDED, and only over tenders that were actually bid. A No Bid is
  // a decision the studio made, not a contest it lost, so counting it in the
  // denominator would punish the register for being honest about what it
  // declined — and that is the entry it most wants recorded.
  const contested = decided.filter((t) => t.submittedAt);
  const winRate = contested.length ? Math.round((won.length / contested.length) * 100) : null;

  const openForm = (row) => setForm(row ? { ...row } : {
    title: "", issuer: "", clientId: "", source: "",
    issueDate: "", submissionDeadline: "", estimatedValue: "", notes: "",
  });

  const saveForm = async () => {
    const payload = {
      title: form.title, issuer: form.issuer, clientId: form.clientId, source: form.source,
      issueDate: form.issueDate, submissionDeadline: form.submissionDeadline,
      estimatedValue: Number(form.estimatedValue) || 0, notes: form.notes,
    };
    const okDone = form.id
      ? await send("PUT", { ...payload, id: form.id })
      : await send("POST", payload);
    if (okDone) setForm(null);
  };

  const Row = ({ t }) => (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="min-w-0">
          <span className="font-mono text-xs text-slate-400">{t.ref}</span>
          <span className="ms-2 font-600 text-slate-900 dark:text-white">{t.title}</span>
          <span className="ms-2"><StatusPill kind="tenderStage" status={t.status} /></span>
          {t.issuer && <span className="ms-2 text-xs text-slate-500 dark:text-slate-400">{t.issuer}</span>}
        </div>
        <div className="text-end">
          {t.estimatedValue > 0 && (
            <p className="num font-600 text-slate-900 dark:text-white">{money(t.estimatedValue)} {t.currency}</p>
          )}
          <Deadline tr={tr} tender={t} nowMs={nowMs} />
        </div>
      </div>
      {t.decisionReason && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {tr.decisionReason}: {t.decisionReason}
        </p>
      )}
      {(data.canEdit || data.canDelete) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {data.canEdit && targetsFor(t).length > 0 && (
            <label className="min-w-[12rem]">
              <span className="sr-only">{tr.moveTo}</span>
              <Field label={tr.moveTo} as="select" value="" disabled={busy}
                onChange={(to) => onPick(t, to)}
                options={targetsFor(t).map((to) => ({ value: to, label: statusLabel("tenderStage", to, locale) }))} />
            </label>
          )}
          {data.canEdit && <button type="button" className={btnGhost} onClick={() => openForm(t)}>{tr.edit}</button>}
          {/* DELETE IS OFFERED ONLY BEFORE THE BID GOES IN. The service refuses
              it afterwards whatever the screen shows, and hiding the button is
              how somebody learns the rule without meeting a refusal. */}
          {data.canDelete && !t.submittedAt && (
            <button type="button" className={btnGhost} disabled={busy}
              onClick={() => { if (confirm(tr.confirmDelete(t.title))) send("DELETE", { id: t.id }); }}>
              {tr.deleteTender}
            </button>
          )}
        </div>
      )}
    </li>
  );

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className={h2}>{tr.tenders}</h2>
          <p className={sub}>{tr.tendersSub}</p>
        </div>
        {data.canCreate && <button type="button" className={btn} onClick={() => openForm(null)}>{tr.addTender}</button>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className={panel}><StatTile label={tr.tenders} value={<span className="num">{live.length}</span>} sub={tr.nOpenTenders(live.length)} /></div>
        <div className={panel}>
          <StatTile label={tr.closingSoon} value={<span className="num">{closingSoon}</span>}
            tone={closingSoon > 0 ? "text-amber-700 dark:text-amber-300" : ""} accent="rgb(var(--chart-2))" />
        </div>
        <div className={panel}><StatTile label={tr.submittedCount} value={<span className="num">{submitted}</span>} accent="rgb(var(--chart-3))" /></div>
        <div className={panel}>
          {/* A studio that has bid nothing has no win rate, and 0% would be a
              verdict on it rather than an absence of one. */}
          <StatTile label={tr.winRate} value={winRate == null ? "—" : `${winRate}%`}
            sub={tr.nDecided(contested.length)} accent="rgb(var(--chart-4))" />
        </div>
      </div>

      {tenders.length === 0 ? <Empty title={tr.noTendersYet} body={tr.noTendersBody} /> : (
        <>
          <section className={panel}>
            <p className={microLabel}>{LIVE_TENDER_STAGES.map((s) => statusLabel("tenderStage", s, locale)).join(" · ")}</p>
            {live.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{tr.noTendersBody}</p>
            ) : (
              <ul className="mt-4 divide-y divide-slate-100 dark:divide-white/5">
                {live.map((t) => <Row key={t.id} t={t} />)}
              </ul>
            )}
          </section>

          {decided.length > 0 && (
            <section className={panel}>
              <p className={microLabel}>{DECIDED_TENDER_STAGES.map((s) => statusLabel("tenderStage", s, locale)).join(" · ")}</p>
              <ul className="mt-4 divide-y divide-slate-100 dark:divide-white/5">
                {decided.map((t) => <Row key={t.id} t={t} />)}
              </ul>
            </section>
          )}
        </>
      )}

      {form && (
        <Dialog title={form.id ? tr.editTender : tr.addTender} onClose={() => setForm(null)} width="max-w-[640px]">
          <div className="space-y-4">
            <Field label={tr.tenderTitle} required value={form.title || ""}
              onChange={(v) => setForm((f) => ({ ...f, title: v }))} inputProps={{ maxLength: 200 }} />
            <Field label={tr.issuer} value={form.issuer || ""} hint={tr.issuerHint}
              onChange={(v) => setForm((f) => ({ ...f, issuer: v }))} inputProps={{ maxLength: 160 }} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={tr.deadline} type="date" required value={form.submissionDeadline || ""}
                onChange={(v) => setForm((f) => ({ ...f, submissionDeadline: v }))} />
              <Field label={tr.issueDate} type="date" value={form.issueDate || ""}
                onChange={(v) => setForm((f) => ({ ...f, issueDate: v }))} />
              <Field label={tr.estimatedValue} type="number" value={form.estimatedValue ?? ""}
                onChange={(v) => setForm((f) => ({ ...f, estimatedValue: v }))} inputProps={{ min: "0", step: "0.01" }} />
              <Field label={tr.source} value={form.source || ""}
                onChange={(v) => setForm((f) => ({ ...f, source: v }))} inputProps={{ maxLength: 120 }} />
            </div>
            <Field label={tr.notes} as="textarea" value={form.notes || ""}
              onChange={(v) => setForm((f) => ({ ...f, notes: v }))} inputProps={{ maxLength: 4000 }} />
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setForm(null)}>{tr.cancel}</button>
              <button type="button" className={btn} disabled={busy || !form.title?.trim() || !form.submissionDeadline}
                onClick={saveForm}>{tr.save}</button>
            </div>
          </div>
        </Dialog>
      )}

      {move && (
        <Dialog title={tr.whyDecision} description={tr.whyDecisionHint} onClose={() => setMove(null)} width="max-w-[520px]">
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {move.tender.ref} · {move.tender.title} → <StatusPill kind="tenderStage" status={move.to} />
            </p>
            <Field label={tr.decisionReason} required value={reason} onChange={setReason}
              inputProps={{ maxLength: 400, autoFocus: true }} />
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setMove(null)}>{tr.cancel}</button>
              <button type="button" className={btn} disabled={busy || !reason.trim()}
                onClick={async () => {
                  const okDone = await send("PUT", { id: move.tender.id, status: move.to, decisionReason: reason });
                  if (okDone) { setMove(null); setReason(""); }
                }}>{tr.save}</button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
