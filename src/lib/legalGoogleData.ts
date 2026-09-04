import type { LegalBlock } from "./legalBlocks";

// The Google API Services disclosure, written ONCE and rendered by BOTH legal
// documents — Annex B of the Terms (legalTerms.ts) and section 4 of the Privacy
// Policy (legalPrivacy.ts).
//
// It lives in its own module because neither document owns it. Google's OAuth
// verification reviews the PRIVACY POLICY (support.google.com/cloud/answer/
// 13806988) and requires it to answer five questions explicitly — what the app
// accesses, how it uses it, who it shares it with, how it protects it, and how
// long it keeps it — while the Terms incorporate the same disclosure by
// reference from §16. Two copies of that text would be two copies free to drift
// into saying different things about the same OAuth scopes, which is the one
// failure mode a reviewer is guaranteed to notice.
//
// THE SUB-HEADINGS CARRY NO SECTION NUMBERS, deliberately: this array is dropped
// into a document numbered 4 on one page and lettered B on the other, so a
// cross-reference like "see B.3" would be wrong on one of them. Every internal
// reference here says "above" instead. The framing sentence that says WHICH
// document you are reading is supplied by each document, not by this file.
//
// Keep it factually true of the code. The scopes are the ones in
// `platform/auth/oauth.ts` (sign-in) and `platform/auth/calendarProviders.ts`
// (calendar); the stored fields are `calendarConnections.ts`'s; the event fields
// are the ones `shared/calendar.ts`'s `normaliseEvent` actually reads. If any of
// those change, this text changes in the same commit — a privacy disclosure that
// has drifted from the code is worse than none, because it is relied upon.
export const GOOGLE_DATA_BLOCKS: LegalBlock[] = [
  { type: "h3", text: "What Google user data nompany accesses" },
  { type: "p", text: "nompany requests the narrowest scope that makes each feature work, and accesses nothing beyond it:" },
  { type: "table", head: ["Feature", "Google scope requested", "Data accessed"], rows: [
    ["Sign in with Google", "openid, email, profile", "Your Google account identifier, email address, name, and profile picture URL"],
    ["Connected calendar", "https://www.googleapis.com/auth/calendar.readonly", "The calendars on your account (identifier and name); for the date range being displayed, each event's identifier, title, start and end time, all-day flag, location, colour, and Google Calendar link; and free/busy periods (start and end times only)"],
  ] },
  { type: "p", lead: "Read-only, and nothing else.", text: "The calendar scope is read-only: nompany cannot and does not create, modify, or delete any event, calendar, or setting in your Google Account. It does not read event descriptions, attendees, organisers, or attachments, and it does not access Gmail, Drive, Contacts, or any other Google service — no scope granting access to those is ever requested." },

  { type: "h3", text: "How nompany uses it" },
  { type: "ul", items: [
    "Sign-in data is used solely to create and authenticate your nompany account and to identify you within it.",
    "Calendar data is used solely to show you your own upcoming events inside your nompany account.",
    "Where — and only where — you have explicitly opted a particular studio in to calendar sharing, colleagues who are members of that same studio can see when you are busy: start and end times only. They are never shown a title, location, attendee, organiser, or link. Sharing is off until you turn it on, and is granted per studio rather than once for all of them.",
  ] },
  { type: "p", lead: "What it is never used for.", text: "nompany does not use Google user data for advertising of any kind (including personalised, interest-based, or retargeted advertising); does not sell it; does not transfer it to data brokers or information resellers; does not use it to determine creditworthiness or for lending purposes; and does not use it to develop, improve, or train generalised or non-personalised artificial-intelligence or machine-learning models. It is not used to build a profile of you for any purpose other than the features described above." },

  { type: "h3", text: "What nompany stores, and what it does not" },
  { type: "p", lead: "No calendar content is stored.", text: "No event, title, time, location, link, or busy period is ever written to nompany's database. Calendar content is fetched from Google for the request that displays it and is discarded with that response." },
  { type: "p", lead: "What is stored.", text: "For a connected calendar, nompany stores only the email address of the connected Google account, the identifiers of the calendars you selected, the date you connected, and the OAuth refresh and access tokens. Both tokens are encrypted with AES-256-GCM before they are written and are decrypted only in memory, for the duration of a request; no token is ever returned in an API response, written to a log line, or placed in a URL. For sign-in, your email address and name are stored on your nompany account record, as they would be for any other sign-in method." },

  { type: "h3", text: "How nompany protects it" },
  { type: "p", text: "All traffic to and from Google APIs is encrypted in transit with TLS, and stored tokens are encrypted at rest as described above. Access to production systems is role-based, least-privilege, and logged. These measures are in addition to the technical and organisational measures set out in the Terms (Section 9)." },

  { type: "h3", text: "Who it is shared with" },
  { type: "p", text: "nompany does not sell, rent, or trade Google user data, and does not share it with any third party for that third party's own purposes. It is disclosed only to (a) the infrastructure Sub-processors that host and operate the Service, which act solely on nompany's instructions under the terms of Section 9 of the Terms, and (b) a competent authority where disclosure is required by law, in which case we will notify you unless legally prohibited. Within the Service, calendar data is shown only to you and — where you have opted a studio in — as busy start and end times to members of that studio, as described above." },

  { type: "h3", text: "Retention, revocation, and deletion" },
  { type: "ul", items: [
    "Because no calendar content is stored, there is no stored calendar content to retain or delete.",
    "Stored tokens are retained only for as long as the connection exists, and are deleted when you disconnect, when you revoke access at Google, or when your nompany account is deleted.",
    "Disconnecting inside nompany (Account → Calendars → Disconnect) revokes the grant with Google first and then deletes nompany's stored copy — it does not merely forget a grant that would otherwise remain live.",
    "You may revoke nompany's access at any time, independently of nompany, at https://myaccount.google.com/permissions. The connection stops working immediately, and nompany deletes its stored record the next time it attempts to use the revoked grant.",
    "To request deletion of Google user data, or to ask a question about it, write to info@nompany.com.",
  ] },

  { type: "h3", text: "Limited Use" },
  { type: "p", text: "nompany's use and transfer of information received from Google APIs to any other app adheres to the Google API Services User Data Policy, including the Limited Use requirements." },
];
