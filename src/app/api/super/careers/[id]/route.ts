import { route } from "@/platform/http/route";
import { deleteJob, updateJob } from "@/lib/data/careers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "super", name: "super/careers/[id]" };

// The whole opening is sent on every save; `cleanJob` decides what is kept.
export const PUT = route({ ...spec, body: true }, async ({ params, body }) => {
  const out = await updateJob(params.id, body);
  if ("error" in out) return { error: out.error };
  return { ok: true, job: out.job };
});

export const DELETE = route(spec, async ({ params }) => ((await deleteJob(params.id)) ? { ok: true } : { error: "notfound" }));
