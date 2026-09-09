// API KEYS — issuing, listing and revoking.
//
// UNDER MASTER DATA'S CONTEXT because that is where the screen is, and gated on
// `administration.settings.*` because a key is studio-wide configuration in the
// same sense the numbering series is. What actually bounds a key is invariant 5
// inside the service: nobody mints one holding rights they do not hold.
//
// THERE IS NO PUT. A key's name and scopes are what they were when it was
// issued: widening one would be a grant with no record of having been made, and
// narrowing one silently breaks an integration nobody warned. Issue another and
// revoke this one — which leaves both facts in the register.
//
// A KEY CANNOT MANAGE KEYS. Nothing here says so, and nothing needs to: the
// door in `platform/http/route.ts` narrows an API caller's access to the key's
// own scopes, so reaching this route needs `administration.settings.edit` to be
// among them — a studio that grants a key the right to mint keys has made that
// decision explicitly, in a list it can read back.
import { route, refused } from "@/platform/http/route";
import { masterContext } from "@/modules/administration/master";
import {
  listApiKeys, issueApiKey, revokeApiKey,
} from "@/modules/administration/apiKeyService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", context: masterContext, body: true, name: "administration/api-keys" };

export const GET = route({ ...spec, body: false }, async (master) => {
  const result = await listApiKeys(master);
  if (refused(result)) return result;
  return result;
});

// THE ONLY RESPONSE THAT EVER CARRIES THE KEY. It is not stored, not logged and
// not readable again — the register keeps a digest and the first few characters.
export const POST = route(spec, async (master) => {
  const result = await issueApiKey(master, master.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, key: result.key, row: result.row } };
});

export const DELETE = route(spec, async (master) => {
  if (!master.body.id) return { error: "missing" };

  const result = await revokeApiKey(master, String(master.body.id));
  if (refused(result)) return result;
  return { ok: true };
});
