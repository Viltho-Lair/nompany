import { LockScreen } from "../../../_components/auth";
import { CURRENT_USER } from "../../../_components/session";

export const metadata = { title: "Lock Screen V1" };

export default function Page() {
  return (
    <LockScreen variant="v1" user={CURRENT_USER} />
  );
}
