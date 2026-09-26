// NOVA'S HELP DESK — the shape of what it knows.
//
// A TREE OF TOPICS WITH QUESTIONS AT THE LEAVES, the menu-driven half of a
// support assistant: a person who does not know what to type can click from
// "What can I help with?" down to one answer, and a person who does can type
// and be matched (`search.ts`). Both halves read the same entries, so a
// question reachable by clicking is exactly a question findable by typing.
//
// SERVER-ONLY. The whole knowledge base is a few hundred kilobytes of prose in
// two languages; a client import would put all of it in the studio's first
// load and fail nothing (the bundle budget would, eventually, and blame the
// wrong screen). The browser receives ONE language of it, once, from the help
// route — cached by a version tag — and never imports these modules.

/** Every visible string is written in both languages, as keys of one object. */
export type Loc = { en: string; ar: string };
export type LocList = { en: string[]; ar: string[] };

/** A branch of the tree. Leaves are entries; a topic only groups. */
export type HelpTopic = {
  /** "root", "start", "departments", "dept.<sectionKey>", "admin", "account", "trouble", … */
  id: string;
  /** The topic this one sits under; null only for "root". */
  parent: string | null;
  label: Loc;
  /** One line under the button, saying what is inside. */
  blurb?: Loc;
  /**
   * The section this topic describes. A topic naming a section is HIDDEN in a
   * studio that has switched that section off — help for a department the
   * company does not run is noise, the dashboards' rule (a visual goes when its
   * section goes).
   */
  sectionKey?: string;
  /** Ascending sort among siblings. */
  order: number;
};

/**
 * - about        — what a section or screen is for
 * - howto        — how to do one thing, as steps
 * - fields       — what information you need before you fill a form
 * - settings     — what a setting does and where it lives
 * - troubleshoot — why something is missing, refused or greyed out
 */
export type HelpKind = "about" | "howto" | "fields" | "settings" | "troubleshoot";

export type HelpEntry = {
  /** Stable forever: a support ticket and a learned phrasing both name it. */
  id: string;
  /** The topic it sits under. */
  topic: string;
  kind: HelpKind;
  /** The question, phrased the way a person would ask it. */
  q: Loc;
  /** The answer, two to five sentences. Plain text, no markdown. */
  a: Loc;
  /** Ordered steps, when the answer is a procedure. */
  steps?: LocList;
  /** The information to have ready, when the answer is a form. */
  fields?: LocList;
  /**
   * Other words people use for this — synonyms, abbreviations, the Arabic and
   * English both. Searched, never shown. "PO", "vacation", "staff".
   */
  keywords?: string[];
  /** The section key whose screen does this; the answer offers "Open it". */
  open?: string;
  /** Other entry ids worth offering after this one. */
  related?: string[];
  /** A MAIN question: featured on its topic and on the opening screen. */
  common?: boolean;
};

export type HelpModule = { topics: HelpTopic[]; entries: HelpEntry[] };
