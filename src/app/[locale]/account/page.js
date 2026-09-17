import { redirect } from "next/navigation";
import { getDict } from "@/shared/i18n";
import { currentUser, needsQuestionnaire } from "@/platform/auth/identity";
import AccountHome from "@/components/public/AccountHome";
import { studioSetupScreen } from "@/modules/main/studios";

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
  const user = await currentUser();
  if (!user) redirect(`/${locale}/login`);
  // The survey comes first. Anyone who has not finished it is sent back to a
  // fresh one rather than shown an account they cannot have reached yet.
  if (await needsQuestionnaire(user.id)) redirect(`/${locale}/questionnaire`);
  const dict = getDict(locale);
  // This route renders without the site header (Nav returns null here), so the
  // brand link, theme control and language switcher move into the page and
  // need their strings passed down.
  const chrome = {
    brand: dict.common.brand,
    language: dict.common.language,
    theme: {
      theme: dict.common.theme,
      light: dict.common.themeLight,
      dark: dict.common.themeDark,
      system: dict.common.themeSystem,
    },
  };
  // THE CREATE SCREEN'S QUESTIONS AND SUGGESTED ANSWERS, resolved here rather
  // than in the browser: they come from the same catalogue the create route
  // checks against, and the trade rules behind the suggestions reach the stage
  // registry, which has no business in the account page's bundle.
  const setup = studioSetupScreen(locale);
  return <AccountHome locale={locale} chrome={chrome} setup={setup} />;
}
