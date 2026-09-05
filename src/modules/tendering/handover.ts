// WHAT BECAME OF A WON TENDER — read from Tendering's side.
//
// THE HANDOVER ITSELF IS NOT HERE. Opening the project is `tenderSource`, a
// head of `openProject` in modules/projects, because everything below that
// split — the row, the two sheets, the engagement, the manager notification —
// must not be written twice; that file's own comment says a second create path
// is where the engagement dual-write gets forgotten. This file answers the
// question the TENDER screen asks: has this one been handed over, and may the
// person looking at it do so.
//
// DERIVED, NEVER STORED. Nothing is written back onto the tender when a project
// opens from it: the project's `tenderId` is the single record of the link, and
// a flag on the tender would be a second answer free to disagree with the
// projects it is supposed to describe. It is the same choice the quotation head
// makes — `existing.some((p) => p.quotationId === quotationId)` — and it means
// deleting the project genuinely frees the tender rather than stranding it.
import { requirePermission } from "@/platform/access";
import { repo } from "@/platform/db/repo";
import { isWonTender } from "./stages";
import type { Tender } from "./schema";
import type { TenderingContext } from "./types";

type ProjectRow = { id: string; title?: string; number?: string; tenderId?: string; value?: number };

const Projects = repo<ProjectRow>("projects");

export type HandoverState = {
  /** The project this tender became, when it became one. */
  projectId: string;
  projectTitle: string;
  /** Blank until Finance issues it — see the projects doc. */
  projectNumber: string;
  /** True only where pressing the button would succeed. */
  canHandOver: boolean;
  /**
   * Why it would not, as a TOKEN. The screen translates it; sending prose would
   * put an English sentence on an Arabic page.
   */
  blocked: "not-won" | "already" | "no-projects" | "handover-forbidden" | null;
};

/**
 * Has this tender become a project, and may this reader make it one?
 *
 * ASKS THE SAME QUESTIONS `tenderSource` ASKS, in the same order, so the screen
 * offers a button only where the server would accept it — the rule
 * `availableBidApproval` states at length and which holds identically here.
 * What it deliberately does NOT re-ask is the client resolution: that one
 * WRITES (it creates the Client record when the issuer is not one yet), and a
 * read that renders a screen must not.
 */
export async function handoverState(
  ctx: TenderingContext, tender: Tender,
): Promise<HandoverState> {
  const { studio, projectsListSection } = ctx;
  const none = { projectId: "", projectTitle: "", projectNumber: "" };

  // FOREIGN AND THEREFORE NULLABLE. A studio that does not run Projects cannot
  // hand anything over to it, and that is a real answer rather than an error.
  if (!projectsListSection) return { ...none, canHandOver: false, blocked: "no-projects" };

  const rows = await Projects.find({ studio, section: projectsListSection }, { where: { tenderId: tender.id } });
  const project = rows[0];
  if (project) {
    return {
      projectId: project.id,
      projectTitle: String(project.title || ""),
      projectNumber: String(project.number || ""),
      canHandOver: false,
      blocked: "already",
    };
  }

  // ONLY A WON TENDER. Checked before the permission so a Lost tender says why
  // it offers nothing, rather than reading as a right somebody is missing.
  if (!isWonTender(String(tender.status || ""))) {
    return { ...none, canHandOver: false, blocked: "not-won" };
  }

  // THE RIGHT THAT MATTERS IS PROJECTS', not Tendering's, because the act
  // CREATES a project. Somebody who may run the tender register but not open
  // projects is shown the state and offered nothing — which is the honest
  // answer: the handover is Projects' to accept.
  if (requirePermission(ctx.access, "projects.list.create")) {
    // ITS OWN TOKEN, not the bare `forbidden` every route sends. The screens
    // share one refusal mapper, and a case for `forbidden` there would answer
    // every unrelated refusal in Tendering with a sentence about the handover.
    return { ...none, canHandOver: false, blocked: "handover-forbidden" };
  }

  return { ...none, canHandOver: true, blocked: null };
}
