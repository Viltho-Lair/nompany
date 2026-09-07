/* THE IN-PAGE VIEWS THAT ARE LEFT.
   ------------------------------------------------------------------
   There were three. Pricing became `/[locale]/pricing` — a real
   server-rendered route with an address, because a view cannot be
   ranked, cited or linked to, and the price list reached no engine
   while it lived here.

   Contact is still a view, and deliberately so for now: it becomes a
   route in the same change that gives it a backend that actually
   sends. Moving it first would mint a URL for a form that discards
   every enquiry while telling the sender it arrived.

   THE IDS ARE THE ROUTE, the labels are copy. `VIEW_ORDER` drives the
   transition direction and must not depend on the reader's language. */
export const VIEW_ORDER = ["overview", "contact"];
export const viewsFor = (tr) => [
    { id: "overview", label: tr.viewOverview },
    { id: "contact", label: tr.viewContact },
];
