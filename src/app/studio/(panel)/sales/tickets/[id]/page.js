import TicketDetail from "@/components/studio/TicketDetail";
import { requireSection } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Page({ params }) {
  const actor = await requireSection("sales-list");
  if (!actor) redirect("/studio");
  const { id } = await params;
  return <TicketDetail ticketId={id} />;
}
