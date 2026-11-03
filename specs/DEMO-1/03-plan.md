# DEMO-1 · Plan

## Scope check

| files touched | lines estimated | layers touched | new exported symbols |
|---|---|---|---|
| 10 | 260 | core, ui, agenda | 3 |

New exported symbols are runtime exports: `filterTalksByTrack`, `resolveTrackParam`, `TrackFilter`. `TrackFilterProps` is the props type that accompanies `TrackFilter` by ui convention.

Verdict: Single PR

## Interfaces

### core

```ts
// packages/core/src/filterTalksByTrack.ts
export function filterTalksByTrack(talks: readonly Talk[], selection: string): Talk[];

// packages/core/src/resolveTrackParam.ts
export function resolveTrackParam(tracks: readonly Track[], value: string | null | undefined): string;

// packages/core/src/index.ts adds
export { filterTalksByTrack } from './filterTalksByTrack';
export { resolveTrackParam } from './resolveTrackParam';
```

### ui

```ts
// packages/ui/src/TrackFilter.tsx
export type TrackFilterProps = {
  tracks: readonly Track[];
  value: string; // 'all' or a track id
  onChange: (value: string) => void; // receives 'all' or the chosen track id
};
export function TrackFilter({ tracks, value, onChange }: TrackFilterProps); // no return annotation, like TrackBadge

// packages/ui/src/index.ts adds
export { TrackFilter, type TrackFilterProps } from './TrackFilter';
```

### agenda

```ts
// apps/agenda/src/pages/SchedulePage.tsx, signature unchanged (no return annotation, as today)
export function SchedulePage();
```

## Steps

### core

- [x] S1 `packages/core/src/filterTalksByTrack.test.ts` — `describe('filterTalksByTrack')` with a local `talk(id, trackId, start = '2026-11-14T09:00', end = '2026-11-14T09:45')` factory returning a full `Talk` (title = id, abstract '', roomId 'r1', speakerIds []). Import `groupBySlot` from `./groupBySlot` for case (6). Cases: (1) `filterTalksByTrack([a:web, b:data, c:web], 'web')` returns ids `['a', 'c']` in input order; (2) `'all'` returns an array equal to the input with every id, and `not.toBe` the input array; (3) `'nope'` returns `[]`; (4) `[]` with `'web'` returns `[]`; (5) the input array is not mutated: `const input = [talk('a', 'web'), talk('b', 'data')]; const before = input.map((t) => t.id); filterTalksByTrack(input, 'nope'); filterTalksByTrack(input, 'web'); expect(input.map((t) => t.id)).toEqual(before)`; (6) `groupBySlot(filterTalksByTrack([talk('a', 'web', '2026-11-14T09:00', '2026-11-14T09:45'), talk('b', 'data', '2026-11-14T10:00', '2026-11-14T10:45')], 'web'))` returns exactly one slot with `start` `'2026-11-14T09:00'` whose talks ids are `['a']`, proving a slot left empty by the filter is not produced.
- [x] S2 `packages/core/src/filterTalksByTrack.ts` — `import type { Talk } from './types'`; `export function filterTalksByTrack(talks: readonly Talk[], selection: string): Talk[] { if (selection === 'all') return [...talks]; return talks.filter((talk) => talk.trackId === selection); }`. No other branches.
- [x] S3 `packages/core/src/resolveTrackParam.test.ts` — `describe('resolveTrackParam')` with `const tracks: Track[] = [{ id: 'web', name: 'Web' }, { id: 'data', name: 'Data' }]`. Cases: (1) `'data'` returns `'data'`; (2) `null` returns `'all'`; (3) `undefined` returns `'all'`; (4) `''` returns `'all'`; (5) `'unknown'` returns `'all'`; (6) `'Data'` returns `'all'` (ids are case-sensitive); (7) `'all'` returns `'all'` with no track called `all`.
- [x] S4 `packages/core/src/resolveTrackParam.ts` — `import type { Track } from './types'`; `export function resolveTrackParam(tracks: readonly Track[], value: string | null | undefined): string { if (!value) return 'all'; return tracks.some((track) => track.id === value) ? value : 'all'; }`.
- [x] S5 `packages/core/src/index.ts` — add `export { filterTalksByTrack } from './filterTalksByTrack';` between the `./data` line and the `findTalk` line, and `export { resolveTrackParam } from './resolveTrackParam';` between the `resolveTalk` line and the `sortByStart` line; leave every existing line untouched.

### ui

- [x] S6 `packages/ui/src/TrackFilter.test.tsx` — `describe('TrackFilter')` with `tracks` = `[{ id: 'web', name: 'Web' }, { id: 'data', name: 'Data' }, { id: 'craft', name: 'Craft' }]` and `vi.fn()` for `onChange`. Cases: (1) renders `screen.getByRole('combobox', { name: 'Track' })`; (2) `screen.getAllByRole('option').map((o) => o.textContent)` equals `['All tracks', 'Web', 'Data', 'Craft']` and `.map((o) => (o as HTMLOptionElement).value)` equals `['all', 'web', 'data', 'craft']`; (3) with `value="data"` the combobox `toHaveValue('data')` and `toHaveDisplayValue('Data')`; (4) with `value="all"` the combobox `toHaveDisplayValue('All tracks')`; (5) `await user.selectOptions(combobox, 'data')` calls `onChange` once with `'data'`; (6) with `value="data"`, `await user.selectOptions(combobox, 'all')` calls `onChange` once with `'all'` and, since the test does not re-render, `expect(combobox).toHaveValue('data')` still holds (controlled select stays on the prop value); (7) `await user.tab()` gives the combobox focus (`toHaveFocus()`). Use `userEvent.setup()` and `vi` from `vitest`.
- [x] S7 `packages/ui/src/TrackFilter.tsx` — `import type { Track } from '@agenda/core'`; export `TrackFilterProps` as in Interfaces; `export function TrackFilter({ tracks, value, onChange }: TrackFilterProps)` returns `<label>Track<select value={value} onChange={(event) => onChange(event.target.value)}><option value="all">All tracks</option>{tracks.map((track) => <option key={track.id} value={track.id}>{track.name}</option>)}</select></label>`. Put a single space or nothing between the text "Track" and the `<select>` so the accessible name is exactly `Track` (write `Track{' '}` before the select). No state, no hooks, no CSS import, no `id`/`htmlFor`.
- [x] S8 `packages/ui/src/index.ts` — add `export { TrackFilter, type TrackFilterProps } from './TrackFilter';` as the last line, after the `TrackBadge` line.

### agenda

- [x] S9 `apps/agenda/src/App.test.tsx` — add `import { useLocation } from 'react-router'` (extend the existing `react-router` import), `import { within } from '@testing-library/react'` (extend the existing import) and `import { filterTalksByTrack, groupBySlot, talks } from '@agenda/core'` (extend the existing import). Add a test-only `function LocationOutput() { const { pathname, search } = useLocation(); return <output aria-label="location">{pathname + search}</output>; }` and render `<LocationOutput />` as a sibling after `<App />` inside the `MemoryRouter` in `renderAt`. Add a helper `const location = () => screen.getByRole('status', { name: 'location' })` and `const dataTalks = filterTalksByTrack(talks, 'data')`. Keep the four existing tests unchanged. Add a `describe('Track filter')` block with: (1) `'/'` renders `getByRole('combobox', { name: 'Track' })` with `toHaveDisplayValue('All tracks')` and `within(combobox).getAllByRole('option').map((o) => o.textContent)` equal to `['All tracks', 'Web', 'Data', 'Craft']`; (2) selecting Data: `await user.selectOptions(combobox, 'data')`, then `getAllByRole('article')` has length `dataTalks.length`, `getAllByRole('heading', { level: 2 }).map((h) => h.textContent)` equals `groupBySlot(dataTalks).map((s) => formatTimeRange(s.start, s.end))` (add `formatTimeRange` to the `@agenda/core` import), for each `article` of `screen.getAllByRole('article')`: `within(article).getByText('Data')` is present and `within(article).queryByText('Web')` and `within(article).queryByText('Craft')` are null (scoped to the card, because the combobox options also read `Web` and `Craft`), and `location()` `toHaveTextContent('/?track=data')`; (3) selecting Data then All tracks: `await user.selectOptions(combobox, 'all')`, articles length `talks.length`, headings level 2 length `groupBySlot(talks).length`, `location()` `toHaveTextContent('/')` and not `track=`; (4) `renderAt('/?track=data')` renders combobox `toHaveValue('data')` and articles length `dataTalks.length`; (5) `renderAt('/?track=unknown')` renders combobox `toHaveDisplayValue('All tracks')`, articles length `talks.length`, and `location()` `toHaveTextContent('/?track=unknown')`.
- [x] S10 `apps/agenda/src/pages/SchedulePage.tsx` — replace the imports with `import { catalog, filterTalksByTrack, groupBySlot, resolveTrackParam, talks, tracks } from '@agenda/core'`, `import { ScheduleList, TrackFilter } from '@agenda/ui'`, `import { useSearchParams } from 'react-router'`, keep `routerLink`. Delete the module-level `const slots = groupBySlot(talks);`. Inside `SchedulePage`: `const [searchParams, setSearchParams] = useSearchParams();` `const selection = resolveTrackParam(tracks, searchParams.get('track'));` `const slots = groupBySlot(filterTalksByTrack(talks, selection));` `const onTrackChange = (value: string) => { const next = new URLSearchParams(searchParams); if (value === 'all') next.delete('track'); else next.set('track', value); setSearchParams(next); };` Render `<h1>Schedule</h1>`, then `<TrackFilter tracks={tracks} value={selection} onChange={onTrackChange} />`, then the existing `<ScheduleList ... />` with `slots`. No `useEffect`, no call to `setSearchParams` outside `onTrackChange`.

## Definition of done

### core

- WHEN `filterTalksByTrack` receives a track id THE core SHALL return a new array with only the talks whose `trackId` equals it, in input order
- WHEN `filterTalksByTrack` receives `'all'` THE core SHALL return a new array containing every input talk
- WHEN `filterTalksByTrack` receives an id no talk has THE core SHALL return an empty array and leave the input untouched
- WHEN the talks filtered by `filterTalksByTrack` leave a time slot with no talks THE core SHALL produce no slot for it from `groupBySlot`
- WHEN `resolveTrackParam` receives a value equal to the id of one of the given tracks THE core SHALL return that value
- WHEN `resolveTrackParam` receives `null`, `undefined`, an empty string or an unknown value THE core SHALL return `'all'`
- WHEN `pnpm exec vitest run --project core` runs THE core SHALL pass every test in `filterTalksByTrack.test.ts` and `resolveTrackParam.test.ts`

### ui

- WHEN `TrackFilter` renders THE ui SHALL expose a combobox with the accessible name `Track` and options `All tracks`, then one per given track in the given order labelled with the track name, with values `all` and the track ids
- WHEN `TrackFilter` renders with `value` THE ui SHALL show the option whose value matches it as selected
- WHEN the user selects an option and the parent does not change `value` THE ui SHALL keep showing the option that matches `value`
- WHEN the user selects an option THE ui SHALL call `onChange` once with that option's value (`'all'` or the track id), not with the event
- WHEN the user presses Tab from the start of the document THE ui SHALL move focus to the select
- WHEN `pnpm exec vitest run --project ui` runs THE ui SHALL pass every test in `TrackFilter.test.tsx`

### agenda

- WHEN `/` opens without a `track` param THE agenda SHALL render the combobox `Track` with `All tracks` selected, options `All tracks`, `Web`, `Data`, `Craft` in that order, and every talk
- WHEN the user selects `Data` THE agenda SHALL render only the talks with `trackId` `data` under their original slot headings, with as many slot headings as `groupBySlot` returns for those talks, and set the URL to `/?track=data`
- WHEN the user selects `All tracks` THE agenda SHALL render every talk and every slot again and remove the `track` param from the URL
- WHEN `/?track=data` opens directly THE agenda SHALL render only the Data talks with `Data` selected in the combobox
- WHEN `/?track=unknown` opens directly THE agenda SHALL render every talk with `All tracks` selected and keep the URL as `/?track=unknown`
- WHEN `/talks/:id` opens THE agenda SHALL render exactly as before and the existing talk-page tests SHALL pass unchanged
- WHEN `pnpm exec vitest run --project app` runs THE agenda SHALL pass the four existing tests unchanged and the five new `Track filter` tests

## Audit

Blocking: 0 · Recommendations: 1 · Iterations: 3
