import { route } from "@/platform/http/route";
import { deleteApplication, setApplicationStatus } from "@/lib/data/careers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "super", name: "super/careers/applications/[id]" };

export const PATCH = route({ ...spec, body: true }, async ({ params, body }) => {
  const out = await setApplicationStatus(params.id, body.status);
  if ("error" in out) return { error: out.error };
  return { ok: true, application: out };
});

// Removes the application and its CV (see deleteApplication).
export const DELETE = route(spec, async ({ params }) => ((await deleteApplication(params.id)) ? { ok: true } : { error: "notfound" }));
