# The legal pages

Two public documents, one renderer, one shared section. `/{en,ar}/terms` is the Terms and
Conditions of Service; `/{en,ar}/privacy` is the Privacy Policy, and it is the URL submitted
for Google's OAuth verification.

Neither is a section, neither is gated, and neither touches a studio. They are marketing-site
routes that happen to carry contract text.

## Where the words are

| File | Holds |
|---|---|
| `src/lib/legalTerms.ts` | `TERMS_META` + `TERMS_SECTIONS` — twenty sections and two annexes |
| `src/lib/legalPrivacy.ts` | `PRIVACY_META` + `PRIVACY_SECTIONS` — ten sections |
| `src/lib/legalGoogleData.ts` | `GOOGLE_DATA_BLOCKS` — the Google API Services disclosure, imported by **both** |
| `src/lib/legalBlocks.ts` | `LegalBlock` / `LegalSection` / `LegalMeta` — the authoring vocabulary |
| `src/components/LegalDocument.js` | The chrome: hero, sticky table of contents, sections, contact card |
| `legal/terms-and-conditions.md`, `legal/privacy-policy.md` | The signable mirrors. Change both halves in one commit |

**The legal body is English only**, in both locales — §20.7 of the Terms makes the English
text authoritative, so translating it would create a second text able to disagree with the
one that governs. What *is* localized is the chrome: hero, labels, the note box, the contact
card, from `dict.terms` / `dict.privacy` in `src/shared/i18n.ts`. The two dictionary slices
have the same shape because `LegalDocument` takes either as its `copy` — a key added to one
belongs in the other.

## Why there are two documents and not one

The Google disclosure lived in the Terms alone, as Annex B, and technically satisfied
Google's requirement of "a dedicated webpage, different from your homepage". In practice a
reviewer looking for a privacy policy and handed a page headed *Terms & Conditions* rejects
it. Separately, §1.5 of the Terms had incorporated "our Privacy Policy" by reference since
v1.0 while no such page existed — a reader following that reference found nothing.

**The Privacy Policy cross-references the Terms rather than restating them.** Retention
periods (§10), security measures (§9), sub-processors and international transfers are written
once, in the Terms, and pointed at. Two copies of a retention period are two periods free to
disagree, and the one that matters would be whichever the customer read last.

**The one genuinely shared block of text is imported, not copied.** `GOOGLE_DATA_BLOCKS` is
rendered as Annex B of the Terms and as section 4 of the Privacy Policy. Its sub-headings
carry no section numbers on purpose — the same array sits under a "4" on one page and a "B"
on the other, so a cross-reference like "see B.3" would be wrong on one of them. Every
internal reference in it says "above". The framing sentence naming *which* document you are
reading is supplied by each document.

## What Google's verification actually requires

`support.google.com/cloud/answer/13806988`. The policy must be on a dedicated page on a
verified domain, be reachable from the homepage and from inside the app, and answer five
questions explicitly: what Google user data the app accesses, how it uses it, who it shares
it with, how it protects it, and how long it keeps it / how it is deleted. Plus the Limited
Use commitment, and the prohibitions — no advertising, no data brokers, no creditworthiness
decisions, no training generalised or non-personalised AI/ML models.

**Every claim in section 4 is taken from the code, not drafted generically**, and that is the
part to keep true:

| Claim | Source of truth |
|---|---|
| Sign-in scopes `openid email profile` | `platform/auth/oauth.ts` |
| Calendar scope `calendar.readonly` | `platform/auth/calendarProviders.ts` |
| Which event fields are read | `shared/calendar.ts`'s `normaliseEvent` — id, title, start, end, all-day, location, colour, link. **Not** description, attendees, organiser |
| What is stored, and that tokens are AES-256-GCM at rest | `platform/auth/calendarConnections.ts` |
| That no calendar content is stored at all | `docs/functionality/calendar.md`, "What is stored, and what is not" |
| Busy-only sharing, per studio, opt-in | `docs/functionality/calendar.md`, "Availability inside a studio" |
| Disconnect revokes *then* forgets | `DELETE /api/account/calendar` |
| The cookie table | `SESSION_COOKIE` / `SUPER_COOKIE` / `OTP_COOKIE` / `DEVICE_COOKIE` / `OAUTH_STATE_COOKIE`, plus `UI_LANG_COOKIE` |

If any of those change, the disclosure changes in the same commit. A privacy policy that has
drifted from the code is worse than none, because it is relied upon.

## Where they are linked from

Google requires the policy be linked from the homepage and shown in the app interface, so it
is in four places: the marketing header (`components/Nav.js`), the site footer
(`components/Footer.js`), the landing footer (`components/landing/Footer.js`, Resources
column) and the account surface (`components/public/AccountHome.js`). It is also in
`src/app/sitemap.js` and has its own `PAGES["/privacy"]` entry in `src/lib/seo.ts` for title,
description and hreflang alternates.

## Versions

`TERMS_META` and `PRIVACY_META` carry `version`, `effective` and `updated`, shown in each
hero. Dates are dd/mm/yyyy. **`updated` moves for any change; `effective` moves only when
the terms in force actually change** — Annex B disclosed what the product already did, so
§17's thirty-day material-change notice was not engaged and the Terms' effective date stayed
at 07/08/2026 while `updated` moved to 04/09/2026.

## Not built yet

- **No consent record, and no acceptance timestamp.** Nothing stores that a given user saw or
  accepted a given version. §1.3 says creating an account is acceptance; the account record
  does not carry which version was current when it was created, so a dispute about which text
  a customer agreed to cannot be answered from the data.
- **No change notice.** §17 and §10.1 both promise thirty days' notice by email or in-app
  notice for a material change. There is no mechanism that sends it — no version watcher, no
  notification producer, nothing in the outbox. Today it would be sent by hand.
- **No Arabic legal body.** Deliberate (see above), but it means an Arabic-only reader gets
  Arabic chrome around English contract text.
- **The referenced documents do not all exist.** §1.5 incorporates an Order Form, a DPA, an
  SLA, an Acceptable Use Policy and the Privacy Policy. Only the Privacy Policy is a real
  page; the DPA is summarised in Annex A and "executed separately", and the SLA and AUP have
  no text anywhere in this repo.
- **Governing law and the legal entity are still open.** §19 leaves both to be confirmed on
  incorporation, and `legal/terms-and-conditions.md` carries `‹…›` placeholders for the
  dedicated legal, privacy, billing and security mailboxes — every address in the product
  points at `info@nompany.com` instead.
- **No cookie banner**, because there is nothing to consent to: no advertising, analytics or
  cross-site tracking cookies are set. If one is ever added, the banner is not optional and
  §9 of the Policy stops being true the moment it ships.
