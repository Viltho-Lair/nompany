"use client";

import GreetingEditor from "@/components/super/GreetingEditor";
import NovaCredentials from "@/components/super/NovaCredentials";

/* BROADCAST — what every studio reads across the top of its screens.
   ------------------------------------------------------------------
   IT SITS BESIDE THE WALL RATHER THAN IN THE CONSOLE MENU, and the two belong
   together: Pulse is what the platform is doing and Broadcast is what the
   platform is saying. It was `/super/application/greeting`, one row down a menu
   of eleven, which is a long way from the only screen anybody leaves open.

   THE KEY IS ON THIS PAGE, at the top, because the automated messages below are
   the reason anybody sets one. It is the SAME component the Nova switchboard
   draws and the same stored credential — not a second key and not a copy of the
   form. Somebody setting it here switches on Nova's chat too, which the card
   says out loud.

   IT MOUNTS ONLY ONCE THE PANE HAS BEEN OPENED. The wall is a screen left on a
   screen; every mount here costs it two fetches it has no use for, forever, so
   the parent holds this behind a flag that flips the first time somebody
   arrives. */
export default function BroadcastPane() {
  return (
    <div className="h-full overflow-y-auto px-4 pb-20 pt-4">
      <div className="mx-auto max-w-[1100px]">
        <header className="mb-5">
          <h1 className="font-display text-xl font-800 tracking-tight">Broadcast</h1>
          <p className="mt-1 text-sm text-[var(--ad-muted-foreground)]">
            One band across the top of every studio, on every screen. Several messages share
            it — it shows one at a time, moves on every five seconds, and a reader can close
            it for the day.
          </p>
        </header>

        <NovaCredentials note="Automated messages are written with this key, once a day for the whole platform. Nova's chat runs on it too." />

        <GreetingEditor />
      </div>
    </div>
  );
}
