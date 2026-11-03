---
name: spec-clarify
description: Phase 1 of the spec-driven flow. Turns a ticket into an aligned, validated 00-clarification.md through a short conversation anchored in real code.
argument-hint: "[TICKET]"
disable-model-invocation: true
---

# spec-clarify $0

Purpose: agree with the person on what ticket `$0` means before anyone designs or writes code.
Output: `specs/$0/00-clarification.md`, validated by a script. Then stop.

## Preconditions

1. `$0` matches `^[A-Z]+-\d+$`. If not, reply `Usage: /spec-clarify <TICKET>, for example /spec-clarify FEATURE-3` and stop.
2. `tickets/$0.md` exists. If not, say so and stop. (In a team setup an issue-tracker MCP call replaces this file read; nothing else in the flow changes.)
3. This is phase 1, so there is no previous artefact to validate.

## Steps

1. Read `tickets/$0.md`.
2. Load the `monorepo-conventions` skill.
3. Ask the `explorer` agent for code anchors. Do not grep the repo yourself; the explorer works in its own context and returns only what matters. Prompt:
   ```
   Ticket: $0 (specs/$0/)
   Question: Which files and lines in apps/ and packages/ would this ticket touch or build on? <paste the ticket's Description and Acceptance criteria>
   Where: apps packages
   Return: up to 10 anchors as `path:line` with one line of why each, grouped by layer (core, ui, agenda)
   ```
4. Find the gaps: compare the ticket with the anchors. List what is ambiguous, missing or contradicts the code. Typical gaps: an acceptance criterion with no observable result, a behaviour the code already does differently, an edge case (empty list, first load, invalid stored data), which layer owns a rule.
5. Question and answer with the person (interactive mode only, see Headless):
   - At most 5 questions, one at a time, most important first.
   - Each question cites a code anchor and offers a recommended answer: `packages/core/src/types.ts:21 gives every talk one trackId. Can a person select several tracks at once, or one at a time? Recommended: one at a time, plus "All".`
   - Stop asking when every acceptance criterion is observable and every scope item has an owner layer.
6. Write the aligned summary in the chat: Goal, Scope, Out of scope, Acceptance criteria, in the words you will put in the file. Ask: `Is this what we agreed? (yes / changes)`. Apply changes and ask again until the person says yes.
7. Write `specs/$0/00-clarification.md` with exactly this structure (format in `spec-help` reference `artefacts.md`):
   ```
   # $0 · Clarification
   ## Goal
   ## Scope
   ## Out of scope
   ## Acceptance criteria
   ## Code anchors
   ## Open questions
   ```
   `## Open questions` must be `- None`. If a question is still open, go back to step 5; do not write it down and move on.
8. Validate:
   ```
   node .claude/scripts/validate-clarification.mjs specs/$0/00-clarification.md
   ```
   On exit 1, fix every reported failure and run it again until it exits 0.

## Journal

Interactive answers are not journaled: the person confirmed them in the aligned summary, so `00-clarification.md` is their record, and the journal is for friction, which an agreed answer is not. Only headless decisions are journaled (see below), because no person confirmed them.

## Pause

End with exactly:

```
Clarification for $0 written and validated: specs/$0/00-clarification.md
Next phase, when you are ready: /spec-plan $0
```

Do not start `/spec-plan` yourself. A person decides when to continue.

## Headless (`SPEC_HEADLESS=1`)

Headless mode is on when the system prompt says `SPEC_HEADLESS=1` (set by `scripts/headless.sh`). Do not probe the environment with Bash. When it is on:

1. Skip step 5 and the confirmation in step 6. Never ask the person anything.
2. For every gap, take the conservative answer: the narrowest reading of the ticket, the existing code behaviour, and no new scope.
3. Journal each one. The journal has no clarify phase, so use `plan`:
   ```
   node .claude/scripts/journal-append.mjs --ticket $0 --phase plan --actor headless --kind decision --summary "<gap>: <answer taken>" --files <anchor paths, comma separated>
   ```
4. If a gap has no safe conservative answer, write `specs/$0/BLOCKED.md` with reason `NEEDS_DECISION` (format in `spec-help` reference `headless.md`) and stop.
