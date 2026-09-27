import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import { PageHero } from "@/components/landing/site/PageHero";
import { Reveal } from "@/components/landing/site/Reveal";
import { SettingsButton } from "@/components/landing/site/pages/cookies/SettingsButton";
import { breadcrumbLd, buildMetadata, urlFor } from "@/lib/seo";
import { getDict, isLocale } from "@/shared/i18n";
import { cookiesCopy } from "@/shared/marketing/cookies";

// THE COOKIE POLICY (27/09/2026). Every row is a cookie the code sets
// (shared/marketing/cookies.ts says where each name comes from). A reading page:
// the whole text is in the server HTML, and the only interactive part is the
// button that opens the same preferences panel as the footer's link.

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return buildMetadata({ locale, path: "/cookies" });
}

const H2 = "text-[1.5rem] font-medium tracking-[-0.025em] text-[#ececf1] md:text-[1.9rem] rtl:tracking-normal";
const BODY = "mt-4 max-w-[68ch] text-[16px] leading-[1.75] text-white/70";
const CARD = "rounded-3xl bg-white/[0.025] p-7 ring-1 ring-inset ring-white/[0.07]";

export default async function CookiesPage({ params }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const tr = cookiesCopy(locale);
  const dict = getDict(locale);

  return (
    <>
      <JsonLd
        data={breadcrumbLd([
          { name: dict.nav.home, url: urlFor(locale) },
          { name: tr.title, url: urlFor(locale, "/cookies") },
        ])}
      />
      <PageHero title={tr.title} lead={tr.lead}>
        <p className="mt-6 text-[13px] text-white/45">{tr.updated}</p>
      </PageHero>

      <div className="mx-auto max-w-[1280px] space-y-20 px-6 pb-40 md:px-10">
        <Reveal as="section">
          <h2 className={H2}>{tr.whatTitle}</h2>
          <p className={BODY}>{tr.whatBody}</p>
        </Reveal>

        <Reveal as="section">
          <h2 className={H2}>{tr.kindsTitle}</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className={CARD}>
              <h3 className="text-[1.15rem] font-medium text-[#ececf1]">{tr.necessaryTitle}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-white/65">{tr.necessaryBody}</p>
            </div>
            <div
              className={CARD}
              style={{ background: "radial-gradient(120% 100% at 100% 0%, rgba(139,124,255,0.18), rgba(139,124,255,0) 60%), rgba(255,255,255,0.025)" }}
            >
              <h3 className="text-[1.15rem] font-medium text-[#ececf1]">{tr.analyticsTitle}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-white/65">{tr.analyticsBody}</p>
            </div>
          </div>
        </Reveal>

        <Reveal as="section">
          <h2 className={H2}>{tr.tableTitle}</h2>
          <div className="mt-8 overflow-x-auto rounded-3xl ring-1 ring-inset ring-white/[0.08]">
            <table className="w-full min-w-[40rem] text-start text-[14px]">
              <thead>
                <tr className="bg-white/[0.04] text-white/55">
                  {[tr.head.name, tr.head.purpose, tr.head.lifetime, tr.head.category].map((h) => (
                    <th key={h} scope="col" className="px-5 py-3.5 text-start font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tr.rows.map((r) => (
                  <tr key={r.name} className="border-t border-white/[0.06] align-top">
                    <td className="whitespace-nowrap px-5 py-4 font-mono text-[13px] text-[#c9c2ff]" dir="ltr">
                      {r.name}
                    </td>
                    <td className="px-5 py-4 leading-relaxed text-white/70">{r.purpose}</td>
                    <td className="px-5 py-4 text-white/60">{r.lifetime}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[12px] ${
                          r.category === "analytics" ? "bg-[#8b7cff]/15 text-[#c9c2ff]" : "bg-white/[0.06] text-white/60"
                        }`}
                      >
                        {tr.categoryName[r.category]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>

        <Reveal as="section" className="grid gap-4 md:grid-cols-2">
          <div className={CARD}>
            <h2 className="text-[1.25rem] font-medium text-[#ececf1]">{tr.manageTitle}</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-white/65">{tr.manageBody}</p>
            <p className="mt-3 text-[14px] leading-relaxed text-white/50">{tr.browserBody}</p>
            <div className="mt-6">
              <SettingsButton label={tr.manageButton} />
            </div>
          </div>
          <div className={CARD}>
            <h2 className="text-[1.25rem] font-medium text-[#ececf1]">{tr.contactTitle}</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-white/65">{tr.contactBody}</p>
            <Link href={`/${locale}/privacy`} className="mt-6 inline-flex text-[14px] text-[#c9c2ff] hover:text-white">
              {dict.nav.privacy}
            </Link>
          </div>
        </Reveal>
      </div>
    </>
  );
}
