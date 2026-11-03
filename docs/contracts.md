# Contracts

The single source of truth for names, file formats and schemas in this repo. Every skill, agent, hook, script and validator follows this document. If a contract and an implementation disagree, the implementation is wrong.

Language: English everywhere (code, comments, prompts, artefacts). The README opens with a Spanish section for the audience; nothing else is translated.

## 1. Repository layout

```
apps/agenda          React + Vite app. Pages, routing, composition.
packages/ui          Presentational React components and CSS tokens. No domain logic.
packages/core        Domain types and pure functions. No React, no DOM, no I/O.
tickets/             One markdown file per ticket.
.claude/             The harness: skills, agents, hooks, scripts.
specs/               What each ticket produces: artefacts and journal, one folder per ticket.
scripts/             Operator scripts (headless run, adversarial review).
docs/                Plans, contracts, demo script, run metrics.
```

Package names: `@agenda/core`, `@agenda/ui`, `@agenda/app`.

Tooling: pnpm workspaces (pnpm 12, Node 24+), TypeScript strict, React 19, Vite, Vitest, ESLint flat config. Root scripts, every one of them must exist and exit non-zero on failure:

| Script | Does |
|---|---|
| `pnpm lint` | ESLint over every package, including the layer boundary rules |
| `pnpm lint:file <path>` | ESLint over one file, used by the post-edit hook |
| `pnpm typecheck` | `tsc --noEmit` per package |
| `pnpm test` | Vitest for all packages, then `node --test` for the scripts under `.claude/scripts` |
| `pnpm build` | Vite build of the app |
| `pnpm dev` | Vite dev server |

## 2. Layer rules

Dependency direction, enforced by ESLint and failing the build when broken:

```
apps/agenda  ->  packages/ui  ->  packages/core
apps/agenda  ->  packages/core
```

- `core` imports nothing from the workspace. No `react`, no `window`, no `fetch`.
- `ui` imports `core` only. Components receive data through props. No routing, no storage.
- `agenda` imports `ui` and `core`. It owns routing, storage adapters and page composition.
- Tests live next to the file they test: `foo.ts` and `foo.test.ts`.
- Each package has a `CLAUDE.md` with its conventions. These three files are the "conventions per layer" the talk refers to and the skills load them through the `monorepo-conventions` skill.

Implementation order inside a ticket is always `core -> ui -> agenda`.

## 3. Tickets

File: `tickets/<TICKET>.md`. Ticket ids match `^[A-Z]+-\d+$`.

```markdown
---
id: DEMO-1
title: Filter talks by track
type: feature
---

## Description

Free text, written as a product person would.

## Acceptance criteria

- Bulleted, observable behaviours.
```

Demo tickets:

| Id | Title | Role |
|---|---|---|
| DEMO-1 | Filter talks by track | Complete run, artefacts committed: the worked example |
| DEMO-2 | Favourite talks persisted in localStorage | Stopped at Gate B with `Split` and `BLOCKED.md`, committed as is: the example of a ticket too big for one PR |
| DEMO-3 | "Now" indicator on the schedule | Complete headless run, artefacts committed |
| DEMO-4 | Filter talks by room | Recorded for the talk, then reset: kept unrun in the repo as the clean ticket to try |

## 4. Spec folder

Everything a ticket produces lives in `specs/<TICKET>/` at the repository root. The folder is outside `.claude/` on purpose: Claude Code treats every write under `.claude/` as sensitive and denies it in headless runs, even with an allow rule, so artefacts written by the agent cannot live there.

| File | Written by | Phase |
|---|---|---|
| `00-clarification.md` | spec-clarify | 1 |
| `01-research.md` | spec-plan | 2 |
| `02-design.md` | spec-plan | 2 |
| `03-plan.md` | spec-plan, then ticked by spec-implement | 2, 3 |
| `04-dod.md` | validator-global | 4 |
| `05-design-qa.md` | design-qa (stretch) | 4 |
| `journal.jsonl` | `journal-append.mjs` only | 2, 3, 4 |
| `BLOCKED.md` | any skill in headless mode, or the headless runner | any |

Cross-ticket files in `specs/`: `lessons.json`, `retro.md`.

Markdown artefacts start with a level-1 heading `# <TICKET> · <Artefact name>` and use only the level-2 headings listed below, in that order. Validators check headings by exact text.

### 4.1 `00-clarification.md`

```
## Goal                 one paragraph, what and why
## Scope                bullets, what changes
## Out of scope         bullets, may be "- None"
## Acceptance criteria  bullets, copied or refined from the ticket
## Code anchors         bullets `path:line` or `path` with one line of why
## Open questions       must be "- None" for the artefact to be valid
```

Validator: `validate-clarification.mjs`. Fails on a missing heading, an empty section, or any open question.

### 4.2 `01-research.md`

```
## Inventory            one subsection per layer: `### core`, `### ui`, `### agenda`
## Existing patterns    bullets, things to reuse
## Gaps                 bullets, what does not exist yet
```

No validator. Produced from explorer output. States facts, decides nothing.

### 4.3 `02-design.md`

```
## Alternatives         at least two, each a `### A1 <name>` subsection with pros and cons
## Decisions            list, each item `- D<n> <text>. Status: closed.`
## Layer assignment     table: change | layer | file
## Risks                bullets, may be "- None"
```

Validator: `validate-design.mjs`. Fails on a missing heading, fewer than two alternatives, a decision whose status is not `closed`, or the words `TBD`, `TODO`, `open question` anywhere.

### 4.4 `03-plan.md`

```
## Scope check          table with files touched, lines estimated, layers touched; and the verdict `Single PR` or `Split`
## Interfaces           one fenced ```ts block per layer with the exported signatures the layer adds or changes
## Steps                one `### core`, `### ui`, `### agenda` subsection, each a checklist
## Definition of done   one `### core`, `### ui`, `### agenda` subsection with EARS-style lines
## Audit                result of the last plan-auditor pass: `Blocking: 0 · Recommendations: n · Iterations: k`
```

Step format, one per line:

```
- [ ] S<n> `<path>` — <pseudocode or precise instruction in one line>
```

`spec-implement` turns `[ ]` into `[x]` as each step lands, so the plan doubles as the resumable state. A layer section may be empty with `- None`.

Gate B thresholds for this repo: more than 15 files, or more than 500 lines, or all three layers touched with more than 3 new exported symbols, means `Split` and the plan stops with a proposed split. Definitions, so the count cannot be bent: files touched is the number of distinct backticked paths in `## Steps`; a new exported symbol is any `export` added to a package's `index.ts`, types included. The design is never changed to pass the gate; if the honest numbers say `Split`, the plan stops and a person decides (headless: `BLOCKED.md` with `NEEDS_DECISION`). `validate-plan.mjs` recomputes the file count from the steps and rejects a plan whose table or verdict disagrees with it. These are deliberately lower than a real monorepo would use so that the gate is visible in a demo. Both thresholds were calibrated on real runs and the decisions are journaled in `specs/DEMO-3/journal.jsonl`: files went from 10 to 15 because, with one function and one test per file, a feature that touches the three layers is 11 to 13 files; lines went from 300 to 500 because an honest count (tests, blank lines and re-indented lines included) puts the same feature at 300 to 350. DEMO-2 at 22 files still splits.

EARS-style DoD line: `WHEN <trigger> THE <layer> SHALL <observable result>`.

Validator: `validate-plan.mjs`. Fails on a missing heading, a layer in Steps without a matching Interfaces block (unless `- None`), a step without a backticked path, a DoD line that does not start with `WHEN`, or an Audit line with `Blocking` other than 0.

### 4.5 `04-dod.md`

```
## Checks               table: check | result | notes. Checks: lint, typecheck, test, build, contracts
## Suppressions         bullets of lint suppressions added in this ticket, or "- None"
## Verdict              one line: `GREEN`, `RED`, or `GREEN WITH SUPPRESSIONS`
```

Result values: `PASS`, `FAIL`, `SKIPPED`. `contracts` means: every artefact of the ticket passes its validator and every `[ ]` in `03-plan.md` is ticked.

### 4.6 `05-design-qa.md` (stretch)

```
## Viewports            table: viewport | result | screenshot path
## Findings             bullets tagged `GREEN`, `RED`, `FIX`, `DECIDE`
## Verdict              `GREEN` or `RED`
```

## 5. Journal

File: `specs/<TICKET>/journal.jsonl`. Append-only. One JSON object per line. Only `journal-append.mjs` writes to it; skills and agents call the script, never the file. Committed with the spec. Never edited, never deleted.

Record:

```json
{
  "ts": "2026-11-03T10:15:00.000Z",
  "ticket": "DEMO-1",
  "phase": "implement",
  "actor": "developer-package",
  "kind": "autofix_failed",
  "summary": "Lint boundary rule rejected ui importing from agenda, fixed on attempt 2",
  "detail": "optional free text",
  "files": ["packages/ui/src/TrackFilter.tsx"]
}
```

| Field | Values |
|---|---|
| `ts` | ISO 8601 UTC, set by the script, never by the caller |
| `phase` | `plan`, `implement`, `validate`, `retro` |
| `actor` | `main`, `explorer`, `plan-auditor`, `developer-package`, `reviewer-package`, `validator-global`, `design-qa`, `headless` |
| `kind` | `blocked`, `deviation`, `decision`, `user_decision`, `autofix_failed`, `reviewer_finding`, `auditor_finding`, `validator_red`, `suppression` |
| `summary` | one sentence, required |
| `detail`, `files` | optional |

PII filter in the script: email addresses and anything that looks like a token or key (`sk-`, `ghp_`, 32+ hex chars, `Bearer `) are replaced by `[redacted]` before writing.

What goes to the journal: anything that failed, deviated from the plan or was decided by a person. What does not: things that went green on the first try.

### 5.1 JOURNAL block

Every subagent ends its final report with exactly one of:

```
JOURNAL: none
```

or

```
JOURNAL
- kind: autofix_failed
  summary: <one sentence>
  files: [path, path]
- kind: deviation
  summary: <one sentence>
END JOURNAL
```

The `journal-capture.mjs` hook, on `SubagentStop`, reads the subagent's last message, requires one of the two forms, and appends each entry through `journal-append.mjs` with the actor set to the agent name and the ticket taken from the `specs/<TICKET>/` path mentioned in the report. If the block is missing, the hook blocks the stop with the message `Report must end with a JOURNAL block (see docs/contracts.md §5.1)` so the agent adds it.

## 6. Lessons and retro

`specs/lessons.json`:

```json
[
  {
    "id": "L1",
    "text": "ui components receive the filtered list; filtering belongs in core",
    "layer": "ui",
    "kinds": ["reviewer_finding"],
    "tickets": ["DEMO-1", "DEMO-2"],
    "status": "confirmed",
    "first_seen": "2026-11-04",
    "last_seen": "2026-11-04"
  }
]
```

Only friction kinds become lessons: `autofix_failed`, `reviewer_finding`, `auditor_finding`, `validator_red`, `blocked`, `deviation`, `suppression`. `decision` and `user_decision` entries are context for the retro, never lessons, otherwise fixed headless phrases such as "Gate A approved without review" would be confirmed after two runs.

`status`: `candidate` when seen in one ticket, `confirmed` when seen in two or more, `applied` when a person has changed the harness because of it. `lessons-aggregate.mjs` groups journal entries by layer and normalised summary across every `journal.jsonl`, promotes candidates to confirmed at two tickets, and never deletes or demotes. `spec-plan` loads only `confirmed` and `applied` lessons, filtered by the layers the ticket touches.

`retro.md` is written by `spec-retro`: a short reflection with every claim citing a journal line as `DEMO-1#3` (ticket and 1-based line number). It proposes changes to the harness; a person applies them.

## 7. Block reasons

When a subagent cannot continue it reports `BLOCKED <reason>` and a JOURNAL entry of kind `blocked`:

| Reason | Meaning |
|---|---|
| `PLAN_MISMATCH` | The code does not match what the plan assumed |
| `TEST_FAIL_BUDGET` | Three auto-fix attempts used, tests still red |
| `SETUP_ERROR` | Install, build or tool failure unrelated to the change |
| `NEEDS_DECISION` | A choice the plan did not close |

The main thread asks the user. The headless runner writes `BLOCKED.md` with the reason and the agent's report, and stops.

## 8. Agents

Files in `.claude/agents/<name>.md`. The frontmatter field names are confirmed against the Claude Code docs by the builder; this table fixes the intent.

| Agent | Model | Tools | Effort | Does | Must not |
|---|---|---|---|---|---|
| explorer | haiku | Read, Grep, Glob | low | Answers one search question with paths and excerpts | Edit anything, propose designs |
| plan-auditor | opus | Read, Grep, Glob | high | Audits `03-plan.md` against `00` and `02`, reports findings by family | Edit the plan, write code |
| developer-package | sonnet | Read, Edit, Write, Grep, Glob, Bash | medium | Implements the steps of one package, runs `lint:file`, `typecheck`, `test` for that package, up to 3 fix attempts | Touch another package, change the plan |
| reviewer-package | opus | Read, Grep, Glob, Bash (read-only, git diff) | high | Reviews the diff of one package against the plan and the layer rules | Edit code |
| validator-global | haiku | Read, Write, Bash | low | Runs the root scripts and the validators, writes `04-dod.md` | Fix anything |
| design-qa | sonnet | Read, Write, Bash (Playwright CLI) | medium | Screenshots per viewport, compares with `02-design.md` | Edit code |

Every agent prompt ends with the JOURNAL block requirement (§5.1) and the block reasons (§7).

### 8.1 Plan-auditor finding families

| Family | Name | Blocking when |
|---|---|---|
| F0 | Contradicts clarification | Always |
| F1 | Missing or wrong interface | Always |
| F2 | Layer rule violation | Always |
| F3 | Step without a concrete file | Always |
| F4 | Pseudocode too vague to implement without deciding | Always |
| F5 | DoD not observable or not EARS | Always |
| F6 | Untested path | When the path is in the acceptance criteria |
| F7 | Scope creep | When outside `00` scope |
| F8 | Data or migration gap | When persisted data changes |
| F9 | Accessibility or i18n gap | Never, recommendation |
| F10 | Performance risk | Never, recommendation |
| F11 | Security or privacy risk | When user data leaves the browser |
| F12 | Reuse missed | Never, recommendation |

Report format: one line per finding `F<n> 🔴|🟡 <where> — <what> — <fix>`, then the totals line used in `03-plan.md ## Audit`. Loop: `spec-plan` fixes blockers and re-runs the auditor, at most 3 iterations; if blockers remain, the user decides.

## 9. Skills

Files in `.claude/skills/<name>/SKILL.md`. Invoked as `/<name> <TICKET>`. Frontmatter fields confirmed against the docs by the builder.

| Skill | Phase | Runs in | Pauses at the end |
|---|---|---|---|
| spec-clarify | 1 | main thread, conversational | Yes: user launches spec-plan |
| spec-plan | 2 | main thread; explorer and plan-auditor as subagents | Gate A (design), Gate B (scope), Gate C (audit); then yes |
| spec-implement | 3 | main thread orchestrating developer-package and reviewer-package per layer, in series | Yes: user launches spec-validate |
| spec-validate | 4 | main thread; validator-global, then design-qa if the ticket touched `.tsx` or `.css` | Ends the framework |
| spec-retro | optional | main thread, over N tickets | Ends |
| monorepo-conventions | support | loaded by the four phases | n/a |
| spec-help | support | index plus `references/*.md`, one topic each | n/a |

Rules shared by all four phases:

- The ticket id is the only argument. Reject anything not matching `^[A-Z]+-\d+$`.
- Read the artefacts of the previous phases from `specs/<TICKET>/`; refuse to run if the previous phase's artefact is missing or fails its validator.
- Run the validator after writing an artefact; fix and re-run until it passes.
- Delegate large reads to `explorer`. The main thread never greps the whole repo.
- Write to the journal through `journal-append.mjs` for every event listed in §5.
- Headless mode: when `SPEC_HEADLESS=1`, never ask the user; take the conservative option, journal it as `decision` with `actor: headless`, and on a block write `BLOCKED.md` and stop.

`spec-implement` loop per layer, in order `core -> ui -> agenda`, skipping layers whose Steps say `- None`:

1. developer-package with: the layer's Steps and Interfaces, the layer's `CLAUDE.md`, the confirmed lessons for that layer, and the journal tail so it does not repeat a known failure.
2. On `BLOCKED`, stop and ask (or `BLOCKED.md` in headless).
3. Tick the steps in `03-plan.md`.
4. reviewer-package on `git diff` of that package. Blocking findings go back to developer-package once; non-blocking ones go to the journal.
5. Next layer.

`spec-validate`: run validator-global; on `RED`, point to `spec-implement` or a manual fix, user decides; on `GREEN`, if the ticket touched `.tsx` or `.css` files and design-qa exists, run it and loop `FIX` findings through developer-package plus reviewer-package at most 3 rounds; re-run validator-global if code changed.

## 10. Hooks

`.claude/settings.json` wires two hooks. Exact payload fields confirmed against the docs by the builder.

| Event | Matcher | Script | Behaviour |
|---|---|---|---|
| PostToolUse | Edit, Write, MultiEdit | `.claude/hooks/post-edit-eslint.sh` | Runs `pnpm lint:file <path>` on the edited file when it is `.ts` or `.tsx`. On failure, feeds the ESLint output back to the model so it fixes it now |
| SubagentStop | all | `.claude/hooks/journal-capture.mjs` | Enforces §5.1 and appends the entries |

Both hooks are deterministic scripts with no model call. Both have tests.

## 11. Scripts

Under `.claude/scripts/`, Node ESM, no dependencies beyond Node built-ins, each with a `node:test` file next to it (`<name>.test.mjs`, run with `node --test`) and fixtures under `.claude/scripts/fixtures/`. They must run with nothing installed, so a fresh clone can validate artefacts before `pnpm install`:

| Script | CLI |
|---|---|
| `validate-clarification.mjs` | `node validate-clarification.mjs <path>` exits 0 or 1 and prints every failure |
| `validate-design.mjs` | same |
| `validate-plan.mjs` | same |
| `journal-append.mjs` | `node journal-append.mjs --ticket DEMO-1 --phase implement --actor developer-package --kind autofix_failed --summary "..." [--detail "..."] [--files a,b]` |
| `lessons-aggregate.mjs` | `node lessons-aggregate.mjs` reads every `journal.jsonl`, rewrites `lessons.json` preserving existing ids and statuses |

Under `scripts/`:

| Script | Does |
|---|---|
| `headless.sh <TICKET>` | Exports `SPEC_HEADLESS=1`, runs the four skills in series through `claude -p`, stops at the first `BLOCKED.md`, prints time and cost per phase to `docs/run-metrics.md` |
| `adversarial-review.sh <base> <head>` | Reviewer (opus) lists findings on the diff, rebuttal (sonnet) tries to refute each, up to 3 rounds; prints `CONSENSUS` with the surviving findings or `NO CONSENSUS` meaning a person decides |

## 12. Metrics

`docs/run-metrics.md` holds, per ticket and phase: wall-clock, input and output tokens, cost in USD, model, auto-fix attempts, auditor iterations, reviewer blocking findings. Source: the usage fields of `claude -p --output-format json` for headless runs, and Claude Code's cost output for interactive ones. Numbers are copied, never estimated.
