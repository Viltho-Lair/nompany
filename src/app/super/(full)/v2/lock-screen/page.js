import { LockScreen } from "../../../_components/auth";
import { CURRENT_USER } from "../../../_components/session";

export const metadata = { title: "Lock Screen V2" };

export default function Page() {
  return (
    <LockScreen variant="v2" user={CURRENT_USER} />
  );
}
