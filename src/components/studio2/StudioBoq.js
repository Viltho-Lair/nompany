// ONE TENDER'S BILL OF QUANTITIES.
//
// A BESPOKE SCREEN, and named as one in the program design: the BOQ grid is on
// the short list of screens the P4b engine is never to be stretched to cover.
// It is a spreadsheet somebody works down for a day, not a record with a form.
//
// THE ONE THING THIS SCREEN MUST NEVER DO is present the total of a part-priced
// bill as the bid. Forty lines with thirty-eight rates has a total; it is not
// what the studio would charge, and a figure carried into a submission on that
// basis is how work gets won below cost. So `complete` travels with every
// total, from modules/tendering/boq, and the headline says which of the two
// numbers it is showing.
//
// GROUPED IN THE DOCUMENT'S ORDER, never alphabetically. A bill is issued in an
// order — preliminaries, substructure, frame — and an estimator checks it
// against the client's own document line by line; re-sorting it destroys the
// only thing that makes that check possible.
"use client";
import { useCallback, useEffect, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { tenderingDict } from "@/shared/studio/tendering";
import { RecordSkeleton } from "@/components/studio2/RecordSkeleton";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { panel, h2, sub, btn, btnGhost, microLabel, Empty, Dialog, StatTile, money, fmtDateTime } from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";
import { StatusPill } from "@/components/studio2/StatusPill";
import { boqGroups, boqTotals, extension, isPriced } from "@/modules/tendering/boq";
import { refusal } from "@/components/studio2/tenderRefusals";
import StudioTenderDocs from "@/components/studio2/StudioTenderDocs";

const cell = "w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 outline-none focus:border-brand-500 dark:border-white/15 dark:bg-white/5 dark:text-slate-100";

export default function StudioBoq({ slug, tenderId }) {
  const locale = useStudioLocale();
  const tr = tenderingDict(locale);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(null);
  const [picking, setPicking] = useState(null);

  const read = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/tendering/boq?tenderId=${encodeURIComponent(tenderId)}`, { cache: "no-store" });
    return { ok: res.ok, body: await res.json().catch(() => ({})) };
  }, [slug, tenderId]);

  const apply = useCallback(({ ok, body }) => {
    if (!ok) { setError(body.error || "failed"); return; }
    setError("");
    setData(body);
  }, []);

  // The same guarded load the customer page uses, and for the same reason: this
  // is a RECORD page, so it can be pointed at a different tender while the
  // first request is still in the air.
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
    const res = await fetch(`/api/studios/${slug}/tendering/boq`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(out.error || "failed"); return false; }
    await reload();
    return true;
  }, [slug, reload]);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <RecordSkeleton loadingLabel={tr.loadingBoq} />;

  const { tender, review, handover } = data;
  // THE BILL IS WHAT WAS BID, once the work became a project. The project's
  // value was copied at handover and its sheets follow these lines LIVE, so an
  // edit here would move what the buyers work from and leave the project's
  // headline figure behind it. `frozen` comes from the server, which refuses
  // the same writes this hides.
  const canEdit = data.canEdit && !data.frozen;
  const lines = data.lines || [];
  const rates = data.rates || [];
  // TOTALLED WITH THE SERVER'S OWN FUNCTION. The route sends `totals` too; this
  // recomputes from the lines on screen so an optimistic edit reads correctly
  // before the reload lands, and the two cannot disagree because they are one
  // function.
  const totals = boqTotals(lines);
  const groups = boqGroups(lines);

  const saveCell = (line, patch) => send("PUT", { id: line.id, ...patch });

  // THE HANDOVER POSTS TO PROJECTS. It is the only call this screen makes
  // outside /tendering, and deliberately so: opening the project is Projects'
  // act, taken through the same route and the same guard every other project
  // creation takes.
  const handOver = async () => {
    setError(""); setBusy(true);
    const res = await fetch(`/api/studios/${slug}/projects`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenderId }),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(refusal(tr, out.error || "failed")); return; }
    // RELOADED IN PLACE rather than redirected. The block then says what the
    // tender became and offers a link to it, which leaves the person on the
    // page that answers "what did we bid" beside the one that answers "what do
    // we now deliver" — and it is the same state anybody arriving later sees,
    // so there is only one rendering of a handed-over tender to get right.
    await reload();
  };

  const addLine = async () => {
    const done = await send("POST", {
      tenderId,
      group: adding.group, code: adding.code, description: adding.description,
      unit: adding.unit, qty: Number(adding.qty) || 0, rate: Number(adding.rate) || 0,
    });
    if (done) setAdding(null);
  };

  return (
    <div className="space-y-6">
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

      <div>
        <a href={`/${slug}/tendering-register`} className="text-sm text-brand-700 hover:underline dark:text-brand-300">
          ← {tr.backToRegister}
        </a>
        <h2 className={`${h2} mt-2`}>{tender?.title}</h2>
        <p className={sub}>
          <span className="font-mono text-xs">{tender?.ref}</span>
          {tender?.issuer && <> · {tender.issuer}</>}
          {" · "}<StatusPill kind="tenderStage" status={tender?.status} />
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className={panel}>
          {/* THE HEADLINE, AND THE HONEST LABEL UNDER IT. `complete` is what
              separates "the bill totals this much" from "this is our bid". */}
          <StatTile label={tr.billTotal} value={<span className="num">{money(totals.total)}</span>}
            sub={totals.complete ? tr.fullyPriced : tr.nUnpriced(totals.unpriced)}
            tone={totals.complete ? "text-emerald-600 dark:text-emerald-400" : "text-amber-700 dark:text-amber-300"} />
        </div>
        <div className={panel}>
          <StatTile label={tr.colDescription} value={<span className="num">{totals.lines}</span>}
            sub={tr.boq} accent="rgb(var(--chart-2))" />
        </div>
        <div className={panel}>
          <StatTile label={tr.estimatedValue} value={<span className="num">{money(tender?.estimatedValue)}</span>}
            sub={tender?.currency || ""} accent="rgb(var(--chart-3))" />
        </div>
      </div>

      {/* SAID, NOT JUST ENFORCED. A grid that has quietly stopped accepting
          edits reads as broken; one that says the bill is now the project's
          baseline reads as a rule. */}
      {data.frozen && (
        <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-600 text-slate-700 dark:bg-white/5 dark:text-slate-200">
          {tr.billFrozen}
        </p>
      )}

      {!totals.complete && totals.lines > 0 && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-600 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
          {tr.notTheBidYet}
        </p>
      )}

      {/* ---- the bid review -------------------------------------------
          WHY IT SITS WITH THE BILL and not on the register: the thing being
          signed IS the price, and a reviewer asked to commit the company to a
          number needs that number in front of them rather than a row in a list.

          THE BUTTON IS DRAWN ONLY WHERE PRESSING IT WOULD SUCCEED. `review.next`
          comes from `availableBidApproval`, which asks every question
          `approveBid` asks — the raiser never signs, nobody signs twice on one
          record, the step must be outstanding, and they must hold its right. A
          screen checking fewer of them offers buttons that refuse; one checking
          them here would be a second copy of the rule, free to drift. */}
      {review && (
        <section className={panel}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className={h2}>{tr.bidReview}</h2>
              <p className={sub}>{tr.bidReviewSub}</p>
            </div>
            {review.next && (
              <button type="button" className={btn} disabled={busy}
                onClick={async () => { await send("PUT", { id: tenderId, approve: true }); }}>
                {tr.signStep(review.next.label)}
              </button>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <span>
              <span className={microLabel}>{tr.bidValue}</span>
              <span className="num text-xl font-800 text-slate-900 dark:text-white">{money(review.value.amount)}</span>
            </span>
            {/* THE BASIS TRAVELS WITH THE NUMBER, because the bill's total and
                the typed estimate are the same digits and mean entirely
                different things. */}
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {review.value.basis === "boq" ? tr.fromTheBill : tr.fromTheEstimate}
            </span>
            {review.plan?.rate != null && (
              <span className="text-xs text-slate-400">{tr.convertedAt(String(review.plan.rate))}</span>
            )}
          </div>

          {review.plan?.stale && (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{tr.ratesAreStale}</p>
          )}

          {review.blocked ? (
            <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm font-600 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
              {refusal(tr, review.blocked)}
            </p>
          ) : (
            <>
              <p className={`mt-3 text-sm font-600 ${review.approved ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-300"}`}>
                {tr.nOfMSigned(review.signed, review.required)} · {review.approved ? tr.bidApproved : tr.awaitingSignature}
              </p>
              {/* EVERY STEP, SIGNED OR NOT, in the order they must be walked —
                  so somebody looking at a half-signed bid can see what it is
                  still waiting for rather than only how far it has come. The
                  step LABEL is tenant-authored and never translated. */}
              <ol className="mt-3 space-y-2">
                {(review.plan?.steps || []).map((step) => {
                  const sig = (tender?.approvals || []).find((a) => a.permission === step.permission);
                  return (
                    <li key={step.permission} className="flex flex-wrap items-baseline justify-between gap-2 border-s-2 ps-3 text-sm"
                      style={{ borderInlineStartColor: sig ? "rgb(16 185 129)" : "rgb(148 163 184 / 0.4)" }}>
                      <span className="text-slate-800 dark:text-slate-100">
                        {step.label}
                        {step.from > 0 && <span className="ms-2 num text-xs text-slate-400">≥ {money(step.from)}</span>}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {sig ? `${sig.byAlias || "—"} · ${fmtDateTime(sig.at)}` : tr.stepUnsigned}
                      </span>
                    </li>
                  );
                })}
              </ol>
              {/* Said rather than left as an absent button: somebody who raised
                  the tender and holds the right will otherwise look for one. */}
              {!review.next && !review.approved && review.mine && (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{tr.cannotSignOwnBid}</p>
              )}
            </>
          )}
        </section>
      )}

      {/* ---- the handover ----------------------------------------------
          WHAT A WON TENDER BECAME, and the one control that makes it one.
          It sits under the bid review because the sequence is the studio's:
          price it, sign it, send it, win it, deliver it — and each of those
          four blocks is on this page in that order.

          THE BUTTON POSTS TO PROJECTS, not to Tendering, because the act is
          opening a project. `tenderSource` is a head of `openProject` for the
          reason that file states: everything below the split — the row, the
          two sheets, the engagement, the manager notification — must not be
          written by a second create path. */}
      {handover && (
        <section className={panel}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className={h2}>{tr.handover}</h2>
              <p className={sub}>{tr.handoverSub}</p>
            </div>
            {handover.canHandOver && (
              <button type="button" className={btn} disabled={busy} onClick={handOver}>
                {tr.handOverNow}
              </button>
            )}
          </div>

          {handover.projectId ? (
            <div className="mt-3">
              <p className="text-sm font-600 text-emerald-700 dark:text-emerald-400">{tr.becameProject}</p>
              <p className="mt-1 text-sm text-slate-800 dark:text-slate-100">
                {handover.projectNumber
                  ? <span className="font-mono text-xs text-slate-400">{handover.projectNumber}</span>
                  : null}
                <span className={handover.projectNumber ? "ms-2" : ""}>{handover.projectTitle}</span>
              </p>
              {!handover.projectNumber && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{tr.projectNotNumberedYet}</p>
              )}
              <a href={`/${slug}/projects-list/${handover.projectId}`}
                className="mt-2 inline-block text-sm text-brand-700 hover:underline dark:text-brand-300">
                {tr.openTheProject} →
              </a>
            </div>
          ) : handover.canHandOver ? (
            // SAID BEFORE IT HAPPENS, because the figure is the point of the
            // whole handover and it is not the one on the tender's own form.
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{tr.handoverValueNote}</p>
          ) : (
            <p className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-white/5 dark:text-slate-300">
              {refusal(tr, handover.blocked)}
            </p>
          )}
        </section>
      )}

      {lines.length === 0 ? <Empty title={tr.noLinesYet} body={tr.noLinesBody} /> : (
        <div className="space-y-4">
          {groups.map((g) => (
            <section key={g.group || "—"} className={`${panel} !p-0 overflow-hidden`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 px-5 py-3 dark:border-white/10">
                <p className={microLabel}>{g.group || tr.ungrouped}</p>
                <p className="num text-sm font-700 text-slate-900 dark:text-white">
                  {money(g.totals.total)}
                  {!g.totals.complete && (
                    <span className="ms-2 text-[11px] font-600 text-amber-700 dark:text-amber-300">
                      {tr.nUnpriced(g.totals.unpriced)}
                    </span>
                  )}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-start dark:border-white/5">
                      {[tr.colCode, tr.colDescription, tr.colUnit, tr.colQty, tr.colRate, tr.colAmount].map((head, i) => (
                        <th key={head} className={`px-3 py-2 font-600 text-slate-500 dark:text-slate-400 ${i >= 3 ? "text-end" : "text-start"}`}>{head}</th>
                      ))}
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {g.lines.map((line) => (
                      <tr key={line.id} className="border-b border-slate-50 last:border-0 dark:border-white/5">
                        <td className="px-3 py-1.5 font-mono text-xs text-slate-400">{line.code || "—"}</td>
                        <td className="px-3 py-1.5 text-slate-800 dark:text-slate-100">
                          {line.description}
                          {/* WHERE THE RATE CAME FROM, when it came from the
                              library. The number is the line's own copy; this
                              only says which row it started as. */}
                          {line.rateId && (
                            <span className="ms-2 rounded-full bg-brand-500/10 px-1.5 py-0.5 text-[10px] font-600 text-brand-700 dark:text-brand-300">
                              {tr.fromLibrary}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-slate-500 dark:text-slate-400">{line.unit || "—"}</td>
                        <td className="px-3 py-1.5 text-end">
                          {canEdit ? (
                            <input className={`${cell} w-24 text-end`} defaultValue={line.qty} inputMode="decimal"
                              aria-label={`${tr.colQty} ${line.code || line.description}`}
                              onBlur={(e) => { const v = Number(e.target.value) || 0; if (v !== line.qty) saveCell(line, { qty: v }); }} />
                          ) : <span className="num">{line.qty}</span>}
                        </td>
                        <td className="px-3 py-1.5 text-end">
                          {canEdit ? (
                            <span className="flex items-center justify-end gap-1.5">
                              <input className={`${cell} w-28 text-end ${isPriced(line) ? "" : "border-amber-400 dark:border-amber-500/50"}`}
                                defaultValue={line.rate || ""} inputMode="decimal"
                                aria-label={`${tr.colRate} ${line.code || line.description}`}
                                onBlur={(e) => { const v = Number(e.target.value) || 0; if (v !== line.rate) saveCell(line, { rate: v }); }} />
                              {rates.length > 0 && (
                                <button type="button" className="shrink-0 text-[11px] font-600 text-brand-700 hover:underline dark:text-brand-300"
                                  onClick={() => setPicking(line)}>{tr.pickRate}</button>
                              )}
                            </span>
                          ) : <span className="num">{line.rate ? money(line.rate) : "—"}</span>}
                        </td>
                        <td className="px-3 py-1.5 text-end">
                          {/* An unpriced line shows a dash, not 0.00: nought is
                              a price and this line has none. */}
                          {isPriced(line)
                            ? <span className="num font-600 text-slate-900 dark:text-white">{money(extension(line))}</span>
                            : <span className="text-amber-700 dark:text-amber-300">—</span>}
                        </td>
                        <td className="px-3 py-1.5 text-end">
                          {canEdit && (
                            <button type="button" className="text-xs text-slate-400 hover:text-rose-600 dark:hover:text-rose-300"
                              disabled={busy} onClick={() => send("DELETE", { id: line.id })}>{tr.deleteLine}</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}

      {canEdit && (
        <button type="button" className={btn}
          onClick={() => setAdding({ group: "", code: "", description: "", unit: "", qty: "", rate: "" })}>
          {tr.addLine}
        </button>
      )}

      {/* THE PACK AND THE QUESTIONS, BENEATH THE BILL THEY ARE ABOUT.
          A SEPARATE COMPONENT WITH ITS OWN FETCH, deliberately: the bill
          is the busier route and it stays at the hop count its golden
          pins, while the paperwork’s own route reads the lines it needs
          to answer the one question the bill cannot ask itself — whether
          anything arrived after the last line was priced. */}
      <StudioTenderDocs slug={slug} tenderId={tenderId} />

      {adding && (
        <Dialog title={tr.addLine} onClose={() => setAdding(null)} width="max-w-[680px]">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[1fr,9rem]">
              <Field label={tr.colGroup} value={adding.group}
                onChange={(v) => setAdding((a) => ({ ...a, group: v }))} inputProps={{ maxLength: 120 }} />
              <Field label={tr.colCode} value={adding.code}
                onChange={(v) => setAdding((a) => ({ ...a, code: v }))} inputProps={{ maxLength: 40 }} />
            </div>
            <Field label={tr.colDescription} required as="textarea" value={adding.description}
              onChange={(v) => setAdding((a) => ({ ...a, description: v }))} inputProps={{ maxLength: 1000 }} />
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={tr.colUnit} value={adding.unit}
                onChange={(v) => setAdding((a) => ({ ...a, unit: v }))} inputProps={{ maxLength: 24 }} />
              <Field label={tr.colQty} type="number" value={adding.qty}
                onChange={(v) => setAdding((a) => ({ ...a, qty: v }))} inputProps={{ min: "0", step: "0.01" }} />
              <Field label={tr.colRate} type="number" value={adding.rate}
                onChange={(v) => setAdding((a) => ({ ...a, rate: v }))} inputProps={{ min: "0", step: "0.01" }} />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={() => setAdding(null)}>{tr.cancel}</button>
              <button type="button" className={btn} disabled={busy || !adding.description?.trim()}
                onClick={addLine}>{tr.save}</button>
            </div>
          </div>
        </Dialog>
      )}

      {picking && (
        <Dialog title={tr.pickRate} description={tr.ratesSub} onClose={() => setPicking(null)} width="max-w-[620px]">
          <ul className="max-h-[60vh] divide-y divide-slate-100 overflow-y-auto dark:divide-white/5">
            {rates.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <span className="min-w-0">
                  <span className="font-mono text-xs text-slate-400">{r.code}</span>
                  <span className="ms-2 text-sm text-slate-800 dark:text-slate-100">{r.description}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="num text-sm font-600 text-slate-900 dark:text-white">
                    {money(r.rate)}{r.unit && <span className="ms-1 text-xs font-400 text-slate-400">/{r.unit}</span>}
                  </span>
                  {/* COPIED, WITH ITS PROVENANCE. The number lands on the line
                      and `rateId` records which row it came from; the line does
                      not follow the library afterwards. */}
                  <button type="button" className={btn} disabled={busy}
                    onClick={async () => {
                      const done = await send("PUT", {
                        id: picking.id, rate: r.rate, rateId: r.id,
                        unit: picking.unit || r.unit,
                      });
                      if (done) setPicking(null);
                    }}>{tr.applyRate}</button>
                </span>
              </li>
            ))}
          </ul>
        </Dialog>
      )}
    </div>
  );
}
