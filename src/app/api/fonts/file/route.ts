import { GOOGLE_FILES, fontContentType, validFilePath } from "@/lib/docs/fontProxy";

/**
 * One font file, fetched from fonts.gstatic.com by our server. The path is
 * checked against the one shape css2 hands out before anything is fetched, so
 * this is a proxy for Google's font files and cannot be pointed at anything
 * else. `lib/docs/fontProxy.ts` says why it exists.
 *
 * A file's path carries its version (`s/inter/v20/…`), so a given URL never
 * changes content — cached for a year and marked immutable.
 */

const YEAR = 60 * 60 * 24 * 365;

export async function GET(request: Request) {
  const path = new URL(request.url).searchParams.get("p");
  if (!validFilePath(path)) {
    return Response.json({ error: "invalid-path" }, { status: 400 });
  }

  const response = await fetch(`${GOOGLE_FILES}${path}`);
  if (!response.ok || !response.body) {
    return Response.json(
      { error: `Google Fonts returned ${response.status}` },
      { status: response.status === 404 ? 404 : 502 },
    );
  }

  return new Response(response.body, {
    headers: {
      "Content-Type": fontContentType(path),
      "Cache-Control": `public, max-age=${YEAR}, immutable`,
    },
  });
}
