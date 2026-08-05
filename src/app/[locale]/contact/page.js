import EditorialHeader from "@/components/public/EditorialHeader";
import ContactForm from "@/components/ContactForm";
import { getSettings } from "@/lib/db";
import { getDict, field } from "@/lib/i18n";
import { buildMetadata, localBusinessLd, breadcrumbLd, urlFor } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return buildMetadata({ locale, path: "/contact" });
}

export default async function ContactPage({ params }) {
  const { locale } = await params;
  const dict = getDict(locale);
  const s = await getSettings();

  const structured = [
    localBusinessLd(s, locale),
    breadcrumbLd([
      { name: dict.nav.home, url: urlFor(locale, "") },
      { name: dict.contact.title, url: urlFor(locale, "/contact") },
    ]),
  ];

  const details = [
    { label: dict.contact.reachUs, lines: [s.email, s.phone], ltrLast: true },
    {
      label: dict.contact.address,
      lines: [field(s, "address", locale), field(s, "city", locale)],
      href: s.maps_url || null,
    },
    { label: dict.contact.officeHours, lines: [field(s, "hours", locale)] },
  ];

  return (
    <>
      <JsonLd data={structured} />
      <EditorialHeader eyebrow={dict.common.brand} title={dict.contact.title} lead={dict.contact.lead} />
      <section className="container-page grid gap-12 py-14 sm:py-16 lg:grid-cols-[1fr_1.15fr]">
        <div className="space-y-8">
          {details.map((d) => (
            <div key={d.label}>
              <h2 className="font-display text-xs font-700 uppercase tracking-[0.24em] text-brand-500 dark:text-brand-300">
                {d.label}
              </h2>
              <div className="mt-2 space-y-1 text-lg text-brand-950 dark:text-white">
                {d.href ? (
                  <a
                    href={d.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block transition-colors hover:text-brand-700 hover:underline dark:hover:text-brand-500"
                  >
                    {d.lines.map((line, idx) => (
                      <p key={idx} className="rtl:text-end">
                        {line}
                      </p>
                    ))}
                  </a>
                ) : (
                  d.lines.map((line, idx) => (
                    <p key={idx} dir={d.ltrLast && idx === d.lines.length - 1 ? "ltr" : undefined} className="rtl:text-end">
                      {line}
                    </p>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-3xl border border-steel-400/20 bg-white p-6 dark:border-white/10 dark:bg-[#263965] sm:p-8">
          <ContactForm dict={dict} />
        </div>
      </section>
    </>
  );
}
