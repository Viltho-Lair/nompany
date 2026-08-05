import { updateItem } from "@/lib/db";
import { currentUser, unauthorized } from "@/lib/session";
import { hashPassword, generatePassword } from "@/lib/passwords";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Self-service: the signed-in user resets their OWN password to a fresh random
// one, returned once. Other sessions are kept (only the password changes) so
// they don't get logged out of the tab they're doing this from.
export async function POST() {
  const actor = await currentUser();
  if (!actor) return unauthorized();
  const password = generatePassword(16);
  await updateItem("users", actor.id, {
    passwordHash: await hashPassword(password),
    passwordSetAt: new Date().toISOString(),
  });
  return Response.json({ password });
}
