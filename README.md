# Harness Engineering: Caleta Agenda

A runnable example of a spec-driven Claude Code harness: four commands, subagents with clean context, scripts that validate, and a journal that teaches the next run.

## En español

Este repo es el ejemplo público de la charla "Harness Engineering" de BiznagaFest 2026. No es una app que copiar; es el entorno que rodea a una app. La app (una agenda de congreso ficticia, en tres capas) es solo el pretexto para que el agente tenga algo que construir.

Aquí vais a encontrar los skills, agentes, hooks y scripts reales en `.claude/`, los artefactos que produce un ticket completo en `specs/DEMO-1/` con su journal, y el tiempo y coste medidos de cada fase en `docs/run-metrics.md`.

Por dónde empezar: abrid `specs/DEMO-1/` para ver la "salida esperada", después `.claude/` para ver cómo se genera, y `docs/slides-to-repo.md` para ir diapositiva por diapositiva a los ficheros. Si queréis probarlo, el quick start de abajo os guía; necesitáis Claude Code, Node 24 y pnpm. El resto del README está en inglés.

## What this is

The talk walks one ticket through four phases: clarify, plan, implement, validate. Each phase is a Claude Code skill and each ends with a pause where a person decides to continue. Subagents with clean context do the narrow work (search, audit, implement one package, review it, run the checks). Scripts, not models, decide whether an artefact is valid. Every failure and every decision lands in an append-only journal, and a retro turns repeated entries into lessons that the next plan loads. The same four phases run unattended through `scripts/headless.sh`, and a second model can review the result with `scripts/adversarial-review.sh`.

The talk closes on three lessons, and each one is visible in the repo:

| Lesson | Where to see it |
|---|---|
| Predictable code makes a reliable agent | Three layers (`core -> ui -> agenda`) with ESLint boundary rules and a `CLAUDE.md` per package: `packages/*/CLAUDE.md`, `eslint.config.js`, `.claude/skills/monorepo-conventions/` |
| Every piece in its place | One agent per job, each with its own model, tools and effort: `.claude/agents/`, and the table in "Agents and models" below |
| Validate with scripts, not with models | Validators, hooks and the journal writer have no model call and have tests: `.claude/scripts/`, `.claude/hooks/` |

Out of scope on purpose: the durable agent and its Kanban board, CI, release behind feature flags, and the issue tracker (tickets are markdown files in `tickets/`). These are the production layer around the same four phases and are described in the talk, not reproduced here.

## Quick start

Requirements: Node 24 or newer (`.nvmrc`), pnpm 12, and Claude Code 2.1 or newer for the harness commands.

```bash
git clone https://github.com/nucliweb/harness-engineering-biznagafest.git
cd harness-engineering-biznagafest
pnpm install
pnpm test
pnpm dev
```

`pnpm test` runs Vitest for the three packages, then `node --test` for the hooks, validators and runner scripts. `pnpm dev` serves the agenda at the URL Vite prints.

Open Claude Code in the repo and run the four phases on a fresh ticket. `DEMO-4` has no artefacts yet.

```text
/spec-clarify DEMO-4
/spec-plan DEMO-4
/spec-implement DEMO-4
/spec-validate DEMO-4
```

| Command | What you see |
|---|---|
| `/spec-clarify DEMO-4` | A short conversation with questions that cite real code. The explorer subagent searches in its own context and `specs/DEMO-3/00-clarification.md` appears once its validator passes. |
| `/spec-plan DEMO-4` | Research, design and plan files, with three pauses: you approve the design (Gate A), see the scope verdict (Gate B) and the audit result (Gate C). |
| `/spec-implement DEMO-4` | A developer and a reviewer per package, in series, with checkboxes in `03-plan.md` turning from `[ ]` to `[x]`. The lint hook reports an edit in the wrong layer on the same tool call. |
| `/spec-validate DEMO-4` | Lint, typecheck, test and build results in `04-dod.md` with a `GREEN`, `RED` or `GREEN WITH SUPPRESSIONS` verdict. |

For the unattended version, reset `DEMO-4` first (delete `specs/DEMO-4/` and revert its code), then run:

```bash
scripts/headless.sh DEMO-4
```

It prints one line per phase to stderr and appends a row of time and cost per phase to `docs/run-metrics.md`. After two or more tickets have a journal, run `/spec-retro` to see `specs/retro.md` and `specs/lessons.json` written from them.

## Repository map

```text
apps/agenda/                  React + Vite app: pages, routing, storage, composition
packages/ui/                  Presentational components and CSS tokens, imports core only
packages/core/                Domain types and pure functions, imports nothing
  (each package has a CLAUDE.md with its conventions)
tickets/                      DEMO-1 to DEMO-4 as markdown files
specs/                        What a ticket produces: specs/<TICKET>/00..05, journal.jsonl
  DEMO-1/                     A complete run: four artefacts and the journal
  DEMO-2/                     A run stopped at Gate B: Split verdict and BLOCKED.md
  DEMO-3/                     A second complete run, recorded in docs/recordings/
  lessons.json, retro.md      Cross-ticket output of /spec-retro
.claude/
  settings.json               Wires the two hooks
  skills/                     spec-clarify, spec-plan, spec-implement, spec-validate, spec-retro,
                              monorepo-conventions (loaded by the phases), spec-help (index + references/)
  agents/                     explorer, plan-auditor, developer-package, reviewer-package,
                              validator-global, design-qa
  hooks/                      post-edit-eslint.sh, journal-capture.mjs
  scripts/                    validate-clarification, validate-design, validate-plan,
                              journal-append, lessons-aggregate (+ fixtures/, lib/)
scripts/                      headless.sh, adversarial-review.sh, build-demo-page.mjs (+ lib/, prompts/, demo-page/)
docs/                         contracts.md, implementation-plan.md, claude-code-reference.md,
                              run-metrics.md, slides-to-repo.md, demo-script.md, demo/index.html, recordings/
```

Artefacts live in `specs/` at the root and not under `.claude/` because Claude Code denies agent writes under `.claude/` in headless mode, even with an allow rule.

`.claude/settings.json` is also where the harness declares what the agent may run without asking: `permissions.allow` lists the exact `pnpm`, `node .claude/scripts/*` and read-only `git` commands the phases use, and `permissions.deny` blocks `git commit`, `git push` and `rm -rf`. The rules match by command prefix, which is why every prompt insists on one plain command per Bash call: a pipe or a `;` chain turns an allowed command into a denied one. The headless runner passes the same list as `--allowedTools`, so a clone works even before the settings are trusted.

## The four phases

| Phase | Command | Reads | Writes | Subagents | Ends with |
|---|---|---|---|---|---|
| 1 Clarify | `/spec-clarify` | Ticket, code through the explorer | `00-clarification.md` | explorer (haiku) | Validator passes; person launches `/spec-plan` |
| 2 Plan | `/spec-plan` | `00`, `lessons.json`, journal tail | `01-research.md`, `02-design.md`, `03-plan.md` | explorer per layer, plan-auditor (opus) | Gate A design approval, Gate B scope check, Gate C audit (max 3 iterations) |
| 3 Implement | `/spec-implement` | `03-plan.md`, layer `CLAUDE.md`, confirmed lessons | Code, ticks in `03-plan.md` | developer-package (sonnet) then reviewer-package (opus), per layer `core -> ui -> agenda` | Person launches `/spec-validate` |
| 4 Validate | `/spec-validate` | All artefacts, the root scripts | `04-dod.md`, optionally `05-design-qa.md` | validator-global (haiku), design-qa (sonnet) when `.tsx` or `.css` changed | Verdict; ends the framework |

Rules shared by the phases: the ticket id is the only argument and must match `^[A-Z]+-\d+$`; a phase refuses to run when the previous artefact is missing or fails its validator; the main thread delegates large reads to the explorer.

Gate B is deliberately strict so it is visible in a demo: more than 15 files, more than 500 lines, or three layers with more than 6 new exported symbols means `Split` and the plan stops with a proposed split.

### Journal and lessons loop

`specs/<TICKET>/journal.jsonl` records what failed, deviated from the plan or was decided by a person. Things that went green first time are not recorded. Only `journal-append.mjs` writes it: it sets the timestamp, validates `phase`, `actor` and `kind`, redacts emails and token-like strings, and only appends. `/spec-retro` runs `lessons-aggregate.mjs`, which groups entries by layer and summary across tickets. A lesson is `candidate` when seen in one ticket, `confirmed` in two or more, and `applied` once a person has changed the harness because of it. `/spec-plan` loads only `confirmed` and `applied` lessons for the layers a ticket touches, and `retro.md` cites every claim as `DEMO-1#3` (ticket and journal line).

### Hooks and validators

| Piece | Trigger | Behaviour |
|---|---|---|
| `post-edit-eslint.sh` | `PostToolUse` on Edit, Write, MultiEdit | Runs `pnpm lint:file` on the edited `.ts` or `.tsx` file and feeds the ESLint output back to the model so it fixes the file now, including layer boundary violations |
| `journal-capture.mjs` | `SubagentStop` on the six agents | Requires the report to end with `JOURNAL: none` or a `JOURNAL ... END JOURNAL` block, blocks the stop if it is missing, and appends each entry through `journal-append.mjs` |
| `validate-clarification.mjs` | After writing `00` | Exact headings in order, no empty section, no open question |
| `validate-design.mjs` | After writing `02` | At least two alternatives, every decision `Status: closed`, no `TBD`, `TODO` or `open question` |
| `validate-plan.mjs` | After writing `03`, before implement | Interfaces per layer, a backticked path per step, EARS `WHEN` lines, `Blocking: 0` |

All of them are Node scripts with no dependency beyond built-ins, a test file next to each and fixtures under `.claude/scripts/fixtures/`. They run on a fresh clone before `pnpm install`. Details: `.claude/scripts/README.md`.

## Agents and models

| Agent | Model | Tools | Effort | Does | Must not | List price per 1M tokens (in / out) |
|---|---|---|---|---|---|---|
| explorer | haiku | Read, Grep, Glob, Bash (read-only) | low | Answers one search question with paths and excerpts | Edit anything, propose designs | Haiku 5.5: $0.10 / $0.50 |
| plan-auditor | opus | Read, Grep, Glob | high | Audits `03-plan.md` against `00` and `02`, reports findings by family F0 to F12 | Edit the plan, write code | Opus 5.5: $4 / $20 |
| developer-package | sonnet | Read, Edit, Write, Grep, Glob, Bash | medium | Implements the steps of one package, runs lint, typecheck and test for it, up to 3 fix attempts | Touch another package, change the plan | Sonnet 5.5: $2 / $10 |
| reviewer-package | opus | Read, Grep, Glob, Bash (read-only, git diff) | high | Reviews the diff of one package against the plan and the layer rules | Edit code | Opus 5.5: $4 / $20 |
| validator-global | haiku | Read, Write, Bash | low | Runs the root scripts and the validators, writes `04-dod.md` | Fix anything | Haiku 5.5: $0.10 / $0.50 |
| design-qa | sonnet | Read, Write, Bash (Playwright CLI) | medium | Screenshots per viewport, compares with `02-design.md` | Edit code | Sonnet 5.5: $2 / $10 |

The main thread (the `spec-*` skills) inherits the session model in interactive use; the DEMO-1 run used Fable 5.1 ($10 / $50). The headless runner sets `--model opus` by default, which the measured runs justify (see below); `CLAUDE_FLAGS` overrides it. A different model reviews than the one that wrote, so the reviewer does not share the developer's blind spots. Prices are list prices; Claude Code's cost output is a client-side estimate at those prices.

## Measured, not claimed

`docs/run-metrics.md` holds wall-clock time, turns, cost and tokens per model for every phase, copied from the usage fields of `claude -p --output-format json`, never estimated. The DEMO-1 run (headless, filter talks by track) took these values:

| Phase | Duration | Cost (USD) | Models |
|---|---|---|---|
| clarify | 196.8 s | 1.86 | Fable 5.1, Haiku 5.5 |
| plan | 681.5 s | 5.21 | Fable 5.1, Haiku 5.5, Opus 5.5 |
| implement | 384.2 s | 3.48 | Fable 5.1, Sonnet 5.5, Opus 5.5 |
| validate (blocked, `SETUP_ERROR`) | 81.4 s | 1.13 | Fable 5.1, Haiku 5.5 |
| validate (re-run, success) | 106.1 s | 1.19 | Fable 5.1, Haiku 5.5, Sonnet 5.5 |

The plan-auditor raised six findings over three iterations and ended at `Blocking: 0 · Recommendations: 1`. The findings were concrete: signatures using a global `JSX` namespace that React 19 types removed, a step whose insertion position contradicted its own ordering rule, text queries that also matched the filter's option labels, an acceptance-criterion path never exercised by the seed data, and two Definition-of-done clauses without a test that proved them. The developer needed one auto-fix attempt on a typecheck error, and the post-edit hook reported unused imports in a test file mid-edit. The final `04-dod.md` is `GREEN` (lint, typecheck, test, build and contracts all `PASS`).

The first validate pass blocked. The permission system denied `pnpm lint`, `typecheck`, `test` and `build` in headless mode, so the validator wrote no `04-dod.md`. The harness recorded it three ways: the validator's `blocked` journal entry, a `decision` entry by the runner, and a `BLOCKED.md` with reason `SETUP_ERROR`. The validator prompt was fixed and the phase re-run, and both attempts are rows in the file. Design QA was skipped in headless mode for the same class of reason: it needs a dev server and a browser.

DEMO-2 (favourites in localStorage) ran with the main thread on Opus 5.5 and stopped at Gate B: 22 files, 460 lines and 5 new exports against thresholds of 10, 300 and 3. The plan proposes three smaller tickets, the runner wrote `BLOCKED.md` with `NEEDS_DECISION` and exited 4. Clarify and plan cost 0.80 and 1.63 USD. `specs/DEMO-2/` is committed as it stopped, because a ticket too big for one PR is part of the story.

DEMO-1 also shows the gate being gamed. Its first layout touched 11 files; the headless run dropped the filter's CSS module to land on 10 and journaled it as a decision. The gate held, the model optimised for it. The answer was deterministic, not another prompt line: `validate-plan.mjs` recounts files from the steps and rejects a table or verdict that disagrees, and the contracts define what counts as a file and as an exported symbol. Two journal lines from DEMO-1's validate phase also predate a rule change: design QA tried to run headless before the skill made it interactive-only. The journal is append-only, so they stay.

DEMO-3 ("now" indicator) stopped at Gate B on its first attempt too: 12 files against 10, with an honest count this time (every function has a test file, so a three-layer feature is 11 to 13 files). That was the gate being too tight for this repo's conventions, not the ticket being too big, so a person moved the file threshold to 15, journaled the decision in `specs/DEMO-3/journal.jsonl`, and re-ran the ticket from clarify. DEMO-2 at 22 files still splits. The second attempt split again, on lines this time (340 against 300, an honest count that includes test files, blank lines and re-indented lines), so the line threshold moved to 500 with the same reasoning. The third attempt was cut short by the Claude usage limit, and the runner recorded that as a `SETUP_ERROR` block too. The fourth attempt is the complete run, headless on Opus 5.5:

| Phase | Duration | Cost (USD) | Models |
|---|---|---|---|
| clarify | 89.8 s | 0.60 | Opus 5.5, Haiku 5.5 |
| plan | 447.1 s | 2.39 | Opus 5.5, Haiku 5.5 |
| implement | 436.4 s | 2.42 | Opus 5.5, Sonnet 5.5 |
| validate (blocked, `SETUP_ERROR`) | 30.4 s | 0.36 | Opus 5.5, Haiku 5.5 |
| validate (re-run, `GREEN`) | 67.0 s | 0.11 | Opus 5.5, Haiku 5.5 |

The plan passed the audit in one iteration, the reviewer left two notes and no blocker, and `04-dod.md` is `GREEN` with 96 Vitest tests. The validate block was the allowlist again: it covered `pnpm lint`, `typecheck`, `test` and `build` but not `pnpm --version`, which is the validator's setup check. Every attempt and every stop is in `specs/DEMO-3/journal.jsonl`, in order, because the journal is never edited.

DEMO-4 (filter by room) is the recorded run, `docs/recordings/headless-demo-4.cast`, made on the committed tree and then reset so the ticket stays available to try. Its first attempt split on the symbol count: with types counted, two functions, one component and its props type are 4 against a threshold of 3, which would have split DEMO-1 too. The threshold moved to 6, the third and last calibration. Its second attempt ended `RED`: the validator ran `pnpm test` and one runner test failed because it inherited the run's own `CLAUDE_FLAGS`; a test isolation bug, fixed, and the harness did what it should, a `RED` verdict and a stop instead of a green stamp. The third attempt is the recording:

| Phase | Duration | Cost (USD) | Models |
|---|---|---|---|
| clarify | 70.6 s | 0.57 | Opus 5.5, Haiku 5.5 |
| plan | 439.4 s | 2.59 | Opus 5.5, Haiku 5.5 |
| implement | 478.9 s | 2.49 | Opus 5.5, Sonnet 5.5 |
| validate | 63.3 s | 0.36 | Opus 5.5, Haiku 5.5 |

Seventeen minutes and 6.00 USD from ticket to `GREEN`, with 10 steps across the three layers, 12 subagent runs, 12 validator calls and 6 tool errors the agents recovered from. The run is shown step by step in `docs/demo/index.html`, a single page generated from the recording, the artefacts, the journal and the metrics by `node scripts/build-demo-page.mjs`: nine screens, the lines that matter framed, one narration card per frame, texts in Spanish and English (`l` toggles), keyboard driven, no network, with the repo QR on the closing screen. Everything, attempts included, is in `specs/DEMO-4/journal.jsonl`; the artefacts and the code were reset so the ticket is clean for the next person.

Same harness, two main-thread models: DEMO-1 on Fable 5.1 cost 11.74 USD for its four successful phases; DEMO-3 and DEMO-4 on Opus 5.5 cost 5.52 and 6.00 USD for the same four, with the subagents on the same models in all three.

## Autopilot and adversarial review

`scripts/headless.sh <TICKET>` exports `SPEC_HEADLESS=1` and runs the four skills in series through `claude -p`, with the main thread on Opus 5.5 unless `CLAUDE_FLAGS` says otherwise. Where a phase would ask a person, it takes the conservative option and journals a `decision` with actor `headless`. It streams one line per tool call and subagent to the terminal (`▶ Agent explorer`, `✓ Write specs/DEMO-3/00-clarification.md`), appends time and cost per phase to `docs/run-metrics.md`, and stops at the first block. After each phase it runs that phase's validator itself, so a phase that ends in prose instead of an artefact is a block, not a success. It refuses to start on a dirty `apps/` or `packages/` tree unless `HEADLESS_ALLOW_DIRTY=1`.

| Exit code | Meaning |
|---|---|
| 0 | All four phases done |
| 1 | `claude` or `git` failed |
| 2 | Usage error: bad ticket id, or a dirty `apps/` or `packages/` tree |
| 4 | Blocked: a phase wrote `specs/<TICKET>/BLOCKED.md`, a post-phase check failed, or the file already existed |

`BLOCKED.md` holds one reason (`PLAN_MISMATCH`, `TEST_FAIL_BUDGET`, `SETUP_ERROR` or `NEEDS_DECISION`), one sentence on where and why, and the blocking agent's report. The runner refuses to start while the file exists: read it, resolve the cause, delete it, run again.

`scripts/adversarial-review.sh <base> <head>` sends `git diff base..head` to an Opus reviewer that lists findings. A Sonnet reviewer then tries to refute each one, for up to 3 rounds. If no finding is still disputed it prints `CONSENSUS` with them; otherwise it prints `NO CONSENSUS` and a person decides.

| Exit code | Meaning |
|---|---|
| 0 | `CONSENSUS` (including an empty diff or no findings) |
| 3 | `NO CONSENSUS` |
| 1 | Error (git or `claude` failed) |
| 2 | Usage error |

## Talk

**Harness Engineering: construyendo el entorno para que tu agente de IA escriba código rápido y óptimo**, BiznagaFest 2026, Málaga.

Speakers: Joan Leon ([@nucliweb](https://github.com/nucliweb)) and Carlos Villuendas ([@carlosvillu](https://github.com/carlosvillu)).

Slide-by-slide map to the files: [`docs/slides-to-repo.md`](docs/slides-to-repo.md). Run of show for the talk (the step-by-step page, then the repo): [`docs/demo-script.md`](docs/demo-script.md). The page: [`docs/demo/index.html`](docs/demo/index.html), rebuilt with `node scripts/build-demo-page.mjs`.

## License

MIT, see [`LICENSE`](LICENSE).
