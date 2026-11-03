# Block reasons

When a subagent cannot continue, its report says `Result: BLOCKED <reason>` and its JOURNAL block has an entry of kind `blocked`. Contract: `docs/contracts.md` §7.

| Reason | Meaning | Raised by | Ask the person |
|---|---|---|---|
| `PLAN_MISMATCH` | The code does not match what the plan assumed | developer-package, design-qa | Update the step to match the code (edit `03-plan.md`, re-validate, journal `deviation`), or go back to `/spec-plan` |
| `TEST_FAIL_BUDGET` | Three auto-fix attempts used, checks still red | developer-package | Show the last failing output. Fix by hand and re-run `/spec-implement`, or adjust the step |
| `SETUP_ERROR` | Install, build or tool failure unrelated to the change | any | Fix the environment (`pnpm install`, `npx playwright install chromium`), then re-run the phase |
| `NEEDS_DECISION` | A choice the plan did not close | developer-package, reviewer-package, plan-auditor | State the choice with the options found, take the answer, write it into the plan, journal `user_decision` |

Rules:

- The main thread never decides a block on its own. It shows the reason and the agent's report and asks.
- Every answer is journaled as `user_decision` with `--actor main`.
- Because steps are ticked as they land, re-running `/spec-implement` after a block continues from the first unticked step.
- In headless mode there is nobody to ask: write `BLOCKED.md` and stop (see `headless.md`).
