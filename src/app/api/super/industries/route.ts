import { route } from "@/platform/http/route";
import { readIndustries } from "@/lib/data/industries";
import { addIndustry, profileSectionKeys, readIndustryRows } from "@/lib/data/industryAdmin";
import { FIELDS_OF_WORK } from "@/shared/fieldsOfWork";
import { SECTION_DEFS } from "@/platform/db/keys";
import { sectionName } from "@/shared/studio/sections";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE INDUSTRIES A COMPANY PICKS FROM, and each one's profile — the owner,
// 29/09/2026: "i need to control these industries, set in-active industries,
// and each industry will have its own profile, what sections and departments
// does it offer". lib/data/industryAdmin holds the rules; this is the door.

const spec = { auth: "super", name: "super/industries" };

const nameOf = (key: string) => {
  const def = SECTION_DEFS.find((d) => d.key === key) || SECTION_DEFS.flatMap((d) => d.children || []).find((c) => c.key === key);
  return sectionName(key, def?.name || key, "en");
};

export const GET = route(spec, async () => {
  const [industries, rows] = await Promise.all([readIndustries(), readIndustryRows()]);
  const changed = new Set(rows.map((r) => String(r.key)));
  return {
    industries: industries.map((i) => ({ ...i, customised: changed.has(i.key) })),
    // WHAT A PROFILE MAY NAME, sent with the list rather than restated in the
    // screen: the departments the create screen asks about, every section a
    // department may point at, and the setup templates a specialism may use.
    options: {
      sections: profileSectionKeys().map((key) => ({ key, name: nameOf(key) })),
      // A department points at ROOT sections, Administration included — the
      // shape every built-in chart uses.
      departmentSections: SECTION_DEFS.map((d) => ({ key: d.key, name: nameOf(d.key) })),
      fields: FIELDS_OF_WORK,
    },
  };
});

export const POST = route({ ...spec, body: true }, async ({ body }) => {
  const out = await addIndustry(body);
  if ("error" in out) return out;
  return { ok: true, industries: out.industries };
});
