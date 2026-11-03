# Retro · FEATURE-1, FEATURE-2, FEATURE-3

## What happened

### FEATURE-1

- The plan auditor raised six findings over two rounds: a global `JSX` namespace in interface signatures, an insertion position that contradicts its own ordering rule, page-level queries that also match the filter's option labels, an empty-slot path the seed data never produces, a stateless claim with no test, and a test case that does not name its exact input. FEATURE-1#9 FEATURE-1#10 FEATURE-1#11 FEATURE-1#12 FEATURE-1#13 FEATURE-1#14
- Gate B shaped the design: `TrackFilter` shipped without a CSS module so the change stayed at 10 files. FEATURE-1#8
- Two failed auto-fixes during implement: typecheck rejected `slots[0]` under `noUncheckedIndexedAccess` (rewritten with `map`/`flatMap`, logged as a deviation), and the post-edit ESLint hook flagged unused imports between two edits of the same file. FEATURE-1#15 FEATURE-1#16 FEATURE-1#17
- Validate blocked with `SETUP_ERROR`: the permission system denied `pnpm lint`, `typecheck`, `test` and `build`, and design-qa could not start the dev server. FEATURE-1#18 FEATURE-1#19 FEATURE-1#20
- The person fixed the validator prompt (plain commands, no chains), removed `BLOCKED.md` and re-ran validate to GREEN. FEATURE-1#22

### FEATURE-2

- Headless clarify closed eleven gaps in the ticket by default (toggle names, marker text, parsing of stored ids, scope of storage failures, interaction with the track filter). FEATURE-2#1 FEATURE-2#2 FEATURE-2#5 FEATURE-2#9 FEATURE-2#10 FEATURE-2#11
- Gate A was approved without review in headless mode. FEATURE-2#12
- Gate B returned Split (22 files, 460 lines, three layers, 5 new exported symbols) with three smaller tickets proposed; the journal ends there. FEATURE-2#13

### FEATURE-3

- Gate B split the plan twice (12 files against 10, then 340 lines against 300); the person recalibrated the thresholds to 15 files and then 500 lines, re-running from clarify each time. FEATURE-3#10 FEATURE-3#11 FEATURE-3#22 FEATURE-3#23
- One headless run of spec-plan failed with exit 1. FEATURE-3#34
- The reviewer found that the "exposed from index.ts" EARS line had no test, and that "existing tests unchanged" could not be verified because the layer has no committed baseline. FEATURE-3#41 FEATURE-3#42
- Validate blocked at the validator-global setup check because `pnpm --version` was denied; the person added it to the allowlist and re-ran. FEATURE-3#43 FEATURE-3#44 FEATURE-3#45
- Design QA was skipped up front in headless mode, as the `spec-validate` headless table prescribes. FEATURE-3#46

## Patterns

1. **The permission allowlist blocks validate in headless runs.** Both tickets that reached validate stopped with `SETUP_ERROR`, each on a different command the allowlist did not match: chained check commands in FEATURE-1, `pnpm --version` in FEATURE-3. Each fix was reactive, after the block. Lessons L10, L15, L16. FEATURE-1#18 FEATURE-1#22 FEATURE-3#43 FEATURE-3#45
2. **DoD clauses reach implement without a test that proves them.** In FEATURE-1 the auditor caught three at plan time (path never produced by seed data, stateless claim untested, test input left to the developer); in FEATURE-3 the same gap (public export untested) slipped past the auditor and was caught only by the reviewer. Lessons L4, L5, L6, L13. FEATURE-1#12 FEATURE-1#13 FEATURE-1#14 FEATURE-3#41
3. **Gate B thresholds were too tight for the one-function-per-file convention.** The threshold shaped a design in FEATURE-1 and forced two splits in FEATURE-3 until the person recalibrated to 15 files and 500 lines. FEATURE-2's split (22 files) still holds under the new thresholds. No lesson id: these are decisions, which the aggregator excludes. Already acted on. FEATURE-1#8 FEATURE-2#13 FEATURE-3#10 FEATURE-3#11 FEATURE-3#22 FEATURE-3#23
4. **Gate A is approved without review in every headless run**, as the spec-plan headless table prescribes; the design validator is the only check on it. No lesson id. FEATURE-1#7 FEATURE-2#12 FEATURE-3#9
5. **Zero lessons are confirmed although patterns 1 and 2 repeat across tickets.** `lessons-aggregate.mjs` groups by layer plus exact normalised summary, so the same cause worded differently stays as separate candidates (L10, L15 and L16 all describe the validator-global setup being denied). FEATURE-1#18 FEATURE-3#43 FEATURE-3#44

## Proposed harness changes

| change | file to edit | evidence | lesson |
|---|---|---|---|
| Add a test that every command validator-global runs in its setup and root checks (`pnpm --version`, `ls node_modules`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `node .claude/scripts/...`, `grep`, `git diff`) matches an `allow` entry, so a missing entry fails `pnpm test` instead of a headless validate. The `pnpm --version` entry recorded in FEATURE-3#45 is not in `.claude/settings.json` today. | `.claude/settings.test.mjs` | FEATURE-1#18 FEATURE-1#22 FEATURE-3#43 FEATURE-3#45 | L10, L15, L16 |
| Group `blocked` entries by actor, phase and block reason (`SETUP_ERROR`, ...) instead of free-text summary, so the same block in two tickets becomes one confirmed lesson. | `.claude/scripts/lessons-aggregate.mjs` (+ `lessons-aggregate.test.mjs`) | FEATURE-1#18 FEATURE-3#43 FEATURE-3#44 | L10, L15, L16 |
| New `validate-plan` rule `dod-untested`: every EARS line ends with a backticked test path that also appears among the step paths, with a failing fixture. Catches an EARS line such as "exposed from index.ts" that no step tests. | `.claude/scripts/validate-plan.mjs` (+ fixture in `fixtures/plan/`, `validators.test.mjs`) | FEATURE-1#13 FEATURE-3#41 | L5, L13 |
| Plan-auditor check for the part a script cannot judge: each DoD test case names its exact input and expected value, and uses fixture data when the seed data never produces the path under test. | `.claude/agents/plan-auditor.md` | FEATURE-1#12 FEATURE-1#14 | L4, L6 |
| Fix the Gate B thresholds in the scripts README (says files > 10, lines > 300; `validate-plan.mjs` and `gates.md` use 15 and 500) and add a test that the README numbers match the validator. | `.claude/scripts/README.md` (+ `validators.test.mjs`) | FEATURE-3#11 FEATURE-3#23 | none (decisions) |

## Not proposed

- Global `JSX` namespace in interface signatures under React 19 types; a candidate for a `no-restricted-syntax` lint rule if it repeats. L1. FEATURE-1#9
- Page-level text queries matching the filter's own option labels. L2. FEATURE-1#11
- A step whose insertion position contradicts its ordering rule. L3. FEATURE-1#10
- `noUncheckedIndexedAccess` breaking `slots[0]` in tests; a candidate line for `packages/core/CLAUDE.md` if it repeats. L7, L8. FEATURE-1#15 FEATURE-1#16
- Post-edit ESLint hook reporting unused imports between two edits of one file. L9. FEATURE-1#17
- No committed baseline for the reviewer to diff against. L14. FEATURE-3#42
- Headless spec-plan run failing with exit 1 and subtype success, cause not journaled. L12. FEATURE-3#34
- The headless design-qa skip claims "validation stands on the GREEN 04-dod.md" while the two previous entries say 04-dod.md was not written. FEATURE-1#19 FEATURE-1#21
- The same block journaled twice, once by validator-global and once by the orchestrator. FEATURE-3#43 FEATURE-3#44
- Re-runs from clarify re-journal identical decisions (three copies of the clock-source decision); harmless for lessons, which skip decisions, but noisy for the retro. FEATURE-3#1 FEATURE-3#12 FEATURE-3#24
- Design-qa spawned in headless and blocked on the dev server; already resolved by the spec-validate headless table, which skips it up front. FEATURE-1#20 FEATURE-3#46
