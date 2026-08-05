import { getCollection } from "@/lib/db";
import { putMedia } from "@/lib/media";
import { currentUser, unauthorized, forbidden } from "@/lib/session";
import { isHR } from "@/lib/authConstants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif", "application/pdf"];
const CAP = 2 * 1024 * 1024; // 2 MB — ID scans can be larger than a logo.

// Upload a private, owner-scoped ID/passport scan. HR/admin may upload for
// any employee; a linked employee may upload their own. The stored media is
// private with owner = the employee's linked user id, so only admin, HR or that
// user can later view/download it (enforced in /api/media/[id]).
export async function POST(request) {
  const actor = await currentUser();
  if (!actor) return unauthorized();

  const url = new URL(request.url);
  const employeeId = url.searchParams.get("employeeId") || "";

  const employees = await getCollection("employees");
  const emp = employeeId ? employees.find((e) => e.id === employeeId) : null;

  const hr = isHR(actor);
  const isOwnEmployee = emp && emp.userId && emp.userId === actor.id;
  if (!hr && !isOwnEmployee) return forbidden();

  // Owner = the employee's linked user (so they can view it later). For a brand
  // new employee (no id/link yet), HR uploads with no owner — staff-only until
  // the record is linked to a user.
  const owner = hr ? (emp?.userId || "") : actor.id;

  const formData = await request.formData();
  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return Response.json({ error: "No file provided." }, { status: 400 });
  }
  if (!IMAGE_TYPES.includes(file.type)) {
    return Response.json({ error: "Unsupported file type. Use PNG, JPG, WEBP, GIF or PDF." }, { status: 415 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > CAP) {
    return Response.json({ error: `File is ${Math.round(buffer.length / 1024)} KB — the limit is ${Math.round(CAP / 1024)} KB.` }, { status: 413 });
  }

  const { id, url: mediaUrl } = await putMedia({ buffer, contentType: file.type, filename: file.name, visibility: "private", owner });
  return Response.json({ id, url: mediaUrl }, { status: 201 });
}
