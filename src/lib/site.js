// nompany's public contact + identity, kept in CODE (not the shared `settings`
// Redis record, which still feeds MegaTech's ERP). Single source of truth for
// the footer, Contact page and JSON-LD. See [[nompany-pivot]].

// WHERE THE MARKETING SITE LIVES.
//
// The public marketing site (home, features, pricing, about, team, contact) was
// removed from this app on 2026-08-12 and replaced wholesale by the standalone
// `nompany-main-website` deployment. This app now keeps only the surfaces that
// site does not serve: authentication, the account hub, careers and terms —
// plus the studio slug routing that owns the apex.
//
// The domain split:
//   www.nompany.com  → the marketing site (one page, no routes)
//   nompany.com      → this app: studio slugs, auth, account, careers, terms
// Override with NEXT_PUBLIC_MARKETING_URL to point at a preview deployment or
// a local run of the marketing site.
//
// NB: the host must NOT also carry a www → apex redirect. This app redirects
// "/" to www; if www redirected back, that is an immediate infinite loop — the
// same ERR_TOO_MANY_REDIRECTS failure proxy.js warns about for slug routing.
export const MARKETING_URL = (
  process.env.NEXT_PUBLIC_MARKETING_URL || "https://www.nompany.com"
).replace(/\/$/, "");

// The marketing site is a SINGLE PAGE — it has no routes and no locale prefix,
// so every link into it lands on the root. This helper exists to keep that fact
// in one place: if the site ever grows real paths, only it has to change.
export function marketingUrl() {
  return MARKETING_URL;
}

export const CONTACT = {
  email: "info@nompany.com",
  phone: "+966 53 068 8184",
  address: { en: "Riyadh, KSA", ar: "الرياض، المملكة العربية السعودية" },
  city: { en: "Riyadh", ar: "الرياض" },
  // No public social links yet.
  socials: [],
};

// Short description used for structured data (JSON-LD).
export const SITE_DESCRIPTION = {
  en: "nompany is a modular ERP that lets any company run its entire operation from one platform — Sales, Projects, Inventory, HR, Finance and more — paying only for the modules it uses.",
  ar: "nompany نظام تخطيط موارد مرن يتيح لأي شركة إدارة عملياتها بالكامل من منصة واحدة — المبيعات والمشاريع والمخزون والموارد البشرية والمالية وغيرها — مع الدفع فقط مقابل الوحدات المستخدمة.",
};
