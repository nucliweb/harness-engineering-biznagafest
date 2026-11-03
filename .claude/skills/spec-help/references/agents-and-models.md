# Agents and models

Each agent does one thing in a clean context and gets the cheapest model that does that thing reliably. Files: `.claude/agents/<name>.md`. Contract: `docs/contracts.md` §8.

| Agent | Model | Effort | Tools | Does | Must not |
|---|---|---|---|---|---|
| main thread (`spec-*` skills) | inherit | inherit | all | Talks to the person, orchestrates, writes artefacts | Grep the whole repo itself |
| explorer | haiku | low | Read, Grep, Glob (no shell) | Answers one search question with paths and excerpts | Edit anything, propose designs |
| plan-auditor | opus | high | Read, Grep, Glob | Audits `03-plan.md` against `00` and `02`, reports findings by family | Edit the plan, write code |
| developer-package | sonnet | medium | Read, Edit, Write, Grep, Glob, Bash | Implements one package's steps, runs `lint:file`, `typecheck`, `test` for it, up to 3 fix attempts | Touch another package, change the plan |
| reviewer-package | opus | high | Read, Grep, Glob, Bash (`git diff` and `git ls-files` only, a prompt rule) | Reviews one package's diff against the plan and the layer rules | Edit code |
| validator-global | haiku | low | Read, Write, Bash | Runs the root scripts and the validators, writes `04-dod.md` | Fix anything |
| design-qa | sonnet | medium | Read, Write, Bash (Playwright CLI) | Screenshots per viewport, compares with `02-design.md` (optional) | Edit code |

## Why each model

| Agent | Reason |
|---|---|
| main thread | Conversational, holds the person's context |
| explorer | Read-only searches over many files. Volume, not judgement |
| plan-auditor | Judges a plan with no code to run. Finding quality is the whole value |
| developer-package | Narrow scope, explicit steps, validated by scripts |
| reviewer-package | A different model than the developer, so they do not share blind spots |
| validator-global | Runs scripts, reads exit codes, fills a template |
| design-qa | Vision over screenshots plus judgement |

## Who calls whom

| Skill | Agents |
|---|---|
| `/spec-clarify` | explorer |
| `/spec-plan` | explorer (inventory), plan-auditor (Gate C) |
| `/spec-implement` | developer-package, reviewer-package, per layer, in series |
| `/spec-validate` | validator-global; design-qa, developer-package, reviewer-package for visual fixes |
| `/spec-retro` | none; `lessons-aggregate.mjs` does the counting |

Every agent ends its report with a JOURNAL block (`journal.md`) and may raise the block reasons in `block-reasons.md`. developer-package, reviewer-package and plan-auditor get the `monorepo-conventions` skill injected through their `skills` field.
