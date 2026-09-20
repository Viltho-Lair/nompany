// A FILE SENT TO A PUBLIC FORM (20/09/2026) — the only path in this product
// where somebody with no account writes bytes (docs/functionality/forms.md).
//
// EVERYTHING IT REFUSES IS DELIBERATE, and the refusals live in the service
// (`takeUpload`) rather than here: the form must be open, it must ASK the
// question named, the content type must be one that question accepts, the file
// must be under that question's own limit, and the form must not already hold
// its whole allowance. The route adds only what a route can know — who is
// calling, how often, and whether the request came from this site at all.
//
// THE ANSWER IS NOT WRITTEN HERE. This stores a file and hands back an id; the
// id becomes part of an answer only when the form is submitted, and a file
// uploaded into a branch somebody then left is deleted at that point. An
// upload that is never submitted keeps its space until the form's cap stops
// taking more — which is what a cap is for.
import { NextResponse } from "next/server";
import { RL } from "@/platform/db/keys";
import { refusePublicForm } from "@/platform/http/publicForm";
import { statusFor } from "@/platform/http/httpStatus";
import { takeUpload } from "@/modules/marketing/forms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string; code: string }> };

export async function POST(request: Request, { params }: Params) {
  const refusal = await refusePublicForm(request, { rateKey: RL.formUploadIp, max: 40, windowSec: 10 * 60 });
  if (refusal) return refusal;

  const body = await request.formData().catch(() => null);
  const part = body?.get("file");
  // A multipart part is a string or a file, and only one of them has bytes —
  // the same test /api/media makes, for the same reason.
  if (!part || typeof part === "string") return NextResponse.json({ ok: false, error: "no-file" }, { status: 400 });

  const { slug, code } = await params;
  const result = await takeUpload(String(slug || "").toLowerCase(), String(code || ""), {
    questionId: String(body?.get("questionId") || ""),
    filename: part.name,
    contentType: part.type,
    buffer: Buffer.from(await part.arrayBuffer()),
  });
  if ("error" in result) {
    const error = String(result.error || "failed");
    const status = error === "notfound" ? 404
      : error === "closed" ? 409
      : error === "too-large" ? 413
      // The form is full: it is not this person's fault and it is not
      // temporary, so it is not a 4xx about their request. 507 says the store
      // is the thing that cannot take it.
      : error === "form-full" ? 507
      : statusFor(error);
    return NextResponse.json({ ok: false, error }, { status });
  }
  return NextResponse.json({ ok: true, file: result }, { status: 201 });
}
