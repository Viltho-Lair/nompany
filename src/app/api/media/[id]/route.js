import { currentUser } from "@/platform/auth/identity";
import { getStudioById } from "@/modules/main/studios";
import { getCollaboratorByUser } from "@/platform/auth/collaborators";
import { getMedia } from "@/lib/media";

export const runtime = "nodejs";

// Serve a stored file.
//
// THE GUARD THIS REPLACES asked whether ANYBODY was signed in:
//
//   if (media.visibility === "private" && !(await currentUser())) → 403
//
// which is not a question about entitlement. `putMedia` has always recorded an
// owner and no read path ever compared it, so every private blob on the
// platform was readable by every account on the platform — including one that
// signed up a minute earlier. Ids travel in src attributes, exported PDFs and
// generated documents, so they are not a secret.
//
// What is actually stored behind the private flag is the SIGNATURE GRAPHIC a
// reviewer or approver stamps on a controlled document (QualityWorkflow), which
// makes it the most sensitive image the product holds and the one this most
// needed to protect.
//
// WHY MEMBERSHIP AND NOT OWNERSHIP. Owner-only is the obvious fix and it is
// wrong here: a signature is stamped by one person and read by everyone else
// working to that document. The blob therefore records the STUDIO it was
// uploaded for, and membership of that studio is the test — the same rule that
// governs every other byte belonging to a tenant. A blob with no studio is
// personal (an account photo), and falls back to its owner.
export async function GET(request, ctx) {
  const { id } = await ctx.params;
  const media = await getMedia(id);
  if (!media) return new Response("Not found", { status: 404 });

  if (media.visibility === "private") {
    const denied = await refuse(media);
    if (denied) return denied;
  }

  return new Response(media.buffer, {
    headers: {
      "Content-Type": media.contentType,
      "Content-Length": String(media.size),
      "Cache-Control": media.visibility === "private" ? "private, no-store" : "public, max-age=31536000, immutable",
    },
  });
}

// Null when this caller may read it, a Response when they may not. 404 rather
// than 403 throughout: an id somebody guessed should not be confirmed as real.
async function refuse(media) {
  const user = await currentUser();
  if (!user) return new Response("Not found", { status: 404 });

  if (media.studioId) {
    // The membership question studioContext asks, without a slug to resolve
    // first — the id is already on the record.
    const studio = await getStudioById(media.studioId);
    const member = studio && (await getCollaboratorByUser(studio.id, user.id));
    return member ? null : new Response("Not found", { status: 404 });
  }

  // No studio: a personal file, readable by the account that uploaded it. An
  // OLD blob carries no owner either, and those stay refused rather than being
  // waved through — there are none in the live set, and guessing wrong in this
  // direction is how the original hole was written.
  return media.owner && media.owner === user.id ? null : new Response("Not found", { status: 404 });
}
