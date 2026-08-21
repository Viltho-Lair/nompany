import { PageHeader, Row, Col } from "../../../_components/ui";
import { BASE } from "../../../_components/nav";
import MfaCard from "./MfaCard";

export const metadata = { title: "Security · Console" };

// THE CONSOLE'S OWN SECURITY SCREEN, and the first one here that is real.
//
// settings/profile has a "Security" tab showing three sessions, three API keys
// and a device list — all of them hardcoded arrays in the page file. It is a
// design surface, which is fine and clearly labelled as such elsewhere, but it
// means the console has never had a screen that could tell you anything true
// about its own access.
//
// This one talks to /api/super/mfa and shows what is actually stored. Sessions
// come next: superAuth already keeps `sessionTokens` with digests and expiries,
// which is the data a real list needs — it has simply never been rendered.
export default function ConsoleSecurityPage() {
  return (
    <>
      <PageHeader
        title="Security"
        breadcrumb={[{ label: "Settings", href: `${BASE}/settings/profile` }, { label: "Security" }]}
      />
      <Row>
        <Col span={7}>
          <MfaCard />
        </Col>
      </Row>
    </>
  );
}
