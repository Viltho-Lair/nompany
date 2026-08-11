import "./super.css";

// /super — the platform owner's console.
//
// Reserved as a platform path in src/proxy.js, so it is never mistaken for a
// studio slug and never gets a locale prefix. This layout only loads the scoped
// stylesheet and sets metadata; the two route groups underneath supply the
// chrome — `(shell)` for the sidebar console, `(full)` for the full-bleed
// auth / status screens.

export const metadata = {
  title: {
    default: "Super Admin",
    template: "%s · Super Admin",
  },
  description: "nompany platform administration console.",
  robots: { index: false, follow: false },
};

export default function SuperLayout({ children }) {
  return children;
}
