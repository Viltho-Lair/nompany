// IMPORTING REGISTERED ITEMS — a materials list from Odoo, another system, or a
// spreadsheet somebody kept by hand.
//
// PURE and shared with the screen, the vendor and BOQ importers' arrangement:
// the dialog runs `planItemImport` over the WHOLE file to show what will
// happen before anything is sent, and the server runs the SAME function over
// every batch against what is stored by then. So the preview refuses exactly
// what the server refuses, and nothing is trusted for having been checked in a
// browser.
//
// FOUR THINGS A MATERIALS FILE DOES THAT A NAIVE READER GETS WRONG:
//   - COLUMNS ARE NAMED BY WHOEVER EXPORTED IT. Odoo's labels ("Internal
//     Reference", "Sales Price"), its import-compatible technical names
//     ("default_code", "list_price"), and Arabic headers are all recognised;
//     anything else the person points at a field themselves.
//   - ODOO'S "PRODUCT TYPE" IS NOT AN ITEM TYPE. It says storable, consumable
//     or service. The studio's item type is Odoo's CATEGORY, and "All / Cables"
//     means "Cables".
//   - AN IMPORT-COMPATIBLE ODOO EXPORT PUTS A PRODUCT'S SECOND SUPPLIER ON A
//     ROW OF ITS OWN, with the product's columns blank. That row is part of the
//     product above it, not a nameless item to refuse.
//   - A SWAPPED COLUMN PASSES EVERY TYPE CHECK when both columns are numbers.
//     Cost and sales price are the dangerous pair — swapped, every item is
//     quoted at cost — so a file where most priced rows sell below cost is
//     flagged as a likely swap and has to be confirmed.

import { fold } from "@/shared/csv";
import { parseNumber } from "@/modules/tendering/boqImport";
import { isKnownCurrency } from "@/shared/currencies";
import { barcodeProblems, cleanBarcode } from "./barcodes";

export const ITEM_FIELDS = [
  "sku", "name", "unit", "vendor", "itemType", "modelNumber", "barcode",
  "unitCost", "sellPrice", "currency", "shippingCharges", "customsCharges",
  "reorderLevel", "deliveryWeeks", "leadDays", "notes",
] as const;
export type ItemField = (typeof ITEM_FIELDS)[number];
export type ItemMapping = Partial<Record<ItemField, number>>;

/**
 * The header names each field may carry, folded (case, spacing, `_`, `-`,
 * harakat) before comparing. Odoo's human labels first, then its technical
 * field names — an export ticked "import-compatible" uses those — then Arabic.
 */
export const ITEM_ALIASES: Record<ItemField, string[]> = {
  sku: ["SKU", "Internal Reference", "Reference", "Item Code", "Product Code", "Code", "default_code",
    "المرجع الداخلي", "رمز الصنف", "كود الصنف", "الرمز"],
  name: ["Name", "Product", "Product Name", "Item", "Item Name", "Material", "Material Name", "name",
    "الاسم", "اسم المنتج", "اسم الصنف", "المادة", "الصنف"],
  unit: ["Unit", "Unit of Measure", "UoM", "Units", "uom_id", "uom_id/name", "الوحدة", "وحدة القياس"],
  vendor: ["Vendor", "Supplier", "Vendors", "Vendors/Vendor", "Vendor Name", "Supplier Name",
    "seller_ids/partner_id", "seller_ids/partner_id/name", "المورد", "اسم المورد"],
  itemType: ["Item Type", "Product Category", "Category", "categ_id", "categ_id/name",
    "نوع الصنف", "الفئة", "فئة المنتج", "التصنيف"],
  modelNumber: ["Model", "Model Number", "Part Number", "MPN", "Vendor Product Code", "Vendors/Vendor Product Code",
    "seller_ids/product_code", "رقم الموديل", "رقم القطعة"],
  barcode: ["Barcode", "EAN", "UPC", "barcode", "الباركود"],
  unitCost: ["Cost", "Unit Cost", "Standard Price", "Purchase Price", "standard_price", "التكلفة", "سعر التكلفة"],
  sellPrice: ["Sales Price", "Sale Price", "Selling Price", "List Price", "Price", "list_price", "سعر البيع", "السعر"],
  currency: ["Currency", "Cost Currency", "currency_id", "العملة"],
  shippingCharges: ["Shipping", "Shipping Charges", "Freight", "رسوم الشحن", "الشحن"],
  customsCharges: ["Customs", "Customs Charges", "Duty", "Customs Duty", "رسوم الجمارك", "الجمارك"],
  reorderLevel: ["Reorder Level", "Reorder Point", "Min Quantity", "Minimum Quantity", "Min Qty", "product_min_qty",
    "حد إعادة الطلب", "الحد الأدنى"],
  deliveryWeeks: ["Delivery Weeks", "Lead Time (weeks)", "Lead Time Weeks", "مدة التوريد بالأسابيع"],
  leadDays: ["Delivery Lead Time", "Lead Time", "Lead Time (days)", "Vendors/Delivery Lead Time", "seller_ids/delay",
    "مدة التوريد", "مدة التوريد بالأيام"],
  notes: ["Notes", "Internal Notes", "Description", "description", "ملاحظات", "الوصف"],
};

/** The columns the downloadable template carries, in order. */
export const TEMPLATE_HEADERS = [
  "SKU", "Name", "Unit", "Vendor", "Item Type", "Model Number", "Barcode",
  "Cost", "Sales Price", "Currency", "Shipping Charges", "Customs Charges",
  "Reorder Level", "Delivery Weeks", "Notes",
];
export const TEMPLATE_EXAMPLE = [
  "CBL-001", "Cable Cat6 305m", "roll", "Gulf AV Supply", "Cables", "C6-305", "",
  "180", "240", "", "", "", "10", "2", "",
];

/** Rows per request. Small enough for any request limit, large enough to finish quickly. */
export const IMPORT_BATCH = 250;

/** Which column each field is in, guessed from a header row. Each column is used once. */
export function guessItemMapping(header: readonly string[]): ItemMapping {
  const folded = header.map((h) => fold(h));
  const out: ItemMapping = {};
  const taken = new Set<number>();
  for (const field of ITEM_FIELDS) {
    const wanted = ITEM_ALIASES[field].map(fold);
    const i = folded.findIndex((h, idx) => !taken.has(idx) && wanted.includes(h));
    if (i >= 0) { out[field] = i; taken.add(i); }
  }
  return out;
}

/** A row is a header when at least two of its cells name a field. */
export function looksLikeItemHeader(row: readonly string[]): boolean {
  return Object.keys(guessItemMapping(row)).length >= 2;
}

/** One row of the file under a mapping: raw text per field, and the file line it came from. */
export type ItemImportRow = { line: number } & Partial<Record<ItemField, string>>;

/**
 * THE ROWS A GRID HOLDS under a mapping. Blank rows are dropped AFTER
 * numbering, so every line number is one the person can find in their file.
 * An Odoo continuation row — no name, no SKU, a supplier — is folded into the
 * row above rather than refused; `extraVendors` counts them, because an item
 * holds one supplier today and the rest are left out on purpose.
 */
export function itemRows(grid: readonly string[][], mapping: ItemMapping, opts: { header: boolean }) {
  const rows: ItemImportRow[] = [];
  let extraVendors = 0;
  grid.forEach((cells, i) => {
    if (opts.header && i === 0) return;
    if (!cells.some((c) => String(c ?? "").trim() !== "")) return;
    const row: ItemImportRow = { line: i + 1 };
    for (const field of ITEM_FIELDS) {
      const at = mapping[field];
      if (at !== undefined) row[field] = String(cells[at] ?? "").trim();
    }
    const continuation = !row.name && !row.sku && rows.length > 0
      && ITEM_FIELDS.some((f) => f !== "name" && f !== "sku" && row[f]);
    if (continuation) { if (row.vendor) extraVendors += 1; return; }
    rows.push(row);
  });
  return { rows, extraVendors };
}

// ---- judging one row --------------------------------------------------------

/**
 * WHY A ROW WAS NOT IMPORTED. `exists` is not an error — the item is already
 * registered and the person chose not to update it — but it is still named,
 * so every line of the file is accounted for.
 */
export type ImportRefusal = {
  line: number;
  reason: "name" | "number" | "unit" | "currency" | "charges" | "sku" | "duplicate-sku" | "exists"
    | "barcode" | "vendor" | "shortened";
  /** Which field, which value — whatever makes the reason actionable. */
  detail?: string;
};

export type ImportWarning = { line: number; kind: "price-below-cost" | "numeric-name" };

/** An item as it will be written, before ids and bookkeeping are added. */
export type PlannedItem = {
  line: number;
  sku: string;
  name: string;
  unit: string;
  vendorName: string;
  itemType: string;
  modelNumber: string;
  barcode: string;
  unitCost: number;
  sellPrice: number;
  currency: string;
  shippingCharges: number | "";
  customsCharges: number | "";
  reorderLevel: number;
  deliveryWeeks: number | "";
  notes: string;
  /**
   * The charges AS THE FILE GAVE THEM, whatever the currency. `shippingCharges`
   * above is blank for an item in the studio's own money, which is right for a
   * new item; an UPDATE of an item already bought abroad needs the file's own
   * figures, or a charges-only price list would write nought over them.
   */
  givenCharges: { shipping: number | null; customs: number | null };
  /** Only the fields the file actually CARRIED — an update never blanks what the file left out. */
  given: ItemField[];
};

export type ExistingItem = {
  id: string; sku: string; barcode?: string; importId?: string; importLine?: number;
  /** With the supplier's NAME, what recognises a row that carries no SKU. */
  name?: string; vendorName?: string;
};

export type ImportEnv = {
  /** The units the studio offers, in its own order; the first is the default. */
  units: readonly string[];
  studioCurrency: string;
  /** Supplier names already on the studio's list. */
  vendorNames: readonly string[];
  items: readonly ExistingItem[];
};

export type ImportOptions = {
  /** Overwrite an item whose SKU is already registered, with the fields the file carries. */
  update: boolean;
  /** Add a supplier the file names and the studio does not have. */
  createVendors: boolean;
};

// Common ways a spreadsheet writes the units every studio starts with. Mapped
// only onto a unit the studio actually offers — never invented.
const UNIT_ALIASES: Record<string, string> = {
  units: "pcs", unit: "pcs", "unit(s)": "pcs", pc: "pcs", piece: "pcs", pieces: "pcs", each: "pcs", ea: "pcs",
  nos: "pcs", no: "pcs", number: "pcs", "قطعة": "pcs", "حبة": "pcs",
  meter: "m", meters: "m", metre: "m", metres: "m", mtr: "m", "متر": "m",
  kilogram: "kg", kilograms: "kg", kgs: "kg", "كيلو": "kg", "كجم": "kg",
  liter: "L", liters: "L", litre: "L", litres: "L", l: "L", ltr: "L", "لتر": "L",
  boxes: "box", "صندوق": "box", sets: "set", "طقم": "set", rolls: "roll", "لفة": "roll",
  m2: "m²", sqm: "m²", "sq m": "m²", "square meter": "m²", "square metre": "m²", "متر مربع": "m²",
};

/** The studio's unit a written unit means, or null when it means none of them. Blank is the default. */
export function resolveUnit(written: string | undefined, units: readonly string[]): string | null {
  const w = String(written ?? "").trim();
  if (!w) return units[0] ?? "pcs";
  const lower = w.toLowerCase();
  const direct = units.find((u) => u.toLowerCase() === lower);
  if (direct) return direct;
  const alias = UNIT_ALIASES[lower];
  return alias && units.includes(alias) ? alias : null;
}

/** "All / Saleable / Cables" is Odoo's path to a category; the category is the last part. */
export function itemTypeOf(written: string | undefined): string {
  const parts = String(written ?? "").split(" / ").map((p) => p.trim()).filter(Boolean);
  return (parts[parts.length - 1] || "").slice(0, 80);
}

const nameVendorKey = (name: unknown, vendor: unknown) =>
  `${String(name ?? "").trim().toLowerCase()}|${String(vendor ?? "").trim().toLowerCase()}`;

// FIELDS THAT ARE CODES, NOT QUANTITIES — read digit for digit.
const IDENTIFIER_FIELDS: ItemField[] = ["sku", "barcode", "modelNumber"];

/**
 * A CODE EXCEL TURNED INTO A NUMBER. A barcode in a General-format column is a
 * number to Excel, and a long one is written in scientific form:
 *
 *   "6.251600002251E12"  every digit is still there, so it is written out
 *                        in full: 6251600002251.
 *   "6.2516E+12"         eight digits are GONE — Excel kept five and a scale.
 *                        No reading can recover them, and guessing would store
 *                        a code belonging to some other product, so the row
 *                        is refused and the person told to format the column
 *                        as Text.
 *
 * Only long numbers (eleven digits or more) are touched: that is where Excel
 * switches to this form, and a short "1E3" in a code column means what it says.
 */
export function identifierOf(written: unknown): { value: string; shortened: boolean } {
  const s = String(written ?? "").trim();
  const m = /^(\d)(?:[.,](\d+))?[eE]\+?(\d+)$/.exec(s);
  if (!m || Number(m[3]) < 10) return { value: s, shortened: false };
  const decimals = (m[2] || "").length;
  const exp = Number(m[3]);
  if (decimals === exp) return { value: m[1] + (m[2] || ""), shortened: false };
  return { value: s, shortened: true };
}

const NUMERIC_FIELDS: ItemField[] = [
  "unitCost", "sellPrice", "shippingCharges", "customsCharges", "reorderLevel", "deliveryWeeks", "leadDays",
];

/** Kept to three places, the finest any currency uses — see `money` in inventory.ts. */
const round3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * WHAT A FILE WILL DO, row by row, against what is stored. Run by the screen
 * over the whole file and by the server over each batch.
 *
 * NOTHING HERE IS COERCED. A cost that is not a number is refused and named,
 * never written as nought; a unit the studio does not count in is refused and
 * named, never replaced by "pcs" — `createItem` coerces a unit because its form
 * can only offer valid ones, and a file can say anything.
 */
export function planItemImport(rows: readonly ItemImportRow[], env: ImportEnv, opts: ImportOptions) {
  const create: PlannedItem[] = [];
  const update: (PlannedItem & { id: string })[] = [];
  const refused: ImportRefusal[] = [];
  const warnings: ImportWarning[] = [];
  const newVendors = new Map<string, { name: string; types: Set<string> }>();
  const unknownUnits = new Set<string>();

  const known = new Set(env.vendorNames.map((v) => v.trim().toLowerCase()));
  const bySku = new Map(env.items.map((i) => [String(i.sku || "").toUpperCase(), i]));
  const codes = new Map<string, string>(); // barcode (lower) -> the item id or "line:<n>" holding it
  for (const i of env.items) if (i.barcode) codes.set(i.barcode.toLowerCase(), i.id);
  const skusInFile = new Set<string>();
  // A ROW WITH NO SKU IS KNOWN BY ITS NAME AND SUPPLIER. Names are not unique —
  // the same material from two suppliers is two items — but the same name from
  // the same supplier is the item already registered, and re-importing a file
  // must not register it again under a fresh ITM number.
  const byNameVendor = new Map<string, ExistingItem[]>();
  for (const i of env.items) {
    const key = nameVendorKey(i.name, i.vendorName);
    byNameVendor.set(key, [...(byNameVendor.get(key) || []), i]);
  }
  const nameVendorInFile = new Set<string>();

  for (const raw of rows) {
    const line = raw.line;
    const refuse = (reason: ImportRefusal["reason"], detail?: string) => { refused.push({ line, reason, ...(detail ? { detail } : {}) }); };

    // IDENTIFIERS FIRST: a code Excel shortened cannot be recovered, and one
    // it merely wrote in scientific form is written back out in full.
    const row = { ...raw };
    let lost = "";
    for (const f of IDENTIFIER_FIELDS) {
      if (row[f] === undefined) continue;
      const id = identifierOf(row[f]);
      if (id.shortened) { lost = `${f}: ${row[f]}`; break; }
      row[f] = id.value;
    }
    if (lost) { refuse("shortened", lost); continue; }

    // AN UPDATE NEEDS NO NAME. A price list — SKU and Sales Price, nothing
    // else — is the commonest update there is, and the item already has a
    // name; only a row that would CREATE something must carry one.
    const written = String(row.name ?? "").trim().slice(0, 160);
    const skuAhead = String(row.sku ?? "").trim().toUpperCase();
    const updating = opts.update && !!skuAhead && bySku.has(skuAhead);
    if (!written && !updating) { refuse("name"); continue; }
    const name = written || String(bySku.get(skuAhead)?.name || "");

    const nums: Partial<Record<ItemField, number | null>> = {};
    let bad = "";
    for (const f of NUMERIC_FIELDS) {
      const n = parseNumber(row[f]);
      if (n !== null && (Number.isNaN(n) || n < 0)) { bad = `${f}: ${row[f]}`; break; }
      nums[f] = n;
    }
    if (bad) { refuse("number", bad); continue; }

    const unit = resolveUnit(row.unit, env.units);
    if (unit === null) { unknownUnits.add(String(row.unit)); refuse("unit", String(row.unit)); continue; }

    const writtenCurrency = String(row.currency ?? "").trim().toUpperCase();
    if (writtenCurrency && !isKnownCurrency(writtenCurrency)) { refuse("currency", writtenCurrency); continue; }
    // The studio's own money is stored blank, the way the form stores it.
    const currency = writtenCurrency === String(env.studioCurrency || "").toUpperCase() ? "" : writtenCurrency;
    const foreign = !!currency;
    // A FOREIGN ITEM MUST SAY WHAT IT COST TO LAND, as the form insists — "we
    // checked and it was free" is 0, and a blank is not that.
    if (foreign && (nums.shippingCharges == null || nums.customsCharges == null)) { refuse("charges", currency); continue; }

    const sku = String(row.sku ?? "").trim().toUpperCase();
    if (sku.length > 40) { refuse("sku", sku); continue; }
    if (sku && skusInFile.has(sku)) { refuse("duplicate-sku", sku); continue; }
    if (sku) skusInFile.add(sku);

    let existing = sku ? bySku.get(sku) : undefined;
    if (existing && !opts.update) { refuse("exists", sku); continue; }
    if (!sku) {
      const key = nameVendorKey(name, row.vendor);
      if (nameVendorInFile.has(key)) { refuse("exists", name); continue; }
      nameVendorInFile.add(key);
      // WITH UPDATE ON, the ONE item this name and supplier already name is the
      // one the row updates — which is how a file with no SKUs corrects what an
      // earlier import of it stored. Two such items is a guess, so it is refused.
      const matches = byNameVendor.get(key) || [];
      if (matches.length && !(opts.update && matches.length === 1)) { refuse("exists", name); continue; }
      existing = matches[0];
    }

    const barcode = cleanBarcode(row.barcode);
    if (barcode) {
      const format = barcodeProblems({ barcode }, { items: [] });
      if (format.length) { refuse("barcode", barcode); continue; }
      const holder = codes.get(barcode.toLowerCase());
      if (holder && holder !== existing?.id) { refuse("barcode", barcode); continue; }
      codes.set(barcode.toLowerCase(), existing?.id || `line:${line}`);
    }

    const vendorName = String(row.vendor ?? "").trim().slice(0, 160);
    const itemType = itemTypeOf(row.itemType);
    if (vendorName && !known.has(vendorName.toLowerCase())) {
      if (!opts.createVendors) { refuse("vendor", vendorName); continue; }
      const key = vendorName.toLowerCase();
      const entry = newVendors.get(key) || { name: vendorName, types: new Set<string>() };
      if (itemType) entry.types.add(itemType);
      newVendors.set(key, entry);
    }

    const weeks = nums.deliveryWeeks != null ? Math.round(nums.deliveryWeeks)
      : nums.leadDays != null ? Math.ceil(nums.leadDays / 7) : "";
    const planned: PlannedItem = {
      line, sku, name, unit, vendorName, itemType,
      modelNumber: String(row.modelNumber ?? "").trim().slice(0, 80),
      barcode,
      unitCost: nums.unitCost ? round3(nums.unitCost) : 0,
      sellPrice: nums.sellPrice ? round3(nums.sellPrice) : 0,
      currency,
      shippingCharges: foreign ? round3(nums.shippingCharges as number) : "",
      customsCharges: foreign ? round3(nums.customsCharges as number) : "",
      reorderLevel: nums.reorderLevel ? round3(nums.reorderLevel) : 0,
      deliveryWeeks: weeks,
      notes: String(row.notes ?? "").trim().slice(0, 1000),
      givenCharges: {
        shipping: nums.shippingCharges == null ? null : round3(nums.shippingCharges),
        customs: nums.customsCharges == null ? null : round3(nums.customsCharges),
      },
      given: ITEM_FIELDS.filter((f) => String(row[f] ?? "").trim() !== ""),
    };

    if (planned.sellPrice > 0 && planned.unitCost > 0 && planned.sellPrice < planned.unitCost) {
      warnings.push({ line, kind: "price-below-cost" });
    }
    if (/^[\d\s.,-]+$/.test(name)) warnings.push({ line, kind: "numeric-name" });

    if (existing) update.push({ ...planned, id: existing.id });
    else create.push(planned);
  }

  // MOST PRICED ROWS SELLING BELOW COST is what a swapped pair of columns looks
  // like, and it is the one swap no type check can see. A handful is a real
  // loss-leader; most of the file is a mistake until somebody says otherwise.
  const priced = [...create, ...update].filter((p) => p.sellPrice > 0 && p.unitCost > 0).length;
  const below = warnings.filter((w) => w.kind === "price-below-cost").length;
  const likelySwap = priced >= 5 && below / priced >= 0.5;

  return {
    create, update, refused, warnings, likelySwap,
    newVendors: [...newVendors.values()].map((v) => ({ name: v.name, itemTypes: [...v.types] })),
    unknownUnits: [...unknownUnits],
  };
}

export type ItemImportPlan = ReturnType<typeof planItemImport>;

// ---- files going back to the person -----------------------------------------

const csvCell = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * A CSV the person can open in Excel. The BOM is what makes Excel read it as
 * UTF-8 — without it, every Arabic name in the file opens as question marks.
 */
export function toCsv(rows: readonly (readonly unknown[])[]): string {
  return `﻿${rows.map((r) => r.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

/**
 * THE ROWS THAT DID NOT GO IN, as they were in the file plus a reason column —
 * so the person corrects them in place and imports this file again.
 */
export function refusedRowsCsv(
  grid: readonly string[][], header: boolean, refused: readonly ImportRefusal[], reasonOf: (r: ImportRefusal) => string,
): string {
  // PADDED TO THE WIDEST ROW, so the reason lands in one column rather than
  // straight after whichever cell a short row happened to end on.
  const width = grid.reduce((w, row) => Math.max(w, row.length), 0);
  const pad = (cells: readonly string[]) => Array.from({ length: width }, (_, i) => cells[i] ?? "");
  const head = header && grid[0] ? [...pad(grid[0]), "Reason"] : null;
  const body = refused.map((r) => [...pad(grid[r.line - 1] || []), reasonOf(r)]);
  return toCsv(head ? [head, ...body] : body);
}
