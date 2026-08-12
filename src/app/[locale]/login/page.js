import { redirect } from "next/navigation";
import { getDict } from "@/lib/i18n";
import { currentUser } from "@/lib/identity";
import { enabledProviders } from "@/lib/oauth";
import LoginForm from "@/components/public/LoginForm";
import AuthShell from "@/components/landing/AuthShell";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const dict = getDict(locale);
  return { title: dict.auth.loginTitle, description: dict.auth.loginSubtitle };
}

export default async function LoginPage({ params }) {
  const { locale } = await params;
  // Already signed in → the account hub, not the sign-in screen.
  if (await currentUser()) redirect(`/${locale}/account`);
  const dict = getDict(locale);
  const t = dict.auth;

  return (
    <AuthShell locale={locale} title={t.loginTitle} subtitle={t.loginSubtitle}>
      <LoginForm locale={locale} dict={dict} providers={enabledProviders()} />
    </AuthShell>
  );
}
