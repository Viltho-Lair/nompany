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
  // NOINDEX. These were indexable, and login and signup were two of the twelve
  // URLs the sitemap advertised — a third of it — for thin auth screens with
  // nothing to rank for. Dropping them from the sitemap only stops them being
  // suggested; this is what stops them being indexed. `follow` stays true so
  // the links out of them are still crawled.
  return { title: dict.auth.signupTitle, description: dict.auth.signupSubtitle, robots: { index: false, follow: true } };
}

// THE LOCK IS LIFTED. It was a two-line early return that redirected every
// visit to sign-in, and it made the whole marketing site false: "Start free" is
// the only primary CTA the public site has, it appears twenty-eight times
// across the ten pages and two locales, and the contact page says in so many
// words that "there is no demo to book — the free tier is the whole product, so
// the fastest way to see it is to open it". None of those twenty-eight links
// reached a form. The lock was doing exactly what it said; nothing had told the
// site about it.
export default async function SignupPage({ params }) {
  const { locale } = await params;
  if (await currentUser()) redirect(`/${locale}/account`);
  const dict = getDict(locale);
  const t = dict.auth;

  return (
    <AuthShell locale={locale} title={t.signupTitle} subtitle={t.signupSubtitle}>
      <SignupForm locale={locale} dict={dict} providers={enabledProviders()} />
    </AuthShell>
  );
}
