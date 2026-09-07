import { defaultLocale, type Locale } from "@/shared/locale";

// THE SECURITY PAGE'S COPY.
//
// EVERY CLAIM BELOW WAS CHECKED AGAINST THE CODE BEFORE IT WAS WRITTEN, and the
// file each one rests on is named in the `source` field beside it — not for the
// reader, who never sees it, but for whoever edits this next. A security page
// is the one page where a sentence nobody verified is worse than no page: it is
// read by the people most likely to check.
//
// WHAT IS NOT CLAIMED MATTERS AS MUCH AS WHAT IS. There is no ISO certification,
// no SOC 2 report, no NCA assessment, no published penetration test and no
// stated data residency, and the page says all five plainly. A buyer asks those
// questions early; being told "no, and here is what we do have" is worth more
// than silence, and far more than a page that implies an audit by omission.
// This is also the page that answers where the company is — it is not
// incorporated anywhere yet — rather than leaving a schema field to imply it.

type Practice = {
  title: string;
  body: string;
  /** The file this rests on. For maintainers; never rendered. */
  source: string;
};

type SecurityStrings = {
  title: string;
  lead: string;
  practicesHeading: string;
  practices: Practice[];
  notClaimedHeading: string;
  notClaimedLead: string;
  notClaimed: string[];
  contactHeading: string;
  contactLead: string;
};

const en: SecurityStrings = {
  title: "Security",
  lead: "What actually protects your data, described so you can check it — and an equally plain list of the assurances we do not have.",
  practicesHeading: "What is in place",
  practices: [
    {
      title: "One tenant's rows are fenced at the database",
      body: "Every record belongs to exactly one studio, and the database itself enforces it: row-level security is FORCED on the tenant table, so a query that forgot to filter returns nothing rather than somebody else's data. The application cannot opt out of it, and neither can a mistake in the application.",
      source: "src/platform/db/pgSchema.sql — ENABLE + FORCE ROW LEVEL SECURITY",
    },
    {
      title: "Membership authorises, never the address",
      body: "Knowing a studio's URL grants nothing. Access is resolved once per person, and holding no role means holding nothing — there is no fallback that quietly allows more. Nobody can grant a right they do not hold themselves, checked both where roles are assigned and where join requests are approved.",
      source: "src/platform/access/resolve.ts — effectivePermissions, escalates()",
    },
    {
      title: "Passwords are hashed at cost 12, and re-hashed on the way in",
      body: "bcrypt at a work factor of 12. When someone signs in with a password stored at an older, weaker factor, it is re-hashed on that login — so raising the factor protects the accounts that already exist rather than only the ones created afterwards.",
      source: "src/platform/auth/passwords.ts — BCRYPT_ROUNDS = 12, needsRehash",
    },
    {
      title: "Session tokens are stored as digests",
      body: "What is kept is a SHA-256 digest of the session token, not the token. Anyone reading the store finds values that cannot be replayed as a session, and a single session can be signed out by its digest without touching the others.",
      source: "src/platform/auth/superAuth.ts — ix:supersession:<sha256(token)>",
    },
    {
      title: "Repeated credential guesses are slowed, then stopped",
      body: "Failed sign-ins are counted three ways — by source, by account, and by the pair — and a source that keeps failing is locked out for progressively longer. Three counters rather than one on purpose: a single per-account limit would hand anybody a way to lock a named person out of their own account by typing their address wrong.",
      source: "src/platform/auth/attempts.ts — LOCKOUT_LADDER_SEC",
    },
    {
      title: "The console requires a second factor",
      body: "The administrative console that can reach across studios is behind multi-factor authentication, separately from the product's own sign-in.",
      source: "src/platform/auth/superMfa.ts",
    },
    {
      title: "Every change is recorded, from one place",
      body: "Each mutation records who made it, which kind of identity they were, which studio, what they did, which record, and what the system told them. It is written by the single wrapper every mutating request already passes through — so it is one place that can be got right rather than ninety-seven places somebody could forget.",
      source: "src/platform/http/audit.ts",
    },
    {
      title: "Files are served only after the same check the screens use",
      body: "Uploaded files are never handed to a browser by a public storage link. The request is checked for membership first, and the bytes are then streamed by the application — so the access decision stays in code rather than being delegated to a store that cannot express who may read what.",
      source: "src/lib/media.ts — private media path",
    },
    {
      title: "Browser-level protections are set at the edge",
      body: "HSTS with a two-year max-age, framing refused outright, MIME sniffing disabled, and geolocation, camera, microphone, payment and USB switched off by policy. The site loads no third-party JavaScript at all — no tag manager, no chat widget, no analytics script — so there is no third party to trust with your visitors.",
      source: "next.config — headers()",
    },
  ],
  notClaimedHeading: "What we do not claim",
  notClaimedLead:
    "Stated plainly, because these are the first questions a serious buyer asks and the honest answer is more useful than an implication.",
  notClaimed: [
    "No ISO 27001 certification.",
    "No SOC 2 report, of either type.",
    "No NCA or other national-authority assessment.",
    "No published penetration test.",
    "No guaranteed data residency in a particular country, and no uptime figure — nothing measures one, so none is quoted.",
    "No incorporated legal entity or registered office yet.",
  ],
  contactHeading: "Reporting something",
  contactLead:
    "If you believe you have found a vulnerability, write to us and say so in the subject line. You will get a human reply.",
};

// HAND-WRITTEN, NO DIACRITICS.
const ar: SecurityStrings = {
  title: "الامان",
  lead: "ما الذي يحمي بياناتك فعلا، موصوفا بحيث يمكنك التحقق منه — وقائمة صريحة بالمثل بما لا نملكه من شهادات.",
  practicesHeading: "ما هو قائم",
  practices: [
    {
      title: "سجلات كل مستأجر مسيّجة على مستوى قاعدة البيانات",
      body: "كل سجل يخص مساحة عمل واحدة، وقاعدة البيانات نفسها تفرض ذلك: امن مستوى الصف مفروض على جدول المستأجرين، فالاستعلام الذي نسي التصفية يعيد لا شيء بدل ان يعيد بيانات غيرك. ولا يستطيع التطبيق تعطيل ذلك، ولا يستطيعه خطأ في التطبيق.",
      source: "src/platform/db/pgSchema.sql",
    },
    {
      title: "العضوية هي التي تمنح الصلاحية، لا العنوان",
      body: "معرفة رابط مساحة العمل لا يمنح شيئا. تحسب الصلاحيات مرة واحدة لكل شخص، ومن لا دور له لا يملك شيئا — ولا يوجد مسار احتياطي يسمح بالمزيد بصمت. ولا يستطيع احد منح صلاحية لا يملكها، ويفحص ذلك عند اسناد الادوار وعند قبول طلبات الانضمام معا.",
      source: "src/platform/access/resolve.ts",
    },
    {
      title: "كلمات المرور مشفرة بمعامل 12، ويعاد تشفيرها عند الدخول",
      body: "bcrypt بمعامل عمل 12. وحين يدخل شخص بكلمة مرور محفوظة بمعامل اقدم واضعف، يعاد تشفيرها في تلك الجلسة — فرفع المعامل يحمي الحسابات القائمة لا المنشأة بعده فقط.",
      source: "src/platform/auth/passwords.ts",
    },
    {
      title: "رموز الجلسات تحفظ كبصمات",
      body: "ما يحفظ هو بصمة SHA-256 للرمز لا الرمز نفسه. فمن يقرأ المخزن يجد قيما لا يمكن استخدامها كجلسة، ويمكن انهاء جلسة واحدة ببصمتها دون المساس بالباقي.",
      source: "src/platform/auth/superAuth.ts",
    },
    {
      title: "محاولات كلمة المرور المتكررة تبطأ ثم توقف",
      body: "تحصى المحاولات الفاشلة بثلاث طرق — بالمصدر وبالحساب وبالاثنين معا — والمصدر الذي يستمر بالفشل يمنع مددا تطول تدريجيا. وثلاثة عدادات لا واحد عن قصد: حد واحد على مستوى الحساب يمنح اي شخص وسيلة لحبس صاحبه خارج حسابه بمجرد كتابة عنوانه خطأ.",
      source: "src/platform/auth/attempts.ts",
    },
    {
      title: "لوحة التحكم تتطلب عاملا ثانيا",
      body: "لوحة الادارة التي تصل عبر مساحات العمل محمية بالتحقق متعدد العوامل، بشكل منفصل عن تسجيل الدخول الى المنتج.",
      source: "src/platform/auth/superMfa.ts",
    },
    {
      title: "كل تغيير يسجل، من مكان واحد",
      body: "كل تعديل يسجل من قام به، وبأي هوية، وفي اي مساحة عمل، وماذا فعل، وعلى اي سجل، وبماذا اجيب. ويكتبه الغلاف الواحد الذي يمر به كل طلب تعديل اصلا — فهو مكان واحد يمكن اتقانه بدل سبعة وتسعين مكانا يمكن نسيانها.",
      source: "src/platform/http/audit.ts",
    },
    {
      title: "الملفات لا تقدم الا بعد الفحص نفسه الذي تمر به الشاشات",
      body: "الملفات المرفوعة لا تسلم للمتصفح عبر رابط تخزين عام. يفحص الطلب اولا للتأكد من العضوية، ثم يبث التطبيق البيانات — فيبقى قرار الوصول في الشيفرة بدل تفويضه لمخزن لا يستطيع التعبير عمن يحق له القراءة.",
      source: "src/lib/media.ts",
    },
    {
      title: "حمايات المتصفح مضبوطة عند الحافة",
      body: "HSTS لمدة سنتين، ومنع التأطير تماما، وتعطيل استنتاج نوع المحتوى، وايقاف الموقع والكاميرا والميكروفون والدفع وUSB بالسياسة. ولا يحمّل الموقع اي جافاسكربت من طرف ثالث — لا مدير وسوم ولا نافذة محادثة ولا سكربت تحليلات — فلا يوجد طرف ثالث نأتمنه على زوارك.",
      source: "next.config",
    },
  ],
  notClaimedHeading: "ما لا ندعيه",
  notClaimedLead:
    "مذكور صراحة، لان هذه اول ما يسأل عنه المشتري الجاد، والجواب الصادق انفع من التلميح.",
  notClaimed: [
    "لا شهادة ISO 27001.",
    "لا تقرير SOC 2 بأي من نوعيه.",
    "لا تقييم من هيئة وطنية للأمن السيبراني او غيرها.",
    "لا اختبار اختراق منشور.",
    "لا ضمان لمكان تخزين البيانات في بلد بعينه، ولا نسبة جاهزية — لا شيء يقيسها، فلا نذكر رقما.",
    "لا كيان قانوني مسجل ولا مقر رسمي حتى الان.",
  ],
  contactHeading: "الابلاغ عن ثغرة",
  contactLead:
    "ان كنت تعتقد انك وجدت ثغرة، راسلنا واذكر ذلك في عنوان الرسالة. سيصلك رد من شخص.",
};

const security = { en, ar };

export function securityCopy(locale: string): SecurityStrings {
  return security[locale as Locale] || security[defaultLocale];
}

export type { SecurityStrings };
