// THE ENGINEERING & DOCUMENTS DASHBOARD'S FIGURES, asserted without a database.
//
// What matters most is what the numbers must NOT do: count a draft as due a
// review, call an answered RFI open, put a resubmitted submittal in two slices,
// or say something is waiting on somebody it is not waiting on.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const root = pathToFileURL(process.cwd() + "/").href;
register(new URL("./loader.mjs", import.meta.url), { data: { root } });

const E = await import("@/modules/engineering/model");

let fails = 0;
const ok = (what, cond, detail = "") => {
  if (!cond) { fails++; console.log(`  FAIL  ${what}${detail ? ` — ${detail}` : ""}`); }
  else console.log(`  ok    ${what}`);
};

const asOf = "2026-09-13";

console.log("\n== documents");
{
  const docs = [
    { id: "d1", code: "QP-ENG-001", title: "Issued, review next week", nextReviewDate: "2026-09-20" },
    { id: "d2", code: "QP-ENG-002", title: "Issued, review passed", nextReviewDate: "2026-09-01" },
    { id: "d3", code: "QP-ENG-003", title: "Draft with a review date", nextReviewDate: "2026-09-15" },
    { id: "d4", code: "QP-ENG-004", title: "Issued, review far off", nextReviewDate: "2027-01-01" },
    { id: "d5", code: "QP-ENG-005", title: "At review, mine", reviewerCollaboratorId: "me" },
    { id: "d6", code: "QP-ENG-006", title: "At approval, someone else's", approverCollaboratorId: "you" },
    { id: "d7", code: "QP-ENG-007", title: "Withdrawn", obsoletedAt: "2026-08-01", nextReviewDate: "2026-09-02" },
  ];
  const revisions = [
    { documentId: "d1", rev: 1, state: "effective" },
    { documentId: "d2", rev: 1, state: "effective" },
    { documentId: "d4", rev: 1, state: "effective" },
    { documentId: "d5", rev: 1, state: "review" },
    { documentId: "d6", rev: 1, state: "approval" },
    { documentId: "d7", rev: 1, state: "effective" },
  ];
  const f = E.documentFigures(docs, revisions, asOf, "me");
  ok("every document is counted once, by the register's own state",
    f.total === 7 && f.byState.reduce((a, s) => a + s.count, 0) === 7, JSON.stringify(f.byState));
  ok("WAITING ON ME is the open revision's gate, not any right I hold", f.awaitingMe === 1);
  ok("...and nobody is waiting on an empty id", E.documentFigures(docs, revisions, asOf, "").awaitingMe === 0);
  ok("in review counts review and approval together", f.inReview === 2);
  // A DRAFT HAS NOTHING ISSUED TO REVIEW, AND AN OBSOLETE ONE IS NOT WORKED TO.
  ok("A DRAFT IS NEVER DUE A REVIEW, nor a withdrawn document", !f.reviewDueList.some((d) => d.id === "d3" || d.id === "d7"));
  ok("an effective document inside the window is due, one past it is overdue",
    f.reviewDue === 2 && f.reviewOverdue === 1, JSON.stringify(f.reviewDueList));
  ok("...most urgent first", f.reviewDueList[0].id === "d2" && f.reviewDueList[0].daysLeft === -12);
  ok("a review months away is not due", !f.reviewDueList.some((d) => d.id === "d4"));
}

console.log("\n== RFIs");
{
  const months = ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"];
  const rfis = [
    { id: "r1", reference: "RFI-001", status: "Open", values: { subject: "Slab edge", ballInCourt: "Client", neededBy: "2026-09-10", raisedOn: "2026-09-01" } },
    { id: "r2", reference: "RFI-002", status: "Open", values: { subject: "Door schedule", ballInCourt: "Us", neededBy: "2026-09-30" }, createdAt: "2026-08-15T09:00:00Z" },
    { id: "r3", reference: "RFI-003", status: "Open", values: { subject: "No owner set" }, createdAt: "2026-02-01T09:00:00Z" },
    { id: "r4", reference: "RFI-004", status: "Answered", values: { subject: "Answered", ballInCourt: "Consultant", neededBy: "2026-08-01" } },
    { id: "r5", reference: "RFI-005", status: "Closed", values: { subject: "Done", ballInCourt: "Client", raisedOn: "2026-09-02" } },
  ];
  const f = E.rfiFigures(rfis, asOf, months);
  ok("open is the unanswered ones only", f.open === 3);
  ok("AN ANSWERED RFI IS NOT OPEN, and is counted apart", f.answered === 1);
  ok("late is open and past the date needed — an answered one is not late", f.overdue === 1 && f.late[0].id === "r1" && f.late[0].daysLate === 3);
  const ball = Object.fromEntries(f.ballInCourt.map((b) => [b.who, b.count]));
  ok("where the ball is covers every open RFI, blanks included",
    f.ballInCourt.reduce((a, b) => a + b.count, 0) === 3 && ball.Client === 1 && ball.Us === 1 && ball[""] === 1, JSON.stringify(f.ballInCourt));
  ok("...and never counts an answered or closed one", !ball.Consultant);
  ok("raised per month uses the raised date, else when it was entered",
    f.raised.join(",") === "0,0,0,0,1,2", f.raised.join(","));
}

console.log("\n== submittals");
{
  const subs = [
    { id: "s1", reference: "SUB-001", status: "Submitted", values: { title: "Rebar shop drawings", dueOn: "2026-09-05" } },
    { id: "s2", reference: "SUB-002", status: "Under review", values: { title: "Pump data", dueOn: "2026-09-20" } },
    { id: "s3", reference: "SUB-003", status: "Approved", values: { title: "Tiles" } },
    { id: "s4", reference: "SUB-004", status: "Approved as noted", values: { title: "Paint" } },
    { id: "s5", reference: "SUB-005", status: "Revise and resubmit", values: { title: "Façade", dueOn: "2026-08-01" } },
    { id: "s6", reference: "SUB-006", status: "Draft", values: { title: "Not sent", dueOn: "2026-08-01" } },
  ];
  const f = E.submittalFigures(subs, asOf);
  ok("out for review is submitted and under review", f.withReviewer === 2);
  ok("LATE IS ONLY WHAT THE REVIEWER STILL HOLDS — a draft or a sent-back one is not late on them",
    f.overdue === 1 && f.late[0].id === "s1");
  ok("each outcome is counted once, so the slices are exclusive",
    f.outcomes.map((o) => o.count).join(",") === "1,1,1");
  ok("revise-and-resubmit is named on its own", f.reviseResubmit === 1);
}

console.log("\n== the attention list");
{
  const a = E.attention(
    [{ id: "r1", reference: "RFI-001", title: "x", date: "2026-09-10", daysLate: 3 }],
    [{ id: "s1", reference: "SUB-001", title: "y", date: "2026-09-05", daysLate: 8 }],
  );
  ok("most late first, whichever register it came from", a[0].kind === "submittal" && a[1].kind === "rfi");
  ok("an empty register adds nothing", E.attention([], []).length === 0);
}

// ---- the register's own rules, which the dashboard's states are read from ----
// Pure, so they are asserted here beside the figures that depend on them.
const Q = await import("@/modules/quality/qualityDocuments");
const L = await import("@/modules/quality/layouts");

console.log("\n== a withdrawn document is final");
{
  // THE BUG: withdraw moves the issued revision to `superseded`, leaving no
  // effective and no open revision — the shape of a never-issued draft — so
  // the workflow view offered Send for review on a withdrawn document.
  const doc = { id: "w1", obsoletedAt: "2026-09-20T10:00:00Z" };
  const revs = [{ documentId: "w1", rev: 1, state: "superseded", effectiveDate: "2026-01-01" }];
  ok("A WITHDRAWN DOCUMENT IS ITS OWN STAGE, not a draft", Q.workflowStage(doc, revs) === "withdrawn");
  ok("...and no transition starts from it", Object.keys(Q.TRANSITIONS).every((a) => !Q.canMove(a, "withdrawn")));
  ok("...while the register still calls it obsolete", Q.documentState(doc, revs) === "obsolete");
  ok("without obsoletedAt the same revisions are a draft's — which is why it is asked first",
    Q.workflowStage({ id: "w1" }, revs) === "draft");
  ok("an issued document stands at effective", Q.workflowStage({ id: "e1" }, [{ documentId: "e1", rev: 1, state: "effective" }]) === "effective");
  ok("an open revision's state wins over the issued one",
    Q.workflowStage({ id: "e1" }, [{ documentId: "e1", rev: 1, state: "effective" }, { documentId: "e1", rev: 2, state: "review" }]) === "review");
  ok("the stage has a label", Q.REV_LABELS.withdrawn === "Withdrawn");
}

console.log("\n== nothing ever issued is deletable");
{
  // THE BUG: removeDoc refused only an EFFECTIVE document, so withdrawing and
  // then deleting erased every version the document had issued.
  ok("a never-issued draft may go", Q.deleteProblem({ id: "d" }, []) === null);
  ok("...and one still in review", Q.deleteProblem({ id: "d" }, [{ documentId: "d", rev: 1, state: "review" }]) === null);
  ok("an effective document may not", Q.deleteProblem({ id: "d" }, [{ documentId: "d", rev: 1, state: "effective" }]) === "controlled");
  ok("A WITHDRAWN DOCUMENT MAY NOT",
    Q.deleteProblem({ id: "d", obsoletedAt: "2026-09-20" }, [{ documentId: "d", rev: 1, state: "superseded" }]) === "controlled");
  ok("nor one holding any superseded version, withdrawal half-written or not",
    Q.deleteProblem({ id: "d" }, [{ documentId: "d", rev: 1, state: "superseded" }]) === "controlled");
  ok("another document's issued revision does not protect this one",
    Q.deleteProblem({ id: "d" }, [{ documentId: "x", rev: 1, state: "effective" }]) === null);
}

console.log("\n== a chosen layout is found wherever it is chosen");
{
  const stored = { quotation: { en: "lay1", ar: "lay2" }, invoice: { en: "lay1" } };
  const slots = L.layoutSlotsFor(stored, "lay1");
  ok("every slot naming it is reported", slots.length === 2
    && slots.some((s) => s.kind === "quotation" && s.language === "en")
    && slots.some((s) => s.kind === "invoice" && s.language === "en"), JSON.stringify(slots));
  ok("a document no slot names is free", L.layoutSlotsFor(stored, "other").length === 0);
  ok("an empty id matches nothing", L.layoutSlotsFor({ quotation: { en: "" } }, "").length === 0);
  ok("a studio with no layouts stored names nothing", L.layoutSlotsFor(undefined, "lay1").length === 0);
}

console.log(fails ? `\nengineering dashboard: ${fails} FAILURES\n` : "\nengineering dashboard: all passed\n");
process.exit(fails ? 1 : 0);
