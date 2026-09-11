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
    type: "task.assigned",
    fields: ["title"],
    en: { title: "You have been assigned a task", body: "{title}" },
    ar: { title: "مهمة موكلة إليكم", body: "{title}" },
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
