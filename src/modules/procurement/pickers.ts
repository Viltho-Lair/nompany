// WHAT A FORM MAY PICK FROM — the suppliers, projects, cost codes, items, open
// orders and billing milestones a studio actually has, reduced to what a
// dropdown shows.
//
// THE GAP THIS CLOSES. The services behind a bill, a requisition, a subcontract
// and an RFQ all took `vendorId`, `projectId`, `costCodeId`, `orderId` and
// `itemId`, and every form either typed them by hand into a 60-character box or
// left them out: a requisition asked for a supplier's internal id, an RFQ for a
// comma-separated list of them, and a bill named no project, code or order at
// all. So a project's actual and committed cost read nought whatever was spent,
// the payment hold never had a supplier or an order to check, and a studio's
// supplier register was reachable from none of the screens that buy from it.
//
// ONE READER, NOT ONE PER SCREEN. Finance and Procurement ask the same
// questions of the same collections; a second copy would be free to disagree
// about which orders are open or what a cost code is called.
//
// NAMES, NOT FIGURES. A picker needs a code and a name. A cost code's budget
// and a milestone's amount are NOT sent: somebody filing a bill against a code
// has no business reading the margin, which is exactly the line
// `projects.costs` and `projects.billing` draw. What is sent here is reference
// data — the same labels the server already accepts from the form.
//
// FOREIGN AND THEREFORE NULLABLE. A studio without Projects has no projects to
// offer, and one without Inventory no items; an absent section is an empty
// list, never a refusal.
import { repo } from "@/platform/db/repo";
import type { Section } from "@/platform/db/sections";
import type { Vendor, Item, Order } from "@/modules/inventory/schema";
import type { Project, ProjectCost, ProjectMilestone } from "@/modules/projects/schema";

const Vendors = repo<Vendor>("inventoryVendors");
const Items = repo<Item>("inventoryItems");
const Orders = repo<Order>("materialOrders");
const Projects = repo<Project>("projects");
const Costs = repo<ProjectCost>("projectCosts");
const Milestones = repo<ProjectMilestone>("projectMilestones");

/** An order a bill may answer: placed, and not withdrawn. */
const OPEN_ORDER = new Set(["Ordered", "Partly received", "Received"]);

export type Pickers = {
  suppliers?: { id: string; name: string }[];
  projects?: { id: string; number: string; title: string }[];
  costCodes?: { id: string; projectId: string; code: string; name: string }[];
  items?: { id: string; name: string; sku: string; unit: string }[];
  orders?: { id: string; reference: string; vendorId: string; projectId: string; costCodeId: string }[];
  milestones?: { id: string; projectId: string; code: string; name: string }[];
};

type Want = Partial<Record<keyof Pickers, boolean>>;

const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name);
const byCode = <T extends { code: string }>(a: T, b: T) => a.code.localeCompare(b.code);

/**
 * THE LISTS ASKED FOR, and only those — each is a read, and a screen that needs
 * suppliers alone should not pay for the item catalogue.
 */
export async function referencePickers(
  studio: { id: string },
  sections: {
    suppliers?: Section | null;
    projects?: Section | null;
    items?: Section | null;
    orders?: Section | null;
  },
  want: Want,
): Promise<Pickers> {
  const read = <T>(on: boolean | undefined, section: Section | null | undefined, run: (s: Section) => Promise<T[]>) =>
    (on && section ? run(section) : Promise.resolve([] as T[]));

  const [vendors, items, orders, projects, costs, milestones] = await Promise.all([
    read(want.suppliers, sections.suppliers, (section) => Vendors.find({ studio, section })),
    read(want.items, sections.items, (section) => Items.find({ studio, section })),
    read(want.orders, sections.orders, (section) => Orders.find({ studio, section })),
    read(want.projects, sections.projects, (section) => Projects.find({ studio, section })),
    read(want.costCodes, sections.projects, (section) => Costs.find({ studio, section })),
    read(want.milestones, sections.projects, (section) => Milestones.find({ studio, section })),
  ]);

  const out: Pickers = {};
  if (want.suppliers) {
    out.suppliers = vendors.map((v) => ({ id: v.id, name: v.name || v.id })).sort(byName);
  }
  if (want.items) {
    out.items = items
      .map((i) => ({ id: i.id, name: i.name || i.sku || i.id, sku: i.sku || "", unit: i.unit || "" }))
      .sort(byName);
  }
  if (want.orders) {
    out.orders = orders
      .filter((o) => OPEN_ORDER.has(String(o.status || "")))
      .map((o) => ({
        id: o.id, reference: o.reference || o.id, vendorId: o.vendorId || "",
        projectId: o.projectId || "", costCodeId: o.costCodeId || "",
      }))
      .sort((a, b) => b.reference.localeCompare(a.reference));
  }
  if (want.projects) {
    out.projects = projects
      .map((p) => ({ id: p.id, number: p.number || "", title: p.title || "" }))
      .sort((a, b) => (a.number || a.title).localeCompare(b.number || b.title));
  }
  if (want.costCodes) {
    out.costCodes = costs
      .map((c) => ({ id: c.id, projectId: c.projectId, code: c.code || "", name: c.name || "" }))
      .sort(byCode);
  }
  if (want.milestones) {
    out.milestones = milestones
      .map((m) => ({ id: m.id, projectId: m.projectId, code: m.code || "", name: m.name || "" }))
      .sort(byCode);
  }
  return out;
}

/** Supplier id → name, for screens that only DISPLAY who an order is with. */
export async function supplierNames(studio: { id: string }, section: Section | null | undefined) {
  const { suppliers = [] } = await referencePickers(studio, { suppliers: section }, { suppliers: true });
  return Object.fromEntries(suppliers.map((s) => [s.id, s.name]));
}
