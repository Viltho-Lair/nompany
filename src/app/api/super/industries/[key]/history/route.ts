import { route } from "@/platform/http/route";
import { byOf, industryHistory, restoreIndustry } from "@/lib/data/industryAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ONE INDUSTRY'S VERSIONS — the owner, 29/09/2026: "per created industry a
// version history is reasonable, with a restore button".
//   GET   every change, newest first: when, who, what it did
//   POST  { entryId } — put back the version from before that change

const spec = { auth: "super", name: "super/industries/[key]/history" };

export const GET = route(spec, async ({ params }) => ({ entries: await industryHistory(params.key) }));

export const POST = route({ ...spec, body: true }, async ({ params, body, admin }) => {
  const out = await restoreIndustry(params.key, String(body?.entryId || ""), byOf(admin));
  if ("error" in out) return out;
  return { ok: true, industries: out.industries };
});
