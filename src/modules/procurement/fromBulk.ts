// "ORDER WHAT'S NEEDED" — a project's Bulk sheet, raised as requisitions.
//
// One DRAFT requisition per supplier, through `createRequisition` itself, so
// numbering, the guard and the shape are the ones every other requisition gets
// and the approval chain stands between the sheet and the supplier exactly as
// it does for a typed request (tier 5, the owner's choice over ordering
// directly). The arithmetic is ./bulkNeeds, pure.
//
// THE SHEET IS COMPOSED BY INVENTORY, not re-derived here. `listProjectSheets`
// is the one place a Bulk sheet is summed and grouped by supplier; a second
// composition in Procurement would be free to disagree with the one on screen.

import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import type { Section } from "@/platform/db/sections";
import { listProjectSheets } from "@/modules/inventory/inventory";
import type { Item, Order } from "@/modules/inventory/schema";
import { createRequisition } from "./requisitions";
import { askedFor, bulkNeeds, type BulkGroup } from "./bulkNeeds";
import type { Requisition } from "./schema";
import type { ProcurementContext } from "./types";

const Requisitions = repo<Requisition>("requisitions");
const Orders = repo<Order>("materialOrders");
const Items = repo<Item>("inventory");

export async function raiseFromBulk(ctx: ProcurementContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "procurement.requisitions.create");
  if (denied) return denied;

  const projectId = String(body?.fromBulk ?? "").trim().slice(0, 60);
  if (!projectId) return { error: "project" };

  const byKey = (key: string): Section | null => ctx.sections.find((s) => s.key === key) || null;
  const sheetsSection = byKey("inventory-sheets") || byKey("inventory");
  const sheets = await listProjectSheets({
    studio: ctx.studio,
    sheetsSection,
    projectsListSection: ctx.projectsListSection,
    quotationsSection: byKey("crm-sales-quotations"),
    itemsSection: ctx.itemsSection,
    vendorsSection: ctx.suppliersSection,
    tasksSection: byKey("tasks"),
    tenderRegisterSection: byKey("tendering-register"),
  });
  const bulk = (sheets as { projectId?: unknown; kind?: unknown; tables?: unknown; projectNumber?: unknown; projectTitle?: unknown }[])
    .find((s) => String(s.projectId || "") === projectId && s.kind === "bulk");
  if (!bulk) return { error: "no-sheet" };

  const [requisitions, orders, items] = await Promise.all([
    Requisitions.find({ studio: ctx.studio, section: ctx.requisitionsSection }),
    ctx.ordersSection ? Orders.find({ studio: ctx.studio, section: ctx.ordersSection }) : Promise.resolve([] as Order[]),
    ctx.itemsSection ? Items.find({ studio: ctx.studio, section: ctx.itemsSection }) : Promise.resolve([] as Item[]),
  ]);
  const { needs, skipped } = bulkNeeds(
    (Array.isArray(bulk.tables) ? bulk.tables : []) as BulkGroup[],
    askedFor(projectId, requisitions, orders),
  );
  // WHAT A LINE IS EXPECTED TO COST, from the Registered Item — an estimate on
  // a requisition, which is what the approval chain routes by. The sheet itself
  // carries no prices (Inventory drops them at composition, on purpose).
  const costOf = new Map(items.map((i) => [String(i.id), Number((i as { unitCost?: unknown }).unitCost) || 0]));
  const project = String(bulk.projectNumber || bulk.projectTitle || "");

  const raised: { id: string; reference: string; vendorName: string; lines: number }[] = [];
  for (const need of needs) {
    const made = await createRequisition(ctx, {
      title: project ? `${project} — ${need.vendorName}` : need.vendorName,
      justification: "Raised from the project's Bulk sheet: what was sold, less what is allocated and already asked for.",
      projectId,
      vendorId: need.vendorId,
      lines: need.lines.map((l) => ({ ...l, estUnitCost: costOf.get(l.itemId) || 0 })),
    });
    if (!made || !("requisition" in made)) return made;
    const r = made.requisition as { id?: unknown; reference?: unknown };
    raised.push({ id: String(r.id), reference: String(r.reference || ""), vendorName: need.vendorName, lines: need.lines.length });
  }
  return { ok: true, raised, skipped };
}
