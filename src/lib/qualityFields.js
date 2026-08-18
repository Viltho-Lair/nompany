// THE FIELD REGISTRY — what a document can point at, declared once.
//
// A field is a REFERENCE, resolved when the document is rendered. Nothing is
// ever copied in: a company's VAT number typed into forty procedures is forty
// places to change and thirty-nine that will be missed, and in a controlled
// document that is not a typo — it is a document that says something untrue and
// was approved saying it.
//
// A DOCUMENT IS FILED AGAINST A DEPARTMENT, so the fields it can reach are
// organised the way the studio is: Company and Document always, and a
// department's own fields once the document is bound to one of that
// department's records. What is reachable is the SUBJECT'S GRAPH, not the whole
// ERP — from a sales ticket you can reach its client and its contact, and you
// cannot reach an unrelated employee's salary.
//
// Client-safe. The picker and the validator need the same declarations the
// resolver works from, or the editor offers something the server then drops.

// ---- subjects ---------------------------------------------------------------
//
// What a document can be ABOUT. Binding one is optional — a procedure is about
// nothing in particular — but it is what makes a department's fields resolvable,
// and it is the mechanism templates will be built on.
export const SUBJECTS = [
  {
    id: "salesTicket",
    label: "Sales ticket",
    department: "sales",
    sectionKey: "sales-tickets",
    collection: "salesTickets",
    permission: "sales.tickets.view",
    // How one is named in a picker: "ACME-001 — New control room".
    naming: { primary: "ref", secondary: "title" },
  },
];

export const subjectById = (id) => SUBJECTS.find((s) => s.id === id) || null;

// ---- fields -----------------------------------------------------------------
//
// `path` is dotted into the resolved record. `via: "collaborator"` means the
// value is a CollaboratorID that has to become somebody's name — an id printed
// on a document is a document nobody can read.
const SALES_TICKET = [
  ["sales.ticket.ref", "Ticket reference", "ref"],
  ["sales.ticket.title", "Ticket title", "title"],
  ["sales.ticket.client", "Client", "clientName"],
  ["sales.ticket.contactName", "Contact name", "contactName"],
  ["sales.ticket.contactPosition", "Contact position", "contactPosition"],
  ["sales.ticket.contactEmail", "Contact email", "contactEmail"],
  ["sales.ticket.contactPhone", "Contact phone", "contactPhone"],
  ["sales.ticket.industry", "Industry", "industry"],
  ["sales.ticket.deadline", "Deadline", "deadline"],
  ["sales.ticket.status", "Status", "status"],
  ["sales.ticket.siteName", "Site name", "location.name"],
  ["sales.ticket.siteCity", "Site city", "location.city"],
  ["sales.ticket.siteCountry", "Site country", "location.country"],
].map(([key, label, path]) => ({
  key, label, path, kind: "scalar",
  group: "Sales", department: "sales", subject: "salesTicket",
}));

SALES_TICKET.push({
  key: "sales.ticket.owner", label: "Ticket owner", path: "assignedToCollaboratorId",
  via: "collaborator", kind: "scalar",
  group: "Sales", department: "sales", subject: "salesTicket",
});

// Available on every document, because they describe the studio and the
// document rather than any record it happens to be about.
const ALWAYS = [
  { key: "company.name", label: "Company name", group: "Company", subject: null, kind: "scalar" },
  { key: "company.address", label: "Address", group: "Company", subject: null, kind: "scalar" },
  { key: "company.country", label: "Country", group: "Company", subject: null, kind: "scalar" },
  { key: "company.city", label: "City", group: "Company", subject: null, kind: "scalar" },
  { key: "document.code", label: "Document code", group: "Document", subject: null, kind: "scalar" },
  { key: "document.title", label: "Title", group: "Document", subject: null, kind: "scalar" },
  { key: "document.revision", label: "Revision", group: "Document", subject: null, kind: "scalar" },
  { key: "document.type", label: "Type", group: "Document", subject: null, kind: "scalar" },
  { key: "document.department", label: "Department", group: "Document", subject: null, kind: "scalar" },
  { key: "document.owner", label: "Owner", group: "Document", subject: null, kind: "scalar" },
  { key: "document.effectiveDate", label: "Effective date", group: "Document", subject: null, kind: "scalar" },
  { key: "document.nextReviewDate", label: "Next review", group: "Document", subject: null, kind: "scalar" },
];

export const STATIC_FIELDS = [...ALWAYS, ...SALES_TICKET];
const STATIC_KEYS = new Set(STATIC_FIELDS.map((f) => f.key));

// ---- legal information ------------------------------------------------------
//
// The studio's own key/value rows — VAT number, CR number, whatever else it
// puts on its paperwork. Deferred when merge fields first landed because the
// keys are the STUDIO'S to name and so cannot be validated from a fixed list on
// the client. They are validated by SHAPE instead, which is the honest way to
// allow a set nobody can enumerate in advance.
export const LEGAL_PREFIX = "legal.";
const LEGAL_KEY = /^legal\.[a-z0-9][a-z0-9-]{0,48}$/;

// A studio's label ("VAT Number") becomes a stable key ("legal.vat-number"), so
// renaming the label does not orphan every document that pointed at it.
export const legalKeyFor = (label) =>
  LEGAL_PREFIX + String(label || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);

export const legalFieldsFrom = (legalInfo) =>
  (Array.isArray(legalInfo) ? legalInfo : [])
    .filter((row) => row?.key && legalKeyFor(row.key).length > LEGAL_PREFIX.length)
    .map((row) => ({
      key: legalKeyFor(row.key), label: String(row.key), group: "Legal information",
      subject: null, kind: "scalar", legal: true,
    }));

// ---- validation -------------------------------------------------------------
//
// Called by the content allowlist, so this is what decides whether a placeholder
// survives being saved. A key that is neither declared nor legal-shaped is
// dropped rather than stored and rendered as a gap later.
export function isFieldKey(key) {
  const k = String(key || "");
  return STATIC_KEYS.has(k) || LEGAL_KEY.test(k);
}

export const fieldByKey = (key) => STATIC_FIELDS.find((f) => f.key === key) || null;

// ---- what to offer, and to whom ---------------------------------------------
//
// Two filters, and they answer different questions.
//
// SUBJECT decides what is reachable at all: a document bound to nothing cannot
// resolve a ticket's client, so offering the field would be offering a blank.
//
// PERMISSION decides what THIS AUTHOR may point at. Somebody who cannot open
// Sales should not be able to build a document that prints a client's contact
// details — the check at render time would stop the value appearing, but by then
// the template is written and the author is wondering why their document is
// full of holes. Better to never offer it.
export function availableFields({ subjectType = null, legalInfo = [], holds = () => true }) {
  const subject = subjectById(subjectType);
  return [...STATIC_FIELDS, ...legalFieldsFrom(legalInfo)].filter((f) => {
    if (f.subject && f.subject !== subjectType) return false;
    if (f.subject && !subject) return false;
    if (f.subject && subject.permission && !holds(subject.permission)) return false;
    return true;
  });
}

// Grouped for the picker, departments in the studio's own order where known.
export function groupFields(fields) {
  const out = new Map();
  for (const f of fields) {
    if (!out.has(f.group)) out.set(f.group, []);
    out.get(f.group).push(f);
  }
  return [...out.entries()];
}
