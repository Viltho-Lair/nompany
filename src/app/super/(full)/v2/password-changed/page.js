import { NoticeScreen } from "../../../_components/auth";
import { BASE } from "../../../_components/nav";

export const metadata = { title: "Password Changed V2" };

export default function Page() {
  return (
    <NoticeScreen
      variant="v2"
      icon="check"
      tone="success"
      title="Password Changed"
      sub="Your password was updated successfully. You can sign in with the new one now."
      cta="Back to Sign In"
      ctaHref={`${BASE}/v2/login`}
    />
  );
}
