// The catalogue of things a questionnaire page can hold, grouped the way the
// "Add form elements" picker shows them.
//
// One entry per element type: what it is called, which group it sits in, and
// what a NEW one of it looks like. The builder reads this and nothing else, so
// adding a type here makes it appear in the picker, render on the canvas and
// gain its settings panel without touching the builder itself.
//
// `settings` lists which toggles the right-hand panel offers for that type, so
// "Multiple selection" appears on Multiple Choice and not on Short Text.

export const GROUPS = ["Contact info", "Choice", "Rating & ranking", "Text", "Other", "Structure"];

// Toggle keys the panel knows how to render.
export const TOGGLES = {
  required: "Required",
  multiple: "Multiple selection",
  randomize: "Randomize",
  other: '"Other" option',
  none: '"None" option',
  vertical: "Vertical alignment",
};

const choiceDefaults = { options: ["Choice 1", "Choice 2", "Choice 3"], multiple: false, randomize: false, other: false, none: false, vertical: true };

export const ELEMENTS = [
  // ---- Contact info ----
  { type: "contact", group: "Contact info", label: "Contact Info", icon: "contact", settings: ["required"], defaults: {} },
  { type: "email", group: "Contact info", label: "Email", icon: "email", settings: ["required"], defaults: { placeholder: "name@company.com" } },
  { type: "phone", group: "Contact info", label: "Phone Number", icon: "phone", settings: ["required"], defaults: {} },
  { type: "address", group: "Contact info", label: "Address", icon: "pin", settings: ["required"], defaults: {} },
  { type: "website", group: "Contact info", label: "Website", icon: "link", settings: ["required"], defaults: { placeholder: "https://" } },

  // ---- Choice ----
  { type: "multiple-choice", group: "Choice", label: "Multiple Choice", icon: "list", settings: ["required", "multiple", "randomize", "other", "none", "vertical"], defaults: choiceDefaults },
  { type: "dropdown", group: "Choice", label: "Dropdown", icon: "chevron", settings: ["required", "randomize", "other"], defaults: { options: ["Choice 1", "Choice 2", "Choice 3"], randomize: false, other: false } },
  { type: "picture-choice", group: "Choice", label: "Picture Choice", icon: "image", settings: ["required", "multiple", "randomize"], defaults: { options: ["Choice 1", "Choice 2"], multiple: false, randomize: false } },
  { type: "yes-no", group: "Choice", label: "Yes/No", icon: "yesno", settings: ["required"], defaults: { options: ["Yes", "No"] } },
  { type: "legal", group: "Choice", label: "Legal", icon: "legal", settings: ["required"], defaults: { options: ["I accept", "I don't accept"] } },
  { type: "checkbox", group: "Choice", label: "Checkbox", icon: "check", settings: ["required"], defaults: {} },

  // ---- Rating & ranking ----
  { type: "nps", group: "Rating & ranking", label: "Net Promoter Score®", icon: "gauge", settings: ["required"], defaults: { min: 0, max: 10, minLabel: "Not likely", maxLabel: "Very likely" } },
  { type: "opinion-scale", group: "Rating & ranking", label: "Opinion Scale", icon: "bars", settings: ["required"], defaults: { min: 1, max: 5, minLabel: "", maxLabel: "" } },
  { type: "rating", group: "Rating & ranking", label: "Rating", icon: "star", settings: ["required"], defaults: { max: 5 } },
  { type: "ranking", group: "Rating & ranking", label: "Ranking", icon: "rank", settings: ["required", "randomize"], defaults: { options: ["Choice 1", "Choice 2", "Choice 3"], randomize: false } },
  { type: "matrix", group: "Rating & ranking", label: "Matrix", icon: "grid", settings: ["required", "multiple"], defaults: { rows: ["Row 1", "Row 2"], columns: ["Column 1", "Column 2"], multiple: false } },

  // ---- Text ----
  { type: "short-text", group: "Text", label: "Short Text", icon: "text", settings: ["required"], defaults: { placeholder: "Type your answer" } },
  { type: "long-text", group: "Text", label: "Long Text", icon: "paragraph", settings: ["required"], defaults: { placeholder: "Type your answer" } },

  // ---- Other ----
  { type: "number", group: "Other", label: "Number", icon: "hash", settings: ["required"], defaults: { min: null, max: null } },
  { type: "date", group: "Other", label: "Date", icon: "calendar", settings: ["required"], defaults: {} },
  { type: "file-upload", group: "Other", label: "File Upload", icon: "upload", settings: ["required"], defaults: {} },
  { type: "signature", group: "Other", label: "Signature", icon: "sign", settings: ["required"], defaults: {} },

  // ---- Structure (not questions: they carry no answer) ----
  { type: "welcome", group: "Structure", label: "Welcome Screen", icon: "flag", settings: [], defaults: { buttonLabel: "Start" } },
  { type: "statement", group: "Structure", label: "Statement", icon: "quote", settings: [], defaults: { buttonLabel: "Continue" } },
  { type: "question-group", group: "Structure", label: "Question Group", icon: "group", settings: [], defaults: {} },
  { type: "ending", group: "Structure", label: "End Screen", icon: "end", settings: [], defaults: {} },
];

export const byType = (type) => ELEMENTS.find((e) => e.type === type) || null;
export const isStructure = (type) => byType(type)?.group === "Structure";

// Types whose answer is a list the author edits.
export const hasOptions = (type) => Array.isArray(byType(type)?.defaults?.options);

// A fresh element, ready to drop onto a page.
export function newQuestion(type, id) {
  const def = byType(type);
  if (!def) return null;
  return {
    id,
    type,
    label: def.group === "Structure" ? def.label : `${def.label} question`,
    description: "",
    required: false,
    ...structuredClone(def.defaults || {}),
  };
}
