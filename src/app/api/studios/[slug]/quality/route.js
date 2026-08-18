import {
  qualityGuard, listDocuments, listTypes, departmentCodes,
  DOC_STATUSES, STATUS_LABELS, DOC_LANGUAGES,
} from "@/lib/quality";
import { can } from "@/lib/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One read for the whole register.
export async function GET(request, ctx) {
  const g = await qualityGuard(ctx.params);
  if (g.fail) return g.fail;

  const [documents, types] = await Promise.all([listDocuments(g), listTypes(g)]);
  return Response.json({
    canManage: g.canManage,
    // Each button asks for the right it actually needs. Offering New off
    // canManage — which is true for anybody holding any write — is how a button
    // gets shown to somebody it will then refuse.
    canCreate: can(g.access, "quality.documents.create"),
    canEdit: can(g.access, "quality.documents.edit"),
    canDelete: can(g.access, "quality.documents.delete"),
    canSetup: g.canSetup,
    documents, types,
    departments: g.departments,
    departmentCodes: departmentCodes(g),
    nav: g.nav,
    me: { collaboratorId: g.collaborator.id },
    studio: { name: g.studio.name, slug: g.studio.slug },
    vocabulary: { statuses: DOC_STATUSES, statusLabels: STATUS_LABELS, languages: DOC_LANGUAGES },
  });
}
