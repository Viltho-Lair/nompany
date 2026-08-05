import { getCollection, updateItem } from "@/lib/db";
import { requireTag, forbidden } from "@/lib/session";
import { ADMIN_TAG } from "@/lib/auth";
import { hashPassword, generatePassword } from "@/lib/passwords";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Generate a fresh random password for the user and return the plaintext
// exactly once. Also clears any active session on that user so the old
// password can't be used anywhere it's still cached.
export async function POST(request, { params }) {
  const actor = await requireTag(ADMIN_TAG);
  if (!actor) return forbidden();
  const { id } = await params;
  const users = await getCollection("users");
  const target = users.find((u) => u.id === id);
  if (!target) return Response.json({ error: "Not found" }, { status: 404 });

  const password = generatePassword(16);
  const passwordHash = await hashPassword(password);
  await updateItem("users", id, {
    passwordHash,
    passwordSetAt: new Date().toISOString(),
    sessionToken: "", // force the user to log in again with the new password
  });
  return Response.json({ password });
}
