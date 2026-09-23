import { cronJob } from "@/platform/http/cron";
import { readArr, touchTTL } from "@/platform/db/store";
import { BILLING, REG } from "@/platform/db/keys";
import { deleteMedia, listMediaForStudio } from "@/lib/media";
import { cascadeDeleteStudio } from "@/platform/db/cascade";
import { dueForDeletion, type DueStudio } from "@/shared/studioDeletion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE DAY A DELETED STUDIO IS ACTUALLY DELETED — thirty days after its owner
// asked, unless they cancelled (shared/studioDeletion). The owner's rule; until
// 24/09/2026 the screen counted down to the date and nothing acted on it.
//
// IT REPORTS UNLESS IT IS SWITCHED ON, AND THAT IS INVARIANT 17. This is the
// only scheduled job that permanently removes a tenant's data from the live,
// shared database, so it runs in REPORT mode — listing what is due and
// deleting nothing — until `STUDIO_DELETIONS=on` is set in the environment.
// Setting it is the second of the two confirmations the invariant asks for,
// given after the owner has read a report naming the exact studios.
//
// EXPLICIT IDS, NEVER A PREDICATE. Each deletion names one studio id read from
// the registry and goes through `cascadeDeleteStudio`, the one door that knows
// the order a studio comes apart in (invariant 11) — no prefix or pattern here.
//
// EACH STUDIO IS RE-READ IMMEDIATELY BEFORE IT IS DELETED. An owner who
// cancels in the minute between this job listing their studio and reaching it
// must keep it, so the decision is taken again against the registry as it is
// then, not as it was when the list was made.
//
// FIVE PER RUN. A backlog clears over several days rather than in one run that
// takes down every overdue studio at once; a run that hits the cap says so.
//
// THREE THINGS, IN THIS ORDER, and the order is what makes a crash safe:
//
//  1. its UPLOADED FILES, object and record, one by one (lib/media). They live
//     under g:media:, outside the studio's prefix, so the cascade never reached
//     them and a deleted studio's files outlived it;
//  2. its BILLING RECORD is given an expiry TEN YEARS out (the terms' retention
//     for invoices and tax records, the owner's choice 24/09/2026) — kept, not
//     deleted, and then removed by store-upkeep like any expired document;
//  3. the studio itself, through the cascade.
//
// All three happen while the studio is still in the registry, so a run that
// dies part-way leaves it due, and tomorrow's run repeats what is left: a file
// already gone is a no-op, and re-setting the expiry only moves it later.
const MAX_PER_RUN = 5;

/** Invoices and billing records outlive the studio by this long (terms §10). */
const BILLING_RETENTION_SEC = 10 * 365 * 24 * 60 * 60;

async function run() {
  const enabled = process.env.STUDIO_DELETIONS === "on";
  const now = Date.now();
  const due = dueForDeletion(await readArr(REG.studios), now);
  const batch = due.slice(0, MAX_PER_RUN);

  if (!enabled) {
    // THE REPORT NAMES THE WHOLE SCOPE — each studio and how many of its files
    // would go with it — because it is what the owner confirms against.
    const report: (DueStudio & { files: number })[] = [];
    for (const studio of batch) report.push({ ...studio, files: (await listMediaForStudio(studio.id)).length });
    return Response.json({ ok: true, mode: "report", due: report, dueTotal: due.length });
  }

  const deleted: string[] = [];
  const skipped: { id: string; reason: string }[] = [];
  let filesDeleted = 0;
  for (const studio of batch) {
    // THE SECOND LOOK: still requested, still the same request, still due.
    const current = dueForDeletion(await readArr(REG.studios), Date.now()).find((s) => s.id === studio.id);
    if (!current || current.requestedAt !== studio.requestedAt) {
      skipped.push({ id: studio.id, reason: "cancelled-or-changed" });
      continue;
    }
    const files = await listMediaForStudio(studio.id);
    for (const id of files) await deleteMedia(id);
    await touchTTL(BILLING.subscription(studio.id), BILLING_RETENTION_SEC);
    await cascadeDeleteStudio(studio.id);
    deleted.push(studio.id);
    filesDeleted += files.length;
  }

  return Response.json({
    ok: true, mode: "delete", deleted, skipped, filesDeleted,
    dueTotal: due.length, hitCap: due.length > MAX_PER_RUN,
  });
}

export const GET = cronJob("studio-deletions", run);
