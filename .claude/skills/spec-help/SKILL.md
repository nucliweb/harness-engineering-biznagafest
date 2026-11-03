---
name: spec-help
description: Index of the spec-driven harness reference material. Use it to look up artefact formats, gates, journal rules, block reasons, auditor families, headless mode, agent models, or how the demo tickets are used.
argument-hint: "[topic]"
user-invocable: true
---

# spec-help

The harness runs one ticket through four phases, each launched by a person and each ending in a pause:

| Phase | Command | Writes |
|---|---|---|
| 1 | `/spec-clarify <TICKET>` | `00-clarification.md` |
| 2 | `/spec-plan <TICKET>` | `01-research.md`, `02-design.md`, `03-plan.md` |
| 3 | `/spec-implement <TICKET>` | code, ticks in `03-plan.md` |
| 4 | `/spec-validate <TICKET>` | `04-dod.md`, optionally `05-design-qa.md` |
| retro | `/spec-retro [TICKET ...]` | `lessons.json`, `retro.md` |

The source of truth for every name and format is `docs/contracts.md`. This skill only indexes it.

## References

Read only the file you need. If `$ARGUMENTS` names a topic, open the matching file and answer from it.

| File | Covers | Read it when |
|---|---|---|
| `references/artefacts.md` | Every file in `specs/<TICKET>/`, its headings and its validator | Writing or fixing an artefact, or a validator fails |
| `references/gates.md` | Gate A (design), Gate B (scope, with thresholds), Gate C (audit loop) | Running `/spec-plan` |
| `references/journal.md` | The journal record, kinds, what goes in and what does not, the JOURNAL block grammar | Journaling an event, or a subagent report is rejected by the hook |
| `references/block-reasons.md` | `PLAN_MISMATCH`, `TEST_FAIL_BUDGET`, `SETUP_ERROR`, `NEEDS_DECISION`, and what to ask the person | A subagent reports `BLOCKED` |
| `references/auditor-families.md` | Plan-auditor families F0 to F12, blocking rules, examples | Reading or fixing plan-auditor findings |
| `references/headless.md` | `SPEC_HEADLESS=1`, conservative defaults, `BLOCKED.md` | Running through `scripts/headless.sh` |
| `references/agents-and-models.md` | The six agents, their model, effort, tools, and why | Choosing who does what, or explaining cost |
| `references/demo-flow.md` | How DEMO-1, DEMO-2 and DEMO-3 are used in the talk | Preparing or giving the demo |
