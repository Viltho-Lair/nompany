import { route, refused } from "@/platform/http/route";
import { requirePermission } from "@/platform/access";
import { projectsContext } from "@/modules/projects/projects";
import { listClaims, openClaim, editClaim, moveClaim, removeClaim } from "@/modules/projects/claims";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PROGRESS CLAIMS (tier 6). Named by the project list's section, like the
// payment schedule's route: a claim lives with the project it bills.
// PERMISSION IS ENFORCED IN THE SERVICE.
const spec = { auth: "studio", context: projectsContext, body: true, name: "projects-list" };

export const GET = route({ ...spec, body: false }, async (projects) => {
  const projectId = new URL(projects.request.url).searchParams.get("projectId") || "";
  const result = await listClaims(projects, projectId);
  if (refused(result)) return result;
  return {
    ok: true,
    ...result,
    canCreate: !requirePermission(projects.access, "projects.billing.create"),
    canEdit: !requirePermission(projects.access, "projects.billing.edit"),
    canDelete: !requirePermission(projects.access, "projects.billing.delete"),
    // RAISING THE INVOICE IS FINANCE'S ACT, through Finance's route; the button
    // is drawn only for somebody that route would let through.
    canInvoice: !requirePermission(projects.access, "finance.cash.create"),
  };
});

export const POST = route(spec, async (projects) => {
  const result = await openClaim(projects, projects.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, claim: result.claim } };
});

// A MOVE IS NAMED IN THE BODY (`to`), never a status written through the edit —
// the shape that once let a rejected change order approve itself.
export const PUT = route(spec, async (projects) => {
  if (!projects.body.id) return { error: "missing" };
  const id = String(projects.body.id);
  const result = projects.body.to
    ? await moveClaim(projects, id, projects.body)
    : await editClaim(projects, id, projects.body);
  if (refused(result)) return result;
  return { ok: true, claim: result.claim };
});

export const DELETE = route(spec, async (projects) => {
  if (!projects.body.id) return { error: "missing" };
  const result = await removeClaim(projects, String(projects.body.id));
  if (refused(result)) return result;
  return { ok: true };
});
