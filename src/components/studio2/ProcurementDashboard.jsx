// THE PROCUREMENT DASHBOARD — the section's six registers, answered at once.
//
// EVERY TILE IS A REGISTER'S OWN NUMBER, computed server-side by the pure model
// that owns it. Nothing is recounted here: a dashboard with arithmetic of its
// own is a second answer free to disagree with the screen it summarises, which
// is what `salesAnalytics` did before the pipeline registry took its copies
// away.
//
// A BLOCK THE READER MAY NOT OPEN IS NOT DRAWN, and was never read either —
// `may` comes from the server. So this screen cannot become a way to see what
// the registers themselves refuse, and somebody holding one register sees one
// group of tiles rather than an empty grid of six.
"use client";
import { useCallback, useEffect, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { procurementDict } from "@/shared/studio/procurement";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { h2, sub, Empty, StatTile, money } from "@/components/studio2/ui";
import { StatRow, DashGrid, Widget, DashEmpty, DonutLegend } from "@/components/dashboard";
import { BarList } from "@/components/charts";
import { useWidgetVisible } from "@/components/studio2/analyticsLevel";

// NAMED `*Dashboard.jsx` DELIBERATELY, and not only for tidiness: Gate A scans
// exactly that filename pattern for the widget-gate calls below, to prove every
// key in the registry is actually drawn by something. A dashboard called
// anything else is invisible to that check, and its registry key would sit in
// the tier editor gating nothing.
//
// That scan reads a CHARACTER CLASS which includes the dot, so writing the call
// shape out in prose here — with an ellipsis standing in for the key — made the
// ellipsis itself look like a widget key and failed the check's other half. The
// second comment in this codebase to trip the guard it was explaining.
export default function ProcurementDashboard({ slug }) {
  const tr = procurementDict(useStudioLocale());
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  // ANALYTICS IS SOLD, so the one paid widget asks the registry whether this
  // studio's tier includes it. The exception tiles above are the free floor and
  // are never gated: a studio that cannot see its own over-billed orders
  // because it did not buy analytics is being sold its own problems back.
  // IT RETURNS A PREDICATE, not an answer. Calling it with the key gives back
  // the function itself, which is truthy, so the gate would never close and the
  // paid widget would be free for everybody — silently.
  const widgetVisible = useWidgetVisible();
  const showRanking = widgetVisible("procurement.on-time-by-supplier");

  const read = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/procurement/dashboard`, { cache: "no-store" });
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
  // THE SECTIONS THIS SUMMARY IS ACTUALLY BUILT FROM. `procurement` reaches its
  // own four registers — requisitions, supplier quotes, subcontracts, suppliers —
  // through the parent fan-out in LiveProvider. The other two are FOREIGN and
  // have to be named: purchase orders and goods receipts are counted from
  // Inventory's Project sheets, and the three-way match reads Payables' bills.
  useLiveUpdates(slug, "procurement", reload);
  useLiveUpdates(slug, "inventory-sheets", reload);
  useLiveUpdates(slug, "finance-payables", reload);

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <ScreenSkeleton loadingLabel={tr.loadingDashboard} />;

  const { requisitions, rfq, expediting, receiving, suppliers, subcontracts, onTimeBySupplier } = data;
  const anything = requisitions || rfq || expediting || receiving || suppliers || subcontracts;

  return (
    <div className="space-y-6">
      <div>
        <h2 className={h2}>{tr.dashboard}</h2>
        <p className={sub}>{tr.dashboardSub}</p>
      </div>

      {!anything ? (
        // THE HONEST EMPTY STATE. Not "nothing is happening" — nothing here is
        // theirs to see, which is a different sentence and sends them somewhere
        // else.
        <Empty title={tr.nothingGrantedHere} body={tr.nothingGrantedHereBody} />
      ) : (
        <>
          <StatRow>
            {requisitions && (
              <>
                {/* "at least" WHERE SOME LINES CARRY NO ESTIMATE. The sum of a
                    part-estimated set is a number and is not what is being
                    asked for, which is the caveat `requisitionTotals` carries
                    per request and this inherits rather than drops. */}
                <StatTile label={tr.tileAwaitingApproval} value={requisitions.awaiting}
                  sub={requisitions.awaitingValue
                    ? `${requisitions.awaitingValueComplete ? "" : `${tr.atLeast} `}${money(requisitions.awaitingValue)}`
                    : ""} />
                <StatTile label={tr.tileApprovedToOrder} value={requisitions.approved} />
              </>
            )}
            {rfq && <StatTile label={tr.tileOpenRfqs} value={rfq.open} />}
            {expediting && (
              <>
                <StatTile label={tr.tileLateOrders} value={expediting.late}
                  tone={expediting.late > 0 ? "text-amber-600 dark:text-amber-300" : undefined} />
                <StatTile label={tr.tileUnchased} value={expediting.unchased}
                  tone={expediting.unchased > 0 ? "text-rose-600 dark:text-rose-300" : undefined} />
              </>
            )}
            {receiving && (
              <>
                <StatTile label={tr.tileAwaitingDelivery} value={receiving.awaitingDelivery} />
                {/* NULL IS NOT NOUGHT. Without the payables right no bill was
                    read, so this reader has not been shown a finding — the tile
                    says withheld rather than claiming a clean sheet. */}
                <StatTile label={tr.tileOverBilled}
                  value={receiving.overBilled === null ? tr.blockHidden : receiving.overBilled}
                  tone={receiving.overBilled > 0 ? "text-rose-600 dark:text-rose-300" : undefined} />
              </>
            )}
            {suppliers && (
              <>
                <StatTile label={tr.tileBlockedSuppliers} value={suppliers.blocked}
                  tone={suppliers.blocked > 0 ? "text-rose-600 dark:text-rose-300" : undefined} />
                <StatTile label={tr.tileLapsedSuppliers} value={suppliers.lapsed}
                  tone={suppliers.lapsed > 0 ? "text-rose-600 dark:text-rose-300" : undefined} />
                <StatTile label={tr.tileExpiringDocs} value={suppliers.expiring}
                  tone={suppliers.expiring > 0 ? "text-amber-600 dark:text-amber-300" : undefined} />
              </>
            )}
            {subcontracts && (
              <>
                <StatTile label={tr.tileLiveSubcontracts} value={subcontracts.live} />
                <StatTile label={tr.tileRetentionHeld} value={money(subcontracts.retentionHeld)} />
              </>
            )}
          </StatRow>

          {/* THE PAID HALF (10/09/2026) — the blocks the tiles above count, drawn
              as shapes. EACH WIDGET EXISTS ONLY WHEN ITS BLOCK DOES: a block the
              reader may not open was never read (see modules/procurement/
              dashboard), so there is nothing here to draw for them either. */}
          <DashGrid>
            {suppliers && (
              <Widget title={tr.dashSupplierHealth} hint={tr.dashSupplierHealthHint}
                locked={!widgetVisible("procurement.supplier-health")} lockedWhat={tr.dashSupplierHealth}>
                {suppliers.total ? (
                  // ONE STATE PER SUPPLIER (supplierQualification), so these are
                  // slices of a whole; qualified is what is left over.
                  <DonutLegend word={tr.dashSuppliersWord} data={[
                    { label: tr.dashQualified, value: Math.max(0, suppliers.total - suppliers.blocked - suppliers.lapsed - suppliers.expiring - suppliers.unassessed), color: "rgb(var(--chart-2))" },
                    { label: tr.dashExpiring, value: suppliers.expiring, color: "rgb(var(--chart-4))" },
                    { label: tr.dashLapsed, value: suppliers.lapsed, color: "rgb(var(--chart-3))" },
                    { label: tr.dashBlocked, value: suppliers.blocked, color: "rgb(var(--chart-5))" },
                    { label: tr.dashUnassessed, value: suppliers.unassessed, color: "rgb(var(--chart-1))" },
                  ]} />
                ) : <DashEmpty text={tr.dashNothingInFlight} />}
              </Widget>
            )}
            {expediting && (
              <Widget title={tr.dashDeliveryStatus} hint={tr.dashDeliveryStatusHint}
                locked={!widgetVisible("procurement.delivery-status")} lockedWhat={tr.dashDeliveryStatus}>
                <CountBars empty={tr.dashNothingInFlight} rows={[
                  { label: tr.dashLate, value: expediting.late, color: "rgb(var(--chart-3))" },
                  { label: tr.dashDueSoon, value: expediting.dueSoon, color: "rgb(var(--chart-4))" },
                  { label: tr.dashUnchased, value: expediting.unchased, color: "rgb(var(--chart-5))" },
                  { label: tr.dashUndated, value: expediting.undated, color: "rgb(var(--chart-1))" },
                ]} />
              </Widget>
            )}
            {receiving && (
              <Widget title={tr.dashReceivingExceptions} hint={tr.dashReceivingExceptionsHint}
                locked={!widgetVisible("procurement.receiving-exceptions")} lockedWhat={tr.dashReceivingExceptions}>
                <CountBars empty={tr.dashNothingInFlight} rows={[
                  { label: tr.dashAwaitingDelivery, value: receiving.awaitingDelivery, color: "rgb(var(--chart-1))" },
                  { label: tr.dashPartDelivered, value: receiving.partDelivered, color: "rgb(var(--chart-4))" },
                  { label: tr.dashOverReceived, value: receiving.overReceived, color: "rgb(var(--chart-5))" },
                  { label: tr.dashRejected, value: receiving.rejected, color: "rgb(var(--chart-3))" },
                  // NULL IS WITHHELD, NOT NOUGHT — see the tile above. No bills
                  // were read, so there is no over-billing finding to draw.
                  ...(receiving.overBilled === null ? [] : [{ label: tr.dashOverBilled, value: receiving.overBilled, color: "rgb(var(--chart-3))" }]),
                ]} />
              </Widget>
            )}
          {onTimeBySupplier && (
              <Widget title={tr.onTimeRanking} hint={tr.onTimeRankingHint} span={2}
                locked={!showRanking} lockedWhat={tr.onTimeRanking}>
                {!onTimeBySupplier.length ? (
                  <p className="text-xs text-slate-400">{tr.noOnTimeYet}</p>
                ) : (
                  <ul className="space-y-2">
                    {onTimeBySupplier.map((r) => (
                      <li key={r.vendorId} className="flex items-center gap-3">
                        <span className="w-40 shrink-0 truncate text-sm text-slate-700 dark:text-slate-200">
                          {r.name}
                        </span>
                        <span className="h-2 flex-1 rounded-full bg-slate-100 dark:bg-white/5">
                          <span
                            className={`block h-2 rounded-full ${
                              r.percent >= 90 ? "bg-emerald-500"
                                : r.percent >= 70 ? "bg-amber-500" : "bg-rose-500"
                            }`}
                            style={{ width: `${Math.max(2, r.percent)}%` }} />
                        </span>
                        <span className="num w-12 shrink-0 text-end text-sm font-600 text-slate-900 dark:text-white">
                          {r.percent}%
                        </span>
                        <span className="w-20 shrink-0 text-end text-xs text-slate-400">
                          {tr.judgedOrders(r.judged)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Widget>
          )}          </DashGrid>
        </>
      )}
    </div>
  );
}

// A COUNT PER ROW, bars relative to the largest. These rows OVERLAP — an order
// can be late and never chased at once — so they are bars and never a donut,
// whose slices would claim to add up to a whole they do not make.
function CountBars({ rows, empty }) {
  const max = Math.max(0, ...rows.map((r) => r.value || 0));
  if (!max) return <DashEmpty text={empty} />;
  return (
    <BarList items={rows.map((r) => ({
      label: r.label, value: Math.round(((r.value || 0) / max) * 100),
      display: <span className="num">{r.value || 0}</span>, color: r.color,
    }))} />
  );
}
