// WEBSITE — the studio's own public face, and what arrives back through it.
//
// Rows live under the studio's *website section*:
//   s:<StudioID>:sec:<SectionID>:c:siteProfile      (exactly one row)
//   s:<StudioID>:sec:<SectionID>:c:services
//   s:<StudioID>:sec:<SectionID>:c:previousProjects
//   s:<StudioID>:sec:<SectionID>:c:messages         (inbound, from the public form)
//
// PUBLISHING IS OPT-IN AND EXPLICIT. Nothing here is visible to the world until
// someone sets published = true, and an unpublished profile 404s rather than
// showing a shell — an address that exists but is empty is worse than one that
// doesn't. The public page is served from /c/<slug>, kept off the root so it can
// never collide with the private studio at /<slug>.
//
// The public reader is a SEPARATE PATH: publicProfile() takes no user, checks
// only the published flag, and returns nothing but the fields meant for the
// page. No studio internals are reachable through it.

import { getSectionByKey, readCol, addRow, updateRow, deleteRow, listGrants, listSections } from "@/lib/data/sections";
import { studioContext, canViewSection, canManageSection, sectionNav } from "@/lib/studios";
import { getStudioBySlug } from "@/lib/data/studios";
import { currentUser } from "@/lib/identity";

const PROFILE = "siteProfile";
const SERVICES = "services";
const SHOWCASE = "previousProjects";
const MESSAGES = "messages";

export const MESSAGE_STATUSES = ["New", "Read", "Replied", "Archived"];

const str = (v, max = 300) => String(v ?? "").trim().slice(0, max);
const url = (v) => {
  const s = str(v, 500);
  // Only http(s) — a javascript: or data: URL in a published page is an attack,
  // not a link.
  return /^https?:\/\//i.test(s) ? s : "";
};

export async function websiteContext(user, slug) {
  const context = await studioContext(user, slug);
  if (context.error) return context;
  const { studio, collaborator } = context;

  const section = await getSectionByKey(studio.id, "website");
  if (!section) return { error: "no-section" };

  const [grants, sections] = await Promise.all([listGrants(studio.id), listSections(studio.id)]);
  if (!canViewSection(studio, collaborator, section.id, grants)) return { error: "forbidden" };

  return {
    studio, collaborator, section,
    canManage: canManageSection(studio, collaborator, section.id, grants),
    nav: sectionNav(studio, collaborator, sections, grants),
  };
}

export async function websiteGuard(paramsPromise, { write } = {}) {
  const user = await currentUser();
  if (!user) return { fail: Response.json({ error: "unauthorized" }, { status: 401 }) };
  const { slug } = await paramsPromise;
  const web = await websiteContext(user, slug);
  if (web.error) {
    const status = web.error === "notfound" || web.error === "no-section" ? 404 : 403;
    return { fail: Response.json({ error: web.error }, { status }) };
  }
  if (write && !web.canManage) return { fail: Response.json({ error: "read-only" }, { status: 403 }) };
  return web;
}

// ---- the profile (exactly one row) -----------------------------------------
const BLANK = {
  published: false,
  headline: "", intro: "", about: "",
  email: "", phone: "", addressText: "", mapUrl: "",
  website: "", linkedin: "",
};

export async function getProfile({ studio, section }) {
  const rows = await readCol(studio.id, section.id, PROFILE);
  return rows[0] ? { ...BLANK, ...rows[0] } : null;
}

// Created on first save, so an untouched studio carries no website row at all.
export async function saveProfile(ctx, body) {
  const { studio, section } = ctx;
  const patch = {};
  for (const f of ["headline", "email", "phone", "addressText"]) if (body?.[f] !== undefined) patch[f] = str(body[f], 200);
  if (body?.intro !== undefined) patch.intro = str(body.intro, 500);
  if (body?.about !== undefined) patch.about = str(body.about, 4000);
  for (const f of ["mapUrl", "website", "linkedin"]) if (body?.[f] !== undefined) patch[f] = url(body[f]);

  if (body?.published !== undefined) {
    const published = Boolean(body.published);
    // Refusing to publish an empty page is kinder than publishing one.
    if (published) {
      const headline = patch.headline ?? (await getProfile(ctx))?.headline ?? "";
      if (!headline) return { error: "headline" };
    }
    patch.published = published;
  }

  const existing = await getProfile(ctx);
  if (!existing) {
    const created = await addRow(studio.id, section.id, PROFILE, { ...BLANK, ...patch, createdAt: new Date().toISOString() });
    return { profile: created };
  }
  const updated = await updateRow(studio.id, section.id, PROFILE, existing.id, patch);
  return { profile: updated };
}

// ---- services --------------------------------------------------------------
export async function listServices({ studio, section }) {
  const rows = await readCol(studio.id, section.id, SERVICES);
  return [...rows].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || (a.title || "").localeCompare(b.title || ""));
}

export async function createService(ctx, body) {
  const { studio, section } = ctx;
  const title = str(body?.title, 160);
  if (!title) return { error: "title" };
  const rows = await readCol(studio.id, section.id, SERVICES);
  const service = await addRow(studio.id, section.id, SERVICES, {
    title,
    summary: str(body?.summary, 600),
    sortOrder: rows.length,
    createdAt: new Date().toISOString(),
  });
  return { service };
}

export async function editService(ctx, id, body) {
  const patch = {};
  if (body?.title !== undefined) { const v = str(body.title, 160); if (!v) return { error: "title" }; patch.title = v; }
  if (body?.summary !== undefined) patch.summary = str(body.summary, 600);
  if (body?.sortOrder !== undefined) patch.sortOrder = Number(body.sortOrder) || 0;
  const service = await updateRow(ctx.studio.id, ctx.section.id, SERVICES, id, patch);
  return service ? { service } : { error: "notfound" };
}

export async function removeService(ctx, id) {
  const removed = await deleteRow(ctx.studio.id, ctx.section.id, SERVICES, id);
  return removed ? { ok: true } : { error: "notfound" };
}

// ---- showcase --------------------------------------------------------------
export async function listShowcase({ studio, section }) {
  const rows = await readCol(studio.id, section.id, SHOWCASE);
  return [...rows].sort((a, b) => (b.year || "").localeCompare(a.year || "") || (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export async function createShowcase(ctx, body) {
  const { studio, section } = ctx;
  const title = str(body?.title, 200);
  if (!title) return { error: "title" };
  const item = await addRow(studio.id, section.id, SHOWCASE, {
    title,
    // The client name is typed here on purpose. A public page must never
    // silently expose the CRM: naming a client publicly is a decision.
    clientName: str(body?.clientName, 160),
    summary: str(body?.summary, 1000),
    year: /^\d{4}$/.test(String(body?.year || "")) ? String(body.year) : "",
    location: str(body?.location, 160),
    createdAt: new Date().toISOString(),
  });
  return { item };
}

export async function editShowcase(ctx, id, body) {
  const patch = {};
  if (body?.title !== undefined) { const v = str(body.title, 200); if (!v) return { error: "title" }; patch.title = v; }
  if (body?.clientName !== undefined) patch.clientName = str(body.clientName, 160);
  if (body?.summary !== undefined) patch.summary = str(body.summary, 1000);
  if (body?.location !== undefined) patch.location = str(body.location, 160);
  if (body?.year !== undefined) patch.year = /^\d{4}$/.test(String(body.year)) ? String(body.year) : "";
  const item = await updateRow(ctx.studio.id, ctx.section.id, SHOWCASE, id, patch);
  return item ? { item } : { error: "notfound" };
}

export async function removeShowcase(ctx, id) {
  const removed = await deleteRow(ctx.studio.id, ctx.section.id, SHOWCASE, id);
  return removed ? { ok: true } : { error: "notfound" };
}

// ---- inbox -----------------------------------------------------------------
export async function listMessages({ studio, section }) {
  const rows = await readCol(studio.id, section.id, MESSAGES);
  return [...rows].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export async function setMessageStatus(ctx, id, status) {
  if (!MESSAGE_STATUSES.includes(status)) return { error: "status" };
  const message = await updateRow(ctx.studio.id, ctx.section.id, MESSAGES, id, { status });
  return message ? { message } : { error: "notfound" };
}

export async function removeMessage(ctx, id) {
  const removed = await deleteRow(ctx.studio.id, ctx.section.id, MESSAGES, id);
  return removed ? { ok: true } : { error: "notfound" };
}

// ---- the public side -------------------------------------------------------
// No user, no session, no studio internals. Resolves a slug to a PUBLISHED
// profile and returns only what the page renders.
export async function publicProfile(slug) {
  const studio = await getStudioBySlug(slug);
  if (!studio) return null;

  const section = await getSectionByKey(studio.id, "website");
  if (!section) return null;

  const rows = await readCol(studio.id, section.id, PROFILE);
  const profile = rows[0];
  if (!profile?.published) return null;

  const [services, showcase] = await Promise.all([
    listServices({ studio, section }),
    listShowcase({ studio, section }),
  ]);

  return {
    name: studio.name,
    slug: studio.slug,
    headline: profile.headline || "",
    intro: profile.intro || "",
    about: profile.about || "",
    contact: {
      email: profile.email || "",
      phone: profile.phone || "",
      addressText: profile.addressText || "",
      mapUrl: profile.mapUrl || "",
      website: profile.website || "",
      linkedin: profile.linkedin || "",
    },
    services: services.map((s) => ({ id: s.id, title: s.title, summary: s.summary })),
    showcase: showcase.map((p) => ({ id: p.id, title: p.title, clientName: p.clientName, summary: p.summary, year: p.year, location: p.location })),
  };
}

// A message from the public contact form. Only reachable for a PUBLISHED
// profile, so an unpublished studio cannot be used as an anonymous drop box.
export async function receiveMessage(slug, body) {
  const studio = await getStudioBySlug(slug);
  if (!studio) return { error: "notfound" };

  const section = await getSectionByKey(studio.id, "website");
  if (!section) return { error: "notfound" };

  const rows = await readCol(studio.id, section.id, PROFILE);
  if (!rows[0]?.published) return { error: "notfound" };

  const name = str(body?.name, 120);
  const email = str(body?.email, 160).toLowerCase();
  const message = str(body?.message, 4000);
  if (!name || !email || !message) return { error: "incomplete" };
  if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)) return { error: "email" };

  const row = await addRow(studio.id, section.id, MESSAGES, {
    name, email, message,
    phone: str(body?.phone, 40),
    subject: str(body?.subject, 200),
    status: "New",
    createdAt: new Date().toISOString(),
  });
  return { ok: true, id: row.id };
}

export function summarise(profile, services, showcase, messages) {
  return {
    published: Boolean(profile?.published),
    services: services.length,
    showcase: showcase.length,
    unread: messages.filter((m) => m.status === "New").length,
    messages: messages.length,
  };
}
