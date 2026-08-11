// nompany's public contact + identity, kept in CODE (not the shared `settings`
// Redis record, which still feeds MegaTech's ERP). Single source of truth for
// the footer, Contact page and JSON-LD. See [[nompany-pivot]].

// Feature flag: when true the public /pricing marketing route is LOCKED — the
// page 404s and every link to it is hidden (nav, footer, Features CTA, sitemap).
// Flip to false to unlock. Does NOT affect the in-app /subscribe module picker.
export const PRICING_LOCKED = false;

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
