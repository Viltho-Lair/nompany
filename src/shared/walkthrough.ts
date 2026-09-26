import { defaultLocale, type Locale } from "./locale";

// THE WALKTHROUGH — Nova showing a new person around, once per sign-in, until
// they say not to. Two tours: the account hub and a studio. Pure: the decision
// and the words, shared by the route that answers "should I show it" and the
// screens that draw it, so the two cannot disagree about what "off" means.
//
// TWO STORES, BECAUSE THERE ARE TWO QUESTIONS:
//   • "don't show this again" is the PERSON's — it lives on their profile and
//     follows them to every device, until they turn it back on;
//   • "already shown" is the SIGN-IN's — it lives on the session state and dies
//     with it, which is what makes the tour come back at the next login. A
//     browser store could not say that: a new tab is not a new sign-in, and a
//     second device IS one.

export const TOURS = ["account", "studio"] as const;
export type Tour = (typeof TOURS)[number];

export const isTour = (t: unknown): t is Tour => TOURS.includes(t as Tour);

export type TourStatus = { show: boolean; off: boolean };

/**
 * Whether a tour is shown on this request. Off wins; then once per sign-in.
 * A TILL'S SESSION never sees one — it is a counter shared by cashiers, not
 * somebody's first look round, and a tour covering the till mid-queue would be
 * a till nobody could sell on.
 */
export function tourStatus(
  tour: Tour,
  off: Partial<Record<string, unknown>> | null | undefined,
  seen: readonly string[] | null | undefined,
  scope?: string,
): TourStatus {
  const isOff = Boolean(off?.[tour]);
  return { off: isOff, show: !isOff && !scope && !(seen || []).includes(tour) };
}

/** Every tour's status at once — what the route answers. */
export function tourStatuses(
  off: Partial<Record<string, unknown>> | null | undefined,
  seen: readonly string[] | null | undefined,
  scope?: string,
): Record<Tour, TourStatus> {
  return Object.fromEntries(TOURS.map((t) => [t, tourStatus(t, off, seen, scope)])) as Record<Tour, TourStatus>;
}

/**
 * The profile's map after one tour is switched. Only `true` is stored — a tour
 * switched back on is DELETED from the map rather than written `false`, so
 * "never chose" and "chose to see it" stay the same state, which they are.
 */
export function withTourOff(
  cur: Partial<Record<string, unknown>> | null | undefined,
  tour: Tour,
  off: boolean,
): Partial<Record<Tour, true>> {
  const next: Partial<Record<Tour, true>> = {};
  for (const t of TOURS) if (cur?.[t] === true && t !== tour) next[t] = true;
  if (off) next[tour] = true;
  return next;
}

// ---- the words -----------------------------------------------------------------
// Both locales are keys of one typed object, so a step missing from Arabic is a
// compile error rather than an English sentence in an Arabic studio. Nova speaks
// in the first person throughout: she is the one showing you round.

type Step = { title: string; body: string };

const en = {
  nova: "Nova",
  guide: "Your guide",
  stepOf: (n: number, of: number) => `${n} of ${of}`,
  next: "Next",
  back: "Back",
  skip: "Skip tour",
  done: "Got it",
  dontShow: "Don't show this again",
  close: "Close the walkthrough",

  // The switches that turn a tour back on.
  settingTitle: "Walkthroughs",
  settingBlurb: "Nova shows you round each time you sign in, until you tell her not to.",
  settingAccount: "Account walkthrough",
  settingStudio: "Studio walkthrough",
  settingOn: "Shown at sign-in",
  settingOff: "Turned off",
  startNow: "Start now",

  account: {
    welcome: { title: "Hi, I'm Nova", body: "I'll show you round your account — it takes a minute. Skip whenever you like, or step through with me." },
    nav: { title: "Everything that's yours", body: "Your studios, billing, personal details, calendars and security each have a place here. Only you see these settings." },
    create: { title: "Create a studio", body: "A studio is your company's workspace, with its own address. Start one here and choose the departments it runs." },
    join: { title: "Or join one", body: "Somebody invited you? Enter the studio's code here and its owner will let you in." },
    security: { title: "Keep it yours", body: "Set a password, add a passkey or two-factor sign-in, and see every device you're signed in on." },
    prefs: { title: "Your language and look", body: "Switch between English and Arabic, light and dark — the choice follows you into every studio." },
    menu: { title: "That's the tour", body: "Your studios and signing out are behind your picture. When you're inside a studio I'll be in the corner if you need me. You can turn this walkthrough back on in Personal info." },
  } satisfies Record<string, Step>,

  studio: {
    welcome: { title: "Welcome in — I'm Nova", body: "Let me show you round this studio. Skip whenever you like, or step through with me." },
    nav: { title: "Your departments", body: "Every department you can open is listed here. Open one to see its screens — you only see what your role allows." },
    menuButton: { title: "Your departments", body: "Open the menu to see every department you can reach. You only see what your role allows." },
    marks: { title: "Approvals and settings", body: "What's waiting for your signature, and the studio's people, access and settings, live behind these marks." },
    bell: { title: "What needs you", body: "Anything assigned to you, or waiting on your answer, arrives here." },
    prefs: { title: "Read it your way", body: "Your language and theme — they're yours, and don't change anybody else's view." },
    account: { title: "You and your account", body: "Your account, the lock and signing out are here — and so is the switch to see this walkthrough again." },
    nova: { title: "And I'm always here", body: "That's the tour. If you need anything else — where something is, what's overdue, how to do something — click me and ask." },
    novaPlan: { title: "This is where I'd be", body: "That's the tour. Nova, the chat assistant, is available from the Medium to Large packages — when your studio has her, she sits right here in this corner, ready for anything you need." },
    end: { title: "That's the tour", body: "You're set. You can see this walkthrough again from your picture at the top." },
  } satisfies Record<string, Step>,
};

const ar: typeof en = {
  nova: "نوفا",
  guide: "مرشدتك",
  stepOf: (n: number, of: number) => `${n} من ${of}`,
  next: "التالي",
  back: "السابق",
  skip: "تخطي الجولة",
  done: "فهمت",
  dontShow: "لا تعرض هذا مرة أخرى",
  close: "إغلاق الجولة",

  settingTitle: "الجولات التعريفية",
  settingBlurb: "تعرّفك نوفا على المكان في كل مرة تسجّل فيها الدخول، إلى أن تطلب منها التوقف.",
  settingAccount: "جولة الحساب",
  settingStudio: "جولة الاستوديو",
  settingOn: "تُعرض عند تسجيل الدخول",
  settingOff: "متوقفة",
  startNow: "ابدأ الآن",

  account: {
    welcome: { title: "مرحبا، أنا نوفا", body: "سأعرّفك على حسابك — لن يستغرق الأمر أكثر من دقيقة. تخطَّ الجولة متى شئت، أو تابع معي خطوة بخطوة." },
    nav: { title: "كل ما يخصك", body: "لاستوديوهاتك وفواتيرك وبياناتك الشخصية وتقويماتك وأمانك مكان هنا. لا يرى هذه الإعدادات أحد سواك." },
    create: { title: "أنشئ استوديو", body: "الاستوديو هو مساحة عمل شركتك، وله عنوانه الخاص. ابدأ واحدا من هنا واختر الأقسام التي يديرها." },
    join: { title: "أو انضم إلى استوديو", body: "هل دعاك أحدهم؟ أدخل رمز الاستوديو هنا وسيسمح لك مالكه بالدخول." },
    security: { title: "احمِ حسابك", body: "عيّن كلمة مرور، وأضف مفتاح مرور أو التحقق بخطوتين، واطّلع على كل جهاز سجّلت الدخول منه." },
    prefs: { title: "لغتك ومظهرك", body: "بدّل بين العربية والإنجليزية، والفاتح والداكن — ويرافقك اختيارك إلى كل استوديو." },
    menu: { title: "انتهت الجولة", body: "استوديوهاتك وتسجيل الخروج خلف صورتك. وعندما تكون داخل استوديو ستجدني في الزاوية إن احتجت إليّ. يمكنك إعادة تشغيل هذه الجولة من المعلومات الشخصية." },
  },

  studio: {
    welcome: { title: "أهلا بك — أنا نوفا", body: "دعني أعرّفك على هذا الاستوديو. تخطَّ الجولة متى شئت، أو تابع معي خطوة بخطوة." },
    nav: { title: "أقسامك", body: "كل قسم يمكنك فتحه مدرج هنا. افتح أيّا منها لترى شاشاته — ولا ترى إلا ما يسمح به دورك." },
    menuButton: { title: "أقسامك", body: "افتح القائمة لترى كل قسم يمكنك الوصول إليه. ولا ترى إلا ما يسمح به دورك." },
    marks: { title: "الموافقات والإعدادات", body: "ما ينتظر توقيعك، وأشخاص الاستوديو وصلاحياته وإعداداته، تجدها خلف هاتين العلامتين." },
    bell: { title: "ما يحتاج إليك", body: "كل ما يُسند إليك أو ينتظر ردك يصل إلى هنا." },
    prefs: { title: "اقرأ بطريقتك", body: "لغتك ومظهرك — خاصان بك، ولا يغيّران ما يراه غيرك." },
    account: { title: "أنت وحسابك", body: "حسابك والقفل وتسجيل الخروج هنا — ومعها خيار عرض هذه الجولة مرة أخرى." },
    nova: { title: "وأنا هنا دائما", body: "انتهت الجولة. إن احتجت إلى أي شيء آخر — أين يوجد شيء ما، أو ما المتأخر، أو كيف تنجز أمرا — انقر عليّ واسأل." },
    novaPlan: { title: "هنا سأكون", body: "انتهت الجولة. نوفا، مساعدة المحادثة، متاحة في الباقات من المتوسطة إلى الكبيرة — وعندما تتوفر في الاستوديو ستجدها هنا في هذه الزاوية، جاهزة لكل ما تحتاج إليه." },
    end: { title: "انتهت الجولة", body: "أنت جاهز. يمكنك عرض هذه الجولة مرة أخرى من صورتك في الأعلى." },
  },
};

const dict = { en, ar } as const;

export type WalkthroughStrings = typeof en;

export function walkthroughDict(locale: string): WalkthroughStrings {
  return dict[locale as Locale] || dict[defaultLocale];
}

// ---- which steps a screen gets ----------------------------------------------------

export type TourStep = { key: string; target?: string; unless?: string | string[] };

/**
 * Which steps survive THIS screen: a targeted step whose control is absent is
 * dropped, and an `unless` step survives only when every step it stands in for
 * was dropped (or never listed). That is how the phone gets "open the menu" in
 * place of "here are your departments", and a studio whose launcher is somehow
 * missing ends on a plain close instead of pointing at nothing.
 */
export function resolveSteps<S extends TourStep>(steps: readonly S[], isShown: (target: string) => boolean): S[] {
  const kept = new Set<string>();
  const out: S[] = [];
  for (const s of steps) {
    const unless = ([] as string[]).concat(s.unless || []);
    if (unless.some((k) => kept.has(k))) continue;
    if (s.target && !isShown(s.target)) continue;
    kept.add(s.key);
    out.push(s);
  }
  return out;
}
