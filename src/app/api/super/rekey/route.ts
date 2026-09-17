import { route } from "@/platform/http/route";
import { rekeyReport, applyRekey, publicReport } from "@/platform/auth/rekey";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// A walk of every user's calendar documents; give it room.
export const maxDuration = 60;

// RE-ENCRYPT STORED CREDENTIALS UNDER NOMPANY_DATA_KEY, from inside the
// deployment — the one place the retired FIELD_ENCRYPTION_KEY can still be read
// (platform/auth/rekey.ts says why). Console-only.
//
// GET is the dry run: counts and document NAMES, never a value. POST converts,
// and only with `confirm` naming exactly how many values the reader was shown —
// the second of invariant 17's two confirmations, made specific so a stale
// screen cannot authorise a run it did not describe.

const spec = { auth: "super", name: "super/rekey" } as const;

export const GET = route(spec, async () => publicReport(await rekeyReport()));

export const POST = route({ ...spec, body: true }, async ({ body }) => {
  const report = await rekeyReport();
  if (Number(body.confirm) !== report.values) {
    return { error: "stale", values: report.values };
  }
  return applyRekey();
});
