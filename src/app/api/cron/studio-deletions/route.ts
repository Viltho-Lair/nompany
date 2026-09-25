import { cronJob } from "@/platform/http/cron";
import { readArr, touchTTL } from "@/platform/db/store";
import { BILLING, REG } from "@/platform/db/keys";
import { deleteMedia, listMediaForStudio } from "@/lib/media";
import { cascadeDeleteStudio } from "@/platform/db/cascade";
import { dueForDeletion, type DueStudio } from "@/shared/studioDeletion";
import { subscriptionDocs } from "@/lib/data/subscriptions";
import { billingDay, unpaidDeletionDue } from "@/shared/subscription";
import { openTransfer } from "@/shared/billingClaims";
import { notifySuper, NOTIFY } from "@/platform/notify/notifications";

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

// UNPAID STUDIOS AT DAY 365 (the owner's ladder, 24/09/2026) — a SECOND kind of
// deletion with its OWN switch, `UNPAID_DELETIONS=on`. The owner confirmed
// deleting studios whose OWNER asked (STUDIO_DELETIONS); deleting a studio for
// non-payment is a different decision about other people's data, and invariant
// 17 asks for its confirmation separately. Until it is set the run REPORTS the
// unpaid studios it would delete. And even when it is set, a studio is deleted
// only if its last warning went out (shared/subscription's unpaidDeletionDue),
// so an email outage keeps studios rather than deleting them unwarned.
async function unpaidDue(studios: Record<string, unknown>[]) {
  const today = billingDay();
  const docs = await subscriptionDocs(studios.map((s) => String(s.id)));
  const byId = new Map(studios.map((s) => [String(s.id), s]));
  const due: { id: string; name: string; slug: string }[] = [];
  const held: { id: string; reason: string }[] = [];
  for (const { studioId, doc } of docs) {
    if (!doc) continue;
    const due0 = unpaidDeletionDue(doc.subscription, today, doc.sentNotices || []);
    if (due0 === "not-expired") continue;
    // AN OWNER WHO SAYS THEY PAID IS NEVER DELETED UNANSWERED (26/09/2026):
    // the claim holds the studio for as long as nobody at nompany has looked
    // at it, however long ago it was made — not only for the ladder's hours.
    const why = openTransfer(doc.claims) ? "claim-open" : due0;
    const s = byId.get(studioId);
    if (why) held.push({ id: studioId, reason: why });
    else due.push({ id: studioId, name: String(s?.name || ""), slug: String(s?.slug || "") });
  }
  return { due, held };
}

async function run() {
  const enabled = process.env.STUDIO_DELETIONS === "on";
  const unpaidEnabled = process.env.UNPAID_DELETIONS === "on";
  const now = Date.now();
  const studios = await readArr<Record<string, unknown>>(REG.studios);
  const due = dueForDeletion(studios, now);
  const batch = due.slice(0, MAX_PER_RUN);
  const unpaid = await unpaidDue(studios);
  // A STUDIO HELD BECAUSE ITS OWNER WAS NEVER WARNED is said in /super: it is
  // past its year, it will not be deleted, and the reason is an email that
  // never went — somebody has to look. Said every run while it stands.
  if (unpaid.held.length) {
    const names = new Map(studios.map((st) => [String(st.id), String(st.name || st.id)]));
    await notifySuper({
      type: NOTIFY.system,
      title: `${unpaid.held.length} unpaid studio${unpaid.held.length === 1 ? "" : "s"} held from deletion`,
      body: `Past a year unpaid, but held: ${unpaid.held.map((h) => `${names.get(h.id)} (${h.reason === "claim-open" ? "says they paid; answer the claim" : "never sent the final warning"})`).slice(0, 10).join(", ")}`,
      href: "/super/studios",
      tone: "warning",
    });
  }

  if (!enabled) {
    // THE REPORT NAMES THE WHOLE SCOPE — each studio and how many of its files
    // would go with it — because it is what the owner confirms against.
    const report: (DueStudio & { files: number })[] = [];
    for (const studio of batch) report.push({ ...studio, files: (await listMediaForStudio(studio.id)).length });
    return Response.json({ ok: true, mode: "report", due: report, dueTotal: due.length, unpaid });
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

  // THE UNPAID ONES, in whatever room the owner-requested ones left this run,
  // each looked at again right before it goes — a payment that arrived in the
  // meantime makes it no longer expired.
  const unpaidDeleted: string[] = [];
  if (unpaidEnabled) {
    for (const studio of unpaid.due.slice(0, Math.max(0, MAX_PER_RUN - deleted.length))) {
      const again = (await unpaidDue(await readArr<Record<string, unknown>>(REG.studios))).due.some((s) => s.id === studio.id);
      if (!again) { skipped.push({ id: studio.id, reason: "paid-or-changed" }); continue; }
      const files = await listMediaForStudio(studio.id);
      for (const id of files) await deleteMedia(id);
      await touchTTL(BILLING.subscription(studio.id), BILLING_RETENTION_SEC);
      await cascadeDeleteStudio(studio.id);
      unpaidDeleted.push(studio.id);
      filesDeleted += files.length;
    }
  }

  return Response.json({
    ok: true, mode: "delete", deleted, skipped, filesDeleted,
    dueTotal: due.length, hitCap: due.length > MAX_PER_RUN,
    unpaid: { mode: unpaidEnabled ? "delete" : "report", deleted: unpaidDeleted, due: unpaid.due, held: unpaid.held },
  });
}

export const GET = cronJob("studio-deletions", run);
