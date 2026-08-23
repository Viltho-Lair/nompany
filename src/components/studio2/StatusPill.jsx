// ONE status pill for the whole studio. Every department used to keep its own
// little `const XXX_TONE = { … }` map beside the screen that rendered it —
// Finance had three, Sales/Tasks/Technical/Projects/Operations/HR/Quality one
// each — and every one of them repeated the SAME five colour strings. That is
// the duplication the house style forbids: a "Paid" pill in Finance and a
// "Received" pill in Inventory are the same emerald, and nothing guaranteed they
// stayed the same emerald. This file is the single source of that mapping.
//
// The mapping is DATA, not conditionals:
//   TONE_CLASS      tone name  → the exact Tailwind classes (colour only)
//   STATUS_TONES    kind+status → tone name
// A status word can mean different things in different departments — "Approved"
// is brand-accent on a bill (authorised) but emerald on a leave request or a
// quotation (done), and "Draft" is neutral on an invoice but amber on a
// quotation. `kind` disambiguates them, so both keep their original colour.
//
// This is a CONSOLIDATION, not a restyle: the classes below are copied verbatim
// from the per-screen maps they replace, so a studio user sees no change. If you
// need a NEW colour, it is a new semantic token conversation, not an edit here.
//
// Pure and hook-free, so it renders in a server or a client tree alike, and
// carries no library. Shape/size classes live in `base` (default matches the
// common `rounded-full px-2.5 py-1 text-xs font-600` pill); the tone supplies
// only colour, so a caller with a smaller chip passes its own `base`.

// tone name → colour classes. `info` and `progress` are intentionally identical
// today (both the brand accent): every screen coloured "new/sent/opportunity"
// and "in-progress/ordered/approved" the same, so collapsing them would lose no
// pixels but keeping the two names lets a future restyle split them without
// hunting call sites. `muted` and `superseded` are the two neutral variants that
// really differ — HR's cancelled leave is a dimmer slate, and a superseded
// quality revision is struck through.
export const TONE_CLASS = {
  neutral:    "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300",
  muted:      "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400",
  info:       "bg-brand-500/10 text-brand-700 dark:text-brand-300",
  progress:   "bg-brand-500/10 text-brand-700 dark:text-brand-300",
  success:    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  warning:    "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  danger:     "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  superseded: "bg-slate-100 text-slate-500 line-through dark:bg-white/5",
};

// kind → (status word → tone). One block per department ladder. The status keys
// are the exact strings the records carry (spaces, capitalisation and all), so a
// lookup never needs to normalise. Where a screen chose the tone from a boolean
// rather than a status string (assets, stock moves, waybills), the caller passes
// a synthesised token — `service`/`disposed`, `in`/`out`/`adjust`,
// `delivered`/`exception`/`intransit`/`notmoved` — kept here so the mapping is
// still data.
export const STATUS_TONES = {
  // StudioFinance — INV_TONE
  invoice:   { Draft: "neutral", Sent: "info", Paid: "success", Cancelled: "danger" },
  // StudioFinance — BILL_TONE. Approved is brand (authorised), Disputed amber (a
  // warning, not the rose of Cancelled).
  bill:      { Draft: "neutral", Received: "neutral", Approved: "progress", Paid: "success", Cancelled: "danger", Disputed: "warning" },
  // StudioFinance — ASSET_STATUS_TONE. Tone is by the `disposed` flag; label is
  // "In service" / "Fully depreciated" / "Disposed".
  asset:     { service: "success", disposed: "neutral" },
  // StudioSales — ticket stages (STATUS_TONE).
  sales:     { Lead: "neutral", Opportunity: "info", Commit: "warning", "Closed Won": "success", "Closed Lost": "danger", "Cancelled by Client": "danger", "On-Hold": "neutral", Dropped: "danger" },
  // StudioTasks — task board (STATUS_TONE).
  task:      { Open: "neutral", "In progress": "progress", Blocked: "danger", Done: "success" },
  // StudioInventory + InventoryDashboard — stock-move kind (MOVE_TONE).
  movement:  { in: "success", out: "danger", adjust: "warning" },
  // StudioInventory — purchase-order status (ORDER_TONE). Currently no render
  // site (kept for the day the order list shows a status pill again).
  order:     { Draft: "neutral", Ordered: "info", "Partly received": "warning", Received: "success", Cancelled: "danger" },
  // StudioInventory — delivery-note status (DN_TONE). Likewise not yet rendered.
  delivery:  { Draft: "neutral", Issued: "success", Cancelled: "danger" },
  // StudioProjects + StudioProjectProfile — project stage (STAGE_TONE).
  project:   { Received: "neutral", "In Progress": "progress", "On Hold": "warning", Completed: "success" },
  // StudioTechnical — RFQ status (RFQ_TONE). Currently no render site.
  rfq:       { New: "info", "In-review": "warning", Converted: "success", Rejected: "danger" },
  // StudioTechnical — quotation status (Q_TONE). Note Approved is emerald here,
  // unlike a bill's brand Approved — that is why `kind` exists.
  quotation: { New: "info", Draft: "warning", Completed: "success", Sent: "info", Approved: "success", Rejected: "danger" },
  // StudioOperations — permit state (PERMIT_TONE).
  permit:    { Valid: "success", Expiring: "warning", Expired: "danger", "Not yet valid": "neutral" },
  // StudioHr — leave request (LEAVE_TONE). Cancelled is the dimmer `muted` slate.
  leave:     { Pending: "warning", Approved: "success", Declined: "danger", Cancelled: "muted" },
  // QualityWorkflow — revision state (STATE_TONE). Approved is brand here (sent
  // for effect), effective is the emerald "live" state, superseded is struck out.
  quality:   { draft: "neutral", rejected: "danger", review: "warning", approval: "warning", approved: "progress", effective: "success", superseded: "superseded" },
  // StudioInventory — waybill (AWB) StatusBadge. Tone by delivered/exception
  // flags; the caller synthesises the token.
  awb:       { intransit: "info", delivered: "success", exception: "danger", notmoved: "muted" },
};

// Per-kind fallback for a status the map does not know, reproducing the `|| …`
// default each original screen used so an unrecognised value keeps its old look.
// Everything else — and any kind without an entry — falls back to neutral, the
// sensible unstyled-but-legible default the task asks for.
export const STATUS_TONE_FALLBACK = {
  bill: "neutral",       // was `|| BILL_TONE.Received`
  sales: "neutral",      // was `|| STATUS_TONE.Lead`
  movement: "warning",   // was `|| MOVE_TONE.adjust`
  project: "neutral",    // was `|| STAGE_TONE.Received`
  quotation: "warning",  // was `|| Q_TONE.Draft`
  quality: "neutral",    // was `|| STATE_TONE.draft`
};

// Resolve a (kind, status) to a tone name. Exported so a caller that needs the
// colour without the pill (a dot, a bar) reads the same mapping.
export function toneForStatus(kind, status) {
  const map = STATUS_TONES[kind];
  const tone = map && map[status];
  return tone || STATUS_TONE_FALLBACK[kind] || "neutral";
}

// The common pill shape. Colour comes from the tone; a caller with a different
// size (a smaller chip, a legend swatch) passes its own `base`.
export const PILL_BASE = "rounded-full px-2.5 py-1 text-xs font-600";

// The pill. `status` picks the colour; `label` overrides the visible text when
// the record shows a friendly label but keys its colour off a code (Quality's
// revision labels, the asset ladder, waybills). `title` is the hover tooltip a
// couple of sites carry.
export function StatusPill({ status, kind, label, title, base = PILL_BASE, className = "" }) {
  const tone = toneForStatus(kind, status);
  const cls = [base, TONE_CLASS[tone], className].filter(Boolean).join(" ");
  return (
    <span className={cls} title={title || undefined}>
      {label ?? status}
    </span>
  );
}

export default StatusPill;
