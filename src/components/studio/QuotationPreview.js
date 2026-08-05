"use client";

import { VAT_RATE, defaultQuotationCopy } from "@/lib/quotationSheet";
import { fmtSAR } from "@/lib/format";
import { alertDialog } from "@/lib/appDialog";

function fmtD(v) { if (!v) return ""; try { return new Date(v).toLocaleDateString("en-GB"); } catch { return ""; } }

// Cover copy comes from `cover.intro` / `cover.summary` (set on the server from
// settings or the per-building-type default); fall back to the default if a
// cover somehow arrives without them.
function coverIntro(cover) { return cover?.intro || defaultQuotationCopy(cover?.buildingType).intro; }
function coverSummary(cover) { return cover?.summary || defaultQuotationCopy(cover?.buildingType).summary; }

const page = "rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-[#20202c] dark:ring-white/10 sm:p-8";

// Page 1 — cover: centred logo + the quotation's identifying fields.
function CoverPage({ cover }) {
  const rows = [
    ["Client", cover.clientName],
    ["Project Name", cover.projectName],
    ["Building Type", cover.buildingType],
    ["Date of Quotation", fmtD(cover.dateOfQuotation)],
    ["Quotation Number", cover.quotationNumber],
  ];
  return (
    <div className={`${page} flex min-h-[560px] flex-col items-center justify-center`}>
      {cover.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover.logo} alt={cover.companyName || ""} className="max-h-44 w-auto max-w-[70%] object-contain" />
      ) : (
        <span className="font-display text-3xl font-800 text-slate-800 dark:text-white">{cover.companyName}</span>
      )}
      {/* Identifying fields, centred directly under the logo. */}
      <div className="mt-10 space-y-1.5 text-center text-sm">
        {rows.map(([k, v]) => (
          <p key={k}>
            <span className="font-600 text-slate-500 dark:text-slate-400">{k}:</span>{" "}
            <span className="text-slate-800 dark:text-slate-100">{v || "—"}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

// Page 2 — introduction + summary + revision tracking, centred in the page.
function IntroPage({ cover }) {
  return (
    <div className={`${page} flex min-h-[560px] flex-col items-center justify-center text-center`}>
      <div className="w-full max-w-2xl">
        <h2 className="font-display text-base font-700 text-slate-900 dark:text-white">Introduction</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{coverIntro(cover)}</p>
        <div className="h-8" />
        <h2 className="font-display text-base font-700 text-slate-900 dark:text-white">Summary</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{coverSummary(cover)}</p>
        <div className="h-8" />
        <p className="mb-2 text-xs font-600 uppercase tracking-wide text-slate-400 dark:text-slate-500">Quotation Tracking</p>
        <table className="mx-auto w-full max-w-xl border-collapse text-start text-xs">
          <thead>
            <tr className="bg-brand-700 text-white">
              <th className="border border-brand-700 px-2 py-1.5 text-start font-700">Rev No.</th>
              <th className="border border-brand-700 px-2 py-1.5 text-start font-700">Remarks</th>
              <th className="border border-brand-700 px-2 py-1.5 text-start font-700">Date</th>
            </tr>
          </thead>
          <tbody>
            {(cover.revisions || []).map((r) => (
              <tr key={r.revision} className="text-slate-700 dark:text-slate-200">
                <td className="border border-slate-200 px-2 py-1.5 dark:border-white/10">Rev{r.revision}</td>
                <td className="border border-slate-200 px-2 py-1.5 dark:border-white/10">{r.remarks}</td>
                <td className="border border-slate-200 px-2 py-1.5 dark:border-white/10">{fmtD(r.date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// The document-style preview of a quotation, shared by the Technical builder
// (live edit) and the Sales read-only view. It only ever reads `computed`
// (from computeSheet — or a server-sanitised equivalent) so it never needs the
// raw item catalogue or cost prices. When `cover` is provided, two cover pages
// are rendered before the tables.
export function PreviewDocument({ computed, quotation, loaded = true, cover }) {
  const hasContent = computed.tables.some((t) => t.rows.length > 0);
  return (
    <div className="mx-auto max-w-[820px] space-y-6">
      {cover && <CoverPage cover={cover} />}
      {cover && <IntroPage cover={cover} />}
      <div className={page}>
        <div className="mb-5 border-b border-slate-200 pb-4 dark:border-white/10">
          <p className="font-display text-lg font-800 text-slate-900 dark:text-white">Quotation {quotation.number}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{quotation.title || quotation.clientName || ""}</p>
        </div>

        {!hasContent ? (
          <p className="py-10 text-center text-sm text-slate-400">{loaded ? "No items in this quotation yet." : "Loading…"}</p>
        ) : (
          <>
            {computed.tables.map((t) => (
              t.rows.length === 0 ? null : (
                <div key={t.id} className="mb-6">
                  <div className="rounded-t-lg bg-brand-700 px-4 py-2 font-display text-sm font-700 text-white">{t.title || "Untitled table"}</div>
                  <table className="w-full table-fixed border-collapse text-xs">
                    <colgroup>
                      <col style={{ width: "10%" }} />
                      <col style={{ width: "10%" }} />
                      <col style={{ width: "40%" }} />
                      <col style={{ width: "10%" }} />
                      <col style={{ width: "15%" }} />
                      <col style={{ width: "15%" }} />
                    </colgroup>
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300">
                        <th className="border border-slate-200 px-2 py-1.5 text-start font-700 dark:border-white/10">Image</th>
                        <th className="border border-slate-200 px-2 py-1.5 text-start font-700 dark:border-white/10">Model</th>
                        <th className="border border-slate-200 px-2 py-1.5 text-start font-700 dark:border-white/10">Description</th>
                        <th className="border border-slate-200 px-2 py-1.5 text-end font-700 dark:border-white/10">Qty</th>
                        <th className="border border-slate-200 px-2 py-1.5 text-end font-700 dark:border-white/10">Unit Cost</th>
                        <th className="border border-slate-200 px-2 py-1.5 text-end font-700 dark:border-white/10">Total Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {t.rows.map((r) => (
                        <tr key={r.id} className="align-top text-slate-700 dark:text-slate-200">
                          <td className="border border-slate-200 px-2 py-1.5 text-center align-middle dark:border-white/10">
                            {r.item?.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={r.item.image} alt="" className="mx-auto h-10 w-10 object-contain" />
                            ) : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="break-words border border-slate-200 px-2 py-1.5 align-middle dark:border-white/10">{r.item?.modelNumber || "—"}</td>
                          <td className="break-words border border-slate-200 px-2 py-1.5 align-middle dark:border-white/10">
                            {r.item ? (
                              <>
                                {r.item.name && <div className="font-600">{r.item.name}</div>}
                                {r.item.description ? <div className="whitespace-pre-wrap [&_*]:!m-0 [&_ul]:list-disc [&_ul]:ps-4 [&_ol]:list-decimal [&_ol]:ps-4" dangerouslySetInnerHTML={{ __html: r.item.description }} /> : null}
                              </>
                            ) : "(item removed)"}
                          </td>
                          <td className="border border-slate-200 px-2 py-1.5 text-end align-middle dark:border-white/10">{r.calc.qty}</td>
                          <td className="whitespace-nowrap border border-slate-200 px-2 py-1.5 text-end align-middle dark:border-white/10">{r.calc.free ? <span className="font-600 text-emerald-600 dark:text-emerald-400">Included</span> : fmtSAR(r.calc.single)}</td>
                          <td className="whitespace-nowrap border border-slate-200 px-2 py-1.5 text-end align-middle font-600 dark:border-white/10">{r.calc.free ? <span className="text-emerald-600 dark:text-emerald-400">Included</span> : fmtSAR(r.calc.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ))}

            {/* Summary — full width to match the tables above */}
            <table className="w-full table-fixed border-collapse text-xs">
              <colgroup>
                <col />
                <col className="w-56" />
              </colgroup>
              <tbody>
                <SummaryRow k="Cost of Installing, Testing & Commissioning" v={computed.itcProvided ? fmtSAR(computed.itcCost) : "—"} />
                <SummaryRow k="Total Cost" v={fmtSAR(computed.totalCost)} />
                <SummaryRow k={`VAT (${Math.round(VAT_RATE * 100)}%)`} v={fmtSAR(computed.vat)} />
                <SummaryRow k="Total Cost including VAT" v={fmtSAR(computed.totalInclVat)} strong={!computed.discountProvided} />
                {computed.discountProvided && <SummaryRow k={`Total after discount (${computed.discount}%)`} v={fmtSAR(computed.discountedTotal)} strong />}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}

function SummaryRow({ k, v, strong }) {
  return (
    <tr className={strong ? "bg-brand-700 text-white" : "text-slate-700 dark:text-slate-200"}>
      <td className={`border border-slate-200 px-3 py-1.5 font-600 dark:border-white/10 ${strong ? "border-brand-700" : ""}`}>{k}</td>
      <td className={`whitespace-nowrap border border-slate-200 px-3 py-1.5 text-end font-700 dark:border-white/10 ${strong ? "border-brand-700" : ""}`}>{v}</td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Interim export. Full .docx/.pdf (with the 2 cover pages + instructions) will
// replace this once those layouts are provided. For now:
//   • PDF  → opens a print window of the tables (user picks “Save as PDF”).
//   • Word → downloads a Word-openable HTML document (.doc).
// Both reuse the same generated markup so they stay identical.
function money(n) {
  const v = Number(n) || 0;
  return `${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR`;
}
function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function buildTablesHTML(computed) {
  const tables = computed.tables
    .filter((t) => t.rows.length > 0)
    .map((t) => {
      const rows = t.rows
        .map((r) => {
          // Description is rich text (HTML) — insert it raw so formatting +
          // wrapping survive; the name (plain) is escaped.
          const desc = r.item
            ? `${r.item.name ? `<div class="b">${esc(r.item.name)}</div>` : ""}${r.item.description ? `<div class="rt">${r.item.description}</div>` : ""}`
            : "(item removed)";
          return `
          <tr>
            <td class="c">${r.item?.image ? `<img src="${esc(r.item.image)}" style="max-height:52px;max-width:100%;object-fit:contain" />` : "&mdash;"}</td>
            <td class="wrap">${esc(r.item?.modelNumber || "—")}</td>
            <td class="wrap">${desc}</td>
            <td class="r">${r.calc.qty}</td>
            <td class="r">${r.calc.free ? "Included" : esc(money(r.calc.single))}</td>
            <td class="r b">${r.calc.free ? "Included" : esc(money(r.calc.total))}</td>
          </tr>`;
        })
        .join("");
      return `
        <table class="qt">
          <colgroup><col style="width:10%"><col style="width:10%"><col style="width:40%"><col style="width:10%"><col style="width:15%"><col style="width:15%"></colgroup>
          <tr><td class="hdr" colspan="6">${esc(t.title || "Untitled table")}</td></tr>
          <tr class="th">
            <th>Image</th><th>Model</th><th>Description</th><th>Qty</th><th>Unit Cost</th><th>Total Cost</th>
          </tr>
          ${rows}
        </table>`;
    })
    .join("");

  const summary = `
    <table class="sum">
      <colgroup><col /><col style="width:220px" /></colgroup>
      <tr><td>Cost of Installing, Testing &amp; Commissioning</td><td class="r b">${computed.itcProvided ? esc(money(computed.itcCost)) : "—"}</td></tr>
      <tr><td>Total Cost</td><td class="r b">${esc(money(computed.totalCost))}</td></tr>
      <tr><td>VAT (${Math.round(VAT_RATE * 100)}%)</td><td class="r b">${esc(money(computed.vat))}</td></tr>
      <tr class="${computed.discountProvided ? "" : "grand"}"><td>Total Cost including VAT</td><td class="r b">${esc(money(computed.totalInclVat))}</td></tr>
      ${computed.discountProvided ? `<tr class="grand"><td>Total after discount (${computed.discount}%)</td><td class="r b">${esc(money(computed.discountedTotal))}</td></tr>` : ""}
    </table>`;

  return tables + summary;
}

// The two cover pages prepended to every exported quotation.
function buildCoverHTML(cover) {
  if (!cover) return "";
  const logo = (typeof window !== "undefined" ? window.location.origin : "") + (cover.logo || "");
  const revs = (cover.revisions || [])
    .map((r) => `<tr><td>Rev${r.revision}</td><td>${esc(r.remarks)}</td><td>${r.date ? esc(fmtD(r.date)) : ""}</td></tr>`)
    .join("");
  const mrow = (k, v) => `<div class="mrow"><b>${esc(k)}:</b> ${esc(v || "—")}</div>`;
  return `
    <section class="cover cover-1">
      <div class="cover-center">
        <div class="logo-wrap">${logo ? `<img src="${esc(logo)}" alt="" />` : `<div class="logo-fallback">${esc(cover.companyName || "")}</div>`}</div>
        <div class="meta">
          ${mrow("Client", cover.clientName)}
          ${mrow("Project Name", cover.projectName)}
          ${mrow("Building Type", cover.buildingType)}
          ${mrow("Date of Quotation", fmtD(cover.dateOfQuotation))}
          ${mrow("Quotation Number", cover.quotationNumber)}
        </div>
      </div>
    </section>
    <section class="cover cover-2">
      <div class="cover-center-2">
        <h2 class="ct">Introduction</h2>
        <p class="cp">${esc(coverIntro(cover))}</p>
        <div class="brk"></div>
        <h2 class="ct">Summary</h2>
        <p class="cp">${esc(coverSummary(cover))}</p>
        <div class="brk"></div>
        <p class="tt">Quotation Tracking</p>
        <table class="track"><tr class="th"><th>Rev No.</th><th>Remarks</th><th>Date</th></tr>${revs}</table>
      </div>
    </section>`;
}

function buildDocumentHTML(computed, quotation, cover) {
  const style = `
    *{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;color-adjust:exact !important}
    body{font-family:Arial,Helvetica,sans-serif;color:#1e293b;padding:24px}
    h1{font-size:18px;margin:0 0 4px}
    .sub{color:#64748b;font-size:12px;margin:0 0 18px}
    table{border-collapse:collapse;font-size:11px}
    .cover{page-break-after:always;min-height:960px}
    .cover-1{display:flex;align-items:center;justify-content:center}
    .cover-1 .cover-center{text-align:center}
    .cover-1 .logo-wrap{margin-bottom:36px}
    .cover-1 .logo-wrap img{max-height:200px;max-width:70%}
    .cover-1 .logo-fallback{font-size:26px;font-weight:800;color:#1e293b}
    .cover-1 .meta .mrow{font-size:13px;padding:3px 0}
    .cover-1 .meta .mrow b{color:#64748b}
    .cover-2{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
    .cover-2 .cover-center-2{max-width:680px;width:100%}
    .ct{font-size:14px;font-weight:700;margin:0 0 6px}
    .cp{font-size:12px;line-height:1.65;margin:0}
    .brk{height:28px}
    .tt{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.04em;margin:0 0 5px}
    .track{width:100%;margin:0 auto;text-align:left}
    .track th,.track td{border:1px solid #cbd5e1;padding:5px 8px;font-size:11px}
    .track .th th{background:#1e4fa3;color:#fff;border-color:#1e4fa3;font-weight:700}
    .qt{width:100%;margin:0 0 18px;table-layout:fixed}
    .qt td,.qt th{border:1px solid #cbd5e1;padding:6px 7px;vertical-align:middle}
    .qt .wrap{word-break:break-word;overflow-wrap:anywhere}
    .qt .c{text-align:center;vertical-align:middle}
    .qt .hdr{background:#1e4fa3;color:#fff;font-weight:700;font-size:12px;border-color:#1e4fa3}
    .qt .th th{background:#eef2f7;text-align:left;font-weight:700}
    .rt{white-space:pre-wrap}.rt *{margin:0}.rt ul{list-style:disc;padding-inline-start:16px}.rt ol{list-style:decimal;padding-inline-start:16px}
    .r{text-align:right}.c{text-align:center}.b{font-weight:700}
    .sum{width:100%;margin-top:6px;table-layout:fixed}
    .sum td{border:1px solid #cbd5e1;padding:5px 9px;font-weight:600}
    .sum .grand td{background:#1e4fa3;color:#fff;border-color:#1e4fa3}
    @media print{body{padding:0}}
  `;
  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>Quotation ${esc(quotation.number)}</title><style>${style}</style></head>
    <body>
      ${buildCoverHTML(cover)}
      <h1>Quotation ${esc(quotation.number)}</h1>
      <p class="sub">${esc(quotation.title || quotation.clientName || "")}</p>
      ${buildTablesHTML(computed)}
    </body></html>`;
}

export function exportSheet(kind, computed, quotation, cover) {
  const html = buildDocumentHTML(computed, quotation, cover);
  if (kind === "pdf") {
    const w = window.open("", "_blank");
    if (!w) { alertDialog({ title: "Pop-up blocked", message: "Please allow pop-ups for this site to export the quotation.", tone: "danger" }); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 350);
  } else {
    const blob = new Blob([html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Quotation-${(quotation.number || "draft").replace(/[^\w.-]+/g, "_")}.doc`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

// Floating PDF export button — shared by builder + view.
export function ExportButtons({ onExport }) {
  return (
    <div className="pointer-events-none sticky bottom-0 flex justify-end gap-2 pt-4">
      <button
        onClick={() => onExport("pdf")}
        className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2.5 text-sm font-600 text-white shadow-lg shadow-red-600/25 transition-colors hover:bg-red-700"
        title="Export as PDF (opens the print dialog — choose “Save as PDF”)"
      >
        PDF
      </button>
    </div>
  );
}
