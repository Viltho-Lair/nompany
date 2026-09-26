import { redirect } from "next/navigation";
import { getDict } from "@/shared/i18n";
import { currentUser, currentSession } from "@/platform/auth/identity";
import { enabledProviders } from "@/platform/auth/oauth";
import LoginForm from "@/components/public/LoginForm";
import AuthShell from "@/components/landing/AuthShell";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const dict = getDict(locale);
  // NOINDEX. These were indexable, and login and signup were two of the twelve
  // URLs the sitemap advertised — a third of it — for thin auth screens with
  // nothing to rank for. Dropping them from the sitemap only stops them being
  // suggested; this is what stops them being indexed. `follow` stays true so
  // the links out of them are still crawled.
  return { title: dict.auth.loginTitle, description: dict.auth.loginSubtitle, robots: { index: false, follow: true } };
}

export default async function LoginPage({ params }) {
  const { locale } = await params;
  // Already signed in → the account hub, not the sign-in screen.
  //
  // A TILL'S SESSION IS NOT "ALREADY SIGNED IN" (26/09/2026). It is good for one
  // till and nothing else, and the studio shell sends it back there from any
  // other address — so skipping the form for it left a person who had sold at a
  // collaborator's till with no way to reach their own studio: every sign-in
  // bounced to the account hub, every studio link bounced to that till. The form
  // shows instead (the cashier switch first on a paired device, email a click
  // away), and signing in ends the till session (`openSession`).
  const [user, { state }] = await Promise.all([currentUser(), currentSession()]);
  if (user && state?.scope !== "till") redirect(`/${locale}/account`);
  const dict = getDict(locale);
  const t = dict.auth;

  return (
    <AuthShell locale={locale} title={t.loginTitle} subtitle={t.loginSubtitle}>
      <LoginForm locale={locale} dict={dict} providers={enabledProviders()} />
    </AuthShell>
  );
}
