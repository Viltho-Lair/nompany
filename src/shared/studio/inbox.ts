import { defaultLocale, type Locale } from "../locale";
import type { NoticeCategory } from "../notificationKinds";

// THE NOTIFICATION CENTRE'S OWN WORDS, and the bell's additions to its shell
// strings. See the header of ./shell for why each surface keeps its own
// dictionary and why nothing may enumerate them.
//
// THE NOTICES THEMSELVES ARE NOT HERE — they are rendered from
// `modules/administration/notices` in the reader's language. These are the
// words AROUND them: the filters, the actions, the empty states.

type Strings = {
  title: string;
  lead: string;
  inbox: string;
  unread: string;
  archived: string;
  all: string;
  categories: Record<NoticeCategory, string>;
  markRead: string;
  markAllRead: string;
  archive: string;
  unarchive: string;
  loadMore: string;
  loading: string;
  empty: string;
  emptyUnread: string;
  emptyArchived: string;
  seeAll: string;
  /** "3 times" beside a notice that arrived more than once. */
  times: (n: number) => string;
  kept: string;
};

const en: Strings = {
  title: "Notifications",
  lead: "Everything addressed to you in this studio.",
  inbox: "Inbox",
  unread: "Unread",
  archived: "Archived",
  all: "All",
  categories: {
    approvals: "Approvals",
    work: "Assigned to me",
    deals: "Sales",
    money: "Money",
    deadlines: "Deadlines",
    people: "People",
    system: "System",
  },
  markRead: "Mark read",
  markAllRead: "Mark all read",
  archive: "Archive",
  unarchive: "Move to inbox",
  loadMore: "Load more",
  loading: "Loading…",
  empty: "Nothing here.",
  emptyUnread: "You have read everything.",
  emptyArchived: "Nothing archived.",
  seeAll: "See all notifications",
  times: (n) => `${n} times`,
  // THE WINDOW, said on the page so nobody goes looking for a notice from last
  // spring and concludes the product lost it.
  kept: "Notifications are kept for 90 days.",
};

const ar: Strings = {
  title: "الإشعارات",
  lead: "كل ما وُجّه إليك في هذا الاستوديو.",
  inbox: "الوارد",
  unread: "غير المقروءة",
  archived: "المؤرشفة",
  all: "الكل",
  categories: {
    approvals: "الموافقات",
    work: "المُسند إليّ",
    deals: "المبيعات",
    money: "المال",
    deadlines: "المواعيد النهائية",
    people: "الأشخاص",
    system: "النظام",
  },
  markRead: "تعليم كمقروء",
  markAllRead: "تعليم الكل كمقروء",
  archive: "أرشفة",
  unarchive: "نقل إلى الوارد",
  loadMore: "عرض المزيد",
  loading: "جار التحميل…",
  empty: "لا شيء هنا.",
  emptyUnread: "قرأت كل شيء.",
  emptyArchived: "لا شيء مؤرشف.",
  seeAll: "عرض كل الإشعارات",
  // Arabic counts four ways; ./shell's note on notificationsUnread says why a
  // single template with a hole in it cannot be right.
  times: (n) => (n === 2 ? "مرتان" : n <= 10 ? `${n} مرات` : `${n} مرة`),
  kept: "تُحفظ الإشعارات لمدة 90 يومًا.",
};

const dict = { en, ar };

export const inboxDict = (locale: Locale = defaultLocale): Strings =>
  dict[locale] || dict[defaultLocale];
