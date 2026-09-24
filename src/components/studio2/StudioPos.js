"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/studio2/icons";
import Autocomplete from "@mui/material/Autocomplete";
import { useStudioLocale } from "@/components/studio2/locale";
import { posDict } from "@/shared/studio/pos";
import { taxDict } from "@/shared/studio/tax";
import ScreenSkeleton from "@/components/studio2/ScreenSkeleton";
import useLiveUpdates from "@/components/studio2/useLiveUpdates";
import { useReload } from "@/components/studio2/useReload";
import { Field } from "@/components/fields/Field";
import TaxTag from "@/components/studio2/TaxTag";
import { btn, btnGhost, btnRow, btnRowDanger, Dialog, money, fmtDateTime } from "@/components/studio2/ui";
import TillCashierSwitch from "@/components/security/TillCashierSwitch";
import { securityDict } from "@/shared/security";
import { findByBarcode } from "@/modules/inventory/barcodes";
import { posTotals, settle, priceBasket, discountPercentOf, cleanDiscount, PAYMENT_METHODS } from "@/modules/sales/posModel";
import { evaluate, offerProblem } from "@/modules/sales/posPromotionsModel";
import { PRINT_CSS, Receipt, ShiftReport } from "@/components/studio2/posParts";

// THE TILL — a full-screen page (shared/studioRoute), because a cashier works a
// basket, not a sidebar. `docs/functionality/pos.md` is the file.
//
// EVERYTHING THE SCREEN TOTALS, THE SERVER TOTALS AGAIN with the same pure
// function (modules/sales/posModel), and the server prices the basket from the
// items rather than from this screen — so what is shown is what will be charged,
// and nothing typed here can make it otherwise.
//
// ONLINE ONLY. A sale that cannot reach the server is not a sale.

const card = "rounded-geex border border-slate-200/70 bg-[var(--geex-surface)] dark:border-white/10";
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export default function StudioPos({ slug }) {
  const locale = useStudioLocale();
  const tr = posDict(locale);
  const sec = securityDict(locale);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  // THIS DEVICE IS NOT A TILL (18/09/2026): what the server said, and whether
  // the reader may pair one.
  const [notTill, setNotTill] = useState(null);
  const [switching, setSwitching] = useState(false);
  const [basket, setBasket] = useState([]);
  // THE WHOLE BASKET'S DISCOUNT, as typed. Per-line discounts live on the rows.
  const [basketOff, setBasketOff] = useState({ kind: "percent", value: "" });
  const [payments, setPayments] = useState([{ method: "cash", amount: "", reference: "" }]);
  // THE CUSTOMER'S NUMBER, when they give one, and who it turned out to be.
  const [phone, setPhone] = useState("");
  const [customer, setCustomer] = useState(null);
  // THE SHOP'S OWN OFFERS (22/09/2026): the ones the cashier chose, the
  // automatic ones they took off, and the coupons they typed. Three lists
  // rather than one applied set, because the engine decides what applies — the
  // cashier only says what they want considered.
  const [chosen, setChosen] = useState([]);
  const [dropped, setDropped] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [offersOpen, setOffersOpen] = useState(false);
  // What the server said the basket earns when it disagreed with this screen.
  const [changed, setChanged] = useState(null);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [closing, setClosing] = useState(false);
  const [report, setReport] = useState(null);

  // THE TILL IS THE DEVICE'S (18/09/2026). It used to be a preference in this
  // browser's storage, so any browser could pick any till; the server now says
  // which till this device is paired to, and the screen opens on that one only.

  // ONLY THE NEWEST READ MAY LAND. A live update and the reload after an act
  // can overlap, and a read that started before the shift was opened must not
  // finish last and put "no shift" back on the screen — measured in the
  // sandbox, where exactly that happened.
  const latest = useRef(0);
  const reload = useCallback(async () => {
    const mine = ++latest.current;
    const res = await fetch(`/api/studios/${slug}/pos`, { cache: "no-store" });
    const out = await res.json().catch(() => ({}));
    if (mine !== latest.current) return;
    if (out?.error === "not-a-till") { setNotTill({ canPair: Boolean(out.canPair) }); return; }
    if (!res.ok || !out?.ok) { setError(tr.refusal(out?.error || "", out)); return; }
    setNotTill(null);
    setError("");
    setData(out);
  }, [slug, tr]);
  useReload(reload);
  // The till's records are filed under the till's own section.
  useLiveUpdates(slug, "crm-sales-pos", reload);

  // `handle` is given the refusal before it becomes a banner, and says whether
  // it dealt with it: the offers moving under an open basket is a question for
  // the cashier, not an error at the bottom of the screen.
  const call = useCallback(async (path, method, body, handle) => {
    setBusy(true);
    const res = await fetch(`/api/studios/${slug}/pos${path}`, {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const out = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !out?.ok) {
      if (handle && handle(out || {})) { setError(""); return null; }
      setError(tr.refusal(out?.error || "", out));
      return null;
    }
    setError("");
    return out;
  }, [slug, tr]);

  const terminals = data?.terminals || [];
  const terminal = data?.terminal || null;
  const shift = terminal ? (data?.openShifts || []).find((s) => s.terminalId === terminal.id) : null;
  const terms = data?.terms;

  // HOW THEY ARE PAYING, read from the rows as typed rather than from `paying`
  // below: a payment_method condition must not wait on a total that waits on
  // the offers. Only the method matters, and the method is not a figure.
  const methods = useMemo(() => payments.map((p) => p.method), [payments]);

  // WHO IS STANDING THERE, as the offers' eligibility reads it: a number nobody
  // has seen before is a first purchase, and a number not yet looked up is
  // nobody — the offers that need a customer simply do not apply yet.
  const shopper = useMemo(() => {
    if (!phone.trim()) return null;
    if (!customer || customer.error) return null;
    return customer.known
      ? { id: customer.clientId || "", tagIds: customer.tagIds || [], firstPurchase: Number(customer.visits) === 0 }
      : { id: "", tagIds: [], firstPurchase: true };
  }, [phone, customer]);

  // WHAT THIS BASKET EARNS — the same `evaluate` the server runs, on the rules
  // the payload carried, so the screen and the receipt cannot disagree about a
  // price. The server runs it again at the sale (with the usage counters, which
  // a till is not given) and answers back if anything moved.
  const promoCtx = useMemo(() => (!terms ? null : {
    now: new Date().toISOString(),
    timezone: data?.timezone || "",
    currency: terms.currency,
    tillId: data?.terminal?.id,
    channel: "pos",
    customer: shopper,
    may: { applyManual: Boolean(data?.can?.applyManual), removeAuto: Boolean(data?.can?.removeAuto) },
    selected: chosen,
    removed: dropped,
    coupons: coupons.map((c) => c.claim),
    paymentMethods: methods,
  }), [data, terms, shopper, chosen, dropped, coupons, methods]);

  const offers = useMemo(() => {
    const promotions = data?.promotions || [];
    if (!terms || !promoCtx || !promotions.length || !basket.length) return null;
    const items = new Map((data.items || []).map((i) => [i.id, i]));
    const lines = basket.map((b, i) => {
      const item = items.get(b.itemId) || {};
      return {
        // KEYED BY POSITION, exactly as the server keys the lines it is sent.
        key: String(i),
        itemId: b.itemId, description: b.description,
        count: num(b.count), price: num(b.price),
        ...(b.taxCategory ? { taxCategory: b.taxCategory } : {}),
        unit: item.unit || "", itemType: item.itemType || "", vendorId: item.vendorId || "",
        // WALKED BY THE SERVER, carried whole: the screen runs the same engine,
        // and a tree walk in the browser would be a second answer to "what is
        // this filed under".
        categoryPath: item.categoryPath || [],
        excluded: item.excludedFromPromotions === true,
      };
    });
    return evaluate({ lines, promotions }, promoCtx);
  }, [data, terms, basket, promoCtx]);

  // WHAT THE CASHIER MAY STILL CHOOSE: the offers this basket would earn if
  // they picked them, and the ones they took off. `not-chosen` is the engine's
  // own word for "waiting to be picked", so the list cannot drift from what
  // applying one would actually do.
  const offerable = useMemo(() => {
    const promotions = data?.promotions || [];
    if (!promoCtx || !promotions.length) return [];
    return promotions
      .map((p) => ({ promotion: p, problem: offerProblem(p, promoCtx) }))
      .filter((x) => x.problem === "" || x.problem === "not-chosen" || x.problem === "removed");
  }, [data, promoCtx]);

  // PRICED EXACTLY AS THE SERVER PRICES IT — the same priceBasket, so the net
  // on each row, the totals and the receipt the server writes are one figure.
  // The offers are handed in as a figure per line: the cashier's own discount
  // is of what is left after them, never of the shelf price.
  const priced = useMemo(() => {
    if (!terms) return null;
    const byKey = new Map((offers?.lines || []).map((l) => [l.key, l.promotionDiscount]));
    const lines = basket.map((b, i) => ({
      itemId: b.itemId, description: b.description,
      count: num(b.count), price: num(b.price), taxCategory: b.taxCategory,
      ...(b.listPrice > 0 ? { listPrice: b.listPrice } : {}),
      ...(byKey.get(String(i)) > 0 ? { promotionDiscount: byKey.get(String(i)) } : {}),
      ...(cleanDiscount(b.discount) ? { discount: cleanDiscount(b.discount) } : {}),
    }));
    return priceBasket(lines, cleanDiscount(basketOff), terms.currency);
  }, [basket, basketOff, terms, offers]);
  const totals = useMemo(() => (priced ? { ...posTotals(priced.lines, terms), discounts: priced.discountTotal } : null), [priced, terms]);
  // THE CAP, said before the server says it. A holder of the settings right is
  // not held to it (modules/sales/pos), so neither is the warning.
  const cap = terms?.maxDiscountPercent;
  const overCap = priced && cap !== null && cap !== undefined && !data?.can.manage
    ? priced.lines.find((l) => discountPercentOf(l, terms.currency) > cap) : null;

  // ONE CASH ROW FOLLOWS THE TOTAL until somebody types in it, so the common
  // sale — cash, exact or with change — is one key press.
  const paying = payments.map((p, i) => ({
    method: p.method,
    amount: p.amount === "" && i === 0 && payments.length === 1 ? num(totals?.total) : num(p.amount),
    ...(p.reference ? { reference: p.reference } : {}),
  }));
  const settled = totals ? settle(totals.total, paying, terms.currency) : null;
  const paidSoFar = paying.reduce((s, p) => s + p.amount, 0);

  if (notTill) return <NotATill tr={tr} slug={slug} canPair={notTill.canPair} />;
  if (!data) {
    return error
      ? <div className="p-8 text-sm text-rose-600 dark:text-rose-300">{error}</div>
      : <ScreenSkeleton />;
  }

  const addHit = (hit, item) => {
    setBasket((rows) => {
      const key = hit.itemId;
      const at = rows.findIndex((r) => r.key === key);
      if (at >= 0) return rows.map((r, i) => (i === at ? { ...r, count: num(r.count) + 1 } : r));
      return [...rows, {
        key, itemId: hit.itemId,
        description: item.name, count: 1,
        price: hit.price ?? 0, unpriced: hit.price === null,
        listPrice: hit.price ?? 0,
        taxCategory: item.taxCategory,
        discount: { kind: "percent", value: "" },
      }];
    });
  };

  // WHO THE NUMBER BELONGS TO, asked when the cashier leaves the box — not on
  // every key, which would ask once per digit. The sale registers a new one.
  async function lookUp() {
    const typed = phone.trim();
    if (!typed) { setCustomer(null); return; }
    const res = await fetch(`/api/studios/${slug}/pos/customer?phone=${encodeURIComponent(typed)}`, { cache: "no-store" });
    const out = await res.json().catch(() => ({}));
    setCustomer(res.ok && out?.ok ? out : { error: out?.error || "" });
  }

  // `agreed` is what this screen last showed the offers taking off. The server
  // re-prices with the counters a till is not given, and a basket that earns
  // something else is put back to the cashier rather than rung up quietly.
  // A COUPON IS A ROW, so it is the one thing the till cannot decide for
  // itself. Nothing is taken here — the use is claimed when the sale is
  // written, so a code typed and abandoned leaves the coupon untouched.
  async function addCoupon(code) {
    const typed = String(code || "").trim().toUpperCase();
    if (!typed || coupons.some((c) => c.claim.code === typed)) return "";
    const customerId = shopper?.id || "";
    const res = await fetch(
      `/api/studios/${slug}/pos/coupon?code=${encodeURIComponent(typed)}&customerId=${encodeURIComponent(customerId)}&known=1`,
      { cache: "no-store" },
    );
    const out = await res.json().catch(() => ({}));
    if (!res.ok || !out?.ok) return tr.couponReason(String(out?.reason || ""));
    setCoupons((cs) => [...cs, { claim: out.claim, name: out.name, nameAr: out.nameAr }]);
    return "";
  }

  async function completeSale(agreed) {
    const out = await call("/receipts", "POST", {
      shiftId: shift.id,
      lines: basket.map((b) => ({
        itemId: b.itemId, count: num(b.count), price: num(b.price),
        ...(cleanDiscount(b.discount) ? { discount: cleanDiscount(b.discount) } : {}),
      })),
      ...(cleanDiscount(basketOff) ? { discount: cleanDiscount(basketOff) } : {}),
      ...(phone.trim() ? { phone: phone.trim() } : {}),
      ...(chosen.length ? { promotionIds: chosen } : {}),
      ...(dropped.length ? { removedPromotionIds: dropped } : {}),
      ...(coupons.length ? { couponCodes: coupons.map((c) => c.claim.code) } : {}),
      // AGREED ONLY ONCE THE CASHIER HAS SEEN THE NEW FIGURE: sending it again
      // unchanged would make the check a formality that passes itself.
      ...(agreed === undefined ? { promotionDiscountShown: offers?.discountTotal || 0 } : {}),
      payments: paying,
    }, (refusal) => {
      if (refusal.error !== "promotions-changed") return false;
      setChanged({ was: Number(refusal.was) || 0, now: Number(refusal.now) || 0 });
      return true;
    });
    if (!out) return;
    setChanged(null);
    setReceipt(out.receipt);
    setBasket([]);
    setBasketOff({ kind: "percent", value: "" });
    setPhone("");
    setCustomer(null);
    setChosen([]);
    setDropped([]);
    setCoupons([]);
    setPayments([{ method: "cash", amount: "", reference: "" }]);
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--geex-bg,transparent)]">
      {(receipt || report) && <style>{PRINT_CSS}</style>}

      {/* THE BAR: which till, which shift, and the way out. */}
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-200/70 px-4 py-3 dark:border-white/10">
        {/* BACK TO THE DEPARTMENT the till belongs to (17/09/2026). A round
            arrow, not a text link: "Back to Point of Sale" beside the title
            "Point of sale" said the name twice (the owner, 18/09/2026: "better
            back button"). The words stay as its accessible name and tooltip.
            Same button the documentation page leads with (StudioDocs). */}
        <Link
          href={`/${slug}/pos`}
          title={tr.back}
          aria-label={tr.back}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--geex-surface)] text-slate-600 shadow-geex-sm transition-colors hover:text-brand-600 dark:text-slate-300"
        >
          <Icon name="arrowLeft" className="h-[18px] w-[18px] rtl:-scale-x-100" />
        </Link>
        <h1 className="font-display text-lg font-800 text-[var(--geex-ink)]">{tr.title}</h1>
        {terminal && (
          <span className="rounded-full bg-brand-500/10 px-2.5 py-1 text-xs font-700 text-brand-700 dark:text-brand-300">
            {[terminal.code, terminal.name].filter(Boolean).join(" · ")}
          </span>
        )}
        {shift && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {tr.shiftOpenedBy(shift.number, fmtDateTime(shift.openedAt))}
          </span>
        )}
        <div className="ms-auto flex flex-wrap gap-2">
          {/* NO SETTINGS LINK ON THE TILL — the owner, 24/09/2026. The counter is
              for selling; Point of Sale settings are reached from the sidebar. */}
          {/* CASHIERS CHANGE BY PIN on a paired till (18/09/2026). */}
          <button type="button" className={btnGhost} onClick={() => setSwitching(true)}>{sec.switchCashier}</button>
          {shift && data.can.closeShift && <button type="button" className={btnGhost} onClick={() => setClosing(true)}>{tr.closeShift}</button>}
        </div>
      </header>

      {error && <p className="mx-4 mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">{error}</p>}

      <main className="flex-1 p-4">
        {!data.hasInventory ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">{tr.noInventory}</p>
        ) : !shift ? (
          <OpenShift tr={tr} canSell={data.can.sell} busy={busy} onOpen={async (openingFloat) => {
            const out = await call("/shifts", "POST", { terminalId: terminal.id, openingFloat });
            if (out) reload();
          }} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
            <section className={`${card} p-4`}>
              <ScanBox tr={tr} items={data.items} onHit={addHit} disabled={!data.can.sell} />
              <Basket tr={tr} rows={basket} priced={priced?.lines || []} currency={terms.currency} canReprice={data.can.discount}
                applied={offers?.applied || []} locale={locale}
                onChange={(key, patch) => setBasket((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)))}
                onRemove={(key) => setBasket((rows) => rows.filter((r) => r.key !== key))} />
              {basket.length > 0 && (
                <button type="button" className={`${btnGhost} mt-3`}
                  onClick={() => {
                    setBasket([]); setBasketOff({ kind: "percent", value: "" });
                    setChosen([]); setDropped([]); setCoupons([]);
                  }}>{tr.clear}</button>
              )}
            </section>

            <aside className={`${card} flex flex-col gap-3 p-4`}>
              {data.can.discount && basket.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400">{tr.basketDiscount}</p>
                  <DiscountInput tr={tr} value={basketOff} currency={terms.currency} wide onChange={setBasketOff} />
                </div>
              )}
              {data.can.customers && (
                // React's onBlur bubbles; on the wrapper it leaves Field's own focus handling alone.
                <div onBlur={lookUp}>
                  <Field label={tr.customerPhone} type="tel" value={phone} hint={tr.customerPhoneHint}
                    onChange={(v) => { setPhone(v); setCustomer(null); }} />
                  {customer && (
                    <p className={`mt-1 text-xs ${customer.error ? "text-amber-700 dark:text-amber-300" : "text-slate-500 dark:text-slate-400"}`}>
                      {customer.error ? tr.refusal(customer.error, customer)
                        : customer.known ? tr.customerKnown(customer.name, customer.visits)
                          : tr.customerNew(customer.masked)}
                    </p>
                  )}
                </div>
              )}
              {/* THE OFFERS THIS BASKET EARNED, and the way to change them. */}
              {(offers || (data.promotions || []).length > 0) && basket.length > 0 && (
                <OffersPanel tr={tr} offers={offers} currency={terms.currency}
                  canOpen={Boolean(data.can.applyManual || (data.promotions || []).length)}
                  onOpen={() => setOffersOpen(true)} />
              )}
              <Totals tr={tr} totals={totals} terms={terms} promotions={offers?.discountTotal || 0} />
              {overCap && <p className="text-xs text-amber-700 dark:text-amber-300">{tr.overCap(cap, overCap.description)}</p>}
              <div>
                <p className="mb-2 text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400">{tr.pay}</p>
                {payments.map((p, i) => (
                  <div key={i} className="mb-2 space-y-2">
                    <div className="flex gap-1">
                      {PAYMENT_METHODS.map((m) => (
                        <button key={m} type="button"
                          className={`${btnRow} ${p.method === m ? "!border-brand-600 !text-brand-700 dark:!text-brand-300" : ""}`}
                          onClick={() => setPayments((ps) => ps.map((x, j) => (j === i ? { ...x, method: m } : x)))}>
                          {tr[m]}
                        </button>
                      ))}
                      {payments.length > 1 && (
                        <button type="button" className={`${btnRowDanger} ms-auto`}
                          onClick={() => setPayments((ps) => ps.filter((_, j) => j !== i))}>{tr.remove}</button>
                      )}
                    </div>
                    <Field label={tr.tendered} type="number" min="0" inputProps={{ step: "0.001" }}
                      value={p.amount === "" && i === 0 && payments.length === 1 ? String(num(totals?.total)) : p.amount}
                      onChange={(v) => setPayments((ps) => ps.map((x, j) => (j === i ? { ...x, amount: v } : x)))} />
                    {p.method !== "cash" && (
                      <Field label={tr.reference} value={p.reference}
                        onChange={(v) => setPayments((ps) => ps.map((x, j) => (j === i ? { ...x, reference: v } : x)))} />
                    )}
                  </div>
                ))}
                <button type="button" className={btnGhost}
                  onClick={() => setPayments((ps) => [...ps, { method: "card", amount: String(Math.max(0, num(totals?.total) - paidSoFar)), reference: "" }])}>
                  {tr.addPayment}
                </button>
              </div>
              {settled && (
                <p className="flex justify-between text-sm font-700 text-[var(--geex-ink)]">
                  <span>{settled.problem === "underpaid" ? tr.due : tr.change}</span>
                  <span className="num">
                    {money(settled.problem === "underpaid" ? num(totals.total) - settled.paid : settled.change, terms.currency)} {terms.currency}
                  </span>
                </p>
              )}
              <button type="button" className={`${btn} mt-auto py-3 text-base`}
                disabled={busy || !basket.length || !data.can.sell || !settled || Boolean(settled.problem) || Boolean(overCap)}
                onClick={() => completeSale()}>
                {busy ? tr.selling : tr.complete}
              </button>
              {!data.can.sell && <p className="text-xs text-slate-500 dark:text-slate-400">{tr.noSell}</p>}
            </aside>
          </div>
        )}
      </main>

      {receipt && (
        <Dialog title={`${tr.receipt} ${receipt.number}`} onClose={() => setReceipt(null)} width="max-w-[420px]">
          <Receipt tr={tr} receipt={receipt} studio={data.studio} terms={terms}
            tillName={terminals.find((t) => t.id === receipt.terminalId)?.name || ""} />
          <div className="mt-4 flex gap-2">
            <button type="button" className={btn} onClick={() => window.print()}>{tr.printReceipt}</button>
            <button type="button" className={btnGhost} onClick={() => setReceipt(null)}>{tr.newSale}</button>
          </div>
        </Dialog>
      )}

      {offersOpen && (
        <Dialog title={tr.offers} onClose={() => setOffersOpen(false)} width="max-w-[460px]">
          <OffersDialog
            tr={tr} locale={locale} currency={terms.currency}
            offerable={offerable} applied={offers?.applied || []}
            chosen={chosen} dropped={dropped} coupons={coupons}
            can={data.can} hasCustomer={Boolean(shopper)}
            onChoose={(id) => setChosen((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]))}
            onDrop={(id) => setDropped((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]))}
            onCoupon={addCoupon}
            onDropCoupon={(code) => setCoupons((cs) => cs.filter((c) => c.claim.code !== code))}
            onDone={() => setOffersOpen(false)} />
        </Dialog>
      )}

      {/* THE OFFERS MOVED WHILE THE BASKET WAS OPEN. The cashier is shown both
          figures and sells again knowingly — the sale is never rung up at a
          total nobody has seen. */}
      {changed && (
        <Dialog title={tr.offersChanged} onClose={() => setChanged(null)} width="max-w-[420px]">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {tr.offersChangedLead(money(changed.was, terms.currency), money(changed.now, terms.currency))}
          </p>
          <div className="mt-4 flex gap-2">
            <button type="button" className={btn} disabled={busy} onClick={() => completeSale(changed.now)}>{tr.sellAnyway}</button>
            <button type="button" className={btnGhost} onClick={() => setChanged(null)}>{tr.cancel}</button>
          </div>
        </Dialog>
      )}

      {closing && shift && (
        <CloseShift tr={tr} busy={busy} currency={terms.currency} onCancel={() => setClosing(false)}
          onClose={async (countedCash, notes) => {
            const out = await call("/shifts", "PUT", { id: shift.id, countedCash, notes });
            if (!out) return;
            setClosing(false);
            setReport({ shift: out.shift, report: out.report });
            reload();
          }} />
      )}

      {report && (
        <Dialog title={`${tr.report} ${report.shift.number}`} onClose={() => setReport(null)} width="max-w-[420px]">
          <ShiftReport tr={tr} shift={report.shift} report={report.report} studio={data.studio}
            currency={terms.currency} tillName={terminals.find((t) => t.id === report.shift.terminalId)?.name || ""} />
          <div className="mt-4 flex gap-2">
            <button type="button" className={btn} onClick={() => window.print()}>{tr.printReport}</button>
            <button type="button" className={btnGhost} onClick={() => setReport(null)}>{tr.done}</button>
          </div>
        </Dialog>
      )}

      {switching && (
        <Dialog title={sec.switchCashier} onClose={() => setSwitching(false)} width="max-w-[440px]">
          {/* The next cashier's session replaces this one on the till. */}
          <TillCashierSwitch locale={locale} onDone={() => window.location.reload()} onCancel={() => setSwitching(false)} />
        </Dialog>
      )}

    </div>
  );
}

// POS ON A DEVICE NOBODY PAIRED (18/09/2026). No exception for managers: a
// till opens on its own device, and pairing is done from that device.
function NotATill({ tr, slug, canPair }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className={`${card} max-w-md p-6`}>
        <h2 className="font-display text-lg font-800 text-[var(--geex-ink)]">{tr.notATill}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tr.notATillLead}</p>
        <div className="mt-4 flex gap-2">
          {canPair && <Link href={`/${slug}/pos-settings`} className={btn}>{tr.openSettings}</Link>}
          <Link href={`/${slug}/pos`} className={btnGhost}>{tr.back}</Link>
        </div>
      </div>
    </div>
  );
}

function OpenShift({ tr, canSell, busy, onOpen }) {
  const [float, setFloat] = useState("0");
  return (
    <div className={`${card} mx-auto max-w-md p-6`}>
      <h2 className="font-display text-lg font-800 text-[var(--geex-ink)]">{tr.noShift}</h2>
      {canSell ? (
        <div className="mt-4 flex items-end gap-2">
          <div className="flex-1"><Field label={tr.openingFloat} type="number" min="0" value={float} onChange={setFloat} inputProps={{ step: "0.001" }} /></div>
          <button type="button" className={btn} disabled={busy || float === ""} onClick={() => onOpen(Number(float))}>{tr.openShift}</button>
        </div>
      ) : <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{tr.noSell}</p>}
    </div>
  );
}

// ONE FIELD FOR BOTH HANDS. A scanner types a code and presses Enter; a person
// types part of a name and picks from the list — the same searchable picker the
// client field uses (MUI Autocomplete, which Combo is built on), with each
// item's SKU, barcode and price beside its name. A code the studio carries goes
// straight into the basket on Enter; a typed word with exactly one match does
// too. The field clears and keeps the focus after every add, so the next scan
// needs no click.
//
// AND AN EXACT CODE OR NAME GOES IN WITHOUT ENTER (the owner, 18/09/2026). When
// what is typed is exactly one item's barcode, SKU or full name, it is added by
// itself once typing PAUSES — not on the keystroke that first matches, because
// a code can be the start of a longer one (`123` and `1234`), and a scanner
// typing `1234` would otherwise ring up `123` on its third character. A
// scanner types far faster than the pause, so it still arrives whole. Only a
// UNIQUE exact match auto-adds: two items sharing a name still show the list.
const AUTO_ADD_PAUSE_MS = 350;

// The one item whose barcode, SKU or full name IS the text — exact and
// case-insensitive — or null, including when more than one item answers to it.
function exactItem(items, q) {
  const v = String(q || "").trim().toLowerCase();
  if (!v) return null;
  const hits = items.filter((i) =>
    String(i.barcode || "").toLowerCase() === v
    || String(i.sku || "").toLowerCase() === v
    || String(i.name || "").trim().toLowerCase() === v);
  return hits.length === 1 ? hits[0] : null;
}

function ScanBox({ tr, items, onHit, disabled }) {
  const [text, setText] = useState("");
  const [miss, setMiss] = useState("");
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);

  const addItem = (item) => {
    onHit({ itemId: item.id, price: item.sellPrice > 0 ? item.sellPrice : null }, item);
    setText(""); setMiss("");
    ref.current?.focus();
  };

  const matching = (q) => {
    const v = String(q || "").trim().toLowerCase();
    if (!v) return items;
    const rank = (i) => {
      const name = i.name.toLowerCase();
      if (String(i.barcode || "").toLowerCase() === v || String(i.sku || "").toLowerCase() === v) return 0;
      if (name.startsWith(v)) return 1;
      if (name.split(/[\s-]+/).some((w) => w.startsWith(v))) return 2;
      if (name.includes(v) || String(i.sku || "").toLowerCase().includes(v)) return 3;
      return 9;
    };
    return items.filter((i) => rank(i) < 9).sort((x, y) => rank(x) - rank(y) || x.name.localeCompare(y.name));
  };

  // Re-armed on every keystroke; Enter and a pick both clear `text`, which
  // cancels it, so nothing is ever added twice.
  useEffect(() => {
    const code = text.trim();
    if (disabled || !code) return undefined;
    const t = setTimeout(() => {
      const item = exactItem(items, code);
      if (!item) return;
      // A scanned barcode is priced through the same lookup Enter uses.
      const hit = findByBarcode(items, code);
      onHit(hit || { itemId: item.id, price: item.sellPrice > 0 ? item.sellPrice : null }, item);
      setText(""); setMiss("");
      ref.current?.focus();
    }, AUTO_ADD_PAUSE_MS);
    return () => clearTimeout(t);
  }, [text, disabled, items, onHit]);

  // Enter on free text: a barcode first (the item's or a pack's), then a
  // single match by name or SKU.
  function submit(raw) {
    const code = String(raw || "").trim();
    if (!code) return;
    const hit = findByBarcode(items, code);
    if (hit) {
      onHit(hit, items.find((i) => i.id === hit.itemId));
      setText(""); setMiss("");
      return;
    }
    const found = matching(code);
    if (found.length === 1) { addItem(found[0]); return; }
    setMiss(found.length ? "" : tr.notFound(code));
  }

  return (
    <div className="mb-4">
      <label className="mb-1 block text-xs font-600 uppercase tracking-wide text-slate-500 dark:text-slate-400" htmlFor="pos-scan">{tr.scan}</label>
      <Autocomplete
        freeSolo
        disabled={disabled}
        options={items}
        inputValue={text}
        value={null}
        onInputChange={(_, next, reason) => { if (reason !== "reset") setText(next || ""); }}
        onChange={(_, picked) => {
          if (picked && typeof picked === "object") addItem(picked);
          else if (typeof picked === "string") submit(picked);
        }}
        getOptionLabel={(o) => (typeof o === "string" ? o : o.name)}
        filterOptions={(opts, { inputValue }) => matching(inputValue).slice(0, 30)}
        openOnFocus={false}
        autoHighlight={false}
        clearOnBlur={false}
        blurOnSelect={false}
        slotProps={{
          paper: { className: "mt-1 rounded-xl border border-slate-200 bg-[var(--geex-surface)] shadow-geex dark:border-white/15" },
          listbox: { className: "max-h-[320px] py-1 text-sm" },
        }}
        renderOption={(props, o) => {
          const { key, ...rest } = props;
          return (
            <li key={key} {...rest}
              className="flex cursor-pointer items-center justify-between gap-3 px-3.5 py-2 text-slate-700 aria-selected:bg-brand-500/10 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5">
              <span className="min-w-0">
                <span className="font-600">{o.name}</span>
                <span className="ms-2 text-xs text-slate-400">{[o.sku, o.barcode].filter(Boolean).join(" · ")}</span>
                <TaxTag category={o.taxCategory} />
              </span>
              <span className="num shrink-0">{o.sellPrice > 0 ? money(o.sellPrice) : "—"}</span>
            </li>
          );
        }}
        renderInput={(params) => {
          const { ref: anchor, onMouseDown } = params.slotProps?.input || {};
          const { className: _mui, ...htmlInput } = params.slotProps?.htmlInput || {};
          return (
            <div ref={anchor} onMouseDown={onMouseDown}>
              <input {...htmlInput} id="pos-scan" ref={(el) => {
                ref.current = el;
                const r = htmlInput.ref;
                if (typeof r === "function") r(el); else if (r) r.current = el;
              }} autoComplete="off" disabled={disabled}
                className="w-full rounded-xl border border-slate-300 bg-transparent px-4 py-3 text-lg outline-none focus:border-brand-500 dark:border-white/15" />
            </div>
          );
        }}
      />
      <p className="mt-1 text-xs text-slate-400">{tr.scanHint}</p>
      {miss && <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">{miss}</p>}
    </div>
  );
}

// A DISCOUNT BOX: a number and whether it is a percentage or an amount.
function DiscountInput({ tr, value, currency, onChange, wide = false }) {
  const d = value || { kind: "percent", value: "" };
  return (
    <div className="flex items-center justify-end gap-1">
      <input value={d.value} inputMode="decimal" aria-label={tr.discount} placeholder="0"
        onChange={(e) => onChange({ ...d, value: e.target.value })}
        className={`${wide ? "w-full" : "w-14"} rounded border border-slate-200 bg-transparent px-1 text-end dark:border-white/15`} />
      <button type="button" className={btnRow}
        aria-label={d.kind === "percent" ? tr.discountAsAmount : tr.discountAsPercent}
        onClick={() => onChange({ ...d, kind: d.kind === "percent" ? "amount" : "percent" })}>
        {d.kind === "percent" ? "%" : currency || "#"}
      </button>
    </div>
  );
}

// AN OFFER'S NAME IS WHAT THE STUDIO TYPED, in the reader's language where
// they typed both. It is data, so it is never translated — only chosen between.
const offerName = (a, locale) => (locale === "ar" && a.promotionNameAr ? a.promotionNameAr : a.promotionName);

function Basket({ tr, rows, priced = [], currency, canReprice, applied = [], locale, onChange, onRemove }) {
  if (!rows.length) {
    return (
      <div className="py-10 text-center">
        <p className="font-display font-700 text-[var(--geex-ink)]">{tr.basketEmpty}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{tr.basketEmptyLead}</p>
      </div>
    );
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-start text-xs uppercase tracking-wide text-slate-500 dark:border-white/10 dark:text-slate-400">
          <th className="py-2 text-start">{tr.item}</th>
          <th className="w-28 py-2 text-center">{tr.qty}</th>
          <th className="w-28 py-2 text-end">{tr.price}</th>
          {canReprice && <th className="w-32 py-2 text-end">{tr.discount}</th>}
          <th className="w-28 py-2 text-end">{tr.amount}</th>
          <th className="w-10" />
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.key} className="border-b border-slate-100 dark:border-white/5">
            <td className="py-2">
              {r.description}<TaxTag category={r.taxCategory} />
              {/* WHICH OFFER TOUCHED THIS LINE, said on the line itself — a
                  cashier asked "why is this cheaper" points at the row. */}
              {applied.filter((a) => a.lineKey === String(i)).map((a, j) => (
                <span key={`${a.promotionId}:${j}`}
                  className="ms-2 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-600 text-emerald-700 dark:text-emerald-300">
                  {offerName(a, locale)}
                </span>
              ))}
            </td>
            <td className="py-2">
              <div className="flex items-center justify-center gap-1">
                <button type="button" className={btnRow} onClick={() => onChange(r.key, { count: Math.max(1, num(r.count) - 1) })}>−</button>
                <input value={r.count} inputMode="decimal" aria-label={tr.qty}
                  onChange={(e) => onChange(r.key, { count: e.target.value })}
                  className="w-12 rounded border border-slate-200 bg-transparent px-1 text-center dark:border-white/15" />
                <button type="button" className={btnRow} onClick={() => onChange(r.key, { count: num(r.count) + 1 })}>+</button>
              </div>
            </td>
            <td className="py-2 text-end">
              {/* A PRICE IS CHANGED ONLY BY WHOEVER MAY — the server ignores a
                  typed price from anybody else and charges the item's. */}
              {canReprice
                ? <input value={r.price} inputMode="decimal" aria-label={tr.price}
                    onChange={(e) => onChange(r.key, { price: e.target.value, unpriced: false })}
                    className="w-24 rounded border border-slate-200 bg-transparent px-1 text-end dark:border-white/15" />
                : r.unpriced
                  ? <span className="text-xs text-amber-700 dark:text-amber-300">{tr.unpriced}</span>
                  : <span className="num">{money(r.price, currency)}</span>}
            </td>
            {canReprice && (
              <td className="py-2 text-end">
                <DiscountInput tr={tr} value={r.discount} currency={currency} onChange={(discount) => onChange(r.key, { discount })} />
              </td>
            )}
            <td className="num py-2 text-end">
              {/* WHAT THE LINE COMES TO, its share of the basket discount included. */}
              {priced[i] && priced[i].net !== priced[i].gross && (
                <span className="me-1 text-xs text-slate-400 line-through">{money(priced[i].gross, currency)}</span>
              )}
              {money(priced[i] ? priced[i].net : num(r.price) * num(r.count), currency)}
            </td>
            <td className="py-2 text-end">
              <button type="button" className={btnRowDanger} aria-label={tr.remove} onClick={() => onRemove(r.key)}>×</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Totals({ tr, totals, terms, promotions = 0 }) {
  const locale = useStudioLocale();
  const tax = taxDict(locale);
  if (!totals) return null;
  const row = "flex justify-between gap-4 text-sm text-slate-500 dark:text-slate-400";
  return (
    <div className="space-y-1">
      {/* THE SHOP'S OFFERS AND THE CASHIER'S DISCOUNT ARE TWO LINES. They are
          two different acts by two different people, and a shop that cannot
          tell them apart cannot tell what its offers cost it. */}
      {promotions > 0 && (
        <p className={row}><span>{tr.offers}</span><span className="num">−{money(promotions, terms.currency)}</span></p>
      )}
      {totals.discounts > 0 && (
        <p className={row}><span>{tr.discounts}</span><span className="num">−{money(totals.discounts, terms.currency)}</span></p>
      )}
      <p className={row}><span>{tr.subtotal}</span><span className="num">{money(totals.subtotal, terms.currency)}</span></p>
      {totals.breakdown.filter((b) => b.rate > 0).map((b) => (
        <p key={`${b.category}:${b.rate}`} className={row}>
          <span>{tr.tax(terms.taxName, b.rate)}</span><span className="num">{money(b.tax, terms.currency)}</span>
        </p>
      ))}
      {totals.breakdown.filter((b) => b.rate === 0 && b.taxable > 0).map((b) => (
        <p key={`${b.category}:0`} className={`${row} text-xs`}>
          <span>{tax.breakdownRow(b.category, 0)}</span><span className="num">{money(b.taxable, terms.currency)}</span>
        </p>
      ))}
      <p className="flex justify-between gap-4 border-t border-slate-200 pt-2 font-display text-2xl font-800 text-[var(--geex-ink)] dark:border-white/10">
        <span>{tr.total}</span>
        <span className="num">{money(totals.total, terms.currency)} <span className="text-sm text-slate-400">{terms.currency}</span></span>
      </p>
      {terms.pricesIncludeTax && <p className="text-xs text-slate-400">{tr.taxIncluded}</p>}
    </div>
  );
}

function CloseShift({ tr, busy, currency, onCancel, onClose }) {
  const [counted, setCounted] = useState("");
  const [notes, setNotes] = useState("");
  return (
    <Dialog title={tr.closeShift} onClose={onCancel} width="max-w-[420px]">
      <Field label={`${tr.countedCash} (${currency})`} type="number" min="0" value={counted} onChange={setCounted} inputProps={{ step: "0.001" }} />
      <div className="mt-3"><Field label={tr.closeNotes} as="textarea" value={notes} onChange={setNotes} inputProps={{ rows: 2 }} /></div>
      <div className="mt-4 flex gap-2">
        <button type="button" className={btn} disabled={busy || counted === ""} onClick={() => onClose(Number(counted), notes)}>{tr.closeShift}</button>
        <button type="button" className={btnGhost} onClick={onCancel}>{tr.cancel}</button>
      </div>
    </Dialog>
  );
}

// WHAT THE BASKET EARNED, on the paying side of the screen where the total is.
// A receipt-level offer has no line to sit on, so it is named here; a line-level
// one is named here AND on its row, because a cashier is asked both "why is the
// total that" and "why is this item cheaper".
function OffersPanel({ tr, offers, currency, canOpen, onOpen }) {
  const locale = useStudioLocale();
  const applied = offers?.applied || [];
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400">{tr.offers}</p>
        {canOpen && <button type="button" className={btnRow} onClick={onOpen}>{tr.offersAction}</button>}
      </div>
      {applied.length === 0
        ? <p className="text-xs text-slate-400">{tr.noOffersNow}</p>
        : (
          <ul className="space-y-1">
            {applied.map((a, i) => (
              <li key={`${a.promotionId}:${a.lineKey || ""}:${i}`} className="flex justify-between gap-3 text-sm text-slate-600 dark:text-slate-300">
                <span className="min-w-0 truncate">{offerName(a, locale)}</span>
                <span className="num shrink-0 text-emerald-700 dark:text-emerald-300">−{money(a.discount, currency)}</span>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}

// THE COUNTER'S TWO ACTS, behind their own rights: choosing an offer the till
// does not apply by itself, and taking off one it did. Neither is a discount —
// a discount is a price the cashier types, and it answers elsewhere.
function OffersDialog({
  tr, locale, currency, offerable, applied, chosen, dropped, coupons,
  can, hasCustomer, onChoose, onDrop, onCoupon, onDropCoupon, onDone,
}) {
  const [code, setCode] = useState("");
  const [problem, setProblem] = useState("");
  const [asking, setAsking] = useState(false);
  const took = new Map();
  applied.forEach((a) => took.set(a.promotionId, (took.get(a.promotionId) || 0) + Number(a.discount || 0)));
  const label = (p) => (locale === "ar" && p.nameAr ? p.nameAr : p.name);

  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{tr.offersLead}</p>

      {offerable.length === 0
        ? <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{tr.noOffersNow}</p>
        : (
          <ul className="mt-3 space-y-2">
            {offerable.map(({ promotion: p }) => {
              const on = took.has(p.id);
              const off = dropped.includes(p.id);
              const picked = chosen.includes(p.id);
              return (
                <li key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-white/10">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-600 text-[var(--geex-ink)]">{label(p)}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {p.code}
                      {on ? ` · ${tr.offerSaves(money(took.get(p.id), currency))}` : ""}
                    </span>
                  </span>
                  {/* AN OFFER WAITING TO BE PICKED IS APPLIED; AN OFFER ALREADY
                      APPLIED IS TAKEN OFF. Two different rights, so the button
                      that appears is the one the reader may press. */}
                  {p.requiresManualSelection && !on
                    ? (can.applyManual && (
                      <button type="button" className={btnRow} onClick={() => onChoose(p.id)}>
                        {picked ? tr.offerRemove : tr.offerApply}
                      </button>
                    ))
                    : off
                      ? (can.removeAuto && <button type="button" className={btnRow} onClick={() => onDrop(p.id)}>{tr.offerRestore}</button>)
                      : (can.removeAuto && on && <button type="button" className={btnRowDanger} onClick={() => onDrop(p.id)}>{tr.offerRemove}</button>)}
                </li>
              );
            })}
          </ul>
        )}

      <div className="mt-4">
        <p className="mb-1 text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400">{tr.couponCode}</p>
        {coupons.length > 0 && (
          <ul className="mb-2 space-y-1">
            {coupons.map((c) => (
              <li key={c.claim.code} className="flex items-center justify-between gap-2 text-sm text-slate-600 dark:text-slate-300">
                <span className="min-w-0 truncate">{tr.couponOn(locale === "ar" && c.nameAr ? c.nameAr : c.name)}</span>
                <button type="button" className={btnRowDanger} onClick={() => onDropCoupon(c.claim.code)}>{tr.offerRemove}</button>
              </li>
            ))}
          </ul>
        )}
        {/* EVERY COUPON IS REDEEMED AGAINST A CUSTOMER, public ones included —
            without one a per-customer limit cannot be enforced. Said here
            rather than refused after typing. */}
        {!hasCustomer
          ? <p className="text-xs text-amber-700 dark:text-amber-300">{tr.couponNeedsCustomer}</p>
          : (
            <div className="flex items-end gap-2">
              <div className="flex-1"><Field label={tr.couponCode} value={code} hint={tr.couponHint} onChange={(v) => { setCode(v); setProblem(""); }} /></div>
              <button type="button" className={btnGhost} disabled={asking || !code.trim()}
                onClick={async () => {
                  setAsking(true);
                  const said = await onCoupon(code);
                  setAsking(false);
                  setProblem(said);
                  if (!said) setCode("");
                }}>{tr.couponApply}</button>
            </div>
          )}
        {problem && <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{problem}</p>}
      </div>

      <div className="mt-4"><button type="button" className={btn} onClick={onDone}>{tr.done}</button></div>
    </div>
  );
}
