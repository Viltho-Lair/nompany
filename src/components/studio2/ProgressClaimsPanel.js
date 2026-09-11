"use client";

import { Fragment, useCallback, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { projectsDict } from "@/shared/studio/projects";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { useReload } from "@/components/studio2/useReload";
import { panel, h2, sub, btn, btnGhost, btnRow, btnRowDanger, Empty, money, fmtDate } from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";

// PROGRESS CLAIMS ON THE BILLING TAB — tier 6. Apply for the quantity of every
// bill line done to date, record what the client certifies, then raise the
// invoice through Finance. The arithmetic is modules/projects/progressClaims,
// served already valued; this screen adds nothing to it.
//
// THE EDITABLE COLUMN FOLLOWS THE STATE: a draft edits what is APPLIED for, a
// submitted claim edits what was CERTIFIED, a certified claim edits nothing.

const td = "px-3 py-2";

export default function ProgressClaimsPanel({ slug, projectId }) {
  const tr = projectsDict(useStudioLocale());
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [periodEnd, setPeriodEnd] = useState("");
  const [openId, setOpenId] = useState(null);
  const [qty, setQty] = useState({});

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/projects/claims?projectId=${encodeURIComponent(projectId)}`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setError(body.error || "failed"); return; }
    setData(body);
  }, [slug, projectId]);
  useReload(load);
  // Claims are the project's rows; an invoice naming one is written under Cash.
  useLiveUpdates(slug, "projects-list", load);
  useLiveUpdates(slug, "finance-cash", load);

  const call = useCallback(async (url, method, payload) => {
    setError(""); setBusy(true);
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(tr.claimRefusal(out.error || "failed")); return false; }
    await load();
    return true;
  }, [load, tr]);
  const send = (method, payload) => call(`/api/studios/${slug}/projects/claims`, method, payload);

  if (!data) return error ? <p className="text-sm text-rose-600 dark:text-rose-300">{tr.claimRefusal(error)}</p> : null;

  const { basis, claims = [], canCreate, canEdit, canDelete, canInvoice } = data;
  const hasOpen = claims.some((c) => c.status !== "Certified");
  const opened = claims.find((c) => c.id === openId) || null;
  const field = opened?.status === "Draft" ? "claimedQty" : opened?.status === "Submitted" ? "certifiedQty" : null;

  const open = (c) => {
    if (openId === c.id) { setOpenId(null); return; }
    setOpenId(c.id);
    setQty(Object.fromEntries(c.lines.map((l) => [l.key, String(c.status === "Submitted" ? (l.certifiedQty ?? l.claimedQty) : l.claimedQty)])));
  };
  const typed = () => Object.entries(qty).map(([key, v]) => ({ key, qty: v === "" ? "" : Number(v) }));

  const raise = (c) => call(`/api/studios/${slug}/finance/invoices`, "POST", {
    projectId, claimId: c.id,
    lines: [{ description: tr.claimInvoiceLine(c.number, fmtDate(c.periodEnd)), qty: 1, unitPrice: c.valuation.certifiedThisPeriod }],
  });

  return (
    <section className={panel}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className={h2}>{tr.claimsHeading}</h2>
          <p className={sub}>{tr.claimsSub} {basis === "boq" ? tr.claimsBasisBoq : basis === "quotation" ? tr.claimsBasisQuotation : ""}</p>
        </div>
        {canCreate && basis !== "none" && !hasOpen && (
          <div className="flex flex-wrap items-end gap-2">
            <Field label={tr.claimPeriodEnd} type="date" className="w-44" value={periodEnd} onChange={setPeriodEnd} />
            <button type="button" className={btn} disabled={busy}
              onClick={async () => { if (await send("POST", { projectId, periodEnd })) setPeriodEnd(""); }}>
              {tr.newClaim}
            </button>
          </div>
        )}
      </div>
      {error && <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">{error}</p>}

      {basis === "none" ? <div className="mt-4"><Empty title={tr.claimsNoBillTitle} body={tr.claimsNoBill} /></div>
        : claims.length === 0 ? <div className="mt-4"><Empty title={tr.claimsNoneTitle} body={tr.claimsNone} /></div> : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-700 uppercase tracking-wide text-slate-500 dark:border-white/5">
                  <th className={`${td} text-start`}>{tr.claimNumber}</th>
                  <th className={`${td} text-start`}>{tr.claimPeriodEnd}</th>
                  <th className={`${td} text-start`}>{tr.claimStatusCol}</th>
                  <th className={`${td} text-end`}>{tr.claimToDate}</th>
                  <th className={`${td} text-end`}>{tr.claimThisPeriod}</th>
                  <th className={`${td} text-end`}>{tr.claimRetention}</th>
                  <th className={`${td} text-end`}>{tr.claimNet}</th>
                  <th className={`${td} text-start`}>{tr.claimInvoicedCol}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {claims.map((c) => {
                  const v = c.valuation;
                  const certified = c.status === "Certified";
                  const thisPeriod = certified ? v.certifiedThisPeriod : v.appliedThisPeriod;
                  return (
                    <Fragment key={c.id}>
                      <tr className="border-t border-slate-100 dark:border-white/5">
                        <td className={`${td} font-mono text-xs font-600 text-slate-700 dark:text-slate-200`}>{c.number}</td>
                        <td className={`${td} text-slate-600 dark:text-slate-300`}>{fmtDate(c.periodEnd)}</td>
                        <td className={`${td} text-slate-600 dark:text-slate-300`}>{tr.claimStatus(c.status)}</td>
                        <td className={`num ${td} text-end`}>{money(certified ? v.certifiedToDate : v.appliedToDate)}</td>
                        <td className={`num ${td} text-end font-600`}>{money(thisPeriod)}</td>
                        <td className={`num ${td} text-end text-slate-500`}>{money(v.retention)}</td>
                        <td className={`num ${td} text-end font-700 text-slate-900 dark:text-white`}>{money(v.net)}</td>
                        <td className={`${td} text-xs text-slate-500 dark:text-slate-400`}>
                          {c.invoiceRaised ? `${tr.claimInvoiced} ${money(c.invoiced)}` : certified ? tr.claimNotInvoiced : "—"}
                        </td>
                        <td className={`${td} text-end`}>
                          <button type="button" className={btnRow} onClick={() => open(c)}>{openId === c.id ? tr.claimClose : tr.claimOpen}</button>
                        </td>
                      </tr>
                      {openId === c.id && (
                        <tr>
                          <td colSpan={9} className="bg-slate-50/70 px-4 py-4 dark:bg-white/[0.02]">
                            {v.overMeasured.length > 0 && <p className="mb-2 text-xs text-amber-700 dark:text-amber-300">{tr.claimOverMeasured}</p>}
                            {field === "certifiedQty" && <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">{tr.claimCertifyHint}</p>}
                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[760px] text-xs">
                                <thead>
                                  <tr className="text-slate-500 dark:text-slate-400">
                                    {[tr.milestoneCode, tr.claimDescription, tr.claimUnit, tr.claimContractQty, tr.claimRate, tr.claimPrevious, field === "certifiedQty" || certified ? tr.claimCertifiedQty : tr.claimToDateQty, tr.claimValue]
                                      .map((h, i) => <th key={h} className={`py-1 pe-2 font-600 ${i >= 3 ? "text-end" : "text-start"}`}>{h}</th>)}
                                  </tr>
                                </thead>
                                <tbody>
                                  {c.lines.map((l) => {
                                    const shown = field ? Number(qty[l.key] || 0) : (l.certifiedQty ?? l.claimedQty);
                                    return (
                                      <tr key={l.key} className="border-t border-slate-100 dark:border-white/5">
                                        <td className="py-1 pe-2 font-mono text-slate-400">{l.code || "—"}</td>
                                        <td className="py-1 pe-2 text-slate-800 dark:text-slate-100">{l.description}</td>
                                        <td className="py-1 pe-2 text-slate-500">{l.unit || "—"}</td>
                                        <td className="num py-1 pe-2 text-end">{l.qty}</td>
                                        <td className="num py-1 pe-2 text-end">{money(l.rate)}</td>
                                        <td className="num py-1 pe-2 text-end text-slate-500">{c.previousQty?.[l.key] ?? 0}</td>
                                        <td className="py-1 pe-2 text-end">
                                          {field && canEdit ? (
                                            <input className="w-24 rounded-lg border border-slate-200 bg-white px-2 py-1 text-end text-xs dark:border-white/15 dark:bg-white/5"
                                              inputMode="decimal" value={qty[l.key] ?? ""} aria-label={`${l.code || l.description}`}
                                              onChange={(e) => setQty((q) => ({ ...q, [l.key]: e.target.value }))} />
                                          ) : <span className="num">{shown}</span>}
                                        </td>
                                        <td className="num py-1 pe-2 text-end font-600">{money(shown * l.rate)}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              {c.status === "Draft" && canEdit && (
                                <>
                                  <button type="button" className={btnGhost} disabled={busy} onClick={() => send("PUT", { id: c.id, lines: typed() })}>{tr.claimSave}</button>
                                  <button type="button" className={btn} disabled={busy} onClick={() => send("PUT", { id: c.id, to: "Submitted", lines: typed() })}>{tr.claimSubmit}</button>
                                </>
                              )}
                              {c.status === "Draft" && canDelete && (
                                <button type="button" className={btnRowDanger} disabled={busy}
                                  onClick={async () => { if (await send("DELETE", { id: c.id })) setOpenId(null); }}>{tr.delete}</button>
                              )}
                              {c.status === "Submitted" && canEdit && (
                                <>
                                  <button type="button" className={btnGhost} disabled={busy} onClick={() => send("PUT", { id: c.id, to: "Draft" })}>{tr.claimBackToDraft}</button>
                                  <button type="button" className={btn} disabled={busy} onClick={() => send("PUT", { id: c.id, to: "Certified", lines: typed() })}>{tr.claimCertify}</button>
                                </>
                              )}
                              {/* THE INVOICE IS RAISED THROUGH FINANCE, for the gross
                                  certified this period — retention is reckoned on
                                  what is invoiced, so it is not taken off here. */}
                              {certified && !c.invoiceRaised && canInvoice && v.certifiedThisPeriod > 0 && (
                                <>
                                  <button type="button" className={btn} disabled={busy} onClick={() => raise(c)}>{tr.claimRaiseInvoice}</button>
                                  <span className="text-xs text-slate-500 dark:text-slate-400">{tr.claimRetentionNote}</span>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
    </section>
  );
}
