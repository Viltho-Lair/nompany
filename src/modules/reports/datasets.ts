// WHAT A STUDIO CAN TAKE OUT OF THE PRODUCT.
//
// REPORTS & BI WAS THE LAST SECTION RENDERING NOTHING, and it is the one
// section whose content is not records: a report builder reads what the other
// fourteen already store. So the first thing it does is the thing every ERP
// buyer asks for on day one and nobody had — get the data out.
//
// TWO GATES, AND BOTH ARE REAL. `reports.exports.view` opens the screen, and
// each data set ALSO names the right its own section already requires. So
// exporting the invoice register needs `reports.exports.view` AND
// `finance.cash.view` — you cannot reach data by walking round the section that
// owns it, and giving somebody the export screen does not widen what they can
// see by one row.
//
// THE FIRST GATE IS NOT CEREMONY. Reading a screen and taking the whole
// collection away are different powers: one is looking at your own work, the
// other is the shape every data-exfiltration story has. A studio that wants its
// site engineers to read projects and not to download them can now say so.
//
// PURE. No imports, no store — the screen and the route resolve the same
// catalogue, and the columns are declared rather than discovered so an export
// cannot start carrying a field somebody added to a record last week.

export type DataSet = {
  key: string;
  label: string;
  group: string;
  /** The right the owning section already requires to read these rows. */
  permission: string;
  /** The section key that owns the collection, and the collection itself. */
  sectionKey: string;
  /** Falls back to this when the sub-section is absent — the `ownerOf` shape. */
  parentSectionKey: string;
  collection: string;
  /**
   * THE COLUMNS, DECLARED. An export that spread whatever the row happened to
   * hold would leak a field the day somebody added one — `passwordHash` is not
   * on any of these records, but `unitCost` and `salary` are on some, and the
   * difference between a report and a data breach is which columns you chose on
   * purpose.
   */
  columns: readonly { key: string; label: string }[];
};

const col = (key: string, label: string) => ({ key, label });

export const DATASETS: readonly DataSet[] = Object.freeze([
  {
    key: "invoices", label: "Invoices", group: "Finance & Accounting",
    permission: "finance.cash.view",
    sectionKey: "finance-cash", parentSectionKey: "finance", collection: "invoices",
    columns: [
      col("reference", "Reference"), col("clientName", "Client"), col("status", "Status"),
      col("issueDate", "Issued"), col("dueDate", "Due"), col("total", "Total"),
    ],
  },
  {
    key: "bills", label: "Bills", group: "Finance & Accounting",
    permission: "finance.payables.view",
    sectionKey: "finance-payables", parentSectionKey: "finance", collection: "bills",
    columns: [
      col("reference", "Reference"), col("vendorName", "Vendor"), col("status", "Status"),
      col("billDate", "Date"), col("dueDate", "Due"), col("total", "Total"),
    ],
  },
  {
    key: "journal", label: "Journal entries", group: "Finance & Accounting",
    permission: "finance.ledger.view",
    sectionKey: "finance-ledger", parentSectionKey: "finance", collection: "journalEntries",
    columns: [
      col("reference", "Reference"), col("date", "Date"), col("memo", "Memo"),
    ],
  },
  {
    key: "projects", label: "Projects", group: "Projects",
    permission: "projects.list.view",
    sectionKey: "projects-list", parentSectionKey: "projects", collection: "projects",
    columns: [
      col("number", "Number"), col("title", "Title"), col("clientName", "Client"),
      col("status", "Status"), col("value", "Value"),
    ],
  },
  {
    key: "tenders", label: "Tenders", group: "Tendering & Estimating",
    permission: "tendering.tenders.view",
    sectionKey: "tendering-register", parentSectionKey: "tendering", collection: "tenders",
    columns: [
      col("ref", "Reference"), col("title", "Title"), col("issuer", "Issuer"),
      col("status", "Status"), col("deadline", "Deadline"),
    ],
  },
  {
    key: "clients", label: "Customers", group: "CRM & Sales",
    permission: "crmSales.clients.view",
    sectionKey: "crm-sales-clients", parentSectionKey: "crm-sales", collection: "salesClients",
    columns: [
      col("name", "Name"), col("industry", "Industry"), col("createdAt", "Added"),
    ],
  },
  {
    key: "items", label: "Registered items", group: "Inventory & Warehouse",
    permission: "inventory.items.view",
    sectionKey: "inventory-items", parentSectionKey: "inventory", collection: "catalogueItems",
    columns: [
      col("sku", "SKU"), col("name", "Name"), col("unit", "Unit"), col("sellPrice", "Sell price"),
    ],
  },
  {
    key: "suppliers", label: "Suppliers", group: "Procurement & Subcontracting",
    permission: "procurement.suppliers.view",
    sectionKey: "procurement-suppliers", parentSectionKey: "procurement", collection: "suppliers",
    columns: [
      col("name", "Name"), col("category", "Category"), col("email", "Email"), col("phone", "Phone"),
    ],
  },
  // FOUR MORE, ADDED FOR THE EXECUTIVE BOARD AND USEFUL TO ALL THREE READERS.
  // The board is built on this catalogue rather than a second list of where the
  // numbers live, so what it needed had to be declared HERE — which means the
  // export and the report builder gain them in the same change, and cannot
  // disagree with the board about what "deals" means.
  //
  // EVERY ONE NAMES THE RIGHT ITS OWN SECTION ALREADY REQUIRES, and the columns
  // are chosen rather than spread: `quotations` carries line prices and
  // `vacations` carries a reason somebody wrote in confidence, and neither is
  // on this list.
  {
    key: "tickets", label: "Deals", group: "CRM & Sales",
    permission: "crmSales.tickets.view",
    sectionKey: "crm-sales-tickets", parentSectionKey: "crm-sales", collection: "salesTickets",
    columns: [
      col("reference", "Reference"), col("title", "Title"), col("clientName", "Client"),
      col("status", "Status"), col("createdAt", "Opened"),
    ],
  },
  {
    key: "quotations", label: "Quotations", group: "CRM & Sales",
    permission: "crmSales.quotations.view",
    sectionKey: "crm-sales-quotations", parentSectionKey: "crm-sales", collection: "quotations",
    columns: [
      col("reference", "Reference"), col("clientName", "Client"), col("status", "Status"),
      col("createdAt", "Raised"), col("total", "Total"),
    ],
  },
  {
    key: "orders", label: "Purchase orders", group: "Inventory & Warehouse",
    permission: "inventory.stock.view",
    sectionKey: "inventory-sheets", parentSectionKey: "inventory", collection: "materialOrders",
    columns: [
      col("reference", "Reference"), col("vendorName", "Vendor"), col("status", "Status"),
      col("createdAt", "Placed"), col("total", "Total"),
    ],
  },
  {
    key: "vacations", label: "Leave", group: "Human Resources",
    permission: "hr.vacations.view",
    // HR'S OWN ROOT, not a sub-section: `vacations` is one of the few
    // collections still owned by a department root rather than a child.
    sectionKey: "hr", parentSectionKey: "hr", collection: "vacations",
    columns: [
      col("collaboratorId", "Person"), col("type", "Type"), col("status", "Status"),
      col("from", "From"), col("to", "To"), col("days", "Days"),
    ],
  },
]);

const byKey = new Map(DATASETS.map((d) => [d.key, d]));
export const datasetFor = (key: unknown): DataSet | null => byKey.get(String(key ?? "")) || null;

/**
 * WHAT THIS READER MAY EXPORT.
 *
 * `has` is asked rather than a permission set being iterated, so a wildcard
 * (the owner, Admin) answers correctly — `WildcardPermissions.has` is the
 * authority and `size`/`[...access]` are not.
 */
export function exportableFor(has: (key: string) => boolean): DataSet[] {
  return DATASETS.filter((d) => has(d.permission));
}

/**
 * ONE DATA SET AS ROWS OF STRINGS, columns in declared order.
 *
 * NOTHING IS FORMATTED HERE beyond becoming text — no currency symbols, no
 * localised dates. A CSV is read by a spreadsheet far more often than by a
 * person, and a date rendered dd/mm/yyyy is a date that spreadsheet will parse
 * wrongly or not at all.
 */
export function toRows(dataset: DataSet, rows: readonly Record<string, unknown>[]): string[][] {
  const head = dataset.columns.map((c) => c.label);
  const body = (rows || []).map((r) => dataset.columns.map((c) => {
    const v = r?.[c.key];
    if (v === null || v === undefined) return "";
    // An object in a cell is a bug in the column list rather than something to
    // stringify into a spreadsheet, so it becomes empty rather than "[object
    // Object]" — visible as a gap, which is what sends somebody to fix it.
    return typeof v === "object" ? "" : String(v);
  }));
  return [head, ...body];
}

/** RFC 4180: quote when the value could otherwise break the row. */
export function toCsv(rows: readonly (readonly string[])[]): string {
  return rows.map((r) => r.map((cell) => (
    /[",\r\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell
  )).join(",")).join("\r\n");
}
