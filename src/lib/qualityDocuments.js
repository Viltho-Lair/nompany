// CONTROLLED DOCUMENTS — the vocabulary, and the rules that are pure functions.
//
// Client-safe on purpose, exactly like lib/taskRouting.js is for tasks: the
// register and the setup screen need the statuses, the starter pack and the
// shape of a document code, and none of them should drag the Redis-backed store
// into the browser bundle to get them. lib/quality.js owns everything that
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
// still be deleted — see removeDocument in lib/quality.js.
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
