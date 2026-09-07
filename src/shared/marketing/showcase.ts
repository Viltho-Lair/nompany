// FEATURED COMPANIES — the rule, purely.
//
// TWO PARTIES HAVE TO AGREE, AND THEY AGREE SEPARATELY. A studio appears on the
// public site only when it has CONSENTED and we have FEATURED it. Neither alone
// is enough, and that is the whole design:
//
//   consent  is the studio's, given in its own settings and withdrawable there.
//            Nobody at nompany can give it, and nothing we do can imply it.
//   featured is ours, set in /super. A studio consenting does not put itself on
//            the home page; it makes itself eligible.
//
// WHY BOTH RATHER THAN ONE. A single flag owned by us is publishing somebody
// else's name on our word. A single flag owned by them is a public page we do
// not control the contents of. The failure this prevents is the quiet one: a
// studio that consented a year ago, changed its mind, and is still on the site
// because withdrawing meant emailing somebody.
//
// WITHDRAWAL IS IMMEDIATE BY CONSTRUCTION. Nothing is copied to a separate
// published list — the public feed derives from these two fields on every read,
// so clearing consent removes the studio on the next request. There is no
// cache to bust and no second record to forget.

/** What a studio stores when it agrees to be named publicly. */
export type ShowcaseConsent = {
  /** ISO timestamp. Empty means no consent — never a boolean, see below. */
  at: string;
  /**
   * The CollaboratorID that gave it.
   *
   * CollaboratorID, not UserID: identity inside a studio is a collaborator, and
   * this is a decision made ON BEHALF OF the studio by a person in it. A UserID
   * here would name somebody who might not be a member any more.
   */
  by: string;
};

/**
 * The fields this reads from a studio record.
 *
 * `featured` and `featuredOrder` are OURS and are written only from /super;
 * `showcaseConsent` is the studio's and is written only from its own settings.
 * Keeping them in one type does not mean one writer — the two routes each
 * accept exactly one of them, which is what makes the pair meaningful.
 */
export type ShowcaseFields = {
  showcaseConsent?: ShowcaseConsent | null;
  featured?: boolean;
  featuredOrder?: number;
  sector?: string;
};

/** Has this studio agreed to be named? */
export function hasConsented(studio: ShowcaseFields | null | undefined): boolean {
  // CONSENT IS A TIMESTAMP, NOT A BOOLEAN, and the difference is the point: a
  // record that says only `true` cannot answer "since when", which is the first
  // question anybody asks about a permission to use a company's name.
  return Boolean(studio?.showcaseConsent?.at);
}

/** Do both parties agree this studio may appear publicly? */
export function isPubliclyFeatured(studio: ShowcaseFields | null | undefined): boolean {
  return hasConsented(studio) && Boolean(studio?.featured);
}

/**
 * What the public may see, and nothing else.
 *
 * A DELIBERATE ALLOW-LIST rather than a delete-list. The studio record carries
 * the slug, the member count, the plan, the currency, the org chart and every
 * setting the tenant has ever saved; a function that removed the sensitive
 * fields would leak the next one somebody adds. This names the four that go
 * out, so a new field is private until somebody writes it into this line.
 *
 * NO SLUG, deliberately, and it is the one that looks safe. A slug is a public
 * address — but publishing a customer list keyed by address hands anybody a
 * roster of tenants to try, and the point of this page is the company's name,
 * not a link into its studio.
 */
export type PublicCompany = {
  name: string;
  logo: string;
  sector: string;
  order: number;
};

export function toPublicCompany(
  studio: { name?: string; logo?: string } & ShowcaseFields,
): PublicCompany {
  return {
    name: String(studio.name || ""),
    logo: String(studio.logo || ""),
    sector: String(studio.sector || ""),
    order: Number.isFinite(Number(studio.featuredOrder)) ? Number(studio.featuredOrder) : 0,
  };
}

/**
 * The public feed: those that both parties agree on, in the order we chose.
 *
 * SORTED BY OUR ORDER, THEN BY NAME. Two studios sharing an order number is not
 * an error worth refusing — somebody will type 1 twice — so the tie breaks on
 * something stable rather than on whatever the store happened to return, which
 * would reshuffle the page between requests for no reason.
 */
export function publicCompanies(
  studios: ({ name?: string; logo?: string } & ShowcaseFields)[],
): PublicCompany[] {
  return studios
    .filter(isPubliclyFeatured)
    .map(toPublicCompany)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}
