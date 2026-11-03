# DEMO-2 · Blocked

NEEDS_DECISION Gate B of /spec-plan returned Split, so a person must split the ticket or change the thresholds before /spec-implement can start.

```
| files touched | lines estimated | layers touched | new exported symbols |
|---|---|---|---|
| 22 | 460 | core, ui, agenda | 5 |

Verdict: Split

Exceeded: 22 files against 10, 460 lines against 300, three layers with 5 new exported symbols against 3.
A smaller design does not reach the file threshold: it still touches 16 files.

Proposed split, in merge order (details in specs/DEMO-2/03-plan.md):
- Favourites storage format: core only, 5 files, 90 lines, 2 new exported symbols.
- Favourite control in ui: ui only, 10 files, 190 lines, 1 new exported symbol.
- Favourites in the app: agenda and ui, 10 files, 190 lines, 2 new exported symbols.
```
