# @agenda/core

Domain types and pure functions. The only layer that knows what a talk, a slot or a track is.

## Belongs here

- Types in `src/types.ts` (`Talk`, `Track`, `Room`, `Speaker`, `Slot`, view types such as `TalkView`).
- Seed data in `src/data.ts`, typed, never fetched.
- Pure functions: same input, same output, no mutation of arguments (copy before sorting).
- Any rule about talks, such as grouping, ordering, filtering, matching, time arithmetic.

## Never here

- `react`, `react-dom`, `react-router`, JSX, hooks, CSS.
- `window`, `document`, `localStorage`, `fetch`, `Date.now()` or `new Date()` without a parameter. Time comes in as an argument.
- Imports from `@agenda/ui` or `@agenda/app`. Core imports nothing from the workspace.

## Conventions

- One function per file, named after the function: `groupBySlot.ts` exports `groupBySlot`.
- Named exports only, no default exports. Everything public is re-exported from `src/index.ts`, including types (`export type`).
- Imports are extensionless and relative inside the package.
- Date-times are local strings `YYYY-MM-DDTHH:mm`, no offsets, compared as strings.
- Tests: `foo.test.ts` next to `foo.ts`, `describe('<functionName>')`, `it` titles describe behaviour in plain English. Test through the public function, no mocks.

## How a feature lands here

Add the types, then a failing test, then the pure function, then export it from `index.ts`. Persistence formats (what is stored, how it is parsed) are decided here as pure `serialise` and `parse` functions; the storage itself belongs to the app. Functions return new arrays and objects; callers decide what to do with them.
