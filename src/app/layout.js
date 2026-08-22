import "./globals.css";
import { cookies, headers } from "next/headers";
import JsonLd from "@/components/JsonLd";
import MuiProvider from "@/components/MuiProvider";
import { getSiteSettings } from "@/lib/data/site";
import { organizationLd, websiteLd, SITE_URL } from "@/lib/seo";
import { dirFor, isLocale, defaultLocale } from "@/shared/i18n";

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

  // THEME, RESOLVED ON THE SERVER.
  //
  // The saved choice is a cookie, so it is readable here — which means the
  // `dark` class ships in the first byte of HTML instead of being applied by a
  // script after paint. A saved preference therefore survives a refresh even if
  // the script never runs. Only "system" is undecidable server-side (it depends
  // on the visitor's OS), so that one case still falls to the script below.
  const themeChoice = (await cookies()).get("theme")?.value || "";
  const pathname = h.get("x-pathname") || "";
  const isMarketing =
    pathname === "/" || /^\/(en|ar)(\/(login|signup|forgot))?\/?$/.test(pathname);
  const theme = themeChoice || (isMarketing ? "dark" : "light");
  // `light` ships too, not just `dark`: MUI scopes its light variables to
  // `.light`, so without it MUI components render unstyled until its provider
  // hydrates. "system" is the one case the server cannot decide, so it emits
  // neither and the script below settles it before paint.
  const htmlClass = [isStudio && "studio-chrome", theme === "dark" && "dark", theme === "light" && "light"]
    .filter(Boolean)
    .join(" ");

  const settings = await getSiteSettings();

  return (
    <html lang={locale} dir={dir} className={htmlClass || undefined} suppressHydrationWarning>
      <body>
        {/* Apply the saved/system theme before paint, to avoid a flash.

            IT USED TO CARRY A STUDIO RTL BRANCH TOO, reading a `studio-dir`
            key out of localStorage. Nothing ever wrote that key, and its guard
            — `pathname.indexOf('/studio') === 0` — could never be true anyway:
            the proxy REWRITES nompany.com/<slug>/… onto the internal /studio
            folder without changing the address bar, so the browser never sees
            that path. Dead twice over, and a second mechanism for something a
            studio's own record now decides. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              // The server already resolved light/dark from the cookie above.
              // This only has to handle "system", which depends on the visitor's
              // OS and so cannot be known server-side. It also refreshes the
              // cookie's year-long expiry on every visit, so a preference kept
              // in continuous use never quietly lapses back to the default.
              "(function(){try{var m=document.cookie.match(/(?:^|; )theme=([^;]+)/);var t=m?decodeURIComponent(m[1]):'';if(t){document.cookie='theme='+t+'; path=/; max-age=31536000; samesite=lax'+(location.protocol==='https:'?'; secure':'');}if(t==='system'){var sys=window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',sys);document.documentElement.classList.toggle('light',!sys);}}catch(e){}})();",
          }}
        />
        <JsonLd data={[organizationLd(settings, locale), websiteLd(settings, locale)]} />
        {/* MUI owns the `dark` class (see MuiProvider) — hand it the same
            answer the server just reached so it re-applies it instead of
            replacing it with the OS preference. */}
        <MuiProvider mode={theme}>{children}</MuiProvider>
      </body>
    </html>
  );
}
