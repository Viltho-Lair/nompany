"use client";

import { useCallback, useState } from "react";
import { ledgerDict } from "@/shared/studio/ledger";
import { Field } from "@/components/fields/Field";
import StudioDate from "@/components/fields/StudioDate";
import { useReload } from "@/components/studio2/useReload";

// THE TAX RETURN TAB (vat.md) — one period's VAT, read from the documents.
//
// The period starts as whatever the server chose (the previous month) and the
// reader moves either end; each move is a fresh read, because the return is a
// question about a period rather than a list to filter on the screen.

const money = (n) => new Intl.NumberFormat("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  .format(Number(n) || 0);

export default function TaxReturnPanel({ slug, locale }) {
  const tr = ledgerDict(locale);
  const [asked, setAsked] = useState({ from: "", to: "" });
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const q = new URLSearchParams();
    if (asked.from) q.set("from", asked.from);
    if (asked.to) q.set("to", asked.to);
    const res = await fetch(`/api/studios/${slug}/finance/tax?${q}`, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { setError(body.error || "failed"); return; }
    setError("");
    setData(body);
  }, [slug, asked]);

  useReload(load);

  const from = asked.from || data?.from || "";
  const to = asked.to || data?.to || "";
  const move = (patch) => setAsked({ from, to, ...patch });

  if (error && !data) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500 dark:text-slate-400">…</p>;
  if (!data.enabled) return null;

  const box = "rounded-geex border border-slate-200 p-4 dark:border-white/10";
  const figures = [
    [tr.output, data.output, 1],
    [tr.credits, data.credits, -1],
    [tr.input, data.input, -1],
  ];

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500 dark:text-slate-400">{tr.taxLead}</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:max-w-xl">
        <Field label={tr.from} filled={!!from}>
          <StudioDate value={from} onChange={(iso) => move({ from: iso })} />
        </Field>
        <Field label={tr.to} filled={!!to}>
          <StudioDate value={to} onChange={(iso) => move({ to: iso })} />
        </Field>
      </div>
      {error && <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-3">
        {figures.map(([label, b, sign]) => (
          <div key={label} className={box}>
            <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
            <p className="num mt-1 font-display text-lg font-800 text-slate-900 dark:text-white">
              {sign < 0 && b.vat ? "−" : ""}{money(b.vat)} <span className="text-xs text-slate-400">{data.currency}</span>
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {tr.taxable} <span className="num">{money(b.net)}</span> · {tr.count(b.count)}
            </p>
          </div>
        ))}
      </div>

      <div className={`${box} flex items-baseline justify-between gap-4`}>
        <p className="font-display text-sm font-700 text-slate-900 dark:text-white">
          {data.payable < 0 ? tr.reclaimable : tr.payable}
        </p>
        <p className="num font-display text-xl font-800 text-slate-900 dark:text-white">
          {money(Math.abs(data.payable))} <span className="text-xs text-slate-400">{data.currency}</span>
        </p>
      </div>

      <DocumentTable title={tr.documents} rows={data.rows} tr={tr} empty={tr.noDocuments} />

      {data.foreign.length > 0 && (
        <div>
          <DocumentTable title={tr.foreign} rows={data.foreign} tr={tr} showCurrency />
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{tr.foreignLead}</p>
        </div>
      )}
    </div>
  );
}

function DocumentTable({ title, rows, tr, empty = "", showCurrency = false }) {
  return (
    <section>
      <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{empty}</p>
      ) : (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-start text-xs text-slate-500 dark:text-slate-400">
                <th className="py-2 pe-4 text-start font-600">{tr.date}</th>
                <th className="py-2 pe-4 text-start font-600">{tr.reference}</th>
                <th className="py-2 pe-4 text-start font-600" />
                <th className="py-2 pe-4 text-end font-600">{tr.taxable}</th>
                <th className="py-2 text-end font-600">{tr.vat}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.kind}-${r.id}`} className="border-t border-slate-100 dark:border-white/5">
                  <td className="num py-2 pe-4">{r.date}</td>
                  <td className="py-2 pe-4 font-mono text-xs">{r.reference}</td>
                  <td className="py-2 pe-4 text-slate-500 dark:text-slate-400">{tr.kind[r.kind]}</td>
                  <td className="num py-2 pe-4 text-end">{money(r.net)}{showCurrency ? ` ${r.currency}` : ""}</td>
                  <td className="num py-2 text-end">{r.kind === "sale" ? "" : "−"}{money(r.vat)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
