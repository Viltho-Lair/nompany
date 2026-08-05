import { createRoom } from "@/lib/chat";
import { CHAT_TOPICS, isTopic } from "@/lib/chatConstants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public: a website visitor starts a chat. All four contact fields are required.
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const topic = String(body.topic || "");
  if (!isTopic(topic)) return Response.json({ error: "Choose Sales or Support." }, { status: 400 });
  const v = body.visitor || {};
  const name = String(v.name || "").trim();
  const email = String(v.email || "").trim();
  const phone = String(v.phone || "").trim();
  const company = String(v.company || "").trim();
  if (!name || !email || !phone || !company) {
    return Response.json({ error: "Name, email, phone and company are all required." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  // The visitor's first line — localized preset sent by the widget, or the
  // default English opener.
  const preset = (typeof body.preset === "string" && body.preset.trim())
    ? body.preset.trim().slice(0, 4000)
    : (CHAT_TOPICS.find((t) => t.key === topic)?.preset || "");
  const room = await createRoom({ topic, visitor: { name, email, phone, company }, preset });
  // Return only what the visitor needs — not the internal record.
  return Response.json({ roomId: room.id, token: room.token, topic });
}
