import { route } from "@/platform/http/route";
import { savePersonalInfo } from "@/platform/auth/identity";
import { getProfile } from "@/platform/auth/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The user's isolated, editable personal information (u:<UserID>:profile).
export const GET = route(
  { auth: "user", name: "identity/profile" },
  async ({ user }) => (await getProfile(user.id)) || {},
);

export const PUT = route(
  { auth: "user", body: true, name: "identity/profile" },
  async ({ user, body }) => {
    const result = await savePersonalInfo(user.id, body);
    if (result.error) return result;
    return { ok: true, profile: result.profile };
  },
);
