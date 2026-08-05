import { putMedia } from "@/lib/media";
import { requireManage, forbidden } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"];
const CAP = 5 * 1024 * 1024; // 5 MB

// Upload a permit attachment (PDF or image). Gated by the Operations section so
// any Operations user (not just admin) can attach a file when creating a permit.
// Returns { id, url, name }; the id lets the permit routes delete the old file
// from the store when it's replaced.
export async function POST(request) {
  const actor = await requireManage("operations");
  if (!actor) return forbidden();

  const formData = await request.formData();
  const file = formData.get("file");
  if (!file || typeof file === "string") return Response.json({ error: "No file provided." }, { status: 400 });
  if (!ALLOWED.includes(file.type)) return Response.json({ error: "Unsupported file. Use PDF or an image (PNG, JPG, WEBP, GIF)." }, { status: 415 });
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > CAP) return Response.json({ error: `File is ${Math.round(buffer.length / 1024)} KB — the limit is ${Math.round(CAP / 1024)} KB.` }, { status: 413 });

  const { id, url } = await putMedia({ buffer, contentType: file.type, filename: file.name, visibility: "public" });
  return Response.json({ id, url, name: file.name || "attachment" }, { status: 201 });
}
