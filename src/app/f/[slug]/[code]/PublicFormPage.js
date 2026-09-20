"use client";
// The public form's one client piece: it hands PublicForm the two ways it
// speaks to the server — sending the answers, and sending a file before them.
import PublicForm from "@/components/forms/PublicForm";

export default function PublicFormPage({ slug, code, form }) {
  const submit = async (body) => {
    const res = await fetch(`/api/f/${slug}/${code}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    return res.json().catch(() => ({ ok: false, error: "failed" }));
  };
  // ONE FILE AT A TIME, as a multipart body. The answer stores the id this
  // hands back — never the file itself, and never a URL: the studio's members
  // read it through /api/media, and the person who sent it does not.
  const upload = async (questionId, file) => {
    const body = new FormData();
    body.append("questionId", questionId);
    body.append("file", file);
    const res = await fetch(`/api/f/${slug}/${code}/upload`, { method: "POST", body });
    const out = await res.json().catch(() => ({}));
    return res.ok && out?.file ? out.file : { error: out?.error || "failed" };
  };
  return <PublicForm form={form} onSubmit={submit} onUpload={upload} />;
}
