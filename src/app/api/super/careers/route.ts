import { route } from "@/platform/http/route";
import { createJob, listApplications, listJobs } from "@/lib/data/careers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// nompany's own job openings, written from the console (27/09/2026). The list
// carries each opening's application count so the screen can show it without a
// second round trip. `auth: "super"` is the whole gate.
const spec = { auth: "super", name: "super/careers" };

export const GET = route(spec, async () => {
  const [jobs, applications] = await Promise.all([listJobs(), listApplications()]);
  const counts: Record<string, number> = {};
  for (const a of applications) counts[String(a.jobId)] = (counts[String(a.jobId)] || 0) + 1;
  return { jobs: jobs.map((j) => ({ ...j, applications: counts[String(j.id)] || 0 })) };
});

export const POST = route({ ...spec, body: true }, async ({ body }) => {
  const out = await createJob(body);
  if ("error" in out) return { error: out.error };
  return { status: 201, body: { ok: true, job: out.job } };
});
