import { currentUser } from "@/platform/auth/identity";
import { studioContext } from "@/lib/studios";
import { can } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { getSectionByKey } from "@/platform/db/sections";
import { datasetFor, toRows, toCsv } from "@/modules/reports/datasets";
import { invoiceTotals } from "@/modules/finance/finance";
import { billTotals } from "@/modules/finance/payables";
import type { PermissionKey } from "@/platform/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ONE DATA SET, AS A FILE.
//
// NOT THROUGH `route()`, and this is the one place that is right rather than
// lazy: the wrapper's whole job is to turn a service's `{ error }` into JSON
// with a status, and this returns text/csv with a filename. Forcing a CSV
// through a JSON envelope would mean the browser downloading a quoted string.
//
// TWO GATES, BOTH ASKED HERE. `reports.exports.view` opens the export surface
// at all; the data set then asks the right its own section already required. A
// caller holding the first and not the second gets nothing — giving somebody
// the export screen must not widen what they can see by one row.
// COLUMNS THAT ARE NOT ON THE ROW.
//
// `total` IS DERIVED, NEVER STORED — `invoiceTotals` computes it from the lines
// and the VAT rate on every read, which is what stops a stored total and its
// own lines parting company. So an export that reads rows straight out of the
// collection produced a Total column that was EMPTY on every line, which is
// worse than not offering the column: a spreadsheet of invoices with no amounts
// looks like the export is broken, and a studio that did not check would think
// it had the data.
//
// THE MAP LIVES HERE RATHER THAN IN THE CATALOGUE so `datasets.ts` stays pure —
// it has no imports and can be asserted without a database, which is the whole
// reason the column list is safe to trust. This file already reaches the store.
const DERIVE: Record<string, (row: Record<string, unknown>) => Record<string, unknown>> = {
  invoices: (r) => ({ ...r, ...invoiceTotals(r) }),
  bills: (r) => ({ ...r, ...billTotals(r) }),
};

export async function GET(request: Request, ctx: { params: Promise<Record<string, string>> }) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { slug } = await ctx.params;
  const context = await studioContext(user, slug);
  if (context.error) {
    // The same answer a non-member gets everywhere: nothing about the contents,
    // and 404-vs-403 decided by the context rather than restated here.
    return Response.json({ error: context.error }, { status: context.error === "forbidden" ? 403 : 404 });
  }

  if (!can(context.access, "reports.exports.view" as PermissionKey)) {
    return Response.json({ error: "forbidden", key: "reports.exports.view" }, { status: 403 });
  }

  const dataset = datasetFor(new URL(request.url).searchParams.get("dataset"));
  if (!dataset) return Response.json({ error: "notfound" }, { status: 404 });

  // THE SECOND GATE. Named in the refusal so somebody told "no" knows which
  // right to ask for — a bare `forbidden` on a screen listing eight data sets
  // says nothing about which one.
  if (!can(context.access, dataset.permission as PermissionKey)) {
    return Response.json({ error: "forbidden", key: dataset.permission }, { status: 403 });
  }

  // The sub-section that owns the collection, falling back to the parent so a
  // studio predating the sub-section model still exports — the `ownerOf` shape
  // Finance already uses for its cross-section reads.
  const owner = (await getSectionByKey(context.studio.id, dataset.sectionKey))
    || (await getSectionByKey(context.studio.id, dataset.parentSectionKey));
  // NO SECTION IS AN EMPTY FILE, NOT AN ERROR. A studio that has never used
  // Tendering has no tenders to export, and that is a truthful answer rather
  // than a failure — the header row still tells them what the columns are.
  const stored = owner
    ? await repo(dataset.collection).find({ studio: context.studio, section: owner })
    : [];
  const derive = DERIVE[dataset.key];
  const rows = derive
    ? (stored as Record<string, unknown>[]).map(derive)
    : (stored as Record<string, unknown>[]);

  // THE BOM IS NOT DECORATION. Excel on Windows reads a UTF-8 CSV as the system
  // codepage without one, which turns every Arabic client name into mojibake —
  // and this product's studios are largely Arabic. Everything else that reads a
  // CSV ignores it.
  // WRITTEN AS AN ESCAPE, not the character itself: a literal U+FEFF in source is
  // invisible, and the first editor or formatter that strips "stray whitespace"
  // would take it out with nothing to see in the diff.
  const csv = `\uFEFF${toCsv(toRows(dataset, rows))}`;
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}-${dataset.key}-${stamp}.csv"`,
      // Never cached: it is a snapshot of live rows, and a stale one read as
      // current is worse than a slow download.
      "Cache-Control": "no-store",
    },
  });
}
