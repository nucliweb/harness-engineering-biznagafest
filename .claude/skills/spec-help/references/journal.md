# Journal

`specs/<TICKET>/journal.jsonl`: append-only, one JSON object per line, committed with the spec, never edited or deleted. It is the friction log that `/spec-retro` turns into lessons. Contract: `docs/contracts.md` §5.

## Who writes

| Writer | How |
|---|---|
| Main thread (skills) | `node .claude/scripts/journal-append.mjs --ticket <T> --phase <phase> --actor main --kind <kind> --summary "..." [--detail "..."] [--files a,b]` |
| Headless runs | Same call with `--actor headless` |
| Subagents | Never directly. They end their report with a JOURNAL block; the `SubagentStop` hook `.claude/hooks/journal-capture.mjs` appends it |

Nobody writes the file by hand.

## Record

| Field | Values |
|---|---|
| `ts` | ISO 8601 UTC, set by the script, never by the caller |
| `ticket` | `^[A-Z]+-\d+$` |
| `phase` | `plan`, `implement`, `validate`, `retro` (phase 1 decisions use `plan`) |
| `actor` | `main`, `explorer`, `plan-auditor`, `developer-package`, `reviewer-package`, `validator-global`, `design-qa`, `headless` |
| `kind` | see below |
| `summary` | one sentence, required |
| `detail`, `files` | optional |

The script redacts email addresses and anything that looks like a token or key (`sk-`, `ghp_`, 32+ hex characters, `Bearer `).

## Kinds

| Kind | Typical writer | Example summary |
|---|---|---|
| `blocked` | any subagent | `Talk type has no end time; plan assumed one` |
| `deviation` | developer, main | `Step S3 used a button group instead of a select after Gate A change` |
| `decision` | main, headless | `Gate B verdict Split: 13 files, 3 layers` |
| `user_decision` | main | `Person accepted the eslint-disable in ScheduleList.tsx` |
| `autofix_failed` | developer | `Lint boundary rule rejected ui importing from agenda, fixed on attempt 2` |
| `reviewer_finding` | reviewer | `ui component filtered data itself; filtering belongs in core` |
| `auditor_finding` | plan-auditor | `ui step reads storage; storage belongs in agenda` |
| `validator_red` | validator-global, design-qa | `pnpm build failed: missing export in @agenda/ui` |
| `suppression` | developer | `eslint-disable react-hooks/exhaustive-deps in useNow.ts` |

## What goes in, what does not

In: anything that failed, deviated from the plan, or was decided by a person.

Out: things that went green on the first try, progress messages, full command output (put a short excerpt in `detail` if needed), anything personal.

Only friction kinds become lessons: `autofix_failed`, `reviewer_finding`, `auditor_finding`, `validator_red`, `blocked`, `deviation`, `suppression`. `decision` and `user_decision` entries are context the retro reads, never lessons; otherwise a fixed headless phrase such as "Gate A approved without review" would be confirmed after two runs (contracts §6).

Write summaries as the rule, not the incident. `lessons-aggregate.mjs` groups by layer and normalised summary, so the same rule worded the same way in two tickets becomes one confirmed lesson. `files` lists code paths, code first, never a spec file: the aggregator takes the lesson's layer from the first path, and a path under `specs/` files it under layer `unknown`, where `/spec-plan` never loads it.

## JOURNAL block grammar (§5.1)

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

Rules the hook enforces:

1. The report mentions `specs/<TICKET>/`; the ticket comes from the first such path. Without it, entries go to `_unassigned`.
2. The block is the very end of the report. Nothing after `END JOURNAL`.
3. Keys per entry: `kind`, `summary`, `detail`, `files`. No `actor` or `phase`; the hook sets them from the agent name.
4. A missing or malformed block makes the hook block the stop with `Report must end with a JOURNAL block (see docs/contracts.md §5.1)`, so the agent adds it.
