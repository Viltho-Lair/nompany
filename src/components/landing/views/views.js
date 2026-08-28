/** The three "routes" of the simulated router (TECHNIQUE 9). */
// THE IDS ARE THE ROUTE, the labels are copy. `VIEW_ORDER` drives the
// transition direction and must not depend on the reader's language.
export const VIEW_ORDER = ["overview", "pricing", "contact"];
export const viewsFor = (tr) => [
    { id: "overview", label: tr.viewOverview },
    { id: "pricing", label: tr.viewPricing },
    { id: "contact", label: tr.viewContact },
];
