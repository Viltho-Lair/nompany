import { route } from "@/platform/http/route";
import { revertIndustry, saveIndustry, setIndustryLock } from "@/lib/data/industryAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ONE INDUSTRY. The key is the URL's, never the body's — keys are published.
//   PUT     save names, sentence, switch, profile and specialisms (refused while locked)
//   PATCH   { locked } — lock or unlock, and nothing else
//   DELETE  back to the code's version (built-ins only, refused while locked)

const spec = { auth: "super", name: "super/industries/[key]" };

export const PUT = route({ ...spec, body: true }, async ({ params, body }) => {
  const out = await saveIndustry(params.key, body);
  if ("error" in out) return out;
  return { ok: true, industries: out.industries };
});

export const PATCH = route({ ...spec, body: true }, async ({ params, body }) => {
  if (typeof body?.locked !== "boolean") return { error: "missing" };
  const out = await setIndustryLock(params.key, body.locked);
  if ("error" in out) return out;
  return { ok: true, industries: out.industries };
});

export const DELETE = route(spec, async ({ params }) => {
  const out = await revertIndustry(params.key);
  if ("error" in out) return out;
  return { ok: true, industries: out.industries };
});
