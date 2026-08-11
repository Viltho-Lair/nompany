import { OtpScreen } from "../../../_components/auth";

export const metadata = { title: "Two Factor V1" };

export default function Page() {
  return (
    <OtpScreen
      variant="v1"
      title="Two-Factor Authentication"
      sub="Open your authenticator app and enter the current code."
      cta="Confirm"
    />
  );
}
