import { currentUser } from "@/platform/auth/identity";
import { studioContext } from "@/lib/studios";
import { can } from "@/platform/access";
import { datasetFor, toRows, toCsv } from "@/modules/reports/datasets";
import { readDataset } from "@/modules/reports/read";
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
// THE ROWS COME FROM `modules/reports/read`, which is where the second gate,
// the section fallback and the derived-column map now live — the report builder
// needs the identical read, and two copies would be two places to forget one of
// the three. The derived-column note that used to sit here has moved with it.

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

  // THE SECOND GATE, asked inside `readDataset` and named in its refusal so
  // somebody told "no" knows which right to ask for. A studio with no such
  // section gets an EMPTY FILE rather than an error — the header row still
  // tells them what the columns are.
  const read = await readDataset(context, dataset);
  if ("error" in read) return Response.json(read, { status: 403 });
  const { rows } = read;

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
