import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@/lib/identity";
import { studioContext, canAdminister } from "@/lib/studios";
import { listSections } from "@/lib/data/sections";
import StudioFrame from "@/components/studio2/StudioFrame";
import StudioPeople from "@/components/studio2/StudioPeople";

export const dynamic = "force-dynamic";
export const metadata = { title: "Studio", robots: { index: false, follow: false } };

// THE STUDIO. Served at the tenant's own address — www.nompany.com/<slug> — via
// the proxy rewrite; this internal folder name never appears in the browser.
//
// Tenancy is SLUG-DRIVEN: the URL names the tenant (x-studio-slug, set by the
// proxy) and MEMBERSHIP authorises it. A stranger who guesses a slug gets a 404
// and learns nothing.
export default async function StudioPage({ params }) {
  const slug = (await headers()).get("x-studio-slug") || "";
  if (!slug) notFound();

  const user = await currentUser();
  if (!user) redirect(`/en/login`);

  const context = await studioContext(user, slug);
  // Both "no such studio" and "not a member" render the same 404 on purpose —
  // membership is not discoverable from the outside.
  if (context.error) {
    if (context.error === "forbidden") return <NotAMember slug={slug} />;
    notFound();
  }

  const { studio, collaborator } = context;
  const sections = await listSections(studio.id);
  const { segments = [] } = await params;
  const requested = segments[0] || "";
  const isPeople = requested === "people";
  const admin = canAdminister(studio, collaborator);
  const active = isPeople ? null : (sections.find((s) => s.key === requested) || sections[0] || null);

  return (
    <StudioFrame
      studio={{ name: studio.name, slug: studio.slug }}
      me={{ alias: collaborator.alias || "", role: collaborator.role, canAdminister: admin }}
      sections={sections.map((s) => ({ id: s.id, key: s.key, name: s.name, enabled: s.enabled }))}
      activeKey={isPeople ? "people" : (active?.key || "")}
    >
      {isPeople
        ? <StudioPeople slug={studio.slug} canAdminister={admin} myCollaboratorId={collaborator.id} />
        : <SectionPlaceholder section={active} studio={studio} />}
    </StudioFrame>
  );
}

function SectionPlaceholder({ section, studio }) {
  if (!section) return <p className="text-sm text-slate-500">This studio has no sections yet.</p>;
  return (
    <div className="rounded-geex border border-slate-200/70 bg-white p-8 dark:border-white/10 dark:bg-[#20202c]">
      <h2 className="font-display text-xl font-800 text-slate-900 dark:text-white">{section.name}</h2>
      <p className="mt-2 max-w-prose text-sm text-slate-500 dark:text-slate-400">
        This section is live on the new data model — it has its own SectionID
        (<code className="font-mono text-xs">{section.id}</code>) and its records will be stored under it,
        scoped to {studio.name}. The module's screens are being rebuilt on this foundation.
      </p>
    </div>
  );
}

function NotAMember({ slug }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--geex-page)] px-5">
      <div className="max-w-md rounded-geex border border-slate-200/70 bg-white p-8 text-center dark:border-white/10 dark:bg-[#20202c]">
        <h1 className="font-display text-xl font-800 text-slate-900 dark:text-white">You're not in this studio</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Ask an admin of <span className="font-mono">{slug}</span> to approve your request, then try again.
        </p>
        <Link href="/en/account" className="mt-5 inline-block rounded-full bg-brand-600 px-5 py-2.5 font-display text-sm font-700 text-white hover:bg-brand-700">
          Back to your account
        </Link>
      </div>
    </main>
  );
}
