import { OtpScreen } from "../../../_components/auth";

export const metadata = { title: "Verify Email V2" };

export default function Page() {
  return (
    <OtpScreen
      variant="v2"
      title="Verify Email"
      sub="We sent a 6-digit code to your inbox. Enter it below to confirm your address."
      cta="Verify Email"
    />
  );
}
