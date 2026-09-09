import { defaultLocale, type Locale } from "./locale";

// THE ACCOUNT PAGES — sign in, sign up, the OTP step, password recovery, and the account itself.
//
// Generated from the surface's own copy and then translated by hand. It does
// NOT spread the studio's `common` dictionary: that vocabulary belongs to a
// record system, and neither the marketing site nor the account pages share it.

type Strings = {
  account: string;
  accountNoLongerExists: string;
  accountSuspended: string;
  accountSuspendedOwner: string;
  address: string;
  address364Characters: string;
  addressAlreadyTaken: string;
  alreadyHaveCode: string;
  freeStudioLimit: (n: number) => string;
  askStudioAccessUsing: string;
  asksCode: string;
  calendarAllDay: (date: string) => string;
  calendarCancelled: string;
  calendarConnectFailed: string;
  calendarConnected: string;
  calendarConnectedSince: (date: string) => string;
  calendarNoEmailOnFile: string;
  calendarUnreachable: (providerName: string) => string;
  copied: string;
  calendars: string;
  calendarsBlurb: string;
  cancel: string;
  capitalsFineStoreMatch: string;
  change: string;
  changePassword: string;
  changingSignsOutEverywhere: string;
  checking: string;
  chooseImageFile: string;
  close: string;
  codeExpiredRequestNew: string;
  codeExpiredSendNew: string;
  codeIsnRightAddress: string;
  codeIsnRightCheck: string;
  codeOnWayExpires: string;
  codeRegeneratedButEmail: string;
  codeReservedPickAnother: string;
  codeTakenPickAnother: string;
  collaborations: string;
  companyCode: string;
  companyName: string;
  companyName2: string;
  confirmEmail: string;
  confirmEmailAddressFirst: string;
  confirmDisconnectCalendar: (providerName: string) => string;
  confirmNewPassword: string;
  confirmPassword: string;
  connectGoogleCalendar: string;
  connectMicrosoftCalendar: string;
  continueWith: string;
  couldnCreateAccountTry: string;
  couldnCreateStudio: string;
  couldnReachServerCheck: string;
  couldnRemovePicture: string;
  couldnResetPassword: string;
  couldnSendCodeEmail: string;
  couldnSendNewCode: string;
  couldnSendRequest: string;
  couldnUpdatePasswordPlease: string;
  couldnUploadPicture: string;
  couldnVerifyCode: string;
  createPasswordCanSign: string;
  createStudio: string;
  createStudioBtn: string;
  creating: string;
  currentPassword: string;
  currentPasswordIncorrect: string;
  didnSave: string;
  disconnectCalendar: string;
  disconnecting: string;
  documentation: string;
  done: string;
  dontOwnStudio: string;
  email: string;
  emailAddressDoesnLook: string;
  emailAlreadyAccount: string;
  emailVerified: string;
  enterCode: string;
  enterCurrentPasswordThen: string;
  enterEmailSendCode: string;
  giveStudioName: string;
  goSign: string;
  google: string;
  help: string;
  hidePassword: string;
  ifAddress: string;
  imagesMust2Mb: string;
  joinStudio: string;
  jpgPngWebpUp: string;
  keyRemoved: string;
  keySaved: string;
  keySetNovaUses: string;
  loadingAccount: string;
  loadingEvents: string;
  locationUnknown: string;
  microsoft: string;
  myCollaborations: string;
  myStudios: string;
  nAttemptsLeft: (n: number) => string;
  name: string;
  newCodeOnWay: string;
  newPassword: string;
  newPasswordDoesnMeet: string;
  noCalendarProvidersAvailable: string;
  noPictureRemove: string;
  noStudioUsesCode: string;
  noTrustedDevices: string;
  nompanyCom: string;
  notCollaborating: string;
  noUpcomingEvents: string;
  nothingChange: string;
  novaAiKey: string;
  novaNotSet: string;
  onlyOwnerCanRename: string;
  openEvent: string;
  openStudio: string;
  overview: string;
  ownStudio: string;
  passwordDoesnMeetRequirements: string;
  passwordUpdated: string;
  pasteNewKeyReplace: string;
  personalInfo: string;
  phone: string;
  phoneInvalid: string;
  pictureHelpsPeopleRecognise: string;
  pictureHelpsPeopleRecognise2: string;
  pleaseWaitBeforeRequesting: string;
  profileInfoHowReach: string;
  profilePicture: string;
  profileUpdated: string;
  reAlreadyStudio: string;
  rememberedIt: string;
  remove: string;
  removeAllDevices: string;
  removing: string;
  renamed: string;
  renamedOldLinkNo: string;
  requestAccess: string;
  requiresVerification: string;
  resetPassword: string;
  save: string;
  saving: string;
  searchCountry: string;
  security: string;
  sendCode: string;
  sendCodeAgain: string;
  sendNewCode: string;
  sending: string;
  setNewPassword: string;
  setPassword: string;
  setPasswordBtn: string;
  settingsYoursAlone: string;
  shortName: string;
  showPassword: string;
  showingFourMostOpened: string;
  sign: string;
  signAttemptExpiredStart: string;
  signOut: string;
  signUp: string;
  signedOutEverywhereSafety: string;
  somethingWentWrongTry: string;
  studioAddressCompanyCode: string;
  studioCompanyWorkspaceOwn: string;
  studioLink: string;
  studioName: string;
  studioWorkspaceOwnAddress: string;
  studios: string;
  studiosOthersGave: string;
  studiosOthersGaveShort: string;
  terms: string;
  privacy: string;
  thatAddress: string;
  tooManyAttemptsRequest: string;
  tooManyAttemptsSendNew: string;
  tooManyAttemptsTry: string;
  tooManyAttemptsWait: string;
  tooManyAttemptsInMinute: string;
  tooManyAttemptsInMinutes: string;
  total: string;
  trustDevice30: string;
  trusted: string;
  trustedDevices: string;
  twoPasswordsMatch: string;
  upcomingEvents: string;
  updating: string;
  uploading: string;
  use3LettersNumbers: string;
  use3LettersNumbers2: string;
  useDifferentAccount: string;
  veAlreadyAskedJoin: string;
  verify: string;
  viewAll: string;
  workspacesYouOwn: string;
  yesDisconnect: string;
};

const en: Strings = {
  account: "Account",
  accountNoLongerExists: "This account no longer exists.",
  accountSuspended: "This account is suspended.",
  accountSuspendedOwner: "This account is suspended. Contact your studio's owner.",
  address: "Address",
  address364Characters: "An address is 3–64 characters: lowercase letters, numbers and hyphens.",
  addressAlreadyTaken: "That address is already taken.",
  alreadyHaveCode: "I already have a code",
  // The cap is on FREE studios, not on studios, so the message says so — "you
  // already own the most we allow" would be false the moment they upgrade one,
  // and would read as a wall where there is a door. `n` comes from the refusal
  // rather than being written in, so the number cannot drift from the server's.
  freeStudioLimit: (n: number) => `You can own ${n} free studio${n === 1 ? "" : "s"}. Upgrade one of yours to create another.`,
  askStudioAccessUsing: "Ask a studio for access using its company code. Someone there approves the request.",
  asksCode: "Asks for a code",
  calendarAllDay: (date: string) => `All day · ${date}`,
  calendarCancelled: "Connecting your calendar was cancelled.",
  calendarConnectFailed: "We couldn't connect your calendar. Try again.",
  calendarConnected: "Your calendar is connected.",
  calendarConnectedSince: (date: string) => `Connected ${date}`,
  calendarNoEmailOnFile: "No account email on file",
  // A CONNECT BUTTON APPEARS AS SOON AS SIGN-IN IS CONFIGURED, because the same
  // client id and secret drive both. Registering the calendar callback is a
  // SEPARATE step, and skipping it fails at the provider with
  // "redirect_uri_mismatch" — a message with nothing in the product to explain
  // it, let alone the exact string to fix it with. The /super calendar screen
  // says the same thing about its own path. Providers compare byte for byte —
  // no trailing slash, and which host served the request (www or not) both
  // matter — which is why the address shown next to this is the one the
  // server actually computed, not typed out here.
  calendarUnreachable: (providerName: string) => `We couldn't reach your ${providerName} calendar:`,
  copied: "Copied",
  calendars: "Calendars",
  calendarsBlurb: "Connect your Google or Microsoft calendar to see your own events here. Nothing about it is shared with any studio.",
  cancel: "Cancel",
  capitalsFineStoreMatch: "Capitals are fine — we store and match your address in lowercase.",
  change: "Change",
  changePassword: "Change password",
  changingSignsOutEverywhere: "Changing it signs you out everywhere and forgets every trusted device.",
  checking: "Checking…",
  chooseImageFile: "Choose an image file.",
  close: "Close",
  codeExpiredRequestNew: "That code has expired — request a new one.",
  codeExpiredSendNew: "That code has expired. Send a new one.",
  codeIsnRightAddress: "That code isn't right for this address.",
  codeIsnRightCheck: "That code isn't right. Check it and try again.",
  codeOnWayExpires: "has an account, a code is on its way. It expires in 1 hour.",
  codeRegeneratedButEmail: "Code regenerated, but the email couldn't be sent.",
  codeReservedPickAnother: "That code is reserved — pick another.",
  codeTakenPickAnother: "That code is taken — pick another.",
  collaborations: "Your collaborations",
  companyCode: "Company code",
  companyName: "Your company's name",
  companyName2: "Company name",
  confirmEmail: "Confirm email",
  confirmEmailAddressFirst: "Confirm your email address first.",
  confirmDisconnectCalendar: (providerName: string) => `Disconnect ${providerName}? This revokes nompany's access to your calendar.`,
  confirmNewPassword: "Confirm new password",
  confirmPassword: "Confirm password",
  connectGoogleCalendar: "Connect Google Calendar",
  connectMicrosoftCalendar: "Connect Microsoft Calendar",
  continueWith: "Continue",
  couldnCreateAccountTry: "We couldn't create your account. Try again.",
  couldnCreateStudio: "We couldn't create your studio.",
  couldnReachServerCheck: "Couldn't reach the server. Check your connection and try again.",
  couldnRemovePicture: "We couldn't remove that picture.",
  couldnResetPassword: "We couldn't reset your password.",
  couldnSendCodeEmail: "We couldn't send the code by email — contact support if it doesn't arrive.",
  couldnSendNewCode: "We couldn't send a new code.",
  couldnSendRequest: "We couldn't send that request.",
  couldnUpdatePasswordPlease: "We couldn't update your password. Please try again.",
  couldnUploadPicture: "We couldn't upload that picture.",
  couldnVerifyCode: "We couldn't verify that code.",
  createPasswordCanSign: "Create a password so you can sign in with your email as well.",
  createStudio: "Create a studio",
  createStudioBtn: "Create studio",
  creating: "Creating…",
  currentPassword: "Current password",
  currentPasswordIncorrect: "The current password is incorrect.",
  didnSave: "That didn't save.",
  disconnectCalendar: "Disconnect",
  disconnecting: "Disconnecting…",
  documentation: "Documentation",
  done: "Done",
  dontOwnStudio: "You don't own a studio yet.",
  email: "Email",
  emailAddressDoesnLook: "That email address doesn't look right.",
  emailAlreadyAccount: "That email already has an account.",
  emailVerified: "Email verified",
  enterCode: "Enter your code",
  enterCurrentPasswordThen: "Enter your current password, then a new one. This signs you out on every device.",
  enterEmailSendCode: "Enter your email and we'll send you a 6-digit code.",
  giveStudioName: "Give your studio a name.",
  goSign: "Go to sign in",
  google: "Google",
  help: "Help",
  hidePassword: "Hide password",
  ifAddress: "If",
  imagesMust2Mb: "Images must be 2 MB or smaller.",
  joinStudio: "Join a studio",
  jpgPngWebpUp: "JPG, PNG or WebP, up to 2 MB.",
  keyRemoved: "Key removed.",
  keySaved: "Key saved.",
  keySetNovaUses: "A key is set. Nova uses it to answer inside your studios.",
  loadingAccount: "Loading your account…",
  loadingEvents: "Loading your events…",
  locationUnknown: "Location unknown",
  microsoft: "Microsoft",
  myCollaborations: "My Collaborations",
  myStudios: "My Studios",
  nAttemptsLeft: (n: number) => `${n} attempt${n === 1 ? "" : "s"} left.`,
  name: "Name",
  newCodeOnWay: "A new code is on its way.",
  newPassword: "New password",
  newPasswordDoesnMeet: "Your new password doesn't meet the requirements yet.",
  noCalendarProvidersAvailable: "No calendar providers are available yet.",
  noPictureRemove: "No picture to remove",
  noStudioUsesCode: "No studio uses that code.",
  noTrustedDevices: "No trusted devices.",
  nompanyCom: "nompany.com/",
  notCollaborating: "You're not collaborating in any studio yet.",
  noUpcomingEvents: "No upcoming events.",
  nothingChange: "Nothing to change.",
  novaAiKey: "Nova / AI key",
  novaNotSet: "Not set — Nova needs your own AI key to work.",
  onlyOwnerCanRename: "Only the owner can rename a studio.",
  openEvent: "Open",
  openStudio: "Open studio",
  overview: "Overview",
  ownStudio: "That's your own studio.",
  passwordDoesnMeetRequirements: "Your password doesn't meet the requirements yet.",
  passwordUpdated: "Password updated",
  pasteNewKeyReplace: "Paste a new key to replace it",
  personalInfo: "Personal info",
  phone: "Phone",
  phoneInvalid: "Please enter a valid phone number",
  pictureHelpsPeopleRecognise: "A picture helps people recognise you and shows when you're signed in.",
  pictureHelpsPeopleRecognise2: "A picture helps people recognise you",
  pleaseWaitBeforeRequesting: "Please wait before requesting another code.",
  profileInfoHowReach: "Your profile information and how to reach you. Only you can see this.",
  profilePicture: "Profile picture",
  profileUpdated: "Profile updated.",
  reAlreadyStudio: "You're already in that studio.",
  rememberedIt: "Remembered it?",
  remove: "Remove",
  removeAllDevices: "Remove all devices",
  removing: "Removing…",
  renamed: "Renamed.",
  renamedOldLinkNo: "Renamed. The old link no longer works — share the new one.",
  requestAccess: "Request access",
  requiresVerification: "Requires verification",
  resetPassword: "Reset your password",
  save: "Save",
  saving: "Saving…",
  searchCountry: "Search for country",
  security: "Security",
  sendCode: "Send code",
  sendCodeAgain: "Send the code again",
  sendNewCode: "Send a new code",
  sending: "Sending…",
  setNewPassword: "Set new password",
  setPassword: "Set a password",
  setPasswordBtn: "Set password",
  settingsYoursAlone: "These settings are yours alone. Studios you join keep their own profile for you and never see what's here.",
  shortName: "Short name",
  showPassword: "Show password",
  showingFourMostOpened: "Showing the four you open most.",
  sign: "Sign in",
  signAttemptExpiredStart: "This sign-in attempt expired. Start again.",
  signOut: "Sign out",
  signUp: "Sign up",
  signedOutEverywhereSafety: "You've been signed out everywhere for safety. Sign in with your new password.",
  somethingWentWrongTry: "Something went wrong. Try again.",
  studioAddressCompanyCode: "Studio address (company code)",
  studioCompanyWorkspaceOwn: "A studio is your company's workspace, at its own address on nompany.com.",
  studioLink: "Studio link",
  studioName: "Studio name",
  studioWorkspaceOwnAddress: "A studio is your company's workspace, at its own address.",
  studios: "Your studios",
  studiosOthersGave: "Studios other people have given you access to. Your own studio is under My Studios.",
  studiosOthersGaveShort: "Studios other people have given you access to.",
  terms: "Terms",
  privacy: "Privacy",
  thatAddress: "that address",
  tooManyAttemptsRequest: "Too many attempts. Request a new code.",
  tooManyAttemptsSendNew: "Too many attempts. Send a new code to continue.",
  tooManyAttemptsTry: "Too many attempts. Try again later.",
  tooManyAttemptsWait: "Too many attempts. Give it a few minutes, then try again.",
  tooManyAttemptsInMinute: "Too many attempts. Try again in about a minute.",
  tooManyAttemptsInMinutes: "Too many attempts. Try again in about {n} minutes.",
  total: "total",
  trustDevice30: "Trust this device for 30 days",
  trusted: "Trusted",
  trustedDevices: "Trusted devices",
  twoPasswordsMatch: "The two passwords don't match.",
  upcomingEvents: "Upcoming events",
  updating: "Updating…",
  uploading: "Uploading…",
  use3LettersNumbers: "Use 3+ letters, numbers or dashes.",
  use3LettersNumbers2: "Use 3+ letters, numbers or dashes",
  useDifferentAccount: "Use a different account",
  veAlreadyAskedJoin: "You've already asked to join — waiting on their approval.",
  verify: "Verify",
  viewAll: "View all",
  workspacesYouOwn: "Workspaces you own. Renaming one, or changing its link, takes effect at 12:00 am.",
  yesDisconnect: "Yes, disconnect",
};

const ar: Strings = {
  account: "الحساب",
  accountNoLongerExists: "لم يعد هذا الحساب موجودا.",
  accountSuspended: "هذا الحساب موقوف.",
  accountSuspendedOwner: "هذا الحساب موقوف. تواصل مع مالك استوديوك.",
  address: "العنوان",
  address364Characters: "العنوان من 3 إلى 64 حرفا: حروف إنجليزية صغيرة وأرقام وشرطات.",
  addressAlreadyTaken: "هذا العنوان محجوز.",
  alreadyHaveCode: "لدي رمز بالفعل",
  freeStudioLimit: (n: number) => `يمكنك امتلاك ${n === 1 ? "استوديو مجاني واحد" : n === 2 ? "استوديوهين مجانيين" : n <= 10 ? `${n} استوديوهات مجانية` : `${n} استوديو مجاني`}. رق أحدها لإنشاء استوديو آخر.`,
  askStudioAccessUsing: "اطلب الوصول إلى استوديو برمز الشركة. وسيوافق أحدهم هناك على الطلب.",
  asksCode: "يطلب رمزا",
  calendarAllDay: (date: string) => `طوال اليوم · ${date}`,
  calendarCancelled: "ألغي ربط تقويمك.",
  calendarConnectFailed: "تعذر ربط تقويمك. حاول مرة أخرى.",
  calendarConnected: "تقويمك مرتبط الآن.",
  calendarConnectedSince: (date: string) => `مرتبط منذ ${date}`,
  calendarNoEmailOnFile: "لا يوجد بريد إلكتروني مسجل للحساب",
  calendarUnreachable: (providerName: string) => `تعذر الوصول إلى تقويم ${providerName}:`,
  copied: "تم النسخ",
  calendars: "التقويمات",
  calendarsBlurb: "اربط تقويم Google أو Microsoft لترى أحداثك هنا. لا يشارك شيء منه مع أي استوديو.",
  cancel: "إلغاء",
  capitalsFineStoreMatch: "الأحرف الكبيرة مقبولة — نخزن العنوان ونطابقه بأحرف صغيرة.",
  change: "تغيير",
  changePassword: "تغيير كلمة المرور",
  changingSignsOutEverywhere: "تغييرها يسجل خروجك من كل مكان وينسى كل جهاز موثوق.",
  checking: "جار التحقق…",
  chooseImageFile: "اختر ملف صورة.",
  close: "إغلاق",
  codeExpiredRequestNew: "انتهت صلاحية هذا الرمز — اطلب رمزا جديدا.",
  codeExpiredSendNew: "انتهت صلاحية هذا الرمز. أرسل رمزا جديدا.",
  codeIsnRightAddress: "هذا الرمز غير صحيح لهذا العنوان.",
  codeIsnRightCheck: "هذا الرمز غير صحيح. تحقق منه وحاول مجددا.",
  codeOnWayExpires: "له حساب، فالرمز في الطريق. وتنتهي صلاحيته بعد ساعة.",
  codeRegeneratedButEmail: "أعيد توليد الرمز، لكن تعذر إرسال البريد.",
  codeReservedPickAnother: "هذا الرمز محجوز — اختر غيره.",
  codeTakenPickAnother: "هذا الرمز مستخدم — اختر غيره.",
  collaborations: "تعاوناتك",
  companyCode: "رمز الشركة",
  companyName: "اسم شركتك",
  companyName2: "اسم الشركة",
  confirmEmail: "تأكيد البريد",
  confirmEmailAddressFirst: "أكد بريدك الإلكتروني أولا.",
  confirmDisconnectCalendar: (providerName: string) => `فصل ${providerName}؟ هذا يلغي وصول nompany إلى تقويمك.`,
  confirmNewPassword: "تأكيد كلمة المرور الجديدة",
  confirmPassword: "تأكيد كلمة المرور",
  connectGoogleCalendar: "اربط تقويم Google",
  connectMicrosoftCalendar: "اربط تقويم Microsoft",
  continueWith: "المتابعة",
  couldnCreateAccountTry: "تعذر إنشاء حسابك. حاول مرة أخرى.",
  couldnCreateStudio: "تعذر إنشاء استوديوك.",
  couldnReachServerCheck: "تعذر الوصول إلى الخادم. تحقق من اتصالك وحاول مجددا.",
  couldnRemovePicture: "تعذر حذف تلك الصورة.",
  couldnResetPassword: "تعذرت إعادة تعيين كلمة المرور.",
  couldnSendCodeEmail: "تعذر إرسال الرمز بالبريد — تواصل مع الدعم إن لم يصلك.",
  couldnSendNewCode: "تعذر إرسال رمز جديد.",
  couldnSendRequest: "تعذر إرسال ذلك الطلب.",
  couldnUpdatePasswordPlease: "تعذر تحديث كلمة المرور. حاول مرة أخرى.",
  couldnUploadPicture: "تعذر رفع تلك الصورة.",
  couldnVerifyCode: "تعذر التحقق من هذا الرمز.",
  createPasswordCanSign: "أنشئ كلمة مرور لتتمكن من الدخول ببريدك أيضا.",
  createStudio: "أنشئ استوديو",
  createStudioBtn: "أنشئ الاستوديو",
  creating: "جار الإنشاء…",
  currentPassword: "كلمة المرور الحالية",
  currentPasswordIncorrect: "كلمة المرور الحالية غير صحيحة.",
  didnSave: "لم يحفظ ذلك.",
  disconnectCalendar: "فصل",
  disconnecting: "جار الفصل…",
  documentation: "التوثيق",
  done: "تم",
  dontOwnStudio: "لا تملك استوديو بعد.",
  email: "البريد الإلكتروني",
  emailAddressDoesnLook: "هذا البريد الإلكتروني لا يبدو صحيحا.",
  emailAlreadyAccount: "لهذا البريد حساب بالفعل.",
  emailVerified: "بريد متحقق منه",
  enterCode: "أدخل رمزك",
  enterCurrentPasswordThen: "أدخل كلمة المرور الحالية، ثم واحدة جديدة. هذا يسجل خروجك من كل جهاز.",
  enterEmailSendCode: "أدخل بريدك وسنرسل إليك رمزا من ستة أرقام.",
  giveStudioName: "سم استوديوك.",
  goSign: "الذهاب إلى تسجيل الدخول",
  google: "Google",
  help: "المساعدة",
  hidePassword: "إخفاء كلمة المرور",
  ifAddress: "إن كان",
  imagesMust2Mb: "يجب ألا تتجاوز الصور 2 ميغابايت.",
  joinStudio: "انضم إلى استوديو",
  jpgPngWebpUp: "‏JPG أو PNG أو WebP، حتى 2 ميغابايت.",
  keyRemoved: "حذف المفتاح.",
  keySaved: "حفظ المفتاح.",
  keySetNovaUses: "المفتاح مضبوط. تستخدمه نوفا للإجابة داخل استوديوهاتك.",
  loadingAccount: "جار تحميل حسابك…",
  loadingEvents: "جار تحميل أحداثك…",
  locationUnknown: "موقع غير معروف",
  microsoft: "Microsoft",
  myCollaborations: "تعاوناتي",
  myStudios: "استوديوهاتي",
  nAttemptsLeft: (n: number) => `${n === 1 ? "محاولة واحدة متبقية" : n === 2 ? "محاولتان متبقيتان" : n <= 10 ? `${n} محاولات متبقية` : `${n} محاولة متبقية`}.`,
  name: "الاسم",
  newCodeOnWay: "رمز جديد في الطريق.",
  newPassword: "كلمة المرور الجديدة",
  newPasswordDoesnMeet: "كلمة المرور الجديدة لا تستوفي المتطلبات بعد.",
  noCalendarProvidersAvailable: "لا تتوفر مزودات تقويم بعد.",
  noPictureRemove: "لا توجد صورة لحذفها",
  noStudioUsesCode: "لا يوجد استوديو بهذا الرمز.",
  noTrustedDevices: "لا توجد أجهزة موثوقة.",
  nompanyCom: "nompany.com/",
  notCollaborating: "لا تتعاون في أي استوديو بعد.",
  noUpcomingEvents: "لا توجد أحداث قادمة.",
  nothingChange: "لا شيء لتغييره.",
  novaAiKey: "مفتاح نوفا / الذكاء الاصطناعي",
  novaNotSet: "غير مضبوط — تحتاج نوفا إلى مفتاحك الخاص للعمل.",
  onlyOwnerCanRename: "المالك وحده يمكنه إعادة تسمية استوديو.",
  openEvent: "فتح",
  openStudio: "افتح الاستوديو",
  overview: "نظرة عامة",
  ownStudio: "هذا استوديوك أنت.",
  passwordDoesnMeetRequirements: "كلمة المرور لا تستوفي المتطلبات بعد.",
  passwordUpdated: "حدثت كلمة المرور",
  pasteNewKeyReplace: "الصق مفتاحا جديدا ليحل محله",
  personalInfo: "المعلومات الشخصية",
  phone: "الهاتف",
  phoneInvalid: "أدخل رقم هاتف صالحا",
  pictureHelpsPeopleRecognise: "الصورة تساعد الناس على معرفتك وتظهر أنك متصل.",
  pictureHelpsPeopleRecognise2: "الصورة تساعد الناس على معرفتك",
  pleaseWaitBeforeRequesting: "انتظر قليلا قبل طلب رمز آخر.",
  profileInfoHowReach: "معلومات ملفك الشخصي وكيفية الوصول إليك. أنت وحدك من يراها.",
  profilePicture: "صورة الملف الشخصي",
  profileUpdated: "حدث الملف الشخصي.",
  reAlreadyStudio: "أنت في ذلك الاستوديو بالفعل.",
  rememberedIt: "تذكرتها؟",
  remove: "حذف",
  removeAllDevices: "احذف كل الأجهزة",
  removing: "جار الحذف…",
  renamed: "أعيدت التسمية.",
  renamedOldLinkNo: "أعيدت التسمية. الرابط القديم لم يعد يعمل — شارك الجديد.",
  requestAccess: "اطلب الوصول",
  requiresVerification: "يتطلب تحققا",
  resetPassword: "أعد تعيين كلمة المرور",
  save: "حفظ",
  saving: "جار الحفظ…",
  searchCountry: "ابحث عن دولة",
  security: "الأمان",
  sendCode: "أرسل الرمز",
  sendCodeAgain: "أعد إرسال الرمز",
  sendNewCode: "أرسل رمزا جديدا",
  sending: "جار الإرسال…",
  setNewPassword: "عين كلمة مرور جديدة",
  setPassword: "عين كلمة مرور",
  setPasswordBtn: "تعيين كلمة المرور",
  settingsYoursAlone: "هذه الإعدادات لك وحدك. والاستوديوهات التي تنضم إليها تحتفظ بملف خاص بك ولا ترى ما هنا أبدا.",
  shortName: "الاسم المختصر",
  showPassword: "إظهار كلمة المرور",
  showingFourMostOpened: "تعرض الأربعة الأكثر فتحا.",
  sign: "تسجيل الدخول",
  signAttemptExpiredStart: "انتهت صلاحية محاولة الدخول هذه. ابدأ من جديد.",
  signOut: "تسجيل الخروج",
  signUp: "إنشاء حساب",
  signedOutEverywhereSafety: "سجل خروجك من كل مكان للأمان. سجل الدخول بكلمة المرور الجديدة.",
  somethingWentWrongTry: "حدث خطأ ما. حاول مرة أخرى.",
  studioAddressCompanyCode: "عنوان الاستوديو (رمز الشركة)",
  studioCompanyWorkspaceOwn: "الاستوديو هو مساحة عمل شركتك، على عنوانها الخاص في nompany.com.",
  studioLink: "رابط الاستوديو",
  studioName: "اسم الاستوديو",
  studioWorkspaceOwnAddress: "الاستوديو هو مساحة عمل شركتك، على عنوانها الخاص.",
  studios: "استوديوهاتك",
  studiosOthersGave: "استوديوهات منحك أصحابها الوصول إليها. أما استوديوك أنت فتحت «استوديوهاتي».",
  studiosOthersGaveShort: "استوديوهات منحك أصحابها الوصول إليها.",
  terms: "الشروط",
  privacy: "الخصوصية",
  thatAddress: "ذلك العنوان",
  tooManyAttemptsRequest: "محاولات كثيرة. اطلب رمزا جديدا.",
  tooManyAttemptsSendNew: "محاولات كثيرة. أرسل رمزا جديدا للمتابعة.",
  tooManyAttemptsTry: "محاولات كثيرة. حاول لاحقا.",
  tooManyAttemptsWait: "محاولات كثيرة. انتظر بضع دقائق ثم حاول مجددا.",
  tooManyAttemptsInMinute: "محاولات كثيرة. حاول مجددا بعد دقيقة تقريبا.",
  tooManyAttemptsInMinutes: "محاولات كثيرة. حاول مجددا بعد {n} دقيقة تقريبا.",
  total: "إجمالا",
  trustDevice30: "وثق هذا الجهاز لمدة 30 يوما",
  trusted: "موثوق",
  trustedDevices: "الأجهزة الموثوقة",
  twoPasswordsMatch: "كلمتا المرور غير متطابقتين.",
  upcomingEvents: "الأحداث القادمة",
  updating: "جار التحديث…",
  uploading: "جار الرفع…",
  use3LettersNumbers: "استخدم 3 أحرف أو أرقام أو شرطات فأكثر.",
  use3LettersNumbers2: "استخدم 3 أحرف أو أرقام أو شرطات فأكثر",
  useDifferentAccount: "استخدم حسابا آخر",
  veAlreadyAskedJoin: "طلبت الانضمام بالفعل — بانتظار موافقتهم.",
  verify: "تحقق",
  viewAll: "عرض الكل",
  workspacesYouOwn: "مساحات العمل التي تملكها. وإعادة تسمية إحداها أو تغيير رابطها يسري عند منتصف الليل.",
  yesDisconnect: "نعم، افصل",
};

const account = { en, ar };

/**
 * HOW LONG THE LOCKOUT HAS LEFT, in words.
 *
 * A 429 from the credential gate carries `retryAfter` in seconds, and a lockout
 * somebody cannot time is one they read as a broken screen — so they retry,
 * which is the one thing that cannot help. Both the sign-in screen and the
 * reset screen say it, so the two doors give the same answer.
 *
 * Falls back to the vague line when the server sent no number, rather than
 * inventing one: "a few minutes" is honest, "0 minutes" is not.
 */
export function tooManyAttemptsIn(tr: Strings, retryAfter?: unknown) {
  const seconds = Number(retryAfter) || 0;
  if (seconds <= 0) return tr.tooManyAttemptsWait;
  const minutes = Math.ceil(seconds / 60);
  return minutes <= 1 ? tr.tooManyAttemptsInMinute : tr.tooManyAttemptsInMinutes.replace("{n}", String(minutes));
}

export function accountDict(locale: string): Strings {
  return account[locale as Locale] || account[defaultLocale];
}
