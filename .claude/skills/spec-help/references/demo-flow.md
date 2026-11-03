# Demo flow

Four tickets in `tickets/`, each with a role in the talk. The app is a fictional conference agenda; it only has to be predictable and layered.

| Ticket | Title | Role | State in the repo |
|---|---|---|---|
| DEMO-1 | Filter talks by track | The worked example: every artefact the four phases produce | Complete run; `specs/DEMO-1/` committed with `00` to `04` and `journal.jsonl` |
| DEMO-2 | Favourite talks persisted in localStorage | The ticket too big for one PR: Gate B returned `Split` and the run stopped for a person | Stopped at phase 2; `specs/DEMO-2/` committed with `00` to `03`, `BLOCKED.md` and the journal |
| DEMO-3 | "Now" indicator on the schedule | The second complete run, headless; shows the Gate B calibration in its journal | Complete run; artefacts and journal committed |
| DEMO-4 | Filter talks by room | The recorded one, and the clean ticket for anyone who clones the repo | Kept unrun: no `specs/DEMO-4/`; the recording `docs/recordings/headless-demo-4.cast` shows its run |

`/spec-retro DEMO-1 DEMO-2` wrote `specs/retro.md` and `lessons.json`. Lessons come only from friction entries, so a ticket that stops at Gate B adds context to the retro but no lessons. A lesson becomes `confirmed` when the same friction shows up in a second ticket; `/spec-plan` loads confirmed lessons for the layers a ticket touches. That is the loop the journal closes.

## In the talk

Nothing runs live. The recording of `scripts/headless.sh DEMO-4` plays while the speakers narrate the four phases, then the repo is shown file by file: `specs/DEMO-1/03-plan.md`, `specs/DEMO-1/journal.jsonl`, `specs/DEMO-2/BLOCKED.md`, `.claude/agents/`, `docs/run-metrics.md`. Exact order and timings: `docs/demo-script.md`.

## Resetting DEMO-4 after a run

Delete `specs/DEMO-4/` and revert the code it produced (`git checkout -- apps packages` on a committed tree), so the next person starts clean.
