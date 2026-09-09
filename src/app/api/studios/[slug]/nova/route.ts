import { route } from "@/platform/http/route";
import { studioHasNova } from "@/lib/plans";
import { runNova, type NeutralMessage } from "@/platform/nova/client";
import { buildToolset } from "@/platform/nova/tools";
import { cleanProvider, providerMeta } from "@/lib/nova/providers";
import { getNovaConfig, novaApiKey } from "@/lib/data/novaConfig";

// THE SERVER NAMES THE PROVIDER; THE CLIENT WRITES THE SENTENCE.
//
// This built an English sentence here and the studio showed it verbatim, so an
// Arabic studio was told "Nova uses your own OpenAI key. Create one at …" in
// English — the one Nova string in the product that bypassed
// shared/studio/misc, which is where every other one lives and translates on
// display. Same rule as statuses and stages: what crosses the wire is a token
// and its data, never words.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ASK NOVA. The assistant answers from the studio's data — but only through the
// tools it is given, and every tool runs as the ASKING user (auth: "studio"
// resolved their membership and access before this handler ran). Two gates come
// first: the package must include Nova, and a provider must be configured. The
// transcript is client-held (session-only memory), so it arrives in the body and
// is sanitised before it reaches the model.
const spec = { auth: "studio", body: true, name: "nova" } as const;

export const POST = route(spec, async (g) => {
  const { studio, collaborator, access, user, params, body } = g;

  // Availability: the studio's package must include Nova at all.
  if (!(await studioHasNova(studio))) return { status: 403, body: { error: "nova-off" } };

  // THE PROVIDER AND KEY ARE THE PLATFORM'S, set once in /super → Application →
  // Nova. They used to be each USER'S, read from their own account settings, so
  // whether the assistant worked at all depended on whether the person looking
  // at it happened to hold an Anthropic or OpenAI subscription — a developer
  // credential asked of every member of every studio. Nova is a property of the
  // plan now, not of the reader.
  //
  // The env var stays as a fallback for a deployment that has not been through
  // the console yet; it was already here and it is the only path that does not
  // require somebody to have opened /super.
  const cfg = await getNovaConfig();
  const provider = cleanProvider(cfg.provider);
  const apiKey = (await novaApiKey())
    || (provider === "anthropic" ? String(process.env.ANTHROPIC_API_KEY || "") : "");
  if (!apiKey) return { status: 503, body: { error: "no-key", provider: providerMeta(provider).label, docs: providerMeta(provider).docs } };

  const message = typeof body?.message === "string" ? body.message.slice(0, 4000) : "";
  const history = sanitiseHistory(body?.messages);
  if (!message.trim() && !history.length) return { error: "empty" };

  // ENABLED ∩ MAPPED ∩ PERMITTED — the model is only ever shown tools this user
  // may actually use, so it cannot ask for anything they are not allowed.
  const config = await getNovaConfig();
  const toolset = buildToolset(config, access);

  const messages: NeutralMessage[] = [...history];
  if (message.trim()) messages.push({ role: "user", content: message });

  const slug = String(params.slug);
  const result = await runNova({
    provider,
    apiKey,
    system: novaSystem(String(studio.name || "this studio"), String(collaborator.alias || "there"), toolset.count, String(studio.currency || "")),
    messages,
    tools: toolset.tools,
    execute: (name, input) => toolset.execute(user, slug, name, input),
  });

  // If the model prepared an action, hand the person the proposal to confirm.
  // Nothing has been written; the write waits on their click (see /nova/act).
  return { answer: result.text, usedTools: result.usedTools, pendingAction: toolset.takePrepared() };
});

// The session transcript is client-held and therefore untrusted: keep only clean
// alternating-ish user/assistant text turns, bounded, so a crafted body cannot
// smuggle tool blocks or a giant payload into the model.
function sanitiseHistory(raw: unknown): NeutralMessage[] {
  if (!Array.isArray(raw)) return [];
  const out: NeutralMessage[] = [];
  for (const m of raw.slice(-20)) {
    const role = (m as { role?: unknown })?.role;
    const content = (m as { content?: unknown })?.content;
    if ((role === "user" || role === "assistant") && typeof content === "string" && content.trim()) {
      out.push({ role, content: content.slice(0, 4000) });
    }
  }
  return out;
}

function novaSystem(studioName: string, alias: string, toolCount: number, currency: string): string {
  return [
    `You are Nova, the assistant inside the ${studioName} workspace on nompany, an ERP.`,
    `You are helping ${alias}.`,
    "",
    "Rules:",
    `- Answer only from the ${toolCount} tools you have been given. Never invent figures, names, dates or statuses — if a tool did not return it, say you don't have it.`,
    "- If no tool covers the question, say so plainly and suggest where in the app they'd find it, rather than guessing.",
    "- The tools already return only what this person is allowed to see. Do not ask them to widen access or mention other studios.",
    // THE STUDIO'S OWN CURRENCY, NEVER A LITERAL. This said "Money is in SAR" to
    // every tenant on the platform whatever currency they had set, so a studio
    // trading in dinars had an assistant reading its figures back in riyal. The
    // product is sold regionally and then globally; one country's currency has no
    // business in a prompt every tenant receives.
    //
    // A studio that has not set one gets no claim at all rather than a guess —
    // createStudio has never set a currency, so "unset" is a real and common state.
    currency
      ? `- Be concise and specific. Money is in ${currency}; write dates as dd/mm/yyyy. Prefer a short answer with the key numbers to a long one.`
      : "- Be concise and specific. Amounts are in the studio's own currency, which is not set yet — give the number without naming a currency. Write dates as dd/mm/yyyy.",
    "- When you name a record, include its reference so they can find it.",
    "- Some tools DO things (request leave, add a comment). They only PREPARE the action — gather the fields, then a confirm card appears for the user. Never say an action is done; say you've prepared it and ask them to confirm.",
    "",
    "How this ERP works, so you can also explain how to USE it (guided help), not just report data:",
    // FOURTEEN SECTIONS, NOT FIFTEEN AND NOT THE OLD TWELVE DEPARTMENTS. This paragraph still
    // described the pre-restructure product months after P0 landed, so Nova's
    // guided help sent people to a nav that no longer exists: it named Technical
    // for quotations (they are CRM & Sales'), Quality for the controlled document
    // register (Engineering & Documents'), and Operations for locations
    // (Administration's). Reporting figures correctly and then directing somebody
    // to a screen that is not there is worse than declining to help.
    //
    // ADMINISTRATION IS NOT ON THIS LIST ANY MORE (09/09/2026). It is the
    // studio's system configuration, reached from the gear in the shell rather
    // than the department nav, so Nova names it as that — sending somebody
    // looking for an "Administration department" in a sidebar that no longer
    // has one is the same failure this comment already describes, one rename
    // later.
    "- Fourteen sections, plus Main (the home surface) and Tasks (a cross-cutting board), which are not sections: CRM & Sales (tickets, clients, quotations, contracts, pipeline), Tendering & Estimating (tenders, BOQ, rate library), Projects (list, planner, costs, billing), Engineering & Documents (controlled documents, internal RFQ), Procurement & Subcontracting (requisitions, supplier RFQ, orders, subcontracts, receiving, suppliers), Inventory & Warehouse (stock, items, project sheets), Manufacturing & Production (planning, work orders, bills of materials, work stations, production batches), Field Operations & Service (schedule, tracking, jobs, service contracts), Logistics & Fleet (shipments, landed cost, deliveries, trips, vehicles), Assets & Equipment (plant allocation, equipment register, maintenance, calibration), Quality & HSE (NCRs, audits, incidents, permits to work, toolbox talks, ITPs, test records, certifications), Human Resources (employees, leave, certifications), Finance & Accounting (invoices, expenses, payables, fixed assets, ledger), Reports & BI (executive dashboard, report builder, data exports).",
    "- Settings is NOT a section: People, Access, Master data (locations, departments, cost codes) and Studio settings are the studio's own configuration, reached from the Settings entry at the bottom of the sidebar. Send somebody there, not to a department.",
    // EVERY SECTION RENDERS. This line used to name Manufacturing, Assets,
    // Quality & HSE and Reports & BI as "declared but render nothing yet" — true
    // when it was written, false since 08/09/2026 when the record engine gave
    // three of them registers and Reports got data exports. Nova was telling
    // tenants that four sections they can open do not exist, which is the exact
    // inverse of the failure the comment above describes and cost nothing to
    // notice because nobody asked Nova about a section they were already using.
    "- Every section renders something. NO_SCREEN_YET is empty: if somebody asks for a section, send them to it rather than saying it is not built.",
    "- The main flow: a CRM & Sales ticket → an Engineering & Documents RFQ against it → a priced quotation (in CRM & Sales) → approval (routed as a task; the raiser can't approve their own) → an approved quotation opens a Project → the project is invoiced in Finance. A won tender in Tendering & Estimating opens a project the same way.",
    "- Access: default-deny; roles are built on Access and assigned on People; the owner and Admin hold everything; reviewer ≠ approver on anything signed off; nobody grants a right they don't hold.",
    "- Finance: invoices carry NO tax rate by default — whoever raises one sets it, because no single rate is right for every country the product is sold in — and 'Paid' is derived from payments; bills (payables) need approval by someone other than who raised them; fixed-asset depreciation is derived; the ledger is double-entry and entries are reversed, never edited.",
    "- Plans: a PACKAGE sets headcount/chat/Nova; a TIER sets which dashboard analytics show.",
    "When asked how to do something, give the short path (which department, which button), and if it's an action you can prepare, offer to do it.",
  ].join("\n");
}
