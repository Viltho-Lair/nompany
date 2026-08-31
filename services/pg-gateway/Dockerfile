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
# BUNDLED RATHER THAN COPIED, which is what lets the container drop the loader
# hook in start.mjs: sqlGuards.ts reaches its sibling with an extensionless
# `./keys` (CLAUDE.md's house rule, and what a bundler expects), and plain
# Node's resolver cannot follow that. esbuild resolves it at build time. The
# hook start.mjs borrows from tests/loader.mjs — a deployable reaching into
# tests/ — is therefore absent from the image entirely.

# ---- build ------------------------------------------------------------------
FROM node:22-slim AS build
WORKDIR /repo

# Dependencies first, so a source-only change does not re-resolve the tree.
COPY services/pg-gateway/package.json services/pg-gateway/package-lock.json ./services/pg-gateway/
RUN cd services/pg-gateway && npm ci

# Both halves of the source: the service, and the shared guards it imports.
COPY services/pg-gateway/src ./services/pg-gateway/src
COPY services/pg-gateway/tsconfig.json ./services/pg-gateway/
COPY src/platform/db ./src/platform/db

# `--packages=external` keeps pg and the Cloud SQL connector as real node_modules
# in the runtime stage rather than inlining them: the connector loads native and
# dynamically-resolved pieces that do not survive bundling.
RUN cd services/pg-gateway && npx --yes esbuild@0.25.10 src/container-entry.ts \
      --bundle --platform=node --format=esm --target=node22 \
      --packages=external --outfile=dist/main.mjs

# ---- runtime ----------------------------------------------------------------
FROM node:22-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Production dependencies only — the bundle already contains this repo's own code.
COPY services/pg-gateway/package.json services/pg-gateway/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /repo/services/pg-gateway/dist ./dist

# Non-root: the image ships a `node` user and nothing here needs privileges.
USER node

# NO INIT PROCESS, and that is a live gap rather than a decision. Node runs as
# PID 1 here, where it receives no default signal handling — Cloud Run sends
# SIGTERM before evicting an instance, and a process that ignores it is killed
# mid-transaction rather than draining. The service does not install a SIGTERM
# handler yet. Either it grows one, or this gains `--init`; until then an
# eviction can cut a transaction short. Recorded in the functionality doc.

# Cloud Run supplies PORT; the service reads it. Documented, not bound.
EXPOSE 8080

CMD ["node", "dist/main.mjs"]
