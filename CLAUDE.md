# API Gate — Architecture Review and Implementation Blueprint

## Role

Act as a Senior QA Automation Engineer, API Test Engineer, CI/CD Engineer, and pragmatic Software Architect.

Your responsibility is to help me design a technically credible, professionally presented, free-first portfolio project that demonstrates automated API testing and GitHub Actions quality gates.

Do not optimize for the number of features or the sophistication of the architecture.

Optimize for:
- Correctness
- Reliability
- Reproducibility
- Clear engineering decisions
- Demonstrable skills
- Minimal complexity
- Zero-cost development
- Interview defensibility

You must challenge unnecessary complexity rather than simply implement everything requested.

---

# 1. PROJECT DEFINITION

## Project name

**API Gate — Automated API Testing & CI/CD Quality Gates**

## One-sentence description

A TypeScript-based API testing pipeline that automatically builds and starts an API, executes automated endpoint tests in GitHub Actions, produces actionable test reports, and prevents the deployment stage from running when required checks fail.

## Primary portfolio objective

Demonstrate that I understand how to implement a professional API testing and CI/CD workflow.

The project should visibly demonstrate:

1. REST API testing
2. API contract and response validation
3. Positive and negative test scenarios
4. Regression testing
5. Postman collection design and command-line execution, or a better justified free alternative
6. GitHub Actions workflow configuration
7. Automated build and test execution
8. Failure propagation
9. Deployment gating
10. Test reporting and diagnostics
11. Environment configuration and secret management
12. Reliable, reproducible test execution

Secondary skills may include TypeScript, Node.js, Express, Git, npm, and lightweight application design.

This project is primarily about **API testing automation and CI/CD**, not building a feature-rich API product.

## My intended outcome

I want a recruiter or technical interviewer to be able to open the GitHub repository and quickly understand:

- What the pipeline tests
- When the pipeline runs
- How the API is started in CI
- How the tests validate API behavior
- What happens when a test fails
- How deployment is prevented
- How test reports help identify the failure

The strongest demonstration is:

**Introduce a controlled API regression → a required test fails → GitHub Actions reports failure → deployment does not execute.**

Then restore the implementation and demonstrate a successful run.

---

# 2. HARD CONSTRAINTS

## 2.1 Cost

The project must be usable at approximately ₱0/month during development.

Prefer:
- GitHub Free
- GitHub Actions within applicable free usage limits
- Node.js and TypeScript
- Open-source libraries
- Local API execution
- Local deterministic test data
- Repository-stored test collections
- Local development without cloud dependencies

A live deployment is optional if it introduces recurring costs, unnecessary setup, or unreliable free-tier behavior.

Do not assume that a product is free merely because it offers a free trial.

Research and distinguish:
- Free to install
- Free for local execution
- Free for CI execution
- Free for cloud reporting
- Free for public repositories
- Free for private repositories
- Free hosting with limitations
- Paid features that are unnecessary for this project

Identify any account, token, or billing requirement before selecting a tool.

Do not introduce paid services.

## 2.2 Complexity

This must remain a small project that one developer can understand and maintain.

Do not introduce:
- Microservices
- Kubernetes
- Kafka
- Redis
- Multiple databases
- A complex authentication system
- An elaborate frontend
- A custom monitoring platform
- A custom test reporting application
- AI or LLM functionality
- A complex infrastructure-as-code setup
- Unnecessary Docker orchestration
- Multiple competing test frameworks

Docker is permitted only if it materially improves reproducibility and does not create unnecessary overhead.

A lightweight Express API is sufficient as a test target.

## 2.3 Scope discipline

Do not turn this project into a complete order-management system.

The sample API exists to demonstrate testing and quality gates.

A handful of well-designed endpoints and a focused collection of meaningful tests are preferable to a large application with superficial coverage.

---

# 3. RESEARCH BEFORE DESIGN

Before selecting the final stack, inspect current official documentation.

Research:

### Postman
- Postman CLI installation
- Running local collection files
- CI/CD integration
- Authentication and account requirements
- Test failure exit codes
- Report generation
- Current collection format compatibility
- Free versus paid features

### Alternative testing tools
Compare Postman CLI with relevant alternatives, such as:
- Vitest with Supertest
- Bruno CLI
- Other genuinely free tools if they offer a meaningful advantage

Evaluate Newman accurately rather than assuming it is the default choice for new Postman projects.

### GitHub Actions
- Workflow triggers
- Job dependencies
- Failure propagation
- Artifacts and report retention
- Concurrency
- Permissions
- Branch protection
- Required status checks
- Deployment environments where relevant
- Free usage limits

### Supporting tools
Verify the current Node.js LTS release, npm behavior, and relevant dependency requirements.

Use official documentation as the primary evidence.

Cite the sources in the architecture document and record when the review was conducted.

Do not use outdated blog posts as the sole justification for an architectural decision.

## Required research output

Create a concise comparison table:

| Option | Free to run locally | CI suitability | Account required | Reporting | Complexity |
|---|---|---|---|---|---|

Include only relevant options.

Conclude with one recommended testing approach.

Do not install or configure every alternative.

---

# 4. MAKE AN EXPLICIT TOOLING DECISION

Evaluate this proposed stack:

- Node.js
- TypeScript
- Express
- Postman collections
- Postman CLI
- GitHub Actions
- npm

PostgreSQL is optional.

The preferred direction is to keep Postman as the main API testing interface if it can satisfy the free and CI requirements cleanly.

However, do not select Postman simply because it was suggested in the brief.

If another tool provides a more reliable, simpler, or genuinely more appropriate solution, explain why and recommend it.

Use one primary API testing approach.

Do not introduce Vitest, Supertest, Newman, and Postman CLI together without a specific and justified need.

If the selected API testing tool cannot adequately test a required behavior, identify the gap before adding another tool.

The final architecture should identify:
- The primary test runner
- How it is installed
- How it executes locally
- How it executes in GitHub Actions
- How a failed assertion affects the process exit code
- How the report is generated
- Which capabilities require an account or token

Prefer a repository-stored collection and local execution over a cloud-dependent workflow.

---

# 5. THE SAMPLE API

Design a small API that exposes enough behavior to support meaningful tests.

Possible domain: order management.

Potential endpoints:

- GET /health
- GET /api/orders
- GET /api/orders/:id
- POST /api/orders
- PATCH /api/orders/:id
- DELETE /api/orders/:id

Reduce the endpoint list if any endpoint adds no meaningful testing value.

The API should have:
- Clear request and response contracts
- Appropriate HTTP status codes
- Input validation
- Consistent error responses
- A few explicit business rules
- Predictable test data
- A small, understandable codebase

## Data storage

Default to in-memory deterministic test data unless persistence demonstrably improves the project.

Use PostgreSQL only if it adds meaningful testing value that cannot be demonstrated adequately with the simpler approach.

Do not add a database merely to increase the technology list.

If an in-memory store is used, explain its limitations and ensure that tests do not depend on state surviving between workflow runs.

If persistence is chosen, justify the database, setup, cleanup, and CI isolation strategy.

## API contract

Define a small set of expected response structures.

For example:

- Health response
- Order response
- Order collection response
- Validation error response
- Not-found response

Document expected status codes, required fields, data types, and important constraints.

The API contract should be clear enough that tests can detect accidental breaking changes.

---

# 6. API TEST STRATEGY

Build a focused, high-value API test collection.

Target approximately 12–20 meaningful assertions or test cases initially, adjusting the number based on the actual endpoint behavior.

Do not treat the number of tests as a quality metric by itself.

Organize tests by purpose.

## 6.1 Positive tests

Verify:
- The health endpoint reports a healthy state.
- Existing resources can be retrieved.
- Collection endpoints return the expected structure.
- Valid requests produce the expected result.
- Successful create/update/delete operations return the documented status and response.

## 6.2 Negative tests

Verify:
- Malformed or invalid request bodies are rejected.
- Missing required fields are rejected.
- Invalid field types are rejected.
- Nonexistent resources return the correct status.
- Unsupported resource transitions are rejected where applicable.
- Invalid identifiers are handled consistently.

## 6.3 Contract tests

Validate:
- Status codes
- Content type
- Required properties
- Data types
- Nullable fields where appropriate
- Response structure
- Important business constraints

Use JSON Schema validation or an equivalent tool if it is practical and readable.

Do not add a schema validation dependency solely for appearance.

## 6.4 Regression tests

Include tests that can catch a realistic accidental change, such as:
- Returning the wrong status code
- Omitting a required field
- Changing a field type
- Accepting invalid input
- Returning an incorrect error response

## 6.5 Test quality

Every test must have:
- A clear purpose
- Explicit expected behavior
- A meaningful assertion
- A deterministic setup
- A useful failure message

Do not write tests that merely repeat the same status-code assertion across many endpoints.

Do not call public third-party APIs as a dependency of the required CI suite.

---

# 7. TEST DATA AND ISOLATION

Design tests so that they pass reliably on repeated runs.

The test suite must not depend on:
- Previous test runs
- A developer's local database state
- A particular execution order unless explicitly required
- An external service being available
- A real production account
- A manually created record

Prefer deterministic fixtures and explicit test setup.

If create/update/delete tests mutate state:
- Define their setup and cleanup strategy.
- Ensure a failed test does not leave later tests in an unpredictable state.
- Make repeated runs safe.
- Avoid testing destructive operations against production.

If a test requires another test to run first, reconsider the design.

If a collection must run in a defined order, document why.

---

# 8. GITHUB ACTIONS WORKFLOW

This is the central part of the project.

Design the workflow so that API tests are part of the required validation path.

## 8.1 Workflow triggers

Evaluate:
- Pull requests targeting main
- Pushes to main
- Manual workflow dispatch

Use a sensible trigger configuration without generating unnecessary duplicate runs.

If path filters or concurrency cancellation are used, explain their implications.

## 8.2 Validation pipeline

The required validation path should:

1. Check out the repository.
2. Configure a pinned Node.js version.
3. Install dependencies reproducibly using the lockfile.
4. Run static checks and the production build where applicable.
5. Start the sample API inside the CI environment.
6. Capture startup failures.
7. Wait for the health endpoint using a bounded readiness check.
8. Fail if the API does not become healthy before the timeout.
9. Execute the required API test suite.
10. Preserve the correct process exit code.
11. Upload useful reports even if the tests fail.
12. Clean up the API process and temporary resources.

Keep the API process and API tests in the same job unless there is a concrete reason to use another approach.

Do not assume that a process started in one GitHub Actions job remains available in another job.

Use a clear, stable name for the required quality-gate job.

## 8.3 Failure propagation

The following conditions must fail the required validation job:

- Dependency installation failure
- Build failure
- Static check failure
- API startup failure
- Health-check timeout
- Required API assertion failure
- Missing required report or configuration where it makes the run invalid

Do not use `continue-on-error` or unconditional success steps in a way that masks a required failure.

Diagnostic and cleanup steps may run after failure, but the original failure must remain visible in the final job result.

Ensure that the selected CLI's exit-code behavior is verified, not assumed.

## 8.4 Reporting after failure

Test report publication should run even when the tests fail.

Use the appropriate GitHub Actions conditional for diagnostics and artifact upload.

Do not make artifact upload failures silently turn a failed test run into a successful one.

Explain which steps are required checks and which are best-effort diagnostics.

## 8.5 Security and permissions

Use least-privilege workflow permissions.

Do not expose secrets in logs.

Avoid secrets for workflows that do not need them.

Do not use pull_request_target to execute untrusted pull-request code with privileged credentials.

Pin third-party GitHub Actions to immutable commit SHAs where practical, and document the maintenance trade-off.

Avoid unnecessary permissions for repository contents, packages, deployments, or other resources.

---

# 9. DISTINGUISH THREE TYPES OF GATING

This distinction is mandatory in the architecture and README.

## A. CI quality gate

A required API test fails, and the GitHub Actions validation job reports failure.

This must be demonstrated.

## B. Merge gate

A pull request cannot be merged into main when the required status check fails.

This may require manually configuring repository branch protection or a ruleset.

Document the exact configuration.

Do not claim that a workflow YAML file automatically enables branch protection.

Investigate whether the repository's visibility and GitHub plan support the intended configuration.

## C. Deployment gate

A deployment job must not execute unless the required validation job succeeds.

Use explicit job dependencies.

Verify the actual workflow behavior when:
- Validation succeeds
- Validation fails
- Validation is cancelled
- Validation is skipped

Do not assume that a job dependency alone has been tested correctly.

## Deployment decision

A live deployment is not mandatory for the first milestone.

First prove the validation gate.

Then choose one of these options:

1. **Real deployment:** use a genuinely available free deployment target with practical limitations and clearly documented configuration.
2. **Deployment simulation:** include a clearly labelled demonstration job that represents the deployment stage and executes only after successful validation.

Do not represent a simulation as a real production deployment.

If a real deployment introduces paid services, excessive complexity, or fragile external dependencies, keep it optional.

The project must remain useful even without live hosting.

---

# 10. PROVE THAT THE PIPELINE WORKS

Do not merely write a workflow that appears correct.

Design a repeatable verification procedure.

## Scenario A — Passing pipeline

Expected sequence:

- Code checks pass.
- API starts successfully.
- Health check passes.
- Required API tests pass.
- Report is generated.
- Quality-gate job succeeds.
- Deployment stage is eligible to execute.

## Scenario B — Failing API test

Introduce a controlled regression in a temporary branch.

Examples:
- Return an incorrect status code.
- Remove a required response field.
- Change a field's data type.

Expected sequence:

- The application builds, if the regression is behavior-only.
- The API starts.
- A required assertion fails.
- The test command exits unsuccessfully.
- GitHub Actions marks the required quality-gate job as failed.
- Diagnostic output and test reports remain available.
- The deployment job does not execute.

## Scenario C — API fails to start

Simulate a startup failure or invalid startup configuration.

Expected sequence:

- The readiness check times out or startup detection fails.
- The workflow fails clearly.
- The API test step does not incorrectly report success.
- Diagnostic output explains the failure.

## Scenario D — Recovery

Restore the correct implementation.

Expected sequence:
- The tests pass again.
- The required job succeeds.
- The deployment stage is eligible to execute.

Document exactly how to reproduce each scenario.

Do not commit intentionally broken code to the main branch.

---

# 11. REPORTING AND ARTIFACTS

Select the simplest useful reporting approach supported by the chosen test runner.

The output should show:
- Total tests or assertions executed
- Passed tests
- Failed tests
- Which request or assertion failed
- Expected versus actual behavior when available
- Relevant diagnostic information

Store generated reports as GitHub Actions artifacts where appropriate.

Use a report format supported by the selected tooling.

Do not invent a test count, coverage percentage, or report capability.

Do not build a custom dashboard.

Explain report retention and any applicable free-tier limitations.

---

# 12. APPLICATION ARCHITECTURE

Keep the API codebase small and understandable.

A potential structure is:

api-gate/
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── routes/
│   ├── services/
│   ├── validation/
│   └── types/
├── tests/
├── postman/
│   ├── collections/
│   └── environments/
├── .github/
│   └── workflows/
├── docs/
├── package.json
├── package-lock.json
├── tsconfig.json
├── .gitignore
├── ARCHITECTURE.md
├── CLAUDE.md
└── README.md

This is illustrative, not mandatory.

Remove folders that add no value.

Do not create empty abstractions or unnecessary layers.

Explain:
- Where routes are defined
- Where validation happens
- Where business rules live
- How the API starts
- How the test collection targets the local API
- How CI starts and stops the process

---

# 13. TYPESCRIPT AND CODE QUALITY

Use TypeScript if it adds useful evidence of modern software engineering.

Requirements:
- Enable strict mode.
- Avoid `any` unless explicitly justified.
- Validate external request input at runtime.
- Keep types and runtime validation consistent.
- Use clear naming.
- Keep functions small and focused.
- Avoid unnecessary abstractions.
- Avoid duplicated validation logic.
- Use a lockfile and reproducible dependency installation.
- Keep the build and test commands easy to understand.

Do not introduce complex design patterns.

The project should be easy to explain in an interview without relying on jargon.

---

# 14. SECURITY

Implement appropriate security basics:
- Validate input.
- Keep secrets out of source control.
- Use environment variables when configuration is needed.
- Use safe error responses.
- Avoid exposing stack traces or sensitive internal details to API consumers.
- Avoid logging credentials or authorization headers.
- Do not run destructive tests against production.
- Use least-privilege CI permissions.
- Avoid granting unnecessary workflow access to secrets.

Do not add authentication unless a meaningful test requirement justifies it.

Document any security limitations in the sample API.

---

# 15. FREE DEPLOYMENT AND COST REVIEW

Before proposing a deployment platform, verify its current official pricing and restrictions.

Consider:
- Whether the service has a genuinely usable free tier
- Whether it requires a credit card
- Whether the service sleeps or has cold starts
- Whether deployment can be triggered from GitHub Actions
- Whether deployment requires an API key
- Whether secrets can be configured safely
- Whether the platform can be used without payment during the portfolio demonstration

Do not assume a free frontend host can host a Node.js backend.

Do not assume a GitHub integration automatically enforces this project's quality gate.

If the hosting platform's own automatic deployment integration could bypass the intended workflow, explain how to configure the deployment path correctly or recommend a simpler alternative.

Local CI must remain the authoritative demonstration of the test gate.

---

# 16. ARCHITECTURAL TRADE-OFFS

Before finalizing the design, answer these questions explicitly:

1. Why use Postman CLI instead of a code-based test framework, or vice versa?
2. Is a database necessary?
3. Is a real deployment necessary for the MVP?
4. Should API startup, readiness, and testing happen in one job?
5. How will test state be isolated?
6. How will test failures propagate to the final job result?
7. How will reports survive a failed run?
8. What is enforced in YAML versus repository settings?
9. How can a deployment be accidentally allowed after a failed check?
10. What is the simplest way to demonstrate the failed deployment gate?
11. Which features are explicitly out of scope?
12. What current free-tier limitations could affect the project?

For each major decision, document:
- Decision
- Reason
- Alternative considered
- Trade-off
- Consequence

Do not create a long architecture document just to make the project appear enterprise-grade.

---

# 17. REQUIRED DELIVERABLE: ARCHITECTURE.md

Create `ARCHITECTURE.md`.

Include:

1. Project overview
2. Portfolio objective
3. Requirements and constraints
4. Functional scope
5. Non-goals
6. Selected technology stack
7. Tool comparison and rationale
8. Architecture diagram
9. API design and contracts
10. Test strategy
11. Test data and isolation
12. CI workflow
13. CI failure behavior
14. Merge gate versus deployment gate
15. Reporting and artifacts
16. Security and permissions
17. Local development
18. Free deployment options and limitations
19. Cost assumptions
20. Acceptance criteria
21. Risks and trade-offs
22. Future improvements

Include a simple architecture diagram, for example:

Developer push / pull request
             |
             v
       GitHub Actions
             |
             v
     Install and validate
             |
             v
       Start sample API
             |
             v
       Health/readiness
             |
             v
     Automated API tests
             |
             v
       Publish reports
             |
             v
     Quality gate result
             |
        +----+----+
        |         |
      PASS       FAIL
        |         |
        v         v
 Deployment    Blocked

Adapt this diagram to the actual chosen workflow.

Clearly mark manual repository settings and optional components.

---

# 18. REQUIRED DELIVERABLE: CLAUDE.md

Create `CLAUDE.md` as the durable engineering instruction file for future development sessions.

Include:

## Project mission
Explain the project's objective and primary demonstration.

## Core principles
- Keep the project small.
- Prefer boring technology.
- Avoid overengineering.
- Prioritize reproducibility.
- Use TypeScript consistently.
- Make failures visible.
- Never hide a failed required test.
- Keep the CI workflow understandable.

## Architecture rules
Define where API routes, validation, business logic, tests, collections, and workflow files belong.

## Coding rules
- Strict TypeScript
- Clear naming
- Small functions
- Runtime input validation
- No unnecessary abstractions
- No secrets in source control
- Reproducible dependency installation

## API testing rules
- Test behavior and contracts.
- Include positive and negative cases.
- Use deterministic test data.
- Make failure messages actionable.
- Avoid dependencies on public third-party APIs.
- Preserve the intended test runner's exit status.

## CI/CD rules
- Required tests must fail the workflow when they fail.
- The deployment stage must depend on successful validation.
- Upload reports after failures.
- Use bounded timeouts.
- Use least-privilege permissions.
- Document repository settings that cannot be configured by workflow YAML.
- Never silently bypass a required quality gate.

## Security rules
Describe safe secrets handling, permissions, and the prohibition against running destructive tests against production.

## Testing strategy
Describe the appropriate balance of API contract tests, negative tests, regression tests, and pipeline verification.

## Git rules
Recommend small, meaningful commits and prohibit committing deliberately broken code to main.

## Scope rules
Every feature must support the primary portfolio objective.

If a feature adds complexity without improving the API testing pipeline, challenge its inclusion.

## Verification rules
Never claim that CI, deployment, reports, or branch protection work until evidence verifies the claim.

---

# 19. IMPLEMENTATION PLAN

Create a short, ordered plan after architecture review.

### Phase 1 — Architecture
Research tools, finalize the MVP, and create the architecture and Claude instruction files.

### Phase 2 — Sample API
Build the minimum API needed for realistic tests.

### Phase 3 — Test suite
Create the collection and verify positive, negative, and contract scenarios locally.

### Phase 4 — GitHub Actions
Automate the build, API startup, readiness check, tests, and report upload.

### Phase 5 — Quality gate proof
Demonstrate both passing and failing runs.

### Phase 6 — Deployment gate
Add a real or explicitly simulated deployment stage only after the quality gate works.

### Phase 7 — Portfolio documentation
Complete the README, diagrams, reproduction steps, screenshots, and limitations.

Do not implement all phases in one large change.

---

# 20. ACCEPTANCE CRITERIA

The project is complete only when the applicable criteria are verified.

### Local execution
- The project installs reproducibly.
- The API starts using documented commands.
- The test collection runs locally.
- Passing tests exit successfully.
- A required failing test produces a non-zero exit code.

### CI execution
- GitHub Actions runs on the intended events.
- The API starts inside the CI environment.
- Readiness is checked with a timeout.
- Required tests run automatically.
- Test failures fail the required job.
- Useful reports remain available after a failed run.

### Gating
- A failed validation job prevents the deployment job from executing.
- A successful validation job permits the deployment stage to run.
- Manual branch-protection configuration is documented.
- The README distinguishes CI failure, merge blocking, and deployment blocking.

### Cost and scope
- Development does not require paid services.
- Free-tier assumptions are documented.
- No unnecessary database or infrastructure is introduced.
- The application remains small and understandable.

### Evidence
- A real successful workflow run is verified.
- A real failing workflow run is verified.
- The failure is visible in GitHub Actions.
- The deployment gate's behavior is verified.
- No fabricated test results or coverage metrics appear in the documentation.

If an acceptance criterion cannot be verified, mark it as NOT VERIFIED and explain why.

---

# 21. FIRST RESPONSE AND STOP CONDITION

For this initial task, do not implement the application.

First:

1. Inspect the existing repository and identify any relevant existing files.
2. Research the official tool documentation and current free-tier constraints.
3. Critically evaluate the proposed architecture.
4. Compare the viable testing tools.
5. Recommend the simplest appropriate stack.
6. Define the MVP and explicit non-goals.
7. Explain the CI, merge, and deployment gate behavior.
8. Identify risks and manual GitHub configuration.
9. Create `ARCHITECTURE.md`.
10. Create `CLAUDE.md`.
11. Produce a concise implementation plan.
12. Report the files created and the evidence supporting your recommendations.

Do not modify unrelated application code.

Do not install dependencies or begin application implementation in this phase.

Do not claim that a deployment or quality gate works merely because the architecture describes it.

The design must be simple enough to build independently, professional enough to demonstrate in a technical interview, and reliable enough that a failed API test cannot be mistaken for a successful pipeline.

**Final principle: a small, verified quality gate is more valuable than a large, unverified CI/CD architecture.**

---

# 22. PHASE 1 DECISIONS (added 2026-10-15; see ARCHITECTURE.md)

These record outcomes of the Phase 1 review and take precedence over the "preferred direction" wording above.

- **Test runner:** Vitest with Node's built-in `fetch` against a separately started API (`API_BASE_URL`). No Postman CLI, Newman, Bruno, or Supertest unless a documented gap appears. Newman is unmaintained and lacks collection v3 support.
- **Runtime:** Node.js 24 (Active LTS on 2026-10-15), pinned via `.nvmrc`. CI runs compiled output (`node dist/server.js`), not `ts-node`.
- **Contract tests use hand-written expectations**, not the API's own Zod schemas (avoids circular tests).
- **No test-only endpoints** or fault-injection flags in the shipped API; regressions are injected only on throw-away branches and never merged.
- **Required check = the job named `API Quality Gate`.** A skipped required check counts as passing, so never make the deploy job a required check and never use `always()` on it. Do not add `paths:` filters to the CI workflow (a required check that never runs blocks PRs).
- **Repository should be public** so branch protection/required checks and free Actions apply without a paid plan. Confirm in Settings and record evidence; do not claim it before then.
- **Deployment is a labelled simulation** until a real target is separately justified.
- **Windows-first local dev:** npm scripts must work in PowerShell; bash-only logic stays inside the workflow YAML.
- **UNVERIFIED until proven by evidence:** Vitest non-zero exit on failure, background process surviving across steps, branch protection on a public Free repo, deploy skipped on failed/cancelled/skipped validation.