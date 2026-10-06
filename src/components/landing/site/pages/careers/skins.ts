/* THE CLASSES THE CAREERS PAGES DRESS SHARED COMPONENTS IN.
   ------------------------------------------------------------------
   `RichText` is shared and not this page's to edit (the application form was too,
   until it was rewritten for the site and its skin deleted, 27/09/2026).
   Both still carry the previous public palette — `text-fg-muted` and an
   indigo `marker:` on the one, the `landing-*` field primitives and an
   indigo gradient submit on the other — which on this page is a second
   accent beside the site's one violet.

   So the page restyles them FROM THE OUTSIDE, with descendant selectors on
   a wrapper. A `[&_.landing-field]:…` rule is `.wrapper .landing-field`, one
   class more specific than the component's own utility, and lives in the
   utilities layer above `landing-field`'s components layer — so it wins
   without `!` wherever the component sets the same property once. The `!`
   classes are on RichText's own root, where the wrapper IS the element and
   specificity cannot help.

   If either component is rewritten for the site, these go with it. */

/** A job description on the dark ground: emphasis and list markers. The
    text colour is set where it is used (a card is dimmer than the job page),
    with `!`, because RichText sets `text-fg-muted` on the same element. */
export const JOB_TEXT =
  "marker:!text-[#8b7cff] [&_strong]:text-[#ececf1] [&_b]:text-[#ececf1]";
