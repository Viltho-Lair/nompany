import type { PermissionKey } from "@/platform/access";
import { currentUser } from "@/platform/auth/identity";
import { route, type Guarded, subscriptionRefusal } from "@/platform/http/route";
import type { StudioMembership } from "@/lib/studios";
import { studioContext } from "@/lib/studios";
import { requirePermission, escalates, AREAS, SECTION_AREAS, type Area } from "@/platform/access";
import { isFiledOnlySection } from "@/platform/db/keys";
import { switchboard } from "@/lib/dashboardWidgets";
import { listRoles, createRole, updateRole, deleteRole, cleanRole, ADMIN_ROLE_ID } from "@/modules/people/roles";
import { studioLocale } from "@/shared/locale";
import { departmentsAsStored } from "@/modules/administration/departments";
import { grantableTypeAreas } from "@/platform/engine/records";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The roles of one studio, and the catalogue they are built from.
//
// Reading is open to anyone who may open the studio: knowing that a role called
// "Sales Engineer" exists is not sensitive, and the People screen shows those
// names on rows. WRITING is people.members.edit, the same permission as
// changing who holds what — defining a role and handing it out are two halves
// of the same act.

async function open(ctx: { params: Promise<Record<string, string>> }): Promise<Guarded<{ context: StudioMembership }>> {
  const user = await currentUser();
  if (!user) return { fail: Response.json({ error: "unauthorized" }, { status: 401 }) };
  const { slug } = await ctx.params;
  const context = await studioContext(user, slug);
  if (context.error) {
    const status = context.error === "notfound" ? 404 : 403;
    return { fail: Response.json({ error: context.error }, { status }) };
  }
  return { context };
}

// ONLY THE DEPARTMENTS THIS STUDIO RUNS — the owner, 24/09/2026: the editor
// listed all eighteen while the sidebar showed five. `switchboard` is the same
// on/off answer the dashboards use (a part is off when it or its department
// is), so the editor and the sidebar cannot disagree about what is running.
//
// An area is on when any section it is filed under is on. A FILED-ONLY row
// (`crm-sales-pos`, `projects-sla`, …) is skipped when the area has a real
// home as well, because those rows stay enabled after their screens moved and
// would keep a switched-off department's rights on the list. An area no
// section names follows its GROUP: shown if anything in that group is on, or
// if nothing in the group is filed anywhere (Administration, People).
//
// HIDING IS NOT REVOKING. A role keeps whatever it holds in a switched-off
// department: the editor changes only the keys of the areas it shows
// (`setLevel` keeps every other key), so saving drops nothing, and switching
// the department back on brings the role's access back with it.
const AREA_SECTIONS = (() => {
  const map = new Map<string, string[]>();
  for (const [section, areas] of Object.entries(SECTION_AREAS)) {
    for (const area of areas) map.set(area, [...(map.get(area) || []), section]);
  }
  return map;
})();

function runningAreas(areas: readonly Area[], on: (key: string) => boolean): Area[] {
  // true / false for an area some section names; null for one none does.
  const verdict = (key: string): boolean | null => {
    const all = AREA_SECTIONS.get(key) || [];
    if (!all.length) return null;
    const live = all.filter((s) => !isFiledOnlySection(s));
    return (live.length ? live : all).some(on);
  };
  const groupOn = new Map<string, boolean>();
  for (const a of areas) {
    const v = verdict(a.key);
    if (v !== null) groupOn.set(a.group, (groupOn.get(a.group) || false) || v);
  }
  return areas.filter((a) => verdict(a.key) ?? groupOn.get(a.group) ?? true);
}

const body = async (request: Request): Promise<Record<string, unknown>> => {
  try { return await request.json(); } catch { return {}; }
};

// THE READ IS ON THE ROUTE WRAPPER, so the studio page can answer it inside its
// own render (`firstPayload`) and the Access screen paints with its roles. The
// writes keep `open` for now. Refusals are unchanged: `notfound` is 404 and
// `forbidden` 403 in the status table, the ladder `open` writes by hand.
export const GET = route<StudioMembership>({ auth: "studio", name: "roles", keys: false }, async (context) => {
  const on = switchboard(context.sections);
  return {
    roles: await listRoles(context.studio.id, studioLocale(context.studio)),
    // The catalogue travels with them so the editor can render every area and
    // its verbs without a second call, and can never offer a key the server
    // would refuse.
    // THE DECLARED CATALOGUE PLUS THIS STUDIO'S OWN REGISTERS. `AREAS` is
    // compile-time and an engine right is minted from a row, so without the
    // second half the screen could not offer a single one of the studio's
    // record types and they stayed owner-only. See `grantableTypeAreas`.
    areas: runningAreas(
      [...AREAS, ...await grantableTypeAreas(context, studioLocale(context.studio), on)],
      on,
    ),
    // THE ORG CHART TRAVELS TOO, because the editor groups roles by it now.
    //
    // Served from here rather than fetched separately: the departments route
    // answers to administration.master, and somebody granted the ACCESS screen
    // and nothing else would be refused it — so the grouping would silently
    // collapse for exactly the person the screen is for. Reading it on the same
    // terms as the roles is consistent with what this route already says: a
    // department name is no more sensitive than a role name, and the People
    // screen shows both already.
    //
    // NEVER SEEDS. departmentsAsStored is the non-writing reader; a list route
    // must not create an org chart as a side effect of being read.
    departments: await departmentsAsStored(
      context.studio,
      context.sections.find((s) => s.key === "administration-master") || null,
    ),
    canEdit: !requirePermission(context.access, "administration.members.edit"),
  };
});

// Refuse a role that contains anything its author cannot do themselves. Writing
// it into a role and then assigning it would otherwise be a way around the
// escalation check on assignment — the same escape, one step further back.
function overreaches(
  context: StudioMembership,
  draft: { permissions?: PermissionKey[] },
) {
  // `deny` is empty rather than absent: escalates compares an allow-list
  // against what the author holds, and a role that denies something cannot
  // hand anybody more than they had.
  return escalates(context.access, { overrides: { allow: draft.permissions || [], deny: [] } }, []);
}

export async function POST(request: Request, ctx: { params: Promise<Record<string, string>> }) {
  const g = await open(ctx);
  if (g.fail) return g.fail;
  // THE SUBSCRIPTION'S ANSWER, the same one the route wrapper gives (24/09/2026).
  const lapsed = await subscriptionRefusal(g.context, request);
  if (lapsed) return lapsed;
  const denied = requirePermission(g.context.access, "administration.members.edit");
  if (denied) return Response.json(denied, { status: 403 });

  const draft = cleanRole(await body(request));
  const bad = overreaches(g.context, draft);
  if (bad) return Response.json(bad, { status: 403 });
  return Response.json({ role: await createRole(g.context.studio.id, draft) }, { status: 201 });
}

export async function PUT(request: Request, ctx: { params: Promise<Record<string, string>> }) {
  const g = await open(ctx);
  if (g.fail) return g.fail;
  // THE SUBSCRIPTION'S ANSWER, the same one the route wrapper gives (24/09/2026).
  const lapsed = await subscriptionRefusal(g.context, request);
  if (lapsed) return lapsed;
  const denied = requirePermission(g.context.access, "administration.members.edit");
  if (denied) return Response.json(denied, { status: 403 });

  const payload = await body(request);
  if (!payload?.id) return Response.json({ error: "missing" }, { status: 400 });
  // Admin is a wildcard whose list is meaningless, so it has nothing to
  // overreach with; roles.js already restricts it to its description.
  if (payload.id !== ADMIN_ROLE_ID) {
    const bad = overreaches(g.context, cleanRole(payload));
    if (bad) return Response.json(bad, { status: 403 });
  }
  await updateRole(g.context.studio.id, String(payload.id), payload);
  return Response.json({ ok: true, roles: await listRoles(g.context.studio.id) });
}

export async function DELETE(request: Request, ctx: { params: Promise<Record<string, string>> }) {
  const g = await open(ctx);
  if (g.fail) return g.fail;
  // THE SUBSCRIPTION'S ANSWER, the same one the route wrapper gives (24/09/2026).
  const lapsed = await subscriptionRefusal(g.context, request);
  if (lapsed) return lapsed;
  const denied = requirePermission(g.context.access, "administration.members.edit");
  if (denied) return Response.json(denied, { status: 403 });

  const { id } = await body(request);
  const out = await deleteRole(g.context.studio.id, String(id));
  // Admin cannot be deleted: a studio with no wildcard role is one where a new
  // capability reaches nobody at all, including whoever is supposed to fix it.
  if (out.error) return Response.json(out, { status: 400 });
  return Response.json({ ok: true, roles: await listRoles(g.context.studio.id) });
}
