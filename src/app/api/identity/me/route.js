import { currentIdentity } from "@/lib/identity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Everything the account UI needs in one read: the user, their personal info,
// verification state, questionnaire, the ONE studio they own, and the studios
// they collaborate in (derived from ix:collab).
export async function GET() {
  const identity = await currentIdentity();
  if (!identity) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json(identity);
}
