# Headless mode

`scripts/headless.sh <TICKET>` runs the four phases in series through `claude -p "/<phase> <TICKET>"`, stopping at the first `BLOCKED.md`. It signals headless mode by adding `SPEC_HEADLESS=1` to the system prompt with `--append-system-prompt`; skills read it from there and never probe the environment with Bash. It records time and cost per phase in `docs/run-metrics.md`. Contract: `docs/contracts.md` §9 and §11.

## Rules for every phase when the system prompt says `SPEC_HEADLESS=1`

1. Never ask the person. (The runner also passes `--permission-prompts none`, which removes the question tool.)
2. Where interactive mode would ask, take the conservative option.
3. Journal each such choice as `decision` with `--actor headless`.
4. On a block, write `BLOCKED.md` and stop the phase.

## Conservative defaults

| Point | Interactive | Headless |
|---|---|---|
| Clarify: a gap in the ticket | Ask, with a recommended answer | Narrowest reading of the ticket, existing code behaviour, no new scope; journal `decision` with `--phase plan` |
| Clarify: no safe answer | Ask | `BLOCKED.md` with `NEEDS_DECISION` |
| Gate A | Person approves or asks for changes | Approve as written; journal `decision` |
| Gate B `Split` | Stop with a proposed split | Stop, plus `BLOCKED.md` with `NEEDS_DECISION` |
| Gate C blockers after 3 iterations | Person fixes or dismisses | `BLOCKED.md` with `NEEDS_DECISION` |
| Subagent `BLOCKED <reason>` | Ask | `BLOCKED.md` with that reason |
| Reviewer `BLOCKING` after the fix round | Ask | `BLOCKED.md` with `NEEDS_DECISION` |
| Lint suppressions in `04-dod.md` | Person rules on each | Treat each as blocking, verdict `RED`; journal `decision` |
| Design QA | Run it | Skipped: it needs a dev server and a browser |

## `BLOCKED.md`

Path: `specs/<TICKET>/BLOCKED.md`.

````
# <TICKET> · Blocked

<REASON> <one sentence: where and why>

```
<the blocking agent's report, verbatim>
```
````

`<REASON>` is one of `PLAN_MISMATCH`, `TEST_FAIL_BUDGET`, `SETUP_ERROR`, `NEEDS_DECISION`. The runner refuses to start while the file exists: a person reads it, resolves the cause, deletes it, and re-runs.
