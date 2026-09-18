// ONE SHAPE FOR EVERY SCHEDULED JOB.
//
// Each of the five cron routes wrote the same three steps by hand: open a
// request scope, refuse without the secret, run. A fourth step — checking in
// with the monitor — is only right in ONE place in that order (after the
// refusal, or a stranger requesting the URL reports the job as having run), and
// five copies are five chances to put it somewhere else.
//
// The job's name IS its path under /api/cron, which is also how vercel.json
// names it and how the monitor finds its schedule. `testEveryCronIsMonitored`
// holds the three together.

import { cronDenied } from "@/platform/auth/cronAuth";
import { withRequest } from "./observability";
import { monitored } from "./sentry";

export function cronJob(name: string, job: (request: Request) => Promise<Response>) {
  return async function GET(request: Request): Promise<Response> {
    return withRequest(`cron/${name}`, async () => {
      // Fails closed when CRON_SECRET is unset — invariant 15, see cronAuth.
      const denied = cronDenied(request);
      if (denied) return denied;
      return monitored(name, () => job(request));
    });
  };
}
