"use client";

import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import { useCallback, useEffect, useState } from "react";
import { Field } from "@/components/fields/Field";
import { useReload } from "@/components/studio2/useReload";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { moneyText } from "@/shared/money";
import { fmtDate } from "@/lib/format";
import { claimsDict } from "@/shared/studio/claims";

// PAYABLES → CLAIMS (modules/finance/claims): expense claims and staff
// advances. What each person may do is decided by the server and handed back
// as flags; the screen only draws the buttons those flags allow, and the
// server refuses anything else anyway.
const th = "py-2 text-start text-[12px] font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500";
const ghost = "rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 dark:border-white/15 dark:text-slate-300";
const primary = "rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-600 text-white disabled:opacity-50";
const blankLine = () => ({ date: "", category: "", description: "", amount: "" });

export default function ClaimsPanel({ slug, locale, onDenied }) {
  const tr = claimsDict(locale);
  const [data, setData] = useState(null);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/finance/claims`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setDenied(res.status === 403); setProblem(tr.problem(String(body.error || ""))); return; }
    setProblem(""); setData(body);
  }, [slug, tr]);
  useReload(load);
  useLiveUpdates(slug, "finance-payables", load);
  // A claim's approval is answered on the Approvals page and written there.
  useLiveUpdates(slug, "approvals", load);
  useEffect(() => { if (denied && !data) onDenied?.(); }, [denied, data, onDenied]);

  const post = useCallback(async (payload) => {
    setBusy(true); setProblem("");
    const res = await fetch(`/api/studios/${slug}/finance/claims`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setProblem(body.detail || tr.problem(String(body.error || ""))); return null; }
    await load();
    return body;
  }, [slug, load, tr]);

  if (!data) return problem ? <p className="text-sm text-rose-600 dark:text-rose-300">{problem}</p> : <ScreenSkeleton />;
  return (
    <div className="space-y-8">
      {problem && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{problem}</p>}
      <Claims slug={slug} tr={tr} data={data} busy={busy} post={post} />
      <Advances tr={tr} data={data} busy={busy} post={post} />
    </div>
  );
}

function ClaimForm({ tr, categories, initial, busy, onSave, onCancel }) {
  const [lines, setLines] = useState(() => (initial?.lines?.length ? initial.lines.map((l) => ({ ...l, amount: String(l.amount) })) : [blankLine()]));
  const [note, setNote] = useState(initial?.note || "");
  const patch = (i, p) => setLines(lines.map((l, n) => (n === i ? { ...l, ...p } : l)));
  return (
    <div className="space-y-2 rounded-geex border border-slate-200 p-3 dark:border-white/10">
      {lines.map((l, i) => (
        <div key={i} className="flex flex-wrap items-end gap-2">
          <Field label={tr.date} type="date" className="w-40" value={l.date} onChange={(v) => patch(i, { date: v })} />
          <Field label={tr.category} as="select" className="w-44" value={l.category} options={categories}
            onChange={(v) => patch(i, { category: v })} />
          <Field label={tr.description} className="w-64" value={l.description} onChange={(v) => patch(i, { description: v })} />
          <Field label={tr.amount} type="number" className="w-32" value={l.amount} onChange={(v) => patch(i, { amount: v })} />
          {lines.length > 1 && <button className={ghost} onClick={() => setLines(lines.filter((_, n) => n !== i))}>×</button>}
        </div>
      ))}
      <button className={ghost} onClick={() => setLines([...lines, blankLine()])}>{tr.addLine}</button>
      <Field label={tr.note} className="w-full" value={note} onChange={setNote} />
      <div className="flex gap-2">
        <button className={primary} disabled={busy}
          onClick={() => onSave({ lines: lines.map((l) => ({ ...l, amount: Number(l.amount) })), note })}>{tr.save}</button>
        <button className={ghost} onClick={onCancel}>{tr.cancel}</button>
      </div>
    </div>
  );
}

function Claims({ slug, tr, data, busy, post }) {
  const { claims = [], me, canCreate, canPay, categories = [], moneyAccounts = [] } = data;
  const [editing, setEditing] = useState(null);
  const [paying, setPaying] = useState(null);
  const save = async (body) => { if (await post({ action: "save", ...(editing?.id ? { id: editing.id } : {}), ...body })) setEditing(null); };
  return (
    <section className="space-y-3">
      <div>
        <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.title}</h3>
        <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">{tr.lead}</p>
      </div>
      {claims.length === 0 ? <p className="text-sm text-slate-400">{tr.noClaims}</p> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] text-sm">
            <thead><tr>
              <th className={th}>{tr.reference}</th><th className={th}>{tr.claimant}</th><th className={th}>{tr.total}</th>
              <th className={th}>{tr.fromAdvance}</th><th className={th}>{tr.payable}</th><th className={th} /><th />
            </tr></thead>
            <tbody>
              {claims.map((c) => {
                const own = c.claimantCollaboratorId === me;
                return (
                  <tr key={c.id} className="border-t border-slate-100 align-top text-slate-700 dark:border-white/10 dark:text-slate-200">
                    <td className="py-2 pe-3 font-mono text-xs">{c.reference}</td>
                    <td className="py-2 pe-3">{own ? tr.mine : c.claimantAlias}</td>
                    <td className="num py-2 pe-3">{moneyText(c.total)}</td>
                    <td className="num py-2 pe-3">{c.fromAdvance ? moneyText(c.fromAdvance) : "—"}</td>
                    <td className="num py-2 pe-3">{c.status === "Approved" || c.status === "Paid" ? moneyText(c.payable) : "—"}</td>
                    <td className="py-2 pe-3">
                      {tr.status(c.status)}
                      {c.status === "Rejected" && c.rejectedReason && <p className="text-xs text-slate-500">{c.rejectedReason}</p>}
                      {c.paidOn && <p className="text-xs text-slate-500">{fmtDate(c.paidOn)}</p>}
                      {/* HOW FAR ITS APPROVAL HAS GOT, while it waits — answered on
                          the Approvals page since 19/09/2026. */}
                      {c.status === "Submitted" && c.approval && (
                        <p className="text-xs text-slate-500">
                          {tr.approvalStepsOf(c.approval.granted, c.approval.required)} ·{" "}
                          <a href={`/${slug}/approvals`} className="font-600 text-brand-700 hover:underline dark:text-brand-300">{tr.openApprovals}</a>
                        </p>
                      )}
                    </td>
                    <td className="py-2 text-end">
                      <span className="flex flex-wrap justify-end gap-1">
                        {own && canCreate && c.status === "Draft" && (
                          <>
                            <button className={ghost} onClick={() => setEditing(c)}>{tr.edit}</button>
                            <button className={ghost} disabled={busy} onClick={() => post({ action: "move", id: c.id, to: "Submitted" })}>{tr.submit}</button>
                            <button className={ghost} disabled={busy} onClick={() => post({ action: "remove", id: c.id })}>{tr.remove}</button>
                          </>
                        )}
                        {own && canCreate && (c.status === "Submitted" || c.status === "Rejected") && (
                          <button className={ghost} disabled={busy} onClick={() => post({ action: "move", id: c.id, to: "Draft" })}>{tr.withdraw}</button>
                        )}
                        {canPay && c.status === "Approved" && (
                          <button className={ghost} onClick={() => setPaying({ id: c.id, date: "", accountId: "" })}>{tr.pay}</button>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {paying && (
        <div className="flex flex-wrap items-end gap-2">
          <Field label={tr.date} type="date" className="w-40" value={paying.date} onChange={(v) => setPaying({ ...paying, date: v })} />
          <Field label={tr.from} as="select" required className="w-56" value={paying.accountId}
            options={[{ value: "", label: tr.defaultBank }, ...moneyAccounts.filter((a) => a.code !== "1010").map((a) => ({ value: a.id, label: `${a.code} ${a.name}` }))]}
            onChange={(v) => setPaying({ ...paying, accountId: v })} />
          <button className={primary} disabled={busy}
            onClick={async () => { if (await post({ action: "pay", ...paying })) setPaying(null); }}>{tr.pay}</button>
          <button className={ghost} onClick={() => setPaying(null)}>{tr.cancel}</button>
        </div>
      )}
      {canCreate && !editing && <button className={ghost} onClick={() => setEditing({})}>{tr.newClaim}</button>}
      {editing && <ClaimForm tr={tr} categories={categories} initial={editing} busy={busy} onSave={save} onCancel={() => setEditing(null)} />}
    </section>
  );
}

function Advances({ tr, data, busy, post }) {
  const { advances = [], open = {}, people = [], canPay, moneyAccounts = [] } = data;
  const [giving, setGiving] = useState(null);
  const [taking, setTaking] = useState(null);
  if (!advances.length && !canPay) return null;
  const accountPicker = (value, onChange) => (
    <Field label={tr.from} as="select" required className="w-56" value={value}
      options={[{ value: "", label: tr.defaultBank }, ...moneyAccounts.filter((a) => a.code !== "1010").map((a) => ({ value: a.id, label: `${a.code} ${a.name}` }))]} onChange={onChange} />
  );
  return (
    <section className="space-y-3">
      <div>
        <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.advancesTitle}</h3>
        <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">{tr.advancesLead}</p>
      </div>
      {advances.length === 0 ? <p className="text-sm text-slate-400">{tr.noAdvances}</p> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <thead><tr>
              <th className={th}>{tr.reference}</th><th className={th}>{tr.person}</th><th className={th}>{tr.amount}</th>
              <th className={th}>{tr.returned}</th><th className={th}>{tr.holds}</th><th />
            </tr></thead>
            <tbody>
              {advances.map((a) => (
                <tr key={a.id} className="border-t border-slate-100 text-slate-700 dark:border-white/10 dark:text-slate-200">
                  <td className="py-2 pe-3 font-mono text-xs">{a.reference}</td>
                  <td className="py-2 pe-3">{a.holderAlias}</td>
                  <td className="num py-2 pe-3">{moneyText(a.amount)}</td>
                  <td className="num py-2 pe-3">{moneyText(a.returned || 0)}</td>
                  {/* WHAT THE PERSON HOLDS is across all their advances and claims. */}
                  <td className="num py-2 pe-3">{moneyText(open[a.collaboratorId] || 0)}</td>
                  <td className="py-2 text-end">
                    {canPay && (open[a.collaboratorId] || 0) > 0 && (
                      <button className={ghost} onClick={() => setTaking({ id: a.id, amount: "", date: "", accountId: "" })}>{tr.takeBack}</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {taking && (
        <div className="flex flex-wrap items-end gap-2">
          <Field label={tr.amount} type="number" className="w-32" value={taking.amount} onChange={(v) => setTaking({ ...taking, amount: v })} />
          <Field label={tr.date} type="date" className="w-40" value={taking.date} onChange={(v) => setTaking({ ...taking, date: v })} />
          {accountPicker(taking.accountId, (v) => setTaking({ ...taking, accountId: v }))}
          <button className={primary} disabled={busy}
            onClick={async () => { if (await post({ action: "advance-return", ...taking })) setTaking(null); }}>{tr.takeBack}</button>
          <button className={ghost} onClick={() => setTaking(null)}>{tr.cancel}</button>
        </div>
      )}
      {canPay && !giving && <button className={ghost} onClick={() => setGiving({ collaboratorId: "", amount: "", date: "", accountId: "", note: "" })}>{tr.giveAdvance}</button>}
      {giving && (
        <div className="flex flex-wrap items-end gap-2 rounded-geex border border-slate-200 p-3 dark:border-white/10">
          <Field label={tr.person} as="select" className="w-56" value={giving.collaboratorId}
            options={people.map((p) => ({ value: p.id, label: p.alias }))}
            onChange={(v) => setGiving({ ...giving, collaboratorId: v })} />
          <Field label={tr.amount} type="number" className="w-32" value={giving.amount} onChange={(v) => setGiving({ ...giving, amount: v })} />
          <Field label={tr.date} type="date" className="w-40" value={giving.date} onChange={(v) => setGiving({ ...giving, date: v })} />
          {accountPicker(giving.accountId, (v) => setGiving({ ...giving, accountId: v }))}
          <Field label={tr.note} className="w-56" value={giving.note} onChange={(v) => setGiving({ ...giving, note: v })} />
          <button className={primary} disabled={busy || !giving.collaboratorId}
            onClick={async () => { if (await post({ action: "advance", ...giving })) setGiving(null); }}>{tr.giveAdvance}</button>
          <button className={ghost} onClick={() => setGiving(null)}>{tr.cancel}</button>
        </div>
      )}
    </section>
  );
}
