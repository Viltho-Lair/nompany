import { route } from "@/platform/http/route";
import { inventoryContext, saveSheetLine } from "@/lib/inventory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ONE DEPARTMENT'S COLUMNS ON ONE ROW OF ONE SHEET.
//
// There is no GET: sheets travel on the Inventory screen's single read, like
// every other list it draws. And there is no create or delete — a sheet's rows
// ARE the quotation's rows, so there is nothing here to add or remove. What can
// be written is what a department adds beside them.
//
// NO canManage CHECK, deliberately. That asks the coarse "may they manage
// Inventory" question, and this write is owned per column: Inventory's columns
// answer to inventory.sheets.edit, Projects' to projects.list.edit, and
// saveSheetLine asks for whichever the caller says they are writing as. So a
// project manager with no Inventory rights at all can still mark installation
// done, which is the point of one shared row.
export const PUT = route(
  { auth: "studio", context: inventoryContext, body: true, name: "inventory/sheets" },
  async (inv) => {
    const result = await saveSheetLine(inv, inv.body);
    if (result.error) return result;
    return { ok: true, line: result.line };
  },
);
