import { PageHeader, Icon } from "../../../_components/ui";
import { BASE } from "../../../_components/nav";
import { getConnection } from "@/lib/data/googleCalendar";
import { providerConfigured } from "@/platform/auth/calendarProviders";
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
// and renders one of two honest states: the real grid, or the connect flow —
// never a convincing fake standing in for either.
//
// THREE STATES UNDERNEATH THE TWO. Nothing connected, connected but no calendar
// chosen yet, and connected-and-chosen — ConnectCalendar renders the first two,
// which are the same screen at different steps, and the board the third.
export default async function CalendarPage() {
  const connection = await getConnection();
  // READ HERE, NOT SERVED FROM THE API. `providerConfigured` is purely
  // process.env, and putting it in the GET response would make that route's
  // golden depend on whichever developer's .env.local was loaded — the exact
  // flapping the account surface's own goldens had to clear four env vars to
  // avoid. A server component has no golden, so it can just ask.
  const configured = providerConfigured("google");

  return (
    <>
      <PageHeader
        title="Calendar"
        breadcrumb={[{ label: "Home", href: `${BASE}/dashboard/analytics` }, { label: "Application" }, { label: "Calendar" }]}
        actions={
          connection?.calendarId ? (
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

      {connection?.calendarId ? (
        // ONLY THE PUBLIC FIELDS CROSS INTO A CLIENT COMPONENT. `connection`
        // holds decrypted tokens in memory here; handing the whole object to
        // CalendarBoard would serialise them into the RSC payload, which is
        // the page's own HTML. The board needs three fields and gets three.
        <CalendarBoard
          connection={{
            calendarId: connection.calendarId,
            summary: connection.summary,
            timeZone: connection.timeZone,
          }}
        />
      ) : (
        <ConnectCalendar
          configured={configured}
          connected={Boolean(connection)}
          accountEmail={connection?.accountEmail || ""}
        />
      )}
    </>
  );
}
