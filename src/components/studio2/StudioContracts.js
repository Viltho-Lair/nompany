// THE CONTRACTS REGISTER — what the studio has signed, and what has moved since.
//
// Both records were built in P2 with schemas, services and routes, and no
// screen at all: a contract existed and was invisible. This is the screen, and
// it is why crmSales.contracts stopped borrowing crmSales.quotations.
//
// A CONTRACT AND ITS VARIATIONS ARE ONE THING TO READ. A contract's value is
// not what it says on the contract — it is that plus every approved change
// order against it, which is exactly the number a project manager needs and
// the one nobody could see. So the register shows the signed value, the
// approved movement and the current value together, per contract, rather than
// listing two collections side by side.
//
// NO DELETE, and the route agrees: a contract is the deal's value baseline,
// invoices claim against it and change orders adjust it. Ending one is a state
// it HAS, not the absence of a record.
"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { salesDict } from "@/shared/studio/sales";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
// `money` and `fmtDate` come from ui.js rather than being written here. Gate A
// refuses a raw toLocaleString in a studio screen, and it caught exactly that
// in the first draft of this file — a per-screen formatter is how two screens
// end up disagreeing about what a number looks like.
import { panel, h2, sub, btn, btnGhost, Empty, fmtDate, money } from "@/components/studio2/ui";
import { StatusPill } from "@/components/studio2/StatusPill";

export default function StudioContracts({ slug }) {
  const tr = salesDict(useStudioLocale());
  const [contracts, setContracts] = useState(null);
  const [changeOrders, setChangeOrders] = useState([]);
  const [rights, setRights] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(null);

  // TWO READS, because they are two routes. They were built separately in P2
  // and each guards itself; joining them here rather than adding a third
  // endpoint keeps the services the single door onto their own rows.
  const load = useCallback(async () => {
    const [c, co] = await Promise.all([
      fetch(`/api/studios/${slug}/sales/contracts`, { cache: "no-store" }),
      fetch(`/api/studios/${slug}/sales/change-orders`, { cache: "no-store" }),
    ]);
    const cj = await c.json().catch(() => ({}));
    const coj = await co.json().catch(() => ({}));
    if (!c.ok) { setError(cj.error || "failed"); return; }
    setContracts(cj.contracts || []);
    setChangeOrders(coj.changeOrders || []);
    setRights({
      canCreate: cj.canCreate ?? false,
      canEdit: cj.canEdit ?? false,
      canApprove: cj.canApprove ?? false,
    });
  }, [slug]);

  useEffect(() => { load(); }, [load]);
  useLiveUpdates(slug, load);

  const send = useCallback(async (path, method, payload) => {
    setError(""); setBusy(true);
    const res = await fetch(`/api/studios/${slug}/sales/${path}`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      // `same-signer` is invariant 7 speaking, and it deserves its own sentence
      // rather than a raw token: the person reading it submitted this variation.
      setError(out.error === "same-signer" ? tr.cannotAnswerYourOwn : (out.error || "failed"));
      return false;
    }
    await load();
    return true;
  }, [slug, load, tr]);

  // Variations grouped by the contract they were raised against, so a contract
  // can show its own movement rather than the register showing a flat list
  // nobody can attribute.
  const byContract = useMemo(() => {
    const out = {};
    for (const co of changeOrders) {
      const k = co.contractId || "";
      (out[k] = out[k] || []).push(co);
    }
    return out;
  }, [changeOrders]);

  if (error && !contracts) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!contracts) return <ScreenSkeleton loadingLabel={tr.loadingContracts} />;

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}
      <div>
        <h2 className={h2}>{tr.contracts}</h2>
        <p className={sub}>{tr.contractsWhatWasAgreed}</p>
      </div>

      {contracts.length === 0 ? <Empty title={tr.noContractsYet} body={tr.contractsAppearWhenQuotationWon} /> : (
        <section className={panel}>
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {contracts.map((c) => {
              const mine = byContract[c.id] || [];
              // ONLY APPROVED VARIATIONS COUNT. A submitted one is a claim, and
              // a claim in somebody's inbox has not changed what was agreed —
              // the same rule approvedValueDelta enforces server-side.
              const delta = mine.filter((x) => x.status === "approved")
                .reduce((s, x) => s + (Number(x.valueDelta) || 0), 0);
              const pending = mine.filter((x) => x.status === "submitted").length;
              return (
                <li key={c.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <div className="min-w-0">
                      <button type="button" className="font-mono text-xs text-brand-700 hover:underline dark:text-brand-300"
                        onClick={() => setOpen(open === c.id ? null : c.id)}>
                        {c.number || c.id}
                      </button>
                      <span className="ms-2 font-600 text-slate-900 dark:text-white">{c.title}</span>
                      {pending > 0 && (
                        <span className="ms-2 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-600 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                          {tr.nVariationsWaiting(pending)}
                        </span>
                      )}
                    </div>
                    <div className="text-end">
                      <p className="num font-700 text-slate-900 dark:text-white">{money(c.value + delta)} {c.currency}</p>
                      {delta !== 0 && (
                        <p className="num text-xs text-slate-500 dark:text-slate-400">
                          {money(c.value)} {delta > 0 ? "+" : "−"} {money(Math.abs(delta))}
                        </p>
                      )}
                    </div>
                  </div>

                  {open === c.id && (
                    <div className="mt-3 rounded-xl bg-slate-50 p-4 dark:bg-white/5">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {tr.signedOn} {c.signedDate ? fmtDate(c.signedDate) : "—"}
                        {c.startDate && ` · ${fmtDate(c.startDate)}`}
                        {c.endDate && ` → ${fmtDate(c.endDate)}`}
                      </p>
                      {c.notes && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{c.notes}</p>}

                      <div className="mt-3 border-t border-slate-200 pt-3 dark:border-white/10">
                        <p className="text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400">{tr.variations}</p>
                        {mine.length === 0 ? (
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tr.noVariationsYet}</p>
                        ) : (
                          <ul className="mt-1 space-y-2">
                            {mine.map((co) => (
                              <li key={co.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                                <span className="min-w-0 text-slate-700 dark:text-slate-200">
                                  {co.title}
                                  <span className="ms-2"><StatusPill kind="changeOrder" status={co.status} /></span>
                                </span>
                                <span className="flex items-center gap-3">
                                  <span className="num text-slate-600 dark:text-slate-300">
                                    {(Number(co.valueDelta) || 0) >= 0 ? "+" : "−"}{money(Math.abs(co.valueDelta))}
                                  </span>
                                  {/* ANSWERING IS OFFERED ONLY WHERE IT WOULD BE
                                      ACCEPTED. The route refuses the submitter
                                      (invariant 7) whatever they hold, and this
                                      cannot know who submitted from here alone —
                                      so the button is shown on the right and the
                                      refusal is surfaced in words if it comes. */}
                                  {rights.canApprove && co.status === "submitted" && (
                                    <>
                                      <button className={btn} disabled={busy}
                                        onClick={() => send("change-orders", "PATCH", { id: co.id, action: "approve" })}>
                                        {tr.approve}
                                      </button>
                                      <button className={btnGhost} disabled={busy}
                                        onClick={() => send("change-orders", "PATCH", { id: co.id, action: "reject" })}>
                                        {tr.reject}
                                      </button>
                                    </>
                                  )}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
