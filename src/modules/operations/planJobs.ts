// PM PLANS RAISE JOBS — the daily run (tier 5).
//
// A preventive maintenance plan said what should happen and how often, and
// nothing turned that into a visit: "Nothing generates those yet", its own
// declaration admitted. Called once per studio by `cron/daily-notices`, this
// raises a job in the dispatch collection for every ACTIVE plan whose `nextDue`
// has arrived, then moves `nextDue` on by the plan's frequency.
//
// IDEMPOTENT BY THE OCCURRENCE, not by the run. A job names the plan and the
// occurrence date it answers (`planId` + `planOccurrence`), so a second run on
// the same day — or a crash between raising the job and moving the date — finds
// the job and raises nothing, and still moves the date on.
//
// ONE OCCURRENCE PER PLAN PER RUN. A plan three quarters behind is caught up one
// visit a day rather than three visits at once for the same equipment — the
// dispatcher sees the backlog arrive rather than a wall of identical jobs.
//
// THE DEAL: a plan's first job opens a field-service deal (Template D) and every
// later one joins the deal its earlier jobs are on, derived from those jobs
// rather than stored on the plan, so nothing is written back onto a record a
// person maintains.
//
// WITH THE STUDIO'S AUTHORITY, as an engine rule runs: nobody is signed in at
// 06:00, and a plan raising its own visit is the studio acting.

import { repo } from "@/platform/db/repo";
import { listSections } from "@/platform/db/sections";
import { engineSectionKey } from "@/platform/access";
import type { EngineRecord } from "@/platform/engine/schema";
import type { Job } from "./jobSchema";
import { insertJob } from "./jobs";
import { nextOccurrence } from "./planSchedule";

const Jobs = repo<Job>("jobs");
const Records = repo<EngineRecord>("engineRecords");

export async function raiseDuePlanJobs(studioId: string, todayISO: string): Promise<number> {
  const sections = await listSections(studioId);
  const schedule = sections.find((s) => s.key === "field-service-schedule");
  const planSection = sections.find((s) => s.key === engineSectionKey("planned"));
  // A studio with no dispatch or no PM register has nothing to raise — not an
  // error, and not something to plant from a cron.
  if (!schedule || !planSection) return 0;

  const studio = { id: studioId };
  const [plans, jobs] = await Promise.all([
    Records.find({ studio, section: planSection } as never, { where: { typeKey: "planned" } }),
    Jobs.find({ studio, section: schedule } as never),
  ]);

  let raised = 0;
  for (const plan of plans) {
    if (plan.status !== "Active") continue;
    const v = plan.values || {};
    const due = String(v.nextDue || "").slice(0, 10);
    if (!due || due > todayISO) continue;

    const mine = jobs.filter((j) => j.planId === plan.id);
    if (!mine.some((j) => j.planOccurrence === due)) {
      const job = await insertJob({ studio, section: schedule }, {
        title: String(v.title || plan.reference || "Planned maintenance"),
        kind: "scheduled-visit",
        dealId: mine[0]?.dealId || "",
        location: String(v.asset || ""),
        scheduledStart: due,
        notes: String(v.tasks || ""),
        contractId: String(v.contract || ""),
        installedUnitId: String(v.installed || ""),
        planId: plan.id,
        planOccurrence: due,
      }, { id: "system", type: "system" });
      jobs.push(job as Job);
      raised += 1;
    }

    // MOVED ON EVEN WHEN THE JOB ALREADY EXISTED — that is the crash-between
    // case, and leaving the date where it was would stall the plan for ever.
    // A frequency nobody can read leaves it alone: tomorrow's run then finds
    // the job and raises nothing, which is stuck but never duplicated.
    const next = nextOccurrence(due, v.frequency);
    if (next) {
      const at = new Date().toISOString();
      await Records.update({ studio, section: planSection } as never, plan.id, (row) => ({
        values: { ...((row as EngineRecord).values || {}), nextDue: next },
        updatedAt: at,
      }));
    }
  }
  return raised;
}
