// THE SUPPLIER REGISTER — who the studio may buy from, and how they have
// actually performed.
//
// THE TWO HALVES ARE DELIBERATELY NOT ONE NUMBER. On-time comes from orders the
// studio placed and is a fact; the scorecard is somebody's opinion of the work.
// A blended star rating would move for reasons the reader cannot see, which is
// the same objection this codebase already records against showing a project's
// ledger forecast and its performance forecast under one label. Two columns.
//
// NOTHING HERE READS ITS OWN CLOCK. `asOf` travels with the answer and every
// expiry is decided against it, so a tab left open overnight does not start
// disagreeing with the server about whether a licence has lapsed.
//
// THE STATES THAT STOP AN ORDER SORT FIRST, because they are the only rows
// anybody has to act on — a register in alphabetical order hides them behind
// whatever happens to begin with A.
"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { procurementDict } from "@/shared/studio/procurement";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { panel, h2, sub, btn, btnGhost, Empty, Dialog, Toolbar, microLabel, fmtDate } from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";
// THE RECORD IS STILL INVENTORY'S `inventoryVendors`, so its create/edit/import
// dialogs come from the file they were extracted into and post back to
// Inventory's own endpoint. A second create path here would be a second shape
// of the same row.
import { VendorForm, VendorImport } from "@/components/studio2/VendorRegister";

function refusal(tr, token) {
  switch (token) {
    case "status": return tr.refuseStatus;
    case "reason": return tr.refuseReason;
    case "kind": return tr.refuseKind;
    case "expiry-before-issue": return tr.refuseExpiryBeforeIssue;
    case "period": return tr.refusePeriod;
    case "no-scores": return tr.refuseNoScores;
    case "range": return tr.refuseRange;
    default: return token;
  }
}

// KEYED BY THE STORED TOKEN and translated on display, like every other status
// in the product — what the API returns and the goldens pin is unchanged.
function stateLabel(tr, state) {
  switch (state) {
    case "qualified": return tr.qualified;
    case "unassessed": return tr.unassessed;
    case "expiring": return tr.expiringSoon;
    case "lapsed": return tr.lapsed;
    case "blocked": return tr.blockedLabel;
    default: return state;
  }
}

function stateTone(state) {
  switch (state) {
    case "qualified": return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300";
    case "expiring": return "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300";
    case "lapsed":
    case "blocked": return "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300";
    default: return "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300";
  }
}

function whyLabel(tr, reason) {
  switch (reason) {
    case "never-assessed": return tr.whyNeverAssessed;
    case "document-expired": return tr.whyDocumentExpired;
    case "document-expiring": return tr.whyDocumentExpiring;
    case "suspended": return tr.whySuspended;
    case "rejected": return tr.whyRejected;
    default: return "";
  }
}

function statusLabel(tr, status) {
  switch (status) {
    case "Approved": return tr.statusApproved;
    case "Suspended": return tr.statusSuspended;
    case "Rejected": return tr.statusRejected;
    default: return tr.statusUnassessed;
  }
}

const emptyDoc = () => ({ kind: "", reference: "", issuedAt: "", expiresAt: "", mediaId: "" });

/** NOT SCORED IS A DASH, NEVER A NOUGHT — a blank and a one are opposite answers. */
function Score({ tr, value }) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-slate-400" title={tr.notScored}>—</span>;
  }
  return <span className="num font-600">{value}</span>;
}

export default function StudioSuppliers({ slug }) {
  const tr = procurementDict(useStudioLocale());
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [assessing, setAssessing] = useState(null);
  const [documenting, setDocumenting] = useState(null);
  const [scoring, setScoring] = useState(null);
  const [editing, setEditing] = useState(null);
  const [importing, setImporting] = useState(false);

  const read = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/procurement/suppliers`, { cache: "no-store" });
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
  // The supplier master and its scorecards are this section's own
  // (`inventoryVendors`, `supplierScorecards`). The delivery performance beside
  // them is not — it is counted off purchase orders, which live under Inventory's
  // Project sheets, so a receipt landing there changes a figure on this screen.
  useLiveUpdates(slug, "procurement-suppliers", reload);
  useLiveUpdates(slug, "inventory-sheets", reload);

  const send = useCallback(async (method, payload) => {
    setError(""); setBusy(true);
    const res = await fetch(`/api/studios/${slug}/procurement/suppliers`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(refusal(tr, out.error || "failed")); return false; }
    await reload();
    return true;
  }, [slug, reload, tr]);

  // THE SUPPLIER RECORD IS WRITTEN WHERE IT ALWAYS WAS. Two endpoints on one
  // screen, deliberately: this slice added the assessment and the scorecards,
  // and moving the create would have meant a second path onto a row that has
  // had one since before Procurement was a section.
  const sendVendor = useCallback(async (kind, method, payload) => {
    setError(""); setBusy(true);
    const res = await fetch(`/api/studios/${slug}/inventory/${kind}`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(out.error || "failed"); return false; }
    await reload();
    // THE BODY, not `true` — the import reads how many landed and which lines
    // did not, and a helper that threw the answer away would force a second
    // fetch to ask again. Every other caller tests it as a boolean, and an
    // object is truthy.
    return out;
  }, [slug, reload]);

  const blocked = useMemo(
    () => (data?.suppliers || []).filter((s) => !s.position?.qualification?.usable).length,
    [data],
  );

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <ScreenSkeleton loadingLabel={tr.loadingSuppliers} />;

  const { suppliers, canCreate, canEdit, canDelete, canQualify } = data;

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

      <div>
        <h2 className={h2}>{tr.suppliers}</h2>
        <p className={sub}>{tr.suppliersSub}</p>
      </div>

      <Toolbar canManage={canCreate} label={tr.addSupplier}
        onAdd={() => setEditing({ row: null })}
        before={canCreate ? (
          <button type="button" className={btnGhost} onClick={() => setImporting(true)}>{tr.importSuppliers}</button>
        ) : null} />

      {blocked > 0 && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
          {tr.usableNo} · {blocked}
        </p>
      )}

      {!suppliers.length ? (
        <Empty title={tr.noSuppliers} body={tr.noSuppliersBody} />
      ) : (
        <div className="space-y-3">
          {suppliers.map((v) => {
            const pos = v.position || {};
            const q = pos.qualification || {};
            const on = pos.onTime || {};
            const sc = pos.scores || {};
            return (
              <section key={v.id} className={panel}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-slate-900 dark:text-white">
                      <span className="font-600">{v.name}</span>
                      <span className={`ms-2 rounded-full px-2.5 py-1 text-xs font-600 ${stateTone(q.state)}`}>
                        {stateLabel(tr, q.state)}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {[v.contactName, v.email, v.phone].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canQualify && (
                      <>
                        <button type="button" className={btn} disabled={busy}
                          onClick={() => setAssessing({
                            id: v.id, name: v.name,
                            status: v.approvalStatus || "Unassessed",
                            reason: v.approvalReason || "",
                          })}>{tr.assess}</button>
                        <button type="button" className={btnGhost} disabled={busy}
                          onClick={() => setDocumenting({
                            id: v.id, name: v.name,
                            documents: (v.documents || []).map((d) => ({ ...d })),
                          })}>{tr.documentsLabel}</button>
                      </>
                    )}
                    {canEdit && (
                      <button type="button" className={btnGhost} disabled={busy}
                        onClick={() => setEditing({ row: v })}>{tr.edit}</button>
                    )}
                    {canDelete && (
                      <button type="button" className={btnGhost} disabled={busy}
                        onClick={() => sendVendor("vendors", "DELETE", { id: v.id })}>{tr.removeLabel}</button>
                    )}
                    {canEdit && (
                      <button type="button" className={btnGhost} disabled={busy}
                        onClick={() => setScoring({
                          vendorId: v.id, name: v.name, periodEnd: "",
                          workmanship: "", hse: "", responsiveness: "", note: "",
                        })}>{tr.addScorecard}</button>
                    )}
                  </div>
                </div>

                {/* WHY, IN WORDS, WHEREVER IT IS NOT PLAINLY QUALIFIED. A badge
                    saying "Blocked" with nothing beside it sends somebody
                    hunting through a record for the reason. */}
                {q.reason && (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {/* THE NOTE IS THE REASON FOR A BLOCK AND NOTHING ELSE.
                        On a blocked row it wins: the badge already says Blocked
                        and the line below says Suspended, so printing the word a
                        third time in front of the reason reads as a stutter.
                        Anywhere else it must NOT win — a note survives the
                        decision that needed it, so a supplier suspended and then
                        approved still carries the suspension's words, and letting
                        those stand in for `lapsed` puts a stale sentence under a
                        badge that means something different. Seen on the screen:
                        "Site incident, under review" beneath Paperwork lapsed. */}
                    {q.state === "blocked" ? (q.note || whyLabel(tr, q.reason)) : whyLabel(tr, q.reason)}
                  </p>
                )}
                {v.approvalStatus && v.approvedByAlias && (
                  <p className="mt-1 text-xs text-slate-400">
                    {statusLabel(tr, v.approvalStatus)} · {tr.assessedBy(v.approvedByAlias, fmtDate(v.approvedAt))}
                  </p>
                )}

                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className={microLabel}>{tr.documentsLabel}</p>
                    {!(q.documents || []).length ? (
                      <p className="text-xs text-slate-400">{tr.noDocuments}</p>
                    ) : (
                      <ul className="space-y-1 text-xs">
                        {q.documents.map((d, i) => (
                          <li key={`${d.kind}-${i}`} className="flex flex-wrap gap-x-2">
                            <span className="text-slate-700 dark:text-slate-200">{d.kind}</span>
                            <span className={
                              d.state === "expired" ? "text-rose-600 dark:text-rose-300"
                                : d.state === "expiring" ? "text-amber-600 dark:text-amber-300"
                                  : "text-slate-400"
                            }>
                              {d.state === "undated" ? tr.docNeverExpires
                                : d.state === "expired" ? tr.docExpiredOn(fmtDate(d.expiresAt))
                                  : tr.docDaysLeft(d.daysLeft)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <p className={microLabel} title={tr.onTimeHint}>{tr.onTimeLabel}</p>
                    {/* NULL IS NOT NOUGHT. "Nothing has landed yet" and "every
                        order was late" read identically as a 0% figure. */}
                    {on.percent === null || on.percent === undefined ? (
                      <p className="text-xs text-slate-400">{tr.noOrdersJudged}</p>
                    ) : (
                      <>
                        <p className="num text-lg font-700 text-slate-900 dark:text-white">{on.percent}%</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {tr.nOfMOnTime(on.onTime, on.judged)}
                        </p>
                        {on.averageDaysLate ? (
                          <p className="text-xs text-slate-400">
                            {tr.avgDaysLate}: <span className="num">{on.averageDaysLate}</span>
                            {on.worstDaysLate ? ` · ${tr.worstLate} ${on.worstDaysLate}` : ""}
                          </p>
                        ) : null}
                      </>
                    )}
                    {/* REPORTED BESIDE THE PERCENTAGE, NEVER FOLDED IN. Arriving
                        on the day first promised and moving the date three times
                        are different facts. */}
                    {on.rePromised ? (
                      <p className="text-xs text-amber-600 dark:text-amber-300">{tr.rePromisedCount(on.rePromised)}</p>
                    ) : null}
                    {on.outstanding ? (
                      <p className="text-xs text-slate-400">{tr.outstandingOrders(on.outstanding)}</p>
                    ) : null}
                  </div>

                  <div>
                    <p className={microLabel} title={tr.ratingHint}>{tr.ratingLabel}</p>
                    {!sc.count ? (
                      <p className="text-xs text-slate-400">{tr.noScorecards}</p>
                    ) : (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-slate-400">
                            <th className="text-start font-500" />
                            <th className="text-end font-500">{tr.averageLabel}</th>
                            {/* AN AVERAGE CANNOT SAY A SUPPLIER FIXED ITSELF IN
                                JUNE, and the latest alone forgets a decade of
                                trouble. Both columns, always. */}
                            <th className="text-end font-500">{tr.latestLabel}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[["workmanship", tr.axisWorkmanship], ["hse", tr.axisHse], ["responsiveness", tr.axisResponsiveness]].map(([k, label]) => (
                            <tr key={k}>
                              <td className="py-0.5 text-slate-600 dark:text-slate-300">{label}</td>
                              <td className="py-0.5 text-end"><Score tr={tr} value={sc.average?.[k]} /></td>
                              <td className="py-0.5 text-end"><Score tr={tr} value={sc.latest?.[k]} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {(v.scorecards || []).length > 0 && (
                  <ul className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-xs dark:border-white/5">
                    {v.scorecards.slice(0, 3).map((s) => (
                      <li key={s.id} className="flex flex-wrap justify-between gap-2">
                        <span className="text-slate-500 dark:text-slate-400">
                          {fmtDate(s.periodEnd)} · {s.byAlias}
                          {s.note ? ` — ${s.note}` : ""}
                        </span>
                        {canEdit && (
                          <button type="button" className={btnGhost} disabled={busy}
                            onClick={() => send("DELETE", { id: s.id })}>{tr.removeLabel}</button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      {assessing && (
        <Dialog title={tr.assessTitle(assessing.name)} onClose={() => setAssessing(null)}>
          <div className="space-y-3">
            <Field as="select" label={tr.decision} value={assessing.status}
              onChange={(v) => setAssessing({ ...assessing, status: v })}
              options={[
                { value: "Unassessed", label: tr.statusUnassessed },
                { value: "Approved", label: tr.statusApproved },
                { value: "Suspended", label: tr.statusSuspended },
                { value: "Rejected", label: tr.statusRejected },
              ]} />
            <Field as="textarea" label={tr.decisionReason} value={assessing.reason}
              onChange={(v) => setAssessing({ ...assessing, reason: v })} />
            {/* THE SAME RULE THE SERVER REFUSES ON, decided by the same words: a
                supplier blocked for reasons nobody wrote down is one nobody can
                argue with once that person has left. */}
            {(assessing.status === "Suspended" || assessing.status === "Rejected") && (
              <p className="text-xs text-slate-500 dark:text-slate-400">{tr.reasonRequired}</p>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setAssessing(null)}>{tr.cancel}</button>
              <button type="button" className={btn} disabled={busy}
                onClick={async () => {
                  const done = await send("PUT", {
                    action: "assess", id: assessing.id,
                    status: assessing.status, reason: assessing.reason,
                  });
                  if (done) setAssessing(null);
                }}>{tr.save}</button>
            </div>
          </div>
        </Dialog>
      )}

      {documenting && (
        <Dialog title={documenting.name} description={tr.documentsHint} onClose={() => setDocumenting(null)}>
          <div className="space-y-3">
            {documenting.documents.map((d, i) => {
              // ONE SETTER RATHER THAN FOUR COPIES OF THE SAME SPLICE. Field
              // hands back the VALUE, not the event — a handler written for an
              // event reads `e.target` off a string and throws on the first
              // keystroke, which neither tsc nor the build can see in a .js
              // screen.
              const set = (field) => (v) => {
                const next = documenting.documents.slice();
                next[i] = { ...d, [field]: v };
                setDocumenting({ ...documenting, documents: next });
              };
              return (
                <div key={i} className="grid gap-2 sm:grid-cols-4">
                  <Field label={tr.docKind} value={d.kind} onChange={set("kind")} />
                  <Field label={tr.docReference} value={d.reference} onChange={set("reference")} />
                  <Field type="date" label={tr.docIssued} value={d.issuedAt} onChange={set("issuedAt")} />
                  <Field type="date" label={tr.docExpires} value={d.expiresAt} onChange={set("expiresAt")} />
                </div>
              );
            })}
            <button type="button" className={btnGhost}
              onClick={() => setDocumenting({ ...documenting, documents: [...documenting.documents, emptyDoc()] })}>
              {tr.addDocument}
            </button>
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setDocumenting(null)}>{tr.cancel}</button>
              <button type="button" className={btn} disabled={busy}
                onClick={async () => {
                  const done = await send("PUT", {
                    action: "documents", id: documenting.id, documents: documenting.documents,
                  });
                  if (done) setDocumenting(null);
                }}>{tr.save}</button>
            </div>
          </div>
        </Dialog>
      )}

      {editing && (
        <Dialog title={editing.row ? editing.row.name : tr.addSupplier} onClose={() => setEditing(null)}>
          <VendorForm row={editing.row} busy={busy} onCancel={() => setEditing(null)}
            onSave={async (v) => {
              const done = await sendVendor("vendors", editing.row ? "PUT" : "POST",
                editing.row ? { ...v, id: editing.row.id } : v);
              if (done) setEditing(null);
            }} />
        </Dialog>
      )}

      {importing && (
        <Dialog title={tr.importSuppliers} onClose={() => setImporting(false)}>
          <VendorImport busy={busy} onCancel={() => setImporting(false)} send={sendVendor} />
        </Dialog>
      )}

      {scoring && (
        <Dialog title={tr.scorecardFor(scoring.name)} onClose={() => setScoring(null)}>
          <div className="space-y-3">
            <Field type="date" label={tr.periodScored} value={scoring.periodEnd}
              onChange={(v) => setScoring({ ...scoring, periodEnd: v })} />
            <div className="grid gap-2 sm:grid-cols-3">
              {[["workmanship", tr.axisWorkmanship], ["hse", tr.axisHse], ["responsiveness", tr.axisResponsiveness]].map(([k, label]) => (
                <Field key={k} as="select" label={label} value={scoring[k]}
                  onChange={(v) => setScoring({ ...scoring, [k]: v })}
                  options={[
                    // BLANK IS AN OPTION, and it is not a nought: an axis nobody
                    // scored is left out of the average rather than dragging it
                    // down.
                    { value: "", label: tr.notScored },
                    ...[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) })),
                  ]} />
              ))}
            </div>
            <Field as="textarea" label={tr.scoreNote} value={scoring.note}
              onChange={(v) => setScoring({ ...scoring, note: v })} />
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setScoring(null)}>{tr.cancel}</button>
              <button type="button" className={btn} disabled={busy}
                onClick={async () => {
                  const done = await send("POST", {
                    vendorId: scoring.vendorId, periodEnd: scoring.periodEnd,
                    workmanship: scoring.workmanship, hse: scoring.hse,
                    responsiveness: scoring.responsiveness, note: scoring.note,
                  });
                  if (done) setScoring(null);
                }}>{tr.save}</button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
