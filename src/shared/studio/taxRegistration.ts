// THE WORDS OF THE TAX-REGISTRATION FIELDS (components/studio2/TaxRegistrationFields),
// one block shown on two screens — a client in Sales and an invoice in Finance —
// so it carries its own copy rather than borrowing either department's.

export type TaxRegistrationDict = {
  title: string;
  help: string;
  invoiceHelp: string;
  vatNumber: string;
  vatHint: string;
  crn: string;
  street: string;
  building: string;
  additional: string;
  district: string;
  city: string;
  postal: string;
  addForInvoice: string;
  projectFallback: string;
};

const en: TaxRegistrationDict = {
  title: "Tax registration",
  help: "For a business customer: what its tax invoices must name. Leave empty for a consumer.",
  invoiceHelp: "Fill this in for a VAT-registered business. In Saudi Arabia it makes the invoice a standard one, cleared by ZATCA when you issue it.",
  vatNumber: "VAT number",
  vatHint: "Saudi Arabia: 15 digits, starting and ending with 3.",
  crn: "Commercial registration",
  street: "Street",
  building: "Building number",
  additional: "Additional number",
  district: "District",
  city: "City",
  postal: "Postal code",
  addForInvoice: "Add the customer's tax registration",
  projectFallback: "Left empty on a project invoice, the registration recorded on the project's client is used.",
};

const ar: TaxRegistrationDict = {
  title: "التسجيل الضريبي",
  help: "للعميل المنشأة: ما يجب أن تذكره فواتيره الضريبية. اتركه فارغا للمستهلك.",
  invoiceHelp: "املأه لمنشأة مسجلة في ضريبة القيمة المضافة. في السعودية يجعل الفاتورة فاتورة ضريبية قياسية تعتمدها الهيئة عند إصدارها.",
  vatNumber: "الرقم الضريبي",
  vatHint: "السعودية: 15 رقما يبدأ وينتهي بـ 3.",
  crn: "السجل التجاري",
  street: "الشارع",
  building: "رقم المبنى",
  additional: "الرقم الإضافي",
  district: "الحي",
  city: "المدينة",
  postal: "الرمز البريدي",
  addForInvoice: "إضافة التسجيل الضريبي للعميل",
  projectFallback: "إذا ترك فارغا في فاتورة مشروع، يستخدم التسجيل المسجل على عميل المشروع.",
};

export const taxRegistrationDict = (locale: string): TaxRegistrationDict => (locale === "ar" ? ar : en);
