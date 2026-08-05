// Shared math for the quotation "sheet" (the itemised tables built in the
// full-screen builder). Keeping it in one place means the left-hand legend, the
// right-hand live preview and the eventual .docx/.pdf export can never disagree.
//
// Sheet shape: { itc:Number, tables:[{ id, title, rows:[{ id, itemId, qty, margin }] }] }
//   • itc / margin are PERCENTAGES: 30 => a ×1.30 multiplier.
//   • Everything else (image, model, description, cost price) is resolved live
//     from the Registered Items catalogue by itemId, so prices stay current.

export const VAT_RATE = 0.15;

// Building type shown on the quotation cover: "Residential" only when the
// ticket's industry is Residential, otherwise everything else is "Commercial".
export function quotationBuildingType(industry) {
  return String(industry || "").trim().toLowerCase() === "residential" ? "Residential" : "Commercial";
}

// Fallback Introduction / Summary copy for the quotation cover, per building
// type. A Technical Leader can override these in Technical → Settings
// (stored in settings.quotationCopy); these are used when nothing is set.
export const DEFAULT_QUOTATION_COPY = {
  Residential: {
    intro: "Thank you for the opportunity to propose an integrated smart-home and audio-visual solution for your residence. This quotation sets out the systems, equipment and professional services we recommend to bring comfort, convenience and reliable performance to your home.",
    summary: "The scope below covers the design, supply, installation, testing and commissioning of the residential systems detailed in the following tables — delivered turnkey by MegaTech Arabia, with complementary post-handover support.",
  },
  Commercial: {
    intro: "Thank you for the opportunity to propose an integrated technology solution for your project. This quotation sets out the audio-visual, IT and low-current systems, equipment and professional services engineered to meet the operational requirements of your facility.",
    summary: "The scope below covers the design, supply, installation, testing and commissioning of the commercial systems detailed in the following tables — delivered turnkey by MegaTech Arabia, with complementary post-handover support.",
  },
};
export function defaultQuotationCopy(bt) {
  return DEFAULT_QUOTATION_COPY[bt] || DEFAULT_QUOTATION_COPY.Commercial;
}

// Selling unit price from a buy cost + margin %. 30% margin => cost × 1.30.
export function sellingPrice(cost, margin) {
  const c = Number(cost) || 0;
  const m = Number(margin) || 0;
  return c * (1 + m / 100);
}

export function computeRow(item, row) {
  const free = !!row?.free; // marked "Included" — customer isn't charged
  const cost = Number(item?.price) || 0;
  const qty = Number(row?.qty) || 0;
  const margin = Number(row?.margin) || 0;
  // Per-item discount % (0–100) — reduces the selling unit price for this line.
  const discount = Math.min(100, Math.max(0, Number(row?.discount) || 0));
  // A free item is fully zeroed: its cost, selling and line total are all 0.
  const gross = free ? 0 : sellingPrice(cost, margin);   // pre-discount selling unit
  const single = gross * (1 - discount / 100);           // discounted selling unit
  const total = single * qty;                            // selling line total
  const lineCost = free ? 0 : cost * qty;                // buy line total
  return { free, cost: free ? 0 : cost, qty, margin, discount, gross, single, total, lineCost, profit: total - lineCost };
}

// Resolves rows against the catalogue and rolls everything up. `itemsById` is a
// map of itemId -> Registered Item.
export function computeSheet(sheet, itemsById = {}) {
  const tables = (sheet?.tables || []).map((t) => {
    const rows = (t.rows || []).map((r) => {
      const item = itemsById[r.itemId] || null;
      return { ...r, item, calc: computeRow(item, r) };
    });
    const totals = rows.reduce(
      (a, r) => ({
        qty: a.qty + r.calc.qty,
        cost: a.cost + r.calc.lineCost,
        selling: a.selling + r.calc.total,
      }),
      { qty: 0, cost: 0, selling: 0 }
    );
    return { ...t, rows, totals };
  });

  const totals = tables.reduce(
    (a, t) => ({
      qty: a.qty + t.totals.qty,
      cost: a.cost + t.totals.cost,
      selling: a.selling + t.totals.selling,
    }),
    { qty: 0, cost: 0, selling: 0 }
  );
  const profit = totals.selling - totals.cost;

  // IT&C is only applied once a % is actually entered — an empty field means
  // "not set" and contributes nothing (rather than a silent 0%).
  const raw = sheet?.itc;
  const itcProvided = raw !== "" && raw !== null && raw !== undefined && Number.isFinite(Number(raw));
  const itc = itcProvided ? Number(raw) : 0;
  const itcCost = itcProvided ? (itc / 100) * totals.selling : 0; // Cost of Installing, Testing & Commissioning
  const totalCost = totals.selling + itcCost; // Total Cost = Selling + IT&C
  const vat = VAT_RATE * totalCost; // 15%
  const totalInclVat = totalCost + vat;

  // Discount (%) applied to the grand total. Only shown when > 0. The discounted
  // figure = total − total × discount% (i.e. the total after the discount).
  const rawD = sheet?.discount;
  const discountProvided = rawD !== "" && rawD != null && Number.isFinite(Number(rawD)) && Number(rawD) > 0;
  const discount = discountProvided ? Number(rawD) : 0;
  const discountedTotal = discountProvided ? totalInclVat - totalInclVat * (discount / 100) : totalInclVat;

  return { tables, totals: { ...totals, profit }, itc, itcProvided, itcCost, totalCost, vat, totalInclVat, discount, discountProvided, discountedTotal };
}
