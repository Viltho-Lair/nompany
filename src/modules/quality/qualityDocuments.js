// CONTROLLED DOCUMENTS — the vocabulary, and the rules that are pure functions.
//
// Client-safe on purpose, exactly like modules/tasks/taskRouting.js is for tasks: the
// register and the setup screen need the statuses, the starter pack and the
// shape of a document code, and none of them should drag the Redis-backed store
// into the browser bundle to get them. modules/quality/quality.js owns everything that
// touches storage and re-exports this, so a server-side caller keeps one import.

// ---- the lifecycle ---------------------------------------------------------
//
// The full ladder is declared here because a document's status has to mean the
// same thing everywhere the moment it exists. Only `draft` is REACHABLE today —
// the transitions that produce the rest arrive with the approval workflow — and
// the register shows a document as whatever it actually is rather than
// pretending the ladder is in use.
export const DOC_STATUSES = ["draft", "in-review", "approved", "effective", "obsolete"];
export const DEFAULT_STATUS = "draft";
export const STATUS_LABELS = {
  draft: "Draft",
  "in-review": "In review",
  approved: "Approved",
  effective: "Effective",
  obsolete: "Obsolete",
};

// A document is a published, controlled thing from `effective` onwards. Before
// that it is somebody's work in progress, which is what decides whether it may
// still be deleted — see removeDocument in modules/quality/quality.js.
export const isControlled = (status) => status === "effective" || status === "obsolete";

// ---- languages -------------------------------------------------------------
//
// ONE DOCUMENT, ONE LANGUAGE. An Arabic counterpart is its own document with its
// own code, linked through `relatedDocumentIds` — which keeps the control model
// simple and makes the relationship something you can see rather than infer.
//
// Direction is DERIVED, never stored. A stored copy is a second answer to a
// question that already has one, and the two only agree until somebody edits a
// document's language and forgets the other field.
export const DOC_LANGUAGES = [
  { id: "en", name: "English", dir: "ltr" },
  { id: "ar", name: "العربية", dir: "rtl" },
];
export const directionOf = (language) =>
  DOC_LANGUAGES.find((l) => l.id === language)?.dir || "ltr";

// ---- document codes --------------------------------------------------------
//
// TYPE-DEPT-NNN, e.g. QP-SAL-001. The type supplies the prefix, the department
// supplies its short code, and the sequence is minted per type+department.
//
// A code is PERMANENT. Re-typing or re-filing a document does not renumber it:
// the code is how the document is referred to on paper, in other documents and
// in an audit, and none of those follow a rename.
export const CODE_PART_RE = /^[A-Z][A-Z0-9]{0,5}$/;
export const SEQ_DIGITS = 3;

export const formatCode = (prefix, dept, seq) =>
  `${prefix}-${dept}-${String(seq).padStart(SEQ_DIGITS, "0")}`;

// Normalise anything somebody types into a code part: upper case, letters and
// digits only, capped. Returns "" for input that cannot be one.
export function cleanCodePart(value, max = 4) {
  const s = String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, max);
  return CODE_PART_RE.test(s) ? s : "";
}

// The default short code for a department, which IS a top-level section key
// (see lib/departments.js). "human-resources" -> "HUM", "sales" -> "SAL".
// Editable afterwards; this only decides what it starts as.
export const defaultDeptCode = (sectionKey) =>
  cleanCodePart(String(sectionKey || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 3)) || "GEN";

// The highest sequence already issued for one type+department, read off the
// documents that exist. Feeds bumpCounter's floor so a studio that already holds
// documents — or one whose counter was never primed — cannot be handed a number
// somebody is already using.
export function highestSeq(documents, prefix, dept) {
  const re = new RegExp(`^${prefix}-${dept}-(\\d+)$`);
  let top = 0;
  for (const d of documents || []) {
    const hit = re.exec(String(d?.code || ""));
    if (hit) top = Math.max(top, Number(hit[1]) || 0);
  }
  return top;
}

// ---- the ISO 9001 starter pack ---------------------------------------------
//
// Document types are the studio's own — it may add, rename and delete them
// freely. But a Quality section that opens on an empty taxonomy asks somebody to
// invent a document hierarchy before they can write anything, and the answer is
// the same in nearly every quality system, so it is offered rather than
// withheld.
//
// INSTALLED ON REQUEST, not seeded at studio creation. Sections are seeded when
// a studio is created and there is no backfill, so anything planted that way
// would reach new studios only and never the ones that already exist. A studio
// that would rather start blank simply does not press the button.
export const ISO_STARTER_TYPES = [
  { name: "Policy", prefix: "POL",
    description: "What the company commits to. Short, signed by top management, and rarely revised." },
  { name: "Procedure", prefix: "QP",
    description: "How a process runs across departments — who does what, in what order, and what it produces." },
  { name: "Work Instruction", prefix: "WI",
    description: "How one task is carried out at one place of work. The detail a procedure points to." },
  { name: "Form", prefix: "FRM",
    description: "A blank to be filled in. Controlled because the blank is; what somebody writes on it becomes a record." },
  { name: "Record", prefix: "REC",
    description: "Evidence that something happened. Retained rather than revised." },
];

// ---- validation ------------------------------------------------------------

export const MAX_TYPES = 40;
export const MAX_TITLE = 200;

// Whether a proposed prefix is free. Two types sharing a prefix would mint two
// documents with the same code, which is the one thing a document code may
// never do.
export function prefixTaken(types, prefix, exceptId = "") {
  return (types || []).some((t) => t.id !== exceptId && t.prefix === prefix);
}

// ---- the revision lifecycle -------------------------------------------------
//
// AUTHOR → REVIEWER → APPROVER, and only then issued. Two named people sign a
// revision before anybody may work from it, which is the substance of "review
// and approve before issue" — a single button marked Approve records that
// somebody clicked, not that anybody read it.
//
// The states are on the REVISION, never on the document. A document that is
// already effective can have its next revision half-written and in review at
// the same time, and a single status field cannot say both without lying about
// one of them.
export const REV_STATES = ["draft", "review", "approval", "approved", "effective", "superseded", "rejected"];
export const REV_LABELS = {
  draft: "Draft",
  review: "Waiting for review",
  approval: "Waiting for approval",
  approved: "Approved, not yet issued",
  effective: "Effective",
  superseded: "Superseded",
  rejected: "Sent back",
};

// A revision somebody is still working on, as opposed to one that has been
// issued or retired. Exactly one of these may be open per document: two people
// drafting two different next revisions is two documents wearing one code.
export const OPEN_STATES = new Set(["draft", "review", "approval", "approved", "rejected"]);
export const isOpen = (state) => OPEN_STATES.has(state);

// Every legal move, with the right it needs and where it lands. Declared as a
// table rather than as a chain of ifs so the whole machine can be read at once —
// and so the screen can ask what is possible instead of reimplementing the rules
// to decide which buttons to draw.
export const TRANSITIONS = {
  submit:   { from: ["draft", "rejected"], to: "review",    permission: "quality.documents.edit",     label: "Send for review" },
  review:   { from: ["review"],            to: "approval",  permission: "quality.documents.review",   label: "Sign as reviewer" },
  approve:  { from: ["approval"],          to: "approved",  permission: "quality.documents.approve",  label: "Sign as approver" },
  publish:  { from: ["approved"],          to: "effective", permission: "quality.documents.publish",  label: "Issue this revision" },
  reject:   { from: ["review", "approval"], to: "rejected", permission: "quality.documents.review",   label: "Send back" },
  withdraw: { from: ["effective"],         to: "superseded", permission: "quality.documents.obsolete", label: "Withdraw the document" },
};

export const canMove = (action, state) => Boolean(TRANSITIONS[action]?.from.includes(state));

// THE DOCUMENT'S OWN STATE, derived from its revisions rather than stored.
//
// A stored copy is a second answer to a question that already has one, and the
// two agree only until a transition writes one and not the other. This reads
// the facts that cannot be wrong: whether it has been withdrawn, whether any
// revision was ever issued, and what the open revision is doing.
export function documentState(document, revisions = []) {
  if (document?.obsoletedAt) return "obsolete";
  const mine = revisions.filter((r) => r.documentId === document?.id);
  const open = mine.find((r) => isOpen(r.state));
  if (mine.some((r) => r.state === "effective")) return "effective";
  if (!open) return "draft";
  return { draft: "draft", rejected: "draft", review: "in-review", approval: "in-review", approved: "approved" }[open.state];
}

// Whether a NEW revision is in flight over an already-issued document. The
// register shows this beside the status, because "effective, and rev 3 is with
// the approver" is two facts and a person needs both.
export function pendingRevision(document, revisions = []) {
  const open = revisions.find((r) => r.documentId === document?.id && isOpen(r.state));
  return open ? { rev: open.rev, state: open.state, label: REV_LABELS[open.state] } : null;
}

// ---- signatures -------------------------------------------------------------
//
// A signature is a NAME, A ROLE AND A MOMENT. The image, where somebody has
// one, is decoration on top of that — pleasant, and legally worth rather less
// than the record underneath it. So the block prints the typed line always and
// the graphic only when it exists, and a signature with no image is not a
// lesser signature.
export const SIGNATURE_ROLES = { review: "Reviewed by", approval: "Approved by" };
