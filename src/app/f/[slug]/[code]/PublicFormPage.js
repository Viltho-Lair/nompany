"use client";
// The public form's one client piece: it hands PublicForm the way to send.
import PublicForm from "@/components/forms/PublicForm";

export default function PublicFormPage({ slug, code, form }) {
  const submit = async (body) => {
    const res = await fetch(`/api/f/${slug}/${code}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    return res.json().catch(() => ({ ok: false, error: "failed" }));
  };
  return <PublicForm form={form} onSubmit={submit} />;
}
