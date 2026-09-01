// THE OPERATIONS BOTH TRANSPORTS RUN — one script, executed twice.
//
// This file is imported by tests/pg-transport-parity.mjs (which runs it on the
// `direct` transport, in its own process) and by tests/pg-transport-gateway.mjs
// (which runs it on the `gateway` transport, in a CHILD process). The two runs
// execute LITERALLY THE SAME CODE against the same database, so anything that
// differs between their outputs is the transport and nothing else.
//
// WHY A CHILD PROCESS AT ALL. `pg.ts` reads PG_TRANSPORT ONCE AT MODULE SCOPE —
// deliberately, the same shape `sections.ts` reads DB_BACKEND, because which
// wire a deployment takes is not a per-request property. One process therefore
// has exactly one transport, and no amount of setting process.env later changes
// the value already captured. Two processes is the honest way to have both, and
// it is the shape scripts/test-parity.mjs already uses to run the suite under a
// different NOMPANY_DB.
//
// EVERY VALUE HERE IS DETERMINISTIC, because the comparison is `JSON.stringify`
// TEXT and not a deep-equal (the rule tests/pg-parity.mjs sets: `payload` is
// `json` rather than `jsonb` precisely so key order survives, and a deep-equal
// would not notice key order changing). So:
//
//  - every row carries an EXPLICIT id, never a minted one, except the one
//    operation whose subject IS minting — which reports only the deterministic
//    three-letter prefix `ID.row` derives from the collection name.
//  - the two runs use the SAME tenant, section and collections, RUN
//    SEQUENTIALLY, each leaving the section empty behind it. Distinct fixtures
//    would have forced a normalisation pass over the compared text (studioId
//    and sectionId are inside `payload`), and normalising the text is exactly
//    the thing that could hide a difference.
//  - `seq` values are NOT compared raw. The sequence is global and shared with
//    every other writer on this live database, so the absolute numbers cannot
//    match across two runs. What must match is the ASSIGNMENT: which member of
//    a batch got the largest value, and that they descend strictly across the
//    batch. That is reported as ranks.
//
// `announce: false` ON EVERY WRITE, and it is not a shortcut. `emit` and
// `bumpMainAgg` are Redis calls fired AFTER `withTenant` returns, by code that
// is identical on both transports and cannot distinguish them. Skipping them
// keeps this file's only dependency Postgres — no Redis connection is opened by
// either run, so there is no Redis namespace to sweep and nothing about the
// comparison depends on a second store being reachable.

/**
 * @param {{ tenant: string, otherTenant: string, section: string, col: string, batchCol: string }} fx
 * @returns {Promise<Record<string, unknown>>} one entry per operation, in run order
 */
export async function runOperations(fx) {
  const { pgReadCol, pgAddRow, pgAddRows, pgUpdateRow, pgDeleteRow, pgDeleteSectionRows, pgDeleteAllForSection } =
    await import("../src/platform/db/pgRows.ts");
  const { withTenant } = await import("../src/platform/db/pg.ts");
  const { TBL } = await import("../src/platform/db/keys.ts");

  const quiet = { announce: false };
  const out = {};

  // ---- the slate this run starts from ---------------------------------------
  // ASSERTED, NOT ASSUMED. The gateway run happens after the direct run has
  // already cleaned up; if it had not, every later comparison would be against
  // polluted state and would fail for a reason that has nothing to do with the
  // transport. An empty read here is what makes the rest of the file mean
  // something.
  out.emptyBefore = await pgReadCol(fx.tenant, fx.section, fx.col);
  out.emptyBatchBefore = await pgReadCol(fx.tenant, fx.section, fx.batchCol);

  // ---- pgAddRow -------------------------------------------------------------
  out.addRow = await pgAddRow(fx.tenant, fx.section, fx.col, { id: "row-a", name: "Acme", status: "Open" }, quiet);
  out.readAfterAddRow = await pgReadCol(fx.tenant, fx.section, fx.col);

  // ---- RLS, in band, on whichever wire this run took -------------------------
  // A second tenant writes into the SAME section and collection. Neither read
  // below may see the other's row — under `direct` that is `SET LOCAL` on a
  // held connection, under `gateway` it is the same `set_config` run by the
  // service on the far side of an HTTPS call. The point of running it here
  // rather than only against the server directly is that it goes through
  // withTenant and pgReadCol, the doors the application actually uses.
  out.otherTenantAdd = await pgAddRow(
    fx.otherTenant, fx.section, fx.col, { id: "row-other", name: "other-tenant" }, quiet,
  );
  out.readAsTenant = await pgReadCol(fx.tenant, fx.section, fx.col);
  out.readAsOtherTenant = await pgReadCol(fx.otherTenant, fx.section, fx.col);
  out.otherTenantDelete = await pgDeleteRow(fx.otherTenant, fx.section, fx.col, "row-other", quiet);

  // ---- pgAddRows — the nextval reservation and the INSERT ---------------------
  // TWO ROUND TRIPS UNDER THE GATEWAY, one transaction each, where `direct`
  // runs both inside one. That split is only safe because `nextval` is
  // non-transactional in Postgres — a rollback never returns sequence values —
  // so the atomicity it appears to lose was never there. What must survive is
  // the ASSIGNMENT: batch[0] takes the largest reserved value so the batch
  // reads back newest-first as a block, arrival-ordered within itself.
  out.addRows = await pgAddRows(
    fx.tenant, fx.section, fx.batchCol,
    [{ id: "b1", name: "a" }, { id: "b2", name: "b" }, { id: "b3", name: "c" }],
    quiet,
  );
  out.readAfterAddRows = await pgReadCol(fx.tenant, fx.section, fx.batchCol);
  out.batchSeqRanks = await readSeqRanks(withTenant, TBL, fx, fx.batchCol);

  // ---- pgUpdateRow — SELECT then UPDATE, two round trips under the gateway ----
  out.updatePlain = await pgUpdateRow(fx.tenant, fx.section, fx.col, "row-a", { status: "Closed" }, quiet);
  out.updateImmutable = await pgUpdateRow(
    fx.tenant, fx.section, fx.col, "row-a",
    { id: "hacked", studioId: "other-studio", sectionId: "other-section", name: "Renamed" },
    quiet,
  );
  out.updateFunctionPatch = await pgUpdateRow(
    fx.tenant, fx.section, fx.col, "row-a", (r) => ({ status: `${r.status}!` }), quiet,
  );
  // A miss must be `null` on both wires — not an error, and not an empty row.
  out.updateMissingRow = await pgUpdateRow(fx.tenant, fx.section, fx.col, "no-such-row", { x: 1 }, quiet);

  // ---- the optimistic compare-and-set, under real contention ------------------
  // THE ONE THE TRANSPORT ACTUALLY CHANGES. Under `direct` the SELECT and the
  // UPDATE share one transaction on one connection; under `gateway` they are
  // two separate transactions with an HTTPS round trip between them. The CAS is
  // optimistic — correctness comes from `WHERE row_version = $6`, never from
  // the transaction — so the split must still produce ONE WINNER PER ROUND and
  // no lost update. Twenty concurrent flips must land exactly twenty.
  //
  // allSettled, not all: a rejection has to show up as DATA (a count) rather
  // than aborting the run, because "19 landed and one was rejected" and "20
  // landed" are the two outcomes this is here to tell apart.
  await pgAddRow(fx.tenant, fx.section, fx.col, { id: "row-h", hits: 0 }, quiet);
  const settled = await Promise.allSettled(Array.from({ length: 20 }, () =>
    pgUpdateRow(fx.tenant, fx.section, fx.col, "row-h", (r) => ({ hits: Number(r.hits) + 1 }), quiet)));
  const contended = (await pgReadCol(fx.tenant, fx.section, fx.col)).find((r) => r.id === "row-h");
  out.contention = {
    attempted: settled.length,
    rejected: settled.filter((s) => s.status === "rejected").length,
    // Named rather than counted: a rejection's message is the only thing that
    // says whether the loop gave up (invariant 9's flat backoff exhausted) or
    // the wire failed.
    firstRejection: settled.find((s) => s.status === "rejected")?.reason?.message ?? null,
    hits: contended?.hits ?? null,
  };

  // ---- pgDeleteRow ------------------------------------------------------------
  out.deleteRowFirst = await pgDeleteRow(fx.tenant, fx.section, fx.col, "row-a", quiet);
  out.deleteRowAgain = await pgDeleteRow(fx.tenant, fx.section, fx.col, "row-a", quiet);

  // ---- the two bulk deletes cascade.ts is allowed to run ----------------------
  // pgDeleteSectionRows is catalogue-bounded (an explicit collection list);
  // pgDeleteAllForSection is not, and reaps whatever the section still holds —
  // here the batch, which lives in a second collection the list above never
  // named. Both report a COUNT rather than a boolean, and the count is the
  // thing compared: under FORCE ROW LEVEL SECURITY a delete that matched
  // nothing because the tenant scope was silently unset looks exactly like a
  // delete that ran and found nothing.
  out.deleteSectionRows = await pgDeleteSectionRows(fx.tenant, fx.section, [fx.col]);
  out.deleteAllForSection = await pgDeleteAllForSection(fx.tenant, fx.section);
  out.emptyAfter = await pgReadCol(fx.tenant, fx.section, fx.col);
  out.emptyBatchAfter = await pgReadCol(fx.tenant, fx.section, fx.batchCol);

  // ---- the one operation whose subject is a MINTED id --------------------------
  // Reported as the three-letter prefix `ID.row(collection)` derives, which is
  // deterministic, plus whether the id round-tripped — the id itself is random
  // by design and comparing it as text would compare the random number
  // generator rather than the transport.
  const minted = await pgAddRow(fx.tenant, fx.section, fx.col, { name: "minted" }, quiet);
  const mintedRead = (await pgReadCol(fx.tenant, fx.section, fx.col)).find((r) => r.id === minted.id);
  out.mintedId = {
    prefix: String(minted.id).slice(0, 3),
    roundTripped: Boolean(mintedRead),
    payloadMatches: JSON.stringify(mintedRead) === JSON.stringify(minted),
  };
  out.mintedDelete = await pgDeleteRow(fx.tenant, fx.section, fx.col, minted.id, quiet);
  out.emptyAtEnd = await pgReadCol(fx.tenant, fx.section, fx.col);

  return out;
}

/**
 * The batch's `seq` values as RANKS — 0 for the largest — plus whether they
 * descend strictly across the batch.
 *
 * Raw values cannot be compared across two runs: `collection_rows_seq` is
 * global and this is the live, shared database, so a value taken between the
 * two runs (by this suite, by another agent's run, by production) moves every
 * absolute number without anything being wrong. The rank is what pgAddRows
 * actually decides.
 */
async function readSeqRanks(withTenant, TBL, fx, collection) {
  const { rows } = await withTenant(fx.tenant, (q) =>
    q(
      `SELECT ${TBL.cols.id} AS id, ${TBL.cols.seq} AS seq FROM ${TBL.rows}
        WHERE ${TBL.cols.tenant} = $1 AND ${TBL.cols.section} = $2 AND ${TBL.cols.collection} = $3
        ORDER BY ${TBL.cols.seq} DESC`,
      [fx.tenant, fx.section, collection],
    ));
  const seqs = rows.map((r) => BigInt(r.seq));
  return {
    idsBySeqDescending: rows.map((r) => r.id),
    ranks: rows.map((r, i) => ({ id: r.id, rank: i })),
    strictlyDescending: seqs.every((v, i) => i === 0 || seqs[i - 1] > v),
  };
}

/** Every operation's result as the TEXT it will be compared by. */
export function asTexts(results) {
  return Object.fromEntries(Object.entries(results).map(([name, value]) => [name, JSON.stringify(value)]));
}
