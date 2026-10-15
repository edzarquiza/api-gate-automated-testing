# API Gate — Architecture

**Status:** Design plus Phases 2–5 implemented. What has and has not been verified on GitHub is recorded in [§17](#17-final-verification-2026-10-15); statements elsewhere in this document that predate that evidence are design intent, not proof.
**Research date:** 2026-10-15
**Legend:** ✅ supported by official docs read on the research date · ⚠️ UNVERIFIED (docs did not state it; must be proven in a later phase) · 🔧 manual GitHub setting (not enforced by YAML) · ➕ optional

---

## 1. Project purpose and portfolio objectives

API Gate is a small TypeScript pipeline that builds and starts a sample API in GitHub Actions, runs automated API tests against the *running* process, publishes test reports, and blocks the deployment stage when a required test fails.

The API is a **test target**. The product is the pipeline.

The centrepiece demonstration:

> Introduce a controlled regression → a required test fails → the `API Quality Gate` job fails → the deploy job is skipped → reports are still downloadable → restore the code → everything is green.

Skills shown: REST API testing, contract/negative/regression tests, failure propagation, GitHub Actions design, reporting, least-privilege CI, and honest verification.

## 2. Functional scope and non-goals

**In scope:** 5 endpoints, in-memory data, ~17 tests, one workflow, one required check, one *simulated* deploy job.

**Non-goals (deliberate):** database, Docker, authentication, frontend, custom dashboards, real hosting, AI, multiple test frameworks, coverage metrics, DELETE endpoint, test-only backdoor endpoints, path-filtered workflows.

## 3. Tool comparison and recommendation

| Option | Free to run locally | CI suitability | Account required | Reporting | Complexity |
|---|---|---|---|---|---|
| **Vitest + `fetch`** (code-based) | ✅ MIT-licensed npm package | ✅ plain `npm` command; has a `github-actions` reporter | None | ✅ `default`, `junit`, `json`, `html`, `github-actions` (job summary + annotations) | Low |
| Postman CLI | ✅ local file path run needs no login | ⚠️ not an npm dependency; install method and CI terms not confirmed in fetched docs | Not for local-file runs ✅; required to send results to Postman Cloud | ✅ `cli`, `json`, `junit`, `html` via `--reporters` | Medium |
| Newman | ✅ | Works, but **no longer maintained** and does not support the collection v3 format (Postman v12+); Postman docs say to migrate to Postman CLI | None | JUnit etc. | Medium |
| Bruno CLI | ✅ MIT, `@usebruno/cli` | ✅ plausible | None stated | ✅ JSON, JUnit, HTML | Medium; ⚠️ exit-code behaviour and paid-feature boundary not confirmed from docs read |

### Recommendation: **Vitest with Node's built-in `fetch`**, no Supertest

Decision records (Decision / Reason / Alternative / Trade-off / Consequence):

1. **Primary runner = Vitest.**
   *Reason:* a failed `expect` makes the process exit non-zero (⚠️ standard behaviour, to be proven in Phase 3); tests are TypeScript, diffable, and live next to the API; JUnit + GitHub job-summary reporters are built in; no account, token, or separate binary.
   *Alternative:* Postman CLI. Its CLI exit behaviour is documented only generically ("standard convention of exit code 0 for success and non-zero for failure"), its install is a separate binary, and the repo-stored collection format is moving to a new version (Native Git / v3) — more moving parts for the same gate.
   *Trade-off:* loses the "Postman" keyword that recruiters may scan for, and loses the GUI-collection story. The brief explicitly allows "a better justified free alternative".
   *Consequence:* ➕ a Postman collection export could be added later as a non-gating extra, but the CLAUDE.md rule against multiple competing frameworks means it is out of the MVP.

2. **`fetch` instead of Supertest.** Supertest's main value is booting an Express app in-process without a port. This project's whole point is testing a *separately started* server after a readiness check, so tests talk HTTP to `API_BASE_URL`. Node 24 ships `fetch`; one fewer dependency. *Trade-off:* slightly more verbose requests; mitigated by a ~20-line helper.

3. **No schema-validation library in tests.** Tests assert contracts with explicit, hand-written expectations (types, required keys). Reusing the API's own Zod schemas in tests would make contract tests circular (the implementation would validate itself). *Trade-off:* a bit more assertion code; *Consequence:* an accidental schema change in the API is caught by an independent definition of the contract.

4. **Runtime request validation with Zod in the API only.** Needed for CLAUDE.md's "validate input at runtime, keep types and validation consistent". ⚠️ Zod is the only runtime dependency beyond Express; confirm it is still the right choice at Phase 2.

5. **In-memory store, no database, no Docker.** A DB adds nothing to *API testing* here; the process restarts clean on every CI run, which gives free isolation. *Limitation:* state is lost on restart, and concurrent test files share one store (handled in §7). Docker would only add image-build time; the runner already provides Node.

6. **Simulated deployment.** Free hosts introduce sleep/cold-start behaviour and tokens that do not strengthen the gate. The deploy job is a **clearly labelled simulation** (`echo`), never described as production.

## 4. Technology stack

| Concern | Choice | Notes |
|---|---|---|
| Runtime | Node.js **24 (Active LTS)** | Release schedule on 2026-10-15: v24 Active LTS (Maintenance from 2026-10-20, EOL 2028-04-30); v22 Maintenance (EOL 2027-04-30); v26 is Current until it becomes LTS on 2026-10-28. Pin v24 via `.nvmrc`/`engines` and `setup-node`. Local machine has Node 24.19.0 / npm 11.17.0. |
| Language | TypeScript (installed: 7.0.2; Express 5.3.0, Zod 4.6.7), `strict: true` + `noUncheckedIndexedAccess` | Compiled with `tsc` to `dist/` for the CI run (`node dist/server.js`) — no `ts-node` in CI. |
| API | Express + Zod | |
| Tests | Vitest | Reporters: `default`, `junit`, `github-actions` (the latter is auto-added when `GITHUB_ACTIONS=true`, but setting `reporters` replaces defaults, so list explicitly). |
| Package manager | npm, `package-lock.json`, `npm ci` | |
| CI | GitHub Actions, `ubuntu-latest` | Free for public repos on standard runners; private Free = 2,000 min/month. |

## 5. Architecture diagram

```
Developer push / pull request to main
              |
              v
  GitHub Actions workflow "CI"
              |
              v
 ┌─────────────── job: "API Quality Gate"  (the ONE required check) ───────────────┐
 │ checkout → setup-node 24 → npm ci → typecheck → build                          │
 │      → start API in background (log → api.log, PID saved)                      │
 │      → readiness loop on GET /health (≤30 s; aborts early if PID died)         │
 │      → npm run test:api  (Vitest → exit code is the gate)                      │
 │      → [always, not on cancel] upload reports + api.log                        │
 │      → [always] stop API                                                       │
 └────────────────────────────────┬────────────────────────────────────────────────┘
                                  │
                   success        │         failure / cancelled / skipped
                      ┌───────────┴───────────┐
                      v                       v
        job: "Deploy (simulated)"      deploy job SKIPPED
        needs: quality-gate            (run shows "skipped")
        only on push to main

 🔧 Manual (not YAML): branch protection / ruleset requiring "API Quality Gate" before merge
 ➕ Optional: GitHub Environment on the deploy job
```

## 6. API endpoints and contracts

Base URL from `API_BASE_URL` (default `http://127.0.0.1:3000`). All bodies are JSON.

| Method & path | Success | Errors |
|---|---|---|
| `GET /health` | 200 `{ "status": "ok" }` | — |
| `GET /api/orders` | 200 `{ "data": Order[], "count": number }` | — |
| `GET /api/orders/:id` | 200 `Order` | 400 invalid id format, 404 not found |
| `POST /api/orders` | 201 `Order` | 400 validation |
| `PATCH /api/orders/:id` | 200 `Order` | 400 validation/invalid id, 404, 409 illegal status transition |
| any other route | — | 404 `NOT_FOUND` (same envelope) |

**Order**

| Field | Type | Rule |
|---|---|---|
| `id` | string, `ord_<digits>` | server-assigned |
| `customerEmail` | string | valid e-mail |
| `sku` | string | 1–32 chars, `[A-Z0-9-]` |
| `quantity` | integer | 1–100 |
| `unitPriceCents` | integer | ≥ 1 |
| `totalCents` | integer | **server-computed** = `quantity × unitPriceCents`; client may not send it |
| `status` | `pending \| paid \| shipped \| delivered \| cancelled` | new orders are `pending` |
| `createdAt` | ISO-8601 string | server-assigned |

`POST` body: `customerEmail`, `sku`, `quantity`, `unitPriceCents` (all required, unknown keys rejected). `PATCH` body: `{ "status": <status> }` only.

**Business rule (state machine):** `pending→paid|cancelled`, `paid→shipped|cancelled`, `shipped→delivered`; `delivered` and `cancelled` are terminal. Anything else → 409.

**Error envelope (all 4xx):**
```json
{ "error": { "code": "VALIDATION_ERROR | NOT_FOUND | INVALID_TRANSITION | INVALID_ID | MALFORMED_JSON | BAD_REQUEST",
             "message": "human-readable", "details": [{ "field": "quantity", "message": "..." }] } }
```
`details` only on validation errors. No stack traces or internal paths, ever. 5xx handler returns `INTERNAL_ERROR` with no detail.

**Implementation notes (Phase 2):** unsupported methods on known paths (e.g. `DELETE /api/orders/:id`) return 404 `NOT_FOUND`, not 405. Bodies over 10 kB return 413 with code `BAD_REQUEST`. Any other unexpected error returns 500 `INTERNAL_ERROR` with no detail (logged server-side only; not yet exercised). A missing/non-JSON body is validated as `{}` and yields 400 `VALIDATION_ERROR`. Server env: `PORT` (default 3000), `HOST` (default `127.0.0.1`); an invalid `PORT` or a port already in use exits with code 1. Source layout: `src/{app,server,orders,schemas,errors,types}.ts`.

**Seed data:** 3 fixed orders (`ord_1001`–`ord_1003`, in `pending`, `paid`, `delivered`) created at startup; new ids continue from `ord_1004`.

## 7. Test strategy and test-data isolation

**As implemented (Phase 3):** 5 files under `tests/`, **79 test cases** from about 25 table-driven behaviours (`it.each`). Case count is not a quality metric; the Phase 1 estimate of ~17 counted behaviours, not parameterised cases. Tests run over real HTTP against a separately started API (`API_BASE_URL`, default `http://127.0.0.1:3000`) using Node's `fetch`.

| File | Category | Behaviours covered |
|---|---|---|
| `health.test.ts` | Positive / contract | `/health` is 200, JSON, exactly `{status:"ok"}` |
| `orders-read.test.ts` | Positive / contract / negative | list envelope `{data,count}` with contract-valid orders incl. a just-created one; get-by-id equals the creation response; unknown id → 404; six malformed ids → 400 `INVALID_ID` |
| `orders-create.test.ts` | Positive / contract / negative | 201 + pending + echoed fields; server-computed `totalCents`; distinct ids and valid timestamp; boundary values accepted; each missing field, nine invalid values, and five client-supplied server-owned/unknown fields rejected with the offending field in `details`; multi-field errors; empty/array body; malformed JSON → `MALFORMED_JSON`; >10 kB → 413 |
| `orders-status.test.ts` | Business rule | all 5 legal transitions (200, only status changes, persisted); all 20 illegal pairs (409, order unchanged); invalid PATCH bodies (400, order unchanged); malformed JSON; unknown id → 404; bad id → 400 |
| `errors.test.ts` | Regression (cross-cutting) | unknown route and unsupported method → documented 404 envelope; one envelope across 400/404/409/413; no `X-Powered-By` |

Contract helpers in `tests/helpers.ts` (`expectValidOrder`, `expectError`) assert exact key sets, types, content type, the `totalCents` invariant, and that error bodies contain no stack/path text. They are hand-written and deliberately do not import `src/` types or Zod schemas. The *demo* regression (e.g. 201 → 200) is injected only on a temporary branch, never shipped.

**Isolation rules (implemented)**
- Seeded orders are never asserted on: every test creates its own order via `POST` and uses the returned id (`createOrder`, `createOrderInStatus`).
- No test asserts exact list length or a specific generated id.
- No test depends on another test or on file order; Vitest runs files in parallel and each test mutates only its own order.
- No reset/debug endpoint. A fresh process per CI run gives a clean store; repeated local runs against a long-lived server were verified to pass (store held 132 orders on the third run).
- `tests/global-setup.ts` fails fast with a clear message if `/health` is unreachable; `tests/config.ts` refuses non-loopback `API_BASE_URL` unless `ALLOW_NON_LOCAL_API=true`.
- No third-party network calls.

**Known diagnostic trade-off:** because every test creates its own order through a shared helper that asserts `201`, a regression in `POST` status makes dozens of tests fail with a "setup:" message (42 failures observed for 201→200), not just the one dedicated test. The gate result is correct; the failure list is noisy.

## 8. GitHub Actions workflow design

Implemented in [.github/workflows/ci.yml](.github/workflows/ci.yml) (Phase 4). Job id `quality-gate`, display name **`API Quality Gate`** (the string branch protection must require). Step order: checkout → setup-node (version from `.nvmrc`, npm cache) → `npm ci` → `npm run typecheck` → `npm run build` → start API in background (`node dist/server.js > api.log`, PID in `api.pid`) → readiness loop → `npm run test:api` → require `reports/junit.xml` (only when all prior steps succeeded) → print `api.log` (`if: failure()`) → upload artifact (`if: !cancelled()`) → stop API (`if: always()`).

Actions are pinned to commit SHAs (checkout v7.0.1, setup-node v7.1.0, upload-artifact v7.0.2; all run on node24). `.github/dependabot.yml` keeps them current. Verified GitHub behaviour is recorded in §17.

Design choices:
- **Triggers:** PRs to `main`, pushes to `main`, manual. Feature-branch pushes are covered by their PR, avoiding duplicate runs. **No `paths:` filters** — a required check from a workflow that never ran stays "Expected"/pending and blocks PRs forever.
- **One job for build + start + test.** Processes do not survive across jobs (separate runners). Confirmed on GitHub (§17): the background API survives from the start step to the readiness and test steps.
- **Readiness:** wall-clock deadline of 30 s (a plain attempt counter took 114 s on Windows, where refused connections are slow) polling `/health` with `curl --max-time 2`; each iteration first checks the saved PID is alive (a crash fails in ~1 s with `api.log` printed, not after 30 s); timeout also prints `api.log` and exits 1.
- **Failure propagation:** no `continue-on-error`, no `|| true` except on the best-effort `kill`. `upload-artifact` uses `!cancelled()` (not `always()`) so a cancelled run doesn't hang on uploads; the earlier failed step still determines the job result. Upload failure is a *new* failure; it can never turn a red job green.
- **Concurrency:** PR runs for the same ref cancel superseded runs; `main` runs never cancel so deploy decisions are not lost mid-flight.
- **Action pinning:** third-party/`actions/*` pinned to full commit SHAs with the version in a comment (GitHub's hardening guide recommends SHA pinning). Cost: manual or Dependabot bumps.
- **Reproducibility:** `npm ci` from the lockfile; Node from `.nvmrc`.
- **Report handling:** upload uses `if-no-files-found: warn` so an early failure (e.g. `npm ci`) is not buried under a second, unrelated error; a green run without `reports/junit.xml` still fails via the "Require JUnit report" step. Artifact name is `api-gate-diagnostics-<run_attempt>`, retained 14 days.
- **Server start:** `node dist/server.js` rather than `npm start` (identical command) so `$!` is the server's own PID for crash detection and cleanup.

## 9. The three gates

| # | Gate | Outcome | How achieved | Enforced by |
|---|---|---|---|---|
| A | **CI quality gate** | Failed required test ⇒ `API Quality Gate` job red | Test command's non-zero exit fails its step; nothing masks it | Workflow YAML |
| B | **Merge protection** | PR cannot merge while the check is red | 🔧 Branch protection rule or ruleset on `main` requiring status check `API Quality Gate` | **Repository settings, not YAML** |
| C | **Deployment protection** | Deploy job does not execute unless validation succeeded | `needs: quality-gate` (implicit `success()`: *"If a job fails or is skipped, all jobs that need it are skipped unless the jobs use a conditional expression"*) plus an explicit `needs.quality-gate.result == 'success'` | Workflow YAML |

Important pitfalls found during research:
- **A skipped required check counts as passing** for protected branches (docs: required checks must be `successful`, `skipped`, or `neutral`). So: the required check must be the job that always runs on PRs (`API Quality Gate`), **never the deploy job**, and the deploy job must not use `always()`.
- **Plan/visibility:** protected-branch features for *private* repos are listed under GitHub Pro/Team, not Free. Rulesets are documented for Team/Enterprise; their Free-plan availability was not stated on the pages read. **Decision proposed: make the repo public.** ⚠️ Branch protection on a public Free repo is not stated in the pages fetched — verify in the Settings UI at Phase 5 and record screenshots.
- **Hosting integrations** (e.g. a host auto-deploying on push) would bypass the gate. Not used; deploy stays inside this workflow.
- Deployment verification matrix (Phase 6): validation **success → deploy runs**, **failure → skipped**, **cancelled → skipped**, **skipped upstream → skipped**. All ⚠️ NOT VERIFIED until observed in real runs.

## 10. Failure handling and reporting

| Condition | Expected result | Diagnostics |
|---|---|---|
| `npm ci` / typecheck / build fails | gate job red, API never starts | step log |
| API crashes at startup | readiness step fails within ~1 s, tests don't run | `api.log` printed + uploaded |
| Readiness timeout (30 s) | readiness step fails, tests don't run | `api.log` printed + uploaded |
| Assertion fails | test step non-zero, job red, deploy skipped | Vitest output, JUnit XML, job summary annotations, `api.log` |
| Report files missing | upload step fails (`if-no-files-found: error`) — run invalid | step error |
| Workflow cancelled | job `cancelled`; deploy skipped; stop-API step still runs | partial logs |

Reports: console output, `reports/junit.xml`, job summary and annotations from the `github-actions` reporter. Artifacts: default retention is 90 days; set 14 days explicitly. GitHub Free private repos have 500 MB shared storage; public repos' limits were not stated on the page read. No custom dashboard.
Best-effort (non-gating): artifact upload content, job summary. Required: install, typecheck, build, start, readiness, tests, and the existence of report files.

## 11. Security and permissions

- Workflow-level `permissions: contents: read`; no job requests write scopes. No secrets are needed anywhere in the MVP.
- Trigger is `pull_request` (fork PRs get a read-only token, no secrets). **`pull_request_target` is prohibited.**
- `actions/checkout` with `persist-credentials: false`.
- SHA-pinned actions; Dependabot for Actions ➕ (needs `contents: write`-free config; only opens PRs).
- API: runtime validation, generic 5xx, no stack traces, no logging of request bodies/headers. Documented limitations: no authentication, no rate limiting, in-memory state — acceptable for a test target.
- Tests only ever hit `127.0.0.1`; destructive tests against any non-local URL are prohibited (the test helper refuses non-loopback `API_BASE_URL` unless explicitly overridden ➕).

## 12. Local development approach

Windows 11 + PowerShell primary; CI is Linux bash. Keep npm scripts cross-platform (no bash-only syntax in `package.json`).

```
npm ci
npm run typecheck                 # src + tests
npm run build && npm start        # terminal 1: API on 127.0.0.1:3000
npm run test:api                  # terminal 2: vitest run; writes reports/junit.xml
```
Set `PORT` for the API and the same host/port in `API_BASE_URL` for the tests to use another port. A failing test makes `npm run test:api` exit 1 (verified locally, Phase 3). No one-command runner was added; two terminals are enough.

**Requirements for the future CI workflow (derived from Phase 3):** build first (`dist/` must exist); start `node dist/server.js` in the background and wait for `/health` *before* `npm run test:api` (the suite's global setup only checks once, with a 3 s timeout, and fails the run if the API is down); `reports/junit.xml` is the artifact to upload; `GITHUB_ACTIONS=true` (set by the runner) enables the `github-actions` reporter automatically. Not yet verified on Linux/GitHub.

## 13. Free-tier and cost assumptions (reviewed 2026-10-15)

| Item | Finding |
|---|---|
| GitHub Actions, public repo | ✅ standard hosted runners free |
| GitHub Actions, private repo, Free plan | ✅ 2,000 min/month, 500 MB artifact storage; blocked beyond that unless a payment method is on file |
| Vitest, Node, Express, Zod, TypeScript | open-source npm packages, no account |
| Postman CLI | local-file runs need no login ✅; cloud reporting, `--output`, `--simulate`, gRPC/GraphQL, team package library need accounts/paid plans — **none are used** |
| Environments (deploy protection) | ✅ configurable on public repos on Free; ignored on private Free repos |
| Branch protection / rulesets | see §9 — drives the "public repo" proposal |
| Real hosting | Not used; no card required |

Estimated run time ~1 minute ⇒ negligible against any quota.

## 14. Acceptance criteria (status as of 2026-10-15; details and evidence in §17)

- [x] `npm ci`, build, start, and tests run locally from documented commands — VERIFIED locally
- [x] Passing run exits 0; a failing assertion/regression exits non-zero (Vitest) — VERIFIED locally and on GitHub
- [~] CI runs on PR, push to main, manual dispatch — PR and push VERIFIED; manual dispatch NOT TESTED
- [~] Readiness is bounded; startup crash and timeout fail the job with `api.log` — startup crash VERIFIED on GitHub; readiness timeout VERIFIED LOCALLY ONLY
- [~] Reports uploaded after a failed run — artifact upload VERIFIED on a red run (existence and size); contents NOT INSPECTED
- [~] Real red run: gate job red, deploy skipped — gate job red VERIFIED; there is NO deploy job, so "deploy skipped" is NOT IMPLEMENTED / NOT VERIFIED
- [ ] Real green run: deploy (simulated) executes — NOT IMPLEMENTED (no deploy job exists)
- [ ] Cancelled run: deploy skipped — NOT TESTED
- [~] Branch protection configured and a PR with a red check shown as non-mergeable — ruleset configured and its contents VERIFIED via GitHub's API; blocking behaviour on a red PR NOT TESTED
- [ ] README distinguishes CI failure, merge blocking, deployment blocking — no README yet
- [x] No fabricated test counts or coverage numbers anywhere

## 15. Risks and trade-offs

| Risk | Mitigation |
|---|---|
| Recruiters scanning for "Postman" | Explain the decision in README; offer non-gating Postman collection as future work |
| Branch protection may not be available on a private Free repo | Use a public repo; verify empirically |
| Background process behaviour across steps | Verify Phase 4; fallback single-step with `trap` |
| Vitest parallel files mutate shared in-memory store | Per-test records; no exact-count assertions; can set `fileParallelism: false` if flakiness appears |
| SHA-pinned actions go stale | Dependabot version updates for `github-actions` |
| Node 24 enters Maintenance 2026-10-20 | Still supported to 2028-04-30; revisit when 26 becomes LTS |
| Simulated deploy mistaken for real | Job name and log both say "SIMULATED"; README states it |
| Open decision: one-command local runner | Default: none (two terminals); add a small Node script only if it proves painful |

## 16. Implementation phases

See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).

---

## Sources (official documentation, accessed 2026-10-15)

- Postman CLI — collection run: https://learning.postman.com/docs/postman-cli/postman-cli-run-collection/ and https://learning.postman.com/docs/postman-cli/postman-cli-collections/
- Postman CLI — options / exit-code convention: https://learning.postman.com/docs/postman-cli/postman-cli-options
- Newman status and migration: https://learning.postman.com/docs/collections/using-newman-cli/newman-options/
- Vitest reporters: https://vitest.dev/guide/reporters
- Bruno CLI: https://docs.usebruno.com/bru-cli/overview and https://github.com/usebruno/bruno
- Node.js release schedule: https://github.com/nodejs/Release (`schedule.json`) and https://nodejs.org/en/about/previous-releases
- GitHub Actions billing: https://docs.github.com/en/billing/managing-billing-for-your-products/about-billing-for-github-actions
- GitHub plans: https://docs.github.com/en/get-started/learning-about-github/githubs-plans
- Protected branches: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- Rulesets: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets
- Workflow syntax (`needs`, `always()`, concurrency, permissions): https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions
- Environments: https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment
- Artifact retention: https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-workflow-runs/removing-workflow-artifacts
- Security hardening: https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions

**Not confirmed from the pages read (carried as ⚠️):** Postman CLI explicit exit code on failed assertions and its install/CI terms; Bruno exit codes and paid-feature limits; branch protection/rulesets on Free public repos; default `timeout-minutes`; public-repo artifact storage limits.

---

## 17. Final verification (2026-10-15)

Legend: **VERIFIED** = observed on GitHub (API or pasted log); **LOCAL** = Windows/Git Bash only; **NOT TESTED** = not exercised.

**Workflow:** [`.github/workflows/ci.yml`](.github/workflows/ci.yml); single required job `API Quality Gate`; triggers: pull requests to `main`, pushes to `main`, manual dispatch.

| Scenario | Commit | GitHub run | Result |
|---|---|---|---|
| Initial push to `main` | `e4a70fc` | [38672309662](https://github.com/edzarquiza/api-gate-automated-testing/actions/runs/38672309662) | success; **79/79 tests passed** (from the run's test log); artifact uploaded |
| Regression: create returns 200 not 201 ([PR #1](https://github.com/edzarquiza/api-gate-automated-testing/pull/1), closed unmerged) | `6a27ea7` | [38672991054](https://github.com/edzarquiza/api-gate-automated-testing/actions/runs/38672991054) | **failure** at "Run API tests"; log reported 42 failed tests; "Require JUnit report" skipped, "Print API log" and artifact upload ran |
| Recovery of the above | `efaac92` | [38673153813](https://github.com/edzarquiza/api-gate-automated-testing/actions/runs/38673153813) | success |
| Startup crash: server throws before listening ([PR #2](https://github.com/edzarquiza/api-gate-automated-testing/pull/2), closed unmerged) | `d7c061f` | [38673760588](https://github.com/edzarquiza/api-gate-automated-testing/actions/runs/38673760588) | **failure** at "Wait for API readiness" after about 1 s, annotation "API process exited before becoming ready"; tests skipped; log printed; artifact uploaded (462 bytes) |
| Recovery of the above | `6b72423` | [38674236917](https://github.com/edzarquiza/api-gate-automated-testing/actions/runs/38674236917) | success |

Both experiment branches were restored to trees identical to `main`, and the PRs were closed without merging. The branches are kept as history.

**Artifacts and reports:** artifact `api-gate-diagnostics-<attempt>` (14-day retention) was uploaded on every run above, including both failures. Sizes: about 2.5 kB on green runs (JUnit + log), 3.8 kB on the regression run, 462 bytes on the startup-crash run, which is consistent with a log-only artifact. **Artifact contents were not inspected** (download requires sign-in). "79 passed" was read from the log only for the initial run; the recovery runs' steps passed but their counts were not read. Locally, `npm ci`, typecheck, build and the suite give 79/79.

**Also verified on GitHub:** the background API process survives between steps; cleanup runs after failures without masking them.

**Branch protection:** ruleset "Protect main" (id 25135341) is active, targets the default branch, and, per GitHub's API, applies: restrict deletions, block force pushes, require a pull request (0 approvals), and require status check **`API Quality Gate`** (the exact job name in the workflow; integration 15368). No other check is required and there is no deployment job. Bypass actors are not visible through the public API. **Not tested:** that GitHub actually refuses to merge a PR whose check is red. The experiment PRs were created before the ruleset existed, and no new failing PR was created for this purpose.

**Not implemented:** the deployment gate. No deploy job exists, so the claim "a failed gate prevents deployment" is design intent only (see §9) and has not been demonstrated.

**Not tested on GitHub:** readiness timeout (local simulation only: bounded at 34 s); cancelled runs and PR concurrency cancellation; graceful server shutdown on Linux (`SIGTERM` handler); manual `workflow_dispatch`; fork pull requests; behaviour when `npm ci` fails. `runs-on: ubuntu-latest` is unpinned, and GitHub announced it moves to Ubuntu 26 from 2026-10-19.

**Known test-design trade-off:** a regression in the create endpoint's status fails about 42 tests (most through the shared setup helper), not one.
