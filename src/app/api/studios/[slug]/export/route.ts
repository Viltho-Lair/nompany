import { route } from "@/platform/http/route";
import { exportStudio } from "@/lib/data/studioExport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// DOWNLOAD EVERYTHING, for the studio's OWNER (lib/data/studioExport says what
// is in the file and why). A read, so a closed studio answers it and so does a
// shut-down one — the subscription gate lets the owner read there, which is
// the whole point: download-everything is what a shut-down owner is left with.
//
// OWNER ONLY, not a permission. The file is every record the studio holds,
// every client's details in the clear among them; no grantable right should
// hand that to a member, however senior.
export const GET = route({ auth: "studio", name: "studio/export", keys: false }, async (c) => {
  const { studio, collaborator } = c as unknown as { studio: { id: string; slug?: unknown }; collaborator: { role?: unknown } };
  if (collaborator?.role !== "owner") return { error: "owner-only" };
  const data = await exportStudio(studio.id);
  if (!data) return { error: "notfound" };
  const day = data.exportedAt.slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="nompany-${String(studio.slug || studio.id)}-${day}.json"`,
      "Cache-Control": "no-store",
    },
  });
});
