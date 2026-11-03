# Plan-auditor finding families

The `plan-auditor` agent reads `03-plan.md` against `00-clarification.md` and `02-design.md` and reports one line per finding. Contract: `docs/contracts.md` §8.1.

```
F<n> 🔴|🟡 <where> — <what> — <fix>
Blocking: <n> · Recommendations: <m> · Iterations: <k>
```

🔴 is blocking and must be fixed before the plan is valid. 🟡 is a recommendation.

| Family | Name | Blocking when | Example finding |
|---|---|---|---|
| F0 | Contradicts clarification | Always | `F0 🔴 Steps S5 — hides past talks, 00 lists that as out of scope — remove S5` |
| F1 | Missing or wrong interface | Always | `F1 🔴 Interfaces core — S2 calls isFavourite() but no signature declares it — add export function isFavourite(ids: string[], id: string): boolean` |
| F2 | Layer rule violation | Always | `F2 🔴 Steps S6 — ui component reads localStorage — read it in an apps/agenda adapter and pass favourites as a prop` |
| F3 | Step without a concrete file | Always | `F3 🔴 Steps S4 — "update the filter component" names no file — use packages/ui/src/TrackFilter.tsx` |
| F4 | Pseudocode too vague to implement without deciding | Always | `F4 🔴 Steps S1 — "handle edge cases" — state them: return [] for empty input, all talks for null track` |
| F5 | DoD not observable or not EARS | Always | `F5 🔴 Definition of done ui — "the filter works well" — WHEN the user picks a track THE ui SHALL call onChange with that track` |
| F6 | Untested path | When the path is in the acceptance criteria | `F6 🔴 Steps core — no test for the slot end boundary, an acceptance criterion — add a case where now equals the end time` |
| F7 | Scope creep | When outside `00` scope | `F7 🔴 Steps S8 — adds sorting by speaker, not in scope — remove S8` |
| F8 | Data or migration gap | When persisted data changes | `F8 🔴 Steps S4 — stored favourites change shape, old values unhandled — ignore and overwrite values that fail to parse` |
| F9 | Accessibility or i18n gap | Never, recommendation | `F9 🟡 Steps S5 — the select has no accessible name — add a visible label "Track"` |
| F10 | Performance risk | Never, recommendation | `F10 🟡 Steps S7 — re-filters on every render — memoise on talks and track` |
| F11 | Security or privacy risk | When user data leaves the browser | `F11 🔴 Steps S9 — sends favourites to an analytics endpoint — remove; favourites stay in localStorage` |
| F12 | Reuse missed | Never, recommendation | `F12 🟡 Steps S3 — new Chip component duplicates packages/ui Tag — reuse Tag` |

Loop: `/spec-plan` fixes every 🔴 and re-runs the auditor, at most 3 iterations. If 🔴 findings remain, the person fixes or dismisses each one. Details: `gates.md`.

Why families: a fixed vocabulary makes findings comparable across tickets, so `lessons-aggregate.mjs` can see that the same family keeps appearing in the same layer.
