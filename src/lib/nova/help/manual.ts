// ONE SOURCE PER SECTION — the studio manual, composed from Nova's help desk.
//
// THE OWNER'S RULE, 27/09/2026: a department is written down ONCE. Before this,
// each department had up to three descriptions free to disagree: the manual
// (`shared/studio/manual*`, hand-written prose, three departments of eighteen),
// Nova's help entries (`kb/*`, every department), and the developer notes
// (`docs/functionality`, a different audience and a different job). The first
// two say the same thing to the same person in two shapes, and two copies of
// "why can't I approve this bill" is two copies free to drift.
//
// So for a department listed in `MANUAL_FROM_HELP`, the help entries ARE the
// manual: each topic becomes a chapter section, the topic's opening `about`
// entry its introduction, and every other entry a sub-heading — question as
// heading, answer as paragraph, then what to have ready and the steps. Writing
// a help entry writes the manual; Nova's answer links to the paragraph it came
// from, which is the same text.
//
// PURE, and deliberately handed its topics and entries rather than importing
// them: `knowledge.ts` builds on this, and importing it back would be a cycle.
//
// A department moves here by being ADDED TO THE LIST — and its hand-written
// article in `shared/studio/manual*` is deleted in the same commit.
// tests/help-model.mjs refuses a department that is in both, because that is
// exactly the second copy this file exists to remove.

import type { ManualArticle, ManualBlock, ManualSection } from "@/shared/studio/manual";
import type { HelpEntry, HelpTopic } from "./types";

/** Departments whose manual chapter is composed from their help entries. */
export const MANUAL_FROM_HELP = [
  "crm-sales", "quotations", "tendering", "projects", "engineering-docs", "procurement",
  "inventory", "manufacturing", "field-service", "logistics", "assets", "maintenance",
  "quality-hse", "hr", "finance",
] as const;

type Locale = "en" | "ar";

const WORDS = {
  en: { haveReady: "Have this ready:" },
  ar: { haveReady: "جهّز ما يلي:" },
} as const;

/** The anchor a root topic's own section takes — not the article's key, which is the root key. */
const overviewAnchor = (rootKey: string) => `${rootKey}-overview`;

/**
 * The topics of one department, in reading order: the root first, then each
 * child and its own children, depth first by `order`.
 */
function topicsInOrder(rootKey: string, topics: HelpTopic[]): HelpTopic[] {
  const root = topics.find((t) => t.sectionKey === rootKey && t.id === `dept.${rootKey}`);
  if (!root) return [];
  const out: HelpTopic[] = [];
  const walk = (t: HelpTopic) => {
    out.push(t);
    topics.filter((c) => c.parent === t.id).sort((a, b) => a.order - b.order).forEach(walk);
  };
  walk(root);
  return out;
}

/**
 * A topic's section anchor: the overview anchor for the root; its section key
 * when it is THAT key's own topic (`dept.<key>`); otherwise its own id. Two
 * topics may name one section — a tab on a screen, like Engineering's document
 * layouts beside the register — and anchoring both on the key put two sections
 * behind one link (27/09/2026).
 */
const sectionAnchor = (t: HelpTopic, rootKey: string) =>
  (t.id === `dept.${rootKey}` ? overviewAnchor(rootKey)
    : t.sectionKey && t.id === `dept.${t.sectionKey}` ? t.sectionKey
      : t.id.replace(/\./g, "-"));

/** Is this entry the section's introduction — the first, and an `about`? */
const isIntro = (e: HelpEntry, inTopic: HelpEntry[]) => inTopic[0] === e && e.kind === "about";

/**
 * Where each entry of a department lands in its chapter: its own heading's id,
 * or — for an introduction, which has no heading — its section's. What Nova's
 * "Read in documentation" link points at.
 */
export function manualAnchors(rootKey: string, topics: HelpTopic[], entries: HelpEntry[]): Map<string, string> {
  const anchors = new Map<string, string>();
  for (const t of topicsInOrder(rootKey, topics)) {
    const inTopic = entries.filter((e) => e.topic === t.id);
    for (const e of inTopic) anchors.set(e.id, isIntro(e, inTopic) ? sectionAnchor(t, rootKey) : e.id);
  }
  return anchors;
}

/** One department's chapter, in one language. Null when the department has no help topics. */
export function composeManualArticle(
  rootKey: string,
  locale: Locale,
  topics: HelpTopic[],
  entries: HelpEntry[],
): ManualArticle | null {
  const ordered = topicsInOrder(rootKey, topics);
  if (!ordered.length) return null;
  const L = locale === "ar" ? "ar" : "en";
  const root = ordered[0];

  const sections: ManualSection[] = ordered.map((t) => {
    const inTopic = entries.filter((e) => e.topic === t.id);
    const blocks: ManualBlock[] = [];
    for (const e of inTopic) {
      if (!isIntro(e, inTopic)) blocks.push({ kind: "h", id: e.id, text: e.q[L] });
      blocks.push({ kind: "p", text: e.a[L] });
      if (e.fields?.[L]?.length) {
        blocks.push({ kind: "p", text: WORDS[L].haveReady });
        blocks.push({ kind: "list", items: e.fields[L] });
      }
      if (e.steps?.[L]?.length) blocks.push({ kind: "steps", items: e.steps[L] });
    }
    return { id: sectionAnchor(t, rootKey), heading: t.label[L], blocks };
  }).filter((s) => s.blocks.length);

  return {
    key: rootKey,
    title: root.label[L],
    summary: root.blurb?.[L] || "",
    sections,
  };
}
