import { route, refused } from "@/platform/http/route";
import { listSuperAdminEmails } from "@/platform/auth/superAuth";
import { getUserById, setPlatformRole, setUserStatus } from "@/platform/auth/users";
import { isAssignableRole } from "@/lib/platformRoles";

export const runtime = "nodejs";

// Assign (or clear) a user's platform role, or suspend and reactivate them.
// Owner-only: the session is verified against the stored token list, exactly
// as the console pages are. Each request does ONE of the two — a body carrying
// `status` changes the status and nothing else.
export const PATCH = route(
  { auth: "super", body: true, name: "super/users/[userId]" },
  async ({ params, body }) => {
    const user = await getUserById(params.userId);
    if (!user) return { error: "notfound" };

    // A super admin's row shows Super Admin because a separate owner record
    // exists for that address; changing `platformRole` underneath it would store
    // a label the table can never display. Refuse rather than write a lie — and
    // the console does not suspend its own owners from a menu either.
    const owners = await listSuperAdminEmails();
    if (owners.has(String(user.email).toLowerCase())) return { error: "super" };

    // SUSPENDING IS A PERSON'S DECISION (the owner, 18/09/2026). The sharing
    // flag only raises the question; this is where somebody answers it.
    if (body.status !== undefined) {
      const status = String(body.status);
      if (status !== "suspended" && status !== "active") return { error: "status" };
      const result = await setUserStatus(params.userId, status);
      if (refused(result)) return result;
      return { ok: true, status: result.user.status };
    }

    // "" clears the role — that is how someone becomes a Member again. Anything
    // else must be one of the five assignable roles; "Super Admin" is not among
    // them, so it cannot be granted from this menu.
    const role = String(body.platformRole || "");
    if (role && !isAssignableRole(role)) return { error: "role" };

    const result = await setPlatformRole(params.userId, role);
    if (refused(result)) return result;
    return { ok: true, platformRole: result.user.platformRole || "" };
  },
);
