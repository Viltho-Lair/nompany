// CONTRACTS — the binding promise, and the deal's value baseline.
//
// The record's shape and the reasoning behind each field are in
// ./contractSchema. This file is what creates and reads them, and its whole job
// beyond the CRUD is the two things a contract does to its DEAL: it attaches to
// one, and it teaches it what it knows.
import { repo } from "@/platform/db/repo";
import { requirePermission } from "@/platform/access";
import { attachRecord, contributeContext, resolveDealId } from "@/platform/db/engagement";
import { stageOf } from "@/platform/engagement/registry";
import type { Contract } from "./contractSchema";
import { FEE_BASES } from "./contractSchema";

import type { SalesContext } from "./types";

type FeeBasis = (typeof FEE_BASES)[number];
// A TYPE GUARD RATHER THAN A CAST. `includes` on a readonly tuple does not
// narrow a `string`, and casting would silence the check that this value is one
// of the five — which is the only thing standing between a typo and a contract
// whose fee basis means nothing to any later reader.
const isFeeBasis = (v: string): v is FeeBasis => (FEE_BASES as readonly string[]).includes(v);

const Contracts = repo<Contract>("contracts");

const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * A CONTRACT'S OBJECT CLASS DECIDES WHAT IT MAY TEACH THE DEAL.
 *
 * Read from the registry rather than written here, so a contract contributes at
 * exactly the rank the precedence table gives its class — and if that class ever
 * changes, this follows without anybody remembering to update a second copy.
 */
const CONTRACT_SOURCE = {
  kind: "stage" as const,
  objectClass: stageOf("contract")!.objectClass,
};

export async function listContracts(ctx: SalesContext) {
  const denied = requirePermission(ctx.access, "crmSales.contracts.view");
  if (denied) return denied;
  const { studio, quotationsSection } = ctx;
  // A STUDIO MAY NOT HAVE THIS SECTION. Sections are per-studio rows, so the
  // one a contract lives in can genuinely be absent — an empty list is the
  // honest answer, not an error, because nothing is wrong.
  if (!quotationsSection) return { contracts: [] };
  return { contracts: await Contracts.find({ studio, section: quotationsSection }) };
}

/**
 * Sign a contract against a deal.
 *
 * THE GUARD IS HERE, NOT IN THE ROUTE — routes get added and forgotten, and the
 * function that does the work cannot be reached around.
 *
 * THE DEAL IS REQUIRED. A contract with no deal is a contract to nothing, which
 * is why `contract` is absent from the types the unassigned pen accepts. It is
 * resolved through the alias table so a caller holding a derived id lands on the
 * deal that exists rather than on one nothing else can find.
 */
export async function createContract(ctx: SalesContext, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "crmSales.contracts.create");
  if (denied) return denied;

  const { studio, quotationsSection, collaborator } = ctx;
  // Refused rather than answered emptily: a write has somewhere it must go.
  if (!quotationsSection) return { error: "no-section" };

  const title = str(body?.title, 200);
  if (!title) return { error: "title" };

  const dealId = str(body?.dealId, 60);
  if (!dealId) return { error: "deal" };

  const feeBasis = str(body?.feeBasis, 20);
  if (!isFeeBasis(feeBasis)) return { error: "feeBasis" };

  const resolved = await resolveDealId(studio.id, dealId);

  const contract = await Contracts.create({ studio, section: quotationsSection }, {
    number: "",            // issued later, exactly as a project's is
    title,
    dealId: resolved,
    quotationId: str(body?.quotationId, 60),
    clientId: str(body?.clientId, 60),
    value: num(body?.value),
    currency: str(body?.currency, 8) || studio.currency || "",
    feeBasis,
    signedDate: str(body?.signedDate, 40),
    startDate: str(body?.startDate, 40),
    endDate: str(body?.endDate, 40),
    visitSchedule: str(body?.visitSchedule, 200),
    notes: str(body?.notes, 4000),
    createdByCollaboratorId: collaborator.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // ATTACH BEFORE CONTRIBUTING. Attaching is what can be refused — a deal whose
  // template allows one contract already has one — and a contribution to a deal
  // this record turned out not to be able to join would be a fact taught by a
  // membership that does not exist.
  //
  // Deliberately NOT swallowed: unlike the audit trail, whose failure must not
  // fail a write that already happened, a contract that could not attach has
  // not done the one thing a contract is for.
  await attachRecord(studio.id, resolved, "contract", contract.id, contract.createdAt);

  // WHAT A CONTRACT KNOWS, offered to the deal (Law 4). It fills blanks and
  // loses arguments to execution and to explicit edits, which is the point: a
  // contract is drafted, and the site a crew actually went to is better
  // evidence than the site somebody typed into a draft.
  await contributeContext(studio.id, resolved, {
    clientRef: str(body?.clientId, 60),
    title,
    deadline: str(body?.endDate, 40),
  }, CONTRACT_SOURCE, {
    actor: collaborator.id,
    actorType: "collaborator",
  });

  return { contract };
}

export async function updateContract(ctx: SalesContext, id: string, body: Record<string, unknown>) {
  const denied = requirePermission(ctx.access, "crmSales.contracts.edit");
  if (denied) return denied;

  const { studio, quotationsSection } = ctx;
  if (!quotationsSection) return { error: "no-section" };

  // THE FIELDS A CONTRACT MAY NOT CHANGE, and why each one is immutable rather
  // than merely guarded:
  //
  //   dealId  — moving a contract between deals is not an edit, it is two
  //             different agreements. Re-rooting is what Law 3 forbids.
  //   number  — a reference somebody quoted must keep meaning what they quoted
  //             (invariant 10: references only move forward).
  const patch: Partial<Contract> = {};
  if (body.title !== undefined) patch.title = str(body.title, 200);
  if (body.value !== undefined) patch.value = num(body.value);
  if (body.currency !== undefined) patch.currency = str(body.currency, 8);
  if (body.feeBasis !== undefined) {
    const fb = str(body.feeBasis, 20);
    if (!isFeeBasis(fb)) return { error: "feeBasis" };
    patch.feeBasis = fb;
  }
  if (body.signedDate !== undefined) patch.signedDate = str(body.signedDate, 40);
  if (body.startDate !== undefined) patch.startDate = str(body.startDate, 40);
  if (body.endDate !== undefined) patch.endDate = str(body.endDate, 40);
  if (body.visitSchedule !== undefined) patch.visitSchedule = str(body.visitSchedule, 200);
  if (body.notes !== undefined) patch.notes = str(body.notes, 4000);

  if (!Object.keys(patch).length) return { error: "nothing" };
  patch.updatedAt = new Date().toISOString();

  const contract = await Contracts.update({ studio, section: quotationsSection }, id, patch);
  return contract ? { contract } : { error: "notfound" };
}
