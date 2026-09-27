import { route } from "@/platform/http/route";
import { deletePost, getPost, updatePost } from "@/lib/data/blog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "super", name: "super/blog/[id]" };

export const GET = route(spec, async ({ params }) => {
  const post = await getPost(params.id);
  return post ? { post } : { error: "notfound" };
});

// The whole post is sent on every save, and `cleanPost` decides what of it is
// kept — the editor holds no field the store does not know.
export const PUT = route({ ...spec, body: true }, async ({ params, body }) => {
  const out = await updatePost(params.id, body);
  if ("error" in out) return { error: out.error };
  return { ok: true, post: out.post };
});

export const DELETE = route(spec, async ({ params }) => {
  return (await deletePost(params.id)) ? { ok: true } : { error: "notfound" };
});
