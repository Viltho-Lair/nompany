import { route } from "@/platform/http/route";
import { readArr } from "@/platform/db/store";
import { REG } from "@/platform/db/keys";
import { extract, type Scope } from "@/platform/db/migrate/extract";
import { emitSql } from "@/platform/db/migrate/emit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// A full-database export is a whole-production scan; give it room. Effective only
// on plans that allow a longer function — harmless elsewhere. The per-studio path
// (?studio=…) is the always-bounded one and never needs it.
export const maxDuration = 300;

// THE DATABASE, AS A DOWNLOADABLE .sql FILE.
//
//   /api/super/migration/export              → the whole database (all studios,
//                                              platform registries, user records)
//   /api/super/migration/export?studio=<id>  → one studio's records
//
// Owner-only, like every /super route: the session is verified against the stored
// SuperAdmin token, not merely presented. It is READ-ONLY over Redis — extract
// calls only getJSON / hGetAll / scanPrefix — and returns a raw streamed Response,
// which the wrapper passes through untouched apart from the request id.
//
// The body is a self-contained SQL Server dump: guarded CREATE TABLE + batched
// INSERTs, ids preserved verbatim (see db/migrate/*). Load it into an empty
// database to reconstruct the current state.
export const GET = route({ auth: "super", name: "super/migration/export" }, async ({ request }) => {
  const studioId = new URL(request.url).searchParams.get("studio")?.trim() || "";

  // A named studio that does not exist is a 404, not an empty file that looks like
  // success. The whole-database path names no studio and skips this.
  let scope: Scope = { kind: "all" };
  let label = "full";
  if (studioId) {
    const studios = await readArr<{ id?: string; slug?: string }>(REG.studios);
    const found = studios.find((s) => s.id === studioId);
    if (!found) return { error: "notfound" };
    scope = { kind: "studio", studioId };
    label = found.slug || studioId;
  }

  const { tables } = await extract(scope);

  const generatedAt = new Date().toISOString();
  const meta = { scope: studioId ? `studio ${label}` : "full database", generatedAt };
  const filename = `nompany-${label}-${generatedAt.slice(0, 10)}.sql`;

  // Stream the rendered SQL chunk by chunk. Extraction has already run (its the
  // heavy part); streaming the text keeps the rendered dump from being buffered
  // whole on top of the rows it is rendered from.
  const gen = emitSql(tables, meta);
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      const next = gen.next();
      if (next.done) controller.close();
      else controller.enqueue(encoder.encode(next.value));
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/sql; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
});
