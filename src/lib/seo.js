import { locales, defaultLocale } from "@/lib/i18n";
import { youtubeVideoId, youtubeThumbnailUrl } from "@/lib/youtube";

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
      title: "Audio Visual, Lighting & IT Systems Integrator in Saudi Arabia",
      description:
        "MegaTech Arabia designs, installs and commissions audio-visual, lighting, IT infrastructure and collaborative workspace systems across Saudi Arabia. Turnkey AV integration since 2009.",
    },
    ar: {
      title: "تكامل أنظمة الصوت والمرئيات والإضاءة وتقنية المعلومات في السعودية",
      description:
        "تصمّم ميجاتك العربية وتركّب وتشغّل أنظمة الصوتيات والمرئيات والإضاءة والبنية التحتية لتقنية المعلومات وأثاث التعاون في جميع أنحاء المملكة العربية السعودية. حلول متكاملة منذ 2009.",
    },
  },
  "/services": {
    en: {
      title: "AV, Lighting & IT Integration Services",
      description:
        "Turnkey audio-visual, professional lighting, IT infrastructure and collaborative furniture services — from site survey and system design to testing and commissioning across the Kingdom.",
    },
    ar: {
      title: "خدمات تكامل الصوتيات والمرئيات والإضاءة وتقنية المعلومات",
      description:
        "حلول متكاملة في الصوتيات والمرئيات والإضاءة الاحترافية والبنية التحتية لتقنية المعلومات وأثاث التعاون — من مسح الموقع والتصميم حتى الاختبار والتشغيل في جميع أنحاء المملكة.",
    },
  },
  "/projects": {
    en: {
      title: "AV & Systems Integration Projects",
      description:
        "Explore auditoriums, control rooms, visitor centres and collaborative workspaces MegaTech Arabia has surveyed, designed and commissioned across Saudi Arabia.",
    },
    ar: {
      title: "مشاريع تكامل الصوتيات والمرئيات والأنظمة",
      description:
        "استكشف القاعات وغرف التحكم ومراكز الزوار ومساحات العمل التعاونية التي قامت ميجاتك العربية بمسحها وتصميمها وتشغيلها في جميع أنحاء المملكة العربية السعودية.",
    },
  },
  "/vendors": {
    en: {
      title: "Technology Partners & AV Vendors",
      description:
        "MegaTech Arabia partners with leading audio-visual, lighting and IT brands to deliver reliable, professional-grade systems integration for Saudi organisations.",
    },
    ar: {
      title: "الشركاء التقنيون وموردو أنظمة الصوت والمرئيات",
      description:
        "تتعاون ميجاتك العربية مع أبرز العلامات التجارية في الصوتيات والمرئيات والإضاءة وتقنية المعلومات لتقديم تكامل أنظمة موثوق واحترافي للمؤسسات السعودية.",
    },
  },
  "/clients": {
    en: {
      title: "Our Clients Across the Kingdom",
      description:
        "Government, education and enterprise organisations across Saudi Arabia trust MegaTech Arabia with their audio-visual, lighting and IT spaces.",
    },
    ar: {
      title: "عملاؤنا في جميع أنحاء المملكة",
      description:
        "تثق الجهات الحكومية والتعليمية ومؤسسات القطاع الخاص في جميع أنحاء المملكة العربية السعودية بميجاتك العربية في مساحات الصوت والمرئيات والإضاءة وتقنية المعلومات.",
    },
  },
  "/careers": {
    en: {
      title: "Careers in AV Systems Integration",
      description:
        "Join MegaTech Arabia and help build the Kingdom's most demanding audio-visual, lighting and IT spaces. View current openings across Saudi Arabia.",
    },
    ar: {
      title: "وظائف في تكامل أنظمة الصوت والمرئيات",
      description:
        "انضم إلى ميجاتك العربية وساهم في بناء أكثر المساحات تطلبًا في المملكة في مجالات الصوتيات والمرئيات والإضاءة وتقنية المعلومات. اطّلع على الوظائف الشاغرة.",
    },
  },
  "/team": {
    en: {
      title: "Our Team",
      description:
        "Meet the AV, lighting and IT engineers who survey, design, integrate and commission every MegaTech Arabia project across Saudi Arabia.",
    },
    ar: {
      title: "فريقنا",
      description:
        "تعرّف على مهندسي الصوتيات والمرئيات والإضاءة وتقنية المعلومات الذين يقومون بمسح وتصميم وتكامل وتشغيل كل مشروع لدى ميجاتك العربية في المملكة العربية السعودية.",
    },
  },
  "/gallery": {
    en: {
      title: "Project Gallery",
      description:
        "Browse photos of audio-visual, lighting and IT spaces MegaTech Arabia has surveyed, designed and commissioned across Saudi Arabia.",
    },
    ar: {
      title: "معرض المشاريع",
      description:
        "تصفّح صور مساحات الصوتيات والمرئيات والإضاءة وتقنية المعلومات التي قامت ميجاتك العربية بمسحها وتصميمها وتشغيلها في جميع أنحاء المملكة العربية السعودية.",
    },
  },
  "/contact": {
    en: {
      title: "Contact Us",
      description:
        "Tell us about your audio-visual, lighting or IT project in Saudi Arabia. MegaTech Arabia responds within one business day.",
    },
    ar: {
      title: "تواصل معنا",
      description:
        "أخبرنا عن مشروعك في الصوتيات والمرئيات أو الإضاءة أو تقنية المعلومات في المملكة العربية السعودية. ترد ميجاتك العربية خلال يوم عمل واحد.",
    },
  },
};

const KEYWORDS = {
  en: [
    "audio visual integration",
    "AV systems integrator Saudi Arabia",
    "systems integration Riyadh",
    "professional lighting systems",
    "IT infrastructure",
    "collaborative workspace",
    "boardroom AV",
    "digital signage",
    "commissioning",
  ],
  ar: [
    "تكامل الصوتيات والمرئيات",
    "متكامل أنظمة في السعودية",
    "تكامل الأنظمة في الرياض",
    "أنظمة الإضاءة الاحترافية",
    "البنية التحتية لتقنية المعلومات",
    "مساحات العمل التعاونية",
    "أنظمة قاعات الاجتماعات",
    "اللافتات الرقمية",
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
      siteName: "MegaTech Arabia",
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

function sameAs(settings) {
  return [settings.linkedin, settings.twitter, settings.instagram].filter(Boolean);
}

export function organizationLd(settings, locale = defaultLocale) {
  const name = locale === "ar" ? settings.name_ar : settings.name_en;
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name,
    legalName: settings.name_en,
    url: SITE_URL,
    logo: `${SITE_URL}/brand/logo-full.png`,
    foundingDate: settings.founded_year,
    description: locale === "ar" ? settings.intro_ar : settings.intro_en,
    email: settings.email,
    telephone: settings.phone,
    areaServed: { "@type": "Country", name: "Saudi Arabia" },
    address: {
      "@type": "PostalAddress",
      streetAddress: locale === "ar" ? settings.address_ar : settings.address_en,
      addressLocality: "Riyadh",
      addressCountry: "SA",
    },
    sameAs: sameAs(settings),
  };
}

export function websiteLd(settings, locale = defaultLocale) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: locale === "ar" ? settings.name_ar : settings.name_en,
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
  const name = locale === "ar" ? settings.name_ar : settings.name_en;
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": `${SITE_URL}/#localbusiness`,
    name,
    image: `${SITE_URL}/brand/logo-full.png`,
    url: SITE_URL,
    email: settings.email,
    telephone: settings.phone,
    priceRange: "$$$",
    foundingDate: settings.founded_year,
    description: locale === "ar" ? settings.about_ar : settings.about_en,
    address: {
      "@type": "PostalAddress",
      streetAddress: locale === "ar" ? settings.address_ar : settings.address_en,
      addressLocality: "Riyadh",
      addressCountry: "SA",
    },
    areaServed: { "@type": "Country", name: "Saudi Arabia" },
    openingHoursSpecification: [openingHours()],
    sameAs: sameAs(settings),
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
      name: settings.name_en,
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
    industry: "Audio Visual Systems Integration",
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
