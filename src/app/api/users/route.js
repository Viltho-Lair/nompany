import { getCollection, createItem } from "@/lib/db";
import { currentUser, requireTag, forbidden, unauthorized, publicUser } from "@/lib/session";
import { ADMIN_TAG } from "@/lib/auth";
import { enrichUsers } from "@/lib/employeeAuth";
import { hashPassword, generatePassword } from "@/lib/passwords";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Any authenticated user can list the safe user directory (id, userId,
// fullName, tags) — powers Handled-by / Created-by dropdowns across the
// Studio. Admin-only extras (createdAt, passwordSetAt) only leak to admins.
// Each row is enriched with its EFFECTIVE tags (department code / Leader
// status resolved from the linked Employee), not just what's literally
// stored, so tag-filtered dropdowns (e.g. "Technical users only") stay correct.
export async function GET() {
  const actor = await currentUser();
  if (!actor) return unauthorized();
  const users = await enrichUsers(await getCollection("users"));
  const isAdmin = Array.isArray(actor.tags) && actor.tags.includes(ADMIN_TAG);
  return Response.json(users.map((u) => isAdmin
    ? { ...publicUser(u), createdAt: u.createdAt, passwordSetAt: u.passwordSetAt }
    : publicUser(u)
  ));
}

export async function POST(request) {
  const actor = await requireTag(ADMIN_TAG);
  if (!actor) return forbidden();

  const body = await request.json();
  const userId = String(body.userId || "").trim();
  // Users have no full name — the person's name lives on their Employee record.
  // Only "admin" may ever be stored directly; department/Leader access is
  // derived from the linked Employee, so a normal user has no stored tags.
  const tags = Array.isArray(body.tags) ? body.tags.filter((t) => t === ADMIN_TAG) : [];

  if (!userId) {
    return Response.json({ error: "userId is required" }, { status: 400 });
  }
  // Enforce uniqueness on userId (case-insensitive) so login is unambiguous.
  const existing = await getCollection("users");
  if (existing.some((u) => (u.userId || "").toLowerCase() === userId.toLowerCase())) {
    return Response.json({ error: "That User ID is already taken" }, { status: 409 });
  }

  const password = generatePassword(16);
  const passwordHash = await hashPassword(password);
  const record = await createItem("users", {
    userId,
    passwordHash,
    tags,
    sessionToken: "",
    createdAt: new Date().toISOString(),
    passwordSetAt: new Date().toISOString(),
  });

  logActivity({ actor, verb: "created", sectionKey: "users", entityType: "users", entityId: record.id, label: `New user ${record.userId}`, href: "/studio/users" }).catch(() => {});

  // Plaintext password is returned exactly once — the admin must copy it now.
  return Response.json({ user: publicUser(record), password }, { status: 201 });
}
