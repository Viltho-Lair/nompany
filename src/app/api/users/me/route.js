import { currentUser, unauthorized } from "@/lib/session";
import { publicUser } from "@/lib/auth";
import { updateItem } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/passwords";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Client-side sidebar and pages call this to know which tags the logged-in
// user carries. Returns the sanitized public shape — never the password hash
// or session token.
export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ user: null }, { status: 200 });
  return Response.json({ user: publicUser(user) });
}

// Self-service profile edit: a user updates their OWN display name, position,
// avatar and (optionally) password. Tags and userId are NOT editable here —
// those stay admin-only. A password change requires the current password.
export async function PUT(request) {
  const user = await currentUser();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const patch = {};

  if (typeof body.fullName === "string") {
    const fullName = body.fullName.trim();
    if (!fullName) return Response.json({ error: "Name can't be empty." }, { status: 400 });
    patch.fullName = fullName;
  }
  if ("position" in body) patch.position = String(body.position || "").trim();
  if ("avatarUrl" in body) patch.avatarUrl = String(body.avatarUrl || "").trim();

  // Optional password change — gated on the current password.
  if (body.newPassword) {
    const ok = body.currentPassword && (await verifyPassword(body.currentPassword, user.passwordHash));
    if (!ok) return Response.json({ error: "Your current password is incorrect." }, { status: 400 });
    if (String(body.newPassword).length < 8) {
      return Response.json({ error: "New password must be at least 8 characters." }, { status: 400 });
    }
    patch.passwordHash = await hashPassword(String(body.newPassword));
    patch.passwordSetAt = new Date().toISOString();
  }

  if (Object.keys(patch).length === 0) {
    return Response.json({ error: "Nothing to update." }, { status: 400 });
  }

  const updated = await updateItem("users", user.id, patch);
  return Response.json({ user: publicUser(updated) });
}
