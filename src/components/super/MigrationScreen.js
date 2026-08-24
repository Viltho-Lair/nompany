import { Card, CardHead, CardBody, Row, Col, Badge, Dot, Table, Icon } from "@/app/super/_components/ui";
import MigrationExport from "@/components/super/MigrationExport";

// The console's window onto the Redis → SQL Server cutover. READ-ONLY on purpose:
// the design of record is docs/database-migration-mssql.md, the migration is a
// Wave 2+ item gated behind Gate A, and REDIS_URL is the live shared instance —
// so this screen SHOWS the staged plan, it does not run a stage of it. Every
// datum below is transcribed from that doc; when the doc's stage advances, the
// `current` flag moves with it.
//
// Server component: no state, no fetch, no client boundary. It is a static read
// of a plan, which is exactly what a Card/Table composition off ui.js is for.

// The six stages, in order. `current` marks where the programme actually is —
// Stage 0 is not started because nothing above it (Gate A) is green yet.
const STAGES = [
  {
    n: 0,
    title: "Schema + adapter",
    detail:
      "SQL Server provisioned in-region; repo/sql.ts written; the golden suite runs green against BOTH adapters in CI. Nothing in production changes.",
    reads: "Redis",
    current: true,
  },
  {
    n: 1,
    title: "Backfill",
    detail:
      "Per studio, read every key under s:<id>:* and insert into SQL inside one transaction. Read-only against Redis. Idempotent (MERGE on PK), resumable, re-runnable; a checksum per collection.",
    reads: "Redis",
  },
  {
    n: 2,
    title: "Dual-write · read Redis",
    detail:
      "Every mutation writes Redis FIRST (still the source of truth), then SQL. A SQL failure logs loudly and does not fail the request. A nightly reconciler reports drift. The safety period.",
    reads: "Redis",
  },
  {
    n: 3,
    title: "Dual-write · read SQL",
    detail:
      "A per-studio flag flips reads to SQL — one internal studio, then 5%, then all. Redis is still written, so rollback is a flag flip with no data to recover.",
    reads: "SQL Server",
  },
  {
    n: 4,
    title: "SQL is the source of truth",
    detail:
      "Writes go to SQL inside transactions. Redis writes stop for migrated collections. Redis keeps otp, rate limits, chat, fx, events, pub/sub and (optionally) sessions.",
    reads: "SQL Server",
  },
  {
    n: 5,
    title: "Decommission",
    detail:
      "After a full retention window with clean reconciliation, delete the migrated key prefixes. Keep one final export.",
    reads: "SQL Server",
  },
];

// What each Redis role becomes. Sorting the roles is the first real step of the
// migration — three of them must NOT move, and that is the point of the table.
const ROUTING = [
  { role: "Document store — collections, registries", where: "g:*, s:*, u:*", dest: "SQL Server — tables", tone: "primary" },
  { role: "Uniqueness claims", where: "ix:email, ix:slug, ix:owner", dest: "SQL — UNIQUE constraints", tone: "primary" },
  { role: "Lookup index", where: "ix:collab", dest: "SQL — the Collaborator index", tone: "primary" },
  { role: "Monotonic counters", where: "s:<id>:counters", dest: "SQL — SEQUENCE / Counter table", tone: "primary" },
  { role: "Sessions (TTL)", where: "ix:session:<token>", dest: "Stay in Redis — hashed, EX expiry", tone: "info" },
  { role: "Ephemeral auth, rate limits, chat, FX cache", where: "otp:, rl:, chat:, fx:", dest: "Stay in Redis — TTL is policy", tone: "info" },
  { role: "Event log", where: "s:<id>:events (stream)", dest: "Stay in Redis — the client's cursor", tone: "info" },
  { role: "Pub/sub doorbell", where: "ev:*, nt:*", dest: "Stay in Redis", tone: "info" },
  { role: "Binary blobs", where: "g:media:*", dest: "Vercel Blob — never SQL, never Redis", tone: "warning" },
];

// The eight guarantees the cutover must carry across intact. Breaking one is a
// data-loss or correctness bug, not a cosmetic regression.
const INVARIANTS = [
  "Ids preserved verbatim — every URL, cross-reference and generated document depends on it.",
  "Reference numbers only move forward — the counter floor semantics, exactly.",
  'The function-patch update — "flip" must stay "flip", never "set to what I last saw".',
  "Per-collection ordering that Redis gave for free — any code that relied on it gets an explicit transaction.",
  "The event stream and pub/sub stay in Redis — they are not records.",
  "TTL-as-policy stays in Redis — OTP, rate limits, chat rooms.",
  "KEY_PREFIX isolation becomes a separate test database, never a shared one with a prefix column.",
  "Soft delete replaces prefix deletion — ON DELETE CASCADE on every child keeps the cascade idempotent.",
];

function StageRow({ stage }) {
  return (
    <li className="relative flex gap-4 pb-6 last:pb-0">
      {/* The connecting rail. Absolute so the dot sits on it; hidden on the last
          row so the line does not dangle past the final stage. */}
      <span
        className="absolute bottom-0 left-[7px] top-6 w-px bg-[var(--ad-border)] [li:last-child_&]:hidden"
        aria-hidden="true"
      />
      <span className="relative z-10 mt-1.5 shrink-0">
        <Dot tone={stage.current ? "primary" : "muted"} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-600 uppercase tracking-wide text-[var(--ad-muted-foreground)]">
            Stage {stage.n}
          </span>
          <h3 className="text-sm font-700 text-[var(--ad-foreground)]">{stage.title}</h3>
          {stage.current ? <Badge tone="primary">Current</Badge> : null}
          <Badge tone={stage.reads === "Redis" ? "info" : "success"}>reads {stage.reads}</Badge>
        </div>
        <p className="mt-1 text-sm text-[var(--ad-muted-foreground)]">{stage.detail}</p>
      </div>
    </li>
  );
}

export default function MigrationScreen({ studios = [] }) {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHead
          title="Redis → Microsoft SQL Server"
          sub="Move the record layer to SQL Server with zero data loss, zero downtime and exact functional parity — while gaining the indexes, joins, pagination and transactions the current model cannot express."
        />
        <CardBody className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge tone="warning">Plan not started</Badge>
            <span className="text-[var(--ad-muted-foreground)]">
              The staged cutover below is gated behind Gate A. The export panel is live now — it reads the current data
              and produces the .sql the backfill would load.
            </span>
          </div>
          <p className="text-sm text-[var(--ad-muted-foreground)]">
            Design of record: <span className="num">docs/database-migration-mssql.md</span>. The strategy is dual-write
            → backfill → verify → cut over, reversible at every stage.
          </p>
        </CardBody>
      </Card>

      <MigrationExport studios={studios} />

      <Row>
        <Col span={7}>
          <Card className="h-full">
            <CardHead title="The staged cutover" sub="Reversible at every stage; each stage names what it reads from." />
            <CardBody>
              <ol className="mt-1">
                {STAGES.map((s) => (
                  <StageRow key={s.n} stage={s} />
                ))}
              </ol>
            </CardBody>
          </Card>
        </Col>

        <Col span={5}>
          <Card className="h-full">
            <CardHead
              title="Not everything moves"
              sub="Three Redis roles must stay — TTL-as-policy and the event stream are what Redis is for."
            />
            <CardBody full>
              <Table head={["Redis role", "Destination"]}>
                {ROUTING.map((r) => (
                  <tr key={r.role}>
                    <td>
                      <div className="font-500 text-[var(--ad-foreground)]">{r.role}</div>
                      <div className="num text-xs text-[var(--ad-muted-foreground)]">{r.where}</div>
                    </td>
                    <td>
                      <Badge tone={r.tone}>{r.dest}</Badge>
                    </td>
                  </tr>
                ))}
              </Table>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Card>
        <CardHead
          title="What must not be lost"
          sub="Eight guarantees the cutover carries across intact — breaking one is a correctness bug, not a cleanup."
        />
        <CardBody>
          <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {INVARIANTS.map((text, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-[var(--ad-muted-foreground)]">
                <span className="mt-0.5 shrink-0 text-[var(--ad-success)]">
                  <Icon name="check" className="h-4 w-4" />
                </span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
