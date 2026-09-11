// WHAT THE THREE OLD REGISTERS BECOME — the pure half of the fold.
//
//   Field Service → Maintenance contracts   (engine `contract`)    → service contract (SLA)
//   Field Service → Preventive maint. plans (engine `planned`)     → preventive plan
//   Assets        → Maintenance             (engine `maintenance`) → work order
//
// Pure, so the dry run and tests/maintenance-model.mjs read the same decisions
// the apply writes; ./fold does the reading and writing. Every choice below that
// could put work on somebody's list errs towards NOT raising it: a draft
// contract arrives cancelled, a plan with a frequency nothing reads arrives
// paused. Folding must never be the reason a technician is sent somewhere.

import { ORDER_TYPES } from "./model";
import { PLAN_FREQUENCIES, PLAN_STATUSES, cleanChecklist } from "./schedule";
import { LEGACY_COVER, MAX_VISITS, MAX_DURATION_DAYS, DEFAULT_DURATION_DAYS } from "./contracts";

type Values = Record<string, unknown>;
type Meta = { status: string; reference: string; createdAt: string };

const text = (v: unknown, max = 4000) => String(v ?? "").trim().slice(0, max);
const day = (v: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(text(v).slice(0, 10)) ? text(v).slice(0, 10) : "");
const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
const number = (v: unknown): number | null => {
  if (v === null || v === undefined || text(v) === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * A FIELD SERVICE CONTRACT. Its term is kept; "visits per year" becomes visits
 * over the term; its ANNUAL value becomes the value over the term, which is what
 * the register calls value. A DRAFT arrives Cancelled — it was never agreed, and
 * an active contract raises visits — so somebody reinstates it on purpose.
 * `units` are the installed units its plans service, the only place the old
 * register recorded what a contract covered.
 */
export function contractFromLegacy(v: Values, meta: Meta, units: readonly string[]) {
  const start = day(v.startsOn) || day(meta.createdAt);
  const end = day(v.endsOn);
  const length = end && end > start ? Math.min(MAX_DURATION_DAYS, daysBetween(start, end)) : DEFAULT_DURATION_DAYS;
  const perYear = number(v.visitsPerYear);
  const visits = Math.max(1, Math.min(MAX_VISITS, length, Math.round(((perYear && perYear > 0) ? perYear : 1) * length / 365)));
  const annual = number(v.value);
  return {
    title: text(v.title, 200) || meta.reference || "—",
    customer: text(v.customer, 200),
    cover: LEGACY_COVER[text(v.cover)] || "",
    value: annual === null ? null : Math.round(annual * (length / 365) * 100) / 100,
    signingDate: start,
    startDate: start,
    durationDays: length,
    visits,
    emergencyVisits: 0,
    leadDays: 0,
    installedIds: [...new Set(units.filter(Boolean))],
    // THE OLD REFERENCE, so a person can match the two — nothing more, because
    // a sentence written here would be English in an Arabic studio for ever.
    notes: meta.reference,
    status: meta.status === "Cancelled" || meta.status === "Draft" ? "Cancelled" : "",
  };
}

/**
 * A FIELD SERVICE PLAN. Same frequency list (Maintenance reads Field Service's),
 * same next date, its tasks as the checklist, its unit and — when the contract
 * it named was folded too — that contract. Its "asset or site" was free text and
 * stays readable as the description. A frequency nothing turns into a date
 * arrives PAUSED rather than guessed.
 */
export function planFromLegacy(v: Values, meta: Meta, slaId: string, today: string) {
  const frequency = text(v.frequency);
  const known = (PLAN_FREQUENCIES as readonly string[]).includes(frequency);
  const status = (PLAN_STATUSES as readonly string[]).includes(meta.status) ? meta.status : "Paused";
  return {
    title: text(v.title, 200) || meta.reference || "—",
    description: text(v.asset, 300),
    type: "preventive",
    priority: "normal",
    assetId: "",
    locationId: "",
    installedId: text(v.installed, 60),
    slaId,
    assignedToCollaboratorIds: [] as string[],
    estimatedHours: null,
    frequency: known ? frequency : "Monthly",
    scheduleMode: "fixed",
    nextDue: day(v.nextDue) || today,
    leadDays: 0,
    checklist: cleanChecklist(text(v.tasks).split(/\r?\n/)),
    trigger: "calendar",
    meterUnit: "",
    meterEvery: 0,
    nextDueReading: null,
    status: known ? status : status === "Retired" ? "Retired" : "Paused",
  };
}

const ORDER_STATUS_OF: Readonly<Record<string, string>> = Object.freeze({
  Due: "Open", "In progress": "In progress", Done: "Completed", Skipped: "Cancelled",
});

/**
 * AN ASSETS MAINTENANCE RECORD. Due is open work, Done is completed work with
 * its notes as what was done, Skipped is cancelled. Its recorded cost is kept on
 * the order as `legacyCost` — the order's own cost comes from the stock ledger,
 * which never saw these, and dropping the figure would make old work read as
 * free. `stamps` are what the status move would have written.
 */
export function orderFromLegacy(v: Values, meta: Meta) {
  const kind = text(v.kind).toLowerCase();
  const status = ORDER_STATUS_OF[meta.status] || "Open";
  const when = day(v.completedOn) ? `${day(v.completedOn)}T12:00:00.000Z` : meta.createdAt;
  const stamps: Record<string, string> = {};
  if (status === "In progress" || status === "Completed") stamps.startedAt = when;
  if (status === "Completed") {
    stamps.completedAt = when;
    stamps.resolution = text(v.notes) || "—";
  }
  if (status === "Cancelled") stamps.cancelledAt = meta.createdAt;
  return {
    status,
    stamps,
    fields: {
      title: text(v.title, 200) || meta.reference || "—",
      description: text(v.notes),
      type: (ORDER_TYPES as readonly string[]).includes(kind) ? kind : "preventive",
      priority: "normal",
      assetId: text(v.asset, 60),
      dueOn: day(v.dueOn),
      legacyCost: number(v.cost),
    },
  };
}
