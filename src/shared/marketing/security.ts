import { defaultLocale, type Locale } from "@/shared/locale";

// THE SECURITY PAGE'S COPY.
//
// EVERY CLAIM BELOW WAS CHECKED AGAINST THE CODE BEFORE IT WAS WRITTEN, and the
// file each one rests on is named in the `source` field beside it — not for the
// reader, who never sees it, but for whoever edits this next. A security page
// is the one page where a sentence nobody verified is worse than no page: it is
// read by the people most likely to check.
//
// RE-CHECKED 23/09/2026, and three sentences had gone false while nobody was
// looking: "no third-party JavaScript at all" (Fingerprint's agent runs on the
// sign-in pages since 18/09, and the studio loads Google Maps), "geolocation
// switched off" (it is `(self)` since Tracking needed it), and "framing refused
// outright" (a studio's public form under /f/ may be embedded on purpose). Each
// is now said the way it is. When a header, a vendor or an auth path changes,
// this file is part of that change.
//
// NO COUNTS IN THE PROSE. "Ninety-seven places" sat here while the route count
// moved past two hundred; a number nobody re-measures decays silently.

type Practice = {
  title: string;
  body: string;
  /** The file this rests on. For maintainers; never rendered. */
  source: string;
};

type PracticeGroup = {
  heading: string;
  practices: Practice[];
};

type SecurityStrings = {
  title: string;
  lead: string;
  practicesHeading: string;
  groups: PracticeGroup[];
  contactHeading: string;
  contactLead: string;
};

const en: SecurityStrings = {
  title: "Security",
  lead: "What actually protects your data — in the ERP, at sign-in and on this website — described so you can check it.",
  practicesHeading: "What is in place",
  groups: [
    {
      heading: "Your data",
      practices: [
        {
          title: "One company's records are fenced at the database",
          body: "Every record belongs to exactly one studio, and the database itself enforces it: row-level security is FORCED on the tenant table, so a query that forgot to filter returns nothing rather than somebody else's data. The application cannot opt out of it, and neither can a mistake in the application.",
          source: "src/platform/db/pgSchema.sql — ENABLE + FORCE ROW LEVEL SECURITY",
        },
        {
          title: "Your clients are encrypted before they reach the database",
          body: "A client's record, and a client's name and contact details wherever they are copied — onto a quotation, a project, an invoice, a tender — are encrypted with AES-256-GCM in the application, on their way into the database. Each studio has its own data key, and each value is bound to its studio, record and field, so a value moved anywhere else refuses to open. The master key is held outside the cloud where the database lives, so a database dump, a backup or somebody at the database console reads ciphertext, not your customers.",
          source: "src/platform/db/sealCipher.ts, sections.ts, masterKeys.ts — docs/functionality/client-encryption.md",
        },
        {
          title: "The database has no door on the internet",
          body: "The database accepts connections from no network address at all. The application reaches it through a small gateway that authenticates with short-lived, federated cloud identities — there is no database password anywhere to leak, and the gateway refuses to start if one is configured. Every statement is sent with bound parameters, never pasted into SQL text.",
          source: "services/pg-gateway — config.ts, docs/functionality/pg-gateway.md",
        },
        {
          title: "Files are served only after the same check the screens use",
          body: "Uploaded files are never handed to a browser by a public storage link. The request is checked for membership first, and the bytes are then streamed by the application — so the access decision stays in code rather than being delegated to a store that cannot express who may read what.",
          source: "src/lib/media.ts — private media path",
        },
        {
          title: "Every change is recorded, from one place",
          body: "Each change records who made it, which kind of identity they were, which studio, what they did, which record, and what the system told them. It is written by the single wrapper every changing request already passes through — one place that can be got right, rather than one per screen that somebody could forget.",
          source: "src/platform/http/audit.ts",
        },
      ],
    },
    {
      heading: "Access inside the ERP",
      practices: [
        {
          title: "Membership authorises, never the address",
          body: "Knowing a studio's URL grants nothing. Access is resolved once per person, and holding no role means holding nothing — there is no fallback that quietly allows more. Nobody can grant a right they do not hold themselves, checked both where roles are assigned and where join requests are approved.",
          source: "src/platform/access/resolve.ts — effectivePermissions, escalates()",
        },
        {
          title: "Roles decide every screen, down to the action",
          body: "Rights are granted per area and per action — view, create, edit, delete, approve — so a payroll clerk can run payroll without opening the employee register, and a site engineer can run a job without seeing what it is allowed to cost. A right can be limited to a person's own records or their department.",
          source: "src/platform/access/catalogue.ts, resolve.ts — docs/functionality/roles.md",
        },
        {
          title: "Whoever prepares a record does not also approve it",
          body: "Approvals walk a chain the studio sets, by amount. The person who raised a bid, a purchase requisition or a payment release can never sign it, and nobody signs two steps of one record. The studio's owner or Admin may approve their own bill, payroll run or stock adjustment — so a one-person company can still pay itself — and that signature is recorded like any other.",
          source: "src/modules/approvals, platform/approval — docs/functionality/approvals.md",
        },
        {
          title: "API keys can never do more than their owner",
          body: "A key acts as a real person in the studio and passes the same checks a browser does. What it may do is the overlap of its own scopes and what that person may do right now — so removing somebody's role shrinks their keys in the same act. The full key is shown once and never stored; only a digest is kept, compared in constant time.",
          source: "src/platform/auth/apiKeys.ts, modules/administration/apiKeys.ts",
        },
        {
          title: "A session can be locked, and locks on every request",
          body: "Anybody can lock their session or set an idle timeout; a locked session is refused on every request, every tab and the live stream, not only the screen showing the lock. A personal PIN unlocks it, and five wrong PINs end the session outright.",
          source: "src/platform/auth/lock.ts",
        },
      ],
    },
    {
      heading: "Signing in",
      practices: [
        {
          title: "Passwords are hashed at cost 12, and re-hashed on the way in",
          body: "bcrypt at a work factor of 12. When someone signs in with a password stored at an older, weaker factor, it is re-hashed on that login — so raising the factor protects the accounts that already exist rather than only the ones created afterwards.",
          source: "src/platform/auth/passwords.ts — BCRYPT_ROUNDS = 12, needsRehash",
        },
        {
          title: "A new device must prove itself",
          body: "A password alone does not open an account on a device it has never been used from: a one-time code is emailed first. Anyone can switch on an authenticator app, so a new device then needs their phone instead — with single-use recovery codes stored only as digests. Passkeys are supported too: a key that never leaves the person's phone or security key, unlocked by the device itself.",
          source: "src/platform/auth/otp.ts, twoFactor.ts, passkeys.ts",
        },
        {
          title: "Repeated guesses are slowed, then stopped",
          body: "Failed sign-ins are counted three ways — by source, by account, and by the pair — and a source that keeps failing is locked out for progressively longer, up to a day. Three counters rather than one on purpose: a single per-account limit would hand anybody a way to lock a named person out of their own account by typing their address wrong. Automated sign-in and sign-up attempts are refused before a password is even checked.",
          source: "src/platform/auth/attempts.ts — LOCKOUT_LADDER_SEC; deviceIntel.ts",
        },
        {
          title: "A trusted device stays in its own browser",
          body: "Ticking \"trust this device\" binds the trust to that browser. Copying the cookie to another machine does not carry it: that machine is asked for a code again.",
          source: "src/platform/auth/deviceIntel.ts — docs/functionality/device-intel.md",
        },
        {
          title: "You can see, and end, every session",
          body: "Session tokens are stored only as SHA-256 digests, so anyone reading the store finds nothing that can be replayed as a session. Your Security page lists every place you are signed in — device, place, last activity — and signs any of them out; a session ended elsewhere is told why.",
          source: "src/platform/auth/users.ts — hashToken, IX.session(digest); /api/identity/sessions",
        },
        {
          title: "Our own console requires a second factor",
          body: "The administrative console nompany's staff use is behind its own authenticator-app sign-in, separate from the product's, and sees where each account is signed in so a shared login can be noticed.",
          source: "src/platform/auth/superMfa.ts, sessionPolicy.ts — sharingSignals",
        },
      ],
    },
    {
      heading: "This website",
      practices: [
        {
          title: "Browser protections are set on every response",
          body: "HTTPS is enforced with a two-year HSTS policy. No page may be framed by another site — except a studio's own public form, which is built to be embedded on that studio's website. MIME sniffing is disabled, the referrer is cut to the origin when you leave, and camera, microphone, payment and USB are switched off by policy; location may be asked for by our own pages only, and your browser still asks you every time.",
          source: "next.config.mjs — securityHeaders, the /f/ exception",
        },
        {
          title: "Third parties, named",
          body: "Three outside scripts exist and all three are named here. The public marketing pages load Google Analytics, and only after you accept it in the banner — decline and nothing is requested from Google; it never runs on the sign-in pages or inside the ERP. The sign-in and sign-up pages load Fingerprint's agent, used only to spot automated attacks and to bind trusted devices. And ERP screens that show a map load Google Maps. No chat widget, no advertising pixels. Our fonts are self-hosted. Server errors go to Sentry with headers, cookies, request bodies, IP addresses and query strings stripped before they leave.",
          source: "next.config.mjs — CSP script-src; shared/marketing/consent.ts — analytics; platform/http/sentry.ts — scrub",
        },
      ],
    },
  ],
  contactHeading: "Reporting something",
  contactLead:
    "If you believe you have found a vulnerability, write to us and say so in the subject line. You will get a human reply.",
};

// HAND-WRITTEN, NO DIACRITICS.
const ar: SecurityStrings = {
  title: "الأمان",
  lead: "ما الذي يحمي بياناتك فعلا — داخل النظام وعند تسجيل الدخول وعلى هذا الموقع — موصوفا بحيث يمكنك التحقق منه.",
  practicesHeading: "ما هو قائم",
  groups: [
    {
      heading: "بياناتك",
      practices: [
        {
          title: "سجلات كل شركة معزولة على مستوى قاعدة البيانات",
          body: "كل سجل يخص مساحة عمل واحدة، وقاعدة البيانات نفسها تفرض ذلك: أمن مستوى الصف مفروض على جدول المستأجرين، فالاستعلام الذي نسي التصفية يعيد لا شيء بدل أن يعيد بيانات غيرك. ولا يستطيع التطبيق تعطيل ذلك، ولا يستطيعه خطأ في التطبيق.",
          source: "src/platform/db/pgSchema.sql",
        },
        {
          title: "بيانات عملائك مشفرة قبل أن تصل إلى قاعدة البيانات",
          body: "سجل العميل، واسمه وبيانات التواصل معه أينما نسخت — على عرض سعر أو مشروع أو فاتورة أو مناقصة — تشفر بخوارزمية AES-256-GCM داخل التطبيق قبل دخولها قاعدة البيانات. لكل مساحة عمل مفتاح بيانات خاص بها، وكل قيمة مربوطة بمساحة العمل والسجل والحقل، فإذا نقلت إلى مكان آخر رفضت أن تفتح. والمفتاح الرئيسي محفوظ خارج السحابة التي تستضيف قاعدة البيانات، فمن يقرأ نسخة من القاعدة أو نسخة احتياطية أو يدخل لوحة إدارتها يجد نصا مشفرا لا عملاءك.",
          source: "src/platform/db/sealCipher.ts",
        },
        {
          title: "قاعدة البيانات بلا باب على الإنترنت",
          body: "قاعدة البيانات لا تقبل اتصالا من أي عنوان شبكة. يصل إليها التطبيق عبر بوابة صغيرة تتحقق بهويات سحابية موحدة قصيرة العمر — فلا توجد كلمة مرور لقاعدة البيانات يمكن أن تتسرب، والبوابة ترفض العمل إن ضبطت لها واحدة. وكل استعلام يرسل بمعاملات مربوطة، لا يلصق أبدا في نص SQL.",
          source: "services/pg-gateway",
        },
        {
          title: "الملفات لا تقدم إلا بعد الفحص نفسه الذي تمر به الشاشات",
          body: "الملفات المرفوعة لا تسلم للمتصفح عبر رابط تخزين عام. يفحص الطلب أولا للتأكد من العضوية، ثم يبث التطبيق البيانات — فيبقى قرار الوصول في الشيفرة بدل تفويضه لمخزن لا يستطيع التعبير عمن يحق له القراءة.",
          source: "src/lib/media.ts",
        },
        {
          title: "كل تغيير يسجل، من مكان واحد",
          body: "كل تعديل يسجل من قام به، وبأي هوية، وفي أي مساحة عمل، وماذا فعل، وعلى أي سجل، وبماذا أجيب. ويكتبه الغلاف الواحد الذي يمر به كل طلب تعديل أصلا — مكان واحد يمكن إتقانه بدل مكان لكل شاشة يمكن نسيانه.",
          source: "src/platform/http/audit.ts",
        },
      ],
    },
    {
      heading: "الصلاحيات داخل النظام",
      practices: [
        {
          title: "العضوية هي التي تمنح الصلاحية، لا العنوان",
          body: "معرفة رابط مساحة العمل لا يمنح شيئا. تحسب الصلاحيات مرة واحدة لكل شخص، ومن لا دور له لا يملك شيئا — ولا يوجد مسار احتياطي يسمح بالمزيد بصمت. ولا يستطيع أحد منح صلاحية لا يملكها، ويفحص ذلك عند إسناد الأدوار وعند قبول طلبات الانضمام معا.",
          source: "src/platform/access/resolve.ts",
        },
        {
          title: "الأدوار تحدد كل شاشة، حتى مستوى الإجراء",
          body: "تمنح الصلاحيات لكل مجال ولكل إجراء — عرض وإنشاء وتعديل وحذف واعتماد — فيستطيع موظف الرواتب إعداد الرواتب دون فتح سجل الموظفين، ويستطيع مهندس الموقع إدارة المشروع دون رؤية ميزانيته. ويمكن حصر الصلاحية في سجلات الشخص نفسه أو قسمه.",
          source: "src/platform/access/catalogue.ts",
        },
        {
          title: "من يعد السجل لا يعتمده",
          body: "تمر الاعتمادات بسلسلة تضبطها مساحة العمل حسب المبلغ. من أعد عطاء أو طلب شراء أو فك حجز دفعة لا يستطيع اعتماده أبدا، ولا يوقع أحد خطوتين في السجل نفسه. ويجوز لمالك مساحة العمل أو المسؤول اعتماد فاتورة مورد أو مسير رواتب أو تسوية مخزون أعدها بنفسه — حتى تستطيع شركة من شخص واحد أن تدفع لنفسها — ويسجل ذلك التوقيع كأي توقيع آخر.",
          source: "src/modules/approvals",
        },
        {
          title: "مفاتيح الواجهة البرمجية لا تتجاوز صلاحيات صاحبها",
          body: "المفتاح يعمل باسم شخص حقيقي في مساحة العمل ويمر بالفحوص نفسها التي يمر بها المتصفح. وما يستطيعه هو تقاطع نطاقه مع ما يستطيعه ذلك الشخص الآن — فسحب دور شخص يقلص مفاتيحه في اللحظة نفسها. ويعرض المفتاح كاملا مرة واحدة ولا يحفظ؛ تحفظ بصمته فقط وتقارن بزمن ثابت.",
          source: "src/platform/auth/apiKeys.ts",
        },
        {
          title: "يمكن قفل الجلسة، والقفل يسري على كل طلب",
          body: "يستطيع أي شخص قفل جلسته أو ضبط مهلة خمول؛ والجلسة المقفلة ترفض في كل طلب وكل تبويب وفي البث المباشر، لا في الشاشة التي تعرض القفل فقط. ويفتحها رمز شخصي، وخمس محاولات خاطئة تنهي الجلسة كليا.",
          source: "src/platform/auth/lock.ts",
        },
      ],
    },
    {
      heading: "تسجيل الدخول",
      practices: [
        {
          title: "كلمات المرور مشفرة بمعامل 12، ويعاد تشفيرها عند الدخول",
          body: "bcrypt بمعامل عمل 12. وحين يدخل شخص بكلمة مرور محفوظة بمعامل أقدم وأضعف، يعاد تشفيرها في تلك الجلسة — فرفع المعامل يحمي الحسابات القائمة لا المنشأة بعده فقط.",
          source: "src/platform/auth/passwords.ts",
        },
        {
          title: "الجهاز الجديد يجب أن يثبت نفسه",
          body: "كلمة المرور وحدها لا تفتح الحساب على جهاز لم يستخدم من قبل: يرسل أولا رمز لمرة واحدة إلى البريد. ويستطيع أي شخص تفعيل تطبيق المصادقة، فيحتاج الجهاز الجديد عندها إلى هاتفه بدل بريده — مع رموز استرداد لمرة واحدة تحفظ كبصمات فقط. ومفاتيح المرور مدعومة أيضا: مفتاح لا يغادر هاتف الشخص أو مفتاح الأمان، ويفتحه الجهاز نفسه.",
          source: "src/platform/auth/otp.ts, twoFactor.ts, passkeys.ts",
        },
        {
          title: "المحاولات المتكررة تبطأ ثم توقف",
          body: "تحصى المحاولات الفاشلة بثلاث طرق — بالمصدر وبالحساب وبالاثنين معا — والمصدر الذي يستمر بالفشل يمنع مددا تطول تدريجيا حتى يوم كامل. وثلاثة عدادات لا واحد عن قصد: حد واحد على مستوى الحساب يمنح أي شخص وسيلة لحبس صاحبه خارج حسابه بمجرد كتابة عنوانه خطأ. ومحاولات الدخول والتسجيل الآلية ترفض قبل فحص كلمة المرور أصلا.",
          source: "src/platform/auth/attempts.ts",
        },
        {
          title: "الجهاز الموثوق يبقى في متصفحه",
          body: "اختيار «الوثوق بهذا الجهاز» يربط الثقة بذلك المتصفح. ونسخ ملف تعريف الارتباط إلى جهاز آخر لا ينقلها: ذلك الجهاز يطلب منه الرمز من جديد.",
          source: "src/platform/auth/deviceIntel.ts",
        },
        {
          title: "ترى كل جلساتك وتنهيها",
          body: "رموز الجلسات تحفظ كبصمات SHA-256 فقط، فمن يقرأ المخزن لا يجد شيئا يمكن استخدامه كجلسة. وصفحة الأمان لديك تعرض كل مكان سجلت الدخول منه — الجهاز والمكان وآخر نشاط — وتنهي أيا منها؛ والجلسة التي أنهيت من جهاز آخر تخبر بالسبب.",
          source: "src/platform/auth/users.ts",
        },
        {
          title: "لوحة تحكمنا تتطلب عاملا ثانيا",
          body: "لوحة الإدارة التي يستخدمها فريق nompany محمية بتطبيق مصادقة خاص بها، منفصل عن تسجيل الدخول إلى المنتج، وترى أين سجل كل حساب دخوله حتى يمكن ملاحظة الحساب المشترك.",
          source: "src/platform/auth/superMfa.ts",
        },
      ],
    },
    {
      heading: "هذا الموقع",
      practices: [
        {
          title: "حمايات المتصفح مضبوطة على كل استجابة",
          body: "الاتصال عبر HTTPS مفروض بسياسة HSTS لمدة سنتين. ولا يجوز لموقع آخر تأطير أي صفحة — إلا النموذج العام لمساحة العمل، المصمم ليضمن في موقعها. واستنتاج نوع المحتوى معطل، والمرجع يختصر إلى النطاق عند مغادرتك، والكاميرا والميكروفون والدفع وUSB موقوفة بالسياسة؛ ولا يطلب موقعك الجغرافي إلا من صفحاتنا، ومتصفحك يسألك في كل مرة.",
          source: "next.config.mjs",
        },
        {
          title: "الأطراف الثالثة، بأسمائها",
          body: "توجد ثلاثة سكربتات خارجية وكلها مذكورة هنا. الصفحات التسويقية العامة تحمل Google Analytics، ولا تحمله إلا بعد موافقتك عليه في الشريط — إن رفضت فلا يطلب أي شيء من Google؛ ولا يعمل أبدا في صفحات الدخول أو داخل النظام. صفحتا الدخول والتسجيل تحملان أداة Fingerprint، وتستخدم فقط لكشف الهجمات الآلية وربط الأجهزة الموثوقة. وشاشات النظام التي تعرض خريطة تحمل خرائط Google. لا نافذة محادثة ولا وحدات بكسل إعلانية. خطوطنا مستضافة لدينا. وأخطاء الخادم ترسل إلى Sentry بعد حذف الترويسات وملفات تعريف الارتباط ومحتوى الطلب وعناوين IP ومعاملات الرابط.",
          source: "next.config.mjs, platform/http/sentry.ts",
        },
      ],
    },
  ],
  contactHeading: "الإبلاغ عن ثغرة",
  contactLead:
    "إن كنت تعتقد أنك وجدت ثغرة، راسلنا واذكر ذلك في عنوان الرسالة. سيصلك رد من شخص.",
};

const security = { en, ar };

export function securityCopy(locale: string): SecurityStrings {
  return security[locale as Locale] || security[defaultLocale];
}

export type { SecurityStrings };
