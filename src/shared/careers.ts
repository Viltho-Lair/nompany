// CAREERS, PURELY — what a job opening is, what survives being saved, and how
// its description becomes the HTML the careers pages render. No store, no
// request: the /super editor and the routes ask the same functions.
//
// THE SHAPE IS THE ONE THE PAGES ALREADY READ. `/careers` and `/careers/<id>`
// have always read `title`, `dept`, `location`, `type` and `desc` through
// `field(record, base, locale)` — `<base>_en` / `<base>_ar`, falling back to
// English — from a collection nothing wrote. So a job is bilingual (unlike a
// blog post) and the field names are kept exactly; what is new is `status`
// (open or closed) and the plain-text source of each description.
//
// THE DESCRIPTION IS WRITTEN AS TEXT and turned into HTML here: a blank line
// starts a paragraph, lines starting "- " become a list, **bold** is bold.
// Everything is escaped first, and the output uses only tags `RichText`'s
// sanitiser already allows, so the page's sanitiser stays the second fence
// rather than the only one.

export const JOB_STATUSES = ["open", "closed"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

// The employment types a posting can carry. The labels fill `type_en`/`type_ar`,
// which the pages show as a tag and `jobPostingLd` reads for PART_TIME.
export const EMPLOYMENT = {
  "full-time": { en: "Full-time", ar: "دوام كامل" },
  "part-time": { en: "Part-time", ar: "دوام جزئي" },
  contract: { en: "Contract", ar: "عقد" },
  internship: { en: "Internship", ar: "تدريب" },
} as const;
export type Employment = keyof typeof EMPLOYMENT;

export const APPLICATION_STATUSES = ["new", "reviewing", "shortlisted", "declined", "hired"] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

const MAX = { line: 160, text: 8000 };
const line = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, MAX.line) : "");
const text = (v: unknown) => (typeof v === "string" ? v.replace(/\r\n/g, "\n").trim().slice(0, MAX.text) : "");

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const marks = (s: string) => escapeHtml(s).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

/** Plain text → the small HTML `RichText` renders: paragraphs, lists, bold. */
export function textToHtml(src: string): string {
  const out: string[] = [];
  for (const block of text(src).split(/\n{2,}/)) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    if (lines.every((l) => /^[-•]\s+/.test(l))) {
      out.push(`<ul>${lines.map((l) => `<li>${marks(l.replace(/^[-•]\s+/, ""))}</li>`).join("")}</ul>`);
    } else {
      out.push(`<p>${lines.map(marks).join("<br>")}</p>`);
    }
  }
  return out.join("");
}

/**
 * What survives being saved — a WHITELIST. The store adds id and timestamps.
 * Both descriptions are kept as the author typed them (`descText_*`, what the
 * editor shows) and as rendered HTML (`desc_*`, what the pages read).
 */
export function cleanJob(input: unknown) {
  const b = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const employment: Employment = (Object.keys(EMPLOYMENT) as Employment[]).includes(b.employment as Employment)
    ? (b.employment as Employment)
    : "full-time";
  const descText_en = text(b.descText_en);
  const descText_ar = text(b.descText_ar);
  return {
    title_en: line(b.title_en),
    title_ar: line(b.title_ar),
    dept_en: line(b.dept_en),
    dept_ar: line(b.dept_ar),
    location_en: line(b.location_en),
    location_ar: line(b.location_ar),
    employment,
    type_en: EMPLOYMENT[employment].en,
    type_ar: EMPLOYMENT[employment].ar,
    descText_en,
    descText_ar,
    desc_en: textToHtml(descText_en),
    desc_ar: textToHtml(descText_ar),
    status: (b.status === "closed" ? "closed" : "open") as JobStatus,
  };
}

/** Why this job cannot be OPEN, or "". A closed job may be half-written. */
export function jobProblem(j: ReturnType<typeof cleanJob>): string {
  if (j.status !== "open") return "";
  if (!j.title_en) return "title-required";
  if (!j.descText_en) return "description-required";
  return "";
}

/** Shown on the site: anything not closed. A row with no status predates it. */
export function isOpen(job: { status?: unknown }): boolean {
  return job.status !== "closed";
}

export function cleanApplicationStatus(v: unknown): ApplicationStatus | "" {
  return (APPLICATION_STATUSES as readonly string[]).includes(String(v)) ? (v as ApplicationStatus) : "";
}
