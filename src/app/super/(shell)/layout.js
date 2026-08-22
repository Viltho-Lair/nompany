import { redirect } from "next/navigation";
import Shell from "../_components/Shell";
import { currentSuperAdmin, publicSuperAdmin } from "@/platform/auth/superAuth";

// THE gate for the console. Every page under (shell) renders inside the sidebar
// + header chrome, and none of them render at all without a valid `nc_super`
// session: the cookie is checked against the stored token list here, server
// side, before any child is asked for markup.
//
// The edge redirect in src/proxy.js only looks at whether the cookie EXISTS —
// the edge cannot reach Redis. This layout is where the claim is actually
// verified, so a hand-written cookie gets a redirect from here, not a console.
export default async function ShellLayout({ children }) {
  const admin = await currentSuperAdmin();
  if (!admin) redirect("/super");
  return <Shell admin={publicSuperAdmin(admin)}>{children}</Shell>;
}
