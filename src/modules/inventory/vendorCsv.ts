// READING A VENDOR LIST OUT OF A CSV.
//
// Pure, and deliberately in its own file: the screen imports it to parse the
// attached file in the browser, which is where the file is. Nothing here
// touches Redis, so importing it costs a client bundle nothing but its own
// bytes — the same arrangement as ./awb, which StudioInventory already reads.
//
// THIS IS NOT THE VALIDATION. importVendors re-cleans every field server-side
// through the same helpers the single-vendor form goes through, so a hand-made
// request cannot get past what a parsed file cannot. What this buys is the
// person being told what is in their file BEFORE they commit it.

import { readCsvTable } from "@/shared/csv";

// The header names accepted for each field. Several per field, because the file
// is written by a person or by an AI they asked, and "Vendor" / "Phone Number" /
// "Supplies" all obviously mean what they mean. The Arabic spellings are here
// because the prompt an Arabic studio copies is Arabic, and an AI handed Arabic
// instructions will sometimes translate the header row along with them.
export const VENDOR_CSV_FIELDS: Record<string, string[]> = {
  name: ["Name", "Vendor", "Vendor Name", "Supplier", "المورد", "المورّد", "الاسم"],
  contactName: ["Contact Name", "Contact", "Contact Person", "جهة الاتصال", "اسم جهة الاتصال"],
  email: ["Email", "E-mail", "Email Address", "البريد الإلكتروني", "البريد"],
  phone: ["Phone", "Phone Number", "Telephone", "Mobile", "الهاتف", "رقم الهاتف", "الجوال"],
  itemTypes: ["Item Types", "Item Type", "Types", "Supplies", "أنواع الأصناف", "الأصناف"],
};

export type VendorCsvRow = {
  line: number;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  itemTypes: { type: string; weeks: number | "" }[];
};

/**
 * "Microphones:4; Speakers:6; Cabling" -> three types, the last with no
 * estimate.
 *
 * SPLIT ON THE LAST COLON, not the first: a type is far likelier to contain
 * one ("Cable: HDMI") than a lead time is, and the number is what we are
 * actually looking for. A tail that is not a number is part of the name, so
 * "Cable: HDMI" stays one type rather than becoming a type with a broken week.
 *
 * `weeks` is "" when nobody said, and that is not the same as 0 — a blank lead
 * time and a promise of "this week" are different answers. The store keeps that
 * distinction, so the parser must not collapse it.
 */
export function parseItemTypes(cell: string): { type: string; weeks: number | "" }[] {
  return String(cell ?? "")
    .split(/[;\n]/)
    .map((part) => {
      const text = part.trim();
      if (!text) return null;
      const cut = text.lastIndexOf(":");
      if (cut < 0) return { type: text, weeks: "" as const };
      const tail = text.slice(cut + 1).trim();
      const n = Number(tail);
      if (tail === "" || !Number.isFinite(n)) return { type: text, weeks: "" as const };
      const type = text.slice(0, cut).trim();
      return type ? { type, weeks: Math.max(0, Math.round(n)) } : null;
    })
    .filter((t): t is { type: string; weeks: number | "" } => t !== null);
}

export type VendorCsvRead = {
  /** EVERY row in the file, nameless ones included — see below. */
  rows: VendorCsvRow[];
  /** Lines with no name in them, so the screen can say so before sending. */
  nameless: number[];
  /** True when no column in the file could be read as the name. */
  noNameColumn: boolean;
};

/**
 * NAMELESS ROWS ARE SENT, NOT DROPPED HERE.
 *
 * Filtering them out locally seems tidier and quietly loses them: the server
 * reports what it refused and why, line by line, and a row it never received is
 * a row missing from that report. The person is then told "3 imported" with no
 * mention of the fourth line, which is exactly the silent drop the reporting
 * exists to prevent.
 *
 * So one rule decides, in one place — importVendors — and this counts the
 * nameless separately only so the screen can warn BEFORE the send as well.
 */
export function readVendorCsv(text: string): VendorCsvRead {
  const { rows, missing } = readCsvTable(text, VENDOR_CSV_FIELDS);
  const out: VendorCsvRow[] = [];
  const nameless: number[] = [];

  for (const { line, values } of rows) {
    const name = (values.name || "").trim();
    if (!name) nameless.push(line);
    out.push({
      line,
      name,
      contactName: (values.contactName || "").trim(),
      email: (values.email || "").trim(),
      phone: (values.phone || "").trim(),
      itemTypes: parseItemTypes(values.itemTypes || ""),
    });
  }

  // NO NAME COLUMN AT ALL is reported separately from a row that merely has no
  // name in it: the first means the wrong file was attached (or its header was
  // renamed past recognition) and nothing in it can be read, the second means
  // one line needs fixing. The screen shows one message for "nothing usable
  // here" either way — what it must not do is say "0 vendors ready" and leave
  // somebody hunting for empty rows in a file that is full of them.
  return { rows: out, nameless, noNameColumn: missing.includes("name") };
}
