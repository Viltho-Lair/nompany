// nompany's public contact + identity, kept in CODE (not the shared `settings`
// Redis record, which still feeds MegaTech's ERP). Single source of truth for
// the footer, Contact page and JSON-LD. See [[nompany-pivot]].

// The public marketing site was rebuilt on 2026-08-12 and now lives at
// `/[locale]` in this app (see src/components/landing). It is a SINGLE PAGE:
// features, pricing and contact are in-page views, not routes, so the only
// public marketing URL is the locale root itself.

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
