// TAX WITHHELD AT SOURCE.
//
// VAT IS BUILT AND WITHHOLDING IS NOT, and they are not the same shape. VAT is
// ADDED to what a document is worth and collected on the authority's behalf;
// withholding is DEDUCTED from what is actually handed over, while the invoice
// stays worth what it says. A studio that modelled WHT as a negative VAT rate
// would produce an invoice for the wrong amount and a receivable that never
// clears — because the client pays the net and the ledger is expecting the
// gross.
//
// SO IT SITS BESIDE THE TOTAL, NOT INSIDE IT. `invoiceTotals` is untouched: an
// invoice's `total` is still subtotal plus VAT, and what changes is how much
// cash is expected against it. `outstanding` less the withheld amount is what
// the client will actually send, and the difference is a tax credit the studio
// claims from the authority rather than a discount it gave.
//
// THE BASE IS THE SUBTOTAL, NEVER THE VAT-INCLUSIVE TOTAL. Withholding is a tax
// on income, and taxing the tax is the commonest way to get this wrong by
// exactly the VAT rate — which on a 16% VAT and a 5% WHT is an error of
// eight-tenths of a per cent on every invoice, small enough never to be
// noticed and large enough to matter across a year.
//
// PURE. No imports, no store, no clock.

export type WithholdingRule = {
  /** What the studio calls it — "Contractor WHT", "Professional services". */
  label: string;
  /** Per cent of the taxable base. */
  rate: number;
  /** Below this the rule does not apply at all. */
  threshold: number;
};

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const money = (n: number) => Math.round(n * 100) / 100;
const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/** What is wrong with this rule, or an empty array. */
export function withholdingProblems(input: Record<string, unknown>): string[] {
  const problems: string[] = [];
  if (!str(input.label, 80)) problems.push("a rule needs a name");
  const rate = num(input.rate);
  // A RATE OF NOUGHT IS NOT A RULE. It withholds nothing, and a studio with one
  // would see a WHT line of 0.00 on every document and learn to ignore the
  // column — which is the state this feature exists to end.
  if (!(rate > 0)) problems.push("the rate must be above nought");
  // 100% WOULD HAND THE WHOLE INVOICE TO THE AUTHORITY. No jurisdiction does
  // that, and a typo of 50 for 5 is the shape this catches.
  if (rate >= 100) problems.push("the rate must be below 100");
  if (num(input.threshold) < 0) problems.push("a threshold cannot be negative");
  return problems;
}

export function cleanWithholding(input: Record<string, unknown>): WithholdingRule {
  return {
    label: str(input.label, 80),
    rate: Math.min(99.99, Math.max(0, money(num(input.rate)))),
    threshold: Math.max(0, money(num(input.threshold))),
  };
}

export type Withheld = {
  applies: boolean;
  label: string;
  rate: number;
  base: number;
  amount: number;
  /** What the payer actually sends: the total less what they withhold. */
  netPayable: number;
};

/**
 * WHAT IS WITHHELD ON ONE DOCUMENT.
 *
 * BELOW THE THRESHOLD NOTHING IS WITHHELD, and `applies` says so rather than
 * returning an amount of nought: "this rule did not apply" and "this rule
 * applied and produced nothing" are different facts, and a reader shown 0.00
 * cannot tell which — nor whether somebody forgot to set a rule at all.
 *
 * THE THRESHOLD IS TESTED ON THE BASE, not on the total. A rule that applied
 * above 1,000 would otherwise catch a 900 invoice carrying 100 of VAT, which is
 * the authority's money being used to cross the studio's own threshold.
 */
export function withholdingOn(
  rule: WithholdingRule | null,
  totals: { subtotal: number; total: number },
): Withheld {
  const base = money(num(totals.subtotal));
  const none: Withheld = {
    applies: false, label: rule?.label || "", rate: rule?.rate || 0,
    base, amount: 0, netPayable: money(num(totals.total)),
  };
  if (!rule || !(rule.rate > 0) || base < rule.threshold) return none;

  const amount = money(base * (rule.rate / 100));
  return {
    applies: true,
    label: rule.label,
    rate: rule.rate,
    base,
    amount,
    netPayable: money(num(totals.total) - amount),
  };
}

/**
 * IS THIS DOCUMENT SETTLED? — the question withholding changes.
 *
 * A CLIENT WHO WITHHOLDS PAYS LESS AND STILL OWES NOTHING. Judging settlement
 * against the gross would leave every withheld invoice permanently short by the
 * tax, chased by a credit controller for money the client is legally required
 * NOT to send. So the comparison is against `netPayable`, and the withheld
 * amount is carried as its own figure — a receivable from the authority rather
 * than from the client.
 */
export function settledWith(
  totals: { total: number; paid: number },
  withheld: Withheld,
): { expected: number; outstanding: number; settled: boolean } {
  const expected = withheld.applies ? withheld.netPayable : money(num(totals.total));
  const outstanding = money(Math.max(0, expected - num(totals.paid)));
  return {
    expected,
    outstanding,
    // A DOCUMENT WORTH NOTHING IS NOT SETTLED. The same guard `paymentStatus`
    // already carries: nought paid against nought due is a blank document, not
    // a closed one.
    settled: expected > 0 && num(totals.paid) >= expected,
  };
}

/**
 * WHAT THE STUDIO CAN RECLAIM — every document where tax was withheld and the
 * certificate has not been recorded.
 *
 * THE CERTIFICATE IS THE ASSET, not the deduction. A client withholding 500 is
 * only worth 500 to the studio if the studio can prove it was paid over; until
 * the certificate arrives it is money gone. So this lists what to CHASE, which
 * is a different list from what was withheld.
 */
export function unclaimed<T extends { id: string; reference?: string }>(
  documents: { document: T; withheld: Withheld; certificateRef?: string }[],
): { id: string; reference: string; amount: number }[] {
  return documents
    .filter((d) => d.withheld.applies && d.withheld.amount > 0 && !str(d.certificateRef, 80))
    .map((d) => ({
      id: d.document.id,
      reference: String(d.document.reference || ""),
      amount: d.withheld.amount,
    }))
    .sort((a, b) => b.amount - a.amount);
}
