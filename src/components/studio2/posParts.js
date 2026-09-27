"use client";

// THE TILL'S PRINTED PIECES, shared by the till and the Point of Sale
// department's screens (17/09/2026) — so a reprint from the Sales list or a
// report opened from the shift history is the same slip the till printed.

import { useMemo, useState } from "react";
import Barcode from "@/components/studio2/Barcode";
import { useStudioLocale } from "@/components/studio2/locale";
import { money, fmtDate, fmtDateTime, btnRow } from "@/components/studio2/ui";
import { PERIODS, periodRange } from "@/modules/sales/posReports";
import { dayIn } from "@/shared/timezone";

// PRINTING ONLY THE SLIP. Mounted only while a receipt or a report is on screen,
// so no other page's printing is touched by an 80 mm page size.
// `.pos-print-only` holds a slip that is printed WITHOUT being shown — the
// till's one-click reprint and its test print (27/09/2026). It is `hidden` on
// screen and shown here, so the dialog-free print lays out exactly as the
// dialog's does.
export const PRINT_CSS = `@media print {
  .pos-print-only { display: block !important; }
  /* NO TRANSITIONS WHEN PRINTING: visibility is animatable, and a field label
     with transition-all was still mid-way to hidden when the page was laid out
     for print, so it printed beside the slip (measured 27/09/2026). */
  *, *::before, *::after { transition: none !important; }
  body * { visibility: hidden !important; }
  .pos-print, .pos-print * { visibility: visible !important; }
  .pos-print { position: absolute; inset-inline-start: 0; top: 0; width: 72mm; }
  @page { size: 80mm auto; margin: 4mm; }
}`;

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// THE SLIP, laid out for an 80 mm printer. It prints what the server stored —
// never the basket — so a reprint reads exactly as the first.
// `test`: a slip the till printed WITHOUT a sale (27/09/2026). It says so at
// the head and the foot, where it cannot be torn off, and carries no number and
// no barcode — a scanned test slip must find nothing to return.
export function Receipt({ tr, receipt, studio, terms, tillName, test = false }) {
  const locale = useStudioLocale();
  const cur = receipt.currency;
  const line = "flex justify-between gap-2";
  return (
    <div className="pos-print mx-auto max-w-[300px] bg-white p-3 font-mono text-[12px] leading-snug text-black">
      <div className="text-center">
        <p className="text-[14px] font-bold">{studio.name}</p>
        {/* The country's official values first (the server sends only what
            is selected, filled and applies), then the Studio's own legal rows,
            already cleared of any that repeat one. */}
        {(studio.official || []).map((p) => <p key={p.key}>{(locale === "ar" && p.label.ar) || p.label.en}: {p.value}</p>)}
        {(studio.legal || []).map((r) => <p key={r.key}>{r.key}: {r.value}</p>)}
        {test
          ? <p className="mt-1 border border-black py-1 font-bold">{tr.testPrintBanner}</p>
          : <p className="mt-1">{tr.receipt} {receipt.number}</p>}
        <p>{fmtDateTime(receipt.at)}</p>
        {tillName && <p>{tr.till}: {tillName}</p>}
      </div>
      <hr className="my-2 border-dashed border-black" />
      {receipt.lines.map((l, i) => (
        <div key={i} className="mb-1">
          <p>{l.description}{l.taxCategory ? ` (${taxDictShort(l.taxCategory)})` : ""}</p>
          <p className={line}><span>{l.count} × {money(l.price, cur)}</span><span>{money(l.gross ?? l.count * l.price, cur)}</span></p>
          {/* A LINE'S OWN DISCOUNT is printed on the line; the basket's share is
              printed once, below, as the customer was offered it. */}
          {/* THE SHOP'S OFFERS, EACH BY NAME AND BEFORE THE CASHIER'S DISCOUNT,
              because that is the order they were taken in. A customer reading
              the slip can see which offer earned them what. */}
          {(l.promotions || []).map((a, j) => (
            <p key={`${a.promotionId}:${j}`} className={line}>
              <span>{(locale === "ar" && a.promotionNameAr) || a.promotionName}</span>
              <span>−{money(a.discount, cur)}</span>
            </p>
          ))}
          {l.lineDiscount > 0 && (
            <p className={line}>
              <span>{tr.discount}{l.discount?.kind === "percent" ? ` ${l.discount.value}%` : ""}</span>
              <span>−{money(l.lineDiscount, cur)}</span>
            </p>
          )}
        </div>
      ))}
      {/* AN OFFER ON THE WHOLE SALE has no line to sit on, so it is named once
          here — the same place the basket's own discount is printed. */}
      {(receipt.promotions || []).filter((a) => !a.lineKey).map((a, i) => (
        <p key={`${a.promotionId}:${i}`} className={line}>
          <span>{(locale === "ar" && a.promotionNameAr) || a.promotionName}</span>
          <span>−{money(a.discount, cur)}</span>
        </p>
      ))}
      {receipt.basketDiscount > 0 && (
        <p className={line}>
          <span>{tr.basketDiscount}{receipt.discount?.kind === "percent" ? ` ${receipt.discount.value}%` : ""}</span>
          <span>−{money(receipt.basketDiscount, cur)}</span>
        </p>
      )}
      <hr className="my-2 border-dashed border-black" />
      <p className={line}><span>{tr.subtotal}</span><span>{money(receipt.subtotal, cur)}</span></p>
      {(receipt.breakdown || []).filter((b) => b.rate > 0).map((b) => (
        <p key={b.rate} className={line}><span>{tr.tax(terms.taxName, b.rate)}</span><span>{money(b.tax, cur)}</span></p>
      ))}
      <p className={`${line} text-[14px] font-bold`}><span>{tr.total}</span><span>{money(receipt.total, cur)} {cur}</span></p>
      {receipt.pricesIncludeTax && <p>{tr.taxIncluded}</p>}
      <hr className="my-2 border-dashed border-black" />
      {receipt.payments.map((p, i) => (
        <p key={i} className={line}><span>{tr.paidBy(p.method)}{p.reference ? ` ${p.reference}` : ""}</span><span>{money(p.amount, cur)}</span></p>
      ))}
      {receipt.change > 0 && <p className={line}><span>{tr.change}</span><span>{money(receipt.change, cur)}</span></p>}
      {/* WHAT THEY SAVED IS EVERYTHING THEY SAVED — the shop's offers and the
          cashier's discount together. The slip separates them above; this line
          is the one figure the customer came for. */}
      {(receipt.discountTotal > 0 || receipt.promotionDiscount > 0) && (
        <p className="mt-2 text-center font-bold">
          {tr.youSaved} {money(num(receipt.discountTotal) + num(receipt.promotionDiscount), cur)} {cur}
        </p>
      )}
      <p className="mt-3 text-center">{terms.footer || tr.thankYou}</p>
      {/* THE NUMBER AS A BARCODE, so a return finds this sale by scanning the slip. */}
      {test
        ? <p className="mt-2 border border-black py-1 text-center font-bold">{tr.testPrintBanner}</p>
        : <div className="mt-2 flex justify-center"><Barcode value={receipt.number} height={36} module={1.2} /></div>}
    </div>
  );
}

// The short tag a zero-rated or exempt line carries on a slip, where a chip
// cannot be drawn.
const taxDictShort = (c) => (c === "zero" ? "0%" : c === "exempt" ? "E" : "");

export function ShiftReport({ tr, shift, report, studio, currency, tillName }) {
  const line = "flex justify-between gap-2";
  const diff = report.difference;
  return (
    <div className="pos-print mx-auto max-w-[300px] bg-white p-3 font-mono text-[12px] leading-snug text-black">
      <div className="text-center">
        <p className="text-[14px] font-bold">{studio.name}</p>
        <p>{tr.report} {shift.number}</p>
        {tillName && <p>{tr.till}: {tillName}</p>}
        <p>{fmtDateTime(shift.openedAt)} → {fmtDateTime(shift.closedAt)}</p>
      </div>
      <hr className="my-2 border-dashed border-black" />
      <p className={line}><span>{tr.sales(report.sales)}</span><span>{money(report.total, currency)}</span></p>
      <p className={line}><span>{tr.subtotal}</span><span>{money(report.subtotal, currency)}</span></p>
      {report.byTax.filter((b) => b.rate > 0).map((b) => (
        <p key={b.rate} className={line}><span>{b.rate}%</span><span>{money(b.tax, currency)}</span></p>
      ))}
      <hr className="my-2 border-dashed border-black" />
      {report.byMethod.map((m) => (
        <p key={m.method} className={line}><span>{tr.paidBy(m.method)}</span><span>{money(m.amount, currency)}</span></p>
      ))}
      <p className={line}><span>{tr.changeGiven}</span><span>{money(report.change, currency)}</span></p>
      {report.discounts > 0 && <p className={line}><span>{tr.discounts}</span><span>{money(report.discounts, currency)}</span></p>}
      {/* RETURNS PAID OUT OF THIS DRAWER — the cash part is already out of the expected figure. */}
      {(report.refundsByMethod || []).map((m) => (
        <p key={m.method} className={line}><span>{tr.refunded} · {tr.paidBy(m.method)}</span><span>−{money(m.amount, currency)}</span></p>
      ))}
      <hr className="my-2 border-dashed border-black" />
      <p className={line}><span>{tr.openingFloat}</span><span>{money(report.openingFloat, currency)}</span></p>
      <p className={line}><span>{tr.cashTaken}</span><span>{money(report.cashTaken, currency)}</span></p>
      <p className={`${line} font-bold`}><span>{tr.expectedCash}</span><span>{money(report.expectedCash, currency)}</span></p>
      {report.countedCash !== null && (
        <>
          <p className={line}><span>{tr.countedCash}</span><span>{money(report.countedCash, currency)}</span></p>
          <p className={`${line} font-bold`}><span>{tr.difference}</span><span>{money(diff, currency)}</span></p>
          <p className="mt-1 text-center">{diff > 0 ? tr.drawerOver : diff < 0 ? tr.drawerShort : tr.drawerExact}</p>
        </>
      )}
    </div>
  );
}

// ---- the period, shared by the dashboard, the Sales list and the shift history

// A PERIOD AND HOW FAR BACK: "this week" is { period: "week", offset: 0 },
// last month { period: "month", offset: -1 }. Today by default — the owner's
// choice (17/09/2026). The range is worked out HERE, ON THE STUDIO'S CLOCK
// (modules/sales/posReports, shared/timezone), and the server is handed two
// instants. It was the reader's device clock, which put a manager abroad in a
// different "today" from the counter and its offers. `timezone` is the
// studio's, handed down by the page; none set reads UTC, as the offers do.
export function usePosPeriod(initial = "day", timezone = "") {
  const zone = timezone || "UTC";
  const [state, setState] = useState({ period: initial, offset: 0 });
  const range = useMemo(() => periodRange(state.period, new Date(), state.offset, 0, zone), [state, zone]);
  return {
    ...state,
    range,
    timezone: zone,
    setPeriod: (period) => setState({ period, offset: 0 }),
    step: (by) => setState((s) => ({ ...s, offset: Math.min(0, s.offset + by) })),
  };
}

// What the period reads as: one date for a day, first – last for the rest —
// the studio's calendar dates, not the device's reading of the same instants.
function rangeText(range, period, timezone) {
  const first = fmtDate(dayIn(range.from, timezone));
  const last = fmtDate(dayIn(new Date(new Date(range.to).getTime() - 1), timezone));
  return period === "day" ? first : `${first} – ${last}`;
}

export function PeriodPicker({ tr, value }) {
  const { period, offset, range, setPeriod, step, timezone } = value;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="bar-scroll inline-flex max-w-full overflow-x-auto rounded-full border border-slate-200 p-0.5 dark:border-white/15">
        {PERIODS.map((p) => (
          <button key={p} type="button" onClick={() => setPeriod(p)}
            className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-600 transition-colors ${p === period ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5"}`}>
            {tr.period[p]}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <button type="button" className={btnRow} onClick={() => step(-1)} aria-label={tr.previous}>‹</button>
        <span className="min-w-[9rem] text-center text-sm font-600 text-[var(--geex-ink)]">
          {offset === 0 ? tr.current[period] : rangeText(range, period, timezone)}
        </span>
        <button type="button" className={btnRow} onClick={() => step(1)} disabled={offset === 0} aria-label={tr.next}>›</button>
      </div>
      {offset === 0 && period !== "day" && (
        <span className="text-xs text-slate-500 dark:text-slate-400">{rangeText(range, period, timezone)}</span>
      )}
    </div>
  );
}

/** The query string a list, a summary or a download is asked with. */
export function rangeQuery(range, extra = {}) {
  // NO `tz`: a download's times are the studio's clock, read on the server.
  const q = new URLSearchParams({ from: range.from, to: range.to });
  for (const [k, v] of Object.entries(extra)) {
    const value = Array.isArray(v) ? v.join(",") : String(v ?? "");
    if (value) q.set(k, value);
  }
  return q.toString();
}
