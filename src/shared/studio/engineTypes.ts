import type { Locale } from "../locale";

// WHAT A BUILT-IN RECORD TYPE IS CALLED, in the reader's language.
//
// THE REGISTER SCREEN USED TO RENDER EVERY WORD A TYPE SUPPLIES VERBATIM, on
// the grounds that a type's label, field labels and status words were typed
// into a studio's type editor and are therefore tenant DATA. That is true of a
// type a studio declares, and was never true of the twenty-four the product
// seeds: `platform/engine/builtins.ts` declares them, `origin: "builtin"` is
// what stops a studio editing them, and `reconcileBuiltinTypes` rewrites their
// words whenever the declaration changes. They are code — the argument
// ./sections makes for section names — so an Arabic studio was reading an
// Arabic shell around English registers: "Work orders", "Planned", "Released",
// in the sidebar and on every row.
//
// SO THEY TRANSLATE THE SAME WAY: on DISPLAY, keyed by the stored token, with
// the stored word as the fallback. Nothing stored changes — a status is still
// "In progress" in the database, in the API, in a rule's trigger and in an
// export — and a type whose `origin` is not "builtin" is never looked up at
// all, because what a studio typed is shown as typed.
//
// A word added to a declaration before it is added here reads as English
// rather than disappearing, which is the right way for this to be incomplete.

type Words = Record<string, string>;

const TYPE_AR: Words = {
  transmittal: "المراسلات الرسمية",
  rfi: "طلبات الاستيضاح",
  submittal: "التقديمات",
  ncr: "حالات عدم المطابقة والإجراءات التصحيحية",
  audit: "التدقيقات",
  incident: "حوادث الصحة والسلامة والبيئة",
  toolbox: "اجتماعات السلامة الميدانية",
  equipment: "سجل المعدات",
  calibration: "المعايرة",
  installed: "المعدات المركّبة لدى العملاء",
  delivery: "التسليمات وإثبات الاستلام",
  trip: "الرحلات والمسارات",
  vehicle: "سجل الأسطول",
  workorder: "أوامر العمل",
  bom: "قوائم المواد",
  station: "محطات العمل",
  batch: "دفعات الإنتاج",
  candidate: "التوظيف",
  appraisal: "تقييمات الأداء",
  course: "التدريب والمهارات",
  stocktake: "جرد المخزون",
  itp: "خطط الفحص والاختبار",
  testreport: "سجلات الفحص والاختبار",
  certification: "الشهادات",
  ebom: "قوائم المواد الهندسية والمواصفات",
  techlib: "المكتبة الفنية",
};

// Field labels are keyed per TYPE, because the same key means different things
// in different registers — `issuedOn` is "Issued" on a transmittal and on a
// certificate, `reference` is a batch number on one and a count on another.
const FIELD_AR: Record<string, Words> = {
  transmittal: { title: "العنوان", recipient: "المستلم", issuedOn: "تاريخ الإصدار", notes: "ملاحظات" },
  rfi: {
    subject: "الموضوع", question: "السؤال", ballInCourt: "الطرف المطالب بالرد", discipline: "التخصص",
    raisedOn: "تاريخ الطلب", neededBy: "مطلوب بحلول", answer: "الإجابة",
  },
  submittal: {
    title: "العنوان", specSection: "بند المواصفات", kind: "النوع", submittedBy: "مقدَّم من",
    submittedOn: "تاريخ التقديم", dueOn: "موعد الرد", comments: "ملاحظات المراجعة",
  },
  ncr: {
    title: "العنوان", description: "ما الذي وُجد", severity: "الخطورة", raisedOn: "تاريخ الرصد",
    rootCause: "السبب الجذري", correctiveAction: "الإجراء التصحيحي", dueBy: "موعد الإجراء",
    foundBy: "رُصد في الاختبار",
  },
  audit: {
    title: "العنوان", scope: "النطاق", auditor: "المدقق", standard: "المعيار",
    plannedOn: "التاريخ المخطط", findings: "النتائج",
  },
  incident: {
    title: "العنوان", happenedOn: "التاريخ", kind: "النوع", daysLost: "الأيام الضائعة",
    description: "ما الذي حدث", immediateAction: "الإجراء الفوري",
  },
  toolbox: { topic: "الموضوع", heldOn: "تاريخ الانعقاد", presenter: "المقدِّم", attendees: "الحضور", notes: "ملاحظات" },
  equipment: {
    name: "الاسم", assetTag: "رقم الأصل", category: "الفئة", serial: "الرقم التسلسلي",
    acquiredOn: "تاريخ الاقتناء", hireRate: "سعر التأجير الداخلي", location: "الموقع",
  },
  calibration: {
    instrument: "الجهاز", assetTag: "رقم الأصل", certificate: "الشهادة", calibratedOn: "تاريخ المعايرة",
    dueOn: "الاستحقاق التالي", issuedBy: "عايره", asset: "الآلة",
  },
  installed: {
    description: "المعدة", customer: "العميل", site: "الموقع", serial: "الرقم التسلسلي",
    installedOn: "تاريخ التركيب", warrantyEndsOn: "نهاية الضمان",
  },
  delivery: {
    reference: "مرجع العميل", customer: "العميل", address: "عنوان التسليم", promisedOn: "الموعد المتفق عليه",
    deliveredOn: "تاريخ التسليم", receivedBy: "استلمه", notes: "ملاحظات",
  },
  trip: {
    title: "العنوان", driver: "السائق", vehicle: "المركبة", departsOn: "تاريخ الانطلاق",
    origin: "نقطة الانطلاق", destination: "الوجهة", distanceKm: "المسافة (كم)",
  },
  vehicle: {
    plate: "رقم اللوحة", kind: "النوع", make: "الصنع والطراز", insuranceEndsOn: "نهاية التأمين",
    inspectionEndsOn: "نهاية الفحص الدوري", odometerKm: "عداد المسافة (كم)",
  },
  workorder: {
    title: "العنوان", product: "المنتج", quantity: "الكمية", dueOn: "تاريخ الاستحقاق",
    station: "محطة العمل", notes: "ملاحظات",
  },
  bom: { product: "المنتج", revision: "المراجعة", unit: "الوحدة", components: "المكونات", notes: "ملاحظات" },
  station: { name: "الاسم", kind: "النوع", capacityPerDay: "الطاقة اليومية", location: "الموقع" },
  batch: {
    reference: "الدفعة", product: "المنتج", quantity: "الكمية المنتجة", madeOn: "تاريخ الإنتاج",
    expiresOn: "تاريخ الانتهاء", notes: "ملاحظات", workOrder: "أمر العمل",
  },
  candidate: {
    name: "المرشح", role: "الوظيفة المتقدَّم لها", source: "المصدر", appliedOn: "تاريخ التقديم",
    email: "البريد الإلكتروني", phone: "الهاتف", notes: "ملاحظات",
  },
  appraisal: {
    employee: "الموظف", period: "الفترة", reviewer: "المقيِّم", dueOn: "تاريخ الاستحقاق", rating: "التقدير",
    strengths: "نقاط القوة", development: "مجالات التطوير", goals: "أهداف الفترة القادمة",
  },
  course: {
    title: "الدورة", employee: "الموظف", provider: "الجهة المقدِّمة", kind: "النوع",
    completedOn: "تاريخ الإتمام", expiresOn: "تاريخ الانتهاء", certificate: "الشهادة",
  },
  stocktake: {
    reference: "الجرد", location: "الموقع", countedOn: "تاريخ الجرد", countedBy: "أجراه",
    findings: "الفروقات المكتشفة", notes: "ملاحظات",
  },
  itp: {
    title: "العنوان", project: "المشروع", discipline: "التخصص", revision: "المراجعة",
    holdPoints: "نقاط التوقف والمعاينة", acceptance: "معايير القبول",
  },
  testreport: {
    reference: "المرجع", itp: "وفق خطة الفحص", location: "الموقع أو العنصر", inspectedOn: "تاريخ الفحص",
    inspector: "الفاحص", result: "النتيجة", findings: "النتائج",
  },
  certification: {
    title: "الشهادة", holder: "الحائز", kind: "النوع", issuer: "جهة الإصدار",
    issuedOn: "تاريخ الإصدار", expiresOn: "تاريخ الانتهاء", reference: "رقم الشهادة",
  },
  ebom: {
    product: "المنتج أو التجميعة", revision: "المراجعة", discipline: "التخصص",
    parts: "الأجزاء والكميات", specification: "المواصفات", approvedBy: "اعتمده",
  },
  techlib: {
    title: "العنوان", kind: "النوع", issuer: "جهة الإصدار", edition: "الإصدار أو السنة",
    reference: "الرقم المرجعي", notes: "ملاحظات",
  },
};

// Statuses and select options, keyed by the stored word. One map rather than
// one per type because the words mean the same thing wherever they appear —
// "Closed" is closed on an RFI and on an audit.
const WORD_AR: Words = {
  // Statuses
  Draft: "مسودة", Issued: "صادر", Acknowledged: "تم الاستلام",
  Open: "مفتوح", Answered: "تمت الإجابة", Closed: "مغلق",
  Submitted: "مقدَّم", "Under review": "قيد المراجعة", Approved: "معتمد",
  "Approved as noted": "معتمد مع ملاحظات", "Revise and resubmit": "يُعدَّل ويُعاد تقديمه",
  Investigating: "قيد التحقيق", "Action agreed": "تم الاتفاق على الإجراء", Verified: "تم التحقق",
  Planned: "مخطط", "In progress": "قيد التنفيذ", Reported: "تم الإبلاغ", Held: "انعقد",
  "In service": "في الخدمة", "Under repair": "قيد الإصلاح", Idle: "متوقف", Disposed: "مُستبعد",
  Valid: "سارية", Due: "مستحقة", Expired: "منتهية", Withdrawn: "مسحوب",
  Installed: "مركّب", "Under warranty": "ضمن الضمان", "Out of warranty": "خارج الضمان", Removed: "مُزال",
  "Out for delivery": "خرج للتسليم", Delivered: "تم التسليم", Failed: "تعذّر", Returned: "مُرتجع",
  Completed: "مكتمل", Cancelled: "ملغى", "Off road": "خارج الخدمة", Sold: "مُباع",
  Released: "مُطلق", Superseded: "مستبدل", Available: "متاحة", Down: "معطّلة", Retired: "متقاعدة",
  Complete: "مكتملة", Quarantined: "محجوزة", Scrapped: "مُتلفة",
  Applied: "تقدّم", Screening: "الفرز", Interview: "المقابلة", Offer: "العرض", Hired: "تم التعيين",
  Rejected: "مرفوض",
  "Self-assessment": "التقييم الذاتي", "Manager review": "مراجعة المدير", Shared: "تمت المشاركة",
  Booked: "محجوز", Counting: "قيد العد", Review: "المراجعة", Adjusted: "تمت التسوية",
  Witnessed: "تمت المعاينة", Accepted: "مقبول", Expiring: "قاربت الانتهاء", "In review": "قيد المراجعة",
  Current: "سارٍ",

  // Select options
  Us: "نحن", Client: "العميل", Consultant: "الاستشاري", Contractor: "المقاول", Subcontractor: "مقاول الباطن",
  Architectural: "معماري", Structural: "إنشائي", Mechanical: "ميكانيكي", Electrical: "كهربائي",
  Civil: "مدني", Instrumentation: "أجهزة القياس والتحكم", Software: "برمجيات", Other: "أخرى",
  "Product data": "بيانات المنتج", "Shop drawing": "مخطط تنفيذي", Sample: "عيّنة",
  "Method statement": "بيان طريقة العمل", Calculation: "حسابات",
  Minor: "طفيفة", Major: "كبيرة", Critical: "حرجة",
  Internal: "داخلي",
  "Near miss": "حادث وشيك", "First aid": "إسعاف أولي", "Medical treatment": "علاج طبي",
  "Lost time": "إصابة مضيعة للوقت", Environmental: "بيئي", "Property damage": "أضرار بالممتلكات",
  Plant: "آليات", Vehicle: "مركبة", Tool: "أداة", IT: "تقنية معلومات", Instrument: "جهاز قياس",
  Van: "فان", Truck: "شاحنة", Pickup: "بيك أب", Car: "سيارة", Trailer: "مقطورة",
  Machine: "آلة", Cell: "خلية", Line: "خط إنتاج", Bench: "طاولة عمل", Outsourced: "مُسند لجهة خارجية",
  Referral: "ترشيح", Agency: "وكالة توظيف", "Job board": "موقع وظائف", Direct: "مباشر",
  "Below expectations": "دون التوقعات", "Meets expectations": "يلبي التوقعات",
  "Exceeds expectations": "يفوق التوقعات", Outstanding: "متميز",
  Induction: "تعريفي", Safety: "السلامة", Technical: "فني", Compliance: "الامتثال", "Soft skills": "المهارات الشخصية",
  Pass: "ناجح", Fail: "راسب", "Pass with comment": "ناجح مع ملاحظة",
  Company: "الشركة", Person: "شخص", Equipment: "معدة", Product: "منتج", Site: "موقع",
  Standard: "معيار", Datasheet: "نشرة بيانات", Catalogue: "كتالوج", Manual: "دليل",
  "Reference drawing": "مخطط مرجعي",
};

const MAPS: Partial<Record<Locale, { type: Words; field: Record<string, Words>; word: Words }>> = {
  ar: { type: TYPE_AR, field: FIELD_AR, word: WORD_AR },
};

/** Arabic names for the built-in registers' sections, keyed `engine-<type>`. */
export const BUILTIN_SECTION_AR: Words = Object.fromEntries(
  Object.entries(TYPE_AR).map(([k, v]) => [`engine-${k}`, v]),
);

type TypeLike = { key?: unknown; origin?: unknown } | null | undefined;

/**
 * The words to SHOW for a record type. Every lookup falls back to the stored
 * word, and a type that is not `origin: "builtin"` always gets the stored word.
 */
export function engineWords(type: TypeLike, locale: string) {
  const m = String(type?.origin || "") === "builtin" ? MAPS[locale as Locale] : undefined;
  const typeKey = String(type?.key || "");
  return {
    label: (stored: string) => m?.type[typeKey] || stored,
    field: (fieldKey: string, stored: string) => m?.field[typeKey]?.[fieldKey] || stored,
    word: (stored: unknown) => m?.word[String(stored ?? "")] || String(stored ?? ""),
  };
}
