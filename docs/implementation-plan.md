# Implementation plan: demo repo for the "Harness Engineering" talk (BiznagaFest)

Status: approved plan (v2). Kept as the record of what was decided and why; `docs/contracts.md` and the README describe the current state where they differ (artefacts under `specs/`, validator tests on `node:test`).

## What the audience comes for

The question after the talk is "where can I see that?". "That" is the harness, not the app. In order of what people will open:

1. `.claude/` : the skills, the agents, the hooks, the scripts. Real files they can copy.
2. `specs/FEATURE-1/` : the artefacts one ticket produces, with its `journal.jsonl`. The "salida esperada" slide, verbatim.
3. The README : a slide-by-slide map to those files, plus the measured time and cost of the run.
4. The app : a prop. It only has to be predictable, layered and boring.

The build plan below is weighted the same way. The app is a fictional conference agenda with no relation to any company, product or client. No internal tool names, no internal layer names.

## Demo app

A conference agenda for a fictional event: talks, rooms, tracks, favourites. Three layers, which is the minimum that makes "capa a capa" and the lint boundaries real.

```
apps/agenda       React + Vite app: pages, routing
packages/ui       Presentational components and CSS tokens
packages/core     Domain logic, pure TypeScript, no React
```

Dependency direction enforced by ESLint: `agenda -> ui -> core`, never upwards. Each package has its own `CLAUDE.md` with its conventions. That is the "convenciones por capa" lesson made visible.

Stack: pnpm workspaces, TypeScript, React, Vite, Vitest, ESLint flat config with an architecture rule set. i18n es/en only if the design-qa agent ships; otherwise the app is English-only and simpler.

Tickets live in `tickets/<TICKET>.md` instead of an issue tracker. The README says the tracker version is one MCP call away.

## Harness layout

```
.claude/
  settings.json                 hooks wiring
  skills/
    spec-clarify/SKILL.md       phase 1, conversational, writes 00-clarification.md
    spec-plan/SKILL.md          phase 2, inventory -> design -> plan, gates A/B/C
    spec-implement/SKILL.md     phase 3, developer + reviewer per package, in series
    spec-validate/SKILL.md      phase 4, global validators, 04-dod.md
    spec-retro/SKILL.md         aggregates journals -> retro.md, lessons.json
    monorepo-conventions/       layer rules, loaded by every phase
    spec-help/SKILL.md          index + references/*.md, one topic per file
  agents/
    explorer.md                 read-only searches, isolated context
    plan-auditor.md             audits 03-plan.md, finding families F0-F12
    developer-package.md        implements one package's steps, lint/typecheck/test, 3 auto-fix attempts
    reviewer-package.md         independent review of that package's diff
    validator-global.md         runs global validators, fills 04-dod.md
    design-qa.md                browser QA against 02-design.md (stretch)
  hooks/
    post-edit-eslint.sh         PostToolUse on Edit/Write: lint the touched file now, not at the end
    journal-capture.mjs         SubagentStop: require the JOURNAL block, append to journal.jsonl
  scripts/
    validate-clarification.mjs  required sections present
    validate-design.mjs         every decision closed, no "TBD"
    validate-plan.mjs           interfaces, pseudocode per file, DoD per layer
    journal-append.mjs          append-only, PII filter, sealed timestamp
    lessons-aggregate.mjs       journal.jsonl x N tickets -> lessons.json (candidate -> confirmed at 2)
  specs/
    FEATURE-1/                     run before the talk, committed: 00..04 + journal.jsonl
    FEATURE-2/                     run before the talk, committed: gives lessons.json a confirmed lesson
    retro.md, lessons.json      output of spec-retro over FEATURE-1 and FEATURE-2
tickets/
  FEATURE-1.md                     filter talks by track
  FEATURE-2.md                     favourites persisted in localStorage
  FEATURE-3.md                     "now" indicator on the schedule: the live one, kept unrun
scripts/
  headless.sh                   SPEC_HEADLESS=1 claude -p over the four phases, BLOCKED.md on any pause
  adversarial-review.sh         reviewer (opus) vs rebuttal (sonnet), 3 rounds, consensus or human
docs/
  implementation-plan.md        this file
  contracts.md                  artefact formats and schemas (phase 0 output)
  demo-script.md                run of show, timings, fallback
  run-metrics.md                time and cost per phase of FEATURE-1 and FEATURE-2
```

Two scripts move from stretch to the core set because they illustrate the slides people will ask about most ("piloto automático" and "dos modelos discuten") and each one is a short shell script around `claude -p`. The durable agent, the Kanban, the CI and the feature flag release stay out: the README describes them as the production layer around the same four phases.

## Models inside the demo harness

Audience-facing content. It is the "cada pieza en su sitio" lesson applied to model choice, and the README shows the price column next to it.

| Agent | Model | Why |
|---|---|---|
| main thread (`spec-*` skills) | inherit | Conversational, holds the user's context |
| explorer | haiku | Read-only searches over many files. Volume, not judgement |
| plan-auditor | opus | Judges a plan with no code to run. Finding quality is the whole value |
| developer-package | sonnet | Narrow scope, explicit steps, validated by scripts |
| reviewer-package | opus | A different model than the developer, so they do not share blind spots |
| validator-global | haiku | Runs scripts, reads exit codes, fills a template |
| design-qa | sonnet | Vision over screenshots plus judgement. Stretch |

Effort hints live in each agent prompt: low for explorer and validator, high for auditor and reviewer. Alias names resolve to the current generation in Claude Code 2.1.x; checked at build time.

## Measured, not claimed

The talk title promises "rápido y óptimo". The repo backs it with numbers from the real runs of FEATURE-1 and FEATURE-2: wall-clock per phase, tokens and cost per phase, per agent, how many auto-fix attempts the developer needed, how many auditor iterations the plan took. Collected from Claude Code's cost output during the rehearsal and written to `docs/run-metrics.md`. This is the part a performance-minded audience will trust.

## Live demo

Assumption: 8 to 10 minutes of demo inside the talk. A full four-phase run does not fit, and a plan with three gates is not stage material. Proposal:

- Open `specs/FEATURE-1/` and the journal while telling the story of the four phases. Two minutes.
- Run `/spec-clarify FEATURE-3` live: it is conversational and short, and shows the explorer subagent and the artefact appearing. Three minutes.
- Show the hook firing: edit a file in the wrong layer, watch the lint hook reject it. One minute.
- Play the terminal recording of `scripts/headless.sh` finishing FEATURE-2 end to end, sped up. Two minutes.

Fallback for every step: the committed artefacts and the recording. Nothing on stage depends on the network except the one live phase. `docs/demo-script.md` holds the exact commands.

## Build plan with subagents

Four phases plus a stretch. The main thread (Fable 5.1) writes the contracts, integrates, runs the rehearsals and edits. It does not write bulk code.

### Phase 0: contracts (main thread)

Freeze in `docs/contracts.md`: the required sections of `00-clarification.md`, `02-design.md`, `03-plan.md`, `04-dod.md`; the `journal.jsonl` record and the JOURNAL block a subagent must emit; the `lessons.json` schema; the layer rules and package names. Every phase 1 agent gets this file as its brief.

### Phase 1: three builders in parallel

| Task | Agent | Model | Brief |
|---|---|---|---|
| 1a App scaffold | general-purpose | sonnet | pnpm monorepo, three packages, agenda app with seed data, Vitest, ESLint boundaries, per-package CLAUDE.md. Tests first; `pnpm dev` must run. |
| 1b Scripts and hooks | general-purpose | sonnet | Five validators, two hooks, `headless.sh`, `adversarial-review.sh`. Each validator has Vitest tests over fixture files. No LLM call inside any validator. |
| 1c Skills and agents | general-purpose | opus | Five `spec-*` skills, `monorepo-conventions`, `spec-help` with references, six agent files with frontmatter. Must match `contracts.md` exactly. |

1a and 1b are boilerplate against a fixed contract: Sonnet 5.5 is as reliable there as Opus at a fifth of the price. 1c is the prompt engineering the audience will read line by line: Opus 5.5.

### Phase 2: integration and rehearsal (main thread)

Wire the hooks, run lint, typecheck, test, build. Run FEATURE-1 and FEATURE-2 with the real harness, no shortcuts, collecting metrics. Fix friction in skills and scripts as it appears. Run `spec-retro` over both. Commit the artefacts. Exit criterion: a fresh clone passes `pnpm i && pnpm test`, every artefact passes its validator, `lessons.json` has at least one confirmed lesson.

### Phase 3: review and docs, in parallel

| Task | Agent | Model |
|---|---|---|
| 3a Harness review: skills, agents, hooks, scripts, against the slides | agent-skills:code-reviewer | opus |
| 3b README: Spanish intro and English body, quick start, slide-to-file map, model table with prices, metrics summary | general-purpose | sonnet |
| 3c `docs/demo-script.md` | general-purpose | sonnet |

The app gets no separate review: lint, boundaries and tests cover a prop. Review findings go back to the phase 1 owner of that area. Final editing of the README by the main thread.

### Phase 4: dress rehearsal (main thread)

Fresh clone, run the live sequence above with a stopwatch, record `headless.sh` on FEATURE-2 with asciinema, then reset FEATURE-3 so it stays unrun.

### Stretch, only if phases 0 to 4 are done by Thursday

| Item | Agent | Model |
|---|---|---|
| design-qa agent with Playwright screenshots, plus es/en i18n so it has "idiomas de riesgo" to check | general-purpose | sonnet |

## Timeline

Today is Monday 2026-11-03, the talk is Saturday 2026-11-07.

| Day | Phases |
|---|---|
| Monday | 0, 1 |
| Tuesday | 2 |
| Wednesday | 3, 4 |
| Thursday | Stretch or buffer |
| Friday | Nothing new |

## Assumptions to confirm

1. Demo slot of 8 to 10 minutes. If it is shorter, the live phase goes and only the recording stays.
2. Three pre-written tickets, two run before the talk, one live.
3. Code, prompts and docs in English; README opens in Spanish for the room.
4. The repo stays under the current name and goes public before Saturday. Commits need your approval, as always.
