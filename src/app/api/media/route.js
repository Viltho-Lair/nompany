import { currentUser } from "@/lib/identity";
import { putMedia } from "@/lib/media";

export const runtime = "nodejs";

// Upload a file. Signed-in users only — uploads are never anonymous.
export async function POST(request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file.arrayBuffer !== "function") {
    return Response.json({ error: "no-file" }, { status: 400 });
  }
  const kind = new URL(request.url).searchParams.get("kind");
  const buffer = Buffer.from(await file.arrayBuffer());

  const result = await putMedia({
    buffer,
    contentType: file.type,
    filename: file.name,
    visibility: kind === "private" ? "private" : "public",
    owner: user.id,
  });
  if (result.error) {
    return Response.json({ error: result.error }, { status: result.error === "too-large" ? 413 : 400 });
  }
  return Response.json(result, { status: 201 });
}
