import { redirect } from "next/navigation";
import { getDict } from "@/shared/i18n";
import { currentUser } from "@/platform/auth/identity";
import { enabledProviders } from "@/platform/auth/oauth";
import SignupForm from "@/components/public/SignupForm";
import AuthShell from "@/components/landing/AuthShell";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const dict = getDict(locale);
  return { title: dict.auth.signupTitle, description: dict.auth.signupSubtitle };
}

// TEMPORARY LOCK — the sign-up route is closed until further notice. Nobody
// reaches the form: every visit is redirected to sign-in before the page is
// built. This locks the ROUTE, not the mechanism — the signup service and its
// API are untouched, so lifting the lock is deleting these two lines. Kept as a
// greppable early return so there is nothing else to unwind.
const REGISTRATION_LOCKED = true;

export default async function SignupPage({ params }) {
  const { locale } = await params;
  if (REGISTRATION_LOCKED) redirect(`/${locale}/login`);
  if (await currentUser()) redirect(`/${locale}/account`);
  const dict = getDict(locale);
  const t = dict.auth;

  return (
    <AuthShell locale={locale} title={t.signupTitle} subtitle={t.signupSubtitle}>
      <SignupForm locale={locale} dict={dict} providers={enabledProviders()} />
    </AuthShell>
  );
}
