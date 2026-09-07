import { locales, defaultLocale } from "@/shared/i18n";
import { youtubeVideoId, youtubeThumbnailUrl } from "@/lib/youtube";
import { CONTACT, SITE_DESCRIPTION } from "@/lib/site";

// Canonical site origin, and the "www." is load-bearing rather than cosmetic.
// The site SERVES on www.nompany.com; the apex 308-redirects to it. This
// fallback said `https://nompany.com`, so every canonical, og:url, hreflang
// alternate and sitemap entry named a URL that redirects — search engines were
// being pointed one hop away from the page they were reading, and Google's
// OAuth verification checks the privacy-policy URL against the domain it is
// actually served from.
//
// It is the same apex-vs-www mismatch that produced a `redirect_uri_mismatch`
// on the calendar OAuth client (docs/functionality/calendar.md), where a real
// operator registered the apex and providers compared byte for byte.
//
// Production overrides this with NEXT_PUBLIC_SITE_URL. The fallback matters
// anyway: it is what preview builds and local development use, and a default
// that disagrees with production is a default nobody can trust.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.nompany.com"
).replace(/\/$/, "");

// OpenGraph locale codes for each app locale.
const OG_LOCALE: Record<string, string> = { en: "en_US", ar: "ar_SA" };

// Per-page SEO copy, keyed by route path ("" = the landing page).
/** Title and description for one page, in one language. */
type PageCopy = { title: string; description: string };

export const PAGES: Record<string, Record<string, PageCopy> | undefined> = {
  "": {
    en: {
      title: "Run your company's whole operation from one platform",
      description:
        "nompany is a modular ERP that runs a company's entire operation from one platform — Sales, Projects, Inventory, HR, Finance and live statistics. Free for teams of one to nine; paid plans from ten people up.",
    },
    ar: {
      title: "ادر عمليات شركتك بالكامل من منصة واحدة",
      description:
        "nompany نظام تخطيط موارد مرن يدير عمليات الشركة بالكامل من منصة واحدة — المبيعات والمشاريع والمخزون والموارد البشرية والمالية والإحصائيات المباشرة. مجاني للفرق من واحد الى تسعة، وخطط مدفوعة من عشرة افراد فاكثر.",
    },
  },
  "/platform": {
    en: {
      title: "The platform — eleven departments on one data model",
      description:
        "Sales, tendering, projects, engineering, procurement, inventory, field operations, logistics, people and finance, sharing one data model. Arabic and English, with every record permissioned to the row.",
    },
    ar: {
      title: "المنصة — أحد عشر قسما على نموذج بيانات واحد",
      description:
        "المبيعات والمناقصات والمشاريع والهندسة والمشتريات والمخزون والعمليات الميدانية والخدمات اللوجستية والموارد البشرية والمالية على نموذج بيانات واحد. بالعربية والإنجليزية، وكل سجل محكوم بالصلاحيات حتى مستوى الصف.",
    },
  },
  "/pricing": {
    en: {
      title: "Pricing — free for teams of one to nine",
      description:
        "One price per employee per month, VAT included, in SAR. Free for teams of one to nine; paid plans from ten people up. Every plan carries the whole product.",
    },
    ar: {
      title: "الاسعار — مجاني للفرق من واحد الى تسعة",
      description:
        "سعر واحد لكل موظف شهريا، شامل ضريبة القيمة المضافة، بالريال السعودي. مجاني للفرق من واحد الى تسعة، وخطط مدفوعة من عشرة افراد فاكثر. كل خطة تحمل المنتج كاملا.",
    },
  },
  "/security": {
    en: {
      title: "Security — what protects your data, and what we do not claim",
      description:
        "Row-level security forced at the database, membership-only authorisation, bcrypt at cost 12 with rehash on login, console MFA, session digests, an audit record for every change, and no third-party JavaScript. Plus a plain list of the certifications we do not hold.",
    },
    ar: {
      title: "الامان — ما يحمي بياناتك، وما لا ندعيه",
      description:
        "امن على مستوى الصف مفروض في قاعدة البيانات، وصلاحية بالعضوية وحدها، وتشفير كلمات المرور بمعامل 12، وتحقق متعدد العوامل للوحة التحكم، وسجل لكل تغيير، وبلا اي جافاسكربت من طرف ثالث. مع قائمة صريحة بما لا نملكه من شهادات.",
    },
  },
  // NO DEMO IS OFFERED, in either language, because there is none to book and
  // the page says so in its own first sentence. A description that promised one
  // would be the meta tag disagreeing with the page it describes — and it is
  // the promise the whole contact copy was rewritten to stop making.
  "/contact": {
    en: {
      title: "Contact — ask a question, reach a person",
      description:
        "There is no demo to book: the free tier is the whole product. Send a question and it reaches a mailbox somebody reads — support for teams under ten, sales from ten people up.",
    },
    ar: {
      title: "تواصل معنا — اسأل وتصل رسالتك الى شخص",
      description:
        "لا يوجد عرض توضيحي تحجزه، فالخطة المجانية هي المنتج كاملا. ارسل سؤالك ليصل الى صندوق بريد يقرأه شخص — الدعم للفرق دون العشرة، والمبيعات من عشرة افراد فاكثر.",
    },
  },
  "/about": {
    en: {
      title: "About nompany",
      description:
        "A small company building one ERP for small and medium companies across the region — sales, tendering, projects, procurement, inventory, people and finance on one data model, in Arabic and English.",
    },
    ar: {
      title: "عن نومباني",
      description:
        "شركة صغيرة تبني نظام تخطيط موارد للشركات الصغيرة والمتوسطة في المنطقة — المبيعات والمناقصات والمشاريع والمشتريات والمخزون والموارد البشرية والمالية على نموذج بيانات واحد، بالعربية والإنجليزية.",
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
  "/privacy": {
    en: {
      title: "Privacy Policy",
      description:
        "How nompany handles personal data — what is collected and why, who it is shared with, how it is protected, how long it is kept, and the disclosure for data obtained through Google APIs.",
    },
    ar: {
      title: "سياسة الخصوصية",
      description:
        "كيف تتعامل nompany مع البيانات الشخصية — ما الذي يُجمع ولماذا، ومع من يُشارَك، وكيف يُحمى، ومدة الاحتفاظ به، والإفصاح الخاص بالبيانات المُتحصَّل عليها عبر واجهات Google.",
    },
  },
};

const KEYWORDS: Record<string, string[]> = {
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
export function urlFor(locale: string, path = "") {
  return `${SITE_URL}/${locale}${path}`;
}

// hreflang alternates (+ x-default) for a given route path.
export function alternatesFor(path = "") {
  const languages: Record<string, string> = {};
  for (const loc of locales) languages[loc] = urlFor(loc, path);
  languages["x-default"] = urlFor(defaultLocale, path);
  return languages;
}

// Build a Next.js Metadata object for a public page.
export function buildMetadata({ locale, path = "" }: { locale: string; path?: string }) {
  const page: Partial<PageCopy> = PAGES[path]?.[locale] || PAGES[path]?.[defaultLocale] || {};
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

export function organizationLd(settings?: unknown, locale: string = defaultLocale) {
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
    // NO ADDRESS AND NO areaServed, and their absence is the correction.
    //
    // This asserted `addressLocality: "Riyadh"`, `addressCountry: "SA"` and an
    // areaServed of Saudi Arabia, on every public page, in the one format built
    // to be believed without being read. The company is not incorporated
    // anywhere, is not Saudi, and is heading for Jordan; the market is the whole
    // region rather than one country. Schema.org has no way to say "not yet",
    // so the fields are omitted — an absent claim is the only honest form of a
    // claim you cannot make, and they come back when there is an address.
    sameAs: sameAs(),
  };
}

export function websiteLd(settings?: unknown, locale: string = defaultLocale) {
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

export function localBusinessLd(settings?: unknown, locale: string = defaultLocale) {
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
    // NO ADDRESS, NO areaServed AND NO OPENING HOURS. A LocalBusiness with
    // opening hours describes a place somebody could walk into; there is no
    // staffed office anywhere, so the hours were a schedule for a door that
    // does not exist. Nobody buys an ERP from a map result either, which is why
    // this is left thin rather than filled in.
    sameAs: sameAs(),
  };
}

export function breadcrumbLd(items: { name: string; url: string }[]) {
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
export function servicesLd(
  services: Record<string, string>[],
  locale: string,
  pageUrl: string,
) {
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
        serviceType: svc.title_en,
      },
    })),
  };
}

// JobPosting for an open role.
export function jobPostingLd(job: Record<string, string>, settings: unknown, locale: string) {
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
        // THE POSTING'S OWN LOCATION, and no fallback. This defaulted to
        // Riyadh, SA for any opening that did not state one — inventing a place
        // of work for a company with no office. A posting with no location says
        // none.
        addressLocality: (locale === "ar" ? job.location_ar : job.location_en) || undefined,
      },
    },
    industry: "Enterprise Software (ERP / SaaS)",
    datePosted: new Date().toISOString().slice(0, 10),
  };
}

// VideoObject for an embedded YouTube case-study video. Returns null when the
// stored URL isn't a recognizable YouTube link (no embeddable video).
export function videoObjectLd(item: Record<string, string>, locale: string) {
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
