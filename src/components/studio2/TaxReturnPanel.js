"use client";

import { useCallback, useState } from "react";
import { ledgerDict } from "@/shared/studio/ledger";
import { Field } from "@/components/fields/Field";
import StudioDate from "@/components/fields/StudioDate";
import { useReload } from "@/components/studio2/useReload";
import { moneyText } from "@/shared/money";
import { taxDict } from "@/shared/studio/tax";
import { financeDict } from "@/shared/studio/finance";

// THE TAX RETURN TAB (vat.md) — one period's VAT, read from the documents.
//
// The period starts as whatever the server chose (the previous month) and the
// reader moves either end; each move is a fresh read, because the return is a
// question about a period rather than a list to filter on the screen.

// Through shared/money, which shows a currency's own decimals: this was fixed
// at two places and hid the third decimal of every dinar amount.
const money = (n) => moneyText(n);

export default function TaxReturnPanel({ slug, locale }) {
  const tr = ledgerDict(locale);
  const tax = taxDict(locale);
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
  // NO VAT, NO RETURN — and the withheld tax to claim is still said, because
  // withholding does not depend on being registered for VAT.
  if (!data.enabled) return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500 dark:text-slate-400">{financeDict(locale).taxNoVat}</p>
      <ToClaim rows={data.unclaimedWithholding} locale={locale} />
    </div>
  );

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
            {/* WHAT OF THAT CARRIED NO TAX, by why — a return lists them apart. */}
            {(b.zero > 0 || b.exempt > 0) && (
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {b.zero > 0 && <>{tax.zero} <span className="num">{money(b.zero)}</span></>}
                {b.zero > 0 && b.exempt > 0 && " · "}
                {b.exempt > 0 && <>{tax.exempt} <span className="num">{money(b.exempt)}</span></>}
              </p>
            )}
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
      <ToClaim rows={data.unclaimedWithholding} locale={locale} />
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

// WHAT THE STUDIO CAN RECLAIM — computed since withholding shipped and shown
// nowhere until Tax had a screen (18/09/2026). A list to CHASE: a withheld
// amount is only worth anything once its certificate proves it was paid over.
function ToClaim({ rows = [], locale }) {
  const tr = financeDict(locale);
  return (
    <section className="space-y-2">
      <h3 className="font-display text-sm font-700 text-slate-900 dark:text-white">{tr.toClaimTitle}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400">{tr.toClaimLead}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-300">{tr.toClaimNone}</p>
      ) : (
        <ul className="divide-y divide-slate-100 text-sm dark:divide-white/5">
          {rows.map((r) => (
            <li key={r.id} className="flex justify-between py-1.5">
              <span className="font-mono text-slate-900 dark:text-white">{r.reference}</span>
              <span className="num text-slate-700 dark:text-slate-200">{money(r.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
