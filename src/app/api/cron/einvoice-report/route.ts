import { cronJob } from "@/platform/http/cron";
import { log } from "@/platform/http/observability";
import { listStudios } from "@/modules/main/studios";
import { listSections } from "@/platform/db/sections";
import { studioEInvoiceRules } from "@/shared/compliance/rules";
import { adapterFor } from "@/modules/finance/einvoice";
import { submitOutstanding, type EInvoiceTarget } from "@/modules/finance/einvoiceService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE NIGHTLY E-INVOICE BATCH — the owner's decision A, 03/10/2026: nompany
// submits a Saudi studio's invoices, and the studio chooses when. A studio that
// chose the daily batch is reported here; one that chose "as each is issued" is
// reported at issue, and anything that did not reach the authority then is
// retried here. Either way ZATCA's 24 hours are met by a job that runs every
// 24 hours.
//
// 21:00 UTC IS MIDNIGHT IN RIYADH, so the batch closes the Saudi day it
// reports. Only studios whose country's adapter SUBMITS are read at all, and of
// those only the ones that onboarded a unit do anything (`submitOutstanding`).
// One studio failing is logged and the next one runs.
export const GET = cronJob("einvoice-report", run);

async function run() {
  const studios = (await listStudios()) as Array<EInvoiceTarget["studio"]>;
  let studiosRun = 0;
  let submitted = 0;
  let accepted = 0;
  for (const studio of studios) {
    if (!adapterFor(studioEInvoiceRules(studio))?.submit) continue;
    try {
      const byKey = Object.fromEntries((await listSections(studio.id)).map((s) => [s.key, s]));
      const cashSection = byKey["finance-cash"] || byKey.finance;
      if (!cashSection) continue;
      // THE TILL'S RECEIPTS are filed under crm-sales-pos (docs: pos.md) —
      // reported in the same batch as the invoices, one chain.
      const posSection = byKey["crm-sales-pos"] || null;
      // AND ITS RETURNS, the credit notes of the counter.
      const posReturnsSection = byKey["pos-returns"] || null;
      const out = await submitOutstanding({ studio, cashSection, posSection, posReturnsSection } as EInvoiceTarget);
      studiosRun += 1;
      submitted += out.submitted;
      accepted += out.accepted;
    } catch (e) {
      log.error("einvoice-report: studio failed", { studioId: studio.id, error: (e as Error).message });
    }
  }
  return Response.json({ ok: true, studios: studiosRun, submitted, accepted });
}
