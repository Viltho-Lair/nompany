import { cronJob } from "@/platform/http/cron";
import { log } from "@/platform/http/observability";
import { readArr } from "@/platform/db/store";
import { REG } from "@/platform/db/keys";
import { listCollaborators } from "@/platform/auth/collaborators";
import { financeContext } from "@/modules/finance/finance";
import { einvoiceQueue, submitEInvoice } from "@/modules/finance/einvoiceService";
import { shouldRetry, MAX_RETRY_ATTEMPTS } from "@/modules/finance/einvoice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// SENDING AGAIN WHAT THE WIRE LOST, and nothing else.
//
// THE DISTINCTION THIS WHOLE JOB RESTS ON. An adapter answers `failed` when the
// TRANSPORT broke — a timeout, a 500, a name that would not resolve — and
// `rejected` when the AUTHORITY looked at the document and said no. Only the
// first is worth repeating: the same document sent again after a timeout may
// well be accepted, while the same document sent again after a rejection is the
// same rejection, and sending it daily for ever is a studio hammering its own
// tax authority with a document somebody has to fix by hand.
//
// SO A REJECTION IS LEFT ALONE. It sits in the Tax screen's queue with the
// authority's own words on it, where a person can read them and act. That is
// not an omission; it is the point.
//
// `unsubmitted` IS ALSO LEFT ALONE — an invoice nobody has tried to send yet is
// waiting on a person's decision, not on the network, and a cron that started
// submitting them would be this job quietly deciding to file a studio's taxes.
//
// ONCE A DAY IS WHAT THE PLATFORM ALLOWS, and it is coarse for a transport
// failure: a submission that fails at nine in the morning waits until tomorrow.
// The Tax screen's own Submit button is the answer to anything urgent, and it
// is why this job is a safety net rather than the mechanism.
//
// ONE SLOW OR BROKEN STUDIO NEVER SINKS THE RUN — each is wrapped and logged,
// and the sweep goes on.
export const GET = cronJob("einvoice-retry", run);

async function run() {
  const studios = await readArr<{ id: string; slug?: string }>(REG.studios);

  let studiosWithRules = 0;
  let retried = 0;
  let accepted = 0;
  let givenUp = 0;

  for (const studio of studios) {
    const slug = String(studio?.slug || "");
    if (!slug) continue;
    try {
      // THE STUDIO'S OWN AUTHORITY, not a caller's: this is a consequence of
      // submissions somebody already authorised, and the credentials it uses
      // were chosen by the adapter rather than by whoever runs the cron.
      //
      // IT STILL NAMES A PERSON, and it has to: `asStudio` resolves a real
      // collaborator and answers `forbidden` without one, so passing "" here
      // would have made this job retry NOTHING while reporting a clean run —
      // the worst shape a scheduled task can take. The OWNER is the one
      // collaborator every studio is guaranteed to have.
      const people = await listCollaborators(String(studio.id));
      const owner = (people as { id?: string; role?: string }[]).find((c) => c.role === "owner");
      if (!owner?.id) continue;
      const ctx = await financeContext.asStudio(String(studio.id), owner.id);
      if (ctx.error) continue;

      const queue = await einvoiceQueue(ctx);
      // A REFUSAL IS NOT A QUEUE. `einvoiceQueue` answers with an error shape
      // for a studio whose Finance sections are absent.
      if (!queue || "error" in queue || !queue.connected) continue;
      studiosWithRules += 1;

      for (const row of queue.queue) {
        if (row.state === "failed" && (row.attempts || 0) >= MAX_RETRY_ATTEMPTS) { givenUp += 1; continue; }
        if (!shouldRetry(row)) continue;
        const out = await submitEInvoice(ctx, row.id);
        retried += 1;
        const state = (out as { invoice?: { einvoice?: { status?: string } } })?.invoice?.einvoice?.status;
        if (state === "accepted") accepted += 1;
      }
    } catch (err) {
      log.error("einvoice retry failed for a studio", { slug, error: String((err as Error)?.message || err) });
    }
  }

  return Response.json({ ok: true, studios: studios.length, studiosWithRules, retried, accepted, givenUp });
}
