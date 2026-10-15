# API Gate — Implementation Plan

Companion to [ARCHITECTURE.md](ARCHITECTURE.md). Phase 1 (architecture) is complete once reviewed. Each phase below ends with a stop for review; do not combine phases.

## Phase 2 — Sample API
**Deliverables:** `package.json` + lockfile, strict `tsconfig.json`, `.nvmrc`, `.gitignore`, `src/app.ts` (routes, error handler), `src/server.ts` (listen on `PORT`, bind `127.0.0.1`), Zod validation, in-memory order store with seed data, status state machine, `typecheck`/`build`/`start` scripts. `git init` and first commit.
**Done when:** `npm ci && npm run build && npm start` works; every endpoint in ARCHITECTURE §6 answers manually (curl/PowerShell); no `any`; no stack traces in error bodies.

## Phase 3 — API contract and test suite
**Deliverables:** Vitest config (reporters `default` + `junit` → `reports/`), `fetch` helper with loopback guard, ~17 tests by category (§7), `test:api` script.
**Done when:** suite passes against a running local API; repeated runs pass; **a deliberately broken assertion makes `npm run test:api` exit non-zero (exit code shown in evidence)**; JUnit XML is produced; tests are order-independent.

## Phase 3b — Local test execution hardening *(fold into Phase 3 if trivial)*
**Deliverables:** documented two-terminal run; confirm behaviour when API is down (clear failure, not a hang); decide whether a one-command runner is needed.
**Done when:** a developer can reproduce results from README commands alone.

## Phase 4 — GitHub Actions workflow
**Deliverables:** `.github/workflows/ci.yml` per §8, SHA-pinned actions, Dependabot config for Actions ➕, public GitHub repository created.
**Done when:** a PR triggers the run; API starts, readiness passes, tests run, artifacts upload; **background-process-across-steps assumption confirmed** (or fallback adopted); workflow linted.

## Phase 5 — Passing and failing pipeline verification
**Deliverables:** evidence (run links, screenshots) for scenarios on throw-away branches only, never main:
- A green run
- B behaviour regression (e.g. 201→200): gate red, artifacts present, deploy skipped
- C startup failure and readiness timeout: fails fast with `api.log`
- D restore: green again
- Cancelled run: deploy skipped
- 🔧 Branch protection / ruleset requiring `API Quality Gate`; screenshot of a blocked PR
**Done when:** each acceptance item in ARCHITECTURE §14 is ticked with evidence or explicitly marked NOT VERIFIED.

## Phase 6 — Deployment gate
**Deliverables:** `deploy-simulated` job (labelled SIMULATED), optional GitHub Environment ➕.
**Done when:** matrix observed in real runs — success → runs; failure → skipped; cancelled → skipped; skipped upstream → skipped.

## Phase 7 — README and portfolio evidence
**Deliverables:** README with the three gates explained separately, pipeline diagram, reproduction steps for scenarios A–D, screenshots, limitations, tool-choice rationale (why not Postman/Newman), badge only after the workflow actually runs.
**Done when:** a stranger can understand what is tested, when it runs, what happens on failure, and what blocks merge vs. deploy within a couple of minutes; no unverified claims remain.
