import GalleryManager from "@/components/studio/GalleryManager";
import { requireSection } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Page() {
  const actor = await requireSection("gallery");
  if (!actor) redirect("/studio");
  return <GalleryManager />;
}
