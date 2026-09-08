import "./globals.css";
import { FONT_VARS } from "./fonts";
import { cookies, headers } from "next/headers";
import JsonLd from "@/components/JsonLd";
import MuiProvider from "@/components/MuiProvider";
import { getSiteSettings } from "@/lib/data/site";
import { organizationLd, websiteLd, SITE_URL } from "@/lib/seo";
import { dirFor, isLocale, defaultLocale } from "@/shared/i18n";
import { isMarketingPath } from "@/shared/marketing/routes";

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
    // THREE FORMATS, BECAUSE THREE DIFFERENT AGENTS READ THIS.
    // The .ico is the only thing some Windows surfaces and older crawlers will
    // take; the .svg is what a current browser prefers and is the one that
    // stays sharp at any tab-bar density; the .png is what iOS pins to a home
    // screen, and Safari has never accepted an SVG there.
    icons: {
      icon: [
        { url: "/brand/favicon.ico", sizes: "any" },
        { url: "/brand/logo-icon.svg", type: "image/svg+xml" },
      ],
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
  // EVERY PAGE THAT WEARS THE MARKETING CHROME, not just the home page.
  //
  // This listed the locale root and the three auth screens, which was right
  // while those were the only pages carrying the dark shell. Platform, pricing,
  // security and about now render through the same MarketingShell — dark
  // palette, dark nav, dark footer — and were being handed `light`, so the
  // shell painted its own dark background while every token inside it resolved
  // to a light value. The page came out unreadable in patches rather than
  // obviously broken, which is why it survived being looked at.
  //
  // A saved `theme` cookie still wins over all of this: what is decided here is
  // only the default for somebody who has never chosen.
  // THIS WAS A HAND-TYPED REGEX AND IT WAS ALREADY WRONG. `/contact` had
  // shipped as a route without reaching it, so a page built on the dark shell
  // was served the light theme's tokens — precisely the failure the paragraph
  // above describes, in the file that describes it. `/careers` was one commit
  // from the same. One list, asserted against the pages that render the shell.
  const isMarketing = isMarketingPath(pathname);
  const theme = themeChoice || (isMarketing ? "dark" : "light");
  // `light` ships too, not just `dark`: MUI scopes its light variables to
  // `.light`, so without it MUI components render unstyled until its provider
  // hydrates. "system" is the one case the server cannot decide, so it emits
  // neither and the script below settles it before paint.
  // THE FONT VARIABLES RIDE ON <html>, so every rule in globals.css can resolve
  // them — including the studio shell's, which sits far below this element.
  const htmlClass = [FONT_VARS, isStudio && "studio-chrome", theme === "dark" && "dark", theme === "light" && "light"]
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
