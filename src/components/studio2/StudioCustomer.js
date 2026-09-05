// CUSTOMER 360 — one company, and everything about them this reader may see.
//
// The question this answers is "what is our relationship with them worth", and
// before this page there was no screen that could. A client was a row in a
// list; the deals were on another screen, the quotations on a third, the
// contracts on a fourth, and joining them was a person's job.
//
// EVERY BLOCK IS OPTIONAL, and not because a studio might have no data — the
// route sends `may`, one flag per block, from the right that governs those
// records. A block the reader may not see is not rendered AND was never read.
// "No quotations" and "no sight of quotations" are different sentences and only
// one of them is true, so an absent right draws nothing rather than an empty
// state that would lie.
//
// The totals differ between readers for the same reason, and that is correct:
// each is told the truth about the part of this company they are entitled to.
"use client";
import { useCallback, useEffect, useState } from "react";
import { useStudioLocale } from "@/components/studio2/locale";
import { salesDict } from "@/shared/studio/sales";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { panel, h2, sub, btn, btnGhost, microLabel, Empty, Dialog, StatTile, money, fmtDate } from "@/components/studio2/ui";
import { Field } from "@/components/fields/Field";
import { StatusPill } from "@/components/studio2/StatusPill";

// A heading and its rows, or a sentence saying there are none. Written once
// because this page is six of them and the alternative is six near-copies that
// drift apart the first time one gains a border.
function Block({ title, empty, rows, children }) {
  return (
    <section className={panel}>
      <h3 className={h2}>{title}</h3>
      {rows === 0 ? (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{empty}</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100 dark:divide-white/5">{children}</ul>
      )}
    </section>
  );
}

// `code`, NOT `ref`. React 19 does pass `ref` through to a function component
// like any other prop, so this would have worked — and the next person to read
// it would have to know that to be sure. A record's reference number is not a
// DOM ref, and giving it the one prop name React reserves is how a component
// acquires a bug the day it is wrapped in anything.
function Row({ href, code, title, pill, right, sub: subline }) {
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0">
      <span className="min-w-0">
        {href ? (
          <a href={href} className="font-mono text-xs text-brand-700 hover:underline dark:text-brand-300">{code}</a>
        ) : (
          <span className="font-mono text-xs text-slate-400">{code}</span>
        )}
        <span className="ms-2 font-600 text-slate-900 dark:text-white">{title}</span>
        {pill && <span className="ms-2">{pill}</span>}
        {subline && <span className="ms-2 text-xs text-slate-500 dark:text-slate-400">{subline}</span>}
      </span>
      {right && <span className="num text-sm text-slate-700 dark:text-slate-200">{right}</span>}
    </li>
  );
}

export default function StudioCustomer({ slug, clientId }) {
  const tr = salesDict(useStudioLocale());
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  // The rate editor's working copy. Null when closed — opening takes a copy of
  // what is stored, so cancelling genuinely cancels rather than leaving the
  // screen showing edits nobody saved.
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);

  // READ AND APPLY ARE SEPARATE, and the reason is a race this page can lose in
  // a way a department screen cannot. Every other studio screen is pointed at
  // one thing for its whole life; a record page is pointed at a DIFFERENT
  // record whenever somebody clicks another customer. Fire the first request,
  // click through to a second customer, and the slower answer lands last — so
  // the page shows company A's deals under company B's name and URL, with
  // nothing on screen saying which one you are reading.
  //
  // So the effect owns the await and drops any answer that arrives after it has
  // been torn down. Reading no longer touches state at all, which is also what
  // lets the live-update path reuse it without a second copy of the parsing.
  const read = useCallback(async () => {
    const res = await fetch(`/api/studios/${slug}/sales/customer?id=${encodeURIComponent(clientId)}`, { cache: "no-store" });
    return { ok: res.ok, body: await res.json().catch(() => ({})) };
  }, [slug, clientId]);

  const apply = useCallback(({ ok, body }) => {
    if (!ok) { setError(body.error === "notfound" ? tr.customerNotFound : (body.error || "failed")); return; }
    setError("");
    setData(body);
  }, [tr]);

  useEffect(() => {
    let current = true;
    (async () => {
      const answer = await read();
      if (current) apply(answer);
    })();
    return () => { current = false; };
  }, [read, apply]);

  // The live path has no such race: it only ever fires for the record already
  // on screen, and a teardown replaces the subscription with it.
  const reload = useCallback(async () => { apply(await read()); }, [read, apply]);
  useLiveUpdates(slug, reload);

  // THROUGH THE CLIENT'S OWN DOOR. A rate is a field on the client, like a
  // contact or a site, so it is written by the route that already writes those
  // — there is no customer-page write endpoint, and adding one would be a second
  // set of rules over one record.
  //
  // The whole list is sent, which is what `cleanRates` expects: it is the one
  // place that decides what a stored rate may be, and a row priced at zero is
  // how the editor removes one.
  const saveRates = async () => {
    setBusy(true);
    const res = await fetch(`/api/studios/${slug}/sales/clients`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: clientId, rates: draft.map((r) => ({ itemId: r.itemId, unitPrice: Number(r.unitPrice) || 0, note: r.note })) }),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(out.error || "failed"); return; }
    setDraft(null);
    apply(await read());
  };

  if (error) return <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p>;
  if (!data) return <ScreenSkeleton loadingLabel={tr.loadingCustomer} />;

  const { client, may, deals, quotations, contracts, projects, contractValue } = data;

  return (
    <div className="space-y-6">
      <div>
        <a href={`/${slug}/crm-sales-clients`} className="text-sm text-brand-700 hover:underline dark:text-brand-300">
          ← {tr.back}
        </a>
        <h2 className={`${h2} mt-2`}>{client.name}</h2>
        <p className={sub}>
          {[client.code && `${tr.clientCode} ${client.code}`, client.industry].filter(Boolean).join(" · ")}
          {client.createdAt && ` · ${tr.customerSince} ${fmtDate(client.createdAt)}`}
        </p>
        {client.website && (
          <a href={client.website} target="_blank" rel="noopener noreferrer"
            className="text-sm text-brand-700 underline dark:text-brand-300">{client.website}</a>
        )}
      </div>

      {/* THE FOUR FIGURES, and only the ones this reader's rights can support.
          A tile computed from records they cannot open would leak exactly what
          the gate exists to hide, so a missing right removes the tile rather
          than showing a zero. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {may.deals && (
          <>
            <div className={panel}><StatTile label={tr.wonValue} value={money(deals.wonValue)} /></div>
            <div className={panel}>
              <StatTile label={tr.openValue} value={money(deals.openValue)}
                sub={`${tr.weighted} ${money(deals.weighted)}`} accent="rgb(var(--chart-2))" />
            </div>
          </>
        )}
        {may.contracts && (
          <div className={panel}>
            <StatTile label={tr.contractValue} value={money(contractValue)} accent="rgb(var(--chart-4))" />
          </div>
        )}
        {may.deals && (
          <div className={panel}>
            <StatTile label={tr.winRate}
              value={deals.winRate == null ? "—" : `${deals.winRate}%`}
              sub={tr.nDecided(deals.decided.length)} accent="rgb(var(--chart-3))" />
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Block title={tr.contactsHeading} empty={tr.noContactsYet} rows={client.contacts.length}>
          {client.contacts.map((c, i) => (
            <li key={c.id || i} className="py-3 first:pt-0 last:pb-0">
              <p className="font-600 text-slate-900 dark:text-white">{c.name || "—"}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {[c.position, c.email, c.phone].filter(Boolean).join(" · ") || "—"}
              </p>
            </li>
          ))}
        </Block>

        <Block title={tr.sitesHeading} empty={tr.noSitesYet} rows={client.locations.length}>
          {client.locations.map((l, i) => (
            <li key={i} className="py-3 first:pt-0 last:pb-0">
              <p className="font-600 text-slate-900 dark:text-white">{l.name || "—"}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {[l.city, l.country].filter(Boolean).join(" · ") || "—"}
              </p>
            </li>
          ))}
        </Block>
      </div>

      {may.deals && (
        <>
          <Block title={tr.openDeals} empty={tr.noDealsForCustomer} rows={deals.open.length}>
            {deals.open.map((d) => (
              <Row key={d.id} href={`/${slug}/crm-sales-tickets/${d.id}`} code={d.ref || d.id} title={d.title}
                pill={<StatusPill kind="ticketStage" status={d.status} />}
                sub={tr.nDaysHere(d.days)}
                right={d.value ? money(d.value) : ""} />
            ))}
          </Block>

          <Block title={tr.decidedDeals} empty={tr.noDecidedYet} rows={deals.decided.length}>
            {deals.decided.map((d) => (
              <Row key={d.id} href={`/${slug}/crm-sales-tickets/${d.id}`} code={d.ref || d.id} title={d.title}
                pill={<StatusPill kind="ticketStage" status={d.status} />}
                // WHY IT WAS LOST, on the row. This is the payoff of making a
                // losing close say why: a reason written once and never read
                // back would be the dead field it used to be.
                sub={d.lostReason ? `${tr.lostReasonLabel}: ${d.lostReason}` : (d.closedAt ? fmtDate(d.closedAt) : "")}
                right={d.value ? money(d.value) : ""} />
            ))}
          </Block>
        </>
      )}

      {/* WHAT THIS COMPANY PAYS. Beside each agreed rate is the list price it
          overrides, so somebody can see what was given away without opening
          Inventory and comparing by hand — which is the whole reason a rate is
          worth recording rather than remembering. */}
      <section className={panel}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className={h2}>{tr.agreedRates}</h3>
            <p className={sub}>{tr.agreedRatesSub}</p>
          </div>
          {may.editRates && (
            <button type="button" className={btnGhost} onClick={() => setDraft(data.rates.map((r) => ({ ...r })))}>
              {tr.editRates}
            </button>
          )}
        </div>
        {data.rates.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{tr.noRatesYet}</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100 dark:divide-white/5">
            {data.rates.map((r) => (
              <li key={r.itemId} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0">
                <span className="min-w-0">
                  <span className="font-600 text-slate-900 dark:text-white">
                    {r.name || <span className="text-rose-600 dark:text-rose-300">{tr.itemNoLongerExists}</span>}
                  </span>
                  {r.sku && <span className="ms-2 font-mono text-[11px] text-slate-400">{r.sku}</span>}
                  {r.note && <span className="ms-2 text-xs text-slate-500 dark:text-slate-400">{r.note}</span>}
                </span>
                <span className="num text-sm text-slate-700 dark:text-slate-200">
                  {money(r.unitPrice)}
                  {r.sellPrice > 0 && (
                    <span className="ms-2 text-[11px] text-slate-400">{tr.listPriceIs(money(r.sellPrice))}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {may.quotations && (
        <Block title={tr.quotationsHeading} empty={tr.noQuotationsForCustomer} rows={quotations.length}>
          {quotations.map((q) => (
            <Row key={q.id} code={q.number || q.id} title={q.title}
              pill={<StatusPill kind="quotation" status={q.status} />}
              right={q.total ? `${money(q.total)} ${q.currency}` : ""} />
          ))}
        </Block>
      )}

      {may.contracts && (
        <Block title={tr.contracts} empty={tr.noContractsForCustomer} rows={contracts.length}>
          {contracts.map((c) => (
            <Row key={c.id} href={`/${slug}/crm-sales-contracts`} code={c.number || c.id} title={c.title}
              sub={[
                c.signedDate ? `${tr.signedOn} ${fmtDate(c.signedDate)}` : "",
                c.pending ? tr.nVariationsWaiting(c.pending) : "",
              ].filter(Boolean).join(" · ")}
              // SIGNED, MOVED, CURRENT — the same three numbers the register
              // shows, because only approved variations count and the sum is
              // what a project manager needs. The delta is drawn only when
              // there is one: "+ 0" is noise on the majority of contracts.
              right={c.delta
                ? `${money(c.current)} ${c.currency} (${c.delta > 0 ? "+" : "−"}${money(Math.abs(c.delta))})`
                : `${money(c.current)} ${c.currency}`} />
          ))}
        </Block>
      )}

      {may.projects && (
        <Block title={tr.projectsHeading} empty={tr.noProjectsForCustomer} rows={projects.length}>
          {projects.map((p) => (
            <Row key={p.id} href={`/${slug}/projects-list`} code={p.number || p.id} title={p.title}
              pill={<StatusPill kind="project" status={p.stage} />}
              right={p.value ? money(p.value) : ""} />
          ))}
        </Block>
      )}

      {draft && (
        <Dialog title={tr.agreedRates} description={tr.agreedRatesSub} onClose={() => setDraft(null)} width="max-w-[720px]">
          <div className="space-y-4">
            {draft.map((r, i) => (
              <div key={i} className="grid gap-3 sm:grid-cols-[1fr,9rem,1fr,auto] sm:items-start">
                <Field label={tr.rateItem} as="select" value={r.itemId}
                  onChange={(v) => setDraft((d) => d.map((x, j) => (j === i ? { ...x, itemId: v } : x)))}
                  options={(data.catalogue || []).map((c) => ({ value: c.id, label: c.name }))} />
                <Field label={tr.ratePrice} type="number" value={r.unitPrice}
                  onChange={(v) => setDraft((d) => d.map((x, j) => (j === i ? { ...x, unitPrice: v } : x)))}
                  inputProps={{ step: "0.01", min: "0" }} />
                <Field label={tr.rateNote} value={r.note || ""}
                  onChange={(v) => setDraft((d) => d.map((x, j) => (j === i ? { ...x, note: v } : x)))}
                  inputProps={{ maxLength: 200 }} />
                <button type="button" className={`${btnGhost} sm:mt-2`}
                  onClick={() => setDraft((d) => d.filter((_, j) => j !== i))}>×</button>
              </div>
            ))}
            <div className="flex flex-wrap justify-between gap-2">
              <button type="button" className={btnGhost}
                onClick={() => setDraft((d) => [...d, { itemId: "", unitPrice: "", note: "" }])}>
                {tr.addRate}
              </button>
              <span className="flex gap-2">
                <button type="button" className={btnGhost} onClick={() => setDraft(null)}>{tr.cancel}</button>
                <button type="button" className={btn} disabled={busy} onClick={saveRates}>{tr.save}</button>
              </span>
            </div>
          </div>
        </Dialog>
      )}

      {client.notes && (
        <section className={panel}>
          <p className={microLabel}>{tr.notes}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{client.notes}</p>
        </section>
      )}

      {/* A member with the clients right and nothing else sees the company and
          its people, and no commercial history at all. Said plainly rather than
          left as a page that looks broken. */}
      {!may.deals && !may.quotations && !may.contracts && !may.projects && (
        <Empty title={tr.onlyTheCompany} body={tr.onlyTheCompanyBody} />
      )}
    </div>
  );
}
