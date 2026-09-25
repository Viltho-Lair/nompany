import { PAGES, urlFor } from "@/lib/seo";
import { companyCopy, BRAND, BRAND_AR } from "@/shared/marketing/company";
import { liveDepartments } from "@/shared/marketing/departments";
import lastmod from "../sitemap-lastmod.json";

/* /llms.txt — THE SITE, DESCRIBED FOR AI SEARCH (llmstxt.org).
   ------------------------------------------------------------------
   It 404'd, and an external scanner read the 404 page's HTML as the file and
   called it "too thin to cite". What an assistant quoting nompany should read is
   the same thing the site says, so this file WRITES NOTHING OF ITS OWN: the
   sentence is `company.ts`'s, the departments are the list the platform page
   renders, and every link and its line are the page's own <title> and meta
   description. A hand-typed markdown file in /public would be a second copy of
   every claim on the site, free to go stale the way the platform title did.

   NO PRICE, NO COUNT. Both change in /super or with a deploy; the pricing link
   is where a current figure lives. The customers page is left out for the
   sitemap's reason — it is empty until a company agrees to be named.

   A ROUTE AND NOT A PAGE. Its path has a dot, so `proxy.js`'s matcher never
   treats it as a studio slug, and nothing under the root layout (which reads a
   cookie) is involved, so it can be static. */
export const dynamic = "force-static";

const PATHS = Object.keys(lastmod).filter((p) => p !== "/customers");

function section(locale: "en" | "ar") {
  const lines: string[] = [];
  for (const path of PATHS) {
    const page = PAGES[path]?.[locale];
    if (!page) continue;
    lines.push(`- [${page.title}](${urlFor(locale, path)}): ${page.description}`);
  }
  return lines.join("\n");
}

export function GET() {
  const body = [
    `# ${BRAND} (${BRAND_AR})`,
    "",
    `> ${companyCopy("en").description}`,
    "",
    `Departments: ${liveDepartments("en").map((d) => d.name).join(", ")}.`,
    "",
    "## Pages (English)",
    "",
    section("en"),
    "",
    "## الصفحات (العربية)",
    "",
    `> ${companyCopy("ar").description}`,
    "",
    section("ar"),
    "",
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
