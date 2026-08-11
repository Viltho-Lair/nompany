import { NoticeScreen } from "../../../_components/auth";
import { BASE } from "../../../_components/nav";

export const metadata = { title: "Account Disabled V1" };

export default function Page() {
  return (
    <NoticeScreen
      variant="v1"
      icon="lock"
      tone="danger"
      title="Account Disabled"
      sub="This account has been suspended. Contact platform support to restore access."
      cta="Contact Support"
      ctaHref={`${BASE}/docs`}
      secondary={<>Reference ID: <span className="font-medium">ACC-4471-QX</span></>}
    />
  );
}
