import { PageHeader } from "../../../_components/ui";
import { BASE } from "../../../_components/nav";
import SuperChat from "@/components/super/SuperChat";

export const dynamic = "force-dynamic";
export const metadata = { title: "Chat" };

// LIVE CHAT — the nompany end of the studio chat widget.
//
// This screen used to be the reference template's chat demo, with six invented
// conversations hardcoded in the file. The layout survived; the data did not.
// Every row below is a real room somebody opened from inside a studio, held in
// Redis with a TTL and stored nowhere else, which is why there is no server
// fetch here: a conversation that is minutes old by the time the page paints
// would be worse than useless, so the whole screen is live from the client.
export default function ChatPage() {
  return (
    <>
      <PageHeader
        title="Chat"
        breadcrumb={[{ label: "Home", href: `${BASE}/dashboard/analytics` }, { label: "Application" }, { label: "Chat" }]}
      />
      <SuperChat />
    </>
  );
}
