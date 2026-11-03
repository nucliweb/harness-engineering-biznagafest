---
name: spec-validate
description: Phase 4 of the spec-driven flow. Runs every global check and artefact validator through validator-global, writes 04-dod.md, lets the person rule on suppressions, and runs the optional design-qa pass for visual changes.
argument-hint: "[TICKET]"
disable-model-invocation: true
---

# spec-validate $0

Purpose: prove the ticket is done with scripts, not with opinions. Scripts decide `PASS` or `FAIL`; a person decides what to do about it.
Output: `specs/$0/04-dod.md` (and `05-design-qa.md` when design-qa runs). End of the framework.

## Preconditions

1. `$0` matches `^[A-Z]+-\d+$`. If not, reply `Usage: /spec-validate <TICKET>` and stop.
2. The plan passes its validator and has no unticked step:
   ```
   node .claude/scripts/validate-plan.mjs specs/$0/03-plan.md
   grep -c -- '- \[ \]' specs/$0/03-plan.md
   ```
   If the validator exits 1 or the printed count is not 0, reply `Run /spec-implement $0 first` and stop. (`grep -c` exits 1 when it counts 0; only the printed count matters.)

## Steps

1. Ask the `validator-global` agent:
   ```
   Ticket: $0 (specs/$0/)
   Base: main
   Write: specs/$0/04-dod.md
   ```
2. Read `04-dod.md` and show the Checks table and the Verdict.
3. **Suppressions.** For each bullet under `## Suppressions`, ask the person `Blocking or accepted?`. Journal each answer as `user_decision`. If any is blocking, mark that bullet `(blocking)` and set `## Verdict` to `RED`.
4. **RED.** Show the failing checks with their notes. Offer two ways forward and let the person choose: `/spec-implement $0` after editing the affected steps back to `[ ]`, or a manual fix followed by `/spec-validate $0`. Journal the choice as `user_decision`. Stop.
5. **GREEN or GREEN WITH SUPPRESSIONS.** Decide whether design-qa applies:
   ```
   git diff --name-only main -- apps packages
   git ls-files --others --exclude-standard -- apps packages
   ```
   It applies when any listed file ends in `.tsx` or `.css`, `.claude/agents/design-qa.md` exists, and the session is interactive. In headless mode design-qa never runs: it needs a dev server and a browser, which a headless session cannot start. Otherwise go to Pause.
6. **Design QA (optional, at most 3 rounds).** Ask the `design-qa` agent:
   ```
   Ticket: $0 (specs/$0/)
   Design: specs/$0/02-design.md
   Acceptance criteria:
   <the bullets from 00-clarification.md>
   Changed files: <the .tsx and .css paths>
   Round: <k> of 3
   Write: specs/$0/05-design-qa.md
   ```
   - `BLOCKED SETUP_ERROR` (no browser, dev server fails): tell the person design-qa was skipped and why, go to Pause.
   - `FIX` findings: run `developer-package` with `Mode: fix` for the layer that owns each file, then `reviewer-package`, using the prompts from `/spec-implement`. Then run design-qa again. Stop after round 3 and show what is left.
   - `DECIDE` findings: ask the person; journal each answer as `user_decision`.
   - If any code changed in this step, run `validator-global` again (step 1) so `04-dod.md` reflects the final code.

## Journal

`validator-global`, `design-qa`, `developer-package` and `reviewer-package` journal their own events (`validator_red`, `autofix_failed`, ...). You journal the person's rulings:

```
node .claude/scripts/journal-append.mjs --ticket $0 --phase validate --actor main --kind user_decision --summary "<one sentence>" [--files a,b]
```

## Pause

```
$0 validated. Verdict: <verdict line from 04-dod.md>
Design QA: <GREEN | RED | skipped: reason | not applicable>
The four phases are done. Review the diff and commit when you are satisfied.
Optional: /spec-retro $0 to turn this ticket's journal into lessons.
```

## Headless (`SPEC_HEADLESS=1`)

Never ask. Use `--actor headless` in every journal call.

| Point | Headless behaviour |
|---|---|
| Suppressions | Treat each as blocking (the conservative option), journal `decision`, verdict `RED` |
| `RED` | Stop; `04-dod.md` is the record |
| Design QA | Skip it. Journal `decision` "Design QA skipped in headless mode: needs a dev server and a browser" and go to Pause with the `04-dod.md` verdict |
