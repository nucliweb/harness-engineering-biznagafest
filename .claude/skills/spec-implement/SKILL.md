---
name: spec-implement
description: Phase 3 of the spec-driven flow. Implements an audited plan layer by layer (core, ui, agenda), one developer-package and one reviewer-package run per layer, ticking steps in 03-plan.md.
argument-hint: "[TICKET]"
disable-model-invocation: true
---

# spec-implement $0

Purpose: land the plan one layer at a time. You orchestrate; the subagents write and review code.
Output: code in `packages/` and `apps/`, steps ticked in `specs/$0/03-plan.md`. Then stop.

## Preconditions

1. `$0` matches `^[A-Z]+-\d+$`. If not, reply `Usage: /spec-implement <TICKET>` and stop.
2. The plan passes its validator and its Scope check verdict is `Single PR`:
   ```
   node .claude/scripts/validate-plan.mjs specs/$0/03-plan.md
   ```
   If the file is missing, the script exits 1, or the verdict is `Split`, reply `Run /spec-plan $0 first` and stop.

## Context

1. Read `specs/$0/03-plan.md`. Steps already `[x]` are done: the plan is the resumable state, so a second run continues where the first stopped.
2. Read the last 20 lines of `specs/$0/journal.jsonl` if it exists (the journal tail).
3. Load the `monorepo-conventions` skill.
4. Read `specs/lessons.json` if it exists; keep entries with `status` `confirmed` or `applied`.

## Loop, one layer at a time, in order `core -> ui -> agenda`

Skip a layer whose `### <layer>` Steps say `- None` or are all `[x]`. Never run two layers in parallel: ui builds on core, agenda on both.

| Layer | Folder | Package | Conventions |
|---|---|---|---|
| core | `packages/core` | `@agenda/core` | `packages/core/CLAUDE.md` |
| ui | `packages/ui` | `@agenda/ui` | `packages/ui/CLAUDE.md` |
| agenda | `apps/agenda` | `@agenda/app` | `apps/agenda/CLAUDE.md` |

1. **Develop.** Ask the `developer-package` agent. Paste everything; it starts with a clean context:
   ```
   Ticket: $0 (specs/$0/)
   Layer: <layer> (<folder>, <package>)
   Mode: implement
   Steps:
   <the layer's unticked step lines, verbatim>
   Interfaces:
   <the layer's ts block from ## Interfaces, verbatim>
   Layer conventions (<conventions path>):
   <full content of that CLAUDE.md>
   Lessons: <lessons whose layer is this layer, or "none">
   Journal tail:
   <the journal tail, or "none">
   ```
2. **Blocked?** If the report says `Result: BLOCKED <reason>`, stop the loop. Show the reason and the report and ask the person how to continue (see `spec-help` reference `block-reasons.md`). Journal the answer as `user_decision`. If the answer changes a step, edit `03-plan.md`, re-run `validate-plan.mjs`, journal a `deviation`, and run step 1 again.
3. **Tick.** For each step the developer reports as done, change `- [ ] S<n>` to `- [x] S<n>` in `03-plan.md` with the Edit tool (not `sed`; shell edits of the spec are denied). Tick nothing it did not report.
4. **Review.** Ask the `reviewer-package` agent:
   ```
   Ticket: $0 (specs/$0/)
   Layer: <layer> (<folder>, <package>)
   Steps:
   <the layer's step lines, verbatim>
   Interfaces:
   <the layer's ts block, verbatim>
   Definition of done:
   <the layer's EARS lines, verbatim>
   Layer conventions (<conventions path>):
   <full content of that CLAUDE.md>
   ```
5. **Fix once.** If the review has `BLOCKING` findings, run `developer-package` again with `Mode: fix` and the findings pasted under `Findings:`, then run `reviewer-package` once more. If `BLOCKING` findings remain, show them and ask the person; journal the answer as `user_decision`. `NOTE` findings need no action; the reviewer has journaled them.
6. Next layer.

## Journal

Subagents journal their own events (`autofix_failed`, `blocked`, `reviewer_finding`, ...) through their JOURNAL block. You only journal what a person decided or what changed the plan:

```
node .claude/scripts/journal-append.mjs --ticket $0 --phase implement --actor main --kind <user_decision|deviation> --summary "<one sentence>" [--files a,b]
```

## Pause

When every step of every layer is `[x]`:

```
Implementation of $0 done: <n> steps across <layers>.
Reviewer: <blocking found> blocking findings, <notes> notes.
Next phase, when you are ready: /spec-validate $0
```

Do not run the global checks yourself; that is phase 4.

## Headless (`SPEC_HEADLESS=1`)

Never ask. Use `--actor headless` in every journal call.

- On `BLOCKED <reason>` from any agent, or `BLOCKING` findings that survive the fix round, write `specs/$0/BLOCKED.md` with the reason (`NEEDS_DECISION` for surviving findings) and the agent's report verbatim, then stop. Format: `spec-help` reference `headless.md`.
