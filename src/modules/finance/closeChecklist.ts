// THE CLOSE CHECKLIST — what should be true before a month is closed.
//
// PURE. Gathered by ./periodService; asserted in tests/periods-model.mjs.
//
// A CLOSE IS STILL A LOCK, NOT A CHECKLIST (./periods says why: a studio that
// cannot close until everything is perfect never closes). So nothing here
// BLOCKS a close. What it adds is the list a controller works down before
// pressing it: five checks the product can answer from its own records, and the
// studio's own tasks, ticked by hand, that it cannot.
//
// THE FIVE THE BOOKS ANSWER:
//   posted      — every document dated in the month is in the books;
//   reconciled  — every money account that moved in the month has statement
//                 lines for it, and none of them is unmatched;
//   depreciated — no fixed asset on the books has depreciation due to the
//                 month's end that has not been posted;
//   vat         — where the studio charges VAT, a filed return covers the month;
//   balanced    — the trial balance balances (it always should; if it does not,
//                 nothing else on this list means anything).
// A check that does not apply (no VAT, no assets, no money moved) says so rather
// than reading as done — "nothing to do" and "done" are different answers.

export const DEFAULT_CLOSE_TASKS = [
  "Statements received for every bank and card",
  "Accruals and prepayments reviewed",
  "Management accounts sent",
];

/** The studio's own tasks: non-empty, unique, at most twenty, each a line. */
export function readCloseTasks(raw: unknown): string[] {
  if (raw === undefined || raw === null) return [...DEFAULT_CLOSE_TASKS];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of Array.isArray(raw) ? raw : []) {
    const t = String(v ?? "").trim().slice(0, 120);
    if (!t || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    out.push(t);
  }
  return out.slice(0, 20);
}

export type CheckState = "done" | "todo" | "n/a";
export type Check = { key: "posted" | "reconciled" | "depreciated" | "vat" | "balanced"; state: CheckState; count?: number; detail?: string[] };

export type CheckInput = {
  unposted: number;
  /** Per money account that moved in the month: its code, and its statement lines dated in it. */
  accounts: { code: string; lines: number; unmatched: number }[];
  /** Assets on the books with depreciation due to the month's end and not posted. */
  depreciationDue: string[];
  assetsOnBooks: number;
  vatRequired: boolean;
  vatFiled: boolean;
  balanced: boolean;
};

export function closeChecks(input: CheckInput): Check[] {
  const noStatement = input.accounts.filter((a) => a.lines === 0).map((a) => a.code);
  const unmatched = input.accounts.reduce((n, a) => n + a.unmatched, 0);
  return [
    { key: "posted", state: input.unposted ? "todo" : "done", count: input.unposted },
    {
      key: "reconciled",
      state: !input.accounts.length ? "n/a" : noStatement.length || unmatched ? "todo" : "done",
      count: unmatched,
      detail: noStatement,
    },
    {
      key: "depreciated",
      state: !input.assetsOnBooks ? "n/a" : input.depreciationDue.length ? "todo" : "done",
      count: input.depreciationDue.length,
      detail: input.depreciationDue,
    },
    { key: "vat", state: !input.vatRequired ? "n/a" : input.vatFiled ? "done" : "todo" },
    { key: "balanced", state: input.balanced ? "done" : "todo" },
  ];
}

/** Does a filed return cover the whole month? */
export const returnCovers = (r: { from?: string; to?: string }, first: string, last: string) =>
  Boolean(r.from && r.to && r.from <= first && r.to >= last);
