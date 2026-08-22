import { route } from "@/platform/http/route";
import { canAdminister } from "@/lib/studios";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Entering a studio by its address. The slug names the tenant; MEMBERSHIP
// authorises it. A slug is a public address, so 404-for-missing and
// 403-for-non-member are both honest — what a non-member learns is nothing
// about the CONTENTS, which is what the refusal above protects.
//
// `sections` COMES FROM THE CONTEXT, not from a second read. This route used to
// call listSections(studio.id) itself, immediately after studioContext had
// already fetched exactly that and handed it over — a whole round trip spent
// re-reading a value the caller was holding. It is the smallest possible
// instance of the audit's largest finding, and the wrapper deletes it by simply
// passing the context through.
export const GET = route(
  { auth: "studio", name: "studios/[slug]" },
  async ({ studio, collaborator, access, sections }) => ({
    studio: { id: studio.id, name: studio.name, slug: studio.slug },
    // "Me, inside THIS studio" — alias/role exist only here.
    me: {
      collaboratorId: collaborator.id,
      alias: collaborator.alias,
      role: collaborator.role,
      canAdminister: canAdminister(access),
    },
    sections: sections.map((s) => ({ id: s.id, key: s.key, name: s.name, enabled: s.enabled })),
  }),
);
