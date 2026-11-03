---
name: spec-plan
description: Phase 2 of the spec-driven flow. Inventory, design and plan for a clarified ticket, with three gates (design approval, scope check, plan audit). Writes 01-research.md, 02-design.md and 03-plan.md.
argument-hint: "[TICKET]"
disable-model-invocation: true
---

# spec-plan $0

Purpose: turn the agreed clarification into a plan a developer agent can follow without deciding anything.
Output: `01-research.md`, `02-design.md`, `03-plan.md` in `specs/$0/`. Three gates on the way. Then stop.

## Preconditions

1. `$0` matches `^[A-Z]+-\d+$`. If not, reply `Usage: /spec-plan <TICKET>` and stop.
2. The previous artefact passes its validator:
   ```
   node .claude/scripts/validate-clarification.mjs specs/$0/00-clarification.md
   ```
   If the file is missing or the script exits 1, reply `Run /spec-clarify $0 first` and stop.

## Context

1. Read `specs/$0/00-clarification.md`. It is the contract for this phase: do not add scope it does not list.
2. Load the `monorepo-conventions` skill.
3. Deduce the candidate layers (`core`, `ui`, `agenda`) from `## Scope` and `## Code anchors`.
4. Load lessons: read `specs/lessons.json` if it exists and keep only entries with `status` `confirmed` or `applied` whose `layer` is a candidate layer. Apply them in design and plan.
5. If `specs/$0/journal.jsonl` exists, read its last 20 lines.

## Inventory: `01-research.md`

1. Ask the `explorer` agent once per candidate layer, in parallel. Prompt:
   ```
   Ticket: $0 (specs/$0/)
   Question: What already exists in <layer folder> related to <Scope bullets>? Types, functions, components, tests and patterns worth reusing.
   Where: <layer folder>
   Return: facts with `path:line`, no recommendations
   ```
2. Write `specs/$0/01-research.md`: `# $0 · Research`, then `## Inventory` (with `### core`, `### ui`, `### agenda`), `## Existing patterns`, `## Gaps`. Facts only. No decisions here.

## Design: `02-design.md`

1. Write `specs/$0/02-design.md`: `# $0 · Design`, then:
   - `## Alternatives`: at least two, each `### A1 <name>` with a `Pros:` and a `Cons:` bullet.
   - `## Decisions`: `- D1 <text>. Status: closed.` Every decision closed.
   - `## Layer assignment`: table `change | layer | file`, respecting the layer rules.
   - `## Risks`: bullets, or `- None`.
   - The validator rejects the words `TBD`, `TODO` and `open question` anywhere in the file. If something is still open, close it with the person at Gate A.
2. Validate and fix until it exits 0:
   ```
   node .claude/scripts/validate-design.mjs specs/$0/02-design.md
   ```
3. **Gate A, design.** Show the chosen alternative, the decisions and the layer assignment in under 15 lines. Ask `Approve the design? (approve / changes)`. On changes: apply them, re-validate, journal a `user_decision`, ask again.

## Plan: `03-plan.md`

Write `specs/$0/03-plan.md`: `# $0 · Plan`, leave `## Scope check` for Gate B, then:

1. `## Interfaces`: `### core`, `### ui`, `### agenda`, in that order, each with one fenced `ts` block holding every exported signature the layer adds or changes, or `- None`.
2. `## Steps`: `### core`, `### ui`, `### agenda`, in that order, each a checklist or `- None`. One step per line, numbered across the whole plan, one file per step:
   ```
   - [ ] S1 `packages/core/src/filterTalks.ts` — export filterTalksByTrack(talks, track): Talk[]; return talks unchanged when track is null
   - [ ] S2 `packages/core/src/filterTalks.test.ts` — cover null track, unknown track, matching track
   ```
   The pseudocode must be precise enough that the developer decides nothing. Every file with logic gets a test step next to it.
3. `## Definition of done`: `### core`, `### ui`, `### agenda`, in that order, each with EARS lines `WHEN <trigger> THE <layer> SHALL <observable result>`, or `- None`. Every acceptance criterion maps to at least one line.

## Scope check (Gate B)

1. Count from the drafted plan, with the definitions from `docs/contracts.md` §4.4, so the count cannot be bent:
   - **files touched** is the number of distinct backticked paths in `## Steps`;
   - **a new exported symbol** is any `export` added to a package's `index.ts`, types included;
   - **lines estimated** is your estimate of lines added or changed, rounded up; **layers touched** are the layers with steps.
2. Verdict is `Split` when any holds: more than 15 files; more than 500 lines; all three layers touched with more than 6 new exported symbols. Otherwise `Single PR`.
3. Write `## Scope check` at the top of the plan: the table and the verdict line.
   ```
   | files touched | lines estimated | layers touched | new exported symbols |
   |---|---|---|---|
   | 6 | 120 | core, ui, agenda | 2 |

   Verdict: Single PR
   ```
   `validate-plan.mjs` recomputes the file count from the steps and rejects a plan whose table or verdict disagrees with it.
4. Never change the design, or merge, drop or rename steps, to pass Gate B. If the honest numbers say `Split`, stop and let a person decide: add the proposed split under the verdict (one bullet per smaller ticket with its scope and its own numbers), journal a `decision`, tell the person, and end the phase. The plan has no `## Audit`, so `/spec-implement` refuses it. Headless: `BLOCKED.md` with `NEEDS_DECISION`.

## Audit (Gate C)

1. Ask the `plan-auditor` agent. Prompt:
   ```
   Ticket: $0 (specs/$0/)
   Audit: specs/$0/03-plan.md
   Against: specs/$0/00-clarification.md and specs/$0/02-design.md
   Lessons: <the filtered lessons, or "none">
   Iteration: <k> of 3
   ```
2. Fix every 🔴 finding in `03-plan.md` (and in `02-design.md` if a decision changes; re-validate it). Apply 🟡 recommendations when they are cheap. Re-run the auditor. At most 3 iterations.
3. If 🔴 findings remain after iteration 3, show them. For each, the person dictates a fix or dismisses it as a false positive; journal each as `user_decision`. Dismissed findings do not count as blocking.
4. Append the last section of the plan. Copy the counts of the last auditor pass; do not type `0` by hand:
   ```
   ## Audit
   Blocking: <n> · Recommendations: <m> · Iterations: <k>
   ```
   The only change allowed to `<n>` is the person's ruling in step 3: a 🔴 the person fixed by dictation or dismissed no longer counts. Any other 🔴 still counts, and `validate-plan.mjs` rejects anything but `Blocking: 0`. That rejection is the point: an unaudited blocker cannot reach `/spec-implement`.
5. Validate and fix until it exits 0. An `audit-blocking` failure sends you back to step 2 while iterations remain, then to step 3; never to the number:
   ```
   node .claude/scripts/validate-plan.mjs specs/$0/03-plan.md
   ```

## Journal

Call `node .claude/scripts/journal-append.mjs --ticket $0 --phase plan --actor main --kind <kind> --summary "<one sentence>" [--files a,b]` for:

| Event | Kind |
|---|---|
| Person asks for changes at Gate A | `user_decision` |
| Gate B verdict `Split` | `decision` |
| Person fixes or dismisses a remaining blocker at Gate C | `user_decision` |
| Design or plan departs from `00-clarification.md` with the person's agreement | `deviation` |

The explorer and the plan-auditor journal their own findings through their JOURNAL block; do not repeat them.

## Pause

```
Plan for $0 written, audited and validated: specs/$0/03-plan.md
<Audit line>
Next phase, when you are ready: /spec-implement $0
```

## Headless (`SPEC_HEADLESS=1`)

Never ask. Use `--actor headless` in every journal call.

| Point | Headless behaviour |
|---|---|
| Gate A | Approve the design as written; journal `decision` "Gate A approved without review in headless mode" |
| Gate B `Split` | Write the Scope check, then `BLOCKED.md` with reason `NEEDS_DECISION`, and stop |
| Gate C blockers after 3 iterations | Write `BLOCKED.md` with reason `NEEDS_DECISION` and the auditor's last report, and stop |

Gate details and thresholds: `spec-help` reference `gates.md`. `BLOCKED.md` format: `headless.md`.
