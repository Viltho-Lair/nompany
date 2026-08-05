import { getCollection, updateItem } from "@/lib/db";
import { currentUser, unauthorized } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/passwords";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Self-service: the signed-in user changes their OWN password. The current
// password must match before the new one is set. Other sessions keep working
// (only the stored hash changes).
export async function POST(request) {
  const actor = await currentUser();
  if (!actor) return unauthorized();
  const { current, next } = await request.json().catch(() => ({}));
  if (!current || !next) return Response.json({ error: "Current and new password are required." }, { status: 400 });
  if (String(next).length < 8) return Response.json({ error: "New password must be at least 8 characters." }, { status: 400 });

  const users = await getCollection("users");
  const user = users.find((u) => u.id === actor.id);
  if (!user) return Response.json({ error: "Account not found." }, { status: 404 });

  const ok = await verifyPassword(current, user.passwordHash);
  if (!ok) return Response.json({ error: "Current password is incorrect." }, { status: 400 });

  await updateItem("users", actor.id, { passwordHash: await hashPassword(String(next)), passwordSetAt: new Date().toISOString() });
  return Response.json({ ok: true });
}
