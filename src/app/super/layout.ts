import "./super.css";
import type { ReactNode } from "react";

// /super — the platform owner's console.
//
// Reserved as a platform path in src/proxy.ts, so it is never mistaken for a
// studio slug and never gets a locale prefix. This layout only loads the scoped
// stylesheet and sets metadata; the two route groups underneath supply the
// chrome — `(console)` for every screen, `(full)` for the full-bleed
// auth / status screens.

export const metadata = {
  title: {
    default: "Super Admin",
    template: "%s · Super Admin",
  },
  description: "Sitta platform administration console.",
  robots: { index: false, follow: false },
};

export default function SuperLayout({ children }: { children: ReactNode }) {
  return children;
}
