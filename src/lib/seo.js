import { locales, defaultLocale } from "@/lib/i18n";
import { youtubeVideoId, youtubeThumbnailUrl } from "@/lib/youtube";
import { CONTACT, SITE_DESCRIPTION } from "@/lib/site";

// Canonical site origin. Override with NEXT_PUBLIC_SITE_URL when a custom
// domain is connected; falls back to the current production URL.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://nompany.com"
).replace(/\/$/, "");

// OpenGraph locale codes for each app locale.
const OG_LOCALE = { en: "en_US", ar: "ar_SA" };

// Per-page SEO copy, written for the audio-visual / systems-integration
// industry with Saudi Arabia geo-targeting. Keyed by route path ("" = home).
export const PAGES = {
  "": {
    en: {
      title: "Run your company's whole operation from one platform",
      description:
        "nompany is a modular ERP that runs a company's entire operation from one platform — Sales, Projects, Inventory, HR, Finance and live statistics. Start free and pay only for the modules you use.",
    },
    ar: {
      title: "أدِر عمليات شركتك بالكامل من منصة واحدة",
      description:
        "nompany نظام تخطيط موارد مرن يدير عمليات الشركة بالكامل من منصة واحدة — المبيعات والمشاريع والمخزون والموارد البشرية والمالية والإحصائيات المباشرة. ابدأ مجانًا وادفع فقط مقابل ما تستخدمه.",
    },
  },
  "/features": {
    en: {
      title: "Modular business applications for every department",
      description:
        "Switch on the business applications your company needs — Sales, Projects, Inventory, Operations, HR and Finance — each with its own dashboards and statistics. One login, pay per module.",
    },
    ar: {
      title: "تطبيقات أعمال معيارية لكل قسم",
      description:
        "فعّل تطبيقات الأعمال التي تحتاجها شركتك — المبيعات والمشاريع والمخزون والعمليات والموارد البشرية والمالية — لكل منها لوحاته وإحصائياته. تسجيل دخول واحد، وادفع لكل وحدة على حدة.",
    },
  },
  "/about": {
    en: {
      title: "One platform for company operations",
      description:
        "nompany helps companies and corporates run their entire operation from a single platform — paying only for the departments and applications they actually use.",
    },
    ar: {
      title: "منصة واحدة لعمليات الشركة",
      description:
        "يساعد nompany الشركات والمؤسسات على إدارة عملياتها بالكامل من منصة واحدة — مع الدفع فقط مقابل الأقسام والتطبيقات التي تستخدمها فعليًا.",
    },
  },
  "/careers": {
    en: {
      title: "Careers",
      description:
        "Join nompany and help build the platform companies run on. View our current openings.",
    },
    ar: {
      title: "الوظائف",
      description:
        "انضم إلى nompany وساهم في بناء المنصة التي تُدير الشركات أعمالها عليها. اطّلع على الوظائف الشاغرة.",
    },
  },
  "/team": {
    en: {
      title: "Team",
      description:
        "Meet the team building nompany — the modular ERP that lets any company run its whole operation from one platform.",
    },
    ar: {
      title: "الفريق",
      description:
        "تعرّف على الفريق الذي يبني nompany — نظام تخطيط الموارد المرن الذي يتيح لأي شركة إدارة عملياتها من منصة واحدة.",
    },
  },
  "/contact": {
    en: {
      title: "Contact Us",
      description:
        "Questions about nompany, pricing, or getting your company set up? We respond within one business day.",
    },
    ar: {
      title: "تواصل معنا",
      description:
        "لديك أسئلة عن nompany أو الأسعار أو تهيئة شركتك؟ نرد خلال يوم عمل واحد.",
    },
  },
  "/terms": {
    en: {
      title: "Terms & Conditions",
      description:
        "The terms governing use of the nompany ERP platform — subscriptions, payments and refunds, GDPR and EMEA data protection, and data retention.",
    },
    ar: {
      title: "الشروط والأحكام",
      description:
        "الشروط التي تحكم استخدام منصة nompany لتخطيط موارد المؤسسات — الاشتراكات والمدفوعات والاستردادات وحماية البيانات وفق اللائحة الأوروبية (GDPR) وأنظمة منطقة EMEA والاحتفاظ بالبيانات.",
    },
  },
};

const KEYWORDS = {
  en: [
    "modular ERP",
    "ERP software",
    "company management platform",
    "business applications suite",
    "business operations software",
    "corporate management software",
    "business statistics and analytics",
    "à la carte ERP modules",
    "sales CRM",
    "project management software",
    "inventory management",
    "HR software",
    "finance module",
    "bilingual ERP Arabic English",
  ],
  ar: [
    "نظام تخطيط موارد مرن",
    "برنامج تخطيط موارد المؤسسات",
    "منصة إدارة الشركات",
    "تطبيقات الأعمال",
    "برنامج إدارة العمليات",
    "برنامج إدارة الشركات والمؤسسات",
    "إحصائيات وتحليلات الأعمال",
    "وحدات ERP حسب الطلب",
    "إدارة المبيعات والعملاء",
    "برنامج إدارة المشاريع",
    "إدارة المخزون",
    "برنامج الموارد البشرية",
    "الوحدة المالية",
    "نظام ثنائي اللغة عربي إنجليزي",
  ],
};

// Absolute URL for a locale + route path.
export function urlFor(locale, path = "") {
  return `${SITE_URL}/${locale}${path}`;
}

// hreflang alternates (+ x-default) for a given route path.
export function alternatesFor(path = "") {
  const languages = {};
  for (const loc of locales) languages[loc] = urlFor(loc, path);
  languages["x-default"] = urlFor(defaultLocale, path);
  return languages;
}

// Build a Next.js Metadata object for a public page.
export function buildMetadata({ locale, path = "" }) {
  const page = PAGES[path]?.[locale] || PAGES[path]?.[defaultLocale] || {};
  const title = page.title;
  const description = page.description;
  const canonical = urlFor(locale, path);

  return {
    title,
    description,
    keywords: KEYWORDS[locale] || KEYWORDS.en,
    alternates: {
      canonical,
      languages: alternatesFor(path),
    },
    openGraph: {
      type: "website",
      url: canonical,
      siteName: "nompany",
      title,
      description,
      locale: OG_LOCALE[locale] || OG_LOCALE.en,
      alternateLocale: locales
        .filter((l) => l !== locale)
        .map((l) => OG_LOCALE[l]),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

// ---- Structured data (JSON-LD) -------------------------------------------

function sameAs() {
  return CONTACT.socials.map((s) => s.href).filter(Boolean);
}

export function organizationLd(settings, locale = defaultLocale) {
  const name = "nompany";
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name,
    legalName: "nompany",
    url: SITE_URL,
    logo: `${SITE_URL}/brand/logo-full.png`,
    description: SITE_DESCRIPTION[locale] || SITE_DESCRIPTION.en,
    email: CONTACT.email,
    telephone: CONTACT.phone,
    areaServed: { "@type": "Country", name: "Saudi Arabia" },
    address: {
      "@type": "PostalAddress",
      addressLocality: "Riyadh",
      addressCountry: "SA",
    },
    sameAs: sameAs(),
  };
}

export function websiteLd(settings, locale = defaultLocale) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: "nompany",
    inLanguage: locale,
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

// Turn "Sunday – Thursday, 8:30 AM – 5:30 PM" into a schema.org spec.
function openingHours() {
  return {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
    opens: "08:30",
    closes: "17:30",
  };
}

export function localBusinessLd(settings, locale = defaultLocale) {
  const name = "nompany";
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": `${SITE_URL}/#localbusiness`,
    name,
    image: `${SITE_URL}/brand/logo-full.png`,
    url: SITE_URL,
    email: CONTACT.email,
    telephone: CONTACT.phone,
    priceRange: "$$$",
    description: SITE_DESCRIPTION[locale] || SITE_DESCRIPTION.en,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Riyadh",
      addressCountry: "SA",
    },
    areaServed: { "@type": "Country", name: "Saudi Arabia" },
    openingHoursSpecification: [openingHours()],
    sameAs: sameAs(),
  };
}

export function breadcrumbLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

// ItemList of services, each modelled as a schema.org Service.
export function servicesLd(services, locale, pageUrl) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    url: pageUrl,
    itemListElement: services.map((svc, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Service",
        name: locale === "ar" ? svc.title_ar || svc.title_en : svc.title_en,
        description: locale === "ar" ? svc.desc_ar || svc.desc_en : svc.desc_en,
        provider: { "@id": `${SITE_URL}/#organization` },
        areaServed: { "@type": "Country", name: "Saudi Arabia" },
        serviceType: svc.title_en,
      },
    })),
  };
}

// JobPosting for an open role.
export function jobPostingLd(job, settings, locale) {
  const title = locale === "ar" ? job.title_ar || job.title_en : job.title_en;
  const description =
    locale === "ar" ? job.desc_ar || job.desc_en : job.desc_en;
  const employmentType = (job.type_en || "").toUpperCase().includes("PART")
    ? "PART_TIME"
    : "FULL_TIME";
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title,
    description: description || title,
    employmentType,
    hiringOrganization: {
      "@type": "Organization",
      name: "nompany",
      sameAs: SITE_URL,
      logo: `${SITE_URL}/brand/logo-full.png`,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality:
          (locale === "ar" ? job.location_ar : job.location_en) || "Riyadh",
        addressCountry: "SA",
      },
    },
    industry: "Enterprise Software (ERP / SaaS)",
    datePosted: new Date().toISOString().slice(0, 10),
  };
}

// VideoObject for an embedded YouTube case-study video. Returns null when the
// stored URL isn't a recognizable YouTube link (no embeddable video).
export function videoObjectLd(item, locale) {
  const videoId = youtubeVideoId(item.youtube_url);
  if (!videoId) return null;
  const name = locale === "ar" ? item.title_ar || item.title_en : item.title_en;
  const description = locale === "ar" ? item.desc_ar || item.desc_en : item.desc_en;
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name,
    description: description || name,
    thumbnailUrl: [youtubeThumbnailUrl(item.youtube_url)],
    uploadDate: item.createdAt || new Date().toISOString(),
    embedUrl: `https://www.youtube.com/embed/${videoId}`,
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}
