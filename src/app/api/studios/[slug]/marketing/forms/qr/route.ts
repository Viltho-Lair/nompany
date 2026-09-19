// A FORM'S QR CODE — ?id=<form>, as an SVG to print on a flyer or a stand. Drawn
// on the server, so the browser downloads a picture and no QR library.
import QRCode from "qrcode";
import { route, refused } from "@/platform/http/route";
import { marketingContext } from "@/modules/marketing/campaigns";
import { getForm } from "@/modules/marketing/forms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route({ auth: "studio", context: marketingContext, name: "marketing-form-qr" }, async (m) => {
  const url = new URL(m.request.url);
  const result = await getForm(m, url.searchParams.get("id") || "");
  if (refused(result)) return result;
  const svg = await QRCode.toString(`${url.origin}${result.path}`, { type: "svg", margin: 2, errorCorrectionLevel: "M" });
  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      ...(url.searchParams.get("download") ? { "Content-Disposition": `attachment; filename="form-${result.form.code}.svg"` } : {}),
      "Cache-Control": "no-store",
    },
  });
});
