import { route } from "@/platform/http/route";
import { applicationCv } from "@/lib/data/careers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE ONE DOOR TO A CANDIDATE'S CV. It is stored private with no studio and no
// owner, so /api/media hands it to nobody; this answers only a SuperAdmin, only
// for the file an application names, and never lets a browser or proxy cache it.
export const GET = route({ auth: "super", name: "super/careers/applications/[id]/cv" }, async ({ params }) => {
  const cv = await applicationCv(params.id);
  if (!cv) return { error: "notfound" };
  const safeName = cv.filename.replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "cv";
  return new Response(new Uint8Array(cv.buffer), {
    headers: {
      "Content-Type": cv.contentType,
      "Content-Length": String(cv.buffer.length),
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
