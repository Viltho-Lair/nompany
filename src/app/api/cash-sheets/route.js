import { getCollection, createItem } from "@/lib/db";
import { currentUser, unauthorized, requireSection, requireManage, forbidden } from "@/lib/session";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cash sheets are PER-USER: each user only sees and edits their own. A sheet is
// a data-entry grid for one year (Sheet-N-YYYY); the "Main" analytics view is
// derived on the client from the user's own sheets.
const ROWS = 28;

function blankRows() {
  return Array.from({ length: ROWS }, () => ({ invoiceDate: "", category: "", description: "", paidBy: "", projectId: "", amount: "" }));
}

function sanitizeRows(rows) {
  const arr = Array.isArray(rows) ? rows : [];
  const out = [];
  for (let i = 0; i < ROWS; i++) {
    const r = arr[i] || {};
    out.push({
      invoiceDate: String(r.invoiceDate || ""),
      category: String(r.category || "").slice(0, 120),
      description: String(r.description || "").slice(0, 500),
      paidBy: String(r.paidBy || "").slice(0, 64),
      projectId: String(r.projectId || "").slice(0, 64),
      amount: r.amount === "" || r.amount == null ? "" : (Number(r.amount) || 0),
    });
  }
  return out;
}

export async function GET() {
  const actor = await requireSection("cash");
  if (!actor) return forbidden();
  const rows = (await getCollection("cashSheets")).filter((s) => s.createdBy === actor.id);
  rows.sort((a, b) => (a.year - b.year) || ((a.index || 0) - (b.index || 0)));
  return Response.json(rows);
}

export async function POST(request) {
  const actor = await requireManage("cash");
  if (!actor) return forbidden();
  const body = await request.json().catch(() => ({}));
  const year = parseInt(body.year, 10) || new Date().getFullYear();

  // Next incremental index within this user's sheets for the year.
  const mine = (await getCollection("cashSheets")).filter((s) => s.createdBy === actor.id && s.year === year);
  const index = mine.reduce((m, s) => Math.max(m, s.index || 0), 0) + 1;

  const sheet = await createItem("cashSheets", {
    year,
    index,
    name: `Sheet-${index}-${year}`,
    includeAllProjects: false,
    notes: "",
    origin: "",
    extraCash: "",
    locked: false,
    lockedAt: "",
    rows: blankRows(),
    createdBy: actor.id,
    createdByLabel: actor.fullName || actor.userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  logActivity({ actor, verb: "created", sectionKey: "cash", entityType: "cashSheets", entityId: sheet.id, label: `Cash ${sheet.name} added`, href: "/studio/finance/cash" }).catch(() => {});
  return Response.json(sheet, { status: 201 });
}
