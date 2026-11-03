# DEMO-2 · Plan

## Scope check

| files touched | lines estimated | layers touched | new exported symbols |
|---|---|---|---|
| 22 | 460 | core, ui, agenda | 5 |

Files are the rows of the layer assignment in `02-design.md`: 5 in core, 10 in ui, 7 in agenda. Lines estimated are 90 in core, 190 in ui and 180 in agenda. New exported symbols are runtime exports, counted as in DEMO-1: `parseFavourites`, `serialiseFavourites`, `FavouriteControl`, `favouritesStorage`, `useFavourites`.

All three thresholds are exceeded: 22 files against 10, 460 lines against 300, and three layers with 5 new exported symbols against 3. A smaller design does not reach the file threshold: with no shared ui component, no hook and no adapter test, and with one function per file in core as the convention requires, the ticket still touches 16 files: 5 in core, 6 in ui (the three existing components and their tests) and 5 in agenda (the adapter, `App.tsx`, both pages and `App.test.tsx`).

Verdict: Split

Proposed split, in merge order. Each ticket stays within Gate B on its own:

- Favourites storage format (core only; 5 files, 90 lines, 2 new exported symbols): `parseFavourites` and `serialiseFavourites` with their tests and exports, covering the bad stored value criteria at function level, decisions D1 to D3.
- Favourite control in ui (ui only; 10 files, 190 lines, 1 new exported symbol): `FavouriteControl`, its use in `TalkCard` and `TalkDetails`, and the threading through `ScheduleList`, decisions D4 to D8 and D17. The new props on `TalkCard`, `TalkDetails` and `ScheduleList` are optional in this ticket and every ui test passes them, so `apps/agenda` keeps compiling until the next ticket lands.
- Favourites in the app (agenda and ui; 10 files, 190 lines, 2 new exported symbols): `favouritesStorage`, `useFavourites`, the wiring through `App`, `SchedulePage` and `TalkPage`, the page-level tests for every acceptance criterion, and the change that makes the optional props required in `TalkCard.tsx`, `TalkDetails.tsx` and `ScheduleList.tsx`, decisions D9 to D16.
