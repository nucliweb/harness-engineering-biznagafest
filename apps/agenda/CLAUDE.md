# @agenda/app

React 19 + Vite + react-router v7. The only layer that touches the browser, the router and storage.

## Belongs here

- Routes and pages in `src/pages/<Name>Page.tsx`, wired in `src/App.tsx`. Routes today: `/` and `/talks/:id`.
- Composition: pick data from `@agenda/core`, pass it to `@agenda/ui` components.
- Adapters for the outside world: router links (`src/routerLink.tsx`), storage, URL state, timers. Keep each adapter small and in its own file.
- App-level hooks in `src/hooks/use<Name>.ts` that connect an adapter to a pure `core` function.

## Never here

- Business rules written inline in a page or hook. Put the pure function in `core` and call it.
- Styling beyond layout glue. Visual design is `ui` and its tokens.
- Relative imports into `../../packages/*`. Import by package name: `@agenda/core`, `@agenda/ui`.
- Raw `localStorage` or `Date.now()` calls scattered through components. Wrap them once in an adapter so tests can pass a fake.

## Conventions

- Pages are named `<Name>Page`, one per file, named exports. `main.tsx` is the only file that calls `createRoot`.
- Routes use ids from `core` data (`/talks/:id`); unknown ids render a not-found message, never throw.
- Tests: `Name.test.tsx` next to the file, `MemoryRouter` for routing, Testing Library queries by role. Test the page the user sees, not its internals.
- Env access and side effects happen in `main.tsx` or an adapter, not at module top level in pages.

## How a feature lands here

After `core` and `ui` exist: add the adapter or hook, compose the page, add a page-level test that drives the feature with user events. The page owns state and passes it down to controlled `ui` components.
