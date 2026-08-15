// The page itself is a client component now (it reads a live connection), and a
// client component cannot export `metadata` — so the title lives here.
export const metadata = { title: "Notifications" };

export default function NotificationsLayout({ children }) {
  return children;
}
