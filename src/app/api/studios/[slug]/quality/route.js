import {
  qualityGuard, listDocuments, listTypes, departmentCodes,
  DOC_STATUSES, STATUS_LABELS, DOC_LANGUAGES, listTemplates, callPointOptions,
  letterheadFor, fieldsFor,
} from "@/lib/quality";
import { can } from "@/lib/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One read for the whole register.
export async function GET(request, ctx) {
  const g = await qualityGuard(ctx.params);
  if (g.fail) return g.fail;

  const [documents, types, templates] = await Promise.all([listDocuments(g), listTypes(g), listTemplates(g)]);
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
    // The setup screen's routing table: which template each button runs.
    templates,
    callPoints: callPointOptions(templates),
    // The letterhead, and everything a slot in it may be set to: any field
    // this studio can resolve without a bound record, plus the tokens the
    // print engine fills in as it lays the pages out.
    letterhead: letterheadFor(g),
    slotFields: fieldsFor(g, null).fields.map((f) => ({ key: f.key, label: f.label, group: f.group })),
    departments: g.departments,
    departmentCodes: departmentCodes(g),
    nav: g.nav,
    me: { collaboratorId: g.collaborator.id },
    studio: { name: g.studio.name, slug: g.studio.slug },
    vocabulary: { statuses: DOC_STATUSES, statusLabels: STATUS_LABELS, languages: DOC_LANGUAGES },
  });
}
