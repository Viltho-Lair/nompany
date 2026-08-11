import { currentUser } from "@/lib/identity";
import { getMedia } from "@/lib/media";

export const runtime = "nodejs";

// Serve a stored file. Public blobs are open (an <img> request carries no
// session); private ones require a signed-in requester.
export async function GET(request, ctx) {
  const { id } = await ctx.params;
  const media = await getMedia(id);
  if (!media) return new Response("Not found", { status: 404 });

  if (media.visibility === "private" && !(await currentUser())) {
    return new Response("Forbidden", { status: 403 });
  }
  return new Response(media.buffer, {
    headers: {
      "Content-Type": media.contentType,
      "Content-Length": String(media.size),
      "Cache-Control": media.visibility === "private" ? "private, no-store" : "public, max-age=31536000, immutable",
    },
  });
}
