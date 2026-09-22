import { defaultLocale, type Locale } from "../locale";

// CONTENT & BRAND ASSETS, IN WORDS (22/09/2026). The rules are
// modules/marketing/assets; the revision chain is lib/revisions, shared with
// Tendering's bid documents.

type Strings = {
  title: string;
  sub: string;
  add: string;
  edit: string;
  remove: string;
  none: string;
  noneHint: string;
  unattached: string;
  unattachedHint: string;
  name: string;
  kind: string;
  kinds: Record<string, string>;
  notes: string;
  campaign: string;
  noCampaign: string;
  version: string;
  versionHint: string;
  file: string;
  chooseFile: string;
  uploading: string;
  openFile: string;
  size: (kb: number) => string;
  by: (who: string) => string;
  counts: (current: number, superseded: number) => string;
  earlier: (n: number) => string;
  hideEarlier: string;
  replacedBy: string;
  replaceWith: string;
  replaceHint: string;
  replacePick: string;
  cannotDelete: string;
  save: string;
  cancel: string;
  confirmDelete: string;
  loading: string;
  failed: string;
  refuse: Record<string, string>;
};

const en: Strings = {
  title: "Content & brand assets",
  sub: "What was made for each campaign, and the studio's own brand files.",
  add: "Add an asset",
  edit: "Edit",
  remove: "Delete",
  none: "Nothing in the library yet.",
  noneHint: "Artwork, copy, video and logos — attached to a campaign, or to the studio itself.",
  unattached: "The studio's own",
  unattachedHint: "Brand files that belong to no single campaign, and anything whose campaign has since been deleted.",
  name: "Name",
  kind: "What it is",
  kinds: {
    artwork: "Artwork", copy: "Copy", video: "Video",
    logo: "Logo", document: "Document", other: "Other",
  },
  notes: "Notes",
  campaign: "Campaign",
  noCampaign: "The studio's own",
  version: "Version",
  versionHint: "Whatever the studio calls it — v2, final, Rev B. A new version is uploaded as its own asset and then marked as replacing this one.",
  file: "File",
  chooseFile: "Choose a file",
  uploading: "Uploading…",
  openFile: "Open",
  size: (kb) => `${kb} KB`,
  by: (who) => `by ${who}`,
  counts: (current, superseded) =>
    superseded > 0 ? `${current} current · ${superseded} replaced` : `${current} current`,
  earlier: (n) => (n === 1 ? "1 earlier version" : `${n} earlier versions`),
  hideEarlier: "Hide versions",
  replacedBy: "Replaced",
  replaceWith: "Mark as replaced by…",
  replaceHint: "The older file stays and stays readable. That is the point: what was on last autumn's adverts has to be answerable afterwards.",
  replacePick: "Choose the newer asset",
  cannotDelete: "Part of a version history, so it is kept.",
  save: "Save",
  cancel: "Cancel",
  confirmDelete: "Delete this asset and its file?",
  loading: "Reading the library…",
  failed: "The library could not be loaded.",
  refuse: {
    forbidden: "You do not have access to this.",
    name: "An asset needs a name.",
    kind: "Choose what it is.",
    file: "Choose a file to upload.",
    campaign: "That campaign is no longer there.",
    missing: "That asset is no longer there.",
    self: "An asset cannot replace itself.",
    "already-superseded": "That one has already been replaced.",
    "superseded-replacement": "A replaced asset cannot be the newer version.",
    "in-chain": "Part of a version history, so it is kept.",
    notfound: "That asset is no longer there.",
  },
};

const ar: Strings = {
  title: "المحتوى وأصول العلامة",
  sub: "ما أُنتج لكل حملة، وملفات العلامة الخاصة بالاستوديو.",
  add: "إضافة أصل",
  edit: "تعديل",
  remove: "حذف",
  none: "لا شيء في المكتبة بعد.",
  noneHint: "تصاميم ونصوص ومقاطع وشعارات — مرتبطة بحملة أو بالاستوديو نفسه.",
  unattached: "ملفات الاستوديو",
  unattachedHint: "ملفات العلامة التي لا تخص حملة بعينها، وكل ما حُذفت حملته.",
  name: "الاسم",
  kind: "النوع",
  kinds: {
    artwork: "تصميم", copy: "نص", video: "مقطع",
    logo: "شعار", document: "مستند", other: "أخرى",
  },
  notes: "ملاحظات",
  campaign: "الحملة",
  noCampaign: "ملفات الاستوديو",
  version: "الإصدار",
  versionHint: "ما يسميه الاستوديو — v2 أو نهائي أو مراجعة ب. الإصدار الجديد يُرفع كأصل مستقل ثم يُشار إلى أنه يحل محل هذا.",
  file: "الملف",
  chooseFile: "اختيار ملف",
  uploading: "جارٍ الرفع…",
  openFile: "فتح",
  size: (kb) => `${kb} كيلوبايت`,
  by: (who) => `بواسطة ${who}`,
  counts: (current, superseded) =>
    superseded > 0 ? `${current} حالية · ${superseded} مستبدلة` : `${current} حالية`,
  earlier: (n) => `${n} إصدار سابق`,
  hideEarlier: "إخفاء الإصدارات",
  replacedBy: "مستبدل",
  replaceWith: "تحديده كمستبدَل بـ…",
  replaceHint: "الملف الأقدم يبقى ويظل قابلاً للقراءة، وهذا هو المقصود: ما كان على إعلانات الخريف يجب أن يظل معروفاً لاحقاً.",
  replacePick: "اختاروا الأصل الأحدث",
  cannotDelete: "جزء من سجل الإصدارات، لذا يُحتفظ به.",
  save: "حفظ",
  cancel: "إلغاء",
  confirmDelete: "حذف هذا الأصل وملفه؟",
  loading: "جارٍ قراءة المكتبة…",
  failed: "تعذر تحميل المكتبة.",
  refuse: {
    forbidden: "لا تملكون صلاحية الاطلاع على ذلك.",
    name: "الأصل يحتاج اسماً.",
    kind: "اختاروا النوع.",
    file: "اختاروا ملفاً للرفع.",
    campaign: "لم تعد هذه الحملة موجودة.",
    missing: "لم يعد هذا الأصل موجوداً.",
    self: "لا يمكن لأصل أن يحل محل نفسه.",
    "already-superseded": "هذا الأصل مستبدَل أصلاً.",
    "superseded-replacement": "لا يصلح أصل مستبدَل ليكون الإصدار الأحدث.",
    "in-chain": "جزء من سجل الإصدارات، لذا يُحتفظ به.",
    notfound: "لم يعد هذا الأصل موجوداً.",
  },
};

export function marketingContentDict(locale: Locale | string | null | undefined): Strings {
  return (locale || defaultLocale) === "ar" ? ar : en;
}
