import { route } from "@/platform/http/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Everything the account UI needs in one read: the user, their personal info,
// verification state, questionnaire, the ONE studio they own, and the studios
// they collaborate in (derived from ix:collab).
export const GET = route(
  { auth: "identity", name: "identity/me" },
  async ({ identity }) => identity,
);
