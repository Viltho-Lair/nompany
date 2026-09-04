# nompany — Privacy Policy

**Version:** 1.0
**Effective date:** 04/09/2026
**Last updated:** 04/09/2026

> **Internal note (remove before printing/exporting for signature).** This document is the source of truth for the public `/privacy` page (`src/lib/legalPrivacy.ts`), and is the URL submitted for Google's OAuth verification. Section 4 is shared verbatim with Annex B of the Terms and is authored once, in `src/lib/legalGoogleData.ts` — change it there and mirror into **both** markdown files. This Policy deliberately **cross-references** the Terms for retention periods, security measures, sub-processors and international transfers rather than restating them: two copies of a retention period are two periods free to disagree. Not legal advice; review by qualified counsel before signature.

---

## 1. About this Policy

1.1 This Privacy Policy explains how nompany, the provider of the nompany ERP platform (**"nompany"**, **"we"**, **"us"**, **"our"**), handles personal data. It is the Privacy Policy referred to in Section 1 of the Terms and Conditions of Service (the **"Terms"**), and forms part of the Agreement described there.

1.2 **Two different roles, and the difference matters.** For the business records a customer organisation puts into the Service — its own clients, employees, projects, invoices and so on — that organisation is the Controller and nompany is only the Processor, acting on its instructions. Those records are governed by Section 9 of the Terms and by the Data Processing Agreement, not by this Policy. This Policy covers the data nompany handles in its own right: the account you sign in with, the data you authorise us to read from a third-party service such as Google, and the operational records that keep the platform running and secure.

1.3 **If you are an employee of a customer organisation** and want to know what that organisation holds about you inside nompany, ask that organisation. It decides what to store and how long to keep it; we cannot answer for it.

---

## 2. What nompany collects

| Category | What it is | Where it comes from |
|----------|------------|---------------------|
| **Account data** | Your name, email address, password hash (never the password itself), preferred language, and the studios you are a member of | You, at registration — or your identity provider, if you signed in with Google or Microsoft |
| **Authentication and security data** | Session records, device records, one-time codes, sign-in attempts, and the audit trail of security-relevant actions | Generated as you use the Service |
| **Connected-service data** | Data you explicitly authorise nompany to read from a third-party account — today, a Google or Microsoft calendar | The provider, on your authorisation, and only while that authorisation stands (see Section 4) |
| **Billing data** | Subscription, plan, invoice and transaction records; the card brand and last four digits | You and the Payment Processor. The full card number is never seen or stored by nompany — it is held by the PCI-DSS-compliant Payment Processor |
| **Usage and diagnostic data** | Request identifiers, timestamps, error records and performance measurements | Generated as you use the Service |

**Not collected.** nompany does not buy personal data from data brokers, does not build advertising profiles, and does not operate third-party advertising or cross-site tracking on its product surfaces.

---

## 3. How nompany uses it, and on what basis

| Purpose | Data used | Lawful basis |
|---------|-----------|--------------|
| Providing the Service — authenticating you, showing you your studios, running the modules you subscribed to | Account, authentication, connected-service data | Performance of a contract |
| Keeping accounts secure — rate limiting, device records, multi-factor authentication, the audit trail | Authentication and security data | Legitimate interests (protecting accounts and the platform), and legal obligation where applicable |
| Billing and tax | Billing data | Performance of a contract, and legal obligation |
| Support and correspondence | Account data and what you tell us | Performance of a contract, and legitimate interests |
| Diagnosing faults and improving reliability | Usage and diagnostic data | Legitimate interests (a working, reliable service) |

**No automated decisions.** nompany does not make decisions producing legal or similarly significant effects about you by automated means alone, and does not profile you for advertising.

---

## 4. Google user data (Google API Services)

This section is nompany's disclosure for data obtained through Google APIs, and is reproduced as Annex B of the Terms. It applies only where you choose to sign in to nompany with a Google Account or to connect a Google Calendar from Account → Calendars. If you do neither, nompany receives no Google user data about you.

### What Google user data nompany accesses

nompany requests the narrowest scope that makes each feature work, and accesses nothing beyond it:

| Feature | Google scope requested | Data accessed |
|---------|------------------------|---------------|
| Sign in with Google | `openid`, `email`, `profile` | Your Google account identifier, email address, name, and profile picture URL |
| Connected calendar | `https://www.googleapis.com/auth/calendar.readonly` | The calendars on your account (identifier and name); for the date range being displayed, each event's identifier, title, start and end time, all-day flag, location, colour, and Google Calendar link; and free/busy periods (start and end times only) |

**Read-only, and nothing else.** The calendar scope is read-only: nompany cannot and does not create, modify, or delete any event, calendar, or setting in your Google Account. It does not read event descriptions, attendees, organisers, or attachments, and it does not access Gmail, Drive, Contacts, or any other Google service — no scope granting access to those is ever requested.

### How nompany uses it

- Sign-in data is used solely to create and authenticate your nompany account and to identify you within it.
- Calendar data is used solely to show you your own upcoming events inside your nompany account.
- Where — and only where — you have explicitly opted a particular studio in to calendar sharing, colleagues who are members of that same studio can see **when** you are busy: start and end times only. They are never shown a title, location, attendee, organiser, or link. Sharing is off until you turn it on, and is granted per studio rather than once for all of them.

**What it is never used for.** nompany does not use Google user data for advertising of any kind (including personalised, interest-based, or retargeted advertising); does not sell it; does not transfer it to data brokers or information resellers; does not use it to determine creditworthiness or for lending purposes; and does not use it to develop, improve, or train generalised or non-personalised artificial-intelligence or machine-learning models. It is not used to build a profile of you for any purpose other than the features described above.

### What nompany stores, and what it does not

**No calendar content is stored.** No event, title, time, location, link, or busy period is ever written to nompany's database. Calendar content is fetched from Google for the request that displays it and is discarded with that response.

**What is stored.** For a connected calendar, nompany stores only the email address of the connected Google account, the identifiers of the calendars you selected, the date you connected, and the OAuth refresh and access tokens. Both tokens are encrypted with AES-256-GCM before they are written and are decrypted only in memory, for the duration of a request; no token is ever returned in an API response, written to a log line, or placed in a URL. For sign-in, your email address and name are stored on your nompany account record, as they would be for any other sign-in method.

### How nompany protects it

All traffic to and from Google APIs is encrypted in transit with TLS, and stored tokens are encrypted at rest as described above. Access to production systems is role-based, least-privilege, and logged. These measures are in addition to the technical and organisational measures set out in the Terms (Section 9).

### Who it is shared with

nompany does not sell, rent, or trade Google user data, and does not share it with any third party for that third party's own purposes. It is disclosed only to (a) the infrastructure Sub-processors that host and operate the Service, which act solely on nompany's instructions under the terms of Section 9 of the Terms, and (b) a competent authority where disclosure is required by law, in which case we will notify you unless legally prohibited. Within the Service, calendar data is shown only to you and — where you have opted a studio in — as busy start and end times to members of that studio, as described above.

### Retention, revocation, and deletion

- Because no calendar content is stored, there is no stored calendar content to retain or delete.
- Stored tokens are retained only for as long as the connection exists, and are deleted when you disconnect, when you revoke access at Google, or when your nompany account is deleted.
- Disconnecting inside nompany (Account → Calendars → Disconnect) revokes the grant with Google first and then deletes nompany's stored copy — it does not merely forget a grant that would otherwise remain live.
- You may revoke nompany's access at any time, independently of nompany, at <https://myaccount.google.com/permissions>. The connection stops working immediately, and nompany deletes its stored record the next time it attempts to use the revoked grant.
- To request deletion of Google user data, or to ask a question about it, write to info@nompany.com.

### Limited Use

nompany's use and transfer of information received from Google APIs to any other app adheres to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.

---

## 5. Who it is shared with

nompany does not sell personal data, does not rent or trade it, and does not disclose it to third parties for their own purposes. It is disclosed only to:

- **Sub-processors** that host and operate the Service — the hosting and database provider, the file-storage provider, the transactional-email provider, and the Payment Processor — each acting solely on nompany's instructions under written terms no less protective than the Data Processing Agreement. Section 9 of the Terms governs how they are engaged and how you are notified of a change.
- **Other members of a studio you belong to**, to the extent the Service is designed to show them — your name and role, and, only if you have opted that studio in to calendar sharing, when you are busy (see Section 4).
- **A competent authority**, where disclosure is required by law. Where it is lawful to do so, we will notify you first.
- **An acquirer**, in a merger, acquisition or sale of assets, subject to this Policy continuing to apply.

**International transfers.** Where personal data is transferred across borders, including outside the EEA or the UK, nompany implements a lawful transfer mechanism — Standard Contractual Clauses, the UK International Data Transfer Agreement or Addendum, or an equivalent safeguard — as set out in Section 9 of the Terms.

---

## 6. How it is protected

Encryption in transit (TLS) and at rest; field-level AES-256-GCM encryption for the most sensitive values, including national and passport identifiers and every stored OAuth token; passwords stored only as bcrypt hashes and never in a recoverable form; role-based, least-privilege access; rate limiting on credential endpoints; one-time-code verification and multi-factor authentication where offered; request-level logging and monitoring; and regular backups. Section 9 of the Terms states these measures in full and is the operative text.

**If something goes wrong.** nompany will notify an affected customer organisation without undue delay, and in any event within 72 hours of becoming aware of a confirmed personal-data breach affecting its data, with the information it needs to meet its own notification obligations.

---

## 7. How long it is kept

Personal data is kept only for as long as it is needed for the purpose it was collected for, or for as long as the law requires. The full schedule — including the thirty-day export window after termination, deletion within ninety days, the rolling thirty-five-day backup expiry, ten years for invoices and tax records, and twelve months for authentication and security logs — is set out in Section 10 of the Terms and is not restated here, so that there is only ever one set of periods to read.

**Connected-service data is the exception, and it is shorter.** No calendar content is stored at all, and the stored authorisation is deleted the moment you disconnect or revoke it. Section 4 above is the detail.

---

## 8. Your rights

Subject to the conditions in applicable data protection law, you have the right to request access to your personal data; to have inaccurate data corrected; to have data erased; to have processing restricted; to receive your data in a portable, machine-readable format; to object to processing carried out on the basis of legitimate interests; and, where processing relies on consent, to withdraw that consent at any time without affecting the lawfulness of what came before.

**Where to send a request.** Write to info@nompany.com. If your request concerns business records held inside a customer organisation's studio, nompany is the Processor rather than the Controller, so we will direct the request to that organisation and assist it in answering you — we are not permitted to answer on its behalf.

**Complaints.** You may lodge a complaint with the supervisory authority in your country of residence, place of work, or the place of the alleged infringement. We would prefer the chance to resolve it first.

---

## 9. Cookies and similar technologies

nompany sets only the cookies the product needs to work. There are no advertising cookies, no analytics or product-telemetry cookies, and no third-party cross-site tracking — which is why you are not asked to consent to any.

| Cookie | What it does | Lifetime |
|--------|--------------|----------|
| `nc_sid` | Keeps you signed in. Holds a session reference, never your password | The session |
| `nc_super` | The same, for the nompany operations console | The session |
| `nc_otp` | Carries a sign-in through the one-time-code step | Minutes |
| `nc_dev` | Recognises a device you have already verified, so you are not asked for a code every time | Until the device record expires or you sign out of it |
| `nc_oauth` | Protects sign-in and calendar-authorisation redirects against cross-site request forgery | The length of one redirect |
| `lang` | Remembers whether you chose English or Arabic | Until you change it |

---

## 10. Changes and contact

10.1 **Changes.** We may update this Policy. The version and dates at the top of this page always say which text you are reading. For a material change we will give at least thirty (30) days' notice by email or in-app notice, on the same terms as Section 17 of the Terms.

10.2 **Contact.** Privacy and data-protection enquiries, including requests to delete data obtained through Google APIs, go to info@nompany.com.

---

*© 2026 nompany. All rights reserved.*
