import { currentUser } from "@/platform/auth/identity";
import { hrContext } from "@/modules/hr/hr";
import { bankFile, sifFileFor } from "@/modules/hr/payrollService";
import { toCsv } from "@/modules/reports/datasets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE BANK FILE, AS A FILE.
//
// NOT THROUGH `route()`, for the reason the export is not: the wrapper turns a
// service's result into JSON, and this is text/csv with a filename. A payment
// file handed back as a quoted JSON string is a payment file nobody can send.
//
// EVERY GATE IS THE SERVICE'S. `bankFile` asks `hr.payroll.view`, refuses a
// Draft run, and leaves out anybody with no account — this handler decides
// nothing except how the answer is encoded.
export async function GET(request: Request, ctx: { params: Promise<Record<string, string>> }) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { slug } = await ctx.params;
  // HR'S OWN CONTEXT FACTORY, not a hand-built one. It resolves the section
  // fallback, the flags and the nav the same way every HR route does — and a
  // second assembly here would be a second place the section rules could drift.
  const context = await hrContext(user, slug);
  if (context.error) {
    return Response.json({ error: context.error }, { status: context.error === "forbidden" ? 403 : 404 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("run") || "";

  // THE UAE'S WPS FILE, when asked for — its own layout and its own filename,
  // the one the bank's portal expects (statutory.sifFile).
  if (url.searchParams.get("format") === "sif") {
    const sif = await sifFileFor(context, id);
    if ("error" in sif) return Response.json(sif, { status: sif.error === "forbidden" ? 403 : 400 });
    return new Response(sif.text, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=us-ascii",
        "Content-Disposition": `attachment; filename="${sif.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const result = await bankFile(context, id);
  if ("error" in result) {
    return Response.json(result, { status: result.error === "forbidden" ? 403 : 400 });
  }

  // THE COLUMNS ARE DECLARED, like every export in this product: a payment file
  // that spread whatever the row held would send a bank a field it did not ask
  // for, and most WPS formats reject the whole file for one unknown column.
  const rows = [
    ["Name", "IBAN", "Bank", "Amount"],
    ...result.rows.map((r) => [r.alias, r.iban, r.bank, String(r.net)]),
  ];

  // THE BOM, for the reason the data exports carry one: Excel on Windows reads
  // a UTF-8 CSV as the system codepage without it, and these studios' names are
  // largely Arabic.
  // WRITTEN AS AN ESCAPE, not the character itself: a literal U+FEFF in
  // source is invisible, and the first formatter that strips "stray
  // whitespace" would take it out with nothing to see in the diff.
  const csv = `﻿${toCsv(rows)}`;
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="payroll-${result.period}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
