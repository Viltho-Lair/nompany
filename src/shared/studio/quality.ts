import { defaultLocale, type Locale } from "../locale";
import { commonEn, commonAr, type CommonStrings } from "./common";

// QUALITY — the revision workflow, the distribution list and the document editor.
//
// Generated from the screen's own copy and then translated by hand. See the
// header of ./shell for why every surface's dictionary is its own module and why
// nothing may enumerate them.

type Strings = CommonStrings & {
  acknowledged: string;
  appliesToEverySelectedCell: string;
  chooseRecipients: string;
  couldNotReachGoogleFonts: string;
  createLink: string;
  createTheLink: string;
  defaultColor: string;
  deleteColumn: string;
  deleteRow: string;
  deleteTable: string;
  documents: string;
  draftNextRevision: string;
  footerSettings: string;
  headerSettings: string;
  heightMm: string;
  iHaveReadThis: string;
  insertColumnLeft: string;
  insertColumnRight: string;
  insertRowAbove: string;
  insertRowBelow: string;
  issuedRevisionStays: string;
  issuingSupersedes: string;
  lastAccessed: (date: string) => string;
  alignCenter: string;
  alignLeft: string;
  alignRight: string;
  alignment: string;
  alreadyOpen: string;
  amber: string;
  amber2: string;
  apply: string;
  approved: string;
  approver: string;
  attachedStamped: string;
  backDocuments: string;
  backStudio: string;
  background: string;
  blue: string;
  blue2: string;
  bold: string;
  borderColour: string;
  borderStyle: string;
  borderWidthPixels: string;
  borders: string;
  bottom: string;
  bottom2: string;
  bulletList: string;
  cancel: string;
  cancel2: string;
  cellFormat: string;
  cells: string;
  centre: string;
  centre2: string;
  changeImage: string;
  chooseImage: string;
  codeBlock: string;
  columns: string;
  couldNotDone: string;
  custom: string;
  customBackgroundColour: string;
  customFontSizePoints: string;
  customMargins: string;
  customTextColour: string;
  didntWorkTryAgain: string;
  distribution: string;
  documentCouldNotCreated: string;
  documentCouldNotDeleted: string;
  documentIssued: string;
  documentNotAvailable: string;
  documentTitle: string;
  documentWithdrawn: string;
  done: string;
  effective: string;
  everybodyAcknowledged: string;
  expired: string;
  expiresAfter: string;
  externalLinks: string;
  fontSize: string;
  footer: string;
  forbidden: string;
  green: string;
  green2: string;
  grey: string;
  grey2: string;
  header: string;
  headerAndFooter: string;
  heading1: string;
  heading2: string;
  heading3: string;
  history: string;
  imageCouldnStored: string;
  inlineCode: string;
  insertImage: string;
  insertTable: string;
  issuedDocumentCannotDeleted: string;
  italic: string;
  justify: string;
  language: string;
  left: string;
  leftRight: string;
  linkLiveEveryOpen: string;
  loading: string;
  loadingDocument: string;
  loadingFonts: string;
  marginCustom: string;
  marginModerate: string;
  marginNarrow: string;
  marginNormal: string;
  marginWide: string;
  margins: string;
  mayHaveBeenDeleted: string;
  mergeSelected: string;
  middle: string;
  middle2: string;
  nameRoleDateRecorded: string;
  neverEdited: string;
  nextReview: string;
  noDocumentsYet: string;
  noPermissionDoThat: string;
  noRevision: string;
  noRevisionOpen: string;
  noRevisionToMove: string;
  nobodyNamedYet: string;
  nobodyYet: string;
  none: string;
  none2: string;
  noneLinkBoundOne: string;
  notAccessTheseDocuments: string;
  notIssuedShare: string;
  notOpened: string;
  notSaved: string;
  noteOptional: string;
  nothingDistributedUntilIssued: string;
  nothingRecordedYet: string;
  nothingToAcknowledge: string;
  nothingWaitingAcknowledgement: string;
  nothingWrittenHereYet: string;
  nothingYet: string;
  numberedList: string;
  obsolete: string;
  onlyIssuedRevisionShared: string;
  opened: string;
  paddingPx: string;
  pageBreak: string;
  pageFooter: string;
  pageNumbers: string;
  pageSize: string;
  personNotInStudio: string;
  pickSize: string;
  print: string;
  printDocument: string;
  quote: string;
  redo: string;
  reviewed: string;
  reviewer: string;
  reviewerApprover: string;
  revisionAlreadyOpen: string;
  revisionMovedOn: string;
  revisions: string;
  revoke: string;
  revoked: string;
  right: string;
  right2: string;
  rightLeft: string;
  rose: string;
  rose2: string;
  rows: string;
  samePersonCantReview: string;
  sameSigner: string;
  save: string;
  savedState: string;
  savingState: string;
  sayFallback: string;
  shareOutsideStudio: string;
  signatureImageOptional: string;
  signedSuffix: string;
  signedSuffix2: string;
  signerNotHere: string;
  someone: string;
  someone2: string;
  splitCell: string;
  startNextRevision: string;
  startOneWillGet: string;
  startPage: string;
  startingText: string;
  storing: string;
  strikethrough: string;
  table: string;
  tableOptions: string;
  textColour: string;
  thisStudio: string;
  toggleHeaderColumn: string;
  toggleHeaderRow: string;
  toldWhenRevisionIssued: string;
  top: string;
  uncontrolledCopy: string;
  underline: string;
  undo: string;
  untitledDocument: string;
  uploading: string;
  verticalAlign: string;
  wbDenied: string;
  wbEmpty: string;
  wbNotIssued: string;
  wbSameSigner: string;
  wbWrongState: string;
  whatNeedsChanging: string;
  whereStands: string;
  whoWorkDocument: string;
  whoeverHoldsRight: string;
  working: string;
  wrongState: string;
};

const en: Strings = {
  ...commonEn,
  acknowledged: "Acknowledged",
  appliesToEverySelectedCell: "Applies to every selected cell. Drag across cells first to format several at once.",
  chooseRecipients: "Choose recipients",
  couldNotReachGoogleFonts: "Could not reach Google Fonts. Check the connection and the GOOGLE_FONTS_API_KEY.",
  createLink: "Create a link",
  createTheLink: "Create the link",
  defaultColor: "Default",
  deleteColumn: "Delete column",
  deleteRow: "Delete row",
  deleteTable: "Delete table",
  documents: "Documents",
  draftNextRevision: "Draft the next revision",
  footerSettings: "Footer settings…",
  headerSettings: "Header settings…",
  heightMm: "Height (mm)",
  iHaveReadThis: "I have read this",
  insertColumnLeft: "Insert column left",
  insertColumnRight: "Insert column right",
  insertRowAbove: "Insert row above",
  insertRowBelow: "Insert row below",
  issuedRevisionStays: "The issued revision stays exactly as it is until the new one is published over it.",
  issuingSupersedes: "Issuing this revision supersedes the one before it. The old one is kept and stays readable — that is what makes it possible to say what the procedure used to require.",
  lastAccessed: (date) => ` · last ${date}`,
  alignCenter: "Align center",
  alignLeft: "Align left",
  alignRight: "Align right",
  alignment: "Alignment",
  alreadyOpen: "A revision is already open on this document.",
  amber: "Amber",
  amber2: "Amber",
  apply: "Apply",
  approved: "Approved",
  approver: "Approver",
  attachedStamped: "Attached — it will be stamped above your name.",
  backDocuments: "Back to documents",
  backStudio: "Back to the studio",
  background: "Background",
  blue: "Blue",
  blue2: "Blue",
  bold: "Bold",
  borderColour: "Border colour",
  borderStyle: "Border style",
  borderWidthPixels: "Border width in pixels",
  borders: "Borders",
  bottom: "Bottom",
  bottom2: "Bottom",
  bulletList: "Bullet list",
  cancel: "Cancel",
  cancel2: "Cancel",
  cellFormat: "Cell format",
  cells: "Cells",
  centre: "Centre",
  centre2: "Centre",
  changeImage: "Change image",
  chooseImage: "Choose image",
  codeBlock: "Code block",
  columns: "Columns",
  couldNotDone: "That could not be done.",
  custom: "Custom",
  customBackgroundColour: "Custom background colour",
  customFontSizePoints: "Custom font size in points",
  customMargins: "Custom margins",
  customTextColour: "Custom text colour",
  didntWorkTryAgain: "That didn't work. Try again.",
  distribution: "Distribution",
  documentCouldNotCreated: "That document could not be created.",
  documentCouldNotDeleted: "That document could not be deleted.",
  documentIssued: "This document was issued to you.",
  documentNotAvailable: "This document is not available",
  documentTitle: "Document title",
  documentWithdrawn: "This document has been withdrawn.",
  done: "Done",
  effective: "Effective from",
  everybodyAcknowledged: "· everybody has acknowledged",
  expired: "Expired",
  expiresAfter: "Expires after",
  externalLinks: "External links",
  fontSize: "Font size",
  footer: "Footer",
  forbidden: "You don't have permission to do that.",
  green: "Green",
  green2: "Green",
  grey: "Grey",
  grey2: "Grey",
  header: "Header",
  headerAndFooter: "Header & footer",
  heading1: "Heading 1",
  heading2: "Heading 2",
  heading3: "Heading 3",
  history: "History",
  imageCouldnStored: "That image couldn't be stored.",
  inlineCode: "Inline code",
  insertImage: "Insert image",
  insertTable: "Insert table",
  issuedDocumentCannotDeleted: "An issued document cannot be deleted. Withdraw it instead.",
  italic: "Italic",
  justify: "Justify",
  language: "Language",
  left: "Left",
  leftRight: "left to right",
  linkLiveEveryOpen: "The link is live. Every open is recorded.",
  loading: "Loading…",
  loadingDocument: "Loading document…",
  loadingFonts: "Loading fonts…",
  marginCustom: "Custom…",
  marginModerate: "Moderate",
  marginNarrow: "Narrow",
  marginNormal: "Normal",
  marginWide: "Wide",
  margins: "Margins",
  mayHaveBeenDeleted: "It may have been deleted, or you do not have access to it.",
  mergeSelected: "Merge selected",
  middle: "Middle",
  middle2: "Middle",
  nameRoleDateRecorded: "Your name, role and the date are recorded either way. The image is decoration on top of that.",
  neverEdited: "Never edited",
  nextReview: "Next review",
  noDocumentsYet: "No documents yet",
  noPermissionDoThat: "You don't have permission to do that.",
  noRevision: "There is no revision to move.",
  noRevisionOpen: "No revision open.",
  noRevisionToMove: "There is no revision to move.",
  nobodyNamedYet: "Nobody has been named yet. Choose who has to work to this document and they will be told when it is issued.",
  nobodyYet: "Nobody yet",
  none: "None",
  none2: "None",
  noneLinkBoundOne: "None. A link is bound to one revision and always expires.",
  notAccessTheseDocuments: "You do not have access to these documents.",
  notIssuedShare: "Only an issued revision can be shared outside the studio.",
  notOpened: "Not opened",
  notSaved: "Not saved",
  noteOptional: "Note (optional)",
  nothingDistributedUntilIssued: "Nothing is distributed until a revision is issued.",
  nothingRecordedYet: "Nothing recorded yet.",
  nothingToAcknowledge: "There's nothing waiting for your acknowledgement.",
  nothingWaitingAcknowledgement: "There's nothing waiting for your acknowledgement.",
  nothingWrittenHereYet: "Nothing has been written here yet.",
  nothingYet: "Nothing yet.",
  numberedList: "Numbered list",
  obsolete: "This document has been withdrawn.",
  onlyIssuedRevisionShared: "Only an issued revision can be shared outside the studio.",
  opened: "Opened",
  paddingPx: "Padding (px)",
  pageBreak: "Page break",
  pageFooter: "Page footer",
  pageNumbers: "Page numbers",
  pageSize: "Page size",
  personNotInStudio: "That person isn't in this studio.",
  pickSize: "Pick a size",
  print: "Print",
  printDocument: "Print document",
  quote: "Quote",
  redo: "Redo",
  reviewed: "Reviewed",
  reviewer: "Reviewer",
  reviewerApprover: "Reviewer and approver",
  revisionAlreadyOpen: "A revision is already open on this document.",
  revisionMovedOn: "This revision has moved on since the screen was drawn. Reload to see where it is.",
  revisions: "Revisions",
  revoke: "Revoke",
  revoked: "Revoked",
  right: "Right",
  right2: "Right",
  rightLeft: "right to left",
  rose: "Rose",
  rose2: "Rose",
  rows: "Rows",
  samePersonCantReview: "The same person can't review and approve one revision — that is what the two signatures are for.",
  sameSigner: "The same person can't review and approve one revision — that is what the two signatures are for.",
  save: "Save",
  savedState: "Saved",
  savingState: "Saving",
  sayFallback: "That didn't work. Try again.",
  shareOutsideStudio: "Share outside the studio",
  signatureImageOptional: "Signature image (optional)",
  signedSuffix: "· signed",
  signedSuffix2: " · signed",
  signerNotHere: "That person isn't in this studio.",
  someone: "Someone",
  someone2: "Someone",
  splitCell: "Split cell",
  startNextRevision: "Start the next revision",
  startOneWillGet: "Start one and it will get its number automatically.",
  startPage: "Start from page",
  startingText: "Starting text",
  storing: "Storing…",
  strikethrough: "Strikethrough",
  table: "Table",
  tableOptions: "Table options",
  textColour: "Text colour",
  thisStudio: "this studio",
  toggleHeaderColumn: "Toggle header column",
  toggleHeaderRow: "Toggle header row",
  toldWhenRevisionIssued: "They are told when a revision is issued, and asked to confirm they have read it. Acknowledgement resets each time a new revision goes out — having read rev 2 says nothing about rev 3.",
  top: "Top",
  uncontrolledCopy: "UNCONTROLLED COPY",
  underline: "Underline",
  undo: "Undo",
  untitledDocument: "Untitled document",
  uploading: "Uploading…",
  verticalAlign: "Vertical align",
  wbDenied: "You do not have the right for that.",
  wbEmpty: "There is nothing written yet to send for review.",
  wbNotIssued: "Nothing has been issued yet, so there is no next revision to draft.",
  wbSameSigner: "The same person cannot both review and approve a revision.",
  wbWrongState: "Somebody moved this while you were looking at it. Reload and try again.",
  whatNeedsChanging: "What needs changing?",
  whereStands: "Where it stands",
  whoWorkDocument: "Who has to work to this document?",
  whoeverHoldsRight: "whoever holds the right",
  working: "Working…",
  wrongState: "This revision has moved on since the screen was drawn. Reload to see where it is.",
};

const ar: Strings = {
  ...commonAr,
  acknowledged: "أُقرّ به",
  appliesToEverySelectedCell: "يُطبَّق على كل خلية محددة. اسحب عبر الخلايا أولًا لتنسيق عدة خلايا دفعة واحدة.",
  chooseRecipients: "اختر المستلمين",
  couldNotReachGoogleFonts: "تعذّر الوصول إلى Google Fonts. تحقّق من الاتصال ومن GOOGLE_FONTS_API_KEY.",
  createLink: "أنشئ رابطًا",
  createTheLink: "أنشئ الرابط",
  defaultColor: "افتراضي",
  deleteColumn: "احذف العمود",
  deleteRow: "احذف الصف",
  deleteTable: "احذف الجدول",
  documents: "الوثائق",
  draftNextRevision: "سوّد المراجعة التالية",
  footerSettings: "إعدادات التذييل…",
  headerSettings: "إعدادات الرأس…",
  heightMm: "الارتفاع (مم)",
  iHaveReadThis: "قرأت هذا",
  insertColumnLeft: "أدرج عمودًا يمينه",
  insertColumnRight: "أدرج عمودًا يساره",
  insertRowAbove: "أدرج صفًا أعلاه",
  insertRowBelow: "أدرج صفًا أدناه",
  issuedRevisionStays: "تبقى المراجعة الصادرة كما هي تمامًا حتى تُنشر الجديدة فوقها.",
  issuingSupersedes: "إصدار هذه المراجعة يلغي ما قبلها. وتُحفظ القديمة وتبقى قابلة للقراءة — وهذا ما يتيح القول بما كان الإجراء يقتضيه.",
  lastAccessed: (date) => ` · آخر مرة ${date}`,
  alignCenter: "توسيط",
  alignLeft: "محاذاة لليسار",
  alignRight: "محاذاة لليمين",
  alignment: "المحاذاة",
  alreadyOpen: "توجد مراجعة مفتوحة بالفعل على هذه الوثيقة.",
  amber: "كهرماني",
  amber2: "كهرماني",
  apply: "تطبيق",
  approved: "معتمدة",
  approver: "المعتمد",
  attachedStamped: "مرفقة — ستُختم فوق اسمك.",
  backDocuments: "العودة إلى الوثائق",
  backStudio: "العودة إلى الاستوديو",
  background: "الخلفية",
  blue: "أزرق",
  blue2: "أزرق",
  bold: "عريض",
  borderColour: "لون الحد",
  borderStyle: "نمط الحد",
  borderWidthPixels: "عرض الحد بالبكسل",
  borders: "الحدود",
  bottom: "أسفل",
  bottom2: "أسفل",
  bulletList: "قائمة نقطية",
  cancel: "إلغاء",
  cancel2: "إلغاء",
  cellFormat: "تنسيق الخلية",
  cells: "الخلايا",
  centre: "توسيط",
  centre2: "توسيط",
  changeImage: "تغيير الصورة",
  chooseImage: "اختر صورة",
  codeBlock: "كتلة برمجية",
  columns: "الأعمدة",
  couldNotDone: "تعذّر تنفيذ ذلك.",
  custom: "مخصص",
  customBackgroundColour: "لون خلفية مخصص",
  customFontSizePoints: "حجم خط مخصص بالنقاط",
  customMargins: "هوامش مخصصة",
  customTextColour: "لون نص مخصص",
  didntWorkTryAgain: "لم تنجح العملية. حاول مرة أخرى.",
  distribution: "التوزيع",
  documentCouldNotCreated: "تعذّر إنشاء تلك الوثيقة.",
  documentCouldNotDeleted: "تعذّر حذف تلك الوثيقة.",
  documentIssued: "صدرت هذه الوثيقة إليك.",
  documentNotAvailable: "هذه الوثيقة غير متاحة",
  documentTitle: "عنوان الوثيقة",
  documentWithdrawn: "سُحبت هذه الوثيقة.",
  done: "تم",
  effective: "سارية من",
  everybodyAcknowledged: "· أقرّ الجميع",
  expired: "منتهية",
  expiresAfter: "تنتهي بعد",
  externalLinks: "روابط خارجية",
  fontSize: "حجم الخط",
  footer: "التذييل",
  forbidden: "لا تملك صلاحية فعل ذلك.",
  green: "أخضر",
  green2: "أخضر",
  grey: "رمادي",
  grey2: "رمادي",
  header: "الترويسة",
  headerAndFooter: "الترويسة والتذييل",
  heading1: "عنوان 1",
  heading2: "عنوان 2",
  heading3: "عنوان 3",
  history: "السجل",
  imageCouldnStored: "تعذّر تخزين تلك الصورة.",
  inlineCode: "كود ضمن السطر",
  insertImage: "إدراج صورة",
  insertTable: "إدراج جدول",
  issuedDocumentCannotDeleted: "لا يمكن حذف وثيقة صادرة. اسحبها بدلًا من ذلك.",
  italic: "مائل",
  justify: "ضبط",
  language: "اللغة",
  left: "يسار",
  leftRight: "من اليسار إلى اليمين",
  linkLiveEveryOpen: "الرابط فعّال. ويُسجَّل كل فتح له.",
  loading: "جارٍ التحميل…",
  loadingDocument: "جارٍ تحميل الوثيقة…",
  loadingFonts: "جارٍ تحميل الخطوط…",
  marginCustom: "مخصص…",
  marginModerate: "متوسط",
  marginNarrow: "ضيق",
  marginNormal: "عادي",
  marginWide: "واسع",
  margins: "الهوامش",
  mayHaveBeenDeleted: "ربما حُذفت، أو أنك لا تملك الوصول إليها.",
  mergeSelected: "ادمج المحدد",
  middle: "وسط",
  middle2: "وسط",
  nameRoleDateRecorded: "يُسجَّل اسمك ودورك والتاريخ في الحالتين. والصورة زينة فوق ذلك.",
  neverEdited: "لم تُحرَّر قط",
  nextReview: "المراجعة التالية",
  noDocumentsYet: "لا توجد وثائق بعد",
  noPermissionDoThat: "لا تملك صلاحية فعل ذلك.",
  noRevision: "لا توجد مراجعة لتحريكها.",
  noRevisionOpen: "لا توجد مراجعة مفتوحة.",
  noRevisionToMove: "لا توجد مراجعة لتحريكها.",
  nobodyNamedYet: "لم يُسمَّ أحد بعد. اختر من عليه العمل بهذه الوثيقة وسيُبلَّغ عند إصدارها.",
  nobodyYet: "لا أحد بعد",
  none: "لا شيء",
  none2: "لا شيء",
  noneLinkBoundOne: "لا شيء. يرتبط الرابط بمراجعة واحدة وينتهي دائمًا.",
  notAccessTheseDocuments: "لا تملك صلاحية الوصول إلى هذه الوثائق.",
  notIssuedShare: "لا يمكن مشاركة مراجعة خارج الاستوديو إلا إذا كانت صادرة.",
  notOpened: "لم تُفتح",
  notSaved: "غير محفوظ",
  noteOptional: "ملاحظة (اختيارية)",
  nothingDistributedUntilIssued: "لا يُوزَّع شيء حتى تُصدَر مراجعة.",
  nothingRecordedYet: "لم يُسجَّل شيء بعد.",
  nothingToAcknowledge: "لا شيء ينتظر إقرارك.",
  nothingWaitingAcknowledgement: "لا شيء ينتظر إقرارك.",
  nothingWrittenHereYet: "لم يُكتب شيء هنا بعد.",
  nothingYet: "لا شيء بعد.",
  numberedList: "قائمة مرقّمة",
  obsolete: "سُحبت هذه الوثيقة.",
  onlyIssuedRevisionShared: "لا يمكن مشاركة مراجعة خارج الاستوديو إلا إذا كانت صادرة.",
  opened: "فُتحت",
  paddingPx: "الحشو (بكسل)",
  pageBreak: "فاصل صفحة",
  pageFooter: "تذييل الصفحة",
  pageNumbers: "أرقام الصفحات",
  pageSize: "حجم الصفحة",
  personNotInStudio: "هذا الشخص ليس في هذا الاستوديو.",
  pickSize: "اختر حجمًا",
  print: "طباعة",
  printDocument: "طباعة الوثيقة",
  quote: "اقتباس",
  redo: "إعادة",
  reviewed: "روجعت",
  reviewer: "المراجع",
  reviewerApprover: "المراجع والمعتمد",
  revisionAlreadyOpen: "توجد مراجعة مفتوحة بالفعل على هذه الوثيقة.",
  revisionMovedOn: "تقدّمت هذه المراجعة منذ رسم الشاشة. أعد التحميل لترى وضعها.",
  revisions: "المراجعات",
  revoke: "إبطال",
  revoked: "مُلغى",
  right: "يمين",
  right2: "يمين",
  rightLeft: "من اليمين إلى اليسار",
  rose: "وردي",
  rose2: "وردي",
  rows: "الصفوف",
  samePersonCantReview: "لا يمكن للشخص نفسه مراجعة واعتماد مراجعة واحدة — فذلك هو سبب وجود توقيعين.",
  sameSigner: "لا يمكن للشخص نفسه مراجعة واعتماد مراجعة واحدة — فذلك هو سبب وجود توقيعين.",
  save: "حفظ",
  savedState: "محفوظ",
  savingState: "جارٍ الحفظ",
  sayFallback: "لم تنجح العملية. حاول مرة أخرى.",
  shareOutsideStudio: "المشاركة خارج الاستوديو",
  signatureImageOptional: "صورة التوقيع (اختياري)",
  signedSuffix: "· موقّعة",
  signedSuffix2: " · موقّعة",
  signerNotHere: "هذا الشخص ليس في هذا الاستوديو.",
  someone: "أحدهم",
  someone2: "أحدهم",
  splitCell: "قسّم الخلية",
  startNextRevision: "ابدأ المراجعة التالية",
  startOneWillGet: "ابدأ واحدة وستأخذ رقمها تلقائيًا.",
  startPage: "البدء من صفحة",
  startingText: "النص الافتتاحي",
  storing: "جارٍ التخزين…",
  strikethrough: "يتوسطه خط",
  table: "جدول",
  tableOptions: "خيارات الجدول",
  textColour: "لون النص",
  thisStudio: "هذا الاستوديو",
  toggleHeaderColumn: "بدّل عمود الرأس",
  toggleHeaderRow: "بدّل صف الرأس",
  toldWhenRevisionIssued: "يُبلَّغون عند إصدار مراجعة، ويُطلب منهم تأكيد قراءتها. ويُعاد ضبط الإقرار مع كل مراجعة جديدة — فقراءة المراجعة الثانية لا تقول شيئًا عن الثالثة.",
  top: "أعلى",
  uncontrolledCopy: "نسخة غير مضبوطة",
  underline: "تسطير",
  undo: "تراجع",
  untitledDocument: "وثيقة بلا عنوان",
  uploading: "جارٍ الرفع…",
  verticalAlign: "المحاذاة الرأسية",
  wbDenied: "لا تملك الصلاحية لذلك.",
  wbEmpty: "لا يوجد شيء مكتوب بعد لإرساله للمراجعة.",
  wbNotIssued: "لم يصدر شيء بعد، فلا توجد مراجعة تالية لصياغتها.",
  wbSameSigner: "لا يمكن للشخص نفسه أن يراجع ويعتمد مراجعة واحدة.",
  wbWrongState: "حرّكها أحدهم بينما كنت تنظر إليها. أعد التحميل وحاول مجددًا.",
  whatNeedsChanging: "ما الذي يحتاج إلى تغيير؟",
  whereStands: "وضعها الحالي",
  whoWorkDocument: "من عليه العمل وفق هذه الوثيقة؟",
  whoeverHoldsRight: "من يحمل الصلاحية",
  working: "جارٍ العمل…",
  wrongState: "تقدّمت هذه المراجعة منذ رسم الشاشة. أعد التحميل لترى وضعها.",
};

const quality = { en, ar };

export function qualityDict(locale: string): Strings {
  return quality[locale as Locale] || quality[defaultLocale];
}
