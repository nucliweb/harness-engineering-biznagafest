# Demo script

The talk shows one real run through a step-by-step page, then the repo. Nothing runs live: no network, no model call, no waiting on stage. The page is generated from the run's own recording, artefacts, journal and metrics, so every line on it can be checked afterwards by opening a file.

## Timing

| Step | Minutes | What | If the slot shrinks |
|---|---|---|---|
| 1 | 4 | `docs/demo/index.html`: nine screens, one real run (FEATURE-4), the lines that matter framed, one narration card per frame | Keep; skip screens 4 and 7 |
| 2 | 1 | The repo: `specs/FEATURE-1/03-plan.md` and `specs/FEATURE-1/journal.jsonl` in the editor, to show the page is not a mock-up | Cut |

Total: 5 minutes. The repo URL is the page's last screen and stays up for the "where can I see it" question.

## Before the talk

The day before:

```bash
git clone https://github.com/nucliweb/harness-engineering-biznagafest.git ~/demo/harness
cd ~/demo/harness
pnpm install
pnpm test
node scripts/build-demo-page.mjs
open docs/demo/index.html
```

- `pnpm test` is green: Vitest for the packages, then `node --test` for the scripts.
- The page opens from `file://` with no network, in the browser you will use on stage. Press `f` for fullscreen, walk all nine screens with the right arrow once, press `t` to check the theme against the room's projector (light by default; dark if the room is dark), `n` to show the presenter notes strip, `l` to confirm the texts are in Spanish. Scan the QR on the last screen with a phone from the back of the room.
- `ls specs` shows `FEATURE-1`, `FEATURE-2`, `FEATURE-3` and `FEATURE-4`. `specs/FEATURE-4/` holds only `journal.jsonl`: the ticket was run for the page and then reset. `FIX-1` has no folder at all. Both are clean tickets for a person who clones the repo.
- Fallback if the browser misbehaves: `specs/FEATURE-1/` in the editor tells the same story file by file, and `asciinema play -s 10 -i 2 docs/recordings/headless-feature-4.cast` is the raw recording the page was built from.

The morning of: browser zoom at 100 percent, the page open on screen 1 in fullscreen, the editor open behind it with `specs/FEATURE-1/` expanded, notifications off.

## Step 1: the page (4 min)

Keys: right arrow or space moves to the next framed line, and to the next screen after the last frame; left arrow goes back; `1` to `9` jump to a screen; `f` fullscreen; `t` theme; `n` presenter notes; `l` switches the texts between Spanish and English (the log, the artefact excerpts and the journal stay in English, as in the repo). The page opens in Spanish when the browser is Spanish; `?lang=es` or `?lang=en` in the URL forces one. A timeline across the top shows the eight steps (clarify, plan, Gate B, implement, validate, journal, numbers, harness): done steps filled, the current one highlighted and filling as its frames go by, the rest dim; click a step to jump to it. The closing screen carries the repo QR, large enough to scan from the room: leave it up during the questions.

Say on screen 1: "This is one ticket going through the four phases with nobody at the keyboard. What you will see is the real log of that run; the frames are ours, the lines are not."

| Screen | What is on it | What to say |
|---|---|---|
| 1 | Title, the ticket, total time and cost | Seventeen minutes, six dollars, ticket to GREEN |
| 2 | Clarify | The main thread never searches the repo: the explorer does, on Haiku, in its own context. A script, not a model, says the artefact is valid |
| 3 | Plan | Three explorers in parallel, closed decisions, then the plan auditor on Opus. Gate B is a table with thresholds |
| 4 | Gate B interlude | FEATURE-2 was too big: 22 files against 15, the run stopped and asked a person. The gate was set blind and calibrated on three runs |
| 5 | Implement | One developer per layer on Sonnet, one reviewer on Opus, never in parallel. The `✗` lines are friction, and friction is what the journal records |
| 6 | Validate | Lint, typecheck, test, build and the artefact validators, run by the cheapest model. GREEN or nothing |
| 7 | The journal | Append-only, written only by a script. Three attempts of this ticket are visible, including two gate calibrations and a RED verdict caused by a test bug |
| 8 | The numbers | Cost per phase, the agents table with list prices, Fable versus Opus on the same harness |
| 9 | The harness and the URL | Three lessons, the files that show them, the repo |

Press space to advance frame by frame; each frame has its own card and note. If a question comes mid-way, answer and press space again; the page keeps its place and the URL hash keeps the screen on a reload.

## Step 2: the repo (1 min)

Switch to the editor. Open `specs/FEATURE-1/03-plan.md` and point at one step line: one file, one line of pseudocode, the developer decides nothing. Open `specs/FEATURE-1/journal.jsonl` and point at the `blocked` line from the first validate attempt: "We never edited this file, and the attempt that blocked on permissions is still there." Switch back to the page's last screen.

## After the talk

Nothing to reset. If someone asks to see it run, the README quick start gives them the four commands on FEATURE-4 or FIX-1. To put FEATURE-4 back afterwards: delete its artefacts but keep `specs/FEATURE-4/journal.jsonl`, then `git checkout -- apps packages` and `git clean -fd -- apps packages`. To rebuild the page after a new run: `node scripts/build-demo-page.mjs`.

## Likely questions from the audience

**Why is `specs/` not under `.claude/`?** Claude Code treats every write under `.claude/` as sensitive and denies it in headless runs, even with an allow rule. Artefacts written by the agent cannot live there. Open `docs/contracts.md`, the paragraph starting "Everything a ticket produces lives in `specs/<TICKET>/`".

**How much does it cost?** FEATURE-1's four successful phase runs cost $1.86, $5.21, $3.48 and $1.19, about $11.74 in 23 minutes. The first validate attempt (blocked, `SETUP_ERROR`) added $1.13. These numbers come from the usage fields of `claude -p --output-format json` at list price, never estimated. Open `docs/run-metrics.md`.

**Why is the reviewer a different model than the developer?** The developer is Sonnet and the reviewer is Opus, so they do not share blind spots. The same applies to the auditor (Opus) against the planner. Open `.claude/skills/spec-help/references/agents-and-models.md`, section "Why each model".

**What happens when a subagent forgets the JOURNAL block?** The `SubagentStop` hook (`.claude/hooks/journal-capture.mjs`) blocks the stop with `Report must end with a JOURNAL block (see docs/contracts.md §5.1)` and the agent adds it. Open `docs/contracts.md` §5.1 and `.claude/settings.json`.

**How does the issue-tracker version differ?** One file read becomes one MCP call. `/spec-clarify` reads `tickets/<TICKET>.md`; in a team setup a Jira MCP call replaces that read and nothing else changes. Open `.claude/skills/spec-clarify/SKILL.md`, Preconditions, item 2.

**What is not reproduced?** The durable agent, the Kanban, CI and the feature-flag release. The repo shows the four phases, the hooks, the journal and the two scripts; the README describes the rest as the production layer around the same four phases. Open `docs/implementation-plan.md`, the paragraph that starts "Two scripts move from stretch to the core set".
