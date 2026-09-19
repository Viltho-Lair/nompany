"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useStudioLocale } from "@/components/studio2/locale";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { useReload } from "@/components/studio2/useReload";
import { StatusPill } from "@/components/studio2/StatusPill";
import { Icon } from "@/components/studio2/icons";
import {
  panel, h2, sub, input, label, btn, btnGhost, btnRow, btnRowPrimary, btnRowDanger, Empty, fmtDateTime, money,
} from "@/components/studio2/ui";
import { approvalsDict } from "@/shared/studio/approvals";

const alert = "rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300";

// APPROVALS — the owner, 19/09/2026. Everybody opens it and sees two things:
// what is waiting on them, and how far their own requests have got. Whoever may
// see every approval gets a third list. Nothing here is typed in by hand — an
// approval exists because a record asked for one — so there is no "new" button.
//
// `view` is the active sub-section: the list is the parent, Approval settings
// its one child.
export default function StudioApprovals({ slug, view = "approvals" }) {
  if (view === "approvals-settings") return <ApprovalSettings slug={slug} />;
  return <ApprovalList slug={slug} />;
}

function ApprovalList({ slug }) {
  const tr = approvalsDict(useStudioLocale());
  const [data, setData] = useState(null);
  const [tab, setTab] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/approvals`, { cache: "no-store" });
    if (!res.ok) { setError(tr.cannotLoad); return; }
    setData(await res.json());
  }, [slug, tr]);
  useReload(load);
  // Somebody answered, or asked — pick it up without a refresh.
  useLiveUpdates(slug, "approvals", load);

  // `body` is an answer ({ verdict, note }) or a retry ({ action: "finish" }).
  const answer = useCallback(async (id, body) => {
    setError("");
    const res = await fetch(`/api/studios/${slug}/approvals`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) { setError(tr.error(out.error)); await load(); return false; }
    await load();
    return true;
  }, [slug, load, tr]);

  if (error && !data) return <p className={alert}>{error}</p>;
  if (!data) return <ScreenSkeleton loadingLabel={tr.loading} />;

  const tabs = [
    ["waiting", tr.waiting(data.waiting.length), data.waiting, tr.emptyWaiting],
    ["requested", tr.requested(data.requested.length), data.requested, tr.emptyRequested],
    ...(data.all ? [["all", tr.all(data.all.length), data.all, tr.emptyAll]] : []),
  ];
  // What is waiting on you leads, when anything is; otherwise your own requests.
  const active = tab || (data.waiting.length ? "waiting" : "requested");
  const [, , rows, emptyText] = tabs.find(([key]) => key === active) || tabs[0];

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500 dark:text-slate-400">{tr.lead}</p>

      <div role="tablist" className="flex flex-wrap gap-2">
        {tabs.map(([key, text]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active === key}
            onClick={() => setTab(key)}
            className={`${active === key ? btnRowPrimary : btnRow} text-sm`}
          >
            {text}
          </button>
        ))}
      </div>

      {error && <p className={alert}>{error}</p>}

      {rows.length === 0
        ? <Empty title={emptyText} />
        : <ul className="space-y-4">{rows.map((a) => <li key={a.id}><ApprovalCard slug={slug} approval={a} tr={tr} onAnswer={answer} /></li>)}</ul>}
    </div>
  );
}

function ApprovalCard({ slug, approval: a, tr, onAnswer }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const act = async (verdict, note = "") => {
    setBusy(true);
    const done = await onAnswer(a.id, { verdict, note });
    setBusy(false);
    if (done) { setRejecting(false); setReason(""); }
  };

  // The reference leads, unless the title already says it — items carried over
  // from the old board were titled "Approve quotation Q-0042 · …", and printing
  // Q-0042 twice says nothing twice.
  const ref = a.source?.ref || "";
  const title = a.source?.title || "";
  const heading = ref && !title.includes(ref) ? (title ? `${ref} · ${title}` : ref) : title;

  return (
    <article className={panel}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400">{tr.typeLabel(a.type)}</p>
          <h2 className={`${h2} truncate`}>{heading || tr.typeLabel(a.type)}</h2>
          <p className={sub}>{tr.requestedBy(a.requestedByAlias || tr.someone, fmtDateTime(a.requestedAt))}</p>
        </div>
        <StatusPill kind="approval" status={a.status} />
      </div>

      {a.type === "carried" && <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{tr.carried}</p>}
      {a.source?.sectionKey && a.source?.recordId && (
        <Link href={`/${slug}/${a.source.path || a.source.sectionKey}`} className="mt-3 inline-flex items-center gap-1 text-sm font-600 text-brand-700 hover:underline dark:text-brand-400">
          {tr.openRecord}
        </Link>
      )}
      {a.amount && (
        <p className="mt-3 text-sm">
          <span className={label}>{tr.amount}</span>
          <span className="num font-600 text-[var(--geex-ink)]">{money(a.amount.value, a.amount.currency)} {a.amount.currency}</span>
        </p>
      )}
      {a.finish?.error && (
        <div className={`${alert} mt-3 flex flex-wrap items-center justify-between gap-2`}>
          <span>{tr.finishFailed(a.finish.error)}</span>
          <button type="button" disabled={busy} className={`${btnRow} text-sm`}
            onClick={async () => { setBusy(true); await onAnswer(a.id, { action: "finish" }); setBusy(false); }}>{tr.retry}</button>
        </div>
      )}
      {a.note && (
        <div className="mt-3">
          <p className={label}>{tr.note}</p>
          <p className="whitespace-pre-line text-sm text-[var(--geex-ink)]">{a.note}</p>
        </div>
      )}
      {a.attachment?.url && (
        <p className="mt-3 text-sm">
          <span className={label}>{tr.attachment}</span>
          <a href={a.attachment.url} target="_blank" rel="noreferrer" className="font-600 text-brand-700 hover:underline dark:text-brand-400">
            {a.attachment.name || a.attachment.url}
          </a>
        </p>
      )}

      <ol className="mt-5 space-y-3">
        {a.steps.map((s, i) => (
          <li key={s.id} className="rounded-xl border border-slate-200/70 p-4 dark:border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-700 text-[var(--geex-ink)]">
                {tr.step(i + 1)}{s.label ? ` · ${s.label}` : ""}
                <span className="ms-2 text-xs font-500 text-slate-500 dark:text-slate-400">{s.requireAll ? tr.requireAll : tr.anyOne}</span>
              </p>
              <StatusPill kind="approvalStep" status={s.state} label={tr.stepState(s.state)} />
            </div>
            <ul className="mt-3 space-y-1.5">
              {s.people.map((p) => (
                <li key={p.collaboratorId} className="flex flex-wrap items-center gap-2 text-sm">
                  <Icon
                    name={p.verdict === "Approved" ? "check" : p.verdict === "Rejected" ? "x" : "clock"}
                    className={`h-4 w-4 ${p.verdict === "Approved" ? "text-emerald-600 dark:text-emerald-400" : p.verdict === "Rejected" ? "text-rose-600 dark:text-rose-400" : "text-slate-400"}`}
                  />
                  <span className="font-600 text-[var(--geex-ink)]">{p.alias || tr.someone}</span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {p.verdict ? `${tr.stepState(p.verdict)} ${tr.answeredOn(fmtDateTime(p.at))}` : tr.notYet}
                  </span>
                  {p.note && <span className="w-full ps-6 text-slate-600 dark:text-slate-300">“{p.note}”</span>}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>

      {a.canAnswer && !rejecting && (
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={() => act("Approved")} className={`${btnRowPrimary} text-sm`}>{tr.approve}</button>
          <button type="button" disabled={busy} onClick={() => setRejecting(true)} className={`${btnRowDanger} text-sm`}>{tr.reject}</button>
        </div>
      )}
      {a.canAnswer && rejecting && (
        <div className="mt-5 space-y-2">
          <label className={label} htmlFor={`reason-${a.id}`}>{tr.reasonLabel}</label>
          <textarea id={`reason-${a.id}`} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className={input} />
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy || !reason.trim()} onClick={() => act("Rejected", reason)} className={`${btnRowDanger} text-sm`}>{tr.confirmReject}</button>
            <button type="button" disabled={busy} onClick={() => { setRejecting(false); setReason(""); }} className={`${btnRow} text-sm`}>{tr.cancel}</button>
          </div>
        </div>
      )}
    </article>
  );
}

// APPROVAL SETTINGS — who answers each type, step by step. The owner and Admins,
// and whoever they give `approvals.settings` to in Access.
function ApprovalSettings({ slug }) {
  const tr = approvalsDict(useStudioLocale());
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/approvals/settings`, { cache: "no-store" });
    if (res.status === 403) { setError(tr.noSettingsAccess); return; }
    if (!res.ok) { setError(tr.cannotLoad); return; }
    setData(await res.json());
  }, [slug, tr]);
  useReload(load);

  if (error && !data) return <p className={alert}>{error}</p>;
  if (!data) return <ScreenSkeleton loadingLabel={tr.loading} />;

  const nameOf = Object.fromEntries(data.people.map((p) => [p.id, p.alias || tr.someone]));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{tr.settingsLead}</p>
        {!data.canEdit && <p className={`${sub} font-600`}>{tr.readOnly}</p>}
      </div>

      <ul className="space-y-4">
        {data.types.map((t) => (
          <li key={t.key} className={panel}>
            {editing === t.key ? (
              <StepEditor
                slug={slug}
                type={t}
                people={data.people}
                tr={tr}
                onDone={async () => { setEditing(null); await load(); }}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h2 className={h2}>{tr.typeLabel(t.key)}</h2>
                  {data.canEdit && <button type="button" onClick={() => setEditing(t.key)} className={`${btnRow} text-sm`}>{tr.edit}</button>}
                </div>
                {t.isDefault && t.steps.length > 0 && <p className={`${sub} text-amber-700 dark:text-amber-300`}>{tr.defaultSteps}</p>}
                {t.steps.length === 0
                  ? <p className={`${sub} text-amber-700 dark:text-amber-300`}>{tr.notConfigured}</p>
                  : (
                    <ol className="mt-3 space-y-1.5 text-sm">
                      {t.steps.map((s, i) => (
                        <li key={s.id} className="text-[var(--geex-ink)]">
                          <span className="font-700">{tr.step(i + 1)}{s.label ? ` · ${s.label}` : ""}</span>
                          {t.amounted && s.from > 0 && <span className="num text-slate-500 dark:text-slate-400"> · {tr.fromAt(money(s.from))}</span>}
                          <span className="text-slate-500 dark:text-slate-400"> — {s.approverIds.map((id) => nameOf[id] || tr.someone).join(", ")} ({s.requireAll ? tr.requireAll : tr.anyOne})</span>
                        </li>
                      ))}
                    </ol>
                  )}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

let draftSeq = 0;
const blankStep = () => ({ id: `new${++draftSeq}`, label: "", approverIds: [], requireAll: false });

function StepEditor({ slug, type, people, tr, onDone, onCancel }) {
  const [steps, setSteps] = useState(() => (type.steps.length ? type.steps.map((s) => ({ ...s, approverIds: [...s.approverIds] })) : [blankStep()]));
  const [problems, setProblems] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const change = (i, patch) => setSteps((all) => all.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const toggle = (i, id) => setSteps((all) => all.map((s, j) => (j !== i ? s : {
    ...s, approverIds: s.approverIds.includes(id) ? s.approverIds.filter((x) => x !== id) : [...s.approverIds, id],
  })));
  const move = (i, by) => setSteps((all) => {
    const next = [...all];
    const [row] = next.splice(i, 1);
    next.splice(i + by, 0, row);
    return next;
  });

  const save = async () => {
    setBusy(true); setProblems([]); setError("");
    const res = await fetch(`/api/studios/${slug}/approvals/settings`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: type.key, setting: { steps } }),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      if (Array.isArray(out.problems)) setProblems(out.problems);
      else setError(tr.error(out.error));
      return;
    }
    await onDone();
  };

  return (
    <div className="space-y-4">
      <h2 className={h2}>{tr.typeLabel(type.key)}</h2>
      {problems.length > 0 && (
        <ul className={`${alert} list-disc ps-8`}>
          {problems.map((p, i) => <li key={i}>{tr.problem(p.problem, p.step)}</li>)}
        </ul>
      )}
      {error && <p className={alert}>{error}</p>}

      <ol className="space-y-3">
        {steps.map((s, i) => (
          <li key={s.id} className="rounded-xl border border-slate-200/70 p-4 dark:border-white/10">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[12rem] flex-1">
                <label className={label} htmlFor={`step-${type.key}-${s.id}`}>{tr.step(i + 1)} · {tr.stepName}</label>
                <input
                  id={`step-${type.key}-${s.id}`}
                  value={s.label}
                  maxLength={80}
                  placeholder={tr.stepNamePlaceholder}
                  onChange={(e) => change(i, { label: e.target.value })}
                  className={input}
                />
              </div>
              <div className="flex gap-1.5">
                <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className={`${btnRow} text-xs`}>{tr.moveUp}</button>
                <button type="button" disabled={i === steps.length - 1} onClick={() => move(i, 1)} className={`${btnRow} text-xs`}>{tr.moveDown}</button>
                <button type="button" disabled={steps.length === 1} onClick={() => setSteps((all) => all.filter((_, j) => j !== i))} className={`${btnRowDanger} text-xs`}>{tr.removeStep}</button>
              </div>
            </div>

            <fieldset className="mt-3">
              <legend className={label}>{tr.approvers}</legend>
              {people.length === 0
                ? <p className={sub}>{tr.nobodyToName}</p>
                : (
                  <div className="grid max-h-56 gap-1 overflow-y-auto sm:grid-cols-2">
                    {people.map((p) => (
                      <label key={p.id} className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-[var(--geex-ink)] hover:bg-slate-50 dark:hover:bg-white/5">
                        <input type="checkbox" checked={s.approverIds.includes(p.id)} onChange={() => toggle(i, p.id)} />
                        {p.alias || tr.someone}
                      </label>
                    ))}
                  </div>
                )}
            </fieldset>

            <label className="mt-3 flex items-center gap-2 text-sm text-[var(--geex-ink)]">
              <input type="checkbox" checked={s.requireAll} onChange={(e) => change(i, { requireAll: e.target.checked })} />
              {tr.requireAllBox}
            </label>

            {/* A LIMIT, only where the type carries an amount: "a bill has step 1
                for everyone and step 2 from 50,000" (the owner, 19/09/2026). */}
            {type.amounted && (
              <div className="mt-3 max-w-xs">
                <label className={label} htmlFor={`from-${type.key}-${s.id}`}>{tr.fromLabel}</label>
                <input
                  id={`from-${type.key}-${s.id}`}
                  inputMode="decimal"
                  value={s.from ?? ""}
                  onChange={(e) => change(i, { from: e.target.value === "" ? undefined : e.target.value })}
                  className={`${input} num`}
                />
                <p className={`${sub} text-xs`}>{tr.fromHint}</p>
              </div>
            )}
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setSteps((all) => [...all, blankStep()])} className={btnGhost}>{tr.addStep}</button>
        <span className="flex-1" />
        <button type="button" disabled={busy} onClick={onCancel} className={btnGhost}>{tr.cancel}</button>
        <button type="button" disabled={busy} onClick={save} className={btn}>{tr.save}</button>
      </div>
    </div>
  );
}
