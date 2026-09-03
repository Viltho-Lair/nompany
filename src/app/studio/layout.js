import Link from "next/link";
import { can } from "@/platform/access";
import { dirFor } from "@/shared/i18n";
import { shellDict } from "@/shared/studio/shell";
import StudioFrame from "@/components/studio2/StudioFrame";
import { withRequest } from "@/platform/http/observability";
import { studioShell } from "./_shell";

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
// useLiveUpdates has 21 call sites). Mounted in a layout it survives a
// navigation instead of being closed and reopened on every section click,
// which is the behaviour that invariant was always describing.
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

  const { studio, collaborator, access, sections, locale, admin, plan, chat } = shell;

  return (
    <StudioFrame
      studio={{
        name: studio.name, slug: studio.slug, logo: studio.logo || "",
        packageName: plan.packageName, packageColor: plan.packageColor,
        tierName: plan.tierName, tierColor: plan.tierColor,
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
    >
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
