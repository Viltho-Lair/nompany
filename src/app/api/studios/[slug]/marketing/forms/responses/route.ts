// WHAT PEOPLE ANSWERED A FORM — ?id=<form>. JSON for the Responses tab, or with
// &format=csv the file: every reply, with the byte-order mark Excel needs to
// read Arabic, the product's one download format.
import { route, refused } from "@/platform/http/route";
import { marketingContext } from "@/modules/marketing/campaigns";
import { formResponses } from "@/modules/marketing/forms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({ auth: "studio", context: marketingContext, name: "marketing-form-responses" }, async (m) => {
  const url = new URL(m.request.url);
  const result = await formResponses(m, url.searchParams.get("id") || "");
  if (refused(result)) return result;
  if (url.searchParams.get("format") === "csv") {
    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(String.fromCharCode(0xfeff) + result.csv(), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${m.studio.slug}-form-responses-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }
  const { csv: _csv, ...body } = result;
  return { ok: true, ...body };
});
