import { defaultLocale, type Locale } from "../locale";
import { commonEn, commonAr, type CommonStrings } from "./common";

// ENGAGEMENTS — the deal list, its stages, its lock and its deletion.
//
// Generated from the screen's own copy and then translated by hand. See the
// header of ./shell for why every surface's dictionary is its own module and why
// nothing may enumerate them.

type Strings = CommonStrings & {
  deleteNamed: (what: string) => string;
  noStageYet: (what: string) => string;
  onThisDeal: (n: number) => string;
  openIn: (what: string) => string;
  openNamed: (what: string) => string;
  accessEngagementsStudio: string;
  alreadyDeleted: string;
  backEngagements: string;
  backStudio: string;
  canNoLongerSee: string;
  cannotBeUndone: string;
  cannotUndo: string;
  client: string;
  couldNotWorkOut: string;
  dealLockedAgainNothing: string;
  dealLockedAgainWhile: string;
  deleting: string;
  didNotGoThrough: string;
  didNotGoThrough2: string;
  engagement: string;
  engagementNoLongerExists: string;
  engagementSingular: string;
  engagements: string;
  engagementsPlural: string;
  hadAlreadyBeenDeleted: string;
  keepDeal: string;
  loadMore: string;
  loading: string;
  loadingEngagement: string;
  loadingEngagements: string;
  lock: string;
  locked: string;
  lockedUnlockBeforeCan: string;
  noAccessEngagements: string;
  noClientOnFile: string;
  noClientOnFile2: string;
  noEngagementsCanSee: string;
  noLongerAllowedDelete: string;
  notAllowedLockUnlock: string;
  nothingHereYet: string;
  oneDealEveryStage: string;
  ref: string;
  safetyIsOff: string;
  saving: string;
  stages: string;
  started: string;
  thisDeal: string;
  title: string;
  unlock: string;
  unlocked: string;
  untitledDeal: string;
  untitledDeal2: string;
  workingOutWhatDeleting: string;
};

const en: Strings = {
  ...commonEn,
  deleteNamed: (what) => `Delete ${what}`,
  noStageYet: (what) => `No ${what.charAt(0).toLowerCase() + what.slice(1)} yet.`,
  onThisDeal: (n) => `${n} on this deal`,
  openIn: (what) => `Open in ${what} →`,
  openNamed: (what) => `Open ${what}`,
  accessEngagementsStudio: "You don't have access to Engagements in this studio.",
  alreadyDeleted: "That engagement had already been deleted.",
  backEngagements: "Back to Engagements",
  backStudio: "Back to the studio",
  canNoLongerSee: "You can no longer see this engagement.",
  cannotBeUndone: "This cannot be undone.",
  cannotUndo: "This cannot be undone.",
  client: "Client",
  couldNotWorkOut: "Could not work out what deleting this would affect, so it is not safe to offer the button.",
  dealLockedAgainNothing: "This deal has been locked again. Nothing can be deleted until it is unlocked.",
  dealLockedAgainWhile: "This deal was locked again while you were deciding. Nothing was deleted — unlock it again if you still want it gone.",
  deleting: "Deleting…",
  didNotGoThrough: "That did not go through. Try again.",
  didNotGoThrough2: "That did not go through, and nothing was deleted. Try again.",
  engagement: "Engagement",
  engagementNoLongerExists: "This engagement no longer exists.",
  engagementSingular: "Engagement",
  engagements: "Engagements",
  engagementsPlural: "Engagements",
  hadAlreadyBeenDeleted: "That engagement had already been deleted.",
  keepDeal: "Keep this deal",
  loadMore: "Load more",
  loading: "Loading…",
  loadingEngagement: "Loading engagement",
  loadingEngagements: "Loading engagements",
  lock: "Lock",
  locked: "Locked",
  lockedUnlockBeforeCan: "Locked. Unlock it before it can be deleted.",
  noAccessEngagements: "You don't have access to Engagements in this studio.",
  noClientOnFile: "No client on file",
  noClientOnFile2: "No client on file",
  noEngagementsCanSee: "No engagements you can see on this page",
  noLongerAllowedDelete: "You are no longer allowed to delete this deal.",
  notAllowedLockUnlock: "You are not allowed to lock or unlock deals in this studio.",
  nothingHereYet: "Nothing here yet",
  oneDealEveryStage: "One deal, every stage you may see",
  ref: "Ref",
  safetyIsOff: "The safety is off — this deal can be deleted.",
  saving: "Saving…",
  stages: "Stages",
  started: "Started",
  thisDeal: "this deal",
  title: "Title",
  unlock: "Unlock",
  unlocked: "Unlocked",
  untitledDeal: "Untitled deal",
  untitledDeal2: "Untitled deal",
  workingOutWhatDeleting: "Working out what deleting this would affect",
};

const ar: Strings = {
  ...commonAr,
  deleteNamed: (what) => `حذف ${what}`,
  noStageYet: (what) => `لا يوجد ${what} بعد.`,
  onThisDeal: (n) => `${n} في هذه الصفقة`,
  openIn: (what) => `افتح في ${what} ←`,
  openNamed: (what) => `فتح ${what}`,
  accessEngagementsStudio: "لا تملك صلاحية الوصول إلى الارتباطات في هذا الاستوديو.",
  alreadyDeleted: "سبق حذف هذا الارتباط.",
  backEngagements: "العودة إلى الارتباطات",
  backStudio: "العودة إلى الاستوديو",
  canNoLongerSee: "لم يعد بإمكانك رؤية هذا الارتباط.",
  cannotBeUndone: "لا يمكن التراجع عن هذا.",
  cannotUndo: "لا يمكن التراجع عن هذا.",
  client: "العميل",
  couldNotWorkOut: "تعذّر تحديد ما سيتأثر بحذف هذا، لذا ليس من الآمن عرض الزر.",
  dealLockedAgainNothing: "أُقفلت هذه الصفقة من جديد. لا يمكن حذف أي شيء حتى يُفتح القفل.",
  dealLockedAgainWhile: "أُقفلت هذه الصفقة من جديد أثناء اتخاذك القرار. لم يُحذف شيء — افتح القفل مرة أخرى إن كنت لا تزال تريد حذفها.",
  deleting: "جارٍ الحذف…",
  didNotGoThrough: "لم تتم العملية. حاول مرة أخرى.",
  didNotGoThrough2: "لم تتم العملية، ولم يُحذف شيء. حاول مرة أخرى.",
  engagement: "الارتباط",
  engagementNoLongerExists: "لم يعد هذا الارتباط موجودًا.",
  engagementSingular: "الارتباط",
  engagements: "الارتباطات",
  engagementsPlural: "الارتباطات",
  hadAlreadyBeenDeleted: "سبق حذف هذا الارتباط.",
  keepDeal: "الإبقاء على هذه الصفقة",
  loadMore: "تحميل المزيد",
  loading: "جارٍ التحميل…",
  loadingEngagement: "جارٍ تحميل الارتباط",
  loadingEngagements: "جارٍ تحميل الارتباطات",
  lock: "قفل",
  locked: "مقفل",
  lockedUnlockBeforeCan: "مقفل. افتح القفل قبل أن يمكن حذفه.",
  noAccessEngagements: "لا تملك صلاحية الوصول إلى الارتباطات في هذا الاستوديو.",
  noClientOnFile: "لا يوجد عميل مسجّل",
  noClientOnFile2: "لا يوجد عميل مسجّل",
  noEngagementsCanSee: "لا توجد ارتباطات يمكنك رؤيتها في هذه الصفحة",
  noLongerAllowedDelete: "لم يعد مسموحًا لك بحذف هذه الصفقة.",
  notAllowedLockUnlock: "لا يُسمح لك بقفل الصفقات أو فتحها في هذا الاستوديو.",
  nothingHereYet: "لا شيء هنا بعد",
  oneDealEveryStage: "صفقة واحدة، وكل مرحلة يمكنك رؤيتها",
  ref: "المرجع",
  safetyIsOff: "أمان الحذف مرفوع — يمكن حذف هذه الصفقة.",
  saving: "جارٍ الحفظ…",
  stages: "المراحل",
  started: "بدأ في",
  thisDeal: "هذه الصفقة",
  title: "العنوان",
  unlock: "فتح القفل",
  unlocked: "مفتوح",
  untitledDeal: "صفقة بلا عنوان",
  untitledDeal2: "صفقة بلا عنوان",
  workingOutWhatDeleting: "جارٍ تحديد ما سيتأثر بحذف هذا",
};

const engagements = { en, ar };

export function engagementsDict(locale: string): Strings {
  return engagements[locale as Locale] || engagements[defaultLocale];
}
