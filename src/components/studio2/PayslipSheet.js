"use client";

import { money, fmtDate, btn, btnGhost } from "@/components/studio2/ui";
import { useStudioLocale } from "@/components/studio2/locale";

// ONE PERSON'S PAYSLIP, as a sheet to print — from the line the payroll run
// FROZE (modules/hr/payrollService `payslipDocument`), so a reprint in a year
// reads exactly as the slip did the day it was paid.
//
// THE EMPLOYER'S HEADING carries the country's official values that a payslip
// prints (the server sends only those selected, filled and applicable — a UK
// Studio's PAYE reference, nothing for a country whose file marks none) and then
// the Studio's own legal rows, already cleared of any that repeat one.
//
// EVERY FIGURE ON THE SLIP ADDS UP ON THE SLIP: earnings less deductions is the
// net, the way `payslipFor` builds the line. A part month is shown as the
// deduction it is stored as, beside unpaid leave, because that is how it was
// computed and a slip that hid it would not reconcile.
//
// PRINTING ONLY THE SHEET, on A4. Mounted only while a slip is open, so no other
// page's printing is touched.
const PRINT_CSS = `@media print {
  body * { visibility: hidden !important; }
  .payslip-print, .payslip-print * { visibility: visible !important; }
  .payslip-print { position: absolute; inset-inline-start: 0; top: 0; width: 100%; }
  @page { size: A4; margin: 16mm; }
}`;

function Row({ label, value, strong = false, negative = false }) {
  return (
    <div className={`flex justify-between gap-4 py-1 ${strong ? "font-700" : ""}`}>
      <span>{label}</span>
      <span className="num">{negative && value > 0 ? "−" : ""}{value}</span>
    </div>
  );
}

export default function PayslipSheet({ slip, tr, onClose }) {
  const locale = useStudioLocale();
  const { line, employer } = slip;
  const cur = slip.currency;
  const m = (v) => money(v, cur);
  const allowances = (line.components || []).filter((c) => c.kind === "allowance");
  const recurring = (line.components || []).filter((c) => c.kind === "deduction");
  const earnings = (Number(line.basic) || 0) + (Number(line.allowances) || 0);

  return (
    <div className="space-y-4">
      <style>{PRINT_CSS}</style>
      <div className="payslip-print bg-white p-6 text-sm leading-relaxed text-black">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-black pb-3">
          <div>
            <p className="text-lg font-700">{employer.name}</p>
            {employer.address && <p>{employer.address}</p>}
            {employer.official.map((p) => (
              <p key={p.key}>{(locale === "ar" && p.label.ar) || p.label.en}: {p.value}</p>
            ))}
            {employer.legal.map((r) => <p key={r.key}>{r.key}: {r.value}</p>)}
          </div>
          <div className="text-end">
            <p className="text-lg font-700">{tr.payslipTitle(slip.period)}</p>
            {slip.range && <p>{tr.periodRange(fmtDate(slip.range.from), fmtDate(slip.range.to))}</p>}
            {slip.paidAt ? <p>{tr.paidOn(fmtDate(slip.paidAt))}</p>
              : slip.approvedAt ? <p>{tr.approvedOn(fmtDate(slip.approvedAt))}</p> : null}
          </div>
        </header>

        {/* A SLIP FROM A RUN NOBODY HAS APPROVED SAYS SO ON THE PAPER, the way
            a draft invoice prints DRAFT: its figures can still change. */}
        {slip.status === "Draft" && (
          <p className="mt-3 border border-black px-3 py-1 text-center font-700 tracking-wide">{tr.draftMark}</p>
        )}

        <p className="mt-4"><span className="font-600">{tr.employee}:</span> {line.alias}</p>

        <div className="mt-4 grid gap-6 sm:grid-cols-2 print:grid-cols-2">
          <section>
            <p className="border-b border-black pb-1 font-700">{tr.earnings}</p>
            <Row label={tr.basic} value={m(line.basic)} />
            {allowances.map((c, i) => <Row key={`a${i}`} label={c.label} value={m(c.amount)} />)}
            <div className="mt-1 border-t border-black">
              <Row label={tr.grossPay} value={m(earnings)} strong />
            </div>
          </section>
          <section>
            <p className="border-b border-black pb-1 font-700">{tr.deductionsHead}</p>
            {recurring.map((c, i) => <Row key={`d${i}`} label={c.label} value={m(c.amount)} />)}
            {line.unpaidDeduction > 0 && <Row label={tr.unpaidLeave(line.unpaidDays)} value={m(line.unpaidDeduction)} />}
            {line.notEmployedDeduction > 0 && <Row label={tr.notEmployed(line.notEmployedDays)} value={m(line.notEmployedDeduction)} />}
            {line.ssEmployee > 0 && <Row label={tr.ssEmployee} value={m(line.ssEmployee)} />}
            <div className="mt-1 border-t border-black">
              <Row label={tr.deductions} value={m(line.deductions)} strong />
            </div>
          </section>
        </div>

        {/* A NET BELOW NOUGHT PRINTS AS IT IS — reported, never clamped. */}
        <div className="mt-6 flex justify-between border-y-2 border-black py-2 text-base font-700">
          <span>{tr.netPay}</span>
          <span className="num">{m(line.net)}</span>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className={btnGhost} onClick={onClose}>{tr.close}</button>
        <button type="button" className={btn} onClick={() => window.print()}>{tr.print}</button>
      </div>
    </div>
  );
}
