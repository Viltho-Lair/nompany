import { getCollection, createItem } from "@/lib/db";
import { requireSection, requireManage, unauthorized, forbidden } from "@/lib/session";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID = ["services", "projects", "careers", "messages", "previousProjects", "galleryImages", "slas", "signatures", "reviews", "inventoryVendors", "inventoryItems", "inventoryStock", "departments", "positions", "certifications", "docImages"];
// `users` intentionally omitted — managed via /api/users routes that also hash
// passwords and return one-time plaintext on create.

// Which section-access key gates each collection. Departments/positions/
// certifications are managed within the Employees page; slas/signatures within
// Settings.
const SECTION_KEY = {
  services: "services",
  projects: "projects",
  careers: "careers",
  messages: "messages",
  previousProjects: "previous-projects",
  galleryImages: "gallery",
  slas: "settings",
  signatures: "gallery",
  reviews: "reviews",
  inventoryVendors: "inventory-vendors",
  inventoryItems: "inventory-items",
  inventoryStock: "inventory-stock",
  departments: "employees",
  positions: "employees",
  certifications: "employees",
  docImages: "documentation-settings",
};

// Contain personal / internal data — reads are section-gated (not open to any
// logged-in user). Inventory is internal business data, so gated here too.
const PRIVATE_READ = ["messages", "reviews", "inventoryVendors", "inventoryItems", "inventoryStock", "docImages"];

// Some catalogue collections are also read by users of other sections (e.g. the
// quotation builder reads Registered Items + Vendors to fill its tables). Grant
// the read if the user can access the collection's own section OR any alternate
// listed here. Writes stay gated to the collection's own section.
const READ_ALSO = {
  inventoryItems: ["technical-quotations", "sales-list", "projects-list"],
  inventoryVendors: ["technical-quotations", "sales-list", "projects-list"],
  inventoryStock: ["technical-quotations", "sales-list", "projects-list"],
  // The Documentation guide (view-only) reads its screenshots; managing them
  // stays gated to documentation-settings.
  docImages: ["documentation"],
};

const HREF = {
  services: "/studio/services",
  projects: "/studio/projects/list",
  careers: "/studio/careers",
  messages: "/studio/messages",
  previousProjects: "/studio/previous-projects",
  galleryImages: "/studio/gallery",
  slas: "/studio/settings",
  signatures: "/studio/gallery",
  reviews: "/studio/reviews",
  inventoryVendors: "/studio/inventory/vendors",
  inventoryItems: "/studio/inventory/items",
  inventoryStock: "/studio/inventory/stock",
  departments: "/studio/employees",
  positions: "/studio/employees",
  certifications: "/studio/employees",
  docImages: "/studio/documentation/settings",
};

// Best-effort human label for a freshly created record — falls back to the
// collection name when nothing recognizable is on the record.
function labelFor(collection, record) {
  const name = record.title_en || record.name_en || record.title || record.name || record.subject || record.jobTitle || "";
  return name ? `${name}` : `New ${collection} item`;
}

export async function GET(request, { params }) {
  const { collection } = await params;
  if (!VALID.includes(collection)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  if (PRIVATE_READ.includes(collection)) {
    const keys = [SECTION_KEY[collection], ...(READ_ALSO[collection] || [])];
    let allowed = false;
    for (const k of keys) {
      if (await requireSection(k)) { allowed = true; break; }
    }
    if (!allowed) return unauthorized();
  }
  return Response.json(await getCollection(collection));
}

export async function POST(request, { params }) {
  const { collection } = await params;
  if (!VALID.includes(collection)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();

  // The public contact form may create messages; everything else is admin only.
  if (collection === "messages") {
    const { name, email, phone, subject, message } = body || {};
    if (!name || !email || !message) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }
    const record = await createItem("messages", {
      name: String(name).slice(0, 200),
      email: String(email).slice(0, 200),
      phone: String(phone || "").slice(0, 60),
      subject: String(subject || "").slice(0, 200),
      message: String(message).slice(0, 4000),
      createdAt: new Date().toISOString(),
    });
    logActivity({ actor: null, verb: "created", sectionKey: "messages", entityType: "messages", entityId: record.id, label: `New message from ${record.name}`, href: HREF.messages }).catch(() => {});
    return Response.json(record, { status: 201 });
  }

  // Clients may submit a review; it stays "new" (hidden) until an admin approves it.
  if (collection === "reviews") {
    const { name, position, rating, comment } = body || {};
    if (!name || !comment) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }
    const stars = Math.min(5, Math.max(1, Math.round(Number(rating) || 0)));
    const record = await createItem("reviews", {
      name: String(name).slice(0, 120),
      position: String(position || "").slice(0, 160),
      rating: stars,
      comment: String(comment).slice(0, 1000),
      status: "new",
      createdAt: new Date().toISOString(),
    });
    logActivity({ actor: null, verb: "created", sectionKey: "reviews", entityType: "reviews", entityId: record.id, label: `New review from ${record.name}`, href: HREF.reviews }).catch(() => {});
    return Response.json({ ok: true, id: record.id }, { status: 201 });
  }

  const actor = await requireManage(SECTION_KEY[collection]);
  if (!actor) return forbidden();
  const record = await createItem(collection, body);
  logActivity({ actor, verb: "created", sectionKey: SECTION_KEY[collection], entityType: collection, entityId: record.id, label: labelFor(collection, record), href: HREF[collection] || "/studio" }).catch(() => {});
  return Response.json(record, { status: 201 });
}
