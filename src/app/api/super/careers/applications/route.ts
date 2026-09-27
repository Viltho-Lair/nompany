import { route } from "@/platform/http/route";
import { listApplications } from "@/lib/data/careers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Everybody who applied, newest first. Stored by the public apply form
// (/api/applications); read only here.
export const GET = route({ auth: "super", name: "super/careers/applications" }, async () => ({
  applications: await listApplications(),
}));
