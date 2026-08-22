// A DEPARTMENT IS A SECTION. Client-safe, so the screens can name one without
// pulling the Redis-backed section store into the browser bundle.
//
// HR used to keep a `departments` collection of its own: rows somebody typed,
// with a name, a code and a description, that existed alongside the sections
// the studio was already divided into. Every studio therefore had its structure
// written down twice — once as the nav the work actually happens in, once as a
// list in HR — and the two only ever agreed on the day somebody typed them.
// Putting a person "in Sales" meant picking the HR row called Sales, which had
// nothing to do with whether they could open Sales.
//
// So there is no list to maintain any more. The studio's TOP-LEVEL SECTIONS are
// its departments, which means turning a department on and off is the same act
// as turning the section on and off, and there is nothing to keep in step.
//
// THE ID IS THE SECTION KEY. A department has no row and therefore no id of its
// own; `departmentId` on a person now holds "sales", not "dep_xyz". Every
// caller kept its field name, because the question it asks — which department
// is this person in — did not change.
//
// Main is the studio's home screen rather than somewhere anybody works, so it
// is not offered as a department. A section switched off is not offered either:
// nobody can be placed in a part of the studio that is not running.
const NOT_A_DEPARTMENT = new Set(["main"]);

/**
 * WHAT A DEPARTMENT LOOKS LIKE FROM HERE. Declared locally rather than imported
 * from platform/db: this file is client-safe by design — see the note at the
 * top — and while `import type` is erased, a structural type keeps the promise
 * literally rather than on a technicality.
 */
type SectionLike = { key: string; name?: string; parentId?: unknown; enabled?: unknown };

export function departmentsFromSections(sections: SectionLike[] | null | undefined) {
  return (sections || [])
    .filter((s) => !s.parentId && s.enabled !== false && !NOT_A_DEPARTMENT.has(s.key))
    .map((s) => ({ id: s.key, name: s.name || s.key }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Whether a stored departmentId still names a live section. A person placed in
// a section that has since been switched off keeps the value on their row —
// deleting it would be this module deciding to lose data — but the screens read
// it back through here and say "not placed" rather than printing a bare key.
export function departmentName(
  departments: { id: string; name: string }[] | null | undefined,
  id: string,
) {
  return (departments || []).find((d) => d.id === id)?.name || "";
}
