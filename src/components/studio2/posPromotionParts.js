"use client";

// THE OFFERS SCREEN'S WORKING PARTS — the editor, its preview, the coupons and
// the report. Split off StudioPosPromotions for the reason posParts is split
// off StudioPos: one file per screen becomes one file nobody can read.
//
// THE PREVIEW RUNS THE REAL ENGINE. It is the same `evaluate` the till runs and
// the server runs at the sale, on a basket that is not a sale — so what the
// editor promises and what the counter charges cannot be two different answers.

import { useMemo, useState } from "react";
import { Field } from "@/components/fields/Field";
import SelectMenu from "@/components/fields/SelectMenu";
import { btn, btnGhost, btnRow, btnRowDanger, money } from "@/components/studio2/ui";
import { pathIds } from "@/shared/departments/tree";
import {
  evaluate, emptyPromotion, presetDraft, PRESET_KEYS,
  CONDITION_TYPES, BENEFIT_TYPES, APPLIES_TO, THRESHOLD_TYPES, CHANNELS,
} from "@/modules/sales/posPromotionsModel";

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const INPUT = "w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-white/15";
const legend = "mb-2 text-xs font-700 uppercase tracking-wide text-slate-500 dark:text-slate-400";
const box = "rounded-xl border border-slate-200 p-3 dark:border-white/10";

// `2026-09-22T00:00` for a datetime-local box, out of a stored instant.
const forInput = (iso) => (iso ? String(iso).slice(0, 16) : "");
const fromInput = (v) => (v ? new Date(v).toISOString() : "");

/** A checkbox list. Used wherever an offer names several of something. */
function Multi({ label, hint, options, value, onChange }) {
  const chosen = new Set(value || []);
  return (
    <div>
      <p className={legend}>{label}</p>
      {hint && <p className="mb-1 text-xs text-slate-400">{hint}</p>}
      <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 p-2 dark:border-white/10">
        {options.length === 0
          ? <p className="text-xs text-slate-400">—</p>
          : options.map((o) => (
            <label key={o.value} className="flex items-center gap-2 py-0.5 text-sm">
              <input type="checkbox" checked={chosen.has(o.value)}
                onChange={(e) => {
                  const next = new Set(chosen);
                  if (e.target.checked) next.add(o.value); else next.delete(o.value);
                  onChange([...next]);
                }} />
              <span className="truncate">{o.label}</span>
            </label>
          ))}
      </div>
    </div>
  );
}

function Check({ label, hint, checked, onChange }) {
  return (
    <label className="flex items-start gap-2 py-1 text-sm">
      <input type="checkbox" className="mt-1" checked={Boolean(checked)} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="text-[var(--geex-ink)]">{label}</span>
        {hint && <span className="block text-xs text-slate-400">{hint}</span>}
      </span>
    </label>
  );
}

// A LIMIT LEFT EMPTY IS NULL, NOT NOUGHT. Nought is a real limit — nobody may
// use it — so an empty box has to send null and never `0`.
function LimitField({ label, hint, value, onChange }) {
  return (
    <Field label={label} type="number" min="0" hint={hint}
      value={value === null || value === undefined ? "" : String(value)}
      onChange={(v) => onChange(v === "" ? null : Number(v))} />
  );
}

/**
 * THE EDITOR. It edits ONE object with the engine's own shape, so nothing is
 * mapped between what is drawn and what is stored — a mapping layer here would
 * be a second description of an offer, free to drift from the engine's.
 */
export function OfferEditor({ tr, locale, data, promotion, busy, onSave, onCancel }) {
  const [draft, setDraft] = useState(() => (promotion
    ? { ...emptyPromotion(new Date().toISOString()), ...promotion }
    : emptyPromotion(new Date().toISOString())));
  const [advanced, setAdvanced] = useState(Boolean(promotion));
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  const items = data.items || [];
  const itemOptions = items.map((i) => ({ value: i.id, label: [i.name, i.sku].filter(Boolean).join(" · ") }));
  const typeOptions = (data.itemTypes || []).map((t) => ({ value: t, label: t }));
  const vendorOptions = (data.vendors || []).map((v) => ({ value: v.id, label: v.name }));
  const tillOptions = (data.tills || []).map((t) => ({ value: t.id, label: [t.code, t.name].filter(Boolean).join(" · ") }));
  const unitOptions = (data.units || []).map((u) => ({ value: u, label: u }));
  const tagOptions = (data.tags || []).map((t) => ({ value: t.id, label: locale === "ar" && t.nameAr ? t.nameAr : t.name }));
  // INDENTED BY DEPTH, because choosing "Tools" and choosing "Tools › Drills"
  // are different offers and a flat list hides which is which. Picking a parent
  // matches everything under it — the engine reads the line's whole path.
  const categoryOptions = (data.categories || []).map((c) => ({
    value: c.id,
    label: `${"\u00a0\u00a0".repeat(Math.max(0, Number(c.depth) || 0))}${locale === "ar" && c.nameAr ? c.nameAr : c.name}`,
  }));

  const tiers = draft.tiers || [];
  const conditions = draft.conditions || [];
  const setTier = (i, patch) => set({ tiers: tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)) });
  const setBenefit = (ti, bi, patch) => setTier(ti, {
    benefits: (tiers[ti].benefits || []).map((b, j) => (j === bi ? { ...b, ...patch } : b)),
  });

  return (
    <div className="space-y-5">
      {/* A SHAPE TO START FROM, offered only on a new offer: applying one to an
          offer that already has rules would silently throw them away. */}
      {!promotion && (
        <section>
          <p className={legend}>{tr.preset}</p>
          <p className="mb-2 text-xs text-slate-400">{tr.presetLead}</p>
          <div className="flex flex-wrap gap-2">
            {PRESET_KEYS.map((k) => (
              <button key={k} type="button" className={btnRow}
                onClick={() => setDraft((d) => ({ ...d, ...presetDraft(k) }))}>
                {{
                  "buy-x-get-y": tr.presetBuyXGetY,
                  "percent-off": tr.presetPercentOff,
                  "spend-save": tr.presetSpendSave,
                  bundle: tr.presetBundle,
                  "coupon-only": tr.presetCouponOnly,
                }[k]}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className={box}>
        <p className={legend}>{tr.basics}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={tr.name} value={draft.name || ""} onChange={(v) => set({ name: v })} />
          <Field label={tr.nameAr} value={draft.nameAr || ""} onChange={(v) => set({ nameAr: v })} />
        </div>
        <div className="mt-3"><Field label={tr.description} as="textarea" inputProps={{ rows: 2 }}
          value={draft.description || ""} onChange={(v) => set({ description: v })} /></div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label={tr.startsAt} type="datetime-local" value={forInput(draft.startsAt)}
            onChange={(v) => set({ startsAt: fromInput(v) })} />
          {/* AN OPEN-ENDED OFFER IS AN OFFER WITH NO END, not a second kind of
              offer. Empty stores null and the engine reads it as no end. */}
          <Field label={tr.endsAt} type="datetime-local" hint={tr.endsAtHint} value={forInput(draft.endsAt)}
            onChange={(v) => set({ endsAt: v ? fromInput(v) : null })} />
        </div>
      </section>

      <section className={box}>
        <p className={legend}>{tr.whatItTakesOff}</p>
        {tiers.map((t, ti) => (
          <div key={ti} className="mb-3 rounded-lg border border-slate-200 p-3 dark:border-white/10">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-sm font-600 text-[var(--geex-ink)]">{tr.tier(ti + 1)}</span>
              <button type="button" className={btnRowDanger}
                onClick={() => set({ tiers: tiers.filter((_, j) => j !== ti) })}>{tr.remove}</button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-xs text-slate-400">{tr.threshold}</p>
                <SelectMenu className={INPUT} value={t.thresholdType} aria-label={tr.threshold}
                  onChange={(v) => setTier(ti, { thresholdType: v, ...(v === "none" ? { thresholdValue: 0 } : {}) })}
                  options={THRESHOLD_TYPES.map((x) => ({ value: x, label: tr.thresholdType(x) }))} />
              </div>
              {t.thresholdType !== "none" && (
                <Field label={tr.thresholdValue} type="number" min="0" value={String(t.thresholdValue ?? "")}
                  onChange={(v) => setTier(ti, { thresholdValue: num(v) })} />
              )}
            </div>
            {(t.benefits || []).map((b, bi) => (
              <div key={bi} className="mt-2 rounded-lg bg-slate-50 p-2 dark:bg-white/5">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs text-slate-400">{tr.benefit}</p>
                    <SelectMenu className={INPUT} value={b.type} aria-label={tr.benefit}
                      onChange={(v) => setBenefit(ti, bi, { type: v, value: {} })}
                      options={BENEFIT_TYPES.map((x) => ({ value: x, label: tr.benefitType(x) }))} />
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-slate-400">{tr.appliesTo(b.appliesTo)}</p>
                    <SelectMenu className={INPUT} value={b.appliesTo} aria-label={tr.appliesTo(b.appliesTo)}
                      onChange={(v) => setBenefit(ti, bi, { appliesTo: v })}
                      options={APPLIES_TO.map((x) => ({ value: x, label: tr.appliesTo(x) }))} />
                  </div>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {b.type === "percentage_off" && (
                    <Field label={tr.percent} type="number" min="0" value={String(b.value?.percent ?? "")}
                      onChange={(v) => setBenefit(ti, bi, { value: { ...b.value, percent: num(v) } })} />
                  )}
                  {b.type === "fixed_amount_off" && (
                    <Field label={tr.amount} type="number" min="0" value={String(b.value?.amount ?? "")}
                      onChange={(v) => setBenefit(ti, bi, { value: { ...b.value, amount: num(v) } })} />
                  )}
                  {(b.type === "fixed_price" || b.type === "bundle_price") && (
                    <Field label={tr.price} type="number" min="0" value={String(b.value?.price ?? "")}
                      onChange={(v) => setBenefit(ti, bi, { value: { ...b.value, price: num(v) } })} />
                  )}
                  {b.type === "buy_x_get_y" && (
                    <>
                      <Field label={tr.buy} type="number" min="1" value={String(b.value?.buy ?? "")}
                        onChange={(v) => setBenefit(ti, bi, { value: { ...b.value, buy: num(v) } })} />
                      <Field label={tr.get} type="number" min="1" value={String(b.value?.get ?? "")}
                        onChange={(v) => setBenefit(ti, bi, { value: { ...b.value, get: num(v) } })} />
                    </>
                  )}
                  {b.type === "points_multiplier" && (
                    <Field label={tr.points} type="number" min="0" value={String(b.value?.multiplier ?? "")}
                      onChange={(v) => setBenefit(ti, bi, { value: { ...b.value, multiplier: num(v) } })} />
                  )}
                  {(b.type === "free_item" || b.appliesTo === "specific_item") && (
                    <div>
                      <p className="mb-1 text-xs text-slate-400">{tr.item}</p>
                      <SelectMenu className={INPUT} value={b.value?.itemId || ""} aria-label={tr.item}
                        onChange={(v) => setBenefit(ti, bi, { value: { ...b.value, itemId: v } })}
                        options={[{ value: "", label: "—" }, ...itemOptions]} />
                    </div>
                  )}
                </div>
                <button type="button" className={`${btnRowDanger} mt-2`}
                  onClick={() => setTier(ti, { benefits: (t.benefits || []).filter((_, j) => j !== bi) })}>
                  {tr.remove}
                </button>
              </div>
            ))}
            <button type="button" className={`${btnGhost} mt-2`}
              onClick={() => setTier(ti, { benefits: [...(t.benefits || []), { type: "percentage_off", value: { percent: 10 }, appliesTo: "matched_lines" }] })}>
              {tr.addBenefit}
            </button>
          </div>
        ))}
        <button type="button" className={btnGhost}
          onClick={() => set({ tiers: [...tiers, { thresholdType: "none", thresholdValue: 0, benefits: [] }] })}>
          {tr.addTier}
        </button>
      </section>

      <section className={box}>
        <p className={legend}>{tr.whatEarnsIt}</p>
        {conditions.map((c, ci) => {
          const setValue = (patch) => set({
            conditions: conditions.map((x, j) => (j === ci ? { ...x, value: { ...x.value, ...patch } } : x)),
          });
          return (
            <div key={ci} className="mb-3 rounded-lg border border-slate-200 p-3 dark:border-white/10">
              <div className="mb-2 flex items-center gap-2">
                <SelectMenu className={INPUT} value={c.type} aria-label={tr.condition}
                  onChange={(v) => set({ conditions: conditions.map((x, j) => (j === ci ? { type: v, value: {} } : x)) })}
                  options={CONDITION_TYPES.map((x) => ({ value: x, label: tr.conditionType(x) }))} />
                <button type="button" className={btnRowDanger}
                  onClick={() => set({ conditions: conditions.filter((_, j) => j !== ci) })}>{tr.remove}</button>
              </div>
              {(c.type === "item_in_list" || c.type === "item_not_in_list") && (
                <Multi label={tr.items} hint={tr.itemsHint} options={itemOptions}
                  value={c.value?.itemIds} onChange={(itemIds) => setValue({ itemIds })} />
              )}
              {c.type === "item_category" && (
                <Multi label={tr.categories} hint={tr.categoriesHint} options={categoryOptions}
                  value={c.value?.categoryIds} onChange={(categoryIds) => setValue({ categoryIds })} />
              )}
              {c.type === "category_in_list" && (
                <Multi label={tr.types} options={typeOptions} value={c.value?.categories}
                  onChange={(categories) => setValue({ categories })} />
              )}
              {c.type === "brand_in_list" && (
                <Multi label={tr.vendors} options={vendorOptions} value={c.value?.brands}
                  onChange={(brands) => setValue({ brands })} />
              )}
              {c.type === "min_quantity" && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Field label={tr.qty} type="number" min="0" value={String(c.value?.qty ?? "")}
                    onChange={(v) => setValue({ qty: num(v) })} />
                  {/* A QUANTITY CONDITION NAMES ITS UNIT. "Three" of what is a
                      different offer for a box and for a bottle. */}
                  <div>
                    <p className="mb-1 text-xs text-slate-400">{tr.unit}</p>
                    <SelectMenu className={INPUT} value={c.value?.unit || ""} aria-label={tr.unit}
                      onChange={(v) => setValue({ unit: v })}
                      options={[{ value: "", label: "—" }, ...unitOptions]} />
                  </div>
                </div>
              )}
              {c.type === "min_amount" && (
                <Field label={tr.amount} type="number" min="0" value={String(c.value?.amount ?? "")}
                  onChange={(v) => setValue({ amount: num(v) })} />
              )}
              {c.type === "customer_tag" && (
                <Multi label={tr.tags} options={tagOptions} value={c.value?.tagIds}
                  onChange={(tagIds) => setValue({ tagIds })} />
              )}
              {c.type === "payment_method" && (
                <Multi label={tr.methods}
                  options={["cash", "card", "transfer"].map((m) => ({ value: m, label: tr.method(m) }))}
                  value={c.value?.methods} onChange={(methods) => setValue({ methods })} />
              )}
            </div>
          );
        })}
        <button type="button" className={btnGhost}
          onClick={() => set({ conditions: [...conditions, { type: "item_in_list", value: { itemIds: [] } }] })}>
          {tr.addCondition}
        </button>
      </section>

      {!advanced
        ? <button type="button" className={btnGhost} onClick={() => setAdvanced(true)}>{tr.advanced}</button>
        : (
          <>
            <section className={box}>
              <p className={legend}>{tr.whereAndWhen}</p>
              <p className="mb-2 text-xs text-slate-400">
                {data.timezone ? tr.timezoneNote(data.timezone) : tr.timezoneUnset}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Multi label={tr.tills} hint={tr.tillsAll} options={tillOptions}
                  value={draft.tillIds} onChange={(tillIds) => set({ tillIds })} />
                <div>
                  <p className={legend}>{tr.channel}</p>
                  <SelectMenu className={INPUT} value={draft.channels || "pos"} aria-label={tr.channel}
                    onChange={(v) => set({ channels: v })}
                    options={CHANNELS.map((c) => ({ value: c, label: tr.channelName(c) }))} />
                </div>
              </div>
              <div className="mt-3">
                <Multi label={tr.scheduleDays}
                  options={[0, 1, 2, 3, 4, 5, 6].map((d) => ({ value: String(d), label: tr.day(d) }))}
                  value={(draft.schedule?.days || []).map(String)}
                  onChange={(days) => set({
                    schedule: { days: days.map(Number).sort(), windows: draft.schedule?.windows || [] },
                  })} />
              </div>
              <div className="mt-3">
                <p className={legend}>{tr.windows}</p>
                {(draft.schedule?.windows || []).map((w, wi) => (
                  <div key={wi} className="mb-2 flex items-end gap-2">
                    <Field label={tr.from} type="time" value={w.from || ""}
                      onChange={(v) => set({
                        schedule: {
                          days: draft.schedule?.days || [],
                          windows: (draft.schedule?.windows || []).map((x, j) => (j === wi ? { ...x, from: v } : x)),
                        },
                      })} />
                    <Field label={tr.to} type="time" value={w.to || ""}
                      onChange={(v) => set({
                        schedule: {
                          days: draft.schedule?.days || [],
                          windows: (draft.schedule?.windows || []).map((x, j) => (j === wi ? { ...x, to: v } : x)),
                        },
                      })} />
                    <button type="button" className={btnRowDanger}
                      onClick={() => set({
                        schedule: {
                          days: draft.schedule?.days || [],
                          windows: (draft.schedule?.windows || []).filter((_, j) => j !== wi),
                        },
                      })}>{tr.remove}</button>
                  </div>
                ))}
                <button type="button" className={btnGhost}
                  onClick={() => set({
                    schedule: {
                      days: draft.schedule?.days || [],
                      windows: [...(draft.schedule?.windows || []), { from: "09:00", to: "17:00" }],
                    },
                  })}>{tr.addWindow}</button>
              </div>
            </section>

            <section className={box}>
              <p className={legend}>{tr.who}</p>
              <Check label={tr.firstPurchaseOnly} checked={draft.eligibility?.firstPurchaseOnly}
                onChange={(firstPurchaseOnly) => set({
                  eligibility: { tagIds: draft.eligibility?.tagIds || [], firstPurchaseOnly },
                })} />
              <div className="mt-2">
                <Multi label={tr.eligibleTags} options={tagOptions} value={draft.eligibility?.tagIds}
                  onChange={(tagIds) => set({
                    eligibility: { tagIds, firstPurchaseOnly: draft.eligibility?.firstPurchaseOnly === true },
                  })} />
              </div>
            </section>

            <section className={box}>
              <p className={legend}>{tr.limits}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <LimitField label={tr.maxDiscountAmount} hint={tr.maxDiscountHint}
                  value={draft.maxDiscountAmount} onChange={(maxDiscountAmount) => set({ maxDiscountAmount })} />
                <LimitField label={tr.maxUsesTotal} hint={tr.noLimit}
                  value={draft.maxUsesTotal} onChange={(maxUsesTotal) => set({ maxUsesTotal })} />
                <LimitField label={tr.maxUsesPerCustomer} hint={tr.noLimit}
                  value={draft.maxUsesPerCustomer} onChange={(maxUsesPerCustomer) => set({ maxUsesPerCustomer })} />
                <LimitField label={tr.maxUsesPerDay} hint={tr.noLimit}
                  value={draft.maxUsesPerDay} onChange={(maxUsesPerDay) => set({ maxUsesPerDay })} />
              </div>
            </section>

            <section className={box}>
              <p className={legend}>{tr.howItApplies}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs text-slate-400">{tr.applicationLevel}</p>
                  <SelectMenu className={INPUT} value={draft.applicationLevel} aria-label={tr.applicationLevel}
                    onChange={(v) => set({ applicationLevel: v })}
                    options={["line", "receipt"].map((l) => ({ value: l, label: tr.levelName(l) }))} />
                </div>
                <Field label={tr.priority} type="number" min="0" hint={tr.priorityHint}
                  value={String(draft.priority ?? 100)} onChange={(v) => set({ priority: num(v) })} />
              </div>
              <Check label={tr.exclusive} hint={tr.exclusiveHint} checked={draft.exclusive}
                onChange={(exclusive) => set({ exclusive })} />
              <Check label={tr.requiresManualSelection} hint={tr.requiresManualHint}
                checked={draft.requiresManualSelection}
                onChange={(requiresManualSelection) => set({ requiresManualSelection })} />
              <Check label={tr.requiresCoupon} hint={tr.requiresCouponHint} checked={draft.requiresCoupon}
                onChange={(requiresCoupon) => set({ requiresCoupon })} />
            </section>
          </>
        )}

      <OfferPreview tr={tr} data={data} promotion={draft} />

      <div className="flex gap-2">
        <button type="button" className={btn} disabled={busy || !draft.name} onClick={() => onSave(draft)}>{tr.save}</button>
        <button type="button" className={btnGhost} onClick={onCancel}>{tr.cancel}</button>
      </div>
    </div>
  );
}

/**
 * A BASKET THAT IS NOT A SALE, priced by the engine itself. It runs with the
 * offer's own status ignored — the point is to see what the RULES do, and a
 * draft would otherwise always answer "not running", which teaches nothing.
 */
export function OfferPreview({ tr, data, promotion }) {
  const [lines, setLines] = useState([]);
  // Memoised because the preview re-prices on it: a fresh [] every render
  // would re-run the engine on every keystroke anywhere in the editor.
  const items = useMemo(() => data.items || [], [data.items]);
  // THE PREVIEW WALKS THE TREE ITSELF because the offers payload carries the
  // register (for the picker) rather than a path per item — one shape serving
  // both, rather than the same tree sent twice in two forms.
  const pathOf = useMemo(() => {
    const rows = data.categories || [];
    return (id) => (id ? pathIds(rows, String(id)) : []);
  }, [data.categories]);
  const currency = data.currency || "";

  const priced = useMemo(() => {
    if (!lines.length) return null;
    const live = { ...promotion, id: promotion.id || "preview", code: promotion.code || "PREVIEW", status: "active" };
    return evaluate({
      lines: lines.map((l, i) => {
        const item = items.find((x) => x.id === l.itemId) || {};
        return {
          key: String(i), itemId: l.itemId, description: item.name || "",
          count: num(l.count), price: num(l.price),
          unit: item.unit || "", itemType: item.itemType || "", vendorId: item.vendorId || "",
          categoryPath: pathOf(item.categoryId),
          excluded: item.excludedFromPromotions === true,
        };
      }),
      promotions: [live],
    }, {
      now: new Date().toISOString(),
      timezone: data.timezone || "",
      currency,
      channel: promotion.channels === "online" ? "online" : "pos",
      // THE PREVIEW STANDS IN FOR EVERY DOOR THE OFFER MIGHT NEED. A rule that
      // waits for a cashier's choice or a coupon would otherwise show nothing,
      // and the estimator would conclude the rule is broken.
      customer: { id: "preview", tagIds: promotion.eligibility?.tagIds || [], firstPurchase: true },
      may: { applyManual: true, removeAuto: true },
      selected: [promotion.id || "preview"],
      coupons: promotion.requiresCoupon ? [{ code: "PREVIEW", promotionId: promotion.id || "preview" }] : [],
      paymentMethods: ["cash", "card", "transfer"],
    });
  }, [lines, promotion, items, currency, data.timezone, pathOf]);

  return (
    <section className={box}>
      <p className={legend}>{tr.preview}</p>
      <p className="mb-2 text-xs text-slate-400">{tr.previewLead}</p>
      {lines.map((l, i) => (
        <div key={i} className="mb-2 flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <SelectMenu className={INPUT} value={l.itemId} aria-label={tr.item}
              onChange={(v) => {
                const item = items.find((x) => x.id === v);
                setLines((rows) => rows.map((r, j) => (j === i
                  ? { ...r, itemId: v, price: item ? item.sellPrice : r.price } : r)));
              }}
              options={items.map((x) => ({ value: x.id, label: x.name }))} />
          </div>
          <Field label={tr.qty} type="number" min="1" value={String(l.count)}
            onChange={(v) => setLines((rows) => rows.map((r, j) => (j === i ? { ...r, count: num(v) } : r)))} />
          <Field label={tr.price} type="number" min="0" value={String(l.price)}
            onChange={(v) => setLines((rows) => rows.map((r, j) => (j === i ? { ...r, price: num(v) } : r)))} />
          <button type="button" className={btnRowDanger}
            onClick={() => setLines((rows) => rows.filter((_, j) => j !== i))}>{tr.remove}</button>
        </div>
      ))}
      <button type="button" className={btnGhost} disabled={!items.length}
        onClick={() => setLines((rows) => [...rows, { itemId: items[0]?.id || "", count: 1, price: items[0]?.sellPrice || 0 }])}>
        {tr.previewAdd}
      </button>

      {!priced ? <p className="mt-2 text-xs text-slate-400">{tr.previewEmpty}</p> : (
        <div className="mt-3 space-y-1 text-sm">
          {priced.discountTotal > 0
            ? <p className="font-700 text-emerald-700 dark:text-emerald-300">{tr.previewTakesOff(`${money(priced.discountTotal, currency)} ${currency}`)}</p>
            : <p className="text-slate-500 dark:text-slate-400">{tr.previewNothing}</p>}
          {priced.lines.filter((l) => l.promotionDiscount > 0).map((l) => (
            <p key={l.key} className="flex justify-between gap-3 text-slate-500 dark:text-slate-400">
              <span className="truncate">{l.description}</span>
              <span className="num">−{money(l.promotionDiscount, currency)}</span>
            </p>
          ))}
          {/* WHY IT DID NOT APPLY, in the engine's own words. Without this the
              editor can only say nothing happened, which is the least useful
              thing it could say. */}
          {priced.skipped.map((s, i) => (
            <p key={i} className="text-xs text-amber-700 dark:text-amber-300">{tr.skipped(s.reason)}</p>
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * THE CODES. Minting is the only act here that creates anything; a code is
 * CANCELLED rather than deleted, because a redemption names the coupon it spent.
 */
export function CouponsTab({ tr, locale, data, detail, promotionId, onPick, busy, onMint, onVoid }) {
  const [form, setForm] = useState({
    distribution: "public", code: "", count: 50, prefix: "", customerId: "",
    singleUse: true, maxRedemptions: null, perCustomerLimit: null, expiresAt: "",
  });
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const coupons = detail?.coupons || [];
  const promotions = data.promotions || [];

  // A CSV IS BUILT HERE AND NOT ASKED FOR: the codes are already on screen, and
  // a download route would be a second door onto the same secret.
  const download = () => {
    const rows = [["code", "status", "redeemed", "expires"], ...coupons.map((c) => [
      c.code, c.status, String(c.redeemed || 0), c.expiresAt || "",
    ])];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `coupons-${detail?.promotion?.code || "offer"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div>
        <p className={legend}>{tr.pickOffer}</p>
        <SelectMenu className={INPUT} value={promotionId} aria-label={tr.pickOffer} onChange={onPick}
          options={[{ value: "", label: "—" }, ...promotions.map((p) => ({
            value: p.id, label: `${p.code} · ${locale === "ar" && p.nameAr ? p.nameAr : p.name}`,
          }))]} />
      </div>

      {promotionId && (
        <>
          <section className={box}>
            <p className={legend}>{tr.mint}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-xs text-slate-400">{tr.distribution}</p>
                <SelectMenu className={INPUT} value={form.distribution} aria-label={tr.distribution}
                  onChange={(v) => set({ distribution: v })}
                  options={["public", "personal", "batch"].map((d) => ({ value: d, label: tr.distributionName(d) }))} />
              </div>
              {form.distribution === "batch"
                ? <Field label={tr.count} type="number" min="1" value={String(form.count)} onChange={(v) => set({ count: num(v) })} />
                : <Field label={tr.couponCode} hint={tr.couponCodeHint} value={form.code} onChange={(v) => set({ code: v })} />}
              {form.distribution === "batch" && (
                <Field label={tr.prefix} value={form.prefix} onChange={(v) => set({ prefix: v })} />
              )}
              {form.distribution === "personal" && (
                <Field label={tr.customer} hint={tr.customerHint} value={form.customerId} onChange={(v) => set({ customerId: v })} />
              )}
              <LimitField label={tr.maxRedemptions} hint={tr.noLimit} value={form.maxRedemptions}
                onChange={(maxRedemptions) => set({ maxRedemptions })} />
              <LimitField label={tr.perCustomerLimit} hint={tr.noLimit} value={form.perCustomerLimit}
                onChange={(perCustomerLimit) => set({ perCustomerLimit })} />
              <Field label={tr.expiresAt} type="datetime-local" value={forInput(form.expiresAt)}
                onChange={(v) => set({ expiresAt: v ? fromInput(v) : "" })} />
            </div>
            <Check label={tr.singleUse} checked={form.singleUse} onChange={(singleUse) => set({ singleUse })} />
            <button type="button" className={`${btn} mt-2`} disabled={busy}
              onClick={() => onMint({ ...form, promotionId })}>{tr.mint}</button>
          </section>

          <section className={box}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className={legend}>{tr.couponsFor}</p>
              {coupons.length > 0 && <button type="button" className={btnRow} onClick={download}>{tr.exportCsv}</button>}
            </div>
            {coupons.length === 0 ? <p className="text-sm text-slate-400">{tr.noCoupons}</p> : (
              <table className="w-full text-sm">
                <tbody>
                  {coupons.map((c) => (
                    <tr key={c.id} className="border-t border-slate-100 dark:border-white/5">
                      <td className="py-2 pe-3 font-mono">{c.code}</td>
                      <td className="py-2 pe-3 text-slate-500 dark:text-slate-400">{tr.distributionName(c.distribution)}</td>
                      <td className="py-2 pe-3 text-slate-500 dark:text-slate-400">{tr.redeemedTimes(Number(c.redeemed || 0))}</td>
                      <td className="py-2 pe-3 text-slate-500 dark:text-slate-400">{tr.couponStatus(c.status)}</td>
                      <td className="py-2 text-end">
                        {c.status !== "void" && (
                          <button type="button" className={btnRowDanger} onClick={() => onVoid(c.id)}>{tr.voidCoupon}</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  );
}

/** What the offers did — redemptions and discount, per offer, per day, per till. */
export function ReportTab({ tr, locale, report, from, to, onRange, onRun, busy }) {
  const currency = report?.currency || "";
  const th = "py-2 pe-3 text-start text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400";
  const td = "py-2 pe-3";
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <Field label={tr.reportFrom} type="date" value={from} onChange={(v) => onRange({ from: v, to })} />
        <Field label={tr.reportTo} type="date" value={to} onChange={(v) => onRange({ from, to: v })} />
        <button type="button" className={btn} disabled={busy} onClick={onRun}>{tr.reportRun}</button>
      </div>

      {!report ? null : report.promotions.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{tr.reportEmpty}</p>
      ) : (
        <>
          <section className={box}>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={th}>{tr.title}</th>
                  <th className={th}>{tr.used}</th>
                  <th className={th}>{tr.discountGiven}</th>
                  <th className={th}>{tr.customers}</th>
                  <th className={th}>{tr.couponsIssued}</th>
                  <th className={th}>{tr.couponsRedeemed}</th>
                  <th className={th}>{tr.couponRate}</th>
                </tr>
              </thead>
              <tbody>
                {report.promotions.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100 dark:border-white/5">
                    <td className={td}>{locale === "ar" && p.nameAr ? p.nameAr : p.name}</td>
                    <td className={`${td} num`}>{p.used}</td>
                    <td className={`${td} num`}>{money(p.discount, currency)}</td>
                    <td className={`${td} num`}>{p.customers}</td>
                    <td className={`${td} num`}>{p.couponsIssued}</td>
                    <td className={`${td} num`}>{p.couponsRedeemed}</td>
                    {/* NULL RATHER THAN ZERO: an offer with no codes has no
                        take-up, and "0%" would read as one nobody used. */}
                    <td className={`${td} num`}>{p.couponRate === null ? "—" : `${p.couponRate}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <div className="grid gap-4 lg:grid-cols-3">
            <section className={box}>
              <p className={legend}>{tr.byDay}</p>
              {report.days.map((d) => (
                <p key={d.day} className="flex justify-between gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <span>{d.day}</span><span className="num">{money(d.discount, currency)}</span>
                </p>
              ))}
            </section>
            <section className={box}>
              <p className={legend}>{tr.byTill}</p>
              {report.tills.map((t) => (
                <p key={t.terminalId} className="flex justify-between gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <span className="truncate">{t.terminalId}</span><span className="num">{money(t.discount, currency)}</span>
                </p>
              ))}
            </section>
            <section className={box}>
              <p className={legend}>{tr.topCustomers}</p>
              {report.customers.map((c) => (
                <p key={c.customerId} className="flex justify-between gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <span className="truncate">{c.customerId}</span><span className="num">{money(c.discount, currency)}</span>
                </p>
              ))}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
