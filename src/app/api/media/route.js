import { currentUser } from "@/lib/identity";
import { studioContext } from "@/lib/studios";
import { putMedia } from "@/lib/media";

export const runtime = "nodejs";

// Upload a file. Signed-in users only — uploads are never anonymous.
//
// A PRIVATE UPLOAD MUST NAME ITS STUDIO. Private means "only this tenant may
// read it", and the read path has to have something to check membership
// against; without a studio on the record the only defensible fallback is
// owner-only, which would break the one feature that uses private blobs — a
// signature stamped by one person and read by everyone else working to that
// document.
//
// The slug is verified here rather than trusted: studioContext refuses a
// non-member, so nobody can file a blob into a studio they are not in and have
// it served to that studio's people.
export async function POST(request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file.arrayBuffer !== "function") {
    return Response.json({ error: "no-file" }, { status: 400 });
  }

  const url = new URL(request.url);
  const isPrivate = url.searchParams.get("kind") === "private";
  const slug = String(form?.get("slug") || url.searchParams.get("slug") || "").trim();

  let studioId = "";
  if (slug) {
    const context = await studioContext(user, slug);
    if (context.error) {
      return Response.json({ error: context.error }, { status: context.error === "notfound" ? 404 : 403 });
    }
    studioId = context.studio.id;
  } else if (isPrivate) {
    // Refused rather than quietly stored as a personal file: a private upload
    // with no studio would be readable only by the uploader, so the signature
    // would silently fail to render for everybody else — a bug that shows up
    // as a missing image on a signed document rather than as an error here.
    return Response.json({ error: "studio-required" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await putMedia({
    buffer,
    contentType: file.type,
    filename: file.name,
    visibility: isPrivate ? "private" : "public",
    owner: user.id,
    studioId,
  });
  if (result.error) {
    return Response.json({ error: result.error }, { status: result.error === "too-large" ? 413 : 400 });
  }
  return Response.json(result, { status: 201 });
}
