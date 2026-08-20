// LINTING — and a deliberate view about what a linter is for here.
//
// There was no config at all, while `package.json` declared `next lint`. So the
// script either prompted or failed, which is the same as having no linter and
// worse than admitting it.
//
// WHAT THIS DOES NOT TRY TO BE. The rules that actually matter in this codebase
// are architectural — keys built only in keys.js, every permission enforced
// somewhere, every route authenticated, tenant data never crossing a studio
// boundary — and none of them is expressible as a lint rule. They are asserted
// in tests/gate-a.mjs by scanning the source, where they can state the property
// rather than approximate it.
//
// So this stays close to Next's recommended set and adds only the handful of
// rules that catch things review reliably misses, each with a reason. A long
// list of style rules would generate noise, and noise is how a linter comes to
// be run with --quiet and then not at all.

// eslint-config-next 16 exports FLAT config directly. The FlatCompat shim that
// most examples still show is for older versions, and here it fails outright —
// it tries to JSON.stringify a plugin object that references itself, so the
// error you get is "Converting circular structure to JSON" rather than anything
// about configuration. Importing the array is both correct and simpler.
import next from "eslint-config-next/core-web-vitals";

export default [
  {
    ignores: [
      ".next/**", "node_modules/**", "tests/goldens/**",
      // .claude/worktrees holds FULL CHECKOUTS of this repository — a git
      // worktree per parallel session. Linting them reported 8791 of 8998
      // problems, which is not a codebase with a quality problem, it is a
      // linter reading the same files four times. The headline number was 97%
      // noise, and a headline number that is 97% noise is how a linter stops
      // being run.
      ".claude/**",
      // The Electron task-bar is a separate project with its own runtime and no
      // build step; linting it from here would only report that it is not Next.
      "../nompany-task-bar/**",
    ],
  },

  ...next,

  {
    rules: {
      // `==` against null is idiomatic here (`raw == null` in the store means
      // "absent or null" on purpose); everything else must be strict.
      eqeqeq: ["error", "always", { null: "ignore" }],

      // An unused import is usually the residue of a removal that did not finish
      // tracing its dependants — which is the exact failure mode the removal
      // rules in the agent files warn about.
      "no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        ignoreRestSiblings: true,
      }],

      // console.* is now a lint error rather than a convention. Structured
      // logging with a request id went in alongside this (src/lib/observability
      // .js); a bare console.error is a line nobody can trace back to the
      // request that produced it.
      "no-console": "error",

      // Reading a value you have already narrowed to null is the shape of most
      // "cannot read property of undefined" in production.
      "no-constant-binary-expression": "error",
    },
  },

  {
    // The logger IS the writer, and the tests and scripts are run by people
    // watching a terminal.
    files: ["src/lib/observability.js", "tests/**", "scripts/**"],
    rules: { "no-console": "off" },
  },

  {
    // CLIENT COMPONENTS run in the browser, where the structured logger cannot
    // follow — it is built on node:async_hooks, and there is no request to
    // attach a line to anyway. The browser console IS the right destination
    // there, and the three that exist are deliberate dev-time warnings about
    // silent failure: a board rendered outside LiveProvider updates never, with
    // no error and no failed request, which is the one thing this codebase
    // could not otherwise tell you.
    files: ["src/components/**", "src/app/**/*.jsx"],
    rules: { "no-console": ["warn", { allow: ["error", "warn"] }] },
  },

  {
    // KNOWN BACKLOG, recorded as warnings rather than deleted or left failing.
    //
    // react-hooks/set-state-in-effect fires 68 times, almost entirely in the
    // twelve studio modules and the /super screens — components that fetch in
    // useEffect and setState with the result, which is the pattern
    // docs/ui-ux-overhaul.md section 6 exists to replace with server components.
    // They are real findings and they are Wave 4's list, not a reason to fail
    // every build until Wave 4 arrives.
    //
    // Downgraded, NOT disabled, and the count is gated in CI (scripts/
    // lint-budget.mjs) so it can only go down. A rule turned off is a rule
    // nobody will turn back on.
    files: ["src/**"],
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/immutability": "warn",
      "react/no-unescaped-entities": "warn",
      "@next/next/no-assign-module-variable": "warn",
    },
  },
];
