import { redirect } from "next/navigation";
import { getDict } from "@/shared/i18n";
import { currentUser } from "@/platform/auth/identity";
import ForgotFlow from "@/components/public/ForgotFlow";
import AuthShell from "@/components/landing/AuthShell";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }) {
  const { locale } = await params;
  return { title: getDict(locale).auth.forgotTitle, robots: { index: false, follow: false } };
}

// Password recovery. Also the way an OAuth user gives themselves a password:
// they signed in through Google/Microsoft and never had one to begin with.
export default async function ForgotPage({ params, searchParams }) {
  const { locale } = await params;
  if (await currentUser()) redirect(`/${locale}/account`);
  const dict = getDict(locale);
  const sp = await searchParams;

  return (
    <AuthShell
      locale={locale}
      title={dict.auth?.forgotTitle || "Forgot your password?"}
      subtitle={dict.auth?.forgotSubtitle}
    >
      <ForgotFlow locale={locale} initialEmail={String(sp?.email || "")} />
    </AuthShell>
  );
}
