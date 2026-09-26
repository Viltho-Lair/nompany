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
  /** Fingerprint judged the browser a bot (platform/auth/deviceIntel.ts). */
  automatedRefused: string;
  /** Too many new accounts from one device in a day. */
  tooManyAccountsDevice: string;
  accountSuspendedOwner: string;
  address: string;
  address364Characters: string;
  addressAlreadyTaken: string;
  alreadyHaveCode: string;
  freeStudioLimit: (n: number) => string;
  askStudioAccessUsing: string;
  asksCode: string;
  thisDevice: string;
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
  // WHAT THE COMPANY DOES, asked when the studio is created. It decides which
  // sections it starts with, which service actions seed and which org chart it
  // meets — so the words have to say that it matters without making it feel
  // compulsory, because it is not.
  fieldOfWorkLabel: string;
  fieldOfWorkHint: string;
  fieldOfWorkSkip: string;
  fieldOfWorkOtherLabel: string;
  pickFieldFromList: string;
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
  /**
   * THE CREATE SCREEN'S WORDS. The departments' NAMES are not here — they come
   * from shared/studio/sections via the server, keyed by section, so the
   * sidebar and this screen cannot call one department two things.
   */
  setup: {
    steps: [string, string, string, string];
    stepOf: (n: number, total: number) => string;
    back: string;
    continue: string;
    companyLead: string;
    departmentsTitle: string;
    departmentsLead: string;
    suggestedFor: (field: string) => string;
    suggestedNone: string;
    resetSuggestions: string;
    yes: string;
    no: string;
    partsToggle: (on: number, total: number) => string;
    partsLead: string;
    neededBy: (names: string) => string;
    pickOne: string;
    reviewTitle: string;
    reviewLead: string;
    onHeading: string;
    offHeading: string;
    noneOff: string;
    partsOff: (n: number) => string;
    alwaysThere: string;
    editLater: string;
    sectionsInvalid: string;
    questions: Record<string, { q: string; d: string }>;
    // The company questions that moved here from the registration
    // questionnaire (24/09/2026), and the Plan step.
    countryLabel: string;
    countryPlaceholder: string;
    countryHint: string;
    countryInvalid: string;
    cityLabel: string;
    cityPlaceholder: string;
    erpsLabel: string;
    erpsHint: string;
    erpNone: string;
    erpNotListed: string;
    erpOtherLabel: string;
    planTitle: string;
    planLead: string;
    planLoading: string;
    planUnavailable: string;
    monthly: string;
    yearly: string;
    yearlySaves: (pct: number) => string;
    perMonth: string;
    billedYearly: string;
    perEmployee: string;
    usersUpTo: (min: number, max: number) => string;
    freeFor: (months: number) => string;
    freeCard: string;
    chosenFromPricing: string;
    largeNote: string;
    contactSales: string;
    paidNote: (name: string) => string;
    freeNote: (months: number) => string;
    planHeading: string;
  };
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
  tillSessionNotice: (studio: string) => string;
  tillSessionBack: string;
  tillSessionSignIn: string;
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
  automatedRefused: "This browser looks automated, so we can't sign it in. Turn off any automation or privacy extension and try again, or use another browser.",
  tooManyAccountsDevice: "Too many accounts have been created on this device today. Try again tomorrow.",
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
  thisDevice: "This device",
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
  fieldOfWorkLabel: "What does the company do?",
  fieldOfWorkHint: "Sets up the studio for your trade — which departments you get, what your teams do, and which sections are switched on. You can change all of it later.",
  fieldOfWorkSkip: "I'll set this up later",
  fieldOfWorkOtherLabel: "Tell us what you do",
  pickFieldFromList: "Pick a field of work from the list.",
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
  setup: {
    steps: ["Company", "What you do", "Plan", "Review"],
    stepOf: (n, total) => `Step ${n} of ${total}`,
    back: "Back",
    continue: "Continue",
    companyLead: "The name and address your team will use to reach this studio.",
    departmentsTitle: "What does your company do?",
    departmentsLead: "Each answer switches a department on or off. Say no to anything you don't do — your studio opens with only what you use.",
    suggestedFor: (field) => `Answers are pre-filled for ${field}. Change anything that doesn't fit your company.`,
    suggestedNone: "Every department starts switched on. Say no to the ones you don't need.",
    resetSuggestions: "Reset to the suggested answers",
    yes: "Yes",
    no: "No",
    partsToggle: (on, total) => `Choose parts · ${on} of ${total}`,
    partsLead: "Keep only the parts of this department you use.",
    neededBy: (names) => `Needed by ${names}, so it stays on.`,
    pickOne: "Say yes to at least one department.",
    reviewTitle: "Your studio will open with",
    reviewLead: "Check the list before creating the studio.",
    onHeading: "Switched on",
    offHeading: "Switched off",
    noneOff: "Nothing — every department is on.",
    partsOff: (n) => (n === 1 ? "1 part off" : `${n} parts off`),
    alwaysThere: "Main, Approvals and Settings — where you manage people, roles and access — are always there.",
    editLater: "Nothing here is final. Any department can be switched on or off later in Settings → Studio settings → Sections.",
    sectionsInvalid: "The department list is out of date. Reload the page and try again.",
    countryLabel: "Country",
    countryPlaceholder: "Where the company is registered",
    countryHint: "Decides the studio's currency and the rules and documents it follows. Only the owner can change it later.",
    countryInvalid: "Pick the country from the list.",
    cityLabel: "City",
    cityPlaceholder: "Optional",
    erpsLabel: "Systems you already run",
    erpsHint: "Optional. It tells us what nompany needs to sit alongside.",
    erpNone: "None — we do not use an ERP system",
    erpNotListed: "Not listed",
    erpOtherLabel: "Which system?",
    planTitle: "Choose a package",
    planLead: "The free package is for small teams, for its first months. A bigger team needs a paid package. Each package says how many people it is for.",
    planLoading: "Loading packages…",
    planUnavailable: "Packages could not be loaded. Your studio will start on the free package, and you can upgrade later.",
    monthly: "Monthly",
    yearly: "Yearly",
    yearlySaves: (pct) => `save ${pct}%`,
    perMonth: "/ month",
    billedYearly: "billed yearly",
    perEmployee: "per person",
    usersUpTo: (min, max) => `${min}–${max} people`,
    freeFor: (months) => (months === 1 ? "Free for 1 month" : `Free for ${months} months`),
    freeCard: "Free",
    chosenFromPricing: "Chosen on the pricing page",
    largeNote: "Large is set up with our team rather than bought here.",
    contactSales: "Contact sales",
    paidNote: (name) => `Paying online is not open yet. Your choice of ${name} is saved on the studio, and it runs on the free package, within its limits, until it is paid.`,
    freeNote: (months) => `Free for ${months === 1 ? "1 month" : `${months} months`}, then choose a paid package to keep working. You can upgrade at any time.`,
    planHeading: "Package",
    questions: {
      "crm-sales": { q: "Do you sell to customers?", d: "Clients, deals, the sales pipeline, contracts, sales orders and a point of sale." },
      quotations: { q: "Do you send customers priced offers before they order?", d: "Requests for quotation, quotations and their revisions." },
      marketing: { q: "Do you run campaigns to find customers?", d: "Campaigns with their channels, dates, owner, budget and tracked links." },
      tendering: { q: "Do you bid for work through tenders?", d: "A tender register, bills of quantities and a rate library." },
      projects: { q: "Do you deliver work as projects?", d: "Projects, plans and schedules, costs, billing and overtime." },
      "engineering-docs": { q: "Do you produce drawings or technical documents?", d: "Controlled documents, transmittals, requests for information and submittals." },
      procurement: { q: "Do you buy from suppliers or hire subcontractors?", d: "Suppliers, purchase requests, purchase orders, subcontracts and receiving." },
      inventory: { q: "Do you keep stock?", d: "Items, stock levels, warehouses and stock movements." },
      manufacturing: { q: "Do you make or assemble products?", d: "Bills of materials, production planning and the shop floor." },
      "field-service": { q: "Do your people work at customers' sites?", d: "Jobs on site, scheduling, dispatch and tracking." },
      logistics: { q: "Do you deliver or ship goods?", d: "Shipments, deliveries and the vehicles that carry them." },
      assets: { q: "Do you own equipment or machinery you need to keep track of?", d: "An equipment register, where each machine is and how much it is used." },
      maintenance: { q: "Do you maintain or repair equipment?", d: "Fault reports, work orders, preventive plans and service contracts." },
      "quality-hse": { q: "Do you run inspections, quality or safety checks?", d: "Inspections, nonconformances, incidents and work permits." },
      hr: { q: "Do you manage employees?", d: "Employee records, leave, attendance and payroll." },
      finance: { q: "Do you keep your accounts in nompany?", d: "Invoices, supplier bills, payments and the accounting ledger." },
      reports: { q: "Do you want reports and dashboards?", d: "Figures and exports across the departments you use." },
    },
  },
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
  tillSessionNotice: (studio: string) => `This browser is signed in to a till at ${studio}. Until you sign in as yourself, every studio opens that till.`,
  tillSessionBack: "Back to the till",
  tillSessionSignIn: "Sign in as yourself",
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
  automatedRefused: "يبدو هذا المتصفح آليًا، لذا لا يمكننا تسجيل دخوله. أوقف أي أداة أتمتة أو إضافة خصوصية وحاول مرة أخرى، أو استخدم متصفحًا آخر.",
  tooManyAccountsDevice: "أُنشئ عدد كبير من الحسابات على هذا الجهاز اليوم. حاول مرة أخرى غدًا.",
  accountSuspendedOwner: "هذا الحساب موقوف. تواصل مع مالك استوديوك.",
  address: "العنوان",
  address364Characters: "العنوان من 3 إلى 64 حرفا: حروف إنجليزية صغيرة وأرقام وشرطات.",
  addressAlreadyTaken: "هذا العنوان محجوز.",
  alreadyHaveCode: "لدي رمز بالفعل",
  freeStudioLimit: (n: number) => `يمكنك امتلاك ${n === 1 ? "استوديو مجاني واحد" : n === 2 ? "استوديوهين مجانيين" : n <= 10 ? `${n} استوديوهات مجانية` : `${n} استوديو مجاني`}. رق أحدها لإنشاء استوديو آخر.`,
  askStudioAccessUsing: "اطلب الوصول إلى استوديو برمز الشركة. وسيوافق أحدهم هناك على الطلب.",
  asksCode: "يطلب رمزا",
  thisDevice: "هذا الجهاز",
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
  fieldOfWorkLabel: "ما الذي تعمل به الشركة؟",
  fieldOfWorkHint: "يهيئ الاستوديو لمجال عملك — الأقسام التي تحصل عليها، وما تقوم به فرقك، وأي الأقسام تكون مفعلة. يمكنك تغيير ذلك كله لاحقا.",
  fieldOfWorkSkip: "سأحدد ذلك لاحقا",
  fieldOfWorkOtherLabel: "أخبرنا بما تعمل به",
  pickFieldFromList: "اختر مجال عمل من القائمة.",
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
  setup: {
    steps: ["الشركة", "ما تقوم به", "الباقة", "المراجعة"],
    stepOf: (n, total) => `الخطوة ${n} من ${total}`,
    back: "رجوع",
    continue: "متابعة",
    companyLead: "الاسم والعنوان اللذان سيستخدمهما فريقك للوصول إلى هذا الاستوديو.",
    departmentsTitle: "ما الذي تقوم به شركتك؟",
    departmentsLead: "كل إجابة تفعّل قسما أو توقفه. أجب بلا عن كل ما لا تقوم به — يفتح الاستوديو بما تستخدمه فقط.",
    suggestedFor: (field) => `الإجابات معبأة مسبقا لمجال ${field}. غيّر أي إجابة لا تناسب شركتك.`,
    suggestedNone: "تبدأ جميع الأقسام مفعّلة. أجب بلا عن الأقسام التي لا تحتاجها.",
    resetSuggestions: "إعادة الإجابات المقترحة",
    yes: "نعم",
    no: "لا",
    partsToggle: (on, total) => `اختر الأجزاء · ${on} من ${total}`,
    partsLead: "أبق فقط على أجزاء هذا القسم التي تستخدمها.",
    neededBy: (names) => `يحتاجه ${names}، لذا يبقى مفعّلا.`,
    pickOne: "أجب بنعم عن قسم واحد على الأقل.",
    reviewTitle: "سيفتح الاستوديو بما يلي",
    reviewLead: "راجع القائمة قبل إنشاء الاستوديو.",
    onHeading: "مفعّل",
    offHeading: "متوقف",
    noneOff: "لا شيء — جميع الأقسام مفعّلة.",
    partsOff: (n) => (n === 1 ? "جزء واحد متوقف" : `${n} أجزاء متوقفة`),
    alwaysThere: "الرئيسية والموافقات والإعدادات — حيث تدير الأشخاص والأدوار والصلاحيات — متاحة دائما.",
    editLater: "لا شيء هنا نهائي. يمكن تفعيل أي قسم أو إيقافه لاحقا من الإعدادات ← إعدادات الاستوديو ← الأقسام.",
    sectionsInvalid: "قائمة الأقسام قديمة. أعد تحميل الصفحة وحاول مرة أخرى.",
    countryLabel: "الدولة",
    countryPlaceholder: "حيث سجلت الشركة",
    countryHint: "تحدد عملة الاستوديو والقواعد والمستندات التي يتبعها. لا يغيرها لاحقا إلا المالك.",
    countryInvalid: "اختر الدولة من القائمة.",
    cityLabel: "المدينة",
    cityPlaceholder: "اختياري",
    erpsLabel: "الأنظمة التي تعمل بها حاليا",
    erpsHint: "اختياري. يعرفنا بما يحتاج نومباني إلى العمل بجانبه.",
    erpNone: "لا شيء — لا نستخدم نظام تخطيط موارد",
    erpNotListed: "غير مدرج",
    erpOtherLabel: "أي نظام؟",
    planTitle: "اختر باقة",
    planLead: "الباقة المجانية للفرق الصغيرة، في أشهرها الأولى. الفريق الأكبر يحتاج إلى باقة مدفوعة. كل باقة تذكر عدد الأشخاص الذين تناسبهم.",
    planLoading: "جار تحميل الباقات…",
    planUnavailable: "تعذر تحميل الباقات. سيبدأ الاستوديو على الباقة المجانية، ويمكنك الترقية لاحقا.",
    monthly: "شهري",
    yearly: "سنوي",
    yearlySaves: (pct) => `وفر ${pct}%`,
    perMonth: "/ شهريا",
    billedYearly: "يفوتر سنويا",
    perEmployee: "للشخص",
    usersUpTo: (min, max) => `${min}–${max} أشخاص`,
    freeFor: (months) => (months === 1 ? "مجانا لشهر واحد" : months === 2 ? "مجانا لشهرين" : months <= 10 ? `مجانا لمدة ${months} أشهر` : `مجانا لمدة ${months} شهرا`),
    freeCard: "مجاني",
    chosenFromPricing: "اخترتها من صفحة الأسعار",
    largeNote: "الباقة الكبيرة تجهز مع فريقنا ولا تشترى من هنا.",
    contactSales: "تواصل مع المبيعات",
    paidNote: (name) => `الدفع عبر الإنترنت غير متاح بعد. اختيارك لباقة ${name} محفوظ في الاستوديو، ويعمل على الباقة المجانية وضمن حدودها إلى أن يتم الدفع.`,
    freeNote: (months) => `مجانا ${months === 1 ? "لشهر واحد" : months === 2 ? "لشهرين" : months <= 10 ? `لمدة ${months} أشهر` : `لمدة ${months} شهرا`}، ثم اختر باقة مدفوعة لمواصلة العمل. يمكنك الترقية في أي وقت.`,
    planHeading: "الباقة",
    questions: {
      "crm-sales": { q: "هل تبيع للعملاء؟", d: "العملاء والصفقات ومسار المبيعات والعقود وأوامر البيع ونقطة البيع." },
      quotations: { q: "هل ترسل للعملاء عروض أسعار قبل أن يطلبوا؟", d: "طلبات عروض الأسعار وعروض الأسعار ومراجعاتها." },
      marketing: { q: "هل تدير حملات لجذب العملاء؟", d: "الحملات بقنواتها وتواريخها ومسؤولها وميزانيتها وروابطها المتتبعة." },
      tendering: { q: "هل تتقدم للأعمال عبر المناقصات؟", d: "سجل المناقصات وجداول الكميات ومكتبة الأسعار." },
      projects: { q: "هل تنفذ أعمالك على شكل مشاريع؟", d: "المشاريع والخطط والجداول الزمنية والتكاليف والفوترة والعمل الإضافي." },
      "engineering-docs": { q: "هل تنتج مخططات أو مستندات فنية؟", d: "المستندات المضبوطة وخطابات الإحالة وطلبات الاستيضاح والتقديمات." },
      procurement: { q: "هل تشتري من الموردين أو تتعاقد مع مقاولين من الباطن؟", d: "الموردون وطلبات الشراء وأوامر الشراء والعقود من الباطن والاستلام." },
      inventory: { q: "هل تحتفظ بمخزون؟", d: "الأصناف ومستويات المخزون والمستودعات وحركات المخزون." },
      manufacturing: { q: "هل تصنع المنتجات أو تجمعها؟", d: "قوائم المواد وتخطيط الإنتاج وأرضية المصنع." },
      "field-service": { q: "هل يعمل فريقك في مواقع العملاء؟", d: "الأعمال الميدانية والجدولة والإرسال والتتبع." },
      logistics: { q: "هل توصل البضائع أو تشحنها؟", d: "الشحنات والتوصيلات والمركبات التي تنقلها." },
      assets: { q: "هل تملك معدات أو آلات تحتاج إلى متابعتها؟", d: "سجل المعدات وموقع كل آلة ومدى استخدامها." },
      maintenance: { q: "هل تصون المعدات أو تصلحها؟", d: "بلاغات الأعطال وأوامر العمل وخطط الصيانة الوقائية وعقود الخدمة." },
      "quality-hse": { q: "هل تجري فحوصات الجودة أو السلامة؟", d: "الفحوصات وحالات عدم المطابقة والحوادث وتصاريح العمل." },
      hr: { q: "هل تدير موظفين؟", d: "سجلات الموظفين والإجازات والحضور والرواتب." },
      finance: { q: "هل تدير حساباتك في nompany؟", d: "الفواتير وفواتير الموردين والمدفوعات ودفتر الأستاذ." },
      reports: { q: "هل تريد تقارير ولوحات معلومات؟", d: "الأرقام والتصدير عبر الأقسام التي تستخدمها." },
    },
  },
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
  tillSessionNotice: (studio: string) => `هذا المتصفح مسجّل الدخول إلى نقطة بيع في ${studio}. إلى أن تسجّل الدخول بحسابك، سيفتح كل استوديو نقطة البيع تلك.`,
  tillSessionBack: "العودة إلى نقطة البيع",
  tillSessionSignIn: "سجّل الدخول بحسابك",
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
