// A STUDIO'S PUBLIC FORM — answered by anybody, signed in or not
// (docs/functionality/forms.md). The address is the studio's slug, which is
// public by design (invariant 2), and the form's unguessable code; every miss
// is the same 404, so a stranger learns only whether a form is at this address.
//
// THE WRITE IS GUARDED LIKE EVERY PUBLIC FORM (platform/http/publicForm): never
// from another site's script, and a rate limit per address shared by every
// studio's forms. A hidden field a person never sees catches the bots that fill
// in everything; they are thanked and nothing is stored.
import { NextResponse } from "next/server";
import { RL } from "@/platform/db/keys";
import { refusePublicForm } from "@/platform/http/publicForm";
import { statusFor } from "@/platform/http/httpStatus";
import { publicForm, submitForm } from "@/modules/marketing/forms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string; code: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { slug, code } = await params;
  const form = await publicForm(String(slug || "").toLowerCase(), String(code || ""));
  if (!form) return NextResponse.json({ ok: false, error: "notfound" }, { status: 404 });
  return NextResponse.json({ ok: true, form });
}

export async function POST(request: Request, { params }: Params) {
  // Twenty answers in ten minutes from one address is a script, not a room of
  // people sharing a connection — an event's registration desk is the busiest
  // honest case, and it rarely manages one a minute.
  const refusal = await refusePublicForm(request, { rateKey: RL.formIp, max: 20, windowSec: 10 * 60 });
  if (refusal) return refusal;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  if (String(body?.website2 || "").trim()) return NextResponse.json({ ok: true, confirmation: "" });
  const { slug, code } = await params;
  const result = await submitForm(String(slug || "").toLowerCase(), String(code || ""), body);
  if ("error" in result && result.error) {
    const questionId = "questionId" in result ? String(result.questionId || "") : "";
    const status = result.error === "notfound" ? 404 : result.error === "closed" ? 409 : statusFor(result.error);
    return NextResponse.json({ ok: false, error: result.error, questionId }, { status });
  }
  return NextResponse.json(result, { status: 201 });
}
