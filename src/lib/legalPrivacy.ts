import type { LegalMeta, LegalSection } from "./legalBlocks";
import { GOOGLE_DATA_BLOCKS } from "./legalGoogleData";

// Structured content for the public /privacy page — the standalone Privacy
// Policy, and the URL submitted for Google's OAuth verification.
//
// WHY IT EXISTS SEPARATELY FROM THE TERMS. The disclosure itself already lived
// in the Terms as Annex B, and technically satisfied Google's requirement of "a
// dedicated webpage, different from your homepage". In practice a reviewer
// looking for a privacy policy and handed a page headed "Terms & Conditions"
// rejects it, and the Terms' own §1 order-of-precedence clause had incorporated
// "our Privacy Policy" by reference since v1.0 while no such page existed —
// a reader following that reference found nothing.
//
// IT CROSS-REFERENCES THE TERMS RATHER THAN RESTATING THEM. The retention
// schedule (§10), the security measures (§9), the sub-processor commitment and
// the international-transfer safeguards are written once, in legalTerms.ts, and
// pointed at from here. Two copies of a retention period are two periods free to
// disagree, and the one a court reads would be whichever the Customer saw last.
// The single genuinely shared block of text — the Google disclosure — is
// imported from legalGoogleData.ts, not duplicated.
//
// English only, same as the Terms and for the same reason (§20.7: the English
// text is authoritative). The page chrome is localized via the i18n dictionary.
// Mirror any change here into legal/privacy-policy.md.
export const PRIVACY_META: LegalMeta = {
  version: "1.0",
  effective: "04/09/2026",
  updated: "04/09/2026",
};

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    id: "about",
    title: "1. About this Policy",
    blocks: [
      { type: "p", text: 'This Privacy Policy explains how nompany, the provider of the nompany ERP platform ("nompany", "we", "us", "our"), handles personal data. It is the Privacy Policy referred to in Section 1 of the Terms and Conditions of Service (the "Terms"), and forms part of the Agreement described there.' },
      { type: "p", lead: "Two different roles, and the difference matters.", text: "For the business records a customer organisation puts into the Service — its own clients, employees, projects, invoices and so on — that organisation is the Controller and nompany is only the Processor, acting on its instructions. Those records are governed by Section 9 of the Terms and by the Data Processing Agreement, not by this Policy. This Policy covers the data nompany handles in its own right: the account you sign in with, the data you authorise us to read from a third-party service such as Google, and the operational records that keep the platform running and secure." },
      { type: "p", lead: "If you are an employee of a customer organisation", text: "and want to know what that organisation holds about you inside nompany, ask that organisation. It decides what to store and how long to keep it; we cannot answer for it." },
    ],
  },
  {
    id: "what-we-collect",
    title: "2. What nompany collects",
    blocks: [
      { type: "table", head: ["Category", "What it is", "Where it comes from"], rows: [
        ["Account data", "Your name, email address, password hash (never the password itself), preferred language, and the studios you are a member of", "You, at registration — or your identity provider, if you signed in with Google or Microsoft"],
        ["Authentication and security data", "Session records, device records, one-time codes, sign-in attempts, and the audit trail of security-relevant actions", "Generated as you use the Service"],
        ["Connected-service data", "Data you explicitly authorise nompany to read from a third-party account — today, a Google or Microsoft calendar", "The provider, on your authorisation, and only while that authorisation stands (see Section 4)"],
        ["Billing data", "Subscription, plan, invoice and transaction records; the card brand and last four digits", "You and the Payment Processor. The full card number is never seen or stored by nompany — it is held by the PCI-DSS-compliant Payment Processor"],
        ["Usage and diagnostic data", "Request identifiers, timestamps, error records and performance measurements", "Generated as you use the Service"],
      ] },
      { type: "p", lead: "Not collected.", text: "nompany does not buy personal data from data brokers, does not build advertising profiles, and does not operate third-party advertising or cross-site tracking on its product surfaces." },
    ],
  },
  {
    id: "how-we-use",
    title: "3. How nompany uses it, and on what basis",
    blocks: [
      { type: "table", head: ["Purpose", "Data used", "Lawful basis"], rows: [
        ["Providing the Service — authenticating you, showing you your studios, running the modules you subscribed to", "Account, authentication, connected-service data", "Performance of a contract"],
        ["Keeping accounts secure — rate limiting, device records, multi-factor authentication, the audit trail", "Authentication and security data", "Legitimate interests (protecting accounts and the platform), and legal obligation where applicable"],
        ["Billing and tax", "Billing data", "Performance of a contract, and legal obligation"],
        ["Support and correspondence", "Account data and what you tell us", "Performance of a contract, and legitimate interests"],
        ["Diagnosing faults and improving reliability", "Usage and diagnostic data", "Legitimate interests (a working, reliable service)"],
      ] },
      { type: "p", lead: "No automated decisions.", text: "nompany does not make decisions producing legal or similarly significant effects about you by automated means alone, and does not profile you for advertising." },
    ],
  },
  {
    id: "google-user-data",
    title: "4. Google user data (Google API Services)",
    blocks: [
      { type: "p", text: "This section is nompany's disclosure for data obtained through Google APIs, and is reproduced as Annex B of the Terms. It applies only where you choose to sign in to nompany with a Google Account or to connect a Google Calendar from Account → Calendars. If you do neither, nompany receives no Google user data about you." },
      ...GOOGLE_DATA_BLOCKS,
    ],
  },
  {
    id: "sharing",
    title: "5. Who it is shared with",
    blocks: [
      { type: "p", text: "nompany does not sell personal data, does not rent or trade it, and does not disclose it to third parties for their own purposes. It is disclosed only to:" },
      { type: "ul", items: [
        "Sub-processors that host and operate the Service — the hosting and database provider, the file-storage provider, the transactional-email provider, and the Payment Processor — each acting solely on nompany's instructions under written terms no less protective than the Data Processing Agreement. Section 9 of the Terms governs how they are engaged and how you are notified of a change.",
        "Other members of a studio you belong to, to the extent the Service is designed to show them — your name and role, and, only if you have opted that studio in to calendar sharing, when you are busy (see Section 4).",
        "A competent authority, where disclosure is required by law. Where it is lawful to do so, we will notify you first.",
        "An acquirer, in a merger, acquisition or sale of assets, subject to this Policy continuing to apply.",
      ] },
      { type: "p", lead: "International transfers.", text: "Where personal data is transferred across borders, including outside the EEA or the UK, nompany implements a lawful transfer mechanism — Standard Contractual Clauses, the UK International Data Transfer Agreement or Addendum, or an equivalent safeguard — as set out in Section 9 of the Terms." },
    ],
  },
  {
    id: "security",
    title: "6. How it is protected",
    blocks: [
      { type: "p", text: "Encryption in transit (TLS) and at rest; field-level AES-256-GCM encryption for the most sensitive values, including national and passport identifiers and every stored OAuth token; passwords stored only as bcrypt hashes and never in a recoverable form; role-based, least-privilege access; rate limiting on credential endpoints; one-time-code verification and multi-factor authentication where offered; request-level logging and monitoring; and regular backups. Section 9 of the Terms states these measures in full and is the operative text." },
      { type: "p", lead: "If something goes wrong.", text: "nompany will notify an affected customer organisation without undue delay, and in any event within 72 hours of becoming aware of a confirmed personal-data breach affecting its data, with the information it needs to meet its own notification obligations." },
    ],
  },
  {
    id: "retention",
    title: "7. How long it is kept",
    blocks: [
      { type: "p", text: "Personal data is kept only for as long as it is needed for the purpose it was collected for, or for as long as the law requires. The full schedule — including the thirty-day export window after termination, deletion within ninety days, the rolling thirty-five-day backup expiry, ten years for invoices and tax records, and twelve months for authentication and security logs — is set out in Section 10 of the Terms and is not restated here, so that there is only ever one set of periods to read." },
      { type: "p", lead: "Connected-service data is the exception, and it is shorter.", text: "No calendar content is stored at all, and the stored authorisation is deleted the moment you disconnect or revoke it. Section 4 above is the detail." },
    ],
  },
  {
    id: "rights",
    title: "8. Your rights",
    blocks: [
      { type: "p", text: "Subject to the conditions in applicable data protection law, you have the right to request access to your personal data; to have inaccurate data corrected; to have data erased; to have processing restricted; to receive your data in a portable, machine-readable format; to object to processing carried out on the basis of legitimate interests; and, where processing relies on consent, to withdraw that consent at any time without affecting the lawfulness of what came before." },
      { type: "p", lead: "Where to send a request.", text: "Write to info@nompany.com. If your request concerns business records held inside a customer organisation's studio, nompany is the Processor rather than the Controller, so we will direct the request to that organisation and assist it in answering you — we are not permitted to answer on its behalf." },
      { type: "p", lead: "Complaints.", text: "You may lodge a complaint with the supervisory authority in your country of residence, place of work, or the place of the alleged infringement. We would prefer the chance to resolve it first." },
    ],
  },
  {
    id: "cookies",
    title: "9. Cookies and similar technologies",
    blocks: [
      { type: "p", text: "nompany sets only the cookies the product needs to work. There are no advertising cookies, no analytics or product-telemetry cookies, and no third-party cross-site tracking — which is why you are not asked to consent to any." },
      { type: "table", head: ["Cookie", "What it does", "Lifetime"], rows: [
        ["nc_sid", "Keeps you signed in. Holds a session reference, never your password", "The session"],
        ["nc_super", "The same, for the nompany operations console", "The session"],
        ["nc_otp", "Carries a sign-in through the one-time-code step", "Minutes"],
        ["nc_dev", "Recognises a device you have already verified, so you are not asked for a code every time", "Until the device record expires or you sign out of it"],
        ["nc_oauth", "Protects sign-in and calendar-authorisation redirects against cross-site request forgery", "The length of one redirect"],
        ["lang", "Remembers whether you chose English or Arabic", "Until you change it"],
      ] },
    ],
  },
  {
    id: "changes",
    title: "10. Changes and contact",
    blocks: [
      { type: "p", lead: "Changes.", text: "We may update this Policy. The version and dates at the top of this page always say which text you are reading. For a material change we will give at least thirty (30) days' notice by email or in-app notice, on the same terms as Section 17 of the Terms." },
      { type: "p", lead: "Contact.", text: "Privacy and data-protection enquiries, including requests to delete data obtained through Google APIs, go to info@nompany.com." },
    ],
  },
];
