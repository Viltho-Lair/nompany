// THE DEMO COMPANY — one studio, filled the way a real company fills it.
//
// The owner, 26/09/2026: the public site should show the real product, with real
// screenshots and real components, not drawings. A screenshot of an empty studio
// is an empty state, so the pipeline needs a company with work in it: deals at
// every stage, quotations built from registered items, projects with plans,
// stock that arrived on purchase orders, requisitions waiting on a signature,
// invoices paid and unpaid.
//
// AN INVENTED COMPANY, AND OBVIOUSLY SO. The owner chose a contracting and
// trading company in Jordan, so the names are local in flavour — but every one
// is made up, every address ends in `.example`, and no brand appears. Every
// screenshot taken from it is captioned as sample data on the site.
//
// THROUGH THE REAL SERVICES, EVERY RECORD. Each call below is the function a
// route calls, run as the person who would do it: the sales manager raises the
// deal, the estimator prices it, the general manager approves it, the
// procurement officer raises the requisition and the general manager signs it —
// nobody approves their own request, whatever the code would permit.
//
// SANDBOX ONLY. The caller sets NOMPANY_KEY_PREFIX before anything is imported,
// and `npm run dev:sandbox:clean` sweeps all of it.

export const DEMO = {
  slug: "qimam",
  name: "Qimam Contracting & Trading",
  country: "Jordan",
  city: "Amman",
  field: "Construction & Contracting",
  password: "demo-password-1234",
};

// The team. The first is the owner; the rest join as Admin so any of them can
// do their own part of the work below.
const PEOPLE = [
  { key: "lina", email: "lina.haddad@qimam.example", fullName: "Lina Haddad", shortName: "Lina Haddad", jobTitle: "General Manager" },
  { key: "omar", email: "omar.khalil@qimam.example", fullName: "Omar Khalil", shortName: "Omar Khalil", jobTitle: "Sales Manager" },
  { key: "rana", email: "rana.saleh@qimam.example", fullName: "Rana Saleh", shortName: "Rana Saleh", jobTitle: "Senior Estimator" },
  { key: "yousef", email: "yousef.nasser@qimam.example", fullName: "Yousef Nasser", shortName: "Yousef Nasser", jobTitle: "Project Manager" },
  { key: "hala", email: "hala.mansour@qimam.example", fullName: "Hala Mansour", shortName: "Hala Mansour", jobTitle: "Procurement Officer" },
  { key: "tariq", email: "tariq.aziz@qimam.example", fullName: "Tariq Aziz", shortName: "Tariq Aziz", jobTitle: "Site Engineer" },
  { key: "dana", email: "dana.qasem@qimam.example", fullName: "Dana Qasem", shortName: "Dana Qasem", jobTitle: "Accountant" },
  { key: "sami", email: "sami.barakat@qimam.example", fullName: "Sami Barakat", shortName: "Sami Barakat", jobTitle: "Storekeeper" },
];

const VENDORS = [
  { key: "cement", name: "Arabian Cement Supplies", contactName: "Khaled Omari", email: "sales@arabiancement.example", phone: "+962 6 555 0101", itemTypes: ["Materials"] },
  { key: "steel", name: "Levant Steel Traders", contactName: "Nadia Fares", email: "orders@levantsteel.example", phone: "+962 6 555 0102" },
  { key: "blocks", name: "Zarqa Blocks Factory", contactName: "Bassam Odeh", email: "info@zarqablocks.example", phone: "+962 5 555 0103" },
  { key: "elec", name: "Capital Electrical Wholesale", contactName: "Mira Suleiman", email: "trade@capitalelec.example", phone: "+962 6 555 0104" },
  { key: "pipes", name: "Jordan Pipes & Fittings", contactName: "Fadi Hamdan", email: "sales@jopipes.example", phone: "+962 6 555 0105" },
  { key: "solar", name: "Horizon Solar Distribution", contactName: "Reem Jaber", email: "b2b@horizonsolar.example", phone: "+962 6 555 0106" },
  { key: "finish", name: "Crescent Finishing Materials", contactName: "Ziad Nimri", email: "orders@crescentfinish.example", phone: "+962 6 555 0107" },
];

// Registered items: what the company buys, stocks and quotes. Prices in JOD.
const ITEMS = [
  { key: "cement", name: "Portland cement 50 kg bag", unit: "pcs", unitCost: 4.2, sellPrice: 5.4, reorderLevel: 400, vendor: "cement", modelNumber: "OPC 42.5N" },
  { key: "rebar12", name: "Deformed rebar 12 mm", unit: "kg", unitCost: 0.62, sellPrice: 0.79, reorderLevel: 3000, vendor: "steel", modelNumber: "B500B" },
  { key: "rebar16", name: "Deformed rebar 16 mm", unit: "kg", unitCost: 0.61, sellPrice: 0.78, reorderLevel: 3000, vendor: "steel", modelNumber: "B500B" },
  { key: "ibeam", name: "Structural steel I-beam IPE 300", unit: "kg", unitCost: 0.95, sellPrice: 1.22, reorderLevel: 1500, vendor: "steel" },
  { key: "block20", name: "Concrete block 20 cm", unit: "pcs", unitCost: 0.38, sellPrice: 0.5, reorderLevel: 5000, vendor: "blocks" },
  { key: "block15", name: "Hollow block 15 cm", unit: "pcs", unitCost: 0.31, sellPrice: 0.42, reorderLevel: 4000, vendor: "blocks" },
  { key: "tile60", name: "Porcelain floor tile 60×60", unit: "m²", unitCost: 9.5, sellPrice: 13.5, reorderLevel: 300, vendor: "finish" },
  { key: "walltile", name: "Ceramic wall tile 30×60", unit: "m²", unitCost: 7.2, sellPrice: 10.2, reorderLevel: 200, vendor: "finish" },
  { key: "gypsum", name: "Gypsum board 12.5 mm", unit: "pcs", unitCost: 5.1, sellPrice: 7.0, reorderLevel: 250, vendor: "finish" },
  { key: "paint", name: "Interior emulsion paint", unit: "L", unitCost: 2.4, sellPrice: 3.4, reorderLevel: 400, vendor: "finish" },
  { key: "membrane", name: "Bituminous waterproofing membrane 4 mm", unit: "roll", unitCost: 38, sellPrice: 52, reorderLevel: 40, vendor: "finish" },
  { key: "insul", name: "Extruded polystyrene insulation 50 mm", unit: "m²", unitCost: 6.8, sellPrice: 9.4, reorderLevel: 250, vendor: "finish" },
  { key: "ppr", name: "PPR pipe 25 mm", unit: "m", unitCost: 0.85, sellPrice: 1.25, reorderLevel: 600, vendor: "pipes" },
  { key: "upvc", name: "uPVC drain pipe 110 mm", unit: "m", unitCost: 2.3, sellPrice: 3.3, reorderLevel: 300, vendor: "pipes" },
  { key: "cable4", name: "Copper cable 4 mm² (100 m)", unit: "roll", unitCost: 58, sellPrice: 76, reorderLevel: 30, vendor: "elec" },
  { key: "cable16", name: "Armoured cable 4×16 mm²", unit: "m", unitCost: 11.5, sellPrice: 15.2, reorderLevel: 200, vendor: "elec" },
  { key: "tray", name: "Perforated cable tray 300 mm", unit: "m", unitCost: 6.2, sellPrice: 8.6, reorderLevel: 150, vendor: "elec" },
  { key: "db24", name: "Distribution board 24-way", unit: "pcs", unitCost: 145, sellPrice: 198, reorderLevel: 6, vendor: "elec" },
  { key: "led", name: "LED panel 60×60 40 W", unit: "pcs", unitCost: 14, sellPrice: 21, reorderLevel: 120, vendor: "elec" },
  { key: "ac2t", name: "Split air conditioner 2 ton", unit: "set", unitCost: 420, sellPrice: 560, reorderLevel: 8, vendor: "elec" },
  { key: "pv550", name: "Solar PV module 550 W", unit: "pcs", unitCost: 96, sellPrice: 128, reorderLevel: 200, vendor: "solar" },
  { key: "inv50", name: "String inverter 50 kW", unit: "set", unitCost: 3150, sellPrice: 4100, reorderLevel: 2, vendor: "solar" },
  { key: "pvframe", name: "Carport mounting structure", unit: "set", unitCost: 610, sellPrice: 820, reorderLevel: 10, vendor: "solar" },
  { key: "window", name: "Thermal-break aluminium window", unit: "m²", unitCost: 88, sellPrice: 118, reorderLevel: 40, vendor: "finish" },
  { key: "firedoor", name: "Fire-rated steel door 60 min", unit: "pcs", unitCost: 265, sellPrice: 355, reorderLevel: 6, vendor: "finish" },
  { key: "wc", name: "Wall-hung WC set", unit: "set", unitCost: 118, sellPrice: 165, reorderLevel: 12, vendor: "pipes" },
  { key: "heater", name: "Solar water heater 300 L", unit: "set", unitCost: 540, sellPrice: 720, reorderLevel: 4, vendor: "solar" },
  { key: "anchor", name: "Chemical anchor bolts M16 (box of 25)", unit: "box", unitCost: 36, sellPrice: 50, reorderLevel: 20, vendor: "steel" },
  { key: "helmet", name: "Safety helmet (box of 20)", unit: "box", unitCost: 48, sellPrice: 64, reorderLevel: 6, vendor: "finish" },
  { key: "sealant", name: "Polyurethane sealant (box of 24)", unit: "box", unitCost: 62, sellPrice: 84, reorderLevel: 10, vendor: "finish" },
];

const CLIENTS = [
  { name: "Jabal Heights Developments", industry: "Real estate", contact: ["Sana Abu Zaid", "Development Director"] },
  { name: "Irbid Schools Foundation", industry: "Education", contact: ["Dr. Mahmoud Rashed", "Facilities Manager"] },
  { name: "Mafraq Solar Parks", industry: "Energy", contact: ["Laith Obeidat", "Project Lead"] },
  { name: "Madaba Heritage Hotel", industry: "Hospitality", contact: ["Carla Nassar", "General Manager"] },
  { name: "Zarqa Logistics Park", industry: "Logistics", contact: ["Eyad Hijazi", "Operations Director"] },
  { name: "Aqaba Marine Services", industry: "Maritime", contact: ["Hussein Qudah", "Technical Manager"] },
  { name: "Salt Valley Clinics", industry: "Healthcare", contact: ["Dr. Rania Khoury", "Medical Director"] },
  { name: "Jerash Retail Centre", industry: "Retail", contact: ["Walid Tamimi", "Asset Manager"] },
  { name: "Ajloun Eco Lodges", industry: "Hospitality", contact: ["Maysa Bani Hani", "Owner"] },
  { name: "Balqa Water Works", industry: "Utilities", contact: ["Anas Shboul", "Procurement Head"] },
  { name: "Karak Agricultural Cooperative", industry: "Agriculture", contact: ["Salem Majali", "Chairman"] },
  { name: "North Amman Business Towers", industry: "Real estate", contact: ["Tamara Halaseh", "Leasing Director"] },
  { name: "Dead Sea Wellness Retreat", industry: "Hospitality", contact: ["Jad Haddadin", "Owner's Representative"] },
  { name: "Tafilah Municipal Council", industry: "Government", contact: ["Eng. Omar Sawalha", "City Engineer"] },
  { name: "Petra Gate Residences", industry: "Real estate", contact: ["Noor Kharabsheh", "Sales & Development"] },
];

// Deals. `stage` is where each one ends up; `lines` price its quotation from
// registered items when it gets that far; `project` hands a won deal over.
const DEALS = [
  { title: "Tower B fit-out, floors 4–9", client: "Jabal Heights Developments", stage: "Closed Won", service: "Construction & Civil Works", industry: "Commercial", lines: [["tile60", 9000], ["gypsum", 7500], ["paint", 14000], ["led", 1600], ["db24", 24], ["firedoor", 60]], project: { key: "tower", start: -74, end: 96, stage: "In Progress" } },
  { title: "12-classroom extension, Irbid campus", client: "Irbid Schools Foundation", stage: "Closed Won", service: "Construction & Civil Works", industry: "Governmental", lines: [["cement", 15000], ["rebar12", 160000], ["block20", 95000], ["tile60", 5200], ["window", 780], ["ac2t", 48]], project: { key: "school", start: -52, end: 128, stage: "In Progress" } },
  { title: "1.2 MW solar carport", client: "Mafraq Solar Parks", stage: "Closed Won", service: "Installation", industry: "Commercial", lines: [["pv550", 2180], ["inv50", 22], ["pvframe", 96], ["cable16", 3400], ["tray", 900]], project: { key: "solar", start: -33, end: 72, stage: "In Progress" } },
  { title: "Clinic wing renovation", client: "Salt Valley Clinics", stage: "Closed Won", service: "Upgrading & Retrofit", industry: "Commercial", lines: [["walltile", 640], ["tile60", 520], ["wc", 22], ["ppr", 1400], ["led", 180]] },
  { title: "Marina workshop roofing", client: "Aqaba Marine Services", stage: "Closed Won", service: "Construction & Civil Works", industry: "Commercial", lines: [["ibeam", 18500], ["membrane", 160], ["insul", 1200], ["anchor", 40]] },
  { title: "Retail centre MEP upgrade", client: "Jerash Retail Centre", stage: "Commit", service: "Upgrading & Retrofit", industry: "Commercial", lines: [["ac2t", 36], ["cable16", 1800], ["db24", 12], ["tray", 640], ["led", 520]] },
  { title: "Eco-lodge cabins, phase 2", client: "Ajloun Eco Lodges", stage: "Commit", service: "Construction & Civil Works", industry: "Residential", lines: [["block15", 18000], ["cement", 2100], ["window", 160], ["heater", 14], ["insul", 900]] },
  { title: "Pump station civil works", client: "Balqa Water Works", stage: "Commit", service: "Construction & Civil Works", industry: "Governmental", lines: [["cement", 2600], ["rebar16", 31000], ["upvc", 1800], ["membrane", 90]] },
  { title: "Office floors 12–14 refurbishment", client: "North Amman Business Towers", stage: "Commit", service: "Upgrading & Retrofit", industry: "Commercial", lines: [["gypsum", 1400], ["paint", 2600], ["tile60", 1900], ["led", 360], ["firedoor", 9]] },
  { title: "Spa building waterproofing", client: "Dead Sea Wellness Retreat", stage: "Opportunity", service: "Maintenance & Repair", industry: "Commercial", lines: [["membrane", 220], ["insul", 1600], ["sealant", 30]] },
  { title: "Greenhouse structures, 6 units", client: "Karak Agricultural Cooperative", stage: "Opportunity", service: "Assembly", industry: "Commercial", lines: [["ibeam", 9200], ["anchor", 24], ["upvc", 800]] },
  { title: "Street lighting retrofit", client: "Tafilah Municipal Council", stage: "Opportunity", service: "Installation", industry: "Governmental" },
  { title: "Show apartments fit-out", client: "Petra Gate Residences", stage: "Opportunity", service: "Construction & Civil Works", industry: "Residential" },
  { title: "Hotel facade restoration", client: "Madaba Heritage Hotel", stage: "Opportunity", service: "Upgrading & Retrofit", industry: "Commercial" },
  { title: "Warehouse C slab and cladding", client: "Zarqa Logistics Park", stage: "Opportunity", service: "Construction & Civil Works", industry: "Commercial" },
  { title: "Rooftop solar for clinics", client: "Salt Valley Clinics", stage: "Lead", service: "Installation", industry: "Commercial" },
  { title: "Lobby redesign, Tower A", client: "Jabal Heights Developments", stage: "Lead", service: "Design & Engineering", industry: "Commercial" },
  { title: "School playground shading", client: "Irbid Schools Foundation", stage: "Lead", service: "Installation", industry: "Governmental" },
  { title: "Cold room installation", client: "Karak Agricultural Cooperative", stage: "Lead", service: "Installation", industry: "Commercial" },
  { title: "Villa compound site survey", client: "Petra Gate Residences", stage: "Lead", service: "Survey & Assessment", industry: "Residential" },
  { title: "Dock crane foundations", client: "Aqaba Marine Services", stage: "Lead", service: "Construction & Civil Works", industry: "Commercial" },
  { title: "Parking structure, level 3", client: "Jerash Retail Centre", stage: "Closed Lost", service: "Construction & Civil Works", industry: "Commercial", lines: [["cement", 1800], ["rebar16", 22000]], lostReason: "Price — client chose a lower bid" },
  { title: "Guest house extension", client: "Ajloun Eco Lodges", stage: "Closed Lost", service: "Construction & Civil Works", industry: "Residential", lines: [["block20", 9000], ["window", 60]], lostReason: "Timeline — could not start before winter" },
  { title: "Reservoir lining", client: "Balqa Water Works", stage: "Closed Lost", service: "Maintenance & Repair", industry: "Governmental", lines: [["membrane", 300]], lostReason: "Specification changed to HDPE" },
  { title: "Wellness pavilion", client: "Dead Sea Wellness Retreat", stage: "On-Hold", service: "Design & Engineering", industry: "Commercial" },
  { title: "Municipal depot roof", client: "Tafilah Municipal Council", stage: "Dropped", service: "Maintenance & Repair", industry: "Governmental", lostReason: "Budget withdrawn for this year" },
];

// Two projects that did not come from a quotation.
const DIRECT_PROJECTS = [
  { key: "facade", title: "Madaba hotel — heritage facade restoration", client: "Madaba Heritage Hotel", value: 186500, start: 12, end: 190, stage: "Received" },
  { key: "warehouse", title: "Zarqa Logistics Park — warehouse B", client: "Zarqa Logistics Park", value: 742000, start: -260, end: -18, stage: "Completed" },
];

// ---------------------------------------------------------------------------

const TODAY = new Date();
const day = (offset) => {
  const d = new Date(Date.UTC(TODAY.getUTCFullYear(), TODAY.getUTCMonth(), TODAY.getUTCDate() + offset));
  return d.toISOString().slice(0, 10);
};
const iso = (offset) => `${day(offset)}T06:00:00.000Z`;

function idOf(res, ...keys) {
  if (!res || typeof res !== "object") return "";
  for (const k of keys) if (res[k]?.id) return String(res[k].id);
  if (res.id) return String(res.id);
  for (const v of Object.values(res)) if (v && typeof v === "object" && !Array.isArray(v) && v.id) return String(v.id);
  return "";
}
function must(res, what) {
  if (!res || res.error) throw new Error(`${what}: ${res?.error || "no answer"}${res?.detail ? ` (${JSON.stringify(res.detail)})` : ""}`);
  return res;
}
const warn = (what, res) => console.warn(`  ! ${what}: ${res?.error || JSON.stringify(res)}`);

// ---------------------------------------------------------------------------

export async function seedDemo() {
  const users = await import("@/platform/auth/users");
  const { hashPassword } = await import("@/platform/auth/passwords");
  const { createStudioForUser } = await import("@/lib/studios");
  const { getStudioBySlug } = await import("@/modules/main/studios");
  const { addCollaborator, listCollaborators } = await import("@/platform/auth/collaborators");
  const { ADMIN_ROLE_ID } = await import("@/platform/access/catalogue");
  const sales = await import("@/modules/sales/sales");
  const technical = await import("@/modules/technical/technical");
  const approvals = await import("@/modules/approvals/approvals");
  const projects = await import("@/modules/projects/projects");
  const costs = await import("@/modules/projects/costs");
  const milestones = await import("@/modules/projects/milestones");
  const planner = await import("@/modules/operations/planner");
  const inventory = await import("@/modules/inventory/inventory");
  const procurement = await import("@/modules/procurement/requisitions");
  const finance = await import("@/modules/finance/finance");
  const payables = await import("@/modules/finance/payables");

  // TWO HALVES. The first builds what only needs building once — the people,
  // the studio, the catalogue, the stock, the clients and the deals — and runs
  // when the studio does not exist. The second reads what is there and does
  // only what is missing: approvals, client POs, projects and their plans,
  // requisitions, invoices. So a run that stopped half-way is finished by
  // running it again, and a finished demo is left exactly as it is.
  const existing = await getStudioBySlug(DEMO.slug);
  const person = {};

  if (!existing) {
    const passwordHash = await hashPassword(DEMO.password);
    for (const p of PEOPLE) {
      const user = (await users.createUser({ email: p.email, passwordHash, fullName: p.fullName })).user || await users.getUserByEmail(p.email);
      if (!user) throw new Error(`user ${p.email} could not be created`);
      await users.updateProfile(user.id, { fullName: p.fullName, shortName: p.shortName });
      await users.updateVerification(user.id, { emailVerifiedAt: new Date().toISOString() });
      await users.updateQuestionnaire(user.id, { completedAt: new Date().toISOString() });
      person[p.key] = { ...p, user };
    }
    // Through the account screen's own door, so country, city and currency
    // are set the way a real owner's are.
    const created = must(await createStudioForUser(person.lina.user, {
      name: DEMO.name, slug: DEMO.slug, fieldOfWork: DEMO.field,
      company: { country: DEMO.country, city: DEMO.city, erps: ["None — We do not use an ERP system"] },
    }), "studio");
    for (const p of PEOPLE.slice(1)) {
      const added = await addCollaborator(String(created.studio.id), {
        userId: person[p.key].user.id, alias: p.shortName, role: "member", roleIds: [ADMIN_ROLE_ID], jobTitle: p.jobTitle,
      });
      if (added?.error) warn(`member ${p.key}`, added);
    }
  } else {
    for (const p of PEOPLE) person[p.key] = { ...p, user: await users.getUserByEmail(p.email) };
  }

  const studio = await getStudioBySlug(DEMO.slug);
  const studioId = String(studio.id);
  for (const c of await listCollaborators(studioId)) {
    const p = Object.values(person).find((x) => x.user?.id === c.userId);
    if (p) p.collab = c;
  }
  const ctx = async (fn, who) => must(await fn(person[who].user, DEMO.slug), `${who} context`);
  const cid = (who) => String(person[who].collab?.id || "");
  const list = (x) => (Array.isArray(x) ? x : (x && Object.values(x).find(Array.isArray)) || []);

  const apLina = await ctx(approvals.approvalsContext, "lina");
  async function approvalRows() {
    const listed = await approvals.listApprovals(apLina);
    // Grouped as { waiting, requested, all }; `all` holds every one.
    const seen = new Map();
    for (const a of [...list(listed?.all), ...list(listed?.waiting), ...list(listed?.requested)]) seen.set(a.id, a);
    return [...seen.values()];
  }
  // THE GENERAL MANAGER SIGNS FIRST; A SECOND PERSON SIGNS A SECOND STEP. A
  // requisition over the limit needs two signatures, and the product refuses
  // one person signing both steps of one record — so the project manager signs
  // the second, the way a real company would route it. Never the requester.
  async function approveFor(recordId) {
    let signed = false;
    for (const who of ["lina", "yousef"]) {
      const open = (await approvalRows()).find((a) => a.status === "Pending" && a.source?.recordId === recordId);
      if (!open) break;
      const ap = who === "lina" ? apLina : await ctx(approvals.approvalsContext, who);
      const r = await approvals.decideApproval(ap, open.id, { verdict: "Approved" });
      if (r?.error) { if (who !== "lina") warn(`approve ${recordId}`, r); continue; }
      signed = true;
    }
    return signed;
  }

  const salesOmar = await ctx(sales.salesContext, "omar");
  const techRana = await ctx(technical.technicalContext, "rana");
  const invHala = await ctx(inventory.inventoryContext, "hala");
  const invSami = await ctx(inventory.inventoryContext, "sami");

  // ====================================================================== first half
  if (!existing) {
    for (const type of ["quotation", "client-po"]) {
      const r = await approvals.saveApprovalSetting(apLina, { type, setting: { steps: [{ label: "Management", approverIds: [cid("lina")], requireAll: false }] } });
      if (r?.error) warn(`approval setting ${type}`, r);
    }

    const vendorIds = {};
    for (const v of VENDORS) {
      const { key, ...body } = v;
      vendorIds[key] = idOf(must(await inventory.createVendor(invHala, body), `vendor ${v.name}`), "vendor");
    }
    const itemIds = {};
    for (const it of ITEMS) {
      const { key, vendor: vk, ...body } = it;
      itemIds[key] = idOf(must(await inventory.createItem(invHala, { ...body, vendorId: vendorIds[vk] }), `item ${it.name}`), "item");
    }
    console.log(`  studio ${DEMO.slug}, ${PEOPLE.length} people, ${VENDORS.length} suppliers, ${ITEMS.length} registered items`);

    // Stock, as it really arrives: ordered, then received.
    for (const [n, po] of RECEIPTS.entries()) {
      const order = await inventory.createOrder(invHala, {
        vendorId: vendorIds[po.vendor], expectedAt: day(po.expected),
        lines: po.lines.map(([k, qty]) => ({ itemId: itemIds[k], qty, unitPrice: ITEM[k].unitCost })),
      });
      if (order?.error) { warn(`order ${po.vendor}`, order); continue; }
      const oid = idOf(order, "order");
      const placed = await inventory.editOrder(invHala, oid, { status: "Ordered" });
      if (placed?.error) warn(`place order ${oid}`, placed);
      if (po.receive > 0) {
        const got = await inventory.receiveOrder(invSami, oid, {
          receivedAt: day(po.expected + 1), supplierRef: `DN-${4100 + n}`,
          lines: po.lines.map(([k, qty]) => ({ itemId: itemIds[k], qty: Math.round(qty * po.receive) })),
        });
        if (got?.error) warn(`receive ${oid}`, got);
      }
    }
    console.log(`  ${RECEIPTS.length} purchase orders`);

    const clientIds = {};
    for (const c of CLIENTS) {
      const domain = c.name.toLowerCase().replace(/[^a-z]+/g, "").slice(0, 18);
      const r = await sales.createClient(salesOmar, {
        name: c.name, industry: c.industry, website: `https://${domain}.example`,
        contacts: [{ name: c.contact[0], position: c.contact[1], email: `${c.contact[0].toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "")}@${domain}.example`, phone: `+962 79 ${String(5000000 + c.name.length * 7919).slice(0, 7)}` }],
        locations: [{ name: "Head office", country: "Jordan", city: DEMO.city }],
      });
      if (r?.error) warn(`client ${c.name}`, r);
      clientIds[c.name] = idOf(r, "client");
    }

    let priced = 0;
    for (const [i, d] of DEALS.entries()) {
      const c = CLIENTS.find((x) => x.name === d.client);
      const t = await sales.createTicket(salesOmar, {
        title: d.title, clientId: clientIds[d.client], clientName: d.client, industry: d.industry,
        deadline: day(14 + i * 3), serviceIds: [d.service],
        contactName: c.contact[0], contactPosition: c.contact[1],
        location: { name: "Site", country: "Jordan", city: DEMO.city },
        description: `${d.title} for ${d.client}.`,
        probability: { Lead: 10, Opportunity: 35, Commit: 70, "Closed Won": 100 }[d.stage] ?? 20,
      });
      if (t?.error) { warn(`deal ${d.title}`, t); continue; }
      const ticketId = idOf(t, "ticket");
      if (d.lines) {
        // PRICED: an RFQ, the estimator's quotation from registered items, finished.
        const rfq = await sales.requestTicketRfq(salesOmar, { ticketId });
        if (rfq?.error) { warn(`rfq ${d.title}`, rfq); continue; }
        const conv = await technical.convertRfq(techRana, { rfqId: idOf(rfq, "rfq"), handledByCollaboratorId: cid("rana") });
        if (conv?.error) { warn(`quotation ${d.title}`, conv); continue; }
        const rows = d.lines.map(([k, qty]) => ({ itemId: itemIds[k], description: ITEM[k].name, unit: ITEM[k].unit, qty, unitPrice: ITEM[k].sellPrice, discount: 0 }));
        const done = await technical.updateQuotation(techRana, idOf(conv, "quotation"), { tables: [{ title: "Supply and installation", rows }], status: "Completed" });
        if (done?.error) { warn(`price ${d.title}`, done); continue; }
        priced += 1;
      } else if (d.stage === "Opportunity") {
        const rfq = await sales.requestTicketRfq(salesOmar, { ticketId });
        if (rfq?.error) warn(`rfq ${d.title}`, rfq);
      }
      if (d.stage === "Closed Won") {
        const sent = await sales.sendTicketForApproval(salesOmar, { ticketId });
        if (sent?.error) warn(`send ${d.title}`, sent);
      }
      if (d.stage !== "Lead" && d.stage !== "Opportunity") {
        const moved = await sales.editTicket(salesOmar, ticketId, { status: d.stage, ...(d.lostReason ? { lostReason: d.lostReason } : {}) });
        if (moved?.error) warn(`move ${d.title} → ${d.stage}`, moved);
      }
    }
    console.log(`  ${CLIENTS.length} clients, ${DEALS.length} deals, ${priced} priced`);
  }

  // ===================================================================== second half
  const itemByName = new Map(list(await inventory.listItems(invHala)).map((x) => [x.name, x]));
  const itemId = (k) => String(itemByName.get(ITEM[k].name)?.id || "");
  const vendorByName = new Map(list(await inventory.listVendors(invHala)).map((x) => [x.name, x]));
  const vendorOf = (k) => String(vendorByName.get(VENDORS.find((v) => v.key === ITEM[k].vendor)?.name)?.id || "");

  // WON DEALS: the general manager approves the quotation, then the client's PO.
  const tickets = list(await sales.listTickets(salesOmar));
  const ticketByTitle = new Map(tickets.map((t) => [t.title, t]));
  const quotationFor = async (title) =>
    (await approvalRows()).find((a) => a.type === "quotation" && String(a.source?.title || "").endsWith(`· ${title}`))?.source?.recordId || "";
  for (const d of DEALS.filter((x) => x.stage === "Closed Won")) {
    const t = ticketByTitle.get(d.title);
    if (!t) continue;
    const q = await quotationFor(d.title);
    if (!q) continue;
    await approveFor(q);
    // THE CLIENT'S PO IS FILED AGAINST THE QUOTATION, not the ticket — so once
    // the quotation's own approval is decided, the pending one on it is the PO.
    const hasPo = (await approvalRows()).some((a) => a.type === "client-po" && a.source?.recordId === q);
    if (!hasPo) {
      const po = await sales.submitTicketPo(salesOmar, { ticketId: t.id, description: `Client PO ${7300 + DEALS.indexOf(d)}` });
      if (po?.error) warn(`client PO ${d.title}`, po);
    }
    await approveFor(q);
  }

  // PROJECTS: opened from the approved quotation, or directly; each new one is
  // given cost codes, billing milestones and a plan.
  const projYousef = await ctx(projects.projectsContext, "yousef");
  const openTitles = new Set(list(await projects.listProjects(projYousef)).map((p) => p.title));
  const fresh = [];
  for (const d of DEALS.filter((x) => x.project)) {
    const title = `${d.client} — ${d.title}`;
    if (openTitles.has(title)) continue;
    const q = await quotationFor(d.title);
    const r = await projects.openProject(projYousef, {
      quotationId: q, title, managerCollaboratorId: cid("yousef"),
      startDate: day(d.project.start), endDate: day(d.project.end),
    });
    if (r?.error) { warn(`project ${d.title}`, r); continue; }
    fresh.push({ key: d.project.key, id: idOf(r, "project"), title, spec: d.project });
  }
  for (const p of DIRECT_PROJECTS) {
    if (openTitles.has(p.title)) continue;
    const r = await projects.openProject(projYousef, {
      title: p.title, clientName: p.client, value: p.value, industry: "Commercial",
      managerCollaboratorId: cid("yousef"), startDate: day(p.start), endDate: day(p.end),
    });
    if (r?.error) { warn(`project ${p.title}`, r); continue; }
    fresh.push({ key: p.key, id: idOf(r, "project"), title: p.title, spec: p });
  }
  // WHAT EACH PROJECT IS WORTH, read back rather than assumed: a project
  // opened from a quotation is worth that quotation's total, and the budgets,
  // milestones and invoices below are all SHARES of it — fixed figures put a
  // 123,000 invoice on an 84,000 job the first time this ran.
  const valueOf = new Map(list(await projects.listProjects(projYousef)).map((x) => [x.id, Number(x.value) || 0]));
  const shares = (rows, total, round = 1) => {
    const sum = rows.reduce((t, r) => t + r, 0) || 1;
    return rows.map((r) => Math.round((total * r) / sum / round) * round);
  };
  for (const p of fresh) {
    p.value = valueOf.get(p.id) || Number(p.spec.value) || 0;
    if (p.spec.stage && p.spec.stage !== "Received") {
      const u = await projects.updateProject(projYousef, p.id, { stage: p.spec.stage });
      if (u?.error) warn(`stage ${p.key}`, u);
    }
    // Budgeted at 82% of the value: the rest is the margin a contractor keeps.
    const codes = COSTS[p.key] || COSTS.default;
    const budgets = shares(codes.map((c) => c[2]), p.value * 0.82, 100);
    for (const [i, [code, name]] of codes.entries()) {
      const c = await costs.addProjectCost(projYousef, { projectId: p.id, code, name, budget: budgets[i] });
      if (c?.error) warn(`cost ${p.key} ${code}`, c);
    }
    const stones = MILESTONES[p.key] || [];
    const amounts = shares(stones.map((m) => m[2]), p.value);
    for (const [i, [code, name, , due, ready]] of stones.entries()) {
      const m = await milestones.addProjectMilestone(projYousef, { projectId: p.id, code, name, amount: amounts[i], dueDate: day(due) });
      if (m?.error) warn(`milestone ${p.key} ${code}`, m);
      else if (ready) await milestones.editProjectMilestone(projYousef, idOf(m, "milestone"), { status: "Ready" });
    }
    const row = { id: p.id, title: p.title, stage: p.spec.stage || "Received", startDate: day(p.spec.start), notes: "", managerCollaboratorId: cid("yousef") };
    const planned = await planner.createPlanFromProject(studioId, row, cid("yousef"));
    if (!planned?.planId) { warn(`plan ${p.key}`, planned); continue; }
    await planner.savePlan(studioId, planned.planId, {
      meta: { name: p.title, status: p.key === "school" ? "at_risk" : "on_track", owner: cid("yousef"), startDate: iso(p.spec.start), description: "" },
      tasks: planFor(p.key, p.spec.start, { pm: cid("yousef"), site: cid("tariq"), buy: cid("hala"), est: cid("rana") }),
      zoom: "month", colorBy: "status", showCriticalPath: true, showDependencies: true,
    }, cid("yousef"));
  }
  if (fresh.length) console.log(`  ${fresh.length} projects opened, with cost codes, milestones and plans`);
  const projectByKey = new Map();
  for (const p of list(await projects.listProjects(projYousef))) {
    const key = DEALS.find((d) => d.project && p.title === `${d.client} — ${d.title}`)?.project.key || DIRECT_PROJECTS.find((x) => x.title === p.title)?.key;
    if (key) projectByKey.set(key, p);
  }

  // REQUISITIONS: raised by procurement, signed by the general manager.
  const procHala = await ctx(procurement.procurementContext, "hala");
  const reqByTitle = new Map(list(await procurement.listRequisitions(procHala)).map((r) => [r.title, r]));
  for (const rq of REQS) {
    let r = reqByTitle.get(rq.title);
    if (!r) {
      const made = await procurement.createRequisition(procHala, {
        title: rq.title, justification: "Per programme and the approved quantities.",
        projectId: projectByKey.get(rq.project)?.id || "", neededBy: day(10), vendorId: vendorOf(rq.lines[0][0]),
        lines: rq.lines.map(([k, qty]) => ({ itemId: itemId(k), description: ITEM[k].name, unit: ITEM[k].unit, qty, estUnitCost: ITEM[k].unitCost })),
      });
      if (made?.error) { warn(`requisition ${rq.title}`, made); continue; }
      r = made.requisition || made;
      if (rq.end !== "Draft") {
        const sub = await procurement.moveRequisition(procHala, idOf(made, "requisition"), "Submitted");
        if (sub?.error) { warn(`submit ${rq.title}`, sub); continue; }
      }
    }
    const id = String(r.id);
    if (rq.end === "Approved" || rq.end === "Ordered") await approveFor(id);
    if (rq.end === "Ordered") {
      const now = list(await procurement.listRequisitions(procHala)).find((x) => x.id === id);
      if (now && now.status === "Approved" && !now.orderId) {
        const o = await inventory.createOrder(invHala, { vendorId: vendorOf(rq.lines[0][0]), requisitionId: id });
        if (o?.error && o.error !== "requisition-ordered") warn(`order from ${rq.title}`, o);
        else if (!o?.error) await inventory.editOrder(invHala, idOf(o, "order"), { status: "Ordered" });
      }
    }
  }
  console.log(`  ${REQS.length} requisitions in place`);

  // MONEY IN: invoices for the projects opened by THIS run, so a second run
  // never bills a project twice.
  const finDana = await ctx(finance.financeContext, "dana");
  let invoiced = 0;
  for (const inv of INVOICES.filter((x) => fresh.some((p) => p.key === x.project))) {
    const p = fresh.find((x) => x.key === inv.project);
    const r = await finance.createInvoice(finDana, {
      projectId: p.id, issueDate: day(inv.issued), dueDate: day(inv.due),
      lines: [{ description: inv.label, qty: 1, unitPrice: Math.round((p.value || 0) * inv.share) }],
    });
    if (r?.error) { warn(`invoice ${inv.label}`, r); continue; }
    const id = idOf(r, "invoice");
    const sent = await finance.editInvoice(finDana, id, { status: "Sent" });
    if (sent?.error) { warn("issue invoice", sent); continue; }
    invoiced += 1;
    if (inv.paid > 0) {
      // FROM THE INVOICE'S OWN TOTAL, tax included — a figure worked out here
      // would overpay the moment the studio's VAT rate differs.
      const total = Number((sent.invoice || r.invoice || {}).total) || Math.round((p.value || 0) * inv.share);
      const paid = await finance.recordPayment(finDana, id, {
        amount: Math.round(total * inv.paid * 100) / 100, date: day(inv.issued + 20),
        method: "Bank transfer", reference: `TRX-${88000 + (Math.round(total) % 1000)}`,
      });
      if (paid?.error) warn("payment", paid);
    }
  }
  if (invoiced) console.log(`  ${invoiced} invoices`);

  // MONEY OUT, in step with the work. A cost breakdown with nothing spent is
  // a job that has not started; each code of a project under way has been
  // billed for roughly its share of the progress, raised by the accountant,
  // approved by the general manager, and mostly paid.
  const progressOf = new Map(list(await projects.listProjects(projYousef)).map((x) => [x.id, Number(x.progress) || 0]));
  let billed = 0;
  for (const p of fresh) {
    const done = progressOf.get(p.id) || (p.spec.stage === "Completed" ? 100 : 0);
    if (!done) continue;
    const codes = list(await costs.listProjectCosts(projYousef, p.id));
    for (const [i, c] of codes.entries()) {
      const spend = Math.round((Number(c.budget) || 0) * (done / 100) * (0.9 + (i % 4) * 0.07));
      if (spend < 500) continue;
      const v = VENDORS[i % VENDORS.length];
      const bill = await payables.createBill(finDana, {
        vendorName: v.name, vendorId: vendorByName.get(v.name)?.id || "", projectId: p.id, costCodeId: c.id,
        lines: [{ description: `${c.name} — works and materials to date`, qty: 1, unitPrice: spend }],
        billDate: day(-(8 + i * 6)), dueDate: day(22 - i * 6), terms: "net-30",
      });
      if (bill?.error) { warn(`bill ${p.key} ${c.code}`, bill); continue; }
      const id = idOf(bill, "bill");
      const asked = await payables.requestBillApproval(finDana, id);
      if (asked?.error) warn(`bill approval ${p.key} ${c.code}`, asked);
      await approveFor(id);
      if (i % 3 !== 2) {
        const total = Number((bill.bill || bill).total) || spend;
        const paid = await payables.recordBillPayment(finDana, id, { amount: total, date: day(-(2 + i * 4)), method: "Bank transfer" });
        if (paid?.error) warn(`pay bill ${p.key} ${c.code}`, paid);
      }
      billed += 1;
    }
  }
  if (billed) console.log(`  ${billed} supplier bills charged to cost codes`);

  // A DEAL WITH NO QUOTATION STILL HAS A NUMBER ON IT. A salesperson puts an
  // estimate on a lead; a board of 0.00 columns reads as a broken product.
  const salesNow = list(await sales.listTickets(salesOmar));
  for (const d of DEALS) {
    const t = salesNow.find((x) => x.title === d.title);
    if (t && ESTIMATE[d.title] && !(Number(t.value) > 0) && !["Closed Lost", "Dropped"].includes(t.status)) {
      const r = await sales.editTicket(salesOmar, t.id, { value: ESTIMATE[d.title] });
      if (r?.error) warn(`estimate ${d.title}`, r);
    }
  }

  // A QUOTATION AT COMMIT HAS BEEN SENT. The main dashboard counts Draft and
  // Sent as live, and a real company's committed deals are waiting on a sent
  // offer, not on one still sitting finished on the estimator's desk.
  const quotes = list(await technical.listQuotations(techRana));
  for (const d of DEALS.filter((x) => x.stage === "Commit")) {
    const t = salesNow.find((x) => x.title === d.title);
    const q = t && quotes.find((x) => x.ticketId === t.id && x.status === "Completed");
    if (q) {
      const r = await technical.updateQuotation(techRana, q.id, { status: "Sent" });
      if (r?.error) warn(`send quotation ${d.title}`, r);
    }
  }

  // A SHOWCASE COMPANY IS A PAYING ONE: Small, its first band, for a team of
  // eight. The screens then carry the paid package's name, not "Free" beside an
  // Upgrade button.
  const { listCatalog } = await import("@/lib/data/catalog");
  const { updateStudio } = await import("@/modules/main/studios");
  const small = list(await listCatalog("packages")).find((p) => p.name === "Small");
  const band = small && (small.categories || []).find((c) => c.label === "Std. Plus");
  if (small && studio.packageId !== small.id) {
    await updateStudio(studioId, { packageId: small.id, ...(band ? { categoryId: band.id } : {}) });
  }

  // THE WORK HAPPENED OVER MONTHS, NOT THIS AFTERNOON. No service accepts a
  // backdated creation stamp — rightly — so a seeded studio shows every deal
  // "0 days here" and every activity dated today. The sandbox demo is the one
  // place that is corrected, through the same sealed row door every write uses,
  // and only on rows still stamped within the last two days, so it runs once.
  const { updateRow } = await import("@/platform/db/sections");
  const DAY = 86400000;
  const now = Date.now();
  const fresh2 = (r) => Date.parse(r?.createdAt || 0) > now - 2 * DAY;
  const AGE = { Lead: [4, 26], Opportunity: [12, 45], Commit: [25, 70], "Closed Won": [70, 130], "Closed Lost": [35, 95], "On-Hold": [50, 80], Dropped: [40, 60] };
  const createdOf = new Map();
  let redated = 0;
  for (const [i, d] of DEALS.entries()) {
    const t = salesNow.find((x) => x.title === d.title);
    if (!t) continue;
    const [lo, hi] = AGE[d.stage] || [10, 30];
    const age = lo + ((i * 7919) % (hi - lo));
    const here = Math.max(1, Math.round(age * (0.12 + (i % 5) * 0.11)));
    const created = now - age * DAY;
    createdOf.set(t.id, created);
    if (!fresh2(t)) continue;
    await updateRow(studioId, String(salesOmar.ticketsSection.id), "salesTickets", t.id, (row) => {
      const hist = Array.isArray(row.stageHistory) ? row.stageHistory : [];
      const span = (age - here) * DAY;
      const stamped = hist.map((h, k) => ({ ...h, at: new Date(k === hist.length - 1 ? now - here * DAY : created + ((k + 1) * span) / hist.length).toISOString() }));
      return {
        ...row, createdAt: new Date(created).toISOString(), updatedAt: new Date(now - here * DAY).toISOString(), stageHistory: stamped,
        ...(row.closedAt ? { closedAt: stamped[stamped.length - 1]?.at || row.closedAt } : {}),
      };
    });
    redated += 1;
  }
  for (const q of quotes) {
    const born = createdOf.get(q.ticketId);
    if (!born || !fresh2(q)) continue;
    await updateRow(studioId, String(techRana.quotationsSection.id), "quotations", q.id, (row) => ({ ...row, createdAt: new Date(born + 3 * DAY).toISOString(), updatedAt: new Date(born + 6 * DAY).toISOString() }));
  }
  for (const p of list(await projects.listProjects(projYousef))) {
    // Also a row dated in the FUTURE: a project that starts next month was
    // still created before today, never on a day that has not happened.
    const future = Date.parse(p.createdAt || 0) > now;
    if ((!fresh2(p) && !future) || !p.startDate) continue;
    const at = new Date(Math.min(Date.parse(p.startDate) - 5 * DAY, now - 3 * DAY)).toISOString();
    await updateRow(studioId, String(projYousef.listSection.id), "projects", p.id, (row) => ({ ...row, createdAt: at, updatedAt: at }));
  }
  const approvalsSection = apLina.section;
  for (const a of await approvalRows()) {
    if (Date.parse(a.requestedAt || 0) <= now - 2 * DAY) continue;
    // A decided approval dates from its record; one still waiting is recent.
    const at = a.status === "Pending" ? now - (2 + (a.id.charCodeAt(a.id.length - 1) % 4)) * DAY : (createdOf.get(a.source?.recordId) || now - 60 * DAY) + 8 * DAY;
    await updateRow(studioId, String(approvalsSection.id), "approvals", a.id, (row) => ({ ...row, requestedAt: new Date(at).toISOString(), createdAt: new Date(at).toISOString() }));
  }
  if (redated) console.log(`  ${redated} deals, their quotations, projects and approvals spread over the past months`);

  // A PLAN OPENS ON THE WHOLE JOB. At week zoom the planner shows a fortnight
  // around today — mostly empty grid, the finished work scrolled off the left.
  // A manager reviewing a job looks at all of it, so every demo plan opens at
  // month zoom, which is also what a plan saved before this line is moved to.
  for (const summary of await planner.listStudioPlans(studioId)) {
    const planId = String(summary.id || summary.planId || "");
    const doc = planId && await planner.readPlan(studioId, planId);
    if (doc && doc.zoom !== "month") await planner.savePlan(studioId, planId, { ...doc, zoom: "month" }, cid("yousef"));
  }

  // THE BELL IS NOT FULL OF THE SEED'S OWN NOTICES.
  const { listForCollaborator, markRead } = await import("@/platform/notify/notifications");
  for (const p of Object.values(person)) {
    if (!p.collab?.id) continue;
    const mine = list(await listForCollaborator(studioId, String(p.collab.id)));
    const unread = mine.filter((n) => !n.read && !n.readAt).map((n) => String(n.id));
    if (unread.length) await markRead(studioId, String(p.collab.id), unread);
  }

  return { slug: DEMO.slug, studioId, existed: Boolean(existing) };
}

// What a salesperson estimated on a deal that has no quotation yet (JOD).
const ESTIMATE = {
  "Street lighting retrofit": 96000,
  "Show apartments fit-out": 138000,
  "Hotel facade restoration": 186500,
  "Warehouse C slab and cladding": 412000,
  "Rooftop solar for clinics": 58000,
  "Lobby redesign, Tower A": 74000,
  "School playground shading": 36000,
  "Cold room installation": 49500,
  "Villa compound site survey": 12500,
  "Dock crane foundations": 228000,
  "Wellness pavilion": 164000,
};

const ITEM = Object.fromEntries(ITEMS.map((it) => [it.key, it]));

// Stock arrives on these orders; `receive` is the share delivered so far.
const RECEIPTS = [
  { vendor: "cement", lines: [["cement", 1600]], receive: 1, expected: -40 },
  { vendor: "steel", lines: [["rebar12", 14000], ["rebar16", 9000], ["anchor", 60]], receive: 1, expected: -35 },
  { vendor: "blocks", lines: [["block20", 12000], ["block15", 6000]], receive: 1, expected: -28 },
  { vendor: "finish", lines: [["tile60", 900], ["walltile", 380], ["gypsum", 700], ["paint", 1600], ["helmet", 8], ["sealant", 14]], receive: 1, expected: -21 },
  { vendor: "elec", lines: [["cable4", 44], ["cable16", 900], ["tray", 380], ["db24", 9], ["led", 260]], receive: 0.6, expected: -12 },
  { vendor: "solar", lines: [["pv550", 1100], ["inv50", 8], ["pvframe", 30]], receive: 0.5, expected: -6 },
  { vendor: "pipes", lines: [["ppr", 1200], ["upvc", 500], ["wc", 10]], receive: 1, expected: -17 },
  { vendor: "finish", lines: [["window", 120], ["firedoor", 10], ["membrane", 55], ["insul", 400]], receive: 0, expected: 9 },
];

const REQS = [
  { title: "Additional porcelain tiles, floors 8–9", project: "tower", lines: [["tile60", 420]], end: "Approved" },
  { title: "Cable and trays for array B", project: "solar", lines: [["cable16", 1200], ["tray", 260]], end: "Ordered" },
  { title: "Fire doors, stair cores", project: "tower", lines: [["firedoor", 8]], end: "Submitted" },
  { title: "Inverters, second batch", project: "solar", lines: [["inv50", 6]], end: "Submitted" },
  { title: "Site safety equipment", project: null, lines: [["helmet", 4], ["sealant", 6]], end: "Draft" },
];

// Each invoice is a SHARE of its project's value, so none can exceed the job.
const INVOICES = [
  { project: "warehouse", label: "Interim payment certificate 5", share: 0.15, issued: -70, due: -40, paid: 1 },
  { project: "warehouse", label: "Final account — warehouse B", share: 0.2, issued: -24, due: 6, paid: 1 },
  { project: "tower", label: "Advance payment 15%", share: 0.15, issued: -70, due: -40, paid: 1 },
  { project: "tower", label: "Interim payment certificate 1", share: 0.18, issued: -18, due: 12, paid: 0 },
  { project: "school", label: "Advance payment 10%", share: 0.1, issued: -48, due: -18, paid: 0.5 },
  { project: "solar", label: "Advance payment 20%", share: 0.2, issued: -30, due: -2, paid: 0 },
];

// ---------------------------------------------------------------------------
// Cost codes and billing milestones per project.

const COSTS = {
  default: [["01", "Preliminaries", 42000], ["02", "Civil & structure", 180000], ["03", "MEP", 120000], ["04", "Finishes", 95000], ["05", "Subcontractors", 60000]],
  tower: [["01", "Preliminaries", 28000], ["02", "Drywall & ceilings", 96000], ["03", "Flooring", 74000], ["04", "Electrical", 61000], ["05", "Fire & life safety", 38000], ["06", "Painting", 22000]],
  school: [["01", "Preliminaries", 34000], ["02", "Substructure", 112000], ["03", "Superstructure", 168000], ["04", "Openings & glazing", 54000], ["05", "HVAC", 49000], ["06", "Finishes", 71000]],
  solar: [["01", "Preliminaries", 18000], ["02", "PV modules", 214000], ["03", "Inverters", 72000], ["04", "Mounting structure", 63000], ["05", "Cabling & trays", 58000], ["06", "Commissioning", 12000]],
};
const MILESTONES = {
  tower: [["M1", "Advance payment", 64800, -70, true], ["M2", "Floors 4–5 complete", 58250, -18, true], ["M3", "Floors 6–7 complete", 97000, 30, false], ["M4", "Floors 8–9 complete", 97000, 72, false], ["M5", "Handover", 31000, 96, false]],
  school: [["M1", "Advance payment", 51900, -48, true], ["M2", "Structure complete", 155700, 40, false], ["M3", "Envelope closed", 103800, 90, false], ["M4", "Handover", 207600, 128, false]],
  solar: [["M1", "Advance payment", 83600, -30, true], ["M2", "Structures installed", 125400, 25, false], ["M3", "Energisation", 167200, 60, false], ["M4", "Performance test", 41800, 72, false]],
  facade: [["M1", "Survey and method statement", 18650, 30, false], ["M2", "Stonework 50%", 74600, 110, false], ["M3", "Completion", 93250, 190, false]],
  warehouse: [["M1", "Advance payment", 111300, -250, true], ["M2", "Frame erected", 222600, -160, true], ["M3", "Cladding and roof", 148400, -80, true], ["M4", "Final account", 148400, -24, true]],
};

// ---------------------------------------------------------------------------
// A PLAN: phases, then tasks inside them, chained finish-to-start, with progress
// that is honest for where "today" falls. Every Task field is written, because
// savePlan stores the document whole and the planner's engine reads all of them.

const PHASES = {
  tower: [
    ["Mobilisation", [["Site handover & hoarding", 5], ["Temporary services", 4]]],
    ["Floors 4–5", [["Drywall partitions", 12], ["MEP first fix", 10], ["Ceilings & flooring", 14], ["Painting", 7]]],
    ["Floors 6–7", [["Drywall partitions", 12], ["MEP first fix", 10], ["Ceilings & flooring", 14], ["Painting", 7]]],
    ["Floors 8–9", [["Drywall partitions", 12], ["MEP first fix", 10], ["Ceilings & flooring", 14], ["Painting", 7]]],
    ["Close-out", [["Snagging", 8], ["Testing & commissioning", 6], ["Handover", 1, true]]],
  ],
  school: [
    ["Enabling works", [["Survey & setting out", 4], ["Excavation", 9]]],
    ["Substructure", [["Foundations", 14], ["Ground slab", 8]]],
    ["Superstructure", [["Columns & beams, level 1", 16], ["Slab, level 1", 10], ["Columns & beams, level 2", 16], ["Roof slab", 10]]],
    ["Envelope", [["Blockwork", 18], ["Windows & glazing", 12], ["Roof waterproofing", 6]]],
    ["Fit-out & handover", [["HVAC installation", 14], ["Finishes", 20], ["Handover", 1, true]]],
  ],
  solar: [
    ["Engineering", [["Layout & structural design", 8], ["Grid connection approval", 12]]],
    ["Procurement", [["Modules & inverters delivery", 18], ["Mounting structures delivery", 14]]],
    ["Installation", [["Foundations & anchors", 10], ["Carport structures", 16], ["Module installation", 14], ["Cabling & trays", 12]]],
    ["Commissioning", [["Inverter commissioning", 5], ["Energisation", 1, true], ["Performance test", 7]]],
  ],
  facade: [
    ["Survey", [["Condition survey", 10], ["Method statement", 8]]],
    ["Stonework", [["Scaffolding", 6], ["Stone cleaning", 30], ["Repointing", 40], ["Replacement stones", 35]]],
    ["Completion", [["Protective coating", 12], ["Handover", 1, true]]],
  ],
  warehouse: [
    ["Groundworks", [["Earthworks", 14], ["Foundations", 24]]],
    ["Frame", [["Steel erection", 36], ["Roof sheeting", 20]]],
    ["Envelope & services", [["Cladding", 28], ["MEP", 40], ["Floor slab", 18]]],
    ["Handover", [["Testing", 10], ["Handover", 1, true]]],
  ],
};

function planFor(key, startOffset, who) {
  const phases = PHASES[key] || PHASES.tower;
  const tasks = [];
  let cursor = startOffset;
  let prev = null;
  let n = 0;
  const people = [who.site, who.pm, who.buy, who.est];
  for (const [pi, [phaseName, steps]] of phases.entries()) {
    const phaseId = `${key}-p${pi + 1}`;
    const phaseStart = cursor;
    const children = [];
    for (const [name, duration, milestone] of steps) {
      n += 1;
      const id = `${key}-t${n}`;
      const start = cursor;
      const end = cursor + duration;
      const pct = end <= 0 ? 100 : start >= 0 ? 0 : Math.round((-start / duration) * 100);
      children.push({
        id, parentId: phaseId, name, notes: "",
        assigneeIds: [people[n % people.length]].filter(Boolean),
        start: iso(start), end: iso(milestone ? start : end), duration: milestone ? 0 : duration, durationUnit: "days",
        dependencies: prev ? [{ predecessorId: prev, type: "FS", lag: 0 }] : [],
        status: pct >= 100 ? "complete" : pct > 0 ? (key === "school" && n % 4 === 0 ? "at_risk" : "in_progress") : "not_started",
        percentComplete: pct, priority: milestone ? "high" : n % 5 === 0 ? "high" : "medium",
        scheduleMode: "auto", milestone: Boolean(milestone), collapsed: false, effortHours: duration * 8,
      });
      prev = id;
      // Overlap the next task a little, the way real sequences run.
      cursor = milestone ? cursor : cursor + Math.max(1, Math.round(duration * 0.8));
    }
    const phaseEnd = Math.max(...children.map((c) => Date.parse(c.end)));
    const phasePct = Math.round(children.reduce((s, c) => s + c.percentComplete, 0) / children.length);
    tasks.push({
      id: phaseId, parentId: null, name: phaseName, notes: "", assigneeIds: [who.pm].filter(Boolean),
      start: iso(phaseStart), end: new Date(phaseEnd).toISOString(), duration: Math.round((phaseEnd - Date.parse(iso(phaseStart))) / 86400000), durationUnit: "days",
      dependencies: [], status: phasePct >= 100 ? "complete" : phasePct > 0 ? "in_progress" : "not_started",
      percentComplete: phasePct, priority: "medium", scheduleMode: "auto", milestone: false, collapsed: false, effortHours: 0,
    }, ...children);
  }
  return tasks;
}
