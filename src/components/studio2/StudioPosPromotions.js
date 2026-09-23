"use client";

// PROMOTIONS (22/09/2026) — Point of Sale's sixth screen: what takes money off
// a sale at the till, and when. `docs/functionality/promotions.md` is the file.
//
// THE OFFER'S OWN WORDS ARE THE STUDIO'S. A name and a description print as
// they were typed, here and on the receipt; only the product's own labels come
// from the dictionary.
//
// STATUS IS MOVED, NEVER TYPED. Activating is the act that costs money, so it
// is its own button and its own request — never a field inside the editor.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { posPromotionsDict } from "@/shared/studio/posPromotions";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { panel, btn, btnRow, Dialog, fmtDate } from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";
import SelectMenu from "@/components/fields/SelectMenu";
import { promotionValidAt, daysUntilEnd, PROMOTION_STATUSES } from "@/modules/sales/posPromotionsModel";
import { OfferEditor, CouponsTab, ReportTab } from "@/components/studio2/posPromotionParts";

const td = "py-2.5 pe-3 align-middle";
const INPUT = "w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-white/15";

// WHAT MAY BE DONE TO AN OFFER WHERE IT IS. The same table the server holds;
// a button the server would refuse is a button that should not be drawn.
const MOVES = {
  draft: ["active", "archived"],
  active: ["paused", "ended"],
  paused: ["active", "ended", "archived"],
  ended: ["archived"],
  archived: [],
};

// `initial` is the /pos/promotions body the studio page answered in its own
// render, so the offers paint at once; absent, it fetches on mount as before.
export default function StudioPosPromotions({ slug, initial }) {
  const locale = useStudioLocale();
  const tr = posPromotionsDict(locale);
  const [data, setData] = useState(initial ?? null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("offers");
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [couponFor, setCouponFor] = useState("");
  const [detail, setDetail] = useState(null);
  const [range, setRange] = useState({ from: "", to: "" });
  const [report, setReport] = useState(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/pos/promotions`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.ok) { setError(body.error || "failed"); return; }
    setError("");
    setData(body);
  }, [slug]);

  // The loader the page already answered for is skipped by IDENTITY, not by a
  // flag, so React's development double-effect cannot spend it (useReload says
  // why); a new slug builds a new loader and fetches as before.
  const skip = useRef(initial !== undefined ? load : null);
  useEffect(() => {
    if (load === skip.current) return;
    let current = true;
    (async () => { if (current) await load(); })();
    return () => { current = false; };
  }, [load]);
  // The offers are written under their own section key.
  useLiveUpdates(slug, "pos-promotions", load);

  const call = useCallback(async (path, method, body) => {
    setBusy(true);
    const res = await fetch(`/api/studios/${slug}/pos/promotions${path}`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !out?.ok) { setError(tr.refusal(out?.error || "", out)); return null; }
    setError("");
    return out;
  }, [slug, tr]);

  const loadDetail = useCallback(async (id) => {
    if (!id) { setDetail(null); return; }
    const res = await fetch(`/api/studios/${slug}/pos/promotions?id=${encodeURIComponent(id)}`, { cache: "no-store" });
    const out = await res.json().catch(() => ({}));
    setDetail(res.ok && out?.ok ? out : null);
  }, [slug]);

  const runReport = useCallback(async () => {
    const q = new URLSearchParams();
    if (range.from) q.set("from", range.from);
    if (range.to) q.set("to", range.to);
    const res = await fetch(`/api/studios/${slug}/pos/promotions/report?${q}`, { cache: "no-store" });
    const out = await res.json().catch(() => ({}));
    if (res.ok && out?.ok) setReport(out);
  }, [slug, range]);

  const rows = useMemo(() => {
    const all = data?.promotions || [];
    const q = search.trim().toLowerCase();
    const warn = Number(data?.expiryWarningDays ?? 7);
    const at = new Date().toISOString();
    return all.filter((p) => {
      if (q && !`${p.code} ${p.name} ${p.nameAr || ""}`.toLowerCase().includes(q)) return false;
      if (!status) return true;
      // "ENDING SOON" AND "PAST ITS END" ARE NOT STATUSES. They are computed
      // from the dates every time they are asked for, because a stored flag
      // and a date part company the moment the date is changed.
      if (status === "soon") {
        const left = daysUntilEnd(p, at);
        return left !== null && left >= 0 && left <= warn;
      }
      if (status === "expired") {
        const left = daysUntilEnd(p, at);
        return left !== null && left < 0;
      }
      return p.status === status;
    });
  }, [data, search, status]);

  if (error === "forbidden" && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{tr.refused}</p>;
  if (!data) return <ScreenSkeleton loadingLabel={tr.loading} />;

  const at = new Date().toISOString();
  const warn = Number(data.expiryWarningDays ?? 7);
  const tabs = [["offers", tr.tabOffers], ["coupons", tr.tabCoupons], ["report", tr.tabReport]];

  return (
    <div className="space-y-5">
      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
      {notice && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{notice}</p>}

      <section className={panel}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-700 text-[var(--geex-ink)]">{tr.title}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{tr.lead}</p>
          </div>
          {data.can.create && tab === "offers" && (
            <button type="button" className={btn} onClick={() => setEditing({})}>{tr.newOffer}</button>
          )}
        </div>

        <div className="mt-3 flex gap-2 border-b border-slate-200 dark:border-white/10">
          {tabs.map(([k, label]) => (
            <button key={k} type="button"
              className={`-mb-px border-b-2 px-3 py-2 text-sm ${tab === k
                ? "border-brand-600 font-700 text-brand-700 dark:text-brand-300"
                : "border-transparent text-slate-500 dark:text-slate-400"}`}
              onClick={() => { setTab(k); if (k === "report" && !report) runReport(); }}>
              {label}
            </button>
          ))}
        </div>

        {tab === "offers" && (
          <div className="mt-4">
            <div className="mb-3 flex flex-wrap items-end gap-2">
              <Field label={tr.search} value={search} onChange={setSearch} />
              <div className="w-48">
                <p className="mb-1 text-xs text-slate-400">{tr.filterStatus}</p>
                <SelectMenu className={INPUT} value={status} aria-label={tr.filterStatus} onChange={setStatus}
                  options={[
                    { value: "", label: tr.all },
                    ...PROMOTION_STATUSES.map((s) => ({ value: s, label: tr.status(s) })),
                    { value: "soon", label: tr.expiringSoon },
                    { value: "expired", label: tr.expired },
                  ]} />
              </div>
            </div>

            {rows.length === 0 ? (
              <div className="py-8 text-center">
                <p className="font-display font-700 text-[var(--geex-ink)]">{tr.empty}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{tr.emptyLead}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {rows.map((p) => {
                      const left = daysUntilEnd(p, at);
                      const live = promotionValidAt(p, at, data.timezone);
                      return (
                        <tr key={p.id} className="border-t border-slate-100 dark:border-white/5">
                          <td className={`${td} font-mono`}>{p.code}</td>
                          <td className={td}>
                            {locale === "ar" && p.nameAr ? p.nameAr : p.name}
                            {/* THE BADGE IS COMPUTED, NOT STORED. An offer four
                                days from its end says so; one past it says that
                                instead, whatever its status still reads. */}
                            {left !== null && left < 0 && (
                              <span className="ms-2 rounded-full bg-slate-500/10 px-2 py-0.5 text-[11px] font-600 text-slate-600 dark:text-slate-300">{tr.expired}</span>
                            )}
                            {left !== null && left >= 0 && left <= warn && (
                              <span className="ms-2 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-600 text-amber-700 dark:text-amber-300">{tr.daysLeft(left)}</span>
                            )}
                            {p.status === "active" && live && (
                              <span className="ms-2 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-600 text-emerald-700 dark:text-emerald-300">●</span>
                            )}
                          </td>
                          <td className={`${td} text-slate-500 dark:text-slate-400`}>{tr.status(p.status)}</td>
                          <td className={`${td} text-slate-500 dark:text-slate-400`}>
                            {p.endsAt ? tr.endsOn(fmtDate(p.endsAt)) : tr.openEnded}
                          </td>
                          <td className={`${td} text-end`}>
                            <div className="flex flex-wrap justify-end gap-1">
                              {data.can.edit && p.status !== "active" && p.status !== "archived" && (
                                <button type="button" className={btnRow} onClick={() => setEditing(p)}>{tr.edit}</button>
                              )}
                              {data.can.create && (
                                <button type="button" className={btnRow} disabled={busy}
                                  onClick={async () => { if (await call("", "POST", { cloneOf: p.id })) load(); }}>{tr.clone}</button>
                              )}
                              {data.can.edit && (MOVES[p.status] || []).map((to) => (
                                <button key={to} type="button" className={btnRow} disabled={busy}
                                  onClick={async () => {
                                    const out = await call("", "PATCH", { id: p.id, status: to });
                                    if (!out) return;
                                    // ASKED, NOT DONE: activating may go for a
                                    // signature, and the row stays where it is
                                    // until somebody answers on Approvals.
                                    if (out.asked) setNotice(tr.sentForApproval);
                                    load();
                                  }}>
                                  {{ active: tr.activate, paused: tr.pause, ended: tr.end, archived: tr.archive }[to]}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "coupons" && (
          <div className="mt-4">
            <CouponsTab
              tr={tr} locale={locale} data={data} detail={detail} promotionId={couponFor} busy={busy}
              onPick={(id) => { setCouponFor(id); loadDetail(id); }}
              onMint={async (body) => { if (await call("/coupons", "POST", body)) loadDetail(couponFor); }}
              onVoid={async (id) => { if (await call("/coupons", "PATCH", { id })) loadDetail(couponFor); }} />
          </div>
        )}

        {tab === "report" && (
          <div className="mt-4">
            <ReportTab tr={tr} locale={locale} report={report} from={range.from} to={range.to}
              onRange={setRange} onRun={runReport} busy={busy} />
          </div>
        )}
      </section>

      {editing && (
        <Dialog title={editing.id ? `${editing.code} · ${editing.name}` : tr.newOffer}
          onClose={() => setEditing(null)} width="max-w-[720px]">
          {editing.id && editing.status === "active"
            ? <p className="text-sm text-amber-700 dark:text-amber-300">{tr.activeNotEditable}</p>
            : (
              <OfferEditor
                tr={tr} locale={locale} data={data} busy={busy}
                promotion={editing.id ? editing : null}
                onCancel={() => setEditing(null)}
                onSave={async (draft) => {
                  const out = editing.id
                    ? await call("", "PUT", { ...draft, id: editing.id })
                    : await call("", "POST", draft);
                  if (!out) return;
                  setEditing(null);
                  load();
                }} />
            )}
          {editing.id && (detail?.promotion?.id === editing.id) && (
            <History tr={tr} rows={detail.history || []} />
          )}
        </Dialog>
      )}
    </div>
  );
}

/** WHO CHANGED WHAT. An offer's current state cannot answer "who made it 50%". */
function History({ tr, rows }) {
  if (!rows.length) return null;
  return (
    <section className="mt-4">
      <p className="mb-2 text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400">{tr.history}</p>
      <ul className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
        {rows.map((r) => (
          <li key={r.id}>{fmtDate(r.at)} — {tr.historyAction(r.action)} {r.detail}</li>
        ))}
      </ul>
    </section>
  );
}

