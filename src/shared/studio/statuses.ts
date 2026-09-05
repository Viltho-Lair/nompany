import { defaultLocale, type Locale } from "../locale";

// EVERY STATUS WORD IN THE STUDIO, IN ONE PLACE — because StatusPill already is.
//
// A status is the one kind of word that looks like data and is not. "Draft",
// "Approved", "In Progress" are a FIXED vocabulary the code defines: the record
// stores the English token, the transitions compare against it, and the goldens
// pin it. Nobody typed them, so unlike a client name or a section name they can
// and must be translated — but only where they are DISPLAYED. What is stored,
// compared and returned by the API does not change, which is why this is a
// display map keyed by the stored token rather than a rename.
//
// Keyed by (kind, status), mirroring STATUS_TONES in components/studio2/StatusPill
// exactly — the same two-level shape, the same kinds, the same status keys,
// spaces and capitalisation and all. That is deliberate: the two maps have to be
// edited together, and a shape you can diff side by side is the only way that
// stays true. A status this file does not know falls back to the stored token,
// so an unmapped value reads as English rather than as blank.

type StatusMap = Record<string, Record<string, string>>;

// English is the stored token, so there is no English map: `statusLabel` returns
// the token unchanged. Writing one out would be a second copy of the tokens to
// keep in step with the first, for no gain.
const ar: StatusMap = {
  changeOrder: {
    draft: "مسودة", submitted: "مُقدّمة",
    approved: "معتمدة", rejected: "مرفوضة",
  },
  invoice: { Draft: "مسودة", Sent: "مُرسلة", Paid: "مدفوعة", Cancelled: "ملغاة" },
  bill: {
    Draft: "مسودة", Received: "مستلمة", Approved: "معتمدة",
    Paid: "مدفوعة", Cancelled: "ملغاة", Disputed: "معترض عليها",
  },
  asset: { service: "قيد الخدمة", disposed: "مستبعد" },
  tenderStage: {
    Identified: "مرصودة", Preparing: "قيد الإعداد", Submitted: "مُقدّمة",
    Won: "مربوحة", Lost: "خاسرة", "No Bid": "لم نتقدّم", Withdrawn: "مسحوبة",
  },
  ticketStage: {
    Lead: "مبدئي", Opportunity: "فرصة", Commit: "التزام",
    "Closed Won": "أُغلق بالفوز", "Closed Lost": "أُغلق بالخسارة",
    "Cancelled by Client": "ألغاه العميل", "On-Hold": "معلّق", Dropped: "متروك",
  },
  task: { Open: "مفتوحة", "In progress": "قيد التنفيذ", Blocked: "متوقفة", Done: "منجزة" },
  movement: { in: "وارد", out: "صادر", adjust: "تسوية" },
  order: {
    Draft: "مسودة", Ordered: "مطلوب", "Partly received": "مستلم جزئيًا",
    Received: "مستلم", Cancelled: "ملغى",
  },
  delivery: { Draft: "مسودة", Issued: "صادر", Cancelled: "ملغى" },
  project: { Received: "مستلم", "In Progress": "قيد التنفيذ", "On Hold": "معلّق", Completed: "مكتمل" },
  rfq: { New: "جديد", "In-review": "قيد المراجعة", Converted: "تم تحويله", Rejected: "مرفوض" },
  quotation: {
    New: "جديد", Draft: "مسودة", Completed: "مكتمل",
    Sent: "مُرسل", Approved: "معتمد", Rejected: "مرفوض",
  },
  permit: { Valid: "ساري", Expiring: "يوشك على الانتهاء", Expired: "منتهٍ", "Not yet valid": "لم يسرِ بعد" },
  leave: { Pending: "قيد الانتظار", Approved: "معتمد", Declined: "مرفوض", Cancelled: "ملغى" },
  quality: {
    draft: "مسودة", rejected: "مرفوضة", review: "قيد المراجعة", approval: "قيد الاعتماد",
    approved: "معتمدة", effective: "سارية", superseded: "مُستبدَلة",
  },
  awb: { intransit: "قيد الشحن", delivered: "تم التسليم", exception: "استثناء", notmoved: "لم يتحرك" },
};

const maps: Partial<Record<Locale, StatusMap>> = { ar };

/**
 * The word to SHOW for a stored status token. Falls back to the token itself,
 * so a status added to the code before it is added here reads as English rather
 * than disappearing — a blank pill would look like a record with no status.
 */
export function statusLabel(kind: string, status: unknown, locale: string): string {
  const token = status == null ? "" : String(status);
  return maps[locale as Locale]?.[kind]?.[token] || token;
}
