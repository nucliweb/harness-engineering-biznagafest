# Artefacts

Everything a ticket produces lives in `specs/<TICKET>/`. Full contract: `docs/contracts.md` §4.

Every markdown artefact starts with `# <TICKET> · <Artefact name>` and uses only the level-2 headings listed, in that order. Validators match headings by exact text.

| File | Written by | Phase | Validator |
|---|---|---|---|
| `00-clarification.md` | spec-clarify | 1 | `node .claude/scripts/validate-clarification.mjs <path>` |
| `01-research.md` | spec-plan | 2 | none (facts only) |
| `02-design.md` | spec-plan | 2 | `node .claude/scripts/validate-design.mjs <path>` |
| `03-plan.md` | spec-plan, ticked by spec-implement | 2, 3 | `node .claude/scripts/validate-plan.mjs <path>` |
| `04-dod.md` | validator-global | 4 | checked by eye; its `contracts` row re-runs the three validators |
| `05-design-qa.md` | design-qa (optional) | 4 | none |
| `journal.jsonl` | `journal-append.mjs` only | 2, 3, 4 | see `journal.md` |
| `BLOCKED.md` | any skill in headless mode, or the headless runner | any | see `headless.md` |

Validators exit 0 or 1 and print one line per failure: `<file>: <rule>: <message>`. Fix every line and run again.

## `00-clarification.md` · Clarification

| Heading | Content |
|---|---|
| `## Goal` | One paragraph, what and why |
| `## Scope` | Bullets, what changes |
| `## Out of scope` | Bullets, may be `- None` |
| `## Acceptance criteria` | Bullets, copied or refined from the ticket |
| `## Code anchors` | Bullets, `path:line` or `path` with one line of why |
| `## Open questions` | Exactly `- None` |

Fails on: missing or reordered heading, empty section, any open question.

## `01-research.md` · Research

`## Inventory` (with `### core`, `### ui`, `### agenda`), `## Existing patterns`, `## Gaps`. Built from explorer output. States facts, decides nothing.

## `02-design.md` · Design

| Heading | Content |
|---|---|
| `## Alternatives` | At least two `### A1 <name>` subsections, each with pros and cons |
| `## Decisions` | `- D1 <text>. Status: closed.` |
| `## Layer assignment` | Table `change \| layer \| file`, layer is `core`, `ui` or `agenda` |
| `## Risks` | Bullets, may be `- None` |

Fails on: fewer than two alternatives, an alternative without pros or cons, a decision not `closed`, the words `TBD`, `TODO` or `open question` anywhere.

## `03-plan.md` · Plan

| Heading | Content |
|---|---|
| `## Scope check` | Table with `files touched`, `lines estimated`, `layers touched`; line `Verdict: Single PR` or `Verdict: Split` |
| `## Interfaces` | `### core`, `### ui`, `### agenda`, each a ` ```ts ` block or `- None` |
| `## Steps` | `### core`, `### ui`, `### agenda` in that order, each a checklist or `- None` |
| `## Definition of done` | `### core`, `### ui`, `### agenda` in that order, EARS lines or `- None` |
| `## Audit` | `Blocking: 0 · Recommendations: <n> · Iterations: <k>` |

Step line, exactly:

```
- [ ] S<n> `<path>` — <pseudocode or precise instruction in one line>
```

EARS line: `- WHEN <trigger> THE <layer> SHALL <observable result>`.

Fails on: a layer with steps but no ts block, a step without a backticked path or in another shape, a DoD line not in EARS form, an Audit line with `Blocking` other than 0. The validator also recomputes `files touched` from the distinct backticked paths in `## Steps` and rejects a table or verdict that disagrees with the Gate B thresholds. A `Split` plan keeps its drafted sections but has no `## Audit`, so it fails on purpose and `/spec-implement` refuses it.

The plan doubles as resumable state: `/spec-implement` turns `[ ]` into `[x]` as steps land.

## `04-dod.md` · Definition of done

| Heading | Content |
|---|---|
| `## Checks` | Table `check \| result \| notes` with rows `lint`, `typecheck`, `test`, `build`, `contracts`; results `PASS`, `FAIL`, `SKIPPED` |
| `## Suppressions` | `- <path>:<line> <rule>` per lint suppression added in this ticket, or `- None` |
| `## Verdict` | `GREEN`, `RED` or `GREEN WITH SUPPRESSIONS` |

`contracts` passes when the three validators exit 0 and no `[ ]` is left in `03-plan.md`.

## `05-design-qa.md` · Design QA

`## Viewports` (table `viewport | result | screenshot path`), `## Findings` (bullets tagged `GREEN`, `RED`, `FIX`, `DECIDE`), `## Verdict` (`GREEN` or `RED`).

## Cross-ticket files in `specs/`

- `lessons.json`: written only by `node .claude/scripts/lessons-aggregate.mjs`. A person may set `status` to `applied`.
- `retro.md`: written by `/spec-retro`, every claim cites `<TICKET>#<line>`.
