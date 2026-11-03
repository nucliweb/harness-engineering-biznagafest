# Demo script

The talk shows the repo and a commented recording. Nothing runs live: no network, no model call, no waiting on stage. Everything the recording shows is committed, so any claim can be checked afterwards by opening a file.

## Timing

| Step | Minutes | What | If the slot shrinks |
|---|---|---|---|
| 1 | 2 | The recording: one headless run of a ticket through the four phases, played at speed while you narrate | Keep |
| 2 | 2 | The repo: the artefacts the run produced and the journal | Cut to one file: `03-plan.md` |
| 3 | 1 | The numbers: `docs/run-metrics.md` and the model table | Cut |

Total: 5 minutes. The repo URL stays on screen on the closing slide for the "where can I see it" question.

## Before the talk

The day before:

```bash
git clone https://github.com/nucliweb/harness-engineering-biznagafest.git ~/demo/harness
cd ~/demo/harness
pnpm install
pnpm test
asciinema --version
asciinema play -s 10 -i 2 docs/recordings/headless-demo-4.cast
```

- `pnpm test` is green: Vitest for the packages, then `node --test` for the scripts.
- The recording plays end to end and finishes with `headless: DEMO-4 done`. Tune `-s` so the whole thing lasts about 2 minutes; `-i 2` caps idle gaps at 2 seconds.
- `ls specs` shows `DEMO-1`, `DEMO-2` and `DEMO-3`. `specs/DEMO-4/` does not exist: DEMO-4 is kept unrun so a person who clones the repo has a clean ticket to try.
- Fallback if `asciinema` is missing on the venue machine: the GIF at `docs/recordings/headless-demo-4.gif` plays in any browser or slide tool, and `specs/DEMO-3/` tells the same story file by file.

The morning of: terminal font at 20 points or larger, window about 120 columns wide, dark or light theme matching the slides, notifications off, the repo folder open in the editor with `specs/DEMO-1/` expanded.

## Step 1: the recording (2 min)

Say: "This is one ticket going through the four phases with nobody at the keyboard. Every line is a tool call as it happened."

```bash
asciinema play -s 10 -i 2 docs/recordings/headless-demo-4.cast
```

Narrate over it, in order:

1. `headless: DEMO-4 spec-clarify`, then `▶ Read tickets/DEMO-4.md` and `▶ Agent explorer`: the main thread never greps the repo; the explorer does, in its own context, and only its answer comes back.
2. `▶ Write specs/DEMO-4/00-clarification.md` followed by `▶ Bash node .claude/scripts/validate-clarification.mjs`: a script decides whether the artefact is valid, not the model.
3. `headless: DEMO-4 spec-plan`: explorer per layer, then `▶ Agent plan-auditor`. Point at the auditor running on Opus while the main thread writes on Opus and the explorer searches on Haiku.
4. `headless: DEMO-4 spec-implement`: `▶ Agent developer-package` then `▶ Agent reviewer-package`, three times, in the order core, ui, agenda. A different model reviews than the one that wrote.
5. Any `✗` line: that is friction, and friction is what the journal records. Green on the first try is not.
6. `headless: DEMO-4 spec-validate`, `▶ Agent validator-global`, the `■ success` line with cost and time, and the final `headless: DEMO-4 done, metrics in docs/run-metrics.md`.

Press space to pause on any line you want to talk about. `q` quits.

## Step 2: the repo (2 min)

Open, in this order:

- `specs/DEMO-1/03-plan.md`: the `## Scope check` table and the verdict at the top, a step line (one file, one line of pseudocode, the developer decides nothing), and the `## Audit` line at the bottom.
- `specs/DEMO-1/journal.jsonl`: one `auditor_finding` line and the `blocked` line from the validate phase. Say: "Append-only. We never edited it, and the first validate attempt that blocked on permissions is still there."
- `specs/DEMO-2/BLOCKED.md`: the ticket that was too big. Gate B said Split, the runner stopped and asked for a person.
- `.claude/agents/`: six files, one job each. Open `explorer.md` and point at `model: haiku` and `tools: Read, Grep, Glob`.

## Step 3: the numbers (1 min)

Open `docs/run-metrics.md`. Point at one complete run and read the cost per phase. Then the "Agents and models" table in `README.md`, with the list price next to each model. Say: "Measured, not claimed. Every row comes from the usage fields of the run."

## After the talk

Nothing to reset. If someone asks to see it run, the README quick start gives them the four commands on DEMO-4.

## Likely questions from the audience

**Why is `specs/` not under `.claude/`?** Claude Code treats every write under `.claude/` as sensitive and denies it in headless runs, even with an allow rule. Artefacts written by the agent cannot live there. Open `docs/contracts.md`, the paragraph starting "Everything a ticket produces lives in `specs/<TICKET>/`".

**How much does it cost?** DEMO-1's four successful phase runs cost $1.86, $5.21, $3.48 and $1.19, about $11.74 in 23 minutes. The first validate attempt (blocked, `SETUP_ERROR`) added $1.13. These numbers come from the usage fields of `claude -p --output-format json` at list price, never estimated. Open `docs/run-metrics.md`.

**Why is the reviewer a different model than the developer?** The developer is Sonnet and the reviewer is Opus, so they do not share blind spots. The same applies to the auditor (Opus) against the planner. Open `.claude/skills/spec-help/references/agents-and-models.md`, section "Why each model".

**What happens when a subagent forgets the JOURNAL block?** The `SubagentStop` hook (`.claude/hooks/journal-capture.mjs`) blocks the stop with `Report must end with a JOURNAL block (see docs/contracts.md §5.1)` and the agent adds it. Open `docs/contracts.md` §5.1 and `.claude/settings.json`.

**How does the issue-tracker version differ?** One file read becomes one MCP call. `/spec-clarify` reads `tickets/<TICKET>.md`; in a team setup a Jira MCP call replaces that read and nothing else changes. Open `.claude/skills/spec-clarify/SKILL.md`, Preconditions, item 2.

**What is not reproduced?** The durable agent, the Kanban, CI and the feature-flag release. The repo shows the four phases, the hooks, the journal and the two scripts; the README describes the rest as the production layer around the same four phases. Open `docs/implementation-plan.md`, the paragraph that starts "Two scripts move from stretch to the core set".
