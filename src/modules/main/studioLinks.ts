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

// A PATH NOW, NOT A QUERY, and it is the only one of these that is. Every other
// link below deep-links INTO a list: the screen reads the parameter, switches
// tab and rings the row. A client has its own page — /<slug>/crm-sales-clients/
// <id>, the same second-segment shape a ticket has — so pointing at the list and
// scrolling would be pointing past it. The `?client=` form still works where it
// was already used, because `useFocusedRecord("client")` on the list is
// untouched; nothing in the product emits it any more.
export const linkToClient = (slug: string, id: string) => (id ? `/${slug}/crm-sales-clients/${id}` : "");
export const linkToTicket = (slug: string, id: string) => (id ? to(slug, "crm-sales", { ticket: id }) : "");
export const linkToRfq = (slug: string, id: string) => (id ? to(slug, "engineering-docs", { rfq: id }) : "");
// crm-sales, not engineering-docs — quotations moved WITH the section
// (restructure.ts's SECTION_KEY_MAP), even though the RFQ they are raised
// from stays behind in Engineering & Documents.
export const linkToQuotation = (slug: string, id: string) => (id ? to(slug, "crm-sales", { quotation: id }) : "");
export const linkToProject = (slug: string, id: string) => (id ? to(slug, "projects", { project: id }) : "");

// A link is only offered when the person can actually open that section —
// otherwise it renders as plain text rather than a dead end.
export function linkIf(canSee: unknown, href: unknown) {
  return canSee ? href : "";
}
