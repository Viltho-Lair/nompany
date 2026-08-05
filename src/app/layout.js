import "./globals.css";
import { headers } from "next/headers";
import JsonLd from "@/components/JsonLd";
import { getSettings } from "@/lib/db";
import { organizationLd, websiteLd, SITE_URL } from "@/lib/seo";
import { dirFor, isLocale, defaultLocale, field } from "@/lib/i18n";

const FALLBACK_NAME = "MegaTech Arabia";

// Studio-editable (Company Info → Website name) drives the browser-tab title
// suffix ("%s · {name}"), applicationName, authors/creator/publisher and the
// OpenGraph site name for every page on the site.
export async function generateMetadata() {
  const headerLocale = (await headers()).get("x-locale");
  const locale = isLocale(headerLocale) ? headerLocale : defaultLocale;
  const settings = await getSettings();
  const siteName = field(settings, "site_name", locale) || FALLBACK_NAME;

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: `${siteName} — Turnkey technology, engineered end to end`,
      template: `%s · ${siteName}`,
    },
    description:
      "Founded in Riyadh in 2009, MegaTech Arabia delivers turnkey audio-visual, lighting, IT and collaborative furniture solutions across every city in Saudi Arabia.",
    applicationName: siteName,
    authors: [{ name: siteName }],
    creator: siteName,
    publisher: siteName,
    category: "technology",
    formatDetection: { email: false, address: false, telephone: false },
    icons: {
      icon: "/brand/logo-icon.png",
      apple: "/brand/logo-icon.png",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      type: "website",
      siteName,
    },
    twitter: {
      card: "summary_large_image",
    },
  };
}

export const viewport = {
  themeColor: "#031f5d",
};

export default async function RootLayout({ children }) {
  // The proxy sets x-locale so the correct lang/dir land on <html> for the
  // bilingual (EN/AR) site; default to English for non-localised routes.
  const headerLocale = (await headers()).get("x-locale");
  const locale = isLocale(headerLocale) ? headerLocale : defaultLocale;
  const dir = dirFor(locale);

  const settings = await getSettings();

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body>
        {/* Apply the saved/system theme, and any saved studio RTL choice,
            before paint to avoid a flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var m=document.cookie.match(/(?:^|; )theme=([^;]+)/);var t=m?decodeURIComponent(m[1]):'light';var sys=window.matchMedia('(prefers-color-scheme: dark)').matches;var d=(t==='dark')||(t==='system'&&sys);document.documentElement.classList.toggle('dark',d);var sd=localStorage.getItem('studio-dir');if((sd==='rtl'||sd==='ltr')&&location.pathname.indexOf('/studio')===0){document.documentElement.setAttribute('dir',sd);document.documentElement.setAttribute('lang',sd==='rtl'?'ar':'en');}}catch(e){}})();",
          }}
        />
        <JsonLd data={[organizationLd(settings, locale), websiteLd(settings, locale)]} />
        {children}
      </body>
    </html>
  );
}
