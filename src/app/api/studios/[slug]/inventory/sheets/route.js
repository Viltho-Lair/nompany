import { inventoryGuard, saveSheetLine } from "@/lib/inventory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ONE DEPARTMENT'S COLUMNS ON ONE ROW OF ONE SHEET.
//
// There is no GET: sheets travel on the Inventory screen's single read, like
// every other list it draws. And there is no create or delete — a sheet's rows
// ARE the quotation's rows, so there is nothing here to add or remove. What can
// be written is what a department adds beside them.
//
// NOT guarded with { write: true }. That asks the coarse "may they manage
// Inventory" question, and this write is owned per column: Inventory's columns
// answer to inventory.sheets.edit, Projects' to projects.list.edit, and
// saveSheetLine asks for whichever the caller says they are writing as. So a
// project manager with no Inventory rights at all can still mark installation
// done, which is the point of one shared row.
export async function PUT(request, ctx) {
  const g = await inventoryGuard(ctx.params);
  if (g.fail) return g.fail;

  let body = {};
  try { body = await request.json(); } catch { body = {}; }

  const result = await saveSheetLine(g, body);
  if (result.error) {
    const status = result.error === "notfound" || result.error === "no-section" ? 404
      : result.error === "forbidden" ? 403
      : result.error === "unknown-permission" ? 500 : 400;
    return Response.json({ error: result.error, key: result.key }, { status });
  }
  return Response.json({ ok: true, line: result.line });
}
