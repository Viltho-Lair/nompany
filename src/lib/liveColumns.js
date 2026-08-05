// Column catalog for the live Technical view. Each entry defines a column
// key, label, and a `render(row, ctx)` that returns display text. Ctx carries
// helpers the render might need (e.g. user name lookup).

export const LIVE_COLUMNS = [
  { key: "number", label: "Number", render: (r) => r.number || "—" },
  { key: "clientName", label: "Client", render: (r) => r.clientName || "—" },
  { key: "title", label: "Title", render: (r) => r.title || "—" },
  { key: "urgency", label: "Urgency", render: (r) => r.urgency || "—" },
  { key: "description", label: "Description", render: (r) => r.description || "—" },
  { key: "handledBy", label: "Handled by", render: (r, ctx) => ctx.nameOf(r.handledBy) },
  { key: "createdBy", label: "Created by", render: (r, ctx) => ctx.nameOf(r.createdBy) },
  { key: "lead", label: "Lead", render: (r) => r.leadLabel || r.lead || "MTA" },
  { key: "status", label: "Status", render: (r) => r.status || "—" },
  { key: "createdAt", label: "Created", render: (r, ctx) => ctx.fmtDate(r.createdAt) },
  { key: "completedAt", label: "Completed", render: (r, ctx) => ctx.fmtDate(r.completedAt) },
  { key: "commentCount", label: "# Comments", render: (r) => String(Array.isArray(r.comments) ? r.comments.length : 0) },
  { key: "latestComment", label: "Latest comment", render: (r) => {
    const arr = Array.isArray(r.comments) ? r.comments : [];
    if (arr.length === 0) return "—";
    const latest = [...arr].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))[0];
    const t = latest.text || "";
    return t.length > 60 ? t.slice(0, 60) + "…" : t;
  } },
];

// Default columns for a first-time visitor. Users can persist their own
// selection in localStorage keyed by userId.
export const DEFAULT_LIVE_COLUMNS = ["number", "clientName", "title", "urgency", "handledBy", "status", "createdAt"];
export const LIVE_STORAGE_PREFIX = "mta-live-quo-cols:";

// ---------------------------------------------------------------------------
// Sales live view — same idea, but over sales tickets (/api/tickets). ctx adds
// `fmtMoney` for the value column.
export const SALES_LIVE_COLUMNS = [
  { key: "createdAt", label: "Created", render: (r, ctx) => ctx.fmtDate(r.createdAt) },
  { key: "ticketRef", label: "Ref", render: (r) => r.ticketRef || "—" },
  { key: "title", label: "Title", render: (r) => r.title || "—" },
  { key: "clientName", label: "Client", render: (r) => r.clientName || "—" },
  { key: "contactName", label: "Contact", render: (r) => r.contactName || "—" },
  { key: "owner", label: "Owner", render: (r, ctx) => ctx.nameOf(r.assignedTo || r.createdBy) },
  { key: "value", label: "Value", render: (r, ctx) => ctx.fmtMoney(r.value) },
  { key: "deadline", label: "Deadline", render: (r, ctx) => ctx.fmtDate(r.deadline) },
  { key: "status", label: "Status", render: (r) => r.status || "—" },
  { key: "urgency", label: "Urgency", render: (r) => r.urgency || "Normal" },
  { key: "probability", label: "Probability", render: (r) => `${Number(r.probability ?? 0)}%` },
  { key: "industry", label: "Industry", render: (r) => r.industry || "—" },
  { key: "updatedAt", label: "Updated", render: (r, ctx) => ctx.fmtDate(r.updatedAt || r.createdAt) },
  { key: "commentCount", label: "# Comments", render: (r) => String(Array.isArray(r.comments) ? r.comments.length : 0) },
  { key: "latestComment", label: "Latest comment", render: (r) => {
    const arr = Array.isArray(r.comments) ? r.comments : [];
    if (arr.length === 0) return "—";
    const latest = [...arr].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))[0];
    const t = latest.text || "";
    return t.length > 60 ? t.slice(0, 60) + "…" : t;
  } },
];

export const SALES_DEFAULT_LIVE_COLUMNS = ["createdAt", "title", "clientName", "owner", "value", "status", "urgency", "latestComment"];
export const SALES_LIVE_STORAGE_PREFIX = "mta-live-sales-cols:";
