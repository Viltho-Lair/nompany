import GreetingEditor from "@/components/super/GreetingEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Broadcast" };

/* BROADCAST — what every studio reads across the top of its screens.
   ------------------------------------------------------------------
   IT WAS A SLIDING PANE and it is a route now, with the rest of the console.
   The pane existed so the Pulse wall could keep its polls and its map while
   Broadcast came in beside it; the owner's call was that every console screen
   should be a bar item, and eight of the nine joining it read the store as
   Server Components that cannot slide. One shape for ten screens beats a
   special case for one.

   WHAT WENT WITH THE PANE: `nextDynamic` around it, because a route is already
   its own chunk and Next will not load this one until somebody asks for it —
   the laziness the pane had to arrange by hand is what routing does by default. */
export default function BroadcastPage() {
  return (
    <div className="h-full overflow-hidden">
      <GreetingEditor />
    </div>
  );
}
