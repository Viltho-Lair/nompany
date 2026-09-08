import { Cabin, IBM_Plex_Sans, IBM_Plex_Sans_Arabic, Inter, Saira, Sora, Tajawal } from "next/font/google";

/* THE SEVEN FAMILIES, SELF-HOSTED.
   ------------------------------------------------------------------
   THEY ARRIVED THROUGH ONE `@import` AT THE TOP OF `globals.css`, which is the
   worst place a font can be requested from. An `@import` inside a stylesheet is
   discovered only after that stylesheet has been fetched and parsed, so the
   browser learned about fonts.googleapis.com late, then paid a DNS lookup, a
   TLS handshake and a CSS round trip to it, and only THEN discovered that the
   font files live on fonts.gstatic.com — a second host, a second handshake.
   Four serialised steps in front of first paint, on every page, for seven
   families.

   `next/font/google` downloads the files at BUILD time and serves them from
   this origin, so both external hosts leave the critical path entirely and the
   files are discovered one hop away with no DNS and no handshake. It also
   removes a third party: no browser contacts Google on a visitor's behalf,
   which matters on a site whose security page says it loads nothing from
   anybody else.

   THE CSS KEEPS ITS OWN NAMES. Every rule in `globals.css` names these families
   as literal strings and `next/font` generates a hashed family name instead, so
   each is bound to a variable and the stylesheet asks for the variable. A
   rename at fifteen call sites, rather than a second naming system living
   beside the first.

   NOTHING IS PRELOADED, AND THAT IS THE CHOICE RATHER THAN AN OVERSIGHT.
   Preload is per-declaration, decided at module scope, and this application
   cannot know at that point which script a page will render: the marketing site
   takes its locale from the URL, but a STUDIO takes it from the tenant's own
   record — which the root layout never reads, because it never touches the
   database. A locale-conditional preload was written first and was wrong for
   exactly that reason: it stripped Tajawal from every Arabic studio, since a
   studio path carries no locale segment and resolved to English. Preloading all
   seven for everybody would spend the saving this change just made, and nobody
   reads both scripts at once. `display: swap` plus the system-ui fallback
   already declared in every one of those rules covers the gap. */

export const saira = Saira({
  subsets: ["latin"], weight: ["400", "500", "600", "700", "800"],
  display: "swap", variable: "--f-saira", preload: false,
});
export const plexSans = IBM_Plex_Sans({
  subsets: ["latin"], weight: ["400", "500", "600", "700"],
  display: "swap", variable: "--f-plex", preload: false,
});
export const sora = Sora({
  subsets: ["latin"], weight: ["400", "500", "600", "700"],
  display: "swap", variable: "--f-sora", preload: false,
});
export const inter = Inter({
  subsets: ["latin"], weight: ["400", "500", "600"],
  display: "swap", variable: "--f-inter", preload: false,
});
export const cabin = Cabin({
  subsets: ["latin"], weight: ["400", "500", "600", "700"],
  display: "swap", variable: "--f-cabin", preload: false,
});
export const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"], weight: ["400", "500", "600", "700"],
  display: "swap", variable: "--f-plex-ar", preload: false,
});
export const tajawal = Tajawal({
  subsets: ["arabic"], weight: ["400", "500", "700", "800"],
  display: "swap", variable: "--f-tajawal", preload: false,
});

/** Every family's variable, for the <html> element.
 *
 *  ALL SEVEN, ALWAYS. See the note above: the root layout cannot tell an Arabic
 *  studio from an English one, so narrowing this by locale silently removes the
 *  Arabic faces from the surface that needs them most. */
export const FONT_VARS = [
  saira.variable, plexSans.variable, sora.variable, inter.variable,
  cabin.variable, plexArabic.variable, tajawal.variable,
].join(" ");
