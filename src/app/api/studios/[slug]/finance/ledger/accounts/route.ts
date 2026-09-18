import { route, refused } from "@/platform/http/route";
import { financeContext } from "@/modules/finance/finance";
import { listAccounts, createAccount, editAccount } from "@/modules/finance/ledger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// THE CHART OF ACCOUNTS, EDITABLE. The chart seeded itself and nothing could add
// to it, rename it or retire from it — a studio kept whatever seventeen accounts
// it was given. Its own route rather than a verb on the ledger's: that route has
// no PUT on purpose, because a posted ENTRY is never edited, and an account is
// not an entry. Permission is the service's (`finance.ledger.*`).
const spec = { auth: "studio", context: financeContext, body: true, name: "finance-ledger-accounts" };

export const GET = route({ ...spec, body: false }, async (f) => {
  const result = await listAccounts(f);
  if (refused(result)) return result;
  return { ok: true, accounts: result.accounts };
});

export const POST = route(spec, async (f) => {
  const result = await createAccount(f, f.body);
  if (refused(result)) return result;
  return { status: 201, body: { ok: true, account: result.account } };
});

// NO DELETE. An account's postings are history; retiring it (`active: false`)
// is the way out, and `editAccount` says when that is refused.
export const PUT = route(spec, async (f) => {
  if (!f.body.id) return { error: "missing" };
  const result = await editAccount(f, String(f.body.id), f.body);
  if (refused(result)) return result;
  return { ok: true, account: result.account };
});
