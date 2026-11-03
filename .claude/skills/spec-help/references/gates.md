# Gates

`/spec-plan` stops three times. Each gate exists because a mistake caught there is cheaper than the same mistake caught in code.

## Gate A: design approval

| | |
|---|---|
| When | After `02-design.md` passes `validate-design.mjs` |
| Shows | Chosen alternative, decisions, layer assignment, in under 15 lines |
| Asks | `Approve the design? (approve / changes)` |
| On changes | Apply, re-validate, journal `user_decision`, ask again |
| Headless | Approve as written, journal `decision` with `--actor headless` |

Why: decisions are closed here by a person, so the auditor and the developer never reopen them.

## Gate B: scope check

Runs after Interfaces, Steps and Definition of done are drafted, because it counts from them. Definitions from `docs/contracts.md` §4.4, so the count cannot be bent:

| Measure | Definition |
|---|---|
| files touched | Number of distinct backticked paths in `## Steps` |
| new exported symbols | Every `export` added to a package's `index.ts`, types included |
| lines estimated | Lines added or changed, estimated and rounded up |
| layers touched | Layers with at least one step |

| Threshold for this repo | Verdict |
|---|---|
| More than 15 files | `Split` |
| More than 500 lines | `Split` |
| All three layers touched and more than 3 new exported symbols | `Split` |
| None of the above | `Single PR` |

The thresholds are deliberately lower than a real monorepo would use, so the gate is visible in a demo. `validate-plan.mjs` recomputes the file count from the steps and rejects a plan whose table or verdict disagrees with it.

The design is never changed to pass the gate, and steps are never merged or dropped to lower the count. If the honest numbers say `Split`, the plan keeps its drafted sections, adds the proposed split (one bullet per smaller ticket with its own numbers) under `Verdict: Split`, gets no `## Audit`, and the phase stops for a person to decide. Journal `decision`. Headless: `BLOCKED.md` with `NEEDS_DECISION`.

Why: a plan too big for one review is a plan nobody reviews.

## Gate C: plan audit

```
for k in 1..3:
  plan-auditor audits 03-plan.md against 00 and 02
  if no 🔴: break
  if k < 3: fix every 🔴 (and cheap 🟡) in the plan
if 🔴 remain after pass 3:
  the person dictates a fix or dismisses each one (journal user_decision)
  dismissed or dictated findings no longer count
write "Blocking: <n> · Recommendations: <m> · Iterations: <k>" under ## Audit,
  copying the last pass, minus the findings the person ruled on
run validate-plan.mjs; it rejects any Blocking other than 0
```

The main thread never fixes a blocker after the third pass without the person, and never types `Blocking: 0` by hand. The validator rejecting a non-zero count is the point: an unaudited blocker cannot reach `/spec-implement`.

| | |
|---|---|
| Max iterations | 3 |
| Who fixes | The main thread, editing `03-plan.md` (and `02-design.md` if a decision changes) |
| Who decides leftovers | The person; headless writes `BLOCKED.md` with `NEEDS_DECISION` |
| Journal | The auditor journals each 🔴 as `auditor_finding`; the main thread journals only the person's rulings |

Why: the auditor is a different, stronger model reading the plan cold. Its value is finding what the author cannot see; the loop bound keeps it from becoming a negotiation.

Families: `auditor-families.md`.
