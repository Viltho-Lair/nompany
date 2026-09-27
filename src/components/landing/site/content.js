// WHICH SCREEN ILLUSTRATES WHAT. The words are the tour's (shared/marketing/
// tour.ts, both languages); this only pairs them with pictures, and every
// picture is a real capture in public/screens (scripts/screenshots.mjs).

// The record's journey, keyed by tour.journey[].key. Approval keeps the
// quotation's screen on purpose: approval happens ON the quotation, so a
// different picture there would show a screen where the act does not happen.
export const JOURNEY_SHOT = {
  lead: "pipeline",
  quote: "quotations",
  approve: "quotations",
  project: "project",
  buy: "requisitions",
  invoice: "receivables",
};

// The deck, in order. Each key has a caption in tour.screens.
export const DECK = ["clients", "quotations", "gantt", "project-costs", "stock", "requisitions"];
