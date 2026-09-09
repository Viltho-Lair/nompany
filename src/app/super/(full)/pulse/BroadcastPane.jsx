"use client";

import GreetingEditor from "@/components/super/GreetingEditor";

/* BROADCAST — what every studio reads across the top of its screens.
   ------------------------------------------------------------------
   IT SITS BESIDE THE WALL RATHER THAN IN THE CONSOLE MENU, and the two belong
   together: Pulse is what the platform is doing and Broadcast is what the
   platform is saying. It was `/super/application/greeting`, one row down a menu
   of eleven, which is a long way from the only screen anybody leaves open.

   THE PANE IS SCREEN-CONTAINED and scrolls nothing itself. The wall it slides
   out of is `h-[100dvh]`; a pane that grew a page scrollbar would put the whole
   wall on a scrollbar with it. The register inside scrolls its own list and its
   own detail, which is what keeps the top bar and the message list in place
   while somebody works down a long one.

   IT MOUNTS ONLY ONCE THE PANE HAS BEEN OPENED — see PulseWall. The wall is a
   screen left on a screen; every mount here costs it fetches it has no use for. */
export default function BroadcastPane() {
  return (
    <div className="h-full overflow-hidden pb-11">
      <GreetingEditor />
    </div>
  );
}
