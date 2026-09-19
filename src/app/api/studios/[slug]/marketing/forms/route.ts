// MARKETING FORMS — the studio's side (docs/functionality/forms.md).
//
// GET lists the forms, or with ?id= returns one whole for the editor. POST
// creates one from a template. PUT saves what the editor holds, or with
// `action: "status"` opens or closes it. DELETE removes a form nobody answered.
// Every rule is the service's; the route adds none.
import { route, refused } from "@/platform/http/route";
import { marketingContext } from "@/modules/marketing/campaigns";
import { listForms, getForm, createForm, saveForm, setFormStatus, removeForm } from "@/modules/marketing/forms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const spec = { auth: "studio", context: marketingContext, body: true, name: "marketing-forms" };

export const GET = route({ ...spec, body: false }, async (m) => {
  const id = new URL(m.request.url).searchParams.get("id") || "";
  const result = id ? await getForm(m, id) : await listForms(m);
  if (refused(result)) return result;
  return { ok: true, ...result };
});

export const POST = route(spec, async (m) => {
  const result = await createForm(m, m.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, form: result.form } };
});

export const PUT = route(spec, async (m) => {
  if (!m.body.id) return { error: "missing" };
  const id = String(m.body.id);
  const result = m.body.action === "status"
    ? await setFormStatus(m, id, String(m.body.status || ""))
    : await saveForm(m, id, m.body);
  if (refused(result)) return result;
  return { ok: true, form: result.form };
});

export const DELETE = route(spec, async (m) => {
  if (!m.body.id) return { error: "missing" };
  const result = await removeForm(m, String(m.body.id));
  if (refused(result)) return result;
  return { ok: true };
});
