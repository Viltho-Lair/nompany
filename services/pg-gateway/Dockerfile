# syntax=docker/dockerfile:1
#
# THE BUILD CONTEXT IS THE REPOSITORY ROOT, NOT THIS FOLDER.
#
#   docker build -f services/pg-gateway/Dockerfile -t <tag> .
#                                                          ^ load-bearing
#
# That is not a preference. This service imports src/platform/db/sqlGuards.ts
# and src/platform/db/pgClientGuard.ts, deliberately: those guards also run
# inside pg.ts, and a copy of a guard is a guard that drifts from the one it
# mirrors — the copy that drifts being the one in front of a remote SQL
# endpoint. A context of services/pg-gateway/ cannot see them and the build
# fails on the import. `gcloud run deploy --source=services/pg-gateway` has the
# same defect for the same reason, which is why the runbook does not use it.
#
# BUNDLED RATHER THAN COPIED, which is why no loader hook exists anywhere in
# this service any more: sqlGuards.ts reaches its sibling with an extensionless
# `./keys` (CLAUDE.md's house rule, and what a bundler expects), and plain
# Node's resolver cannot follow that. esbuild resolves it at build time. The
# service used to carry a start.mjs that registered tests/loader.mjs to fill the
# extension in at runtime — a deployable reaching into tests/ — and that file
# is gone: `npm start` and this image now run the same bundle.

# ---- build ------------------------------------------------------------------
FROM node:22-slim AS build
WORKDIR /repo

# Dependencies first, so a source-only change does not re-resolve the tree.
# devDependencies included on purpose — esbuild is one, and the build needs it.
COPY services/pg-gateway/package.json services/pg-gateway/package-lock.json ./services/pg-gateway/
RUN cd services/pg-gateway && npm ci

# Both halves of the source: the service, and the shared guards it imports.
COPY services/pg-gateway/src ./services/pg-gateway/src
COPY services/pg-gateway/tsconfig.json ./services/pg-gateway/
COPY src/platform/db ./src/platform/db

# `npm run build`, NOT an esbuild command spelled out again here. The flags live
# once, in package.json, so the bundle this image runs is byte-for-byte the one
# a developer gets from `npm start`; a second copy of them is a second thing to
# keep in step. `--packages=external` is among them, and keeps pg and the Cloud
# SQL connector as real node_modules in the runtime stage rather than inlining
# them: the connector loads native and dynamically-resolved pieces that do not
# survive bundling.
RUN cd services/pg-gateway && npm run build

# ---- runtime ----------------------------------------------------------------
FROM node:22-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Production dependencies only — the bundle already contains this repo's own
# code, and esbuild was a build-stage tool that has no business shipping.
COPY services/pg-gateway/package.json services/pg-gateway/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /repo/services/pg-gateway/dist ./dist

# Non-root: the image ships a `node` user and nothing here needs privileges.
USER node

# NO INIT PROCESS, AND NONE IS NEEDED FOR SIGNALS. Node runs as PID 1 here, so
# it gets no DEFAULT signal handling — but main.ts installs SIGTERM and SIGINT
# handlers explicitly, and an explicit handler is honoured at PID 1 just as it
# is anywhere else. Cloud Run sends SIGTERM before evicting an instance and the
# service drains on it: stop listening, close the pool, which rolls back any
# transaction still open rather than leaving Postgres holding row locks until it
# notices the socket is gone. (`--init` would only add zombie reaping, and this
# process forks nothing.)

# Cloud Run supplies PORT; the service reads it. Documented, not bound.
EXPOSE 8080

CMD ["node", "dist/main.mjs"]
