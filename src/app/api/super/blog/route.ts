import { route } from "@/platform/http/route";
import { createPost, listPosts } from "@/lib/data/blog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// nompany's own blog, written from the console. `auth: "super"` is the whole
// gate: a SuperAdmin is its own identity, so no studio session can reach this.
const spec = { auth: "super", name: "super/blog" };

export const GET = route(spec, async () => ({ posts: await listPosts() }));

export const POST = route({ ...spec, body: true }, async ({ admin, body }) => {
  const out = await createPost(body, String(admin.name || admin.email || admin.id));
  if ("error" in out) return { error: out.error };
  return { status: 201, body: { ok: true, post: out.post } };
});
