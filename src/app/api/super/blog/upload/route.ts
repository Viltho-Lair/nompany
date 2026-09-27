import { route } from "@/platform/http/route";
import { putMedia } from "@/lib/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A COVER OR AN IMAGE FOR A POST, uploaded from the console.
//
// /api/media answers to a studio user (`currentUser`), and a SuperAdmin is not
// one, so the console needs its own door. It is IMAGES ONLY — a post shows
// pictures, and anything else uploaded here would be served publicly under
// nompany's name — and PUBLIC, because every visitor reads a post. The size cap
// is putMedia's own. The answer is the `/api/media/<id>` path the post stores,
// which is the only kind of source `cleanPost` accepts.
const IMAGE = /^image\/(png|jpeg|webp|gif|avif)$/;

export const POST = route({ auth: "super", name: "super/blog/upload" }, async ({ admin, request }) => {
  const form = await request.formData().catch(() => null);
  const part = form?.get("file");
  if (!part || typeof part === "string") return { error: "no-file" };
  if (!IMAGE.test(part.type)) return { error: "not-an-image" };
  const out = await putMedia({
    buffer: Buffer.from(await part.arrayBuffer()),
    contentType: part.type,
    filename: part.name,
    visibility: "public",
    owner: String(admin.id),
    studioId: "",
  });
  if ("error" in out) return { error: out.error };
  return { status: 201, body: { ok: true, src: out.url } };
});
