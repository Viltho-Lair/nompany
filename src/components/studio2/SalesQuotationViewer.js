"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { Icon } from "@/components/studio2/icons";
import { panel, h2, sub, btn, btnGhost, money, fmtDate } from "@/components/studio2/ui";
import { netUnitPrice } from "@/lib/quotations";

// THE QUOTATION, AS SALES READS IT.
//
// A copy of the document Technical built, drawn as plain tables with the studio's
// own chrome — the same panels, the same type, the same money — so it is
// recognisably the same quotation and not a second design of one.
//
// VIEW ONLY, and view only in three separate ways, because hiding a button is
// never the enforcement:
//   • nothing here is an input. There is no field to type in, no Save and no
//     Submit; the builder is Technical's screen and stays theirs.
//   • it reads /sales/quotations, which has no POST, PUT or DELETE at all.
//   • it does not export. The finished document goes out from Technical, so a
//     copy taken from this screen could differ from the one the client holds —
//     and two versions of a priced document is exactly the failure worth
//     preventing.
//
// FIGURES are shown exactly as they were stored: a quotation is a document
// somebody was given, so no line here is repriced from today's catalogue.
//
// EVERYTHING THE DOCUMENT NEVER OWNED IS CARRIED — the client's name, whether it
// was approved and when. Those were read straight off the stored row until they
// were all three wrong at once: `clientName` is never written to a quotation, so
// Client sat permanently blank; the approval lives on the task, so a quotation
// signed on the board showed no date and read "Completed" here while Technical
// called it Approved. Carrying is done in ticketQuotation, beside the read, so
// the two sides cannot drift again.

const cellHead = "px-3 py-2 text-start text-[11px] font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400";

export default function SalesQuotationViewer({ slug, ticketId, quotationId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const router = useRouter();
  const [printing, setPrinting] = useState(false);
  const [printed, setPrinted] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/sales/quotations?id=${encodeURIComponent(quotationId)}`, { cache: "no-store" });
    if (!res.ok) {
      setError(res.status === 404
        ? "That quotation no longer exists, or it doesn't belong to this ticket."
        : "You don't have access to this quotation.");
      return;
    }
    setError("");
    setData(await res.json());
  }, [slug, quotationId]);

  useEffect(() => { load(); }, [load]);
  // Technical is still working on it while Sales is reading it, so a revision or
  // a status change lands here without a refresh.
  useLiveUpdates(slug, "technical", load);

  // THE WHOLE POINT OF THE BUTTON. Sales presses it; Quality's template runs;
  // the fields it asked for are fetched from THIS quotation and from everything
  // the graph reaches out of it — the ticket, its client — and a document comes
  // back with a number of its own, waiting for review.
  //
  // Nothing about WHAT to fetch is decided here. The template said that when it
  // was written, and the server resolves it. This screen only says which
  // quotation is in hand.
  //
  // `straightToPrint` is the same request with a different landing: the document
  // opens in its own tab with the print dialog already up, which is what a
  // person pressing Print on a quotation actually meant. Reading it first is the
  // other button.
  const print = async (straightToPrint = false) => {
    setPrinting(true);
    setPrinted("");
    // OPENED BEFORE THE AWAIT, because a window.open that happens after one is a
    // window the browser blocks: it is no longer attributable to the click.
    const tab = straightToPrint ? window.open("", "_blank") : null;
    try {
      const res = await fetch(`/api/studios/${slug}/quality/generated`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: data.print.templateId, subjectId: quotationId }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        tab?.close();
        setPrinted(payload.error === "not-issued"
          ? "The template behind this button hasn't been approved yet."
          : "That didn't work, and nothing was created.");
        return;
      }
      // STRAIGHT TO THE DOCUMENT. Pressing Print is a request to see it; being
      // told a code and left to go and find it is not an answer. A second press
      // opens the same document rather than making another.
      const href = `/${slug}/quality-documents/generated/${payload.instance.id}`;
      if (tab) tab.location = `${href}?print=1`;
      else router.push(href);
    } finally {
      setPrinting(false);
    }
  };

  const back = (
    <Link href={`/${slug}/sales-tickets/${ticketId}`} className={btnGhost}>Back to ticket</Link>
  );

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">{back}</div>
        <p className={`${panel} text-sm text-rose-600 dark:text-rose-300`}>{error}</p>
      </div>
    );
  }
  if (!data) return <p className="text-sm text-slate-500">Loading quotation…</p>;

  const { quotation: q, ticket, currency } = data;
  const tables = Array.isArray(q.tables) ? q.tables : [];
  const revision = Number(q.revision) || 1;
  const priced = tables.reduce((n, t) => n + (t.rows || []).length, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {back}
        <div className="min-w-0">
          <h1 className="truncate font-display text-xl font-800 text-slate-900 dark:text-white">
            {q.number || "Quotation"}
            {revision > 1 && <span className="ms-2 text-sm font-600 text-slate-400">Rev {revision}</span>}
          </h1>
          <p className="truncate text-xs text-slate-400">
            {q.title || ticket.title}{q.clientName ? ` · ${q.clientName}` : ""}{ticket.ref ? ` · ${ticket.ref}` : ""}
          </p>
        </div>
        {/* Said out loud rather than implied by the absence of buttons: somebody
            who came here looking for Export should learn where it lives. */}
        <span className="ms-auto inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-700 text-slate-500 dark:bg-white/5 dark:text-slate-300">
          <Icon name="lock" className="h-3.5 w-3.5" /> View only
        </span>

        {/* PRINT, beside View only rather than instead of it — the two do not
            contradict each other. This produces a NEW document from an approved
            template; the quotation stays exactly as untouchable here as it was.
            Drawn only where the server has already said a press would succeed,
            so it never appears and then refuses. */}
        {data.print?.ready && (
          <>
            <button type="button" className={btnGhost} disabled={printing} onClick={() => print(false)}
              title="Open the document and read it before it goes anywhere">
              {printing ? "Preparing…" : "Open document"}
            </button>
            <button type="button" className={btn} disabled={printing} onClick={() => print(true)}
              title="Open the document in a new tab with the print dialog already up">
              Print
            </button>
          </>
        )}
      </div>

      {printed && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          {printed}
        </p>
      )}

      <section className={panel}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className={h2}>Quotation</h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-600 text-slate-600 dark:bg-white/5 dark:text-slate-300">{q.status}</span>
        </div>
        <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-3">
          <Field label="Number" value={q.number} mono />
          <Field label="Revision" value={String(revision)} />
          <Field label="Client" value={q.clientName} />
          <Field label="Raised" value={fmtDate(q.createdAt)} />
          <Field label="Submitted" value={fmtDate(q.submittedAt)} />
          <Field label="Approved" value={fmtDate(q.completedAt)} />
        </dl>
        {q.description && (
          <p className="mt-4 whitespace-pre-wrap border-t border-slate-100 pt-4 text-sm text-slate-600 dark:border-white/10 dark:text-slate-300">
            {q.description}
          </p>
        )}
      </section>

      {priced === 0 ? (
        <section className={panel}>
          <p className={sub}>Nothing has been priced on this quotation yet.</p>
        </section>
      ) : tables.map((table, i) => {
        const sum = (table.rows || []).reduce((s, r) => s + num(r.qty) * netUnitPrice(r), 0);
        return (
          <section key={table.id || i} className={`${panel} p-0 overflow-hidden`}>
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-3 font-display text-sm font-700 text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white">
              {table.title || `Table ${i + 1}`}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/10">
                    <th className={`${cellHead} w-14`}><span className="sr-only">Item image</span></th>
                    <th className={cellHead}>Item</th>
                    <th className={`${cellHead} w-20`}>Unit</th>
                    <th className={`${cellHead} w-20`}>Qty</th>
                    {/* NO DISCOUNT COLUMN. What Sales reads off this screen is
                        what the client is being asked to pay, and the concession
                        behind that number is Technical's working — a figure that
                        invites a conversation about whether it should have been
                        larger, in the one place where nothing can be changed.

                        Which is why Unit price here is the NET one. Dropping the
                        column while still showing the gross price would leave a
                        table whose own arithmetic does not add up: qty × unit
                        price would not be the line total, and a reader with no
                        way to see why would be right to distrust the document. */}
                    <th className={`${cellHead} w-28 text-end`}>Unit price</th>
                    <th className={`${cellHead} w-32 text-end`}>Line total</th>
                  </tr>
                </thead>
                <tbody>
                  {(table.rows || []).map((r, k) => (
                    <tr key={r.id || k} className="border-b border-slate-50 last:border-0 dark:border-white/5">
                      <td className="px-3 py-2">
                        <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {r.image
                            ? <img src={r.image} alt="" className="h-full w-full object-cover" />
                            : <Icon name="services" className="h-4 w-4 text-slate-300" />}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-600 text-slate-900 dark:text-white">{r.description}</td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{r.unit || "—"}</td>
                      <td className="px-3 py-2 tabular-nums text-slate-600 dark:text-slate-300">{num(r.qty)}</td>
                      <td className="px-3 py-2 text-end font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">{money(netUnitPrice(r))}</td>
                      <td className="px-3 py-2 text-end font-mono text-xs font-600 tabular-nums text-slate-800 dark:text-slate-100">
                        {money(num(r.qty) * netUnitPrice(r))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-slate-100 px-5 py-2.5 text-end text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
              Table total <span className="font-mono font-600 text-slate-700 dark:text-slate-200">{money(sum)}</span>
              {currency && <span className="ms-1 text-slate-400">{currency}</span>}
            </div>
          </section>
        );
      })}

      <section className={panel}>
        <dl className="ms-auto w-full max-w-sm space-y-1 text-sm">
          <Total label="Subtotal" value={q.subtotal} currency={currency} />
          <Total label={`VAT ${num(q.vatRate)}%`} value={q.vat} currency={currency} />
          <div className="flex items-baseline gap-3 border-t border-slate-200 pt-1 dark:border-white/10">
            <dt className="text-slate-500 dark:text-slate-400">Total</dt>
            <dd className="ms-auto font-display text-base font-700 tabular-nums text-slate-900 dark:text-white">
              {money(q.total)} <span className="text-sm font-600 text-slate-400">{currency}</span>
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

function Total({ label, value, currency }) {
  return (
    <div className="flex items-baseline gap-3">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="ms-auto font-mono tabular-nums text-slate-700 dark:text-slate-200">
        {money(value)} <span className="text-slate-400">{currency}</span>
      </dd>
    </div>
  );
}

function Field({ label, value, mono }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-600 uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className={`mt-0.5 text-sm text-slate-700 dark:text-slate-200 ${mono ? "font-mono text-xs" : ""}`}>
        {value && value !== "—" ? value : <span className="text-slate-400">—</span>}
      </dd>
    </div>
  );
}
