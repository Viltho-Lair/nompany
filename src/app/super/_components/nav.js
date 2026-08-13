// The /super sidebar map. Groups render as captioned blocks; an item with
// `children` renders as a collapsible tree.
//
// The console started as a 1:1 mirror of a reference admin template, so most of
// what follows was demonstration rather than product. The two groups at the
// bottom are the triage of that: "to be worked" is template screens that will
// become real, "to be removed" is template screens that will not. Nothing is
// deleted here — every route still exists and still works. This only changes
// where the sidebar files them, so the distinction is visible while it lasts.
//
// The groups above them are the console as it actually is today.

export const BASE = "/super";

export const NAV = [
  {
    caption: "Navigation",
    items: [
      {
        label: "Dashboard",
        icon: "dashboard",
        children: [
          { label: "Analytics", href: `${BASE}/dashboard/analytics` },
          { label: "CRM", href: `${BASE}/dashboard/crm` },
          { label: "eCommerce", href: `${BASE}/dashboard/ecommerce` },
          { label: "Finance", href: `${BASE}/dashboard/finance` },
          { label: "Crypto", href: `${BASE}/dashboard/crypto` },
          { label: "Project", href: `${BASE}/dashboard/project` },
          { label: "SaaS", href: `${BASE}/dashboard/saas` },
          { label: "HR", href: `${BASE}/dashboard/hr` },
          { label: "Marketing", href: `${BASE}/dashboard/marketing` },
        ],
      },
    ],
  },
  {
    caption: "Application",
    items: [
      { label: "Email", icon: "mail", href: `${BASE}/application/email` },
      // Live chat with studios. Promoted out of "To be worked" when it stopped
      // being a template demo and started carrying real rooms.
      { label: "Chat", icon: "chat", href: `${BASE}/application/chat` },
      { label: "Users", icon: "users", href: `${BASE}/application/users` },
      { label: "Studios", icon: "briefcase", href: `${BASE}/application/studios` },
      { label: "Packages", icon: "package", href: `${BASE}/application/packages` },
      { label: "Tiers", icon: "layers", href: `${BASE}/application/tiers` },
    ],
  },
  {
    caption: "Forms",
    items: [
      // Full-page app: it opens outside the console chrome (see (full)),
      // which is why its href leaves the /forms group behind.
      { label: "Questionnaires", icon: "form", href: `${BASE}/questionnaires` },
    ],
  },
  {
    caption: "To be worked",
    items: [
      { label: "Calendar", icon: "calendar", href: `${BASE}/application/calendar` },
      { label: "Task Board", icon: "kanban", href: `${BASE}/application/task-board` },
      { label: "Notifications", icon: "bell", href: `${BASE}/application/notifications` },
      { label: "Invoices", icon: "invoice", href: `${BASE}/application/invoices` },
      { label: "Orders", icon: "box", href: `${BASE}/ecommerce/orders` },
      { label: "Landing Page", icon: "globe", href: `${BASE}/landing` },
      {
        label: "Maintenance",
        icon: "tool",
        children: [
          { label: "Error 404", href: `${BASE}/error-404` },
          { label: "Error 500", href: `${BASE}/error-500` },
          { label: "Error 403", href: `${BASE}/error-403` },
          { label: "Maintenance", href: `${BASE}/maintenance` },
          { label: "Coming Soon", href: `${BASE}/coming-soon` },
          { label: "Under Construction", href: `${BASE}/under-construction` },
          { label: "Offline", href: `${BASE}/offline` },
          { label: "Session Expired", href: `${BASE}/session-expired` },
          { label: "Rate Limited", href: `${BASE}/rate-limited` },
        ],
      },
      {
        label: "Authentication",
        icon: "lock",
        children: [
          { label: "Login V1", href: `${BASE}/v1/login` },
          { label: "Login V2", href: `${BASE}/v2/login` },
          { label: "Register V1", href: `${BASE}/v1/register` },
          { label: "Register V2", href: `${BASE}/v2/register` },
          { label: "Forgot Password V1", href: `${BASE}/v1/forgot-password` },
          { label: "Forgot Password V2", href: `${BASE}/v2/forgot-password` },
          { label: "Reset Password V1", href: `${BASE}/v1/reset-password` },
          { label: "Reset Password V2", href: `${BASE}/v2/reset-password` },
          { label: "Verify Email V1", href: `${BASE}/v1/verify-email` },
          { label: "Verify Email V2", href: `${BASE}/v2/verify-email` },
          { label: "Two Factor V1", href: `${BASE}/v1/two-factor` },
          { label: "Two Factor V2", href: `${BASE}/v2/two-factor` },
          { label: "Lock Screen V1", href: `${BASE}/v1/lock-screen` },
          { label: "Lock Screen V2", href: `${BASE}/v2/lock-screen` },
          { label: "Account Disabled V1", href: `${BASE}/v1/account-disabled` },
          { label: "Account Disabled V2", href: `${BASE}/v2/account-disabled` },
          { label: "Password Changed V1", href: `${BASE}/v1/password-changed` },
          { label: "Password Changed V2", href: `${BASE}/v2/password-changed` },
        ],
      },
      { label: "Documentation", icon: "book", href: `${BASE}/docs` },
      { label: "Settings", icon: "settings", href: `${BASE}/settings/profile` },
    ],
  },
  {
    caption: "To be removed",
    items: [
      { label: "File Manager", icon: "folder", href: `${BASE}/application/file-manager` },
      { label: "Gallery", icon: "image", href: `${BASE}/application/gallery` },
      { label: "Products", icon: "package", href: `${BASE}/ecommerce/products` },
      { label: "Cart", icon: "cart", href: `${BASE}/ecommerce/cart` },
      { label: "Wishlist", icon: "heart", href: `${BASE}/ecommerce/wishlist` },
      { label: "Typography", icon: "type", href: `${BASE}/elements/typography` },
      { label: "Components", icon: "layers", href: `${BASE}/elements/components` },
      { label: "Icons", icon: "smile", href: `${BASE}/elements/icons` },
      { label: "Form Elements", icon: "form", href: `${BASE}/forms/form-elements` },
      { label: "Form Wizard", icon: "wizard", href: `${BASE}/forms/wizard` },
      { label: "Editor", icon: "edit", href: `${BASE}/forms/editor` },
      { label: "Data Tables", icon: "table", href: `${BASE}/tables/data-tables` },
      { label: "Charts", icon: "pie", href: `${BASE}/charts/apex-charts` },
      { label: "Sample Page", icon: "file", href: `${BASE}/other/sample-page` },
      { label: "Pricing", icon: "tag", href: `${BASE}/other/pricing` },
    ],
  },
];

// Flat lookup used by the header breadcrumb and the ⌘K palette.
export const FLAT = NAV.flatMap((g) =>
  g.items.flatMap((it) =>
    it.children
      ? it.children.map((c) => ({ ...c, group: g.caption, parent: it.label, icon: it.icon }))
      : [{ ...it, group: g.caption }],
  ),
);
