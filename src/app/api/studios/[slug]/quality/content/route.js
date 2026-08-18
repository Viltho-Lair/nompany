import {
  qualityGuard, openDraft, saveDraft, acquireLock, releaseLock, lockState,
  listTypes, departmentCodes, LOCK_TTL_SEC,
} from "@/lib/quality";
import { can } from "@/lib/access";
import { MERGE_FIELDS } from "@/lib/qualityContent";
import { listCollaborators } from "@/lib/data/collaborators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const body = async (request) => { try { return await request.json(); } catch { return {}; } };

const status = (error) => {
  if (error === "forbidden") return 403;
  if (error === "unknown-permission") return 500;
  if (error === "notfound") return 404;
  // Somebody else is holding the document. Not a bad request and not a
  // permission problem — a conflict, which is what 409 is for.
  if (error === "locked") return 409;
  return 400;
};

// The builder's one read: the document, its draft, who holds it, and everything
// the merge-field menu needs to show real values rather than placeholders.
export async function GET(request, ctx) {
  const g = await qualityGuard(ctx.params);
  if (g.fail) return g.fail;

  const id = new URL(request.url).searchParams.get("id") || "";
  if (!id) return Response.json({ error: "missing" }, { status: 400 });

  const opened = await openDraft(g, id);
  if (opened.error) return Response.json({ error: opened.error }, { status: status(opened.error) });

  const [types, people, lock] = await Promise.all([
    listTypes(g), listCollaborators(g.studio.id), lockState(g, id),
  ]);
  const type = types.find((t) => t.id === opened.document.typeId);
  const department = g.departments.find((d) => d.id === opened.document.departmentId);
  const owner = people.find((c) => c.id === opened.document.ownerCollaboratorId);

  // Merge fields are RESOLVED HERE, not stored, so what the editor previews is
  // read from the studio on every open — the same values the renderer will use.
  const values = {
    "company.name": g.studio.name || "",
    "company.address": g.studio.location || "",
    "company.country": g.studio.country || "",
    "company.city": g.studio.city || "",
    "document.code": opened.document.code || "",
    "document.title": opened.document.title || "",
    "document.revision": String(opened.draft?.rev ?? opened.document.revision ?? ""),
    "document.type": type?.name || "",
    "document.department": department?.name || "",
    "document.owner": owner?.alias || "",
    "document.effectiveDate": opened.document.effectiveDate || "",
    "document.nextReviewDate": opened.document.nextReviewDate || "",
  };

  return Response.json({
    document: {
      ...opened.document,
      typeName: type?.name || "",
      departmentName: department?.name || "",
      ownerAlias: owner?.alias || "",
    },
    sections: opened.sections,
    revision: opened.draft
      ? { id: opened.draft.id, rev: opened.draft.rev, state: opened.draft.state, updatedAt: opened.draft.updatedAt }
      : null,
    lock: { ...lock, ttl: LOCK_TTL_SEC },
    canEdit: can(g.access, "quality.documents.edit"),
    mergeFields: MERGE_FIELDS,
    mergeValues: values,
    codeParts: { department: departmentCodes(g)[opened.document.departmentId] || "", prefix: type?.prefix || "" },
    me: { collaboratorId: g.collaborator.id },
    studio: { name: g.studio.name, slug: g.studio.slug },
  });
}

// Save the draft. Also the heartbeat: somebody typing is plainly still here,
// so the lock is re-armed on the way through rather than on a second timer.
export async function PUT(request, ctx) {
  const g = await qualityGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;
  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });

  const result = await saveDraft(g, b.id, b);
  if (result.error) {
    return Response.json({ error: result.error, lock: result.lock }, { status: status(result.error) });
  }
  return Response.json({ ok: true, sections: result.sections, updatedAt: result.revision.updatedAt });
}

// Taking and letting go of the document. Separate from the save so a reader can
// open a document without claiming it.
export async function POST(request, ctx) {
  const g = await qualityGuard(ctx.params, { write: true });
  if (g.fail) return g.fail;
  const b = await body(request);
  if (!b.id) return Response.json({ error: "missing" }, { status: 400 });

  if (b.action === "release") return Response.json(await releaseLock(g, b.id));

  const result = await acquireLock(g, b.id, { force: b.action === "take-over" });
  if (result.error) {
    return Response.json({ error: result.error, lock: result.lock }, { status: status(result.error) });
  }
  return Response.json({ ok: true, lock: result.lock, tookOverFrom: result.tookOverFrom || "" });
}
