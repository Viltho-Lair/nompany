import { route } from "@/platform/http/route";
import { studioHasNova } from "@/lib/plans";
import { getNovaConfig } from "@/lib/data/novaConfig";
import { NOVA_CAPABILITIES, capabilityEnabled } from "@/lib/nova/capabilities";
import { ACTION_IMPLS } from "@/platform/nova/actions";
import { can } from "@/platform/access";
import type { PermissionKey } from "@/platform/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// CONFIRM A NOVA ACTION. This is the write the model could not do: it prepared a
// proposal and the person clicked Confirm, which lands here. The same three gates
// as a tool — the package includes Nova, the switchboard has the capability on,
// and the user holds its permission — and then the action's own service runs
// under this user, enforcing whatever invariants it already enforces. The model
// is nowhere in this path; a human asked for exactly this.
export const POST = route({ auth: "studio", body: true, name: "nova/act" }, async (g) => {
  const { studio, access, user, params, body } = g;
  if (!(await studioHasNova(studio))) return { status: 403, body: { error: "nova-off" } };

  const capKey = String(body?.capKey || "");
  const cap = NOVA_CAPABILITIES.find((c) => c.key === capKey);
  const impl = ACTION_IMPLS[capKey];
  if (!cap || cap.kind !== "action" || !impl) return { error: "unknown-action" };

  // Switched on in the console, and held by this user — the same set the toolset
  // was built from, re-checked here because this endpoint can be called directly.
  const config = await getNovaConfig();
  if (!capabilityEnabled(config, cap)) return { status: 403, body: { error: "disabled" } };
  if (cap.permissionKey && !can(access, cap.permissionKey as PermissionKey)) return { status: 403, body: { error: "forbidden" } };

  const fields = (body?.fields && typeof body.fields === "object") ? (body.fields as Record<string, unknown>) : {};
  const result = await impl.submit(user, String(params.slug), fields) as { error?: unknown };
  if (result?.error) return { ok: false, error: result.error, result };
  return { ok: true, label: cap.label, result };
});
