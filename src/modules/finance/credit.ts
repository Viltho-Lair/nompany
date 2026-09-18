// CREDIT LIMITS AND DUNNING — how much a customer may owe, and who is late.
//
// PURE. The store half is ./creditService; everything here is asserted in
// tests/credit-model.mjs.
//
// A CUSTOMER IS NAMED BY THE NAME ON ITS INVOICES. An invoice carries its
// client as `clientName` — copied from the project or typed — and no client id,
// so the name is the only join there is. It is compared case- and
// space-insensitively, which is what makes "ACME Ltd" and "Acme  Ltd" one
// customer; it is never rewritten, so what the invoice says stays what it said.
//
// THE LIMIT IS CHECKED WHEN AN INVOICE IS ISSUED, not when it is drafted. A
// draft is somebody typing; issuing is the moment the studio extends the
// credit. Exceeding it is REFUSED unless the person issuing says they mean it,
// and then who said so is written on the invoice — a limit nobody may ever
// pass is a limit people stop setting, and one anybody passes silently is not
// a limit.

export type CreditRow = {
  id?: string;
  clientName: string;
  /** In the studio's currency. 0 means no credit: every issued invoice needs an override. */
  limit: number | null;
  /** On hold: nothing new is issued to this customer without an override. */
  onHold?: boolean;
  note?: string;
};

export type Exposure = { clientKey: string; clientName: string; outstanding: number; overdue: number; invoices: number };

const text = (v: unknown, max = 160) => String(v ?? "").trim().slice(0, max);

/** The join key for a customer's name. */
export const clientKey = (name: unknown): string =>
  text(name).toLowerCase().replace(/\s+/g, " ");

/** What each customer owes on issued invoices, from the invoice list's own figures. */
export function exposures(
  invoices: { clientName?: unknown; status?: unknown; outstanding?: unknown; overdue?: unknown }[],
): Map<string, Exposure> {
  const out = new Map<string, Exposure>();
  for (const inv of invoices) {
    if (inv.status !== "Sent") continue;
    const owed = Number(inv.outstanding) || 0;
    if (!(owed > 0)) continue;
    const key = clientKey(inv.clientName);
    if (!key) continue;
    const e = out.get(key) || { clientKey: key, clientName: text(inv.clientName), outstanding: 0, overdue: 0, invoices: 0 };
    e.outstanding += owed;
    if (inv.overdue) e.overdue += owed;
    e.invoices += 1;
    out.set(key, e);
  }
  for (const e of out.values()) {
    e.outstanding = Math.round(e.outstanding * 1000) / 1000;
    e.overdue = Math.round(e.overdue * 1000) / 1000;
  }
  return out;
}

/**
 * MAY THIS INVOICE BE ISSUED? Null, or why not.
 *
 * `adding` is the new invoice's expected amount; `owed` is what the customer
 * already owes on OTHER issued invoices. A customer with no row has no limit.
 */
export function creditProblem(
  row: CreditRow | undefined,
  owed: number,
  adding: number,
): { error: "credit-hold" } | { error: "credit-limit"; limit: number; owed: number; after: number } | null {
  if (!row) return null;
  if (row.onHold) return { error: "credit-hold" };
  if (row.limit === null || row.limit === undefined) return null;
  const after = Math.round((owed + adding) * 1000) / 1000;
  return after > row.limit ? { error: "credit-limit", limit: row.limit, owed, after } : null;
}

/** The stored shape of a credit row, or the problems with it. */
export function cleanCredit(body: Record<string, unknown>): { row: CreditRow } | { problems: string[] } {
  const problems: string[] = [];
  const clientName = text(body?.clientName);
  if (!clientName) problems.push("name the customer");
  const raw = body?.limit;
  let limit: number | null = null;
  if (raw !== null && raw !== undefined && String(raw).trim() !== "") {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) problems.push("a limit is a number of nought or more");
    else limit = n;
  }
  if (problems.length) return { problems };
  return { row: { clientName, limit, onHold: body?.onHold === true, note: text(body?.note, 300) } };
}

// ── DUNNING ────────────────────────────────────────────────────────────────
//
// THREE LEVELS BY DEFAULT — a reminder the day after the due date, a second
// notice at fifteen days, a final notice at thirty — and a studio can set its
// own day counts in Finance settings. A level is DUE when the invoice is at
// least that many days late and no notice at that level or above has been
// recorded for it; the run proposes the highest level due, never each one it
// skipped, because three letters on one morning is not a reminder.

export const DEFAULT_DUNNING_DAYS = [1, 15, 30];

/** The studio's levels: ascending whole days, at most five, none below one. */
export function readDunningDays(raw: unknown): number[] {
  const days = (Array.isArray(raw) ? raw : [])
    .map((v) => Math.floor(Number(v)))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 365);
  const unique = [...new Set(days)].sort((a, b) => a - b).slice(0, 5);
  return unique.length ? unique : [...DEFAULT_DUNNING_DAYS];
}

export const daysBetween = (from: string, to: string): number =>
  Math.floor((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);

/**
 * THE LEVEL (1-based) THIS INVOICE SHOULD NOW BE SENT, or 0 for none.
 * `sent` is the highest level already recorded for it.
 */
export function dunningLevelDue(
  invoice: { status?: unknown; dueDate?: unknown; outstanding?: unknown },
  sent: number,
  days: number[],
  today: string,
): number {
  if (invoice.status !== "Sent" || !(Number(invoice.outstanding) > 0)) return 0;
  const due = text(invoice.dueDate, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) return 0;
  const late = daysBetween(due, today);
  let level = 0;
  days.forEach((d, i) => { if (late >= d) level = i + 1; });
  return level > sent ? level : 0;
}
