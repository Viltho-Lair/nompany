import { OtpScreen } from "../../../_components/auth";

export const metadata = { title: "Two Factor V2" };

export default function Page() {
  return (
    <OtpScreen
      variant="v2"
      title="Two-Factor Authentication"
      sub="Open your authenticator app and enter the current code."
      cta="Confirm"
    />
  );
}
