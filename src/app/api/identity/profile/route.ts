import { route } from "@/platform/http/route";
import { savePersonalInfo } from "@/platform/auth/identity";
import { getProfile } from "@/platform/auth/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The user's isolated, editable personal information (u:<UserID>:profile).
// The Nova/AI key is a stored CREDENTIAL: its ciphertext never leaves the server,
// so it is stripped here and replaced with a plain "is one set?" flag the account
// screen can show.
export const GET = route(
  { auth: "user", name: "identity/profile" },
  async ({ user }) => {
    const profile = (await getProfile(user.id)) || {};
    const { novaKey, ...safe } = profile as Record<string, unknown>;
    return { ...safe, novaKeySet: Boolean(novaKey) };
  },
);

export const PUT = route(
  { auth: "user", body: true, name: "identity/profile" },
  async ({ user, body }) => {
    const result = await savePersonalInfo(user.id, body);
    if (result.error) return result;
    return { ok: true, profile: result.profile };
  },
);
