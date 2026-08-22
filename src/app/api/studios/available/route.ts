import { currentUser } from "@/platform/auth/identity";
import { slugAvailability } from "@/lib/studios";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Is this company code free? Powers the "choose your address" field.
// Signed-in only, so it can't be used to enumerate slugs anonymously.
export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const slug = new URL(request.url).searchParams.get("slug") || "";
  return Response.json(await slugAvailability(slug));
}
