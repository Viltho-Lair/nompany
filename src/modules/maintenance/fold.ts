// FOLDING THE THREE OLD REGISTERS INTO MAINTENANCE — once per studio, run by
// scripts/migrate/fold-maintenance-registers.mjs (dry-run by default).
//
// On the owner's word (11/09/2026) that an SLA is a preventive maintenance
// contract, maintenance lives in one place. What each old register becomes is
// ./legacy, pure; this file reads, writes and reports.
//
// COPIES, NEVER MOVES OR DELETES. The engine records stay exactly where they
// are. What changes on them is one thing: a Field Service plan still Active or
// Paused is set Retired, so `planJobs` stops raising dispatch jobs from it the
// same morning its copy starts raising work orders. The three registers are then
// SWITCHED OFF (`enabled: false`), which hides them from the sidebar and is
// undone from Studio settings → Sections. Nothing here is a deletion, so
// invariant 17's second confirmation is not what gates it — the script's own
// dry run and `--apply` are.
//
// IDEMPOTENT: every row written carries `legacyRecordId`, and a record already
// folded is skipped, so a second run — or a run after a crash halfway — writes
// only what is missing.

import { repo } from "@/platform/db/repo";
import { listSections, sectionsAsStored, updateSection, type Section } from "@/platform/db/sections";
import { engineSectionKey } from "@/platform/access";
import { getStudioById } from "@/modules/main/studios";
import { nextReference } from "@/modules/main/references";
import { seriesSetting } from "@/modules/administration/numbering";
import type { EngineRecord } from "@/platform/engine/schema";
import { writeOrder } from "./maintenance";
import { contractFromLegacy, planFromLegacy, orderFromLegacy } from "./legacy";
import type { PmPlan, Sla, WorkOrder } from "./schema";

const Records = repo<EngineRecord>("engineRecords");
const Contracts = repo<Sla>("slas");
const Plans = repo<PmPlan>("pmPlans");
const Orders = repo<WorkOrder>("workOrders");

export type FoldReport = {
  contracts: string[];
  plans: string[];
  orders: string[];
  retiredPlans: number;
  registersOff: string[];
  /** Why a studio was not folded, when it was not. */
  skipped: string;
};

const text = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);
const valuesOf = (r: EngineRecord) => (r.values || {}) as Record<string, unknown>;
const createdOf = (r: EngineRecord) => text((r as { createdAt?: unknown }).createdAt, 40) || new Date().toISOString();
const metaOf = (r: EngineRecord) => ({ status: text(r.status, 40), reference: text(r.reference, 60), createdAt: createdOf(r) });
const labelOf = (r: EngineRecord, title: string) => `${text(r.reference, 60) || r.id} → ${title}`;

/**
 * FOLD ONE STUDIO. With `apply` false it READS ONLY — not even the section
 * catch-up `listSections` performs, which is why the dry run reads through
 * `sectionsAsStored` — and returns what it would write.
 */
export async function foldStudio(studioId: string, { apply, today }: { apply: boolean; today: string }): Promise<FoldReport> {
  const report: FoldReport = { contracts: [], plans: [], orders: [], retiredPlans: 0, registersOff: [], skipped: "" };
  const sections: Section[] = apply ? await listSections(studioId) : await sectionsAsStored(studioId);
  const byKey = (k: string) => sections.find((s) => s.key === k) || null;
  const legacy = {
    contract: byKey(engineSectionKey("contract")),
    planned: byKey(engineSectionKey("planned")),
    maintenance: byKey(engineSectionKey("maintenance")),
  };
  if (!legacy.contract && !legacy.planned && !legacy.maintenance) {
    report.skipped = "none of the three old registers";
    return report;
  }
  const slaSection = byKey("projects-sla");
  const plansSection = byKey("maintenance-plans");
  const ordersSection = byKey("maintenance-orders");
  // A DRY RUN ON A STUDIO NOBODY HAS OPENED since Maintenance shipped has no
  // Maintenance sections yet; `--apply` plants them first (listSections).
  if (!slaSection || !plansSection || !ordersSection) {
    report.skipped = apply ? "the Maintenance sections could not be planted" : "Maintenance not planted yet — --apply plants it first";
    if (apply) return report;
  }

  const at = { id: studioId };
  const read = (section: Section | null, typeKey: string) =>
    (section ? Records.find({ studio: at, section }, { where: { typeKey } }) : Promise.resolve([] as EngineRecord[]));
  const [oldContracts, oldPlans, oldRecords, slas, plans, orders] = await Promise.all([
    read(legacy.contract, "contract"),
    read(legacy.planned, "planned"),
    read(legacy.maintenance, "maintenance"),
    slaSection ? Contracts.find({ studio: at, section: slaSection }) : Promise.resolve([] as Sla[]),
    plansSection ? Plans.find({ studio: at, section: plansSection }) : Promise.resolve([] as PmPlan[]),
    ordersSection ? Orders.find({ studio: at, section: ordersSection }) : Promise.resolve([] as WorkOrder[]),
  ]);
  const folded = new Set([...slas, ...plans, ...orders].map((r) => r.legacyRecordId).filter(Boolean));
  const studio = apply ? await getStudioById(studioId) : null;
  const numbering = (studio as { numbering?: unknown } | null)?.numbering;
  const now = new Date().toISOString();

  // WHAT EACH CONTRACT COVERED, from the plans that named it — the only place
  // the old register recorded a unit against a contract.
  const unitsOf = new Map<string, string[]>();
  for (const p of oldPlans) {
    const v = valuesOf(p);
    const contract = text(v.contract, 60);
    const unit = text(v.installed, 60);
    if (contract && unit) unitsOf.set(contract, [...(unitsOf.get(contract) || []), unit]);
  }

  // 1. CONTRACTS. The map ends up holding old id → new id, including contracts
  // folded on an earlier run, so a plan folded now still finds its contract.
  const slaIdOf = new Map<string, string>(slas.filter((s) => s.legacyRecordId).map((s) => [String(s.legacyRecordId), s.id]));
  for (const r of oldContracts) {
    if (folded.has(r.id)) continue;
    const fields = contractFromLegacy(valuesOf(r), metaOf(r), unitsOf.get(r.id) || []);
    report.contracts.push(labelOf(r, fields.title));
    if (!apply || !slaSection) continue;
    const row = await Contracts.create({ studio: at, section: slaSection }, {
      projectId: "", locationId: "", assignedToCollaboratorIds: [], checklist: [],
      ...fields,
      completedVisits: [], emergencyVisitsList: [],
      cancelledAt: fields.status === "Cancelled" ? now : "",
      legacyRecordId: r.id,
      createdByCollaboratorId: "system",
      createdAt: createdOf(r),
      updatedAt: now,
    });
    slaIdOf.set(r.id, row.id);
  }

  // 2. PLANS, and the retirement of the old one so it stops raising jobs.
  for (const r of oldPlans) {
    if (!folded.has(r.id)) {
      const v = valuesOf(r);
      const fields = planFromLegacy(v, metaOf(r), slaIdOf.get(text(v.contract, 60)) || "", today);
      report.plans.push(labelOf(r, fields.title));
      if (apply && plansSection) {
        const rows = await Plans.find({ studio: at, section: plansSection });
        const reference = await nextReference(studioId, { rows, field: "reference", ...seriesSetting("pmPlan", numbering as never) });
        await Plans.create({ studio: at, section: plansSection }, {
          reference, ...fields, legacyRecordId: r.id, createdByCollaboratorId: "system", createdAt: createdOf(r), updatedAt: now,
        });
      }
    }
    // RETIRED ONLY ONCE ITS COPY EXISTS — a crash between the two leaves the old
    // plan raising jobs, which is the state it was already in, never a gap.
    if (r.status === "Active" || r.status === "Paused") {
      report.retiredPlans += 1;
      if (apply && legacy.planned) {
        await Records.update({ studio: at, section: legacy.planned }, r.id, () => ({ status: "Retired", updatedAt: now }));
      }
    }
  }

  // 3. THE ASSETS REGISTER'S RECORDS, as work orders through the one writer.
  for (const r of oldRecords) {
    if (folded.has(r.id)) continue;
    const { fields, status, stamps } = orderFromLegacy(valuesOf(r), metaOf(r));
    report.orders.push(labelOf(r, `${fields.title} (${status})`));
    if (!apply || !ordersSection) continue;
    const scope = { studio: { id: studioId, numbering }, section: ordersSection };
    const order = await writeOrder(scope, { ...fields, legacyRecordId: r.id }, "system");
    if (status !== "Open") {
      await Orders.update({ studio: at, section: ordersSection }, order.id, (row) => ({
        status, ...stamps,
        history: [...(row.history || []), { status, at: stamps.completedAt || stamps.startedAt || stamps.cancelledAt || now, byCollaboratorId: "system" }],
        updatedAt: now,
      }));
    }
  }

  // 4. THE REGISTERS GO QUIET — switched off, not deleted.
  for (const [key, section] of Object.entries(legacy)) {
    if (!section || section.enabled === false) continue;
    report.registersOff.push(key);
    if (apply) await updateSection(studioId, section.id, { enabled: false });
  }
  return report;
}
