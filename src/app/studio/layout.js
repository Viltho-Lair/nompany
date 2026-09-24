import { switchboard } from "@/lib/dashboardWidgets";
import Link from "next/link";
import { can } from "@/platform/access";
import { dirFor } from "@/shared/i18n";
import { shellDict } from "@/shared/studio/shell";
import StudioFrame from "@/components/studio2/StudioFrame";
import StudioTracker from "@/components/StudioTracker";
import { withRequest } from "@/platform/http/observability";
import { studioShell } from "./_shell";
import { subscriptionDict } from "@/shared/studio/subscription";

// THE STUDIO'S SHELL, RESOLVED ONCE AND THEN LEFT ALONE.
//
// THE DEFECT THIS EXISTS FOR. There was no layout here, so the page WAS the
// layout: every section click re-resolved the studio, re-read the section tree,
// the plan catalogues, the profile and the chat allowance, and re-rendered the
// whole sidebar — for a shell that had not changed. Measured warm against the
// real database: 10 SELECTs across 4–5 dependent waves, ~200ms, where a bare
// `SELECT 1` on that connection costs 35ms. Under PG_TRANSPORT=gateway each of
// those statements is its own HTTPS call to Cloud Run, so that figure is a
// floor rather than a production estimate.
//
// A layout is rendered once and then PERSISTS across navigations below it. So
// the sidebar stops being rebuilt, stops being re-sent in the RSC payload, and
// stops being torn down and remounted — which is also what lets `loading.js`
// stop reproducing it.
//
// AND IT IS WHY THE LIVE CONNECTION IS SAFE HERE. StudioFrame opens the
// studio's one EventSource (invariant 14: browsers cap six per domain and
// useLiveUpdates has 63 call sites, measured 07/09/2026). Mounted in a layout
// it survives a navigation instead of being closed and reopened on every
// section click, which is the behaviour that invariant was always describing.
export default async function StudioLayout({ children }) {
  return withRequest("studio-layout", () => renderShell(children));
}

async function renderShell(children) {
  const shell = await studioShell();

  // NOT A MEMBER. The only refusal that renders rather than throws, so it is
  // the only one the layout has to draw itself. It deliberately does NOT render
  // `children`: a layout that omits them means React never renders the page at
  // all, so no screen below can leak a row to somebody who is not a
  // collaborator. The page also refuses on its own — see the note there for why
  // both, rather than trusting this alone.
  if (shell.error === "forbidden") {
    return <NotAMember slug={shell.slug} locale={shell.locale} />;
  }

  const { studio, collaborator, access, sections, allSections, locale, admin, plan, chat, billing, canUpgrade } = shell;

  // SHUT DOWN (the owner's ladder, 24/09/2026: 90 days unpaid). The studio is
  // replaced by one screen, and like NotAMember it does NOT render `children`,
  // so no screen below renders at all. The API refuses the same people
  // (platform/http/route); this is the page half.
  if (billing?.access === "owner-only") {
    return <ShutDown locale={locale} owner={collaborator.role === "owner"} deletedOn={billing.dates?.deletedOn} slug={studio.slug} />;
  }
  // WHAT THE STUDIO HAS SWITCHED OFF, for the dashboards' second gate. From
  // ALL sections, never `sections`: that list is already filtered to what the
  // reader may open AND what is on, so a switched-off part is simply missing
  // from it — and a missing key reads as "on". Only the keys travel, not the
  // rows: the browser needs to know what to leave out, nothing more.
  const isOn = switchboard(allSections || []);
  const switchedOff = (allSections || []).filter((s) => !isOn(s.key)).map((s) => s.key);

  return (
    <StudioFrame
      studio={{
        name: studio.name, slug: studio.slug, logo: studio.logo || "",
        // The band beside the package, so a Medium studio's own header reads
        // "Medium · 50–99" — the size it is actually on (24/09/2026).
        packageName: plan.categoryLabel ? `${plan.packageName} · ${plan.categoryLabel}` : plan.packageName,
        packageColor: plan.packageColor,
        tierName: plan.tierName, tierColor: plan.tierColor,
        canUpgrade,
      }}
      me={{
        alias: collaborator.alias || "", role: collaborator.role, canAdminister: admin,
        // Resolved once, here, the same way `admin` is — StudioFrame draws the
        // nav entry off this flag rather than re-deriving access itself.
        canSeeEngagements: can(access, "engagements.view"),
      }}
      // parentId drives the expandable nav.
      sections={sections.map((s) => ({
        id: s.id, key: s.key, name: s.name, enabled: s.enabled, parentId: s.parentId || null,
      }))}
      chat={chat}
      // NOT THE URL'S — a studio's address is its slug, so there is nowhere in
      // it to put a locale. The tenant's setting, overridden by this person's
      // own choice; resolved in _shell.
      locale={locale}
      // The studio's dashboard entitlement, resolved once here (the shell
      // already reads the plan for the package/tier tags), so dashboards can
      // gate paid components without a per-request read. The tier sells
      // dashboards by selection — a master switch and a per-component list — so
      // the three fields ride down and the client resolves the visible set.
      analytics={{
        analyticsEnabled: plan.analyticsEnabled,
        dashboardWidgets: plan.dashboardWidgets,
        analyticsLevel: plan.analyticsLevel,
      }}
      // Whether this studio's package includes Nova — the shell shows the
      // assistant launcher only when it does. The endpoint re-checks this, so
      // the flag is a convenience for the UI, not the gate.
      novaEnabled={plan.novaEnabled}
      switchedOff={switchedOff}
    >
      {/* The ERP's traffic counter. It records a SECTION and never a tenant or a
          record id — see StudioTracker for why the public site's page rule
          cannot be reused here. */}
      <StudioTracker />
      <BillingBanner billing={billing} locale={locale} />
      {children}
    </StudioFrame>
  );
}

// NO `activeKey` ABOVE, AND THAT IS THE WHOLE REASON TASK 1 CAME FIRST.
//
// A layout is never handed the route's segments, so the shell cannot be told
// which row is current — it derives it from `usePathname()` through
// shared/studioRoute, the same module the page reads the address with.

function NotAMember({ slug, locale = "en" }) {
  const t = shellDict(locale);
  return (
    /* THIS SCREEN CARRIES ITS OWN lang/dir. Everything else in the studio
       inherits them from StudioFrame, and this is the one screen that renders
       instead of it — a non-member has no shell. Without them an Arabic reader
       got mirrored copy in a left-to-right box. */
    <main lang={locale} dir={dirFor(locale)} className="flex min-h-screen items-center justify-center bg-[var(--geex-page)] px-5">
      <div className="max-w-md rounded-geex border border-slate-200/70 bg-white p-8 text-center dark:border-white/10 dark:bg-[#20202c]">
        <h1 className="font-display text-xl font-800 text-slate-900 dark:text-white">{t.notAMember}</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {t.notAMemberBefore}<span className="font-mono">{slug}</span>{t.notAMemberAfter}
        </p>
        <Link href={`/${locale}/account`} className="mt-5 inline-block rounded-full bg-brand-600 px-5 py-2.5 font-display text-sm font-700 text-white hover:bg-brand-700">
          {t.backToAccount}
        </Link>
      </div>
    </main>
  );
}

// "2026-12-24" → "24/12/2026", the house format, without a client locale to ask.
// THE BACKSLASHES MATTER: written once without them (/^d{4}-…/), this matched
// "dddd-dd-dd" and never a date, so every banner and the shut-down screen said
// "shuts down on ." with the date missing.
const day = (d) => (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d.split("-").reverse().join("/") : "");

// Standard's free months are worth a warning only near their end.
const TRIAL_WARNING_DAYS = 14;

/**
 * THE LINE ABOVE EVERY SCREEN while something about the subscription needs
 * doing: payment due (still working), closed (view and export only),
 * cancelled, or Standard's free months ending within two weeks. Nothing when
 * all is well. What it says is enforced by the API; this only says it first.
 */
function BillingBanner({ billing, locale }) {
  if (!billing?.dates) return null;
  const t = subscriptionDict(locale);
  const { status, dates, paidUntil, daysLeft } = billing;
  let text = "";
  let tone = "amber";
  if (status === "trial") {
    if (daysLeft > TRIAL_WARNING_DAYS) return null;
    text = t.trialEnding(day(paidUntil));
  } else if (status === "due") text = t.due(day(dates.closesOn));
  else if (status === "closed") { text = t.closed(day(dates.shutsDownOn)); tone = "rose"; }
  else if (status === "cancelled") { text = t.cancelled(day(dates.shutsDownOn)); tone = "rose"; }
  else return null;
  const colours = tone === "rose"
    ? "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-100"
    : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100";
  return (
    <div role="status" className={`mx-4 mt-4 flex flex-wrap items-center gap-3 rounded-geex border px-4 py-3 text-sm ${colours}`}>
      <span className="min-w-0 flex-1">{text}</span>
      <Link href={`/${locale}/contact`} className="shrink-0 font-display font-700 underline underline-offset-2">{t.pay}</Link>
    </div>
  );
}

/**
 * THE WHOLE STUDIO, WHEN IT IS SHUT DOWN. The owner is told what is kept and
 * until when, and how to reopen it; a member is told only that the owner can.
 * The owner can also download everything the studio holds (/export, owner
 * only), which is what the owner's rules leave them with here.
 */
function ShutDown({ locale = "en", owner, deletedOn, slug }) {
  const t = subscriptionDict(locale);
  return (
    <main lang={locale} dir={dirFor(locale)} className="flex min-h-screen items-center justify-center bg-[var(--geex-page)] px-5">
      <div className="max-w-md rounded-geex border border-slate-200/70 bg-white p-8 text-center dark:border-white/10 dark:bg-[#20202c]">
        <h1 className="font-display text-xl font-800 text-slate-900 dark:text-white">{t.shutDownTitle}</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {owner ? t.shutDownOwner(day(deletedOn)) : t.shutDownMember}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {owner && (
            <a href={`/api/studios/${slug}/export`} className="inline-block rounded-full border border-slate-200 px-5 py-2.5 font-display text-sm font-700 text-slate-700 dark:border-white/15 dark:text-slate-200">
              {t.download}
            </a>
          )}
          {owner && (
            <Link href={`/${locale}/contact`} className="inline-block rounded-full bg-brand-600 px-5 py-2.5 font-display text-sm font-700 text-white hover:bg-brand-700">
              {t.pay}
            </Link>
          )}
          <Link href={`/${locale}/account`} className="inline-block rounded-full border border-slate-200 px-5 py-2.5 font-display text-sm font-700 text-slate-700 dark:border-white/15 dark:text-slate-200">
            {t.backToAccount}
          </Link>
        </div>
      </div>
    </main>
  );
}
