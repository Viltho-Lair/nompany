import { defaultLocale, type Locale } from "../locale";
import { commonEn, commonAr, type CommonStrings } from "./common";

// QUALITY — the revision workflow, the distribution list and the document editor.
//
// Generated from the screen's own copy and then translated by hand. See the
// header of ./shell for why every surface's dictionary is its own module and why
// nothing may enumerate them.

type Strings = CommonStrings & {
  lastAccessed: (date: string) => string;
  alignCenter: string;
  alignLeft: string;
  alignRight: string;
  alignment: string;
  amber: string;
  apply: string;
  approved: string;
  approver: string;
  attachedStamped: string;
  backDocuments: string;
  backStudio: string;
  background: string;
  blue: string;
  bold: string;
  borderColour: string;
  borderStyle: string;
  borderWidthPixels: string;
  borders: string;
  bottom: string;
  bulletList: string;
  cancel: string;
  cancel2: string;
  cellFormat: string;
  cells: string;
  centre: string;
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
  green: string;
  grey: string;
  header: string;
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
  middle: string;
  nameRoleDateRecorded: string;
  neverEdited: string;
  nextReview: string;
  noDocumentsYet: string;
  noPermissionDoThat: string;
  noRevisionOpen: string;
  noRevisionToMove: string;
  nobodyYet: string;
  none: string;
  noneLinkBoundOne: string;
  notAccessTheseDocuments: string;
  noteOptional: string;
  nothingRecordedYet: string;
  nothingWaitingAcknowledgement: string;
  nothingWrittenHereYet: string;
  nothingYet: string;
  numberedList: string;
  onlyIssuedRevisionShared: string;
  opened: string;
  pageBreak: string;
  pageFooter: string;
  pageSize: string;
  personNotInStudio: string;
  pickSize: string;
  printDocument: string;
  quote: string;
  redo: string;
  reviewed: string;
  reviewer: string;
  reviewerApprover: string;
  revisionAlreadyOpen: string;
  revisionMovedOn: string;
  revisions: string;
  revoked: string;
  right: string;
  rightLeft: string;
  rose: string;
  rows: string;
  samePersonCantReview: string;
  shareOutsideStudio: string;
  signedSuffix: string;
  someone: string;
  startOneWillGet: string;
  startPage: string;
  startingText: string;
  storing: string;
  strikethrough: string;
  tableOptions: string;
  textColour: string;
  top: string;
  uncontrolledCopy: string;
  underline: string;
  undo: string;
  uploading: string;
  whatNeedsChanging: string;
  whereStands: string;
  whoWorkDocument: string;
  whoeverHoldsRight: string;
  working: string;
};

const en: Strings = {
  ...commonEn,
  lastAccessed: (date) => ` · last ${date}`,
  alignCenter: "Align center",
  alignLeft: "Align left",
  alignRight: "Align right",
  alignment: "Alignment",
  amber: "Amber",
  apply: "Apply",
  approved: "Approved",
  approver: "Approver",
  attachedStamped: "Attached — it will be stamped above your name.",
  backDocuments: "Back to documents",
  backStudio: "Back to the studio",
  background: "Background",
  blue: "Blue",
  bold: "Bold",
  borderColour: "Border colour",
  borderStyle: "Border style",
  borderWidthPixels: "Border width in pixels",
  borders: "Borders",
  bottom: "Bottom",
  bulletList: "Bullet list",
  cancel: "Cancel",
  cancel2: "Cancel",
  cellFormat: "Cell format",
  cells: "Cells",
  centre: "Centre",
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
  green: "Green",
  grey: "Grey",
  header: "Header",
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
  middle: "Middle",
  nameRoleDateRecorded: "Your name, role and the date are recorded either way. The image is decoration on top of that.",
  neverEdited: "Never edited",
  nextReview: "Next review",
  noDocumentsYet: "No documents yet",
  noPermissionDoThat: "You don't have permission to do that.",
  noRevisionOpen: "No revision open.",
  noRevisionToMove: "There is no revision to move.",
  nobodyYet: "Nobody yet",
  none: "None",
  noneLinkBoundOne: "None. A link is bound to one revision and always expires.",
  notAccessTheseDocuments: "You do not have access to these documents.",
  noteOptional: "Note (optional)",
  nothingRecordedYet: "Nothing recorded yet.",
  nothingWaitingAcknowledgement: "There's nothing waiting for your acknowledgement.",
  nothingWrittenHereYet: "Nothing has been written here yet.",
  nothingYet: "Nothing yet.",
  numberedList: "Numbered list",
  onlyIssuedRevisionShared: "Only an issued revision can be shared outside the studio.",
  opened: "Opened",
  pageBreak: "Page break",
  pageFooter: "Page footer",
  pageSize: "Page size",
  personNotInStudio: "That person isn't in this studio.",
  pickSize: "Pick a size",
  printDocument: "Print document",
  quote: "Quote",
  redo: "Redo",
  reviewed: "Reviewed",
  reviewer: "Reviewer",
  reviewerApprover: "Reviewer and approver",
  revisionAlreadyOpen: "A revision is already open on this document.",
  revisionMovedOn: "This revision has moved on since the screen was drawn. Reload to see where it is.",
  revisions: "Revisions",
  revoked: "Revoked",
  right: "Right",
  rightLeft: "right to left",
  rose: "Rose",
  rows: "Rows",
  samePersonCantReview: "The same person can't review and approve one revision — that is what the two signatures are for.",
  shareOutsideStudio: "Share outside the studio",
  signedSuffix: "· signed",
  someone: "Someone",
  startOneWillGet: "Start one and it will get its number automatically.",
  startPage: "Start from page",
  startingText: "Starting text",
  storing: "Storing…",
  strikethrough: "Strikethrough",
  tableOptions: "Table options",
  textColour: "Text colour",
  top: "Top",
  uncontrolledCopy: "UNCONTROLLED COPY",
  underline: "Underline",
  undo: "Undo",
  uploading: "Uploading…",
  whatNeedsChanging: "What needs changing?",
  whereStands: "Where it stands",
  whoWorkDocument: "Who has to work to this document?",
  whoeverHoldsRight: "whoever holds the right",
  working: "Working…",
};

const ar: Strings = {
  ...commonAr,
  lastAccessed: (date) => ` · آخر مرة ${date}`,
  alignCenter: "توسيط",
  alignLeft: "محاذاة لليسار",
  alignRight: "محاذاة لليمين",
  alignment: "المحاذاة",
  amber: "كهرماني",
  apply: "تطبيق",
  approved: "معتمدة",
  approver: "المعتمد",
  attachedStamped: "مرفقة — ستُختم فوق اسمك.",
  backDocuments: "العودة إلى الوثائق",
  backStudio: "العودة إلى الاستوديو",
  background: "الخلفية",
  blue: "أزرق",
  bold: "عريض",
  borderColour: "لون الحد",
  borderStyle: "نمط الحد",
  borderWidthPixels: "عرض الحد بالبكسل",
  borders: "الحدود",
  bottom: "أسفل",
  bulletList: "قائمة نقطية",
  cancel: "إلغاء",
  cancel2: "إلغاء",
  cellFormat: "تنسيق الخلية",
  cells: "الخلايا",
  centre: "توسيط",
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
  green: "أخضر",
  grey: "رمادي",
  header: "الترويسة",
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
  middle: "وسط",
  nameRoleDateRecorded: "يُسجَّل اسمك ودورك والتاريخ في الحالتين. والصورة زينة فوق ذلك.",
  neverEdited: "لم تُحرَّر قط",
  nextReview: "المراجعة التالية",
  noDocumentsYet: "لا توجد وثائق بعد",
  noPermissionDoThat: "لا تملك صلاحية فعل ذلك.",
  noRevisionOpen: "لا توجد مراجعة مفتوحة.",
  noRevisionToMove: "لا توجد مراجعة لتحريكها.",
  nobodyYet: "لا أحد بعد",
  none: "لا شيء",
  noneLinkBoundOne: "لا شيء. يرتبط الرابط بمراجعة واحدة وينتهي دائمًا.",
  notAccessTheseDocuments: "لا تملك صلاحية الوصول إلى هذه الوثائق.",
  noteOptional: "ملاحظة (اختيارية)",
  nothingRecordedYet: "لم يُسجَّل شيء بعد.",
  nothingWaitingAcknowledgement: "لا شيء ينتظر إقرارك.",
  nothingWrittenHereYet: "لم يُكتب شيء هنا بعد.",
  nothingYet: "لا شيء بعد.",
  numberedList: "قائمة مرقّمة",
  onlyIssuedRevisionShared: "لا يمكن مشاركة مراجعة خارج الاستوديو إلا إذا كانت صادرة.",
  opened: "فُتحت",
  pageBreak: "فاصل صفحة",
  pageFooter: "تذييل الصفحة",
  pageSize: "حجم الصفحة",
  personNotInStudio: "هذا الشخص ليس في هذا الاستوديو.",
  pickSize: "اختر حجمًا",
  printDocument: "طباعة الوثيقة",
  quote: "اقتباس",
  redo: "إعادة",
  reviewed: "روجعت",
  reviewer: "المراجع",
  reviewerApprover: "المراجع والمعتمد",
  revisionAlreadyOpen: "توجد مراجعة مفتوحة بالفعل على هذه الوثيقة.",
  revisionMovedOn: "تقدّمت هذه المراجعة منذ رسم الشاشة. أعد التحميل لترى وضعها.",
  revisions: "المراجعات",
  revoked: "مُلغى",
  right: "يمين",
  rightLeft: "من اليمين إلى اليسار",
  rose: "وردي",
  rows: "الصفوف",
  samePersonCantReview: "لا يمكن للشخص نفسه مراجعة واعتماد مراجعة واحدة — فذلك هو سبب وجود توقيعين.",
  shareOutsideStudio: "المشاركة خارج الاستوديو",
  signedSuffix: "· موقّعة",
  someone: "أحدهم",
  startOneWillGet: "ابدأ واحدة وستأخذ رقمها تلقائيًا.",
  startPage: "البدء من صفحة",
  startingText: "النص الافتتاحي",
  storing: "جارٍ التخزين…",
  strikethrough: "يتوسطه خط",
  tableOptions: "خيارات الجدول",
  textColour: "لون النص",
  top: "أعلى",
  uncontrolledCopy: "نسخة غير مضبوطة",
  underline: "تسطير",
  undo: "تراجع",
  uploading: "جارٍ الرفع…",
  whatNeedsChanging: "ما الذي يحتاج إلى تغيير؟",
  whereStands: "وضعها الحالي",
  whoWorkDocument: "من عليه العمل وفق هذه الوثيقة؟",
  whoeverHoldsRight: "من يحمل الصلاحية",
  working: "جارٍ العمل…",
};

const quality = { en, ar };

export function qualityDict(locale: string): Strings {
  return quality[locale as Locale] || quality[defaultLocale];
}
