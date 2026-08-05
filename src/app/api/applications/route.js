import { createItem, getCollection } from "@/lib/db";
import { putMedia } from "@/lib/media";
import { requireSection, forbidden } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { purgeExpiredApplications } from "@/lib/applications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Accepted CV formats and size cap.
const CV_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const CV_MAX = 5 * 1024 * 1024;

// Public: submit a job application (multipart form with a CV file).
export async function POST(request) {
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Invalid form data." }, { status: 400 });
  }

  const get = (k) => String(formData.get(k) || "").trim();
  const name = get("name");
  const email = get("email");
  const file = formData.get("cv");

  if (!name || !email || !file || typeof file === "string") {
    return Response.json({ error: "Name, email and a CV are required." }, { status: 400 });
  }
  if (!CV_TYPES.has(file.type)) {
    return Response.json({ error: "CV must be a PDF or Word document." }, { status: 415 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > CV_MAX) {
    return Response.json({ error: "CV exceeds the 5 MB limit." }, { status: 413 });
  }

  const { id: cvId } = await putMedia({
    buffer,
    contentType: file.type,
    filename: file.name,
    visibility: "private",
  });

  const record = await createItem("applications", {
    jobId: get("jobId"),
    jobTitle: get("jobTitle").slice(0, 200),
    name: name.slice(0, 200),
    email: email.slice(0, 200),
    phone: get("phone").slice(0, 60),
    linkedin: get("linkedin").slice(0, 300),
    message: get("message").slice(0, 4000),
    cvId,
    cvName: String(file.name || "cv").slice(0, 200),
    status: "new",
    createdAt: new Date().toISOString(),
  });
  logActivity({ actor: null, verb: "created", sectionKey: "applications", entityType: "applications", entityId: record.id, label: `New application from ${record.name}`, href: "/studio/applications" }).catch(() => {});

  return Response.json({ ok: true, id: record.id }, { status: 201 });
}

// Admin: list applications (purging any past their 7-day retention first).
export async function GET() {
  if (!(await requireSection("applications"))) return forbidden();
  await purgeExpiredApplications();
  return Response.json(await getCollection("applications"));
}
