import { notFound } from "next/navigation";
import { publicForm } from "@/modules/marketing/forms";
import PublicFormPage from "./PublicFormPage";

// A STUDIO'S PUBLIC FORM (19/09/2026) — /f/<slug>/<code>. Read on the server, so
// the questions are in the first paint; answered through /api/f/<slug>/<code>.
// A draft, an unknown code and a switched-off department are the same 404.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug, code } = await params;
  const form = await publicForm(String(slug || "").toLowerCase(), String(code || ""));
  // A studio's form is not nompany's content, and is not for search engines.
  // ABSOLUTE: the tab reads the form's own name, not "· nompany" after it.
  return { title: { absolute: form?.name || "Form" }, robots: { index: false, follow: false } };
}

export default async function FormPage({ params }) {
  const { slug, code } = await params;
  const form = await publicForm(String(slug || "").toLowerCase(), String(code || ""));
  if (!form) notFound();
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-[#121218]">
      <PublicFormPage slug={String(slug).toLowerCase()} code={String(code)} form={form} />
    </main>
  );
}
