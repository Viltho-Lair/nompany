import { notFound } from "next/navigation";
import { publicProfile } from "@/lib/website";
import ContactForm from "@/components/public/ContactForm";

export const dynamic = "force-dynamic";

// A studio's public company profile, at nompany.com/c/<slug>.
//
// Kept off the root so it can never collide with the private studio at /<slug>.
// An unpublished or unknown slug is a 404 — identical responses, so this page
// can't be used to discover which studios exist.
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const profile = await publicProfile(slug);
  if (!profile) return { title: "Not found", robots: { index: false, follow: false } };
  return {
    // Just the name — the root layout's template appends "· nompany" already.
    title: profile.name,
    description: profile.intro || profile.headline || profile.name,
    openGraph: { title: profile.name, description: profile.intro || profile.headline || "" },
  };
}

export default async function CompanyProfile({ params }) {
  const { slug } = await params;
  const profile = await publicProfile(slug);
  if (!profile) notFound();

  const { contact } = profile;
  const hasContact = contact.email || contact.phone || contact.addressText || contact.website || contact.linkedin;

  return (
    <main className="min-h-screen bg-[var(--geex-page)]">
      <header className="border-b border-slate-200/70 bg-white dark:border-white/10 dark:bg-[#20202c]">
        <div className="mx-auto max-w-4xl px-5 py-16">
          <p className="font-display text-sm font-700 uppercase tracking-wide text-brand-700 dark:text-brand-300">
            {profile.name}
          </p>
          <h1 className="mt-3 font-display text-4xl font-800 leading-tight text-slate-900 dark:text-white sm:text-5xl">
            {profile.headline}
          </h1>
          {profile.intro && (
            <p className="mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-300">{profile.intro}</p>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-12 px-5 py-14">
        {profile.about && (
          <section>
            <h2 className="font-display text-xl font-800 text-slate-900 dark:text-white">About</h2>
            <p className="mt-3 whitespace-pre-wrap text-slate-600 dark:text-slate-300">{profile.about}</p>
          </section>
        )}

        {profile.services.length > 0 && (
          <section>
            <h2 className="font-display text-xl font-800 text-slate-900 dark:text-white">What we do</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {profile.services.map((s) => (
                <div key={s.id} className="rounded-geex border border-slate-200/70 bg-white p-5 dark:border-white/10 dark:bg-[#20202c]">
                  <h3 className="font-display font-700 text-slate-900 dark:text-white">{s.title}</h3>
                  {s.summary && <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">{s.summary}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {profile.showcase.length > 0 && (
          <section>
            <h2 className="font-display text-xl font-800 text-slate-900 dark:text-white">Selected work</h2>
            <ul className="mt-4 divide-y divide-slate-200/70 dark:divide-white/10">
              {profile.showcase.map((p) => (
                <li key={p.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h3 className="font-display font-700 text-slate-900 dark:text-white">{p.title}</h3>
                    {p.year && <span className="text-xs text-slate-400">{p.year}</span>}
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {[p.clientName, p.location].filter(Boolean).join(" · ")}
                  </p>
                  {p.summary && <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">{p.summary}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {hasContact && (
          <section>
            <h2 className="font-display text-xl font-800 text-slate-900 dark:text-white">Get in touch</h2>
            <ul className="mt-3 space-y-1 text-slate-600 dark:text-slate-300">
              {contact.email && <li><a className="hover:underline" href={`mailto:${contact.email}`}>{contact.email}</a></li>}
              {contact.phone && <li>{contact.phone}</li>}
              {contact.addressText && (
                <li>
                  {contact.addressText}
                  {contact.mapUrl && (
                    <a href={contact.mapUrl} target="_blank" rel="noopener noreferrer nofollow"
                      className="ms-2 text-brand-700 hover:underline dark:text-brand-300">map</a>
                  )}
                </li>
              )}
              {contact.website && (
                <li><a href={contact.website} target="_blank" rel="noopener noreferrer nofollow" className="text-brand-700 hover:underline dark:text-brand-300">{contact.website}</a></li>
              )}
              {contact.linkedin && (
                <li><a href={contact.linkedin} target="_blank" rel="noopener noreferrer nofollow" className="text-brand-700 hover:underline dark:text-brand-300">LinkedIn</a></li>
              )}
            </ul>
          </section>
        )}

        <ContactForm slug={profile.slug} company={profile.name} />
      </div>

      <footer className="border-t border-slate-200/70 py-8 text-center text-sm text-slate-400 dark:border-white/10">
        <a href="/" className="hover:underline">Powered by nompany</a>
      </footer>
    </main>
  );
}
