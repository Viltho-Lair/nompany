// NOMPANY'S INVOICE AND CREDIT NOTE AS A PAGE — one self-contained HTML
// document, printable (and saved as PDF) from the browser. Served to the
// studio's owner and to the console by the two invoice routes, never cached.
//
// BILINGUAL ON ONE SHEET, English and Arabic side by side, as Jordanian tax
// invoices commonly are: the same paper has to read for the customer and for
// the tax office, whichever language the studio uses.
//
// NOTHING EXTERNAL: no font, no script, no image from elsewhere, so the page
// renders the same when printed offline and carries no tracking.

import { fmtCurrencyAmount } from "@/lib/pricing";
import type { InvoiceParty, NompanyInvoice } from "@/shared/nompanyInvoice";

const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
const day = (d: string) => (/^\d{4}-\d{2}-\d{2}/.test(d) ? d.slice(0, 10).split("-").reverse().join("/") : esc(d));

function party(title: string, titleAr: string, p: InvoiceParty) {
  return `<div class="party"><h3>${esc(title)} <span class="ar">${esc(titleAr)}</span></h3>
    <p class="strong">${esc(p.name)}</p>
    ${p.address ? `<p>${esc(p.address).replace(/\n/g, "<br>")}</p>` : ""}
    ${p.country ? `<p>${esc(p.country)}</p>` : ""}
    ${p.taxNumber ? `<p>Tax number <span class="ar">الرقم الضريبي</span>: ${esc(p.taxNumber)}</p>` : ""}
    ${p.email ? `<p>${esc(p.email)}</p>` : ""}
  </div>`;
}

export function invoiceHtml(doc: Omit<NompanyInvoice, "buyerSealed"> & { buyer: InvoiceParty }) {
  const credit = doc.kind === "credit-note";
  const m = (n: number) => `${esc(fmtCurrencyAmount(n, doc.currency))} ${esc(doc.currency)}`;
  const title = credit ? "Credit note" : "Tax invoice";
  const titleAr = credit ? "إشعار دائن" : "فاتورة ضريبية";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(title)} ${esc(doc.number)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #f4f4f7; color: #16161d; font: 14px/1.5 system-ui, -apple-system, "Segoe UI", Tahoma, Arial, sans-serif; }
  .sheet { max-width: 820px; margin: 24px auto; background: #fff; padding: 40px; border-radius: 12px; }
  header { display: flex; justify-content: space-between; gap: 24px; flex-wrap: wrap; border-bottom: 2px solid #16161d; padding-bottom: 16px; }
  h1 { margin: 0; font-size: 24px; }
  h3 { margin: 0 0 6px; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: #6b6b7b; }
  p { margin: 2px 0; }
  .ar { font-weight: 400; direction: rtl; unicode-bidi: isolate; }
  .strong { font-weight: 600; }
  .meta { text-align: end; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 24px 0; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 8px 6px; border-bottom: 1px solid #e6e6ee; text-align: start; vertical-align: top; }
  th { font-size: 12px; color: #6b6b7b; font-weight: 600; }
  td.num, th.num { text-align: end; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .totals { margin-top: 16px; margin-inline-start: auto; width: min(100%, 340px); }
  .totals div { display: flex; justify-content: space-between; padding: 4px 0; font-variant-numeric: tabular-nums; }
  .totals .grand { border-top: 2px solid #16161d; margin-top: 6px; padding-top: 8px; font-weight: 700; font-size: 16px; }
  footer { margin-top: 32px; font-size: 12px; color: #6b6b7b; }
  @media (max-width: 600px) { .sheet { padding: 20px; margin: 0; border-radius: 0; } .parties { grid-template-columns: 1fr; } .meta { text-align: start; } }
  @media print { body { background: #fff; } .sheet { margin: 0; padding: 0; max-width: none; } }
</style></head>
<body><main class="sheet">
  <header>
    <div><h1>${esc(title)} <span class="ar">${esc(titleAr)}</span></h1><p class="strong">${esc(doc.seller.name)}</p></div>
    <div class="meta">
      <p><span class="strong">No. <span class="ar">رقم</span>:</span> ${esc(doc.number)}</p>
      <p><span class="strong">Issued <span class="ar">تاريخ الإصدار</span>:</span> ${day(doc.issuedOn)}</p>
      ${credit && doc.creditsInvoice ? `<p><span class="strong">Credits invoice <span class="ar">عن الفاتورة</span>:</span> ${esc(doc.creditsInvoice)}</p>` : ""}
      <p><span class="strong">${credit ? "Refunded" : "Paid"} <span class="ar">${credit ? "تاريخ الرد" : "تاريخ الدفع"}</span>:</span> ${day(doc.paidOn)}</p>
      <p><span class="strong">Payment <span class="ar">طريقة الدفع</span>:</span> ${doc.paymentMeans === "48" ? "Card" : "Bank transfer"} (${esc(doc.paymentMeans)})</p>
    </div>
  </header>
  <section class="parties">
    ${party("From", "من", doc.seller)}
    ${party("Bill to", "إلى", doc.buyer)}
  </section>
  <table>
    <thead><tr><th>Description <span class="ar">الوصف</span></th><th class="num">Qty <span class="ar">الكمية</span></th><th class="num">Unit price <span class="ar">سعر الوحدة</span></th><th class="num">Amount <span class="ar">المبلغ</span></th></tr></thead>
    <tbody>${doc.lines.map((l) => `<tr><td>${esc(l.description)}</td><td class="num">${esc(l.quantity)}</td><td class="num">${m(l.unitPrice)}</td><td class="num">${m(l.amount)}</td></tr>`).join("")}</tbody>
  </table>
  <div class="totals">
    <div><span>Subtotal <span class="ar">المجموع قبل الضريبة</span></span><span>${m(doc.subtotal)}</span></div>
    <div><span>Sales tax ${esc(doc.taxPercent)}% <span class="ar">ضريبة المبيعات</span></span><span>${m(doc.tax)}</span></div>
    <div class="grand"><span>Total <span class="ar">الإجمالي</span></span><span>${m(doc.total)}</span></div>
  </div>
  ${doc.reason ? `<p style="margin-top:16px"><span class="strong">Reason <span class="ar">السبب</span>:</span> ${esc(doc.reason)}</p>` : ""}
  <footer>${credit ? "This credit note reduces the invoice named above by the total shown." : "Paid in full. Thank you."} ${esc(doc.seller.email || "")}</footer>
</main></body></html>`;
}
