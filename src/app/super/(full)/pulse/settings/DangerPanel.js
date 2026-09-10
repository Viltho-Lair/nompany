import { Card, CardHead, CardBody } from "../../../_components/ui";

/* THE DANGER ZONE, ITS OWN TAB — the owner asked for it moved out of the
   profile panel, where it sat under an unrelated form.

   ⚠️ NONE OF THESE THREE BUTTONS IS WIRED TO ANYTHING, and that was true before
   this move as well. Transfer, export and delete each render a destructive
   button with no handler and no endpoint behind it. Giving them a NAMED
   DESTINATION makes that worse rather than better: a tab called Danger zone
   reads as a place where those things happen.

   Left standing rather than deleted because removing three controls is a
   decision about the product, not about a layout — and the layout is what was
   asked for. It is flagged here, and to the owner, so it is a choice rather
   than an oversight. The console has deleted exactly this shape twice before:
   the API keys card and the notification Preferences panel, both removed on the
   rule that a control which does nothing is a promise the product does not
   keep. */
export default function DangerPanel() {
  return (
    <Card style={{ borderColor: "var(--ad-destructive)" }}>
      <CardHead title="Danger Zone" sub="These actions are irreversible" />
      <CardBody>
        <div className="space-y-3">
        {[
          { title: "Transfer platform ownership", body: "Hand the super-admin role to another account. You will lose owner access immediately.", cta: "Transfer" },
          { title: "Export all platform data", body: "Generate a full archive of every studio, user and transaction record.", cta: "Request export" },
          { title: "Delete account", body: "Permanently remove this super-admin account. Studios are unaffected.", cta: "Delete" },
        ].map((d) => (
          <div
          key={d.title}
          className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4"
          style={{ borderColor: "var(--ad-border)" }}
          >
          <div className="min-w-0">
            <p className="text-sm font-500">{d.title}</p>
            <p className="mt-0.5 text-xs text-[var(--ad-muted-foreground)]">{d.body}</p>
          </div>
          <button type="button" className="ad-btn ad-btn-destructive ad-btn-sm shrink-0">{d.cta}</button>
          </div>
        ))}
        </div>
      </CardBody>
    </Card>
  );
}
