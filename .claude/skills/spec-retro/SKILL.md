---
name: spec-retro
description: Optional retrospective over one or more tickets. Aggregates journals into lessons.json and writes retro.md with every claim citing a journal line, proposing harness changes a person applies.
argument-hint: "[TICKET ...]"
disable-model-invocation: true
---

# spec-retro $ARGUMENTS

Purpose: close the loop. What went wrong in past tickets becomes lessons the next `/spec-plan` loads.
Output: `specs/lessons.json` (by script) and `specs/retro.md` (by you). Proposals only; nothing in the harness changes.

## Preconditions

1. Every id in `$ARGUMENTS` matches `^[A-Z]+-\d+$`. If one does not, reply `Usage: /spec-retro [TICKET ...]` and stop.
2. No ids means every ticket that has a journal: `ls specs/*/journal.jsonl`.
3. Each selected ticket has `specs/<TICKET>/journal.jsonl`. Skip and mention any that does not.

## Steps

1. Aggregate lessons. The script groups entries by layer and summary across every journal, promotes a lesson to `confirmed` when it appears in two tickets, and never deletes or demotes:
   ```
   node .claude/scripts/lessons-aggregate.mjs
   ```
2. Read `specs/lessons.json`.
3. Read each selected journal with line numbers (`cat -n specs/<TICKET>/journal.jsonl`). A citation is `<TICKET>#<line>`, 1-based: `FEATURE-1#3` is the third line of FEATURE-1's journal.
4. Write `specs/retro.md` (overwrite; git keeps earlier versions):
   ```
   # Retro · <TICKET, TICKET>
   ## What happened
   ## Patterns
   ## Proposed harness changes
   ## Not proposed
   ```
   - `What happened`: per ticket, at most 5 bullets: blocks, failed auto-fixes, reviewer and auditor findings, person decisions.
   - `Patterns`: what repeats across tickets, with the lesson id from `lessons.json` (`L1`).
   - `Proposed harness changes`: table `change | file to edit | evidence | lesson`. Files are harness files: a skill, an agent, a package `CLAUDE.md`, a validator, a hook. Prefer a script or lint rule over a prompt line when the check is deterministic.
   - `Not proposed`: things seen once, left as candidates.
5. Check the citations: every bullet and table row ends with at least one `<TICKET>#<line>`, and each cited line exists and says what you claim. Remove any claim you cannot cite.
6. Show the proposals table in the chat.

## Hard limits

- Never apply a proposal. Do not edit skills, agents, hooks, scripts or `CLAUDE.md` files.
- Never edit `lessons.json` by hand and never set a lesson to `applied`; a person does that after changing the harness.
- Never edit a `journal.jsonl`.

## Journal

The retro reads journals. It appends only when the person accepts or rejects a proposal in this conversation, on the ticket of the proposal's first citation:

```
node .claude/scripts/journal-append.mjs --ticket <TICKET> --phase retro --actor main --kind user_decision --summary "<proposal>: accepted|rejected"
```

## Pause

```
Retro written: specs/retro.md (<n> proposals, <m> confirmed lessons)
Apply the proposals you agree with, then set those lessons to "applied" in specs/lessons.json.
```

## Headless (`SPEC_HEADLESS=1`)

Same steps. This skill asks nothing, so there is nothing to skip.
