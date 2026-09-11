// SUBCONTRACTS — what a trade package is worth, what has been valued, what is
// held back and what is deducted.
//
// THE MIRROR OF THE BILLING SCHEDULE, and it uses billing's own retention
// arithmetic: that screen shows money a CLIENT withholds from what the studio
// invoices; this shows money the studio withholds from what a subcontractor
// invoices. Same percentages, roles reversed.
//
// THE ONE THING THIS SCREEN MUST NEVER DO is add the periods up. Certificates
// are CUMULATIVE — each values the whole package to date and pays the
// difference — so summing them counts a corrected period once in its own right
// and again inside every later total. `certifiedToDate` is the last certified
// certificate's cumulative, never a sum, and `thisPeriod` is derived.
"use client";
import { useCallback, useEffect, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { procurementDict } from "@/shared/studio/procurement";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { panel, h2, sub, btn, btnGhost, btnRow, btnRowDanger, Empty, Dialog, StatTile, money, fmtDate } from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";
import { supplierOptions, projectOptions, costCodeOptions, supplierName } from "@/components/studio2/pickerOptions";

function refusal(tr, token) {
  switch (token) {
    case "not-live": return tr.refuseNotLive;
    case "terminated": return tr.refuseTerminated;
    case "below-previous": return tr.refuseBelowPrevious;
    case "certified": return tr.refuseCertified;
    case "already-certified": return tr.refuseAlreadyCertified;
    case "retention-locked": return tr.refuseRetentionLocked;
    case "has-certificates": return tr.refuseHasCertificates;
    case "not-certifiable": return tr.refuseNotCertifiable;
    default: return token;
  }
}

const emptyCharge = () => ({ description: "", amount: "" });

export default function StudioSubcontracts({ slug }) {
  const tr = procurementDict(useStudioLocale());
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(null);
  const [valuing, setValuing] = useState(null);

  const read = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/procurement/subcontracts`, { cache: "no-store" });
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
  // The package and its valuations are separate collections under one section
  // (`subcontracts`, `paymentCertificates` under `procurement-subcontracts`), so
  // one watch covers both halves of the screen.
  useLiveUpdates(slug, "procurement-subcontracts", reload);

  const send = useCallback(async (method, payload) => {
    setError(""); setBusy(true);
    const res = await fetch(`/api/studios/${slug}/procurement/subcontracts`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(refusal(tr, out.error || "failed")); return false; }
    await reload();
    return true;
  }, [slug, reload, tr]);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <ScreenSkeleton loadingLabel={tr.loadingSubcontracts} />;

  const { subcontracts, canCreate, canEdit, canDelete, canCertify, pickers = {} } = data;

  const openForm = (row) => setForm(row ? { ...row } : {
    title: "", scope: "", vendorId: "", projectId: "", costCodeId: "", value: "",
    retentionPercent: "", retentionReleaseDate: "", startDate: "", endDate: "", notes: "",
  });

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className={h2}>{tr.subcontracts}</h2>
          <p className={sub}>{tr.subcontractsSub}</p>
        </div>
        {canCreate && (
          <button type="button" className={btn} onClick={() => openForm(null)}>{tr.newSubcontract}</button>
        )}
      </div>

      {!subcontracts.length ? (
        <Empty title={tr.noSubcontracts} body={tr.noSubcontractsBody} />
      ) : (
        <div className="space-y-3">
          {subcontracts.map((s) => {
            const pos = s.position || {};
            const ret = pos.retention || {};
            return (
              <section key={s.id} className={panel}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-slate-900 dark:text-white">
                      <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{s.reference}</span>
                      <span className="ms-2 font-600">{s.title}</span>
                      <span className="ms-2 text-xs text-slate-500 dark:text-slate-400">{s.status}</span>
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {tr.subcontractor}: {supplierName(pickers, s.vendorId) || "—"}
                      {s.retentionPercent ? ` · ${tr.retentionPct} ${s.retentionPercent}` : ""}
                      {s.endDate ? ` · ${tr.endsOn} ${fmtDate(s.endDate)}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canEdit && s.status === "Draft" && (
                      <button type="button" className={btn} disabled={busy}
                        onClick={() => send("PUT", { id: s.id, status: "Live" })}>{tr.markLive}</button>
                    )}
                    {canEdit && s.status === "Live" && (
                      <>
                        <button type="button" className={btn} disabled={busy}
                          onClick={() => setValuing({
                            subcontractId: s.id, reference: s.reference,
                            periodEnd: "", cumulativeValue: "", notes: "",
                            backCharges: [emptyCharge()],
                          })}>
                          {tr.newCertificate}
                        </button>
                        <button type="button" className={btnRow} disabled={busy}
                          onClick={() => send("PUT", { id: s.id, status: "Complete" })}>{tr.markComplete}</button>
                      </>
                    )}
                    {canEdit && (
                      <button type="button" className={btnRow} disabled={busy}
                        onClick={() => openForm(s)}>{tr.edit}</button>
                    )}
                    {canEdit && s.status !== "Terminated" && s.status !== "Draft" && (
                      <button type="button" className={btnGhost} disabled={busy}
                        onClick={() => send("PUT", { id: s.id, status: "Terminated" })}>{tr.terminate}</button>
                    )}
                    {canDelete && s.status === "Draft" && (
                      <button type="button" className={btnRowDanger} disabled={busy}
                        onClick={() => send("DELETE", { id: s.id })}>{tr.remove}</button>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-4">
                  <StatTile label={tr.packageValue} value={<span className="num">{money(pos.value)}</span>} />
                  <StatTile label={tr.certifiedToDate} value={<span className="num">{money(pos.certifiedToDate)}</span>}
                    sub={`${tr.remainingToCertify}: ${money(pos.remaining)}`}
                    tone={pos.remaining < 0 ? "text-amber-700 dark:text-amber-300" : ""}
                    accent="rgb(var(--chart-2))" />
                  <StatTile label={tr.heldBack} value={<span className="num">{money(ret.held)}</span>}
                    sub={ret.blocked === "no-release-date"
                      ? tr.noReleaseDate
                      : `${tr.retentionRelease}: ${fmtDate(ret.releaseDate)}`}
                    tone={ret.blocked ? "text-amber-700 dark:text-amber-300" : ""} />
                  <StatTile label={tr.netCertified} value={<span className="num">{money(pos.netCertified)}</span>}
                    sub={pos.totalBackCharges ? `${tr.backCharges}: ${money(pos.totalBackCharges)}` : ""}
                    accent="rgb(var(--chart-3))" />
                </div>

                {/* FLAGGED, NOT REFUSED. A variation agreed off-system is the
                    usual cause, and refusing the figure would make the screen
                    lie about what has been certified. */}
                {pos.overValued && (
                  <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                    {tr.overValuedWarning}
                  </p>
                )}

                <div className="mt-4">
                  <p className="text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {tr.certificates}
                  </p>
                  {!(pos.certificates || []).length ? (
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{tr.noCertificatesYet}</p>
                  ) : (
                    <div className="mt-2 overflow-x-auto">
                      <table className="w-full min-w-[620px] text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 text-start dark:border-white/5">
                            <th className="px-4 py-3 text-start text-xs font-700 uppercase tracking-wide text-slate-500">{tr.certNumber}</th>
                            <th className="px-4 py-3 text-start text-xs font-700 uppercase tracking-wide text-slate-500">{tr.periodEnd}</th>
                            <th className="px-4 py-3 text-end text-xs font-700 uppercase tracking-wide text-slate-500">{tr.cumulativeValue}</th>
                            <th className="px-4 py-3 text-end text-xs font-700 uppercase tracking-wide text-slate-500">{tr.thisPeriod}</th>
                            <th className="px-4 py-3 text-end text-xs font-700 uppercase tracking-wide text-slate-500">{tr.netPayable}</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {pos.certificates.map((c) => {
                            const stored = (s.certificates || []).find((x) => x.id === c.id) || {};
                            return (
                              <tr key={c.id} className="border-t border-slate-100 dark:border-slate-800">
                                <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">{c.number}</td>
                                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                                  {c.periodEnd ? fmtDate(c.periodEnd) : "—"}
                                  <span className="ms-2 text-xs text-slate-400 dark:text-slate-500">{c.status}</span>
                                  {stored.certifiedByAlias && (
                                    <span className="mt-1 block text-xs text-slate-400 dark:text-slate-500">
                                      {tr.certifiedBy(stored.certifiedByAlias)}
                                    </span>
                                  )}
                                </td>
                                <td className="num px-4 py-3 text-end text-slate-700 dark:text-slate-200">{money(c.cumulativeValue)}</td>
                                <td className={`num px-4 py-3 text-end ${c.thisPeriod < 0 ? "text-amber-700 dark:text-amber-300" : "text-slate-700 dark:text-slate-200"}`}>
                                  {money(c.thisPeriod)}
                                </td>
                                {/* NEGATIVE IS A REAL ANSWER and is not clamped:
                                    back-charges larger than the work done mean
                                    the studio is owed money. */}
                                <td className={`num px-4 py-3 text-end ${c.netPayable < 0 ? "text-rose-600 dark:text-rose-300" : "text-slate-900 dark:text-white"}`}>
                                  {money(c.netPayable)}
                                  {c.backCharges > 0 && (
                                    <span className="mt-1 block text-xs text-slate-400 dark:text-slate-500">
                                      −{money(c.backCharges)} {tr.backCharges}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-end">
                                  {canCertify && c.status === "Draft" && (
                                    <button type="button" className={btn} disabled={busy}
                                      onClick={() => send("PUT", { id: c.id, action: "certify" })}>
                                      {tr.certify}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {form && (
        <Dialog title={form.id ? tr.editSubcontract : tr.newSubcontract}
          onClose={() => setForm(null)} width="max-w-[680px]">
          <div className="space-y-4">
            <Field label={tr.packageTitle} required value={form.title || ""}
              onChange={(v) => setForm((f) => ({ ...f, title: v }))} inputProps={{ maxLength: 200 }} />
            <Field label={tr.packageScope} as="textarea" value={form.scope || ""}
              onChange={(v) => setForm((f) => ({ ...f, scope: v }))} inputProps={{ maxLength: 4000 }} />
            <div className="grid gap-4 sm:grid-cols-2">
              {/* FROM THE REGISTER — the one whose paperwork the payment hold
                  checks. This was a raw-id box. */}
              <Field label={tr.subcontractor} as="select" required value={form.vendorId || ""}
                onChange={(v) => setForm((f) => ({ ...f, vendorId: v }))}
                options={supplierOptions(pickers)} />
              <Field label={tr.packageValue} type="number" value={form.value ?? ""}
                onChange={(v) => setForm((f) => ({ ...f, value: v }))} inputProps={{ step: "0.01" }} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={tr.project} as="select" value={form.projectId || ""}
                onChange={(v) => setForm((f) => ({ ...f, projectId: v, costCodeId: "" }))}
                options={projectOptions(pickers)} />
              <Field label={tr.costCode} as="select" value={form.costCodeId || ""}
                onChange={(v) => setForm((f) => ({ ...f, costCodeId: v }))}
                options={costCodeOptions(pickers, form.projectId)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={tr.retentionPct} type="number" value={form.retentionPercent ?? ""}
                onChange={(v) => setForm((f) => ({ ...f, retentionPercent: v }))}
                inputProps={{ step: "0.01", min: 0, max: 100 }} />
              <Field label={tr.retentionRelease} type="date" value={form.retentionReleaseDate || ""}
                onChange={(v) => setForm((f) => ({ ...f, retentionReleaseDate: v }))} />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">{tr.retentionLockedHint}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={tr.startsOn} type="date" value={form.startDate || ""}
                onChange={(v) => setForm((f) => ({ ...f, startDate: v }))} />
              <Field label={tr.endsOn} type="date" value={form.endDate || ""}
                onChange={(v) => setForm((f) => ({ ...f, endDate: v }))} />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setForm(null)}>{tr.cancel}</button>
              <button type="button" className={btn}
                disabled={busy || !form.title?.trim() || !form.vendorId?.trim()}
                onClick={async () => {
                  const payload = {
                    title: form.title, scope: form.scope, vendorId: form.vendorId,
                    projectId: form.projectId || "",
                    costCodeId: form.costCodeId || "",
                    value: Number(form.value) || 0,
                    retentionPercent: Number(form.retentionPercent) || 0,
                    retentionReleaseDate: form.retentionReleaseDate || "",
                    startDate: form.startDate || "", endDate: form.endDate || "",
                    notes: form.notes || "",
                  };
                  const done = form.id
                    ? await send("PUT", { ...payload, id: form.id })
                    : await send("POST", payload);
                  if (done) setForm(null);
                }}>
                {tr.save}
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {valuing && (
        <Dialog title={`${tr.newCertificate} — ${valuing.reference}`}
          onClose={() => setValuing(null)} width="max-w-[680px]">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={tr.periodEnd} type="date" value={valuing.periodEnd}
                onChange={(v) => setValuing((f) => ({ ...f, periodEnd: v }))} />
              <Field label={tr.cumulativeValue} type="number" value={valuing.cumulativeValue}
                onChange={(v) => setValuing((f) => ({ ...f, cumulativeValue: v }))}
                inputProps={{ step: "0.01" }} />
            </div>
            {/* THE HINT IS LOAD-BEARING. A field labelled "value" invites the
                amount for this period, which is exactly the number that must
                not be typed here. */}
            <p className="text-xs text-slate-500 dark:text-slate-400">{tr.cumulativeValueHint}</p>

            <div>
              <p className="mb-2 text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400">{tr.backCharges}</p>
              {valuing.backCharges.map((b, i) => (
                <div key={i} className="mb-2 grid gap-2 sm:grid-cols-[1fr_140px]">
                  <input className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm dark:border-white/10 dark:bg-transparent"
                    aria-label={tr.backChargeWhat} placeholder={tr.backChargeWhat}
                    value={b.description} maxLength={400}
                    onChange={(e) => setValuing((f) => {
                      const rows = f.backCharges.map((x, j) => (j === i ? { ...x, description: e.target.value } : x));
                      if (i === rows.length - 1 && e.target.value.trim()) rows.push(emptyCharge());
                      return { ...f, backCharges: rows };
                    })} />
                  <input type="number" step="0.01"
                    className="num w-full rounded-lg border border-slate-200 px-2 py-1 text-end text-sm dark:border-white/10 dark:bg-transparent"
                    aria-label={tr.backChargeAmount} value={b.amount}
                    onChange={(e) => setValuing((f) => ({
                      ...f,
                      backCharges: f.backCharges.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)),
                    }))} />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setValuing(null)}>{tr.cancel}</button>
              <button type="button" className={btn} disabled={busy}
                onClick={async () => {
                  const done = await send("POST", {
                    certificate: true,
                    subcontractId: valuing.subcontractId,
                    periodEnd: valuing.periodEnd,
                    cumulativeValue: Number(valuing.cumulativeValue) || 0,
                    notes: valuing.notes,
                    backCharges: valuing.backCharges
                      .filter((b) => b.description.trim())
                      .map((b) => ({ description: b.description, amount: Number(b.amount) || 0 })),
                  });
                  if (done) setValuing(null);
                }}>
                {tr.save}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
