// WHAT A NOTIFICATION SAYS — and who chooses the words.
//
// EVERY NOTIFICATION IN THIS PRODUCT WAS WRITTEN IN ENGLISH AT THE PRODUCER
// AND STORED AS A FINISHED SENTENCE. `notifyCollaborators` takes a `title` and
// a `body`, and nine call sites hand it a literal: "A leave request is
// waiting", "Someone requested 3 days off." So an Arabic studio's bell is
// entirely English — the whole surface, not a stray fragment — and no studio
// can change a word of it.
//
// THE FIX IS THE ONE THE STATUSES AND THE SALES FUNNEL ALREADY TOOK: a stored
// notification is a TOKEN plus its facts, and the words are chosen on DISPLAY.
// The producer says `leave.requested` with `{ who, days }`; the bell renders it
// in the reader's own language. The rule is the same one `docs/functionality/
// language.md` states for statuses, applied to the one surface that had escaped
// it.
//
// A STUDIO MAY OVERRIDE THE WORDING, per type and per language, which is the
// "notification templates" half. Overrides are stored on the studio record
// beside `taxonomies` and `units`; the shipped template is what a studio has
// not touched, so a later correction still reaches everybody who never edited.
//
// AND AN OLD ROW STILL READS. Every notification written before this holds a
// literal title and no params — `renderNotice` returns those untouched when it
// has no template or no params to fill one with. A migration that rewrote two
// hundred stored rows per studio to gain a translation would be a migration
// nobody asked for over records nobody can re-derive.
//
// PURE. No imports, no store — the bell renders exactly what the server would,
// and every rule here is asserted without a database.

export type NoticeTemplate = {
  /** The `NOTIFY.*` value this renders. */
  type: string;
  /** Placeholders this template may use. Anything else is refused. */
  fields: readonly string[];
  en: { title: string; body: string };
  ar: { title: string; body: string };
};

/**
 * THE SHIPPED WORDING, one entry per producer.
 *
 * `{name}` is filled from the notice's params. A placeholder with no param is
 * left as the empty string rather than printed raw: "A leave request from
 * {who}" on a bell is worse than "A leave request from", because the second
 * reads as missing data and the first reads as a broken product.
 *
 * `fields` is declared rather than derived from the strings, so a translation
 * cannot quietly introduce a placeholder the producer never sends.
 */
export const NOTICE_TEMPLATES: readonly NoticeTemplate[] = Object.freeze([
  {
    type: "join.requested",
    fields: [],
    en: { title: "Somebody asked to join", body: "A request is waiting in People." },
    ar: { title: "طلب انضمام جديد", body: "هناك طلب بانتظاركم في صفحة الأشخاص." },
  },
  {
    type: "join.decided",
    fields: ["studio"],
    en: { title: "You are in {studio}", body: "Your request to join was approved." },
    ar: { title: "تم قبولكم في {studio}", body: "تمت الموافقة على طلب الانضمام." },
  },
  {
    type: "people.changed",
    fields: ["who"],
    en: { title: "Access changed", body: "{who}" },
    ar: { title: "تغيرت الصلاحيات", body: "{who}" },
  },
  {
    type: "workrequest.raised",
    fields: ["reference", "title"],
    en: { title: "A fault was reported", body: "{reference} · {title}" },
    ar: { title: "تم الإبلاغ عن عطل", body: "{reference} · {title}" },
  },
  {
    type: "lead.waiting",
    fields: ["reference", "title"],
    en: { title: "A new lead is waiting to be assigned", body: "{reference} · {title}" },
    ar: { title: "عميل محتمل جديد بانتظار الإسناد", body: "{reference} · {title}" },
  },
  {
    type: "leads.waiting",
    fields: ["count"],
    en: { title: "New leads are waiting to be assigned", body: "{count} leads from Customer insights" },
    ar: { title: "عملاء محتملون جدد بانتظار الإسناد", body: "{count} من تحليلات العملاء" },
  },
  {
    type: "lead.assigned",
    fields: ["reference", "title"],
    en: { title: "A lead was assigned to you", body: "{reference} · {title}" },
    ar: { title: "أسند إليكم عميل محتمل", body: "{reference} · {title}" },
  },
  {
    type: "plan.assigned",
    fields: ["name"],
    en: { title: "You own a marketing plan", body: "{name}" },
    ar: { title: "خطة تسويق مسندة إليكم", body: "{name}" },
  },
  {
    type: "event.assigned",
    fields: ["name"],
    en: { title: "You own an event", body: "{name}" },
    ar: { title: "فعالية مسندة إليكم", body: "{name}" },
  },
  {
    type: "partner.assigned",
    fields: ["name"],
    en: { title: "You own a partner", body: "{name}" },
    ar: { title: "شريك مسند إليكم", body: "{name}" },
  },
  {
    type: "campaign.assigned",
    fields: ["reference", "name"],
    en: { title: "You own a campaign", body: "{reference} · {name}" },
    ar: { title: "حملة مسندة إليكم", body: "{reference} · {name}" },
  },
  {
    type: "workorder.assigned",
    fields: ["reference", "title"],
    en: { title: "You have been assigned a work order", body: "{reference} · {title}" },
    ar: { title: "أمر عمل موكل إليكم", body: "{reference} · {title}" },
  },
  {
    type: "workorder.due",
    fields: ["detail"],
    en: { title: "Due work orders", body: "{detail}" },
    ar: { title: "أوامر عمل مستحقة", body: "{detail}" },
  },
  {
    type: "stock.low",
    fields: ["detail"],
    en: { title: "Stock at reorder level", body: "{detail}" },
    ar: { title: "مخزون وصل حد إعادة الطلب", body: "{detail}" },
  },
  {
    type: "calibration.due",
    fields: ["detail"],
    en: { title: "Due calibrations", body: "{detail}" },
    ar: { title: "معايرات مستحقة", body: "{detail}" },
  },
  {
    type: "leave.requested",
    fields: ["who", "days"],
    en: { title: "A leave request is waiting", body: "{who} requested {days} off." },
    ar: { title: "طلب إجازة بانتظار الرد", body: "{who} طلب إجازة {days}." },
  },
  {
    type: "leave.decided",
    fields: ["outcome", "dates"],
    en: { title: "Your leave was {outcome}", body: "{dates}" },
    ar: { title: "إجازتكم {outcome}", body: "{dates}" },
  },
  {
    type: "project.assigned",
    fields: ["title"],
    en: { title: "You are managing a new project", body: "{title}" },
    ar: { title: "أنتم تديرون مشروعا جديدا", body: "{title}" },
  },
  {
    type: "purchase.received",
    fields: ["reference"],
    en: { title: "A purchase order was received in full", body: "{reference}" },
    ar: { title: "تم استلام أمر شراء بالكامل", body: "{reference}" },
  },
  {
    type: "approval.decided",
    fields: ["reference", "outcome"],
    en: { title: "An approval was {outcome}", body: "{reference}" },
    ar: { title: "اعتماد {outcome}", body: "{reference}" },
  },
  {
    type: "approval.requested",
    fields: ["reference"],
    en: { title: "Waiting for your signature", body: "{reference}" },
    ar: { title: "بانتظار توقيعكم", body: "{reference}" },
  },
  {
    type: "rfq.raised",
    fields: ["reference"],
    en: { title: "An RFQ is waiting to be quoted", body: "{reference}" },
    ar: { title: "طلب عرض سعر بانتظار التسعير", body: "{reference}" },
  },
  {
    type: "quotation.assigned",
    fields: ["reference", "title"],
    en: { title: "A quotation was assigned to you", body: "{reference} · {title}" },
    ar: { title: "أسند إليكم عرض سعر", body: "{reference} · {title}" },
  },
  {
    type: "mention",
    fields: ["who", "where"],
    en: { title: "You were mentioned", body: "{who} mentioned you in {where}." },
    ar: { title: "تمت الإشارة إليكم", body: "{who} أشار إليكم في {where}." },
  },
  // THE FOUR TIME-DRIVEN ONES are produced by the daily-notices cron over a
  // LIST, so each is a count and a detail line rather than one record: "3
  // invoices, INV-0002 and 2 more". `detail` is that line, already assembled
  // by the cron, because only it knows how to name a document of that kind.
  {
    type: "lead.overdue",
    fields: ["detail"],
    en: { title: "Leads waiting too long", body: "{detail}" },
    ar: { title: "عملاء محتملون تجاوزوا المهلة", body: "{detail}" },
  },
  {
    type: "invoice.overdue",
    fields: ["detail"],
    en: { title: "Overdue invoices", body: "{detail}" },
    ar: { title: "فواتير متأخرة", body: "{detail}" },
  },
  {
    type: "bill.overdue",
    fields: ["detail"],
    en: { title: "Bills overdue", body: "{detail}" },
    ar: { title: "ذمم متأخرة", body: "{detail}" },
  },
  {
    type: "document.expiring",
    fields: ["detail"],
    en: { title: "Documents expiring", body: "{detail}" },
    ar: { title: "وثائق تقارب الانتهاء", body: "{detail}" },
  },
  {
    type: "permit.expiring",
    fields: ["detail"],
    en: { title: "Permits expiring", body: "{detail}" },
    ar: { title: "تصاريح تقارب الانتهاء", body: "{detail}" },
  },
  // THE TWO THAT SHIPPED WITHOUT ONE, and so reached an Arabic bell in
  // English. `employment.changed` carries the move's English label as `move`
  // (the lifecycle's vocabulary is not translated yet — the same limit
  // `leave.requested`'s `{days}` has); the date is data.
  {
    type: "employment.changed",
    fields: ["move", "date"],
    en: { title: "Your employment changed", body: "{move} — {date}" },
    ar: { title: "تغيّر وضعكم الوظيفي", body: "{move} — {date}" },
  },
  {
    type: "nova.answered",
    fields: ["reply"],
    en: { title: "Support answered your question", body: "{reply}" },
    ar: { title: "رد الدعم على سؤالك", body: "{reply}" },
  },
  // PHASE 3 (28/09/2026).
  {
    type: "job.assigned",
    fields: ["title", "when", "where"],
    en: { title: "A job was assigned to you", body: "{title} · {when} · {where}" },
    ar: { title: "أُسندت إليكم مهمة ميدانية", body: "{title} · {when} · {where}" },
  },
  {
    type: "task.assigned",
    fields: ["plan", "tasks"],
    en: { title: "You were given work in a plan", body: "{plan} · {tasks}" },
    ar: { title: "أُسندت إليكم مهام في خطة", body: "{plan} · {tasks}" },
  },
  // `{register}` is the register's own label — data the studio or the product
  // named, like a section name, and not translated here.
  {
    type: "record.assigned",
    fields: ["register", "reference", "title"],
    en: { title: "A record was assigned to you", body: "{register} · {reference} · {title}" },
    ar: { title: "أُسند إليكم سجل", body: "{register} · {reference} · {title}" },
  },
  {
    type: "record.raised",
    fields: ["register", "reference", "title"],
    en: { title: "A record was raised", body: "{register} · {reference} · {title}" },
    ar: { title: "تم تسجيل سجل جديد", body: "{register} · {reference} · {title}" },
  },
  // The reader's own money and time. `{amount}` arrives formatted with its
  // currency code, and `{type}` is the studio's own leave type — both data.
  {
    type: "claim.paid",
    fields: ["reference", "amount"],
    en: { title: "Your expense claim was paid", body: "{reference} · {amount}" },
    ar: { title: "تم صرف مطالبة المصروفات", body: "{reference} · {amount}" },
  },
  {
    type: "advance.given",
    fields: ["reference", "amount"],
    en: { title: "You were given an advance", body: "{reference} · {amount}" },
    ar: { title: "صُرفت لكم سلفة", body: "{reference} · {amount}" },
  },
  {
    type: "pay.paid",
    fields: ["period", "amount"],
    en: { title: "Your pay was paid", body: "{period} · {amount}" },
    ar: { title: "تم صرف راتبكم", body: "{period} · {amount}" },
  },
  {
    type: "leave.booked",
    fields: ["type", "from", "to"],
    en: { title: "Leave was booked for you", body: "{type} · {from} – {to}" },
    ar: { title: "حُجزت لكم إجازة", body: "{type} · {from} – {to}" },
  },
  // Tenders and deals. Won and lost are separate TYPES rather than one with an
  // `{outcome}`, because an outcome word inside the sentence would reach an
  // Arabic bell in English — `leave.decided`'s `{outcome}` does exactly that.
  {
    type: "tender.assigned",
    fields: ["reference", "title", "deadline"],
    en: { title: "A tender was assigned to you", body: "{reference} · {title} · {deadline}" },
    ar: { title: "أُسندت إليكم مناقصة", body: "{reference} · {title} · {deadline}" },
  },
  {
    type: "tender.won",
    fields: ["reference", "title"],
    en: { title: "A tender was won", body: "{reference} · {title}" },
    ar: { title: "تم الفوز بمناقصة", body: "{reference} · {title}" },
  },
  {
    type: "tender.lost",
    fields: ["reference", "title"],
    en: { title: "A tender was lost", body: "{reference} · {title}" },
    ar: { title: "خُسرت مناقصة", body: "{reference} · {title}" },
  },
  {
    type: "tender.closing",
    fields: ["detail"],
    en: { title: "Tenders closing", body: "{detail}" },
    ar: { title: "مناقصات تقترب من الإغلاق", body: "{detail}" },
  },
  {
    type: "deal.won",
    fields: ["reference", "title"],
    en: { title: "Your deal was won", body: "{reference} · {title}" },
    ar: { title: "تم الفوز بصفقتكم", body: "{reference} · {title}" },
  },
  {
    type: "deal.lost",
    fields: ["reference", "title"],
    en: { title: "Your deal was lost", body: "{reference} · {title}" },
    ar: { title: "خُسرت صفقتكم", body: "{reference} · {title}" },
  },
  // Money at the edges. `{client}` and `{till}` are the studio's own names;
  // `{difference}` arrives signed and formatted with its currency.
  {
    type: "invoice.paid",
    fields: ["reference", "client"],
    en: { title: "An invoice was paid in full", body: "{reference} · {client}" },
    ar: { title: "سُدّدت فاتورة بالكامل", body: "{reference} · {client}" },
  },
  {
    type: "payment.bounced",
    fields: ["reference", "client"],
    en: { title: "A payment bounced", body: "{reference} · {client}" },
    ar: { title: "ارتدّ أحد المدفوعات", body: "{reference} · {client}" },
  },
  {
    type: "shift.variance",
    fields: ["till", "difference"],
    en: { title: "A drawer did not balance", body: "{till} · {difference}" },
    ar: { title: "الدرج غير مطابق", body: "{till} · {difference}" },
  },
  // Procurement.
  {
    type: "rfq.quoted",
    fields: ["reference", "title"],
    en: { title: "A supplier quoted", body: "{reference} · {title}" },
    ar: { title: "وصل عرض سعر من مورّد", body: "{reference} · {title}" },
  },
  {
    type: "rfq.awarded",
    fields: ["reference", "title"],
    en: { title: "An RFQ was awarded", body: "{reference} · {title}" },
    ar: { title: "تمت ترسية طلب عروض الأسعار", body: "{reference} · {title}" },
  },
  {
    type: "certificate.certified",
    fields: ["reference", "title", "number"],
    en: { title: "A valuation was certified", body: "{reference} · {title} · #{number}" },
    ar: { title: "تم اعتماد تقييم", body: "{reference} · {title} · #{number}" },
  },
  // Dates the registers hold, from the daily cron — `{detail}` as the other
  // time-driven notices carry it.
  {
    type: "record.expiring",
    fields: ["detail"],
    en: { title: "Dates coming up", body: "{detail}" },
    ar: { title: "مواعيد تقترب", body: "{detail}" },
  },
  {
    type: "supplier.document.expiring",
    fields: ["detail"],
    en: { title: "Supplier documents expiring", body: "{detail}" },
    ar: { title: "مستندات موردين تقارب الانتهاء", body: "{detail}" },
  },
  // NO TEMPLATE FOR `system`, deliberately, and it is not an omission. A system
  // notice is whatever the producer needed to say — Quality writes
  // "`${document.code} needs you`" — so there is no fixed sentence to
  // translate and no placeholder set to declare. Those rows keep their literal,
  // which is exactly what the fallback below is for.
]);

export const TEMPLATE_TYPES: readonly string[] =
  Object.freeze(NOTICE_TEMPLATES.map((t) => t.type));

const templateFor = (type: string): NoticeTemplate | undefined =>
  NOTICE_TEMPLATES.find((t) => t.type === type);

/** Which placeholders a type admits. Empty for a type with no template. */
export const fieldsFor = (type: string): string[] => [...(templateFor(type)?.fields || [])];

const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

// A NOTIFICATION IS ONE LINE IN A BELL. Long enough for a sentence with two
// facts in it, short enough that the list stays readable.
const MAX_TITLE = 120;
const MAX_BODY = 300;

const PLACEHOLDER = /\{([a-zA-Z]+)\}/g;

/**
 * FILL A TEMPLATE. A placeholder with no value becomes the empty string.
 *
 * NOT LEFT RAW, and this is the whole reason the function exists rather than a
 * one-line replace at the call site: "{who} requested 3 days off" on somebody's
 * bell reads as a broken product, where "requested 3 days off" reads as a
 * missing name — which is what it is.
 */
export function fill(template: string, params: unknown): string {
  const values = (params && typeof params === "object" && !Array.isArray(params))
    ? params as Record<string, unknown>
    : {};
  return template
    .replace(PLACEHOLDER, (_, key: string) => text(values[key], 120))
    // Filling a gap leaves a double space and sometimes a space before a stop.
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,!?])/g, "$1")
    // …AND A SEPARATOR WITH NOTHING ON ONE SIDE. "{title} · {when} · {where}"
    // for a job with no site read "Pour slab · 29/09 09:00 · ". A run of
    // separators becomes one, and none may lead or trail.
    .replace(/(?:\s*[·—]\s*){2,}/g, " · ")
    .replace(/^\s*[·—]\s*|\s*[·—]\s*$/g, "")
    .trim();
}

/**
 * WHAT IS WRONG WITH A STUDIO'S OVERRIDES, or an empty array.
 *
 * Reasons rather than a boolean, so the screen shows them all at once — the
 * shape `unitProblems`, `axisProblems` and `numberingProblems` use. Each names
 * the TYPE, because one save carries every override at once.
 */
export function templateProblems(overrides: unknown): string[] {
  if (overrides === null || overrides === undefined) return [];
  if (typeof overrides !== "object" || Array.isArray(overrides)) {
    return ["notification templates must be an object"];
  }
  const problems: string[] = [];
  for (const [type, value] of Object.entries(overrides as Record<string, unknown>)) {
    const shipped = templateFor(type);
    // A TYPE WITH NO PRODUCER IS A TEMPLATE NOTHING WOULD EVER RENDER —
    // invariant 16 at the wording level, so it is named rather than ignored.
    if (!shipped) { problems.push(`"${type}" is not a notification this product sends`); continue; }
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      problems.push(`${type} must be an object`);
      continue;
    }
    for (const [locale, words] of Object.entries(value as Record<string, unknown>)) {
      if (locale !== "en" && locale !== "ar") {
        problems.push(`${type}: "${locale}" is not a language this product speaks`);
        continue;
      }
      if (!words || typeof words !== "object" || Array.isArray(words)) {
        problems.push(`${type}.${locale} must be an object`);
        continue;
      }
      const { title, body } = words as Record<string, unknown>;
      // AN EMPTY TITLE IS A NOTIFICATION NOBODY CAN READ. The body may be
      // empty — several notices are a headline and nothing else — but a row
      // with no title is a blank line in the bell.
      if (title !== undefined && !text(title, MAX_TITLE + 1)) {
        problems.push(`${type}.${locale}: a title cannot be blank`);
      }
      if (text(title, MAX_TITLE + 1).length > MAX_TITLE) {
        problems.push(`${type}.${locale}: a title is at most ${MAX_TITLE} characters`);
      }
      if (text(body, MAX_BODY + 1).length > MAX_BODY) {
        problems.push(`${type}.${locale}: a body is at most ${MAX_BODY} characters`);
      }
      // A PLACEHOLDER THE PRODUCER NEVER SENDS would render as nothing, every
      // time, on every studio — silently. Refusing it at the door is the point
      // of declaring `fields` rather than deriving them from the strings.
      for (const source of [title, body]) {
        for (const [, key] of String(source ?? "").matchAll(PLACEHOLDER)) {
          if (!shipped.fields.includes(key)) {
            problems.push(`${type}.${locale}: "{${key}}" is not something this notification carries`);
          }
        }
      }
    }
  }
  return problems;
}

/** The studio's own wording, cleaned. Shipped templates are never stored. */
export function cleanTemplates(overrides: unknown): Record<string, Record<string, { title: string; body: string }>> {
  const out: Record<string, Record<string, { title: string; body: string }>> = {};
  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) return out;

  for (const shipped of NOTICE_TEMPLATES) {
    const value = (overrides as Record<string, unknown>)[shipped.type];
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const kept: Record<string, { title: string; body: string }> = {};
    for (const locale of ["en", "ar"] as const) {
      const words = (value as Record<string, unknown>)[locale];
      if (!words || typeof words !== "object" || Array.isArray(words)) continue;
      const title = text((words as Record<string, unknown>).title, MAX_TITLE);
      const body = text((words as Record<string, unknown>).body, MAX_BODY);
      // WORDING IDENTICAL TO THE SHIPPED ONE IS NOT AN OVERRIDE. Storing it
      // would freeze a studio on today's wording, so a later correction would
      // reach everybody except the studios that had opened the screen and
      // saved without changing anything.
      if (!title) continue;
      if (title === shipped[locale].title && body === shipped[locale].body) continue;
      kept[locale] = { title, body };
    }
    if (Object.keys(kept).length) out[shipped.type] = kept;
  }
  return out;
}

export type StoredNotice = {
  type?: unknown;
  title?: unknown;
  body?: unknown;
  params?: unknown;
};

/**
 * THE WORDS A READER SEES, in their own language.
 *
 * PRECEDENCE, and it is the whole contract: the studio's override, then what
 * the product ships, then the literal the row was stored with. That last arm is
 * not a safety net — it is how every notification written before this renders,
 * and how `system` notices render forever.
 *
 * A ROW WITH A TEMPLATE BUT NO PARAMS FALLS BACK TOO. A producer that has not
 * been converted yet still writes a literal, so rendering its template against
 * an empty param set would replace a correct English sentence with a
 * placeholder-stripped fragment of one. Absent params means "this row was not
 * written for a template", not "this row has no facts".
 */
export function renderNotice(
  row: StoredNotice, locale: string, overrides: unknown = null,
): { title: string; body: string } {
  const literal = { title: text(row?.title, MAX_TITLE), body: text(row?.body, MAX_BODY) };
  const type = text(row?.type, 60);
  const shipped = templateFor(type);
  if (!shipped) return literal;

  const params = row?.params;
  const hasParams = Boolean(params) && typeof params === "object" && !Array.isArray(params);
  if (!hasParams) return literal;

  const lang: "en" | "ar" = locale === "ar" ? "ar" : "en";
  const own = cleanTemplates(overrides)[type]?.[lang];
  const words = own || shipped[lang];
  const filled = { title: fill(words.title, params), body: fill(words.body, params) };
  // A STUDIO THAT BLANKED A TITLE cannot be allowed to blank the bell; the
  // write refuses that, and this is the second door in case a row predates it.
  return filled.title ? filled : literal;
}

/** Every type with both wordings, for the screen that edits them. */
export function templateView(overrides: unknown): {
  type: string; fields: string[];
  shipped: { en: { title: string; body: string }; ar: { title: string; body: string } };
  own: Record<string, { title: string; body: string }>;
}[] {
  const own = cleanTemplates(overrides);
  return NOTICE_TEMPLATES.map((t) => ({
    type: t.type,
    fields: [...t.fields],
    shipped: { en: { ...t.en }, ar: { ...t.ar } },
    own: own[t.type] || {},
  }));
}
