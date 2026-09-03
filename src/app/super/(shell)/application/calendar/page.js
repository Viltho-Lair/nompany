import { PageHeader, Icon } from "../../../_components/ui";
import { BASE } from "../../../_components/nav";
import { getConnection } from "@/lib/data/googleCalendar";
import { calendarServiceAccount } from "@/platform/auth/googleCalendarAuth";
import ConnectCalendar from "./ConnectCalendar";
import CalendarBoard from "./CalendarBoard";

export const metadata = { title: "Calendar" };
// The connection is read from the store on every request, and the board's own
// fetch is `cache: "no-store"` besides — a stale "connected" flag pointing at a
// calendar id nobody can read any more is worse than the extra round trip.
export const dynamic = "force-dynamic";

// THIS SCREEN USED TO BE A TEMPLATE with April 2026, five invented calendars
// and a dozen made-up events written into the file. It now reads the ONE
// Google calendar the console is connected to (see docs/functionality/calendar.md)
// and renders one of two honest states: the real grid, or the setup steps —
// never a convincing fake standing in for either.
export default async function CalendarPage() {
  const connection = await getConnection();
  const serviceAccount = calendarServiceAccount();

  return (
    <>
      <PageHeader
        title="Calendar"
        breadcrumb={[{ label: "Home", href: `${BASE}/dashboard/analytics` }, { label: "Application" }, { label: "Calendar" }]}
        actions={
          connection ? (
            // "New event" became this. calendar.readonly cannot write, and a
            // button that lies about creating an event is worse than no button.
            <a
              className="ad-btn ad-btn-primary ad-btn-sm"
              href={`https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(connection.calendarId)}`}
              target="_blank"
              rel="noreferrer"
            >
              <Icon name="external" className="h-3.5 w-3.5" /> Open in Google Calendar
            </a>
          ) : null
        }
      />

      {connection ? <CalendarBoard connection={connection} /> : <ConnectCalendar serviceAccount={serviceAccount} />}
    </>
  );
}
