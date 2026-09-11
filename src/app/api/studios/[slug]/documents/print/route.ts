// A CUSTOMER DOCUMENT, FILLED FOR PRINTING.
//
// GET ?kind=quotation|invoice&id=<record>&lang=en|ar — the studio's published
// layout for that type in that language, with every placeholder replaced by the
// record's value. See modules/quality/print.ts for the three rules.
//
// THE PLAIN STUDIO CONTEXT, deliberately. The document register's own context
// refuses anybody without Engineering & Documents, and printing an invoice is a
// Finance act: the record's right is what `printDocument` asks.

import { route } from "@/platform/http/route";
import { printContextFrom, printDocument } from "@/modules/quality/print";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", name: "documents/print" };

export const GET = route(spec, async ({ request, studio, collaborator, access, sections }) => {
  const ctx = printContextFrom({ studio, collaborator, access, sections });
  const q = new URL(request.url).searchParams;
  if (!ctx) return { state: "no-layout", kind: q.get("kind") || "", language: q.get("lang") || "" };
  return printDocument(ctx, { kind: q.get("kind"), id: q.get("id"), language: q.get("lang") });
});
