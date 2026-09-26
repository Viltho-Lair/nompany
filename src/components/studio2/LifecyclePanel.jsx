"use client";

import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Field } from "@/components/fields/Field";
import { lifecycleDict } from "@/shared/studio/lifecycle";
import { useReload } from "@/components/studio2/useReload";
import { StatusPill } from "@/components/studio2/StatusPill";
import { panel, btn, btnGhost, th, Dialog, Empty, StatTile, microLabel, fmtDate, money } from "@/components/studio2/ui";

// LIFECYCLE & CONTRACTS — the employment, as against the person.
//
// EMPLOYEES DESCRIBES WHO SOMEBODY IS: their name, their department, their
// document. This describes their EMPLOYMENT: the contract they are on, the
// state it is in, and the day it ends. They were one screen and one right until
// the sub-sections landed (17/09/2026), which meant a studio could not let a
// line manager read a record without also letting them end the job.
//
// ONE PERSON AT A TIME, DELIBERATELY. The list answers "who needs me"; opening
// somebody answers "what is their employment". A grid that tried to do both
// would be a row of dates nobody can act on — which is what the roll already
// was before this existed.

const td = "py-3 pe-3 align-middle";

export default function LifecyclePanel({ slug, locale = "en" }) {
  const tr = lifecycleDict(locale);
  const [data, setData] = useState(null);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState("");
  const [dialog, setDialog] = useState(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/hr/lifecycle`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setProblem(tr.problem(body.error)); return; }
    setData(body);
    // `tr` IS STABLE — `lifecycleDict` returns one of two module-level objects,
    // so naming it here costs no extra reload and keeps the lint budget shrinking.
  }, [slug, tr]);
  useReload(load);

  const send = useCallback(async (path, method, payload) => {
    setProblem(""); setBusy(true);
    const res = await fetch(`/api/studios/${slug}/hr/lifecycle${path}`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setProblem(tr.problem(body.error)); return false; }
    await load();
    return true;
  }, [slug, load, tr]);

  if (problem && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{problem}</p>;
  if (!data) return <ScreenSkeleton />;

  const { people = [], contracts = [], events = [], attention = [], pack, vocabulary } = data;
  const open = people.find((p) => p.collaboratorId === openId) || null;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.title}</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tr.lead}</p>
      </div>

      {problem && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{problem}</p>
      )}
      {!data.canManage && (
        <div className="flex justify-end">
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-600 text-slate-500 dark:bg-white/5 dark:text-slate-400">{tr.viewOnly}</span>
        </div>
      )}

      <Counts people={people} tr={tr} />
      <Attention rows={attention} tr={tr} onOpen={setOpenId} />

      <section className={panel}>
        <p className={microLabel}>{tr.person}</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-start text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/5">
                <th className={th}>{tr.person}</th>
                <th className={th}>{tr.status}</th>
                <th className={th}>{tr.contract}</th>
                <th className={th}>{tr.since}</th>
              </tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.collaboratorId}
                  className="cursor-pointer border-b border-slate-50 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5"
                  onClick={() => setOpenId(p.collaboratorId)}>
                  <td className={td}>
                    <span className="font-600 text-slate-900 dark:text-white">{p.alias}</span>
                    {p.contract?.jobTitle && (
                      <span className="block text-xs text-slate-500 dark:text-slate-400">{p.contract.jobTitle}</span>
                    )}
                  </td>
                  <td className={td}><StatusPill kind="employment" status={p.status} /></td>
                  <td className={td}>
                    {p.contract
                      ? <span className="text-slate-600 dark:text-slate-300">{tr.contractTypeLabel(p.contract.type)}</span>
                      /* NOT A BLANK. Somebody with no contract has no probation,
                         no notice and nothing a settlement can read, and a blank
                         cell reads as a column nobody filled in. */
                      : <span className="text-amber-600 dark:text-amber-400">{tr.noContract}</span>}
                  </td>
                  <td className={`${td} num text-slate-600 dark:text-slate-300`}>{p.dateOfJoin ? fmtDate(p.dateOfJoin) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {people.length === 0 && <Empty title={tr.noHistory} />}
        </div>
      </section>

      {open && (
        <PersonPanel person={open} contracts={contracts} events={events} tr={tr} data={data}
          pack={pack} onClose={() => setOpenId("")} onAct={setDialog} />
      )}

      {dialog?.kind === "contract" && (
        <ContractDialog tr={tr} pack={pack} person={dialog.person} prior={dialog.prior} busy={busy}
          onClose={() => setDialog(null)}
          onSave={async (payload) => {
            if (await send("/contracts", "POST", payload)) setDialog(null);
          }} />
      )}
      {dialog?.kind === "move" && (
        <MoveDialog tr={tr} move={dialog.move} person={dialog.person} vocabulary={vocabulary}
          slug={slug} busy={busy} canSeePay={data.canSeePay}
          onClose={() => setDialog(null)}
          onSave={async (payload) => {
            if (await send("", "POST", { ...payload, move: dialog.move, collaboratorId: dialog.person.collaboratorId })) setDialog(null);
          }} />
      )}
    </div>
  );
}

// ---- the shape of the workforce ------------------------------------------------
// THREE COUNTS RATHER THAN SIX. Onboarding, probation and notice are the three
// states that are ABOUT to become something else — which is what an HR desk is
// for. Active is the rest and needs no tile; Exited is history.
function Counts({ people, tr }) {
  const n = (s) => people.filter((p) => p.status === s).length;
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatTile label={tr.countOnboarding} value={n("Onboarding")} />
      <StatTile label={tr.countProbation} value={n("Probation")}
        sub={n("Probation") > 0 ? tr.countHint : ""} />
      <StatTile label={tr.countNotice} value={n("Notice")}
        tone={n("Notice") > 0 ? "text-rose-600 dark:text-rose-400" : ""} />
    </div>
  );
}

// ---- what runs out ---------------------------------------------------------------
function Attention({ rows, tr, onOpen }) {
  if (!rows.length) {
    return (
      <section className={panel}>
        <p className={microLabel}>{tr.attention}</p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{tr.nothingDue}</p>
      </section>
    );
  }
  const label = { probation: tr.probationDue, contract: tr.contractDue, notice: tr.noticeDue };
  return (
    <section className="rounded-geex border border-amber-300/60 bg-amber-50 p-5 dark:border-amber-500/30 dark:bg-amber-500/10">
      <p className="font-display text-sm font-700 text-amber-800 dark:text-amber-200">{tr.attention}</p>
      <ul className="mt-2 space-y-1 text-sm text-amber-800 dark:text-amber-200">
        {rows.map((r) => (
          <li key={`${r.collaboratorId}-${r.kind}`}>
            <button type="button" className="text-start hover:underline" onClick={() => onOpen(r.collaboratorId)}>
              <span className="font-600">{r.alias}</span> — {label[r.kind]} {fmtDate(r.date)}
              {/* OVERDUE READS AS OVERDUE. A probation that ended last week is
                  the most urgent row here, not a stale one to grey out. */}
              <span className={r.daysLeft < 0 ? " font-700" : ""}>
                {" "}({r.daysLeft < 0 ? `+${Math.abs(r.daysLeft)}` : r.daysLeft}d)
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---- one person's employment -------------------------------------------------------
function PersonPanel({ person, contracts, events, tr, data, pack, onClose, onAct }) {
  const mine = useMemo(
    () => contracts.filter((c) => c.collaboratorId === person.collaboratorId)
      .sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [contracts, person.collaboratorId],
  );
  const history = useMemo(
    () => events.filter((e) => e.collaboratorId === person.collaboratorId),
    [events, person.collaboratorId],
  );
  const current = person.contract;

  return (
    <section className={panel}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-base font-700 text-slate-900 dark:text-white">{person.alias}</p>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <StatusPill kind="employment" status={person.status} />
            {person.probationEndsOn && <span>{tr.probationDue} {fmtDate(person.probationEndsOn)}</span>}
            {person.noticeEndsOn && <span>{tr.noticeDue} {fmtDate(person.noticeEndsOn)}</span>}
            {person.exitDate && <span>{tr.reasonLabel(person.exitReason)} — {fmtDate(person.exitDate)}</span>}
          </p>
        </div>
        <button type="button" className={btnGhost} onClick={onClose}>{tr.cancel}</button>
      </div>

      {/* THE MOVES THIS STATE ALLOWS, and no others — the same list the server
          computes from, so the screen never offers a button that would be
          refused. A reader who may not offboard is not shown notice or exit. */}
      {(data.canManage || data.canOffboard) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {person.moves
            .filter((m) => (m === "exit" || m === "giveNotice" ? data.canOffboard : data.canManage))
            .map((m) => (
              <button key={m} type="button"
                className={m === "exit" || m === "giveNotice" ? btnGhost : btn}
                onClick={() => onAct({ kind: "move", move: m, person })}>
                {tr.move(m)}
              </button>
            ))}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <p className={microLabel}>{tr.contract}</p>
          {current ? (
            <dl className="mt-3 space-y-2 text-sm">
              <Row label={tr.type} value={tr.contractTypeLabel(current.type)} />
              <Row label={tr.jobTitle} value={current.jobTitle || "—"} />
              <Row label={tr.startDate} value={fmtDate(current.startDate)} />
              {current.endDate && <Row label={tr.endDate} value={fmtDate(current.endDate)} />}
              <Row label={tr.probationMonths} value={current.probationMonths} />
              <Row label={tr.noticeDays} value={current.noticeDays} />
              {current.weeklyHours > 0 && <Row label={tr.weeklyHours} value={current.weeklyHours} />}
              {person.versions > 1 && (
                <Row label={tr.history} value={tr.versions(person.versions)} />
              )}
            </dl>
          ) : (
            <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">{tr.noContractHint}</p>
          )}

          {data.canCreate && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className={btn}
                onClick={() => onAct({ kind: "contract", person, prior: null })}>{tr.newContract}</button>
              {current && data.canManage && (
                <button type="button" className={btnGhost}
                  onClick={() => onAct({ kind: "contract", person, prior: current })}>{tr.amend}</button>
              )}
            </div>
          )}

          {mine.length > 1 && (
            <ul className="mt-4 space-y-1 text-xs text-slate-500 dark:text-slate-400">
              {mine.map((c) => (
                <li key={c.id} className={c.id === current?.id ? "font-600 text-slate-700 dark:text-slate-200" : ""}>
                  {fmtDate(c.startDate)} — {tr.contractTypeLabel(c.type)}
                  {c.note ? ` · ${c.note}` : ""}
                </li>
              ))}
            </ul>
          )}

          <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
            {pack.country ? tr.packSays(pack.country, pack.source) : tr.noPack}
          </p>
        </div>

        <div>
          <p className={microLabel}>{tr.history}</p>
          {history.length === 0
            ? <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{tr.noHistory}</p>
            : (
              <ol className="mt-3 space-y-3 border-s border-slate-100 ps-4 text-sm dark:border-white/10">
                {history.map((e) => (
                  <li key={e.id}>
                    <p className="font-600 text-slate-800 dark:text-slate-100">{tr.eventLabel(e.type)}</p>
                    <p className="num text-xs text-slate-500 dark:text-slate-400">{fmtDate(e.effectiveDate)}</p>
                    {e.note && <p className="text-xs text-slate-500 dark:text-slate-400">{e.note}</p>}
                    {/* THE SETTLEMENT AS IT WAS ON THE DAY, off the event rather
                        than recomputed: the wage and the leave balance have both
                        moved since, and "what were they actually paid" is what a
                        history is for. */}
                    {e.payload?.settlement && (
                      <p className="num text-xs text-slate-600 dark:text-slate-300">
                        {tr.total}: {money(e.payload.settlement.total, data.currency)}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
        </div>
      </div>
    </section>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="num text-end font-600 text-slate-900 dark:text-white">{value}</dd>
    </div>
  );
}

// ---- signing and amending ------------------------------------------------------------
function ContractDialog({ tr, pack, person, prior, busy, onClose, onSave }) {
  // AN AMENDMENT STARTS FROM THE VERSION IT REPLACES, because most amendments
  // change one term and re-typing the other five is where a wrong notice period
  // comes from.
  const [form, setForm] = useState(() => ({
    type: prior?.type || pack.contractTypes[0] || "",
    jobTitle: prior?.jobTitle || "",
    startDate: "",
    endDate: "",
    probationMonths: prior ? String(prior.probationMonths) : String(pack.probation.months),
    noticeDays: prior ? String(prior.noticeDays) : String(pack.notice.days),
    weeklyHours: prior ? String(prior.weeklyHours || "") : "",
    note: "",
  }));
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const fixed = form.type === "Fixed term" || form.type === "Internship" || form.type === "Secondment";

  return (
    <Dialog title={prior ? tr.amend : tr.newContract} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {person.alias}{prior ? ` — ${tr.amending}` : ""}
        </p>
        <Field label={tr.type} as="select" value={form.type} onChange={(v) => set("type", v)}
          options={pack.contractTypes.map((t) => ({ value: t, label: tr.contractTypeLabel(t) }))} />
        <Field label={tr.jobTitle} value={form.jobTitle} onChange={(v) => set("jobTitle", v)} />
        <Field label={tr.startDate} type="date" required value={form.startDate} onChange={(v) => set("startDate", v)} />
        {/* OFFERED ONLY WHERE IT BELONGS. An end date on an open contract is a
            leaving date in the wrong field, and the server refuses it — so the
            screen does not ask for one. */}
        {fixed && <Field label={tr.endDate} type="date" required value={form.endDate} onChange={(v) => set("endDate", v)} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={tr.probationMonths} type="number" min={0} max={pack.probation.maxMonths}
            value={form.probationMonths} onChange={(v) => set("probationMonths", v)} />
          <Field label={tr.noticeDays} type="number" min={0}
            max={pack.notice.maxDays > 0 ? pack.notice.maxDays : undefined}
            value={form.noticeDays} onChange={(v) => set("noticeDays", v)} />
        </div>
        <Field label={tr.weeklyHours} type="number" min={0} value={form.weeklyHours} onChange={(v) => set("weeklyHours", v)} />
        <Field label={tr.note} as="textarea" value={form.note} onChange={(v) => set("note", v)} />
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {pack.country ? tr.packDefaults(pack.probation.months, pack.notice.days) : tr.noPack}
        </p>
        <div className="flex justify-end gap-2">
          <button type="button" className={btnGhost} onClick={onClose}>{tr.cancel}</button>
          <button type="button" className={btn} disabled={busy || !form.startDate}
            onClick={() => onSave({
              ...form,
              collaboratorId: person.collaboratorId,
              endDate: fixed ? form.endDate : "",
              supersedesId: prior?.id || "",
            })}>
            {busy ? tr.saving : tr.save}
          </button>
        </div>
      </div>
    </Dialog>
  );
}

// ---- a move ----------------------------------------------------------------------------
function MoveDialog({ tr, move, person, vocabulary, slug, busy, canSeePay, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    effectiveDate: new Date().toISOString().slice(0, 10),
    reason: "Resignation",
    note: "",
    deductions: "",
    lastWorkingDay: "",
  }));
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const leaving = move === "exit" || move === "giveNotice";

  return (
    <Dialog title={`${tr.move(move)} — ${person.alias}`} onClose={onClose}>
      <div className="space-y-4">
        {tr.moveLead(move) && <p className="text-sm text-slate-500 dark:text-slate-400">{tr.moveLead(move)}</p>}
        <Field label={move === "exit" ? tr.lastWorkingDay : tr.effectiveDate} type="date" required
          value={form.effectiveDate} onChange={(v) => set("effectiveDate", v)} />
        {leaving && (
          <Field label={tr.reason} as="select" value={form.reason} onChange={(v) => set("reason", v)}
            options={vocabulary.exitReasons.map((r) => ({ value: r, label: tr.reasonLabel(r) }))} />
        )}
        {move === "giveNotice" && (
          <Field label={tr.lastWorkingDay} type="date" value={form.lastWorkingDay}
            onChange={(v) => set("lastWorkingDay", v)}
            hint={tr.moveLead("giveNotice")} />
        )}
        {move === "exit" && (
          <>
            <Field label={tr.deductions} type="number" min={0} value={form.deductions}
              onChange={(v) => set("deductions", v)} disabled={!canSeePay} />
            {canSeePay
              ? <SettlementPreview slug={slug} tr={tr}
                  collaboratorId={person.collaboratorId} lastWorkingDay={form.effectiveDate}
                  reason={form.reason} deductions={form.deductions} />
              : <p className="text-sm text-slate-500 dark:text-slate-400">{tr.payHidden}</p>}
          </>
        )}
        <Field label={tr.note} as="textarea" value={form.note} onChange={(v) => set("note", v)} />
        <div className="flex justify-end gap-2">
          <button type="button" className={btnGhost} onClick={onClose}>{tr.cancel}</button>
          <button type="button" className={btn} disabled={busy || !form.effectiveDate}
            onClick={() => onSave(form)}>{busy ? tr.saving : tr.save}</button>
        </div>
      </div>
    </Dialog>
  );
}

// ---- what they are owed --------------------------------------------------------------------
// ASKED AGAIN ON EVERY CHANGE OF THE DATE, because the award, the encashment and
// the notice shortfall all move with it — and the person recording an exit is
// usually negotiating that date. The server writes nothing; the stored copy is
// the snapshot the exit itself takes.
function SettlementPreview({ slug, tr, collaboratorId, lastWorkingDay, reason, deductions }) {
  const [state, setState] = useState(null);
  const [failed, setFailed] = useState("");

  useEffect(() => {
    let live = true;
    const qs = new URLSearchParams({ collaboratorId, lastWorkingDay, reason, deductions: String(deductions || "") });
    fetch(`/api/studios/${slug}/hr/lifecycle/settlement?${qs}`, { cache: "no-store" })
      .then((r) => r.json().then((b) => ({ ok: r.ok, b })))
      .then(({ ok, b }) => {
        if (!live) return;
        if (!ok) { setFailed(tr.problem(b.error)); return; }
        setFailed(""); setState(b);
      })
      .catch(() => { if (live) setFailed(tr.problem("")); });
    return () => { live = false; };
  }, [slug, collaboratorId, lastWorkingDay, reason, deductions, tr]);

  if (failed) return <p className="text-sm text-rose-600 dark:text-rose-300">{failed}</p>;
  if (!state) return <p className="text-sm text-slate-500 dark:text-slate-400">…</p>;

  const s = state.settlement;
  const amount = (n) => money(n, state.currency);
  return (
    <section className="rounded-geex border border-slate-200 p-4 dark:border-white/10">
      <p className={microLabel}>{tr.settlement}</p>
      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{tr.settlementLead}</p>
      <dl className="mt-3 space-y-2 text-sm">
        <Row label={tr.service} value={tr.years(s.years)} />
        <Row label={tr.dailyWage} value={amount(s.dailyWage)} />
        {/* NULL IS A SENTENCE, NOT A DASH. "This studio has no end-of-service
            rule" and "they are owed nothing" are different facts, and only one
            of them is a figure. */}
        <Row label={tr.endOfService}
          value={s.endOfService ? amount(s.endOfService.amount) : tr.noEosRule} />
        <Row label={tr.encashment}
          value={s.encashment === null
            ? tr.unknownBalance
            : `${amount(s.encashment)} · ${tr.leaveDays(s.unusedLeaveDays)}`} />
        {s.noticeShortfallDays > 0 && (
          <Row label={`${tr.noticeInLieu} · ${tr.leaveDays(s.noticeShortfallDays)}`}
            /* THE DIRECTION IS THE REASON'S, not the sign of the amount: at a
               wage of nought the two part company and the sign says the
               opposite of the truth. */
            value={`${amount(Math.abs(s.noticeInLieu))} ${s.noticeOwedBy === "employee" ? tr.owedByThem : tr.owedToThem}`} />
        )}
        {s.deductions > 0 && <Row label={tr.deductions} value={`−${amount(s.deductions)}`} />}
        <div className="border-t border-slate-100 pt-2 dark:border-white/10">
          <Row label={tr.total} value={amount(s.total)} />
        </div>
      </dl>
      {!s.complete && (
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{tr.incomplete}</p>
      )}
    </section>
  );
}
