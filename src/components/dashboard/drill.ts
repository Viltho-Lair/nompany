// Turn a dashboard figure into a link into the department screen that OWNS its
// rows, carrying an optional filter as a query the screen reads. No transaction
// table is duplicated inside a dashboard — the department screen already lists.
export function drillHref(slug: string, sectionKey: string, filter?: Record<string, string>): string {
  const base = `/${slug}/${sectionKey}`;
  if (!filter || Object.keys(filter).length === 0) return base;
  return `${base}?${new URLSearchParams(filter).toString()}`;
}
