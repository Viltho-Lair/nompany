import { putMedia } from "@/lib/media";
import { isAdminRequest, unauthorized } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Byte caps per image kind. Logos (vendors/clients) are held tight for fast
// grids; project/service images allow more detail.
const CAPS = { logo: 200 * 1024, image: 1024 * 1024, file: 5 * 1024 * 1024 };
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif"];
// The "file" kind (e.g. a client PO) also accepts PDFs.
const FILE_TYPES = [...IMAGE_TYPES, "application/pdf"];

export async function POST(request) {
  if (!(await isAdminRequest())) return unauthorized();

  const kindParam = new URL(request.url).searchParams.get("kind");
  const kind = kindParam === "image" ? "image" : kindParam === "file" ? "file" : "logo";
  const cap = CAPS[kind];
  const allowed = kind === "file" ? FILE_TYPES : IMAGE_TYPES;

  const formData = await request.formData();
  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return Response.json({ error: "No file provided." }, { status: 400 });
  }
  if (!allowed.includes(file.type)) {
    return Response.json({ error: kind === "file" ? "Unsupported file. Use PDF or an image (PNG, JPG, WEBP, GIF)." : "Unsupported image type. Use PNG, JPG, WEBP, SVG or GIF." }, { status: 415 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > cap) {
    return Response.json(
      { error: `Image is ${Math.round(buffer.length / 1024)} KB — the limit is ${Math.round(cap / 1024)} KB.` },
      { status: 413 }
    );
  }

  const { id, url } = await putMedia({
    buffer,
    contentType: file.type,
    filename: file.name,
    visibility: "public",
  });
  return Response.json({ id, url }, { status: 201 });
}
