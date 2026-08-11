import { redirect } from "next/navigation";
import { getDict } from "@/lib/i18n";
import { currentUser } from "@/lib/identity";
import AccountHome from "@/components/public/AccountHome";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const dict = getDict(locale);
  return { title: dict.auth?.accountTitle || "Your account", robots: { index: false, follow: false } };
}

// The account hub: personal info, questionnaire, the studio you own, the ones
// you collaborate in, and your trusted devices. Everything loads client-side
// from /api/identity/* and /api/studios.
export default async function AccountPage({ params }) {
  const { locale } = await params;
  if (!(await currentUser())) redirect(`/${locale}/login`);
  return <AccountHome locale={locale} />;
}
