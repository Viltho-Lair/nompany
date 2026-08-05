import { getMedia } from "@/lib/media";
import { isAdminRequest, currentUser, unauthorized } from "@/lib/session";
import { isAdmin, hasTag } from "@/lib/auth";
import { HR_TAG } from "@/lib/authConstants";

export const runtime = "nodejs";

export async function GET(request, { params }) {
  const { id } = await params;
  const media = await getMedia(id);
  if (!media) return new Response("Not found", { status: 404 });

  if (media.visibility === "private") {
    if (media.owner) {
      // Owner-scoped scans (ID/passport): admin, HR, or the owning
      // employee's own linked user may view/download; nobody else.
      const user = await currentUser();
      const allowed = user && (isAdmin(user) || hasTag(user, HR_TAG) || user.id === media.owner);
      if (!allowed) return unauthorized();
    } else if (!(await isAdminRequest())) {
      // Legacy owner-less private media (e.g. application CVs) — any signed-in
      // staff member may download, as before.
      return unauthorized();
    }
  }

  const headers = new Headers();
  headers.set("Content-Type", media.contentType);
  headers.set("Content-Length", String(media.buffer.length));

  if (media.visibility === "private") {
    const safeName = String(media.filename || "download").replace(/[^\w.\-]+/g, "_");
    headers.set("Cache-Control", "private, no-store");
    headers.set("Content-Disposition", `attachment; filename="${safeName}"`);
  } else {
    // Public images are content-addressed (new upload = new id), so cache hard.
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
  }

  return new Response(media.buffer, { status: 200, headers });
}
