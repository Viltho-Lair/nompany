// CLIENT TAGS — Administration's Master data (22/09/2026).
//
// The route lives here because the collection does. Reading is open to any
// member the way the section's other reference data is: a tag is a name on a
// picker, and every screen that offers one needs the list. Writing answers to
// `administration.master.*`, asked inside each service call rather than once at
// the door — the shape the locations route beside this one settled on.
import { route, refused } from "@/platform/http/route";
import { masterContext } from "@/modules/administration/master";
import {
  listClientTags, createClientTag, editClientTag, removeClientTag,
} from "@/modules/administration/clientTags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", context: masterContext, body: true, name: "administration/client-tags" } as const;

export const GET = route(
  { auth: "studio", context: masterContext, name: "administration/client-tags" },
  async (master) => ({ ok: true, tags: await listClientTags(master) }),
);

export const POST = route(spec, async (master) => {
  const result = await createClientTag(master, master.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, tag: result.tag } };
});

export const PUT = route(spec, async (master) => {
  if (!master.body.id) return { error: "missing" };
  const result = await editClientTag(master, String(master.body.id), master.body);
  if (refused(result)) return result;
  return { ok: true, tag: result.tag };
});

// A DELETED TAG UNTAGS NOBODY. Clients and offers keep the id and stop
// resolving it — see the module header; the alternative is a write across a
// collection this section does not own.
export const DELETE = route(spec, async (master) => {
  if (!master.body.id) return { error: "missing" };
  const result = await removeClientTag(master, String(master.body.id));
  if (refused(result)) return result;
  return { ok: true };
});
