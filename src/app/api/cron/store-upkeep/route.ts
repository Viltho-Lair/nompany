import { cronDenied } from "@/platform/auth/cronAuth";
import { purgeExpired } from "@/platform/db/pgStore";
import { pgQuery } from "@/platform/db/pg";
import { TBL } from "@/platform/db/keys";
import { withRequest } from "@/platform/http/observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE ONE JOB REDIS USED TO DO FOR FREE.
//
// Redis expired a key itself. Postgres will not, so it became this product's
// responsibility the moment the store moved — and the keys that expire are
// exactly the high-churn ones: OTP challenges, rate-limit windows, session
// indexes. Without this, `documents` grows forever with rows nothing can read.
//
// EXPIRY HERE IS RECLAMATION, NOT CORRECTNESS, and the ordering is deliberate.
// Every read in pgStore already treats a row past its expires_at as absent
// (`expires_at IS NULL OR expires_at > now()`), so a session does not stay
// valid because this job did not run — it is already invalid and merely still
// occupying space. A correctness rule that depends on a cron is a correctness
// rule that fails the night the cron does.
//
// THE DELETION ITSELF LIVES IN pgStore.purgeExpired, not here. It was written
// here first, in raw SQL, which was a second copy of a statement the store
// already owned — and the copy in a route is the one that drifts from the
// column names it is deleting by.
//
// NEITHER STATEMENT IS AN INVARIANT-17 HAZARD. What that invariant refuses is
// an unbounded prefix — `delPrefix("")` once erased the whole instance. These
// name one table and one condition that is a fact about the row (it expired;
// it is older than the horizon), take no caller input, and cap how many rows a
// single run may remove.
const MAX_PER_RUN = 20_000;

// How long an event stays readable. This is the REPLAY WINDOW: a client
// reconnecting with a Last-Event-ID older than this gets a full reload instead
// of a delta — correct, but expensive — so it wants to be comfortably longer
// than any plausible disconnection. Seven days is a long weekend plus margin.
//
// `xAdd` also trims per-channel by maxLen as it writes, which bounds a single
// busy studio. This bounds the TABLE, including channels that went quiet and
// will never be written to again, which per-channel trimming cannot reach.
const EVENT_HORIZON_DAYS = 7;

async function upkeep(request: Request) {
  // Fails closed when CRON_SECRET is unset — invariant 15, see cronAuth.
  const denied = await cronDenied(request);
  if (denied) return denied;

  const expiredDocumentsRemoved = await purgeExpired(MAX_PER_RUN);

  // `ctid` with a LIMIT keeps one run bounded: a backlog is cleared over
  // several runs rather than in one statement that locks the table for however
  // long that backlog happens to be.
  const trimmed = await pgQuery(
    `DELETE FROM ${TBL.events} WHERE ctid IN (
       SELECT ctid FROM ${TBL.events}
        WHERE ${TBL.eventCols.createdAt} < now() - interval '${EVENT_HORIZON_DAYS} days'
        LIMIT ${MAX_PER_RUN}
     )`,
  );

  // Reported so a run that hit the cap is visible: a count equal to the cap
  // means there is more to do and the next run will take it, which is worth
  // seeing before it becomes a backlog nobody noticed.
  return Response.json({
    ok: true,
    expiredDocumentsRemoved,
    eventsTrimmed: trimmed.rowCount,
    hitCap: expiredDocumentsRemoved >= MAX_PER_RUN || trimmed.rowCount >= MAX_PER_RUN,
    eventHorizonDays: EVENT_HORIZON_DAYS,
  });
}

export async function GET(request: Request) {
  return withRequest("cron/store-upkeep", () => upkeep(request));
}
