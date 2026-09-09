// READING ONE DATA SET — the only path, shared by the export and the builder.
//
// IT WAS THE EXPORT ROUTE'S BODY. When the report builder needed the same rows,
// copying it would have meant two places that resolve a section, two places
// that ask the second gate, and two places that know `total` is derived rather
// than stored — and the day one of them gained a data set the other would
// quietly export a column of blanks. That is not hypothetical: the empty Total
// column this file's `DERIVE` map exists to fix was exactly that failure once.
//
// THE TWO GATES ARE ASKED HERE, together, so neither caller can forget one.

import { can } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { getSectionByKey } from "@/platform/db/sections";
import { invoiceTotals } from "@/modules/finance/finance";
import { billTotals } from "@/modules/finance/payables";
import type { DataSet } from "./datasets";
import type { PermissionKey, PermissionSet } from "@/platform/access";

/**
 * COLUMNS THAT ARE NOT ON THE ROW.
 *
 * `total` IS DERIVED, NEVER STORED — `invoiceTotals` computes it from the lines
 * and the VAT rate on every read, which is what stops a stored total and its
 * own lines parting company. So a read straight out of the collection produced
 * a Total column EMPTY on every line, which is worse than not offering it: a
 * spreadsheet of invoices with no amounts looks broken, and a studio that did
 * not check would think it had the data.
 *
 * THE MAP IS HERE RATHER THAN IN THE CATALOGUE so `datasets.ts` stays pure — it
 * has no imports and can be asserted without a database, which is the whole
 * reason its column list is safe to trust. This file already reaches the store.
 */
const DERIVE: Record<string, (row: Record<string, unknown>) => Record<string, unknown>> = {
  invoices: (r) => ({ ...r, ...invoiceTotals(r) }),
  bills: (r) => ({ ...r, ...billTotals(r) }),
};

export type DatasetRead =
  | { error: "forbidden"; key: string }
  | { rows: Record<string, unknown>[] };

export async function readDataset(
  ctx: { studio: { id: string }; access: PermissionSet },
  dataset: DataSet,
): Promise<DatasetRead> {
  // THE SECOND GATE. Named in the refusal so somebody told "no" knows which
  // right to ask for — a bare `forbidden` on a screen listing eight data sets
  // says nothing about which one.
  if (!can(ctx.access, dataset.permission as PermissionKey)) {
    return { error: "forbidden", key: dataset.permission };
  }

  // The sub-section that owns the collection, falling back to the parent so a
  // studio predating the sub-section model still reads — the `ownerOf` shape
  // Finance already uses for its cross-section reads.
  const owner = (await getSectionByKey(ctx.studio.id, dataset.sectionKey))
    || (await getSectionByKey(ctx.studio.id, dataset.parentSectionKey));

  // NO SECTION IS AN EMPTY LIST, NOT AN ERROR. A studio that has never used
  // Tendering has no tenders to report on, and that is a truthful answer rather
  // than a failure.
  const stored = owner
    ? await repo(dataset.collection).find({ studio: ctx.studio as never, section: owner })
    : [];

  const derive = DERIVE[dataset.key];
  return {
    rows: derive
      ? (stored as Record<string, unknown>[]).map(derive)
      : (stored as Record<string, unknown>[]),
  };
}
