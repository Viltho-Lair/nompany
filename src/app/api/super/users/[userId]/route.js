import { route } from "@/lib/route";
import { listSuperAdminEmails } from "@/lib/superAuth";
import { getUserById, setPlatformRole } from "@/lib/data/users";
import { isAssignableRole } from "@/lib/platformRoles";

export const runtime = "nodejs";

// Assign (or clear) a user's platform role. Owner-only: the session is verified
// against the stored token list, exactly as the console pages are.
export const PATCH = route(
  { auth: "super", body: true, name: "super/users/[userId]" },
  async ({ params, body }) => {
    // "" clears the role — that is how someone becomes a Member again. Anything
    // else must be one of the five assignable roles; "Super Admin" is not among
    // them, so it cannot be granted from this menu.
    const role = String(body.platformRole || "");
    if (role && !isAssignableRole(role)) return { error: "role" };

    const user = await getUserById(params.userId);
    if (!user) return { error: "notfound" };

    // A super admin's row shows Super Admin because a separate owner record
    // exists for that address; changing `platformRole` underneath it would store
    // a label the table can never display. Refuse rather than write a lie.
    const owners = await listSuperAdminEmails();
    if (owners.has(String(user.email).toLowerCase())) return { error: "super" };

    const result = await setPlatformRole(params.userId, role);
    if (result.error) return result;
    return { ok: true, platformRole: result.user.platformRole || "" };
  },
);
