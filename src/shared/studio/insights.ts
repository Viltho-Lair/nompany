import { defaultLocale, type Locale } from "../locale";

// WHAT NOVA'S BUBBLE SAYS, in the reader's language.
//
// The API returns a KIND and its variables and no prose at all
// (src/modules/main/insights.ts). The sentence is assembled here, on display,
// exactly the way statuses and engagement stages are — which is what stops an
// Arabic studio being handed English by an API and stops a golden pinning a
// language it should not care about.
//
// ITS OWN MODULE, not a corner of ./misc, because the surfaces are split one
// module per screen so a department's words are not reachable from every other
// one. The bubble is a surface.
//
// MONEY IS PASSED IN, not imported. `fmtMoney` resolves the studio's company
// config and lives in lib/format, which knows about the app; everything under
// shared/ is pure values with no dependants and has to stay that way. The
// caller — a client component that already has the formatter — hands it over.

export type InsightVars = Record<string, unknown>;

/** What the bubble draws: a short category chip and the sentence itself. */
export type InsightCopy = { label: string; text: string };

/** How loudly it should be said. Only ordering depends on this; tone is a colour. */
export type InsightTone = "urgent" | "warn" | "info";

/**
 * ONE THING NOVA COULD SAY. Declared HERE rather than beside the derivations,
 * because both ends need it and only one end may import the other: the server
 * module reads Redis, and a client component that imported it would open a
 * connection from the browser bundle. Shared holds pure values with no
 * dependants, which is exactly what a wire shape is.
 */
export type Insight = {
  id: string;
  kind: string;
  tone: InsightTone;
  section: string;
  href: string | null;
  vars: InsightVars;
  weight: number;
};

// FOUR ROOTS ARE THEMSELVES HYPHENATED COMPOUNDS since the P0 restructure —
// "crm-sales", "engineering-docs", "field-service", "quality-hse" — where
// every earlier root was one bare word (`technical`, `operations`, `hr`, …).
// Declared here rather than derived from platform/db/keys' SECTION_DEFS
// because everything under shared/ is pure values with no dependants, and
// reaching up into platform/db from here would be exactly the kind of import
// that rule exists to forbid.
const COMPOUND_ROOTS = ["crm-sales", "engineering-docs", "field-service", "quality-hse"];

/**
 * THE DEPARTMENT A SECTION KEY BELONGS TO — "crm-sales-quotations" is CRM &
 * Sales. A prefix split rather than a table, because SECTION_DEFS names every
 * child `<department>-<thing>` and a hand-kept table is a second list to
 * forget to extend. `tasks`, `hr` and `projects` have no dash and are their
 * own department, which the same split already gives — but a PLAIN first-dash
 * split stops being enough the moment a root itself contains one, which is
 * exactly what the four compounds above do: "field-service-schedule".indexOf(
 * "-") would answer "field", a department this product does not have. Those
 * four are matched as a whole prefix first; everyone else still gets the
 * original single-dash split.
 */
export function departmentOf(sectionKey: string): string {
  const k = String(sectionKey || "");
  const compound = COMPOUND_ROOTS.find((root) => k === root || k.startsWith(`${root}-`));
  if (compound) return compound;
  const dash = k.indexOf("-");
  return dash === -1 ? k : k.slice(0, dash);
}

/**
 * ORDER FOR THE SCREEN SOMEBODY IS ON. Pure, and deliberately NOT done on the
 * server: the client holds one read for several minutes and re-ranks on every
 * navigation, so walking Sales → Finance changes what Nova says without another
 * pass over the database.
 *
 * An exact section match wins, its department next, then weight. Nothing is
 * FILTERED OUT by the view — an invoice ninety days overdue is worth saying on
 * the Tasks board too; it simply says it later.
 */
export function rankForView(insights: Insight[], view: string): Insight[] {
  const dept = departmentOf(view);
  const boost = (i: Insight) => (
    i.section === view ? 2000
      : (dept && departmentOf(i.section) === dept) ? 1000
        : 0
  );
  return [...insights].sort((a, b) => (boost(b) + b.weight) - (boost(a) + a.weight));
}

/** How the caller turns a raw amount into money. Locale-aware; supplied by it. */
export type MoneyFmt = (value: unknown) => string;

const s = (v: unknown) => (v == null ? "" : String(v));
const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// ---- English ---------------------------------------------------------------

const daysEn = (d: number) => `${d} day${Math.abs(d) === 1 ? "" : "s"}`;
/** The tail that says how many others there are. Empty when this is the only one. */
const moreEn = (v: unknown) => (n(v) > 0 ? ` (+${n(v)} more)` : "");

const LABEL_EN: Record<string, string> = {
  "task.overdue": "Task", "task.approval": "Approval", "task.awaiting": "Task",
  "quotation.noItems": "Quotation", "quotation.stale": "Quotation",
  "rfq.unquoted": "RFQ",
  "ticket.noRfq": "Ticket", "ticket.deadline": "Ticket",
  "project.overdue": "Project", "project.uninvoiced": "Project",
  "stock.out": "Stock", "stock.low": "Stock",
  "invoice.overdue": "Invoice", "invoice.draft": "Invoice",
  "bill.overdue": "Bill",
  "permit.expired": "Permit", "permit.expiring": "Permit",
  "hr.docExpiring": "Documents", "hr.leavePending": "Leave",
  "notifications.unread": "Notifications",
};

const DOC_EN: Record<string, string> = { ID: "ID", Passport: "passport" };

function textEn(kind: string, v: InsightVars, money: MoneyFmt): string | null {
  const tail = moreEn(v.more);
  switch (kind) {
    case "task.overdue":
      return `“${s(v.title)}” was due ${daysEn(n(v.days))} ago and is still on you.${tail}`;
    case "task.approval":
      return `“${s(v.title)}” is waiting on your decision.${tail}`;
    case "task.awaiting":
      return `“${s(v.title)}” is assigned to you and still open.${tail}`;
    case "quotation.noItems":
      return `${s(v.number)} is still a draft with no items priced.${tail}`;
    case "quotation.stale":
      return `${s(v.number)} has been with the client ${daysEn(n(v.days))} with no answer.${tail}`;
    case "rfq.unquoted":
      return `${s(v.reference)} has waited ${daysEn(n(v.days))} for a quotation.${tail}`;
    case "ticket.noRfq":
      return s(v.client)
        ? `${s(v.reference)} for ${s(v.client)} is open with no RFQ raised against it.${tail}`
        : `${s(v.reference)} is open with no RFQ raised against it.${tail}`;
    case "ticket.deadline": {
      const d = n(v.days);
      if (d < 0) return `${s(v.reference)} passed its deadline ${daysEn(-d)} ago.${tail}`;
      if (d === 0) return `${s(v.reference)} is due today.${tail}`;
      return `${s(v.reference)} is due in ${daysEn(d)}.${tail}`;
    }
    case "project.overdue":
      return `${s(v.number)} passed its end date ${daysEn(n(v.days))} ago and is still live.${tail}`;
    case "project.uninvoiced":
      return `${s(v.number)} is complete and has never been invoiced.${tail}`;
    case "stock.out":
      return `${s(v.name)} is out of stock — nothing on hand against its reorder level.${tail}`;
    case "stock.low":
      return `${s(v.name)} is down to ${n(v.qty)} against a reorder level of ${n(v.level)}.${tail}`;
    case "invoice.overdue":
      return n(v.more) > 0
        ? `${s(v.reference)} is ${daysEn(n(v.days))} overdue — ${money(v.amount)} of ${money(v.total)} outstanding across ${n(v.more) + 1} invoices.`
        : `${s(v.reference)} is ${daysEn(n(v.days))} overdue — ${money(v.amount)} outstanding.`;
    case "invoice.draft":
      return `${s(v.reference)} has been a draft ${daysEn(n(v.days))} — nobody has asked for the money.${tail}`;
    case "bill.overdue":
      return s(v.vendor)
        ? `${s(v.reference)} to ${s(v.vendor)} is ${daysEn(n(v.days))} overdue — ${money(v.amount)} to pay.${tail}`
        : `${s(v.reference)} is ${daysEn(n(v.days))} overdue — ${money(v.amount)} to pay.${tail}`;
    case "permit.expired":
      return `${s(v.reference)} has expired.${tail}`;
    case "permit.expiring":
      return n(v.days) <= 0
        ? `${s(v.reference)} expires today.${tail}`
        : `${s(v.reference)} expires in ${daysEn(n(v.days))}.${tail}`;
    case "hr.docExpiring": {
      const doc = DOC_EN[s(v.docKind)] || s(v.docKind).toLowerCase();
      const d = n(v.days);
      if (d < 0) return `${s(v.alias)}’s ${doc} expired ${daysEn(-d)} ago.${tail}`;
      if (d === 0) return `${s(v.alias)}’s ${doc} expires today.${tail}`;
      return `${s(v.alias)}’s ${doc} expires in ${daysEn(d)}.${tail}`;
    }
    case "hr.leavePending":
      return s(v.alias)
        ? `${s(v.alias)}’s leave request is waiting on a decision.${tail}`
        : `A leave request is waiting on a decision.${tail}`;
    case "notifications.unread":
      return `You have ${n(v.n)} unread notification${n(v.n) === 1 ? "" : "s"}.`;
    default:
      // A KIND THIS BUILD HAS NEVER HEARD OF is skipped, not drawn blank. The
      // server ships ahead of the client on a deploy, and half a sentence in a
      // bubble reads as a bug in the data rather than in the rollout.
      return null;
  }
}

// ---- Arabic ----------------------------------------------------------------

// Days, in the form the rest of the studio uses: the dual and the 3–10 plural
// are distinct words, and "2 يوم" is wrong in a way an English reader cannot
// see. Same shape as nNotificationsWaiting in ./misc.
const daysAr = (d: number) => {
  const a = Math.abs(d);
  if (a === 1) return "يوم واحد";
  if (a === 2) return "يومين";
  if (a <= 10) return `${a} أيام`;
  return `${a} يومًا`;
};
const moreAr = (v: unknown) => (n(v) > 0 ? ` (و${n(v)} غيرها)` : "");

const LABEL_AR: Record<string, string> = {
  "task.overdue": "مهمة", "task.approval": "اعتماد", "task.awaiting": "مهمة",
  "quotation.noItems": "عرض سعر", "quotation.stale": "عرض سعر",
  "rfq.unquoted": "طلب عرض سعر",
  "ticket.noRfq": "تذكرة", "ticket.deadline": "تذكرة",
  "project.overdue": "مشروع", "project.uninvoiced": "مشروع",
  "stock.out": "المخزون", "stock.low": "المخزون",
  "invoice.overdue": "فاتورة", "invoice.draft": "فاتورة",
  "bill.overdue": "ذمة دائنة",
  "permit.expired": "تصريح", "permit.expiring": "تصريح",
  "hr.docExpiring": "الوثائق", "hr.leavePending": "إجازة",
  "notifications.unread": "الإشعارات",
};

const DOC_AR: Record<string, string> = { ID: "الهوية", Passport: "جواز السفر" };

function textAr(kind: string, v: InsightVars, money: MoneyFmt): string | null {
  const tail = moreAr(v.more);
  switch (kind) {
    case "task.overdue":
      return `«${s(v.title)}» تأخّرت ${daysAr(n(v.days))} ولا تزال عليك.${tail}`;
    case "task.approval":
      return `«${s(v.title)}» بانتظار قرارك.${tail}`;
    case "task.awaiting":
      return `«${s(v.title)}» مسندة إليك ولا تزال مفتوحة.${tail}`;
    case "quotation.noItems":
      return `${s(v.number)} لا يزال مسودة بلا بنود مسعّرة.${tail}`;
    case "quotation.stale":
      return `${s(v.number)} عند العميل منذ ${daysAr(n(v.days))} بلا ردّ.${tail}`;
    case "rfq.unquoted":
      return `${s(v.reference)} ينتظر عرض سعر منذ ${daysAr(n(v.days))}.${tail}`;
    case "ticket.noRfq":
      return s(v.client)
        ? `${s(v.reference)} الخاصة بـ${s(v.client)} مفتوحة ولم يُرفع لها طلب عرض سعر.${tail}`
        : `${s(v.reference)} مفتوحة ولم يُرفع لها طلب عرض سعر.${tail}`;
    case "ticket.deadline": {
      const d = n(v.days);
      if (d < 0) return `${s(v.reference)} تجاوزت موعدها بـ${daysAr(-d)}.${tail}`;
      if (d === 0) return `${s(v.reference)} تستحق اليوم.${tail}`;
      return `${s(v.reference)} تستحق خلال ${daysAr(d)}.${tail}`;
    }
    case "project.overdue":
      return `${s(v.number)} تجاوز تاريخ انتهائه بـ${daysAr(n(v.days))} ولا يزال قائمًا.${tail}`;
    case "project.uninvoiced":
      return `${s(v.number)} مكتمل ولم تُصدَر له فاتورة قط.${tail}`;
    case "stock.out":
      return `${s(v.name)} نفد من المخزون — لا يوجد منه شيء مقابل حدّ إعادة الطلب.${tail}`;
    case "stock.low":
      return `${s(v.name)} انخفض إلى ${n(v.qty)} مقابل حدّ إعادة طلب ${n(v.level)}.${tail}`;
    case "invoice.overdue":
      return n(v.more) > 0
        ? `${s(v.reference)} متأخرة ${daysAr(n(v.days))} — ${money(v.amount)} من أصل ${money(v.total)} مستحقة على ${n(v.more) + 1} فواتير.`
        : `${s(v.reference)} متأخرة ${daysAr(n(v.days))} — ${money(v.amount)} مستحقة.`;
    case "invoice.draft":
      return `${s(v.reference)} مسودة منذ ${daysAr(n(v.days))} — لم يُطالَب بالمبلغ بعد.${tail}`;
    case "bill.overdue":
      return s(v.vendor)
        ? `${s(v.reference)} لـ${s(v.vendor)} متأخرة ${daysAr(n(v.days))} — ${money(v.amount)} للسداد.${tail}`
        : `${s(v.reference)} متأخرة ${daysAr(n(v.days))} — ${money(v.amount)} للسداد.${tail}`;
    case "permit.expired":
      return `${s(v.reference)} منتهية الصلاحية.${tail}`;
    case "permit.expiring":
      return n(v.days) <= 0
        ? `${s(v.reference)} تنتهي اليوم.${tail}`
        : `${s(v.reference)} تنتهي خلال ${daysAr(n(v.days))}.${tail}`;
    case "hr.docExpiring": {
      const doc = DOC_AR[s(v.docKind)] || s(v.docKind);
      const d = n(v.days);
      if (d < 0) return `${doc} الخاصة بـ${s(v.alias)} انتهت قبل ${daysAr(-d)}.${tail}`;
      if (d === 0) return `${doc} الخاصة بـ${s(v.alias)} تنتهي اليوم.${tail}`;
      return `${doc} الخاصة بـ${s(v.alias)} تنتهي خلال ${daysAr(d)}.${tail}`;
    }
    case "hr.leavePending":
      return s(v.alias)
        ? `طلب إجازة ${s(v.alias)} بانتظار القرار.${tail}`
        : `طلب إجازة بانتظار القرار.${tail}`;
    case "notifications.unread": {
      const c = n(v.n);
      const word = c === 1 ? "إشعار واحد" : c === 2 ? "إشعاران" : c <= 10 ? `${c} إشعارات` : `${c} إشعارًا`;
      return `لديك ${word} غير مقروء.`;
    }
    default:
      return null;
  }
}

/**
 * The chip and the sentence for one insight, or `null` when this build does not
 * know the kind — see the note on the English `default` arm.
 */
export function insightCopy(
  kind: string, vars: InsightVars, locale: string, money: MoneyFmt,
): InsightCopy | null {
  const ar = (locale as Locale) === "ar";
  const text = ar ? textAr(kind, vars, money) : textEn(kind, vars, money);
  if (!text) return null;
  return { label: (ar ? LABEL_AR : LABEL_EN)[kind] || "", text };
}

/** What the bubble's own furniture is called. Not per-kind; the frame around it. */
export function bubbleDict(locale: string) {
  const ar = (locale as Locale) === "ar";
  return ar
    ? {
      dismiss: "إخفاء", askNova: "اسأل نوفا عن هذا", open: "فتح", fromNova: "نوفا",
      whatShouldIDo: "ماذا أفعل حيال هذا؟",
    }
    : {
      dismiss: "Dismiss", askNova: "Ask Nova about this", open: "Open", fromNova: "Nova",
      whatShouldIDo: "What should I do about this?",
    };
}

// Referenced so the default export surface of this module stays honest about
// which locale it falls back to; ./sections and ./misc do the same.
export const INSIGHT_FALLBACK_LOCALE = defaultLocale;
