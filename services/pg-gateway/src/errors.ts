// ONE ERROR TYPE, AND WHAT SEPARATES IT FROM EVERY OTHER ONE.
//
// A `Refused` is a decision this service made about the request BEFORE
// Postgres was asked anything: a malformed body, a statement shape the guards
// will not run, a schema statement inside a tenant batch. It maps to 4xx and
// it is safe to send its message back, because the message is about the
// caller's own request and the caller is this project's own application.
//
// Everything else — a Postgres error, a connection that died mid-transaction,
// a bug in here — maps to 500 and is logged rather than described in detail to
// the caller. The distinction matters because the two say different things to
// whoever is reading: a 400 means the app sent something the gateway will
// never run, and no amount of retrying changes that; a 500 means the database
// path failed and retrying might.
//
// config.ts also throws this, with status 500, for a refusal at BOOT — a
// missing address, or a password-shaped variable in an environment that must
// hold none. Those never reach a response, and the status is there only so a
// stray one could not be mistaken for something the caller did wrong.
export class Refused extends Error {
  readonly status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "Refused";
    this.status = status;
  }
}

export function isRefused(e: unknown): e is Refused {
  return e instanceof Refused;
}
