import { currentSuperAdmin, listSuperAdminEmails } from "@/lib/superAuth";
import { getUserById, setPlatformRole } from "@/lib/data/users";
import { isAssignableRole } from "@/lib/platformRoles";

export const runtime = "nodejs";

// Assign (or clear) a user's platform role. Owner-only: the session is verified
// against the stored token list, exactly as the console pages are.
export async function PATCH(request, { params }) {
  if (!(await currentSuperAdmin())) return Response.json({ error: "unauthorised" }, { status: 401 });

  const { userId } = await params;
  let body = {};
  try { body = await request.json(); } catch { body = {}; }

  // "" clears the role — that is how someone becomes a Member again. Anything
  // else must be one of the five assignable roles; "Super Admin" is not among
  // them, so it cannot be granted from this menu.
  const role = String(body.platformRole || "");
  if (role && !isAssignableRole(role)) return Response.json({ error: "role" }, { status: 400 });

  const user = await getUserById(userId);
  if (!user) return Response.json({ error: "notfound" }, { status: 404 });

  // A super admin's row shows Super Admin because a separate owner record
  // exists for that address; changing `platformRole` underneath it would store
  // a label the table can never display. Refuse rather than write a lie.
  const owners = await listSuperAdminEmails();
  if (owners.has(String(user.email).toLowerCase())) {
    return Response.json({ error: "super" }, { status: 409 });
  }

  const result = await setPlatformRole(userId, role);
  if (result.error) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({ ok: true, platformRole: result.user.platformRole || "" });
}
