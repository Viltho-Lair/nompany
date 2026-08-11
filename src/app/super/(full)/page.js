import { LoginScreen } from "../_components/auth";
import { SUPER_ADMIN_EMAIL } from "../_components/session";

// /super — the super-admin sign-in, built on the console's Login V2 layout.
// The form is inert: this route is a design surface and deliberately does not
// touch src/lib/superAuth.js or the database.

export const metadata = { title: "Sign in" };

export default function SuperLoginPage() {
  return <LoginScreen variant="v2" email={SUPER_ADMIN_EMAIL} />;
}
