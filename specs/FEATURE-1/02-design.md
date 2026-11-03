# FEATURE-1 · Design

## Alternatives

### A1 Two core functions, a controlled ui select, URL state read inline in SchedulePage

Core exports `filterTalksByTrack(talks, selection)` and `resolveTrackParam(tracks, value)`. The sentinel for "every track" is the string literal `'all'`, returned by the resolver and understood by the filter. ui exports a stateless `TrackFilter` built on a native `<select>` nested inside a `<label>` reading "Track", with `tracks`, `value` and `onChange` props. `SchedulePage` calls `useSearchParams` directly, the same way `TalkPage` calls `useParams`, resolves the value with core, filters and groups inside the component, and writes or deletes the `track` param on change.

- Pros: three new runtime exports, one per concern; every rule about talks and about the URL value lives in core and is unit tested in isolation; the page stays a composition with no `if` about talks; no new adapter file for a single router hook, mirroring the existing `TalkPage`.
- Cons: the literal `'all'` appears in core, ui (the option value) and agenda (the delete branch); the page holds a few lines of URL plumbing.

### A2 Same core and ui, plus a `useTrackParam` hook in `apps/agenda/src/hooks/`

Identical core and ui, but the `useSearchParams` read and write move into `apps/agenda/src/hooks/useTrackParam.ts`, which returns `[selection, setSelection]` and is tested on its own.

- Pros: the page becomes a one-line composition; the URL adapter is reusable by a later ticket that carries the track back from `/talks/:id`.
- Cons: one more file, one more exported symbol and one more test for a hook used once; the clarification lists the talk-page round trip as out of scope, so the reuse is speculative; the page-level test already drives the hook through the page.

### A3 Filter inside ScheduleList through a `trackId` prop

`ScheduleList` grows a `trackId?: string` prop and skips talks that do not match while rendering slots.

- Pros: no new core function for the filter; only ui and agenda change.
- Cons: breaks the ui rule that filtering is domain logic belonging to core; empty slots would still render their heading unless ui also learns to drop them; contradicts the clarification, which places the filter in core before `groupBySlot`.

Chosen: A1.

## Decisions

- D1 Core exports `filterTalksByTrack(talks: readonly Talk[], selection: string): Talk[]`; it returns a new array holding every talk whose `trackId === selection`, and a copy of every talk when `selection === 'all'`. Status: closed.
- D2 Core exports `resolveTrackParam(tracks: readonly Track[], value: string | null | undefined): string`; it returns `value` when some track has that `id`, and `'all'` when the value is `null`, `undefined`, empty or matches no track. Status: closed.
- D3 The "every track" sentinel is the string literal `'all'` in all three layers; no constant is exported for it, and no seed track may use `all` as an id. Status: closed.
- D4 ui exports `TrackFilter` with props `tracks: readonly Track[]`, `value: string`, `onChange: (value: string) => void`; it renders `<label>` with the text "Track" wrapping a native `<select>` whose options are `<option value="all">All tracks</option>` followed by one `<option value={track.id}>{track.name}</option>` per track in the given order; `onChange` receives the selected option value, not the event. Status: closed.
- D5 `TrackFilter` holds no state and uses no hook; the nested label gives the select its accessible name, so no `id` or `htmlFor` is needed. Status: closed.
- D6 `SchedulePage` reads the URL with `useSearchParams` from `react-router` directly inside the component, computes `selection = resolveTrackParam(tracks, searchParams.get('track'))` and `slots = groupBySlot(filterTalksByTrack(talks, selection))` on every render, and renders `TrackFilter` between the `<h1>` and `ScheduleList`. Status: closed.
- D7 On `onChange(value)` the page copies the current params into `new URLSearchParams(searchParams)`, deletes `track` when `value === 'all'` and sets `track` to `value` otherwise, then calls `setSearchParams(next)`. Status: closed.
- D8 An unknown or empty `track` value renders "All tracks" with the full schedule and the URL is left untouched; the page never calls `setSearchParams` on mount. Status: closed.
- D9 The page-level tests in `App.test.tsx` observe the URL through a `LocationOutput` test helper rendered next to `App` inside the `MemoryRouter`, which prints `pathname + search` from `useLocation()` into an `<output aria-label="location">`; tests read it with `getByRole('status', { name: 'location' })`. Status: closed.
- D10 The `groupBySlot(talks)` call at module level in `SchedulePage.tsx` is removed; `talks` and `tracks` are imported from `@agenda/core` and used inside the component. Status: closed.
- D11 `TrackFilter` ships without a CSS module: the native `<select>` and its label inherit the typography that `Layout` already sets, and the page adds no styling; this keeps the change at 10 files, within Gate B, and the clarification excludes visual redesign. Status: closed.

## Layer assignment

| change | layer | file |
|---|---|---|
| `filterTalksByTrack` pure function | core | `packages/core/src/filterTalksByTrack.ts` |
| tests for `filterTalksByTrack` | core | `packages/core/src/filterTalksByTrack.test.ts` |
| `resolveTrackParam` pure function | core | `packages/core/src/resolveTrackParam.ts` |
| tests for `resolveTrackParam` | core | `packages/core/src/resolveTrackParam.test.ts` |
| re-export the two functions | core | `packages/core/src/index.ts` |
| `TrackFilter` component and `TrackFilterProps` | ui | `packages/ui/src/TrackFilter.tsx` |
| tests for `TrackFilter` | ui | `packages/ui/src/TrackFilter.test.tsx` |
| re-export `TrackFilter` and its props type | ui | `packages/ui/src/index.ts` |
| read `track` from the URL, filter, group, render the filter, write the URL | agenda | `apps/agenda/src/pages/SchedulePage.tsx` |
| page-level filter tests with user events and `/?track=data` | agenda | `apps/agenda/src/App.test.tsx` |

## Risks

- The literal `'all'` is repeated in core, ui and agenda; a typo in one layer silently breaks the "All tracks" path. Mitigated by the core tests, the ui test that asserts the option value, and the page test that selects "All tracks" and checks the URL.
- `setSearchParams` in react-router v7 pushes a history entry by default, so each filter change adds a back-button step. Accepted: the clarification asks for shareable, reload-safe URLs and says nothing about history; `replace` is not used.
- The select is unstyled beyond inherited typography; a later ticket can add `TrackFilter.module.css` with tokens without touching its props or tests.
- Testing Library's `user.selectOptions` on a native select fires `change` in jsdom, but arrow-key changes do not; the keyboard criterion is covered by asserting the select is reachable with Tab and by relying on native `<select>` behaviour.
