// Cross-record links inside a studio.
//
// The modules are separate screens, so pointing at a record in another one means
// a deep link: /<slug>/<section>?<type>=<id>. Each module reads that parameter,
// switches to the right tab and highlights the record.
//
// Client-safe: no server imports.

const to = (slug: string, section: string, params: Record<string, unknown>) => {
  // Falsy values are dropped rather than sent empty — a link with `?id=` in it
  // reads as "this record" to a screen that then cannot find it.
  const q = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v).map(([k, v]) => [k, String(v)]),
  );
  const query = q.toString();
  return `/${slug}/${section}${query ? `?${query}` : ""}`;
};

export const linkToClient = (slug: string, id: string) => (id ? to(slug, "sales", { client: id }) : "");
export const linkToTicket = (slug: string, id: string) => (id ? to(slug, "sales", { ticket: id }) : "");
export const linkToRfq = (slug: string, id: string) => (id ? to(slug, "technical", { rfq: id }) : "");
export const linkToQuotation = (slug: string, id: string) => (id ? to(slug, "technical", { quotation: id }) : "");
export const linkToProject = (slug: string, id: string) => (id ? to(slug, "projects", { project: id }) : "");

// A link is only offered when the person can actually open that section —
// otherwise it renders as plain text rather than a dead end.
export function linkIf(canSee: unknown, href: unknown) {
  return canSee ? href : "";
}
