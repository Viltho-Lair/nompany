// WHERE THE STOCK ACTUALLY IS.
//
// Inventory has always known HOW MANY of a thing a studio holds — a balance is
// the sum of its movements, appended and never edited — and never WHERE. A
// warehouse keeper asking "which shelf" got the same answer as somebody asking
// "how many in the company": one number, no place. So a studio with two sites
// could not tell whether the eleven pumps were eleven here or six here and five
// three hundred kilometres away, which is the difference between having stock
// and having to move it.
//
// A BIN SITS INSIDE A LOCATION, and the location is Administration's record —
// the same row a shift and a permit point at. Inventory does not get its own
// list of places: a second one would be free to disagree with the first about
// where the company works, which is exactly what the departments register was
// built to stop happening to the org chart.
//
// PURE. No imports, no store — the screen refuses what the server refuses, and
// every rule below is asserted without a database.

/** A bin as the screen and the server both see it. */
export type BinInput = { code?: unknown; name?: unknown; locationId?: unknown };
export type Bin = { id: string; code: string; name: string; locationId: string };

/** A movement, in the only shape this file needs. */
export type BinMovement = { itemId: string; kind: string; qty: number; binId?: string };

// Short, printable, and typed onto a label somebody reads across a warehouse.
// Letters, digits and the separators a rack address actually uses (A-01-3,
// YARD/2). No spaces: a bin code is scanned and typed, and a trailing space is
// a different bin that looks identical.
const CODE_RE = /^[A-Za-z0-9][A-Za-z0-9/.-]{0,15}$/;

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const round = (n: number) => Math.round(n * 1000) / 1000;

/**
 * WHAT IS WRONG WITH THIS BIN, or an empty array. Reasons rather than a boolean,
 * the shape every other validator in the product returns.
 */
export function binProblems(
  input: BinInput,
  { locations, existing, selfId = "" }: {
    locations: { id: string }[];
    existing: Bin[];
    selfId?: string;
  },
): string[] {
  const problems: string[] = [];
  // NOT TRUNCATED BEFORE IT IS JUDGED. `cleanBin` caps at 16, so validating a
  // capped value would turn "A-01-SHELF-THREE-B" into the legal
  // "A-01-SHELF-THREE" and store a bin nobody typed — the same silent-coercion
  // shape that made `createItem` file cement under "pcs".
  const code = String(input.code ?? "").trim();
  const locationId = str(input.locationId, 60);

  if (!code) problems.push("a bin needs a code");
  else if (!CODE_RE.test(code)) {
    problems.push(`"${code}" must be 1-16 characters: letters, digits, and - . / only`);
  }

  // A BIN WITH NO LOCATION IS A BIN NOBODY CAN WALK TO. The whole question this
  // answers is "where", so the one field that says where is required — and it
  // must name a location that exists, because a dangling id would put stock in
  // a place the studio has never heard of.
  if (!locationId) problems.push("a bin needs a location");
  else if (!locations.some((l) => l.id === locationId)) problems.push("that location does not exist");

  // UNIQUE WITHIN ITS LOCATION, NOT ACROSS THE STUDIO. Every warehouse in the
  // world has an A-01, and forcing site-wide uniqueness would make the second
  // site invent codes nobody uses on the floor. Case-insensitive, because a
  // label reading "a-01" and a screen reading "A-01" are the same shelf and two
  // rows for it is a split nobody can reconcile.
  const clash = existing.some((b) =>
    b.id !== selfId && b.locationId === locationId && b.code.toLowerCase() === code.toLowerCase());
  if (clash) problems.push(`"${code}" is already a bin in that location`);

  return problems;
}

/** The stored shape. Only called once validation has passed. */
export function cleanBin(input: BinInput): Omit<Bin, "id"> {
  return {
    code: str(input.code, 16),
    // Optional: "A-01" is enough for most, and forcing a description produces
    // a column of the code typed twice.
    name: str(input.name, 120),
    locationId: str(input.locationId, 60),
  };
}

/**
 * HOW MUCH OF EACH ITEM IS IN EACH BIN — and how much is in none.
 *
 * THE SAME ARITHMETIC AS `balances`, split by bin. It is deliberately NOT a
 * second answer to "how many do we hold": the totals still come from `balances`
 * over every movement, and this only says where those units sit. If the two
 * could disagree, one of them would be wrong and nothing would say which.
 *
 * A MOVEMENT NAMING NO BIN IS THE NORMAL CASE, not an error. Every movement
 * written before bins existed has no bin, and a studio that never adopts them
 * has none either — so `unbinned` is a first-class total rather than a leftover,
 * and it is what a studio watches shrink as it puts its stock away.
 */
export function binBalances(movements: BinMovement[], knownBinIds?: Set<string>): {
  byBin: Record<string, Record<string, number>>;
  unbinned: Record<string, number>;
} {
  const byBin: Record<string, Record<string, number>> = {};
  const unbinned: Record<string, number> = {};

  for (const m of movements) {
    const delta = m.kind === "out" ? -Math.abs(m.qty) : m.kind === "adjust" ? m.qty : Math.abs(m.qty);
    const binId = str(m.binId, 60);
    // A MOVEMENT POINTING AT A DELETED BIN COUNTS AS UNBINNED, not as a bin of
    // its own. Deleting a bin cascades nothing — a total that fell when
    // somebody tidied a list would be a report that punishes housekeeping —
    // and the units are still in the building, so they belong in the figure
    // that says "somewhere, unfiled".
    const known = !binId || (knownBinIds ? knownBinIds.has(binId) : true);
    const bucket = known && binId ? (byBin[binId] ||= {}) : unbinned;
    bucket[m.itemId] = round((bucket[m.itemId] || 0) + delta);
  }
  return { byBin, unbinned };
}

/**
 * A BIN HOLDING LESS THAN NOTHING is stock that left without being recorded.
 *
 * REPORTED, NEVER REFUSED. The alternative is refusing an issue from a bin the
 * system thinks is empty, which would stop a warehouse whose shelves are right
 * and whose records are behind — and the company total is not in doubt, only
 * the split. So this is a list somebody reconciles, in the same spirit as
 * `uncoded` on a cost report: the money is real, the filing is not.
 */
export function negativeBins(byBin: Record<string, Record<string, number>>): {
  binId: string; itemId: string; qty: number;
}[] {
  const out: { binId: string; itemId: string; qty: number }[] = [];
  for (const [binId, items] of Object.entries(byBin)) {
    for (const [itemId, held] of Object.entries(items)) {
      if (held < 0) out.push({ binId, itemId, qty: held });
    }
  }
  return out.sort((a, b) => a.qty - b.qty);
}

/**
 * THE SCREEN'S ROWS: every bin, what it holds, and where it is.
 *
 * A BIN WITH NOTHING IN IT IS STILL A ROW. An empty shelf is where the next
 * delivery goes, and a register that hid its empty bins would be a register
 * nobody could put anything away with.
 */
export function binView(
  bins: Bin[],
  locations: { id: string; name?: string }[],
  movements: BinMovement[],
): {
  id: string; code: string; name: string; locationId: string; locationName: string;
  lines: { itemId: string; qty: number }[]; units: number;
}[] {
  const place = Object.fromEntries(locations.map((l) => [l.id, str(l.name, 120)]));
  const { byBin } = binBalances(movements, new Set(bins.map((b) => b.id)));

  return [...bins]
    // By location, then by code, which is the order somebody walks them in.
    .sort((a, b) =>
      (place[a.locationId] || "").localeCompare(place[b.locationId] || "") ||
      a.code.localeCompare(b.code, undefined, { numeric: true }))
    .map((b) => {
      const lines = Object.entries(byBin[b.id] || {})
        // A LINE THAT NETS TO NOUGHT IS NOT IN THE BIN. It was, and it went;
        // showing "0" beside an item reads as "we have none of this, here",
        // which is true of every item in the catalogue.
        .filter(([, held]) => held !== 0)
        .map(([itemId, held]) => ({ itemId, qty: held }))
        .sort((x, y) => y.qty - x.qty);
      return {
        id: b.id, code: b.code, name: b.name, locationId: b.locationId,
        locationName: place[b.locationId] || "",
        lines,
        units: round(lines.reduce((sum, l) => sum + l.qty, 0)),
      };
    });
}

/**
 * WHERE IS THIS ITEM? — the question a picker actually asks, answered across
 * every bin at once, biggest holding first.
 */
export function whereIs(itemId: string, bins: Bin[], movements: BinMovement[]): {
  binId: string; code: string; locationId: string; qty: number;
}[] {
  const { byBin } = binBalances(movements, new Set(bins.map((b) => b.id)));
  return bins
    .map((b) => ({
      binId: b.id, code: b.code, locationId: b.locationId,
      qty: round(byBin[b.id]?.[itemId] || 0),
    }))
    .filter((r) => r.qty !== 0)
    .sort((a, b) => b.qty - a.qty);
}
