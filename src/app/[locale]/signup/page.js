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
