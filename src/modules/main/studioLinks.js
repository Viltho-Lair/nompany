// Cross-record links inside a studio.
//
// The modules are separate screens, so pointing at a record in another one means
// a deep link: /<slug>/<section>?<type>=<id>. Each module reads that parameter,
// switches to the right tab and highlights the record.
//
// Client-safe: no server imports.

const to = (slug, section, params) => {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v));
  const query = q.toString();
  return `/${slug}/${section}${query ? `?${query}` : ""}`;
};

export const linkToClient = (slug, id) => (id ? to(slug, "sales", { client: id }) : "");
export const linkToTicket = (slug, id) => (id ? to(slug, "sales", { ticket: id }) : "");
export const linkToRfq = (slug, id) => (id ? to(slug, "technical", { rfq: id }) : "");
export const linkToQuotation = (slug, id) => (id ? to(slug, "technical", { quotation: id }) : "");
export const linkToProject = (slug, id) => (id ? to(slug, "projects", { project: id }) : "");

// A link is only offered when the person can actually open that section —
// otherwise it renders as plain text rather than a dead end.
export function linkIf(canSee, href) {
  return canSee ? href : "";
}
