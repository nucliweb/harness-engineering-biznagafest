# .claude/scripts

Node ESM, built-ins only, no install needed. Failures print one line each as `<file>: <rule>: <message>`. Contracts: `docs/contracts.md` §4, §5, §6, §11.

| Script | CLI | Exit codes |
|---|---|---|
| `validate-clarification.mjs` | `node validate-clarification.mjs <path>...` | 0 valid, 1 any failure |
| `validate-design.mjs` | `node validate-design.mjs <path>...` | 0 valid, 1 any failure |
| `validate-plan.mjs` | `node validate-plan.mjs <path>...` | 0 valid, 1 any failure |
| `journal-append.mjs` | `node journal-append.mjs --ticket FEATURE-1 --phase <phase> --actor <actor> --kind <kind> --summary "..." [--detail "..."] [--files a,b]` | 0 appended, 1 invalid input (nothing written) |
| `lessons-aggregate.mjs` | `node lessons-aggregate.mjs` | 0 wrote `specs/lessons.json`, 1 error |

## Notes

- Validators check the level-1 title (`# <TICKET> · <Artefact name>`, with the name the validator owns: Clarification, Design, Plan), the exact level-2 headings and their order, then the per-artefact rules in §4.1, §4.3, §4.4.
- `validate-design.mjs` needs a `Pros:` and a `Cons:` label in every alternative.
- `validate-plan.mjs` also cross-checks the Scope check table: `scope-files-mismatch` when "files touched" differs from the distinct step paths, `scope-verdict-mismatch` when the numbers cross Gate B (files > 15, lines > 500, or all three layers with symbols > 6) and the verdict disagrees. DoD lines must match `WHEN <trigger> THE core|ui|agenda SHALL <result>` (`dod-ears`). Fixtures live in `fixtures/<artefact>/`, one valid and several invalid, each invalid one failing for a single rule.
- `journal-append.mjs` sets `ts`, rejects unknown `phase`, `actor` and `kind`, redacts emails and token-like strings in `summary` and `detail`, creates `specs/<TICKET>/journal.jsonl` when missing and only appends. The hook reuses `appendEntry` from `lib/journal.mjs`.
- `lessons-aggregate.mjs` groups journal entries by layer (first path in `files`, else `unknown`) and normalised summary, promotes `candidate` to `confirmed` at two distinct tickets, never demotes or deletes, and writes a deterministic file. The `_unassigned` folder is ignored.
- The hook `journal-capture.mjs` treats a JOURNAL block as malformed, and blocks the stop once, when it lacks `END JOURNAL` or has text after it.
- `scripts/headless.sh` (exit 0 done, 1 error, 2 usage or dirty `apps/` and `packages/`, 4 blocked) runs these validators after each phase instead of trusting the model, and `scripts/adversarial-review.sh` exits 0 consensus, 1 error (including unparsable reviewer output), 3 no consensus.
- `--root <dir>` on `journal-append.mjs` and `lessons-aggregate.mjs` points at another repo root (used by tests).
- `lib/markdown.mjs` is the shared markdown reader (sections, list items, fenced blocks, tables).

## Tests

From the repo root: `node --test ".claude/**/*.test.mjs" "scripts/**/*.test.mjs"`
