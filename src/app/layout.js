import "./globals.css";
import { headers } from "next/headers";
import JsonLd from "@/components/JsonLd";
import MuiProvider from "@/components/MuiProvider";
import { getSiteSettings } from "@/lib/data/site";
import { organizationLd, websiteLd, SITE_URL } from "@/lib/seo";
import { dirFor, isLocale, defaultLocale } from "@/lib/i18n";

// nompany is a fixed product brand (not tenant-configurable), so the tab-title
// suffix ("%s · nompany"), applicationName, authors/creator/publisher and the
// OpenGraph site name are constant across the marketing site.
const BRAND = "nompany";

export async function generateMetadata() {
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: `${BRAND} — Run every department from one platform`,
      template: `%s · ${BRAND}`,
    },
    description:
      "nompany is a modular ERP that lets any company run its entire operation from a single platform — Sales, Projects, Inventory, HR, Finance and more — turning on only the departments it needs and paying only for what it uses.",
    applicationName: BRAND,
    authors: [{ name: BRAND }],
    creator: BRAND,
    publisher: BRAND,
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
      siteName: BRAND,
    },
    twitter: {
      card: "summary_large_image",
    },
  };
}

export const viewport = {
  themeColor: "#0f172a",
};

export default async function RootLayout({ children }) {
  // The proxy sets x-locale so the correct lang/dir land on <html> for the
  // bilingual (EN/AR) site; default to English for non-localised routes.
  const h = await headers();
  const headerLocale = h.get("x-locale");
  const locale = isLocale(headerLocale) ? headerLocale : defaultLocale;
  const dir = dirFor(locale);

  // The Studio's whole design system — the --geex-* surface tokens, the Cabin
  // typeface and the three-size type scale — is scoped to `html.studio-chrome`
  // in globals.css. The proxy sets x-studio-slug on exactly the tenant
  // addresses, so tag <html> here: server-side, which avoids the flash of
  // untokenised background you get from setting the class in an effect.
  const isStudio = Boolean(h.get("x-studio-slug"));

  const settings = await getSiteSettings();

  return (
    <html lang={locale} dir={dir} className={isStudio ? "studio-chrome" : undefined} suppressHydrationWarning>
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
        <MuiProvider>{children}</MuiProvider>
      </body>
    </html>
  );
}
