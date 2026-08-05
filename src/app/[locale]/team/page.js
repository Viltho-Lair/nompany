import Reveal from "@/components/Reveal";
import { getCollection } from "@/lib/db";
import { getDict } from "@/lib/i18n";
import { buildMetadata, breadcrumbLd, urlFor } from "@/lib/seo";
import { showcaseTeam } from "@/lib/showcase";
import JsonLd from "@/components/JsonLd";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return buildMetadata({ locale, path: "/team" });
}

export default async function TeamPage({ params }) {
  const { locale } = await params;
  const dict = getDict(locale);
  // Our Team now comes from the Employees collection (User Management) —
  // position/department are stored as ids, resolved here to names.
  const [employees, positions, departments] = await Promise.all([
    getCollection("employees"),
    getCollection("positions"),
    getCollection("departments"),
  ]);
  const positionsById = Object.fromEntries(positions.map((p) => [p.id, p]));
  const departmentsById = Object.fromEntries(departments.map((d) => [d.id, d]));
  const team = showcaseTeam(employees, positionsById, departmentsById);

  const breadcrumb = breadcrumbLd([
    { name: dict.nav.home, url: urlFor(locale, "") },
    { name: dict.team.title, url: urlFor(locale, "/team") },
  ]);

  return (
    <>
      <JsonLd data={breadcrumb} />
      <section className="border-b border-steel-400/15 bg-white dark:border-white/10 dark:bg-[#0b1633]">
        <div className="container-page pb-12 pt-36 sm:pt-44">
          <p className="font-display text-xs font-700 uppercase tracking-[0.3em] text-brand-500 dark:text-brand-300">{dict.common.brand}</p>
          <h1 className="mt-4 font-display text-5xl font-800 uppercase leading-[1.02] tracking-tight text-brand-950 dark:text-white sm:text-7xl">
            {dict.team.title}
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-steel-700 dark:text-slate-300">{dict.team.lead}</p>
        </div>
      </section>
      <section className="container-page py-14 sm:py-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {team.map((m, i) => (
            <Reveal key={m.id} delay={i * 50}>
              <div className="flex h-full items-center gap-5 rounded-2xl border border-steel-400/15 bg-white p-6 transition-all hover:border-brand-500/40 hover:shadow-[0_30px_60px_-35px_rgba(3,31,93,0.5)] dark:border-white/10 dark:bg-white/[0.03]">
                {m.image ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={m.image}
                    alt={m.name}
                    className="h-24 w-24 shrink-0 rounded-2xl object-cover"
                  />
                ) : (
                  <span className="inline-flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-brand-950/5 font-display text-3xl font-700 text-brand-700 dark:bg-white/10 dark:text-brand-500">
                    {m.name?.charAt(0)}
                  </span>
                )}
                <div className="min-w-0">
                  <h2 className="font-display text-lg font-700 text-brand-950 dark:text-white">{m.name}</h2>
                  {m.position && <p className="mt-0.5 text-sm font-600 text-brand-500">{m.position}</p>}
                  {m.department && <p className="mt-0.5 text-sm text-steel-500 dark:text-slate-400">{m.department}</p>}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
