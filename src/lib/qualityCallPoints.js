// WHERE A DOCUMENT IS ASKED FOR.
//
// A template used to say which KIND of record it was about, and that turned out
// to be the wrong half of the question. What matters is the place somebody
// stands when they ask for the document: the Print button in the Quotation
// Viewer. Knowing that answers four things at once — which record is in hand,
// which template to run, who may press it, and where the graph starts — where
// "it is about a quotation" answers only the first.
//
// DECLARED IN CODE, NEVER TYPED. A call point is a contract with a button that
// exists in the source. Let a studio invent one and it binds a template to a
// button nobody built, and nothing anywhere can tell them — the same reason the
// permission catalogue is a list in a file rather than a field on a form.
//
// The ID IS STABLE AND THE CAPTION IS NOT. A studio may label the button
// whatever it likes; the id is what the template holds, so relabelling never
// orphans a binding.

export const CALL_POINTS = [
  {
    id: "quotation.print",
    // What it is called where it lives. The caption on the button is the
    // studio's business; this is how it is described in setup.
    label: "Quotation viewer — Print",
    where: "Sales → ticket → quotation",
    // THE RECORD HANDED OVER. The template's subject is derived from this
    // rather than chosen separately: a button in the quotation viewer hands
    // over a quotation, and a template bound to it that thought it was about
    // something else would resolve nothing.
    subject: "quotation",
    // The right to be standing there at all. Generating additionally needs
    // quality.documents.create and the subject's own right, both enforced in
    // generateDocument — this is only about reaching the button.
    permission: "sales.tickets.view",
    // Only the latest quotation carries a Print button. Earlier revisions exist
    // so the reference for what was previously sent survives; printing one of
    // those would be issuing a document about a superseded offer.
    latestOnly: true,
  },
];

export const callPointById = (id) => CALL_POINTS.find((c) => c.id === String(id || "")) || null;

// ONE CALL POINT, ONE TEMPLATE. A button that sometimes produces one document
// and sometimes another is a button nobody can predict; needing a second
// document in the same place means declaring a second call point beside it.
export function callPointTaken(templates, callPointId, exceptId = "") {
  return (templates || []).some((t) => t.id !== exceptId && t.callPointId === callPointId);
}

// What setup should offer for one template: every call point, marked with
// whether something else already holds it.
export function callPointOptions(templates, forId = "") {
  return CALL_POINTS.map((c) => ({
    id: c.id,
    label: c.label,
    where: c.where,
    subject: c.subject,
    taken: callPointTaken(templates, c.id, forId),
  }));
}
