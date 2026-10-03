import { route } from "@/platform/http/route";
import { SECTION_DEFS, isSystemSection } from "@/platform/db/keys";
import { lockableKeys, readReleaseLocks, writeReleaseLocks } from "@/platform/db/releaseLocks";
import { listStudios } from "@/modules/main/studios";
import { byOf } from "@/lib/data/industryAdmin";
import { sectionName } from "@/shared/studio/sections";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// SECTIONS STILL BEING BUILT — the owner, 03/10/2026: "there should be a way in
// /super to lock these sections and their subsections entirely for studio to
// not be able to see undergoing improvements". The rules are in
// platform/db/releaseLocks; this is the console's door onto them.
//   GET  the section tree, what is locked, and the studios that may preview
//   PUT  { locked, previewStudios } — replaces both

const spec = { auth: "super", name: "super/section-locks" };

export const GET = route(spec, async () => {
  const allowed = new Set(lockableKeys());
  const studios = (await listStudios()) as { id?: unknown; name?: unknown; slug?: unknown }[];
  return {
    locks: await readReleaseLocks(),
    // The tree in the product's order, lockable keys only — Main, Approvals and
    // Administration never appear, because they can never be locked.
    sections: SECTION_DEFS.filter((d) => allowed.has(d.key)).map((d) => ({
      key: d.key,
      name: sectionName(d.key, d.name, "en"),
      children: (d.children || []).filter((c) => allowed.has(c.key) && !isSystemSection(c.key))
        .map((c) => ({ key: c.key, name: sectionName(c.key, c.name, "en") })),
    })),
    studios: studios.map((s) => ({ id: String(s.id || ""), name: String(s.name || ""), slug: String(s.slug || "") }))
      .filter((s) => s.id),
  };
});

export const PUT = route({ ...spec, body: true }, async ({ body, admin }) => {
  const locks = await writeReleaseLocks(body, byOf(admin));
  return { ok: true, locks };
});
