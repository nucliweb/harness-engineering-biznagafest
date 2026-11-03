# DEMO-1 · Research

## Inventory

### core

- `packages/core/src/types.ts:1` `Track` type with `id` and `name` only.
- `packages/core/src/types.ts:17` `Talk` type; `trackId: string` at line 21, one track per talk.
- `packages/core/src/types.ts:50` `TalkView` joins `talk`, `track`, `room`, `speakers`.
- `packages/core/src/data.ts:10` seed tracks in order `web`, `data`, `craft` (`{ id: 'web', name: 'Web' }`, …).
- `packages/core/src/data.ts:41` `talk(...)` helper builds a `Talk` from positional args; `start`/`end` are `${day}T${time}`.
- `packages/core/src/data.ts:48` seed talks: three per track per time block (09:30, 10:30, 11:30, 14:00); every `trackId` is one of `web`, `data`, `craft`.
- `packages/core/src/data.ts:66` `catalog` bundles `tracks`, `rooms`, `speakers`.
- `packages/core/src/groupBySlot.ts:5` `groupBySlot(talks: readonly Talk[]): Slot[]`; sorts via `sortByStart`, groups by equal start and end; accepts any pre-filtered array.
- `packages/core/src/resolveTalk.ts:4` `resolveTalk(catalog, talk): TalkView | undefined`; looks the track up with `catalog.tracks.find((t) => t.id === talk.trackId)`. Only existing `trackId` lookup.
- `packages/core/src/index.ts:1-7` named re-exports; values on lines 1–6, types on line 7 (`export { groupBySlot } from './groupBySlot';`).
- `packages/core/src/groupBySlot.test.ts:1-14` test pattern: local `talk(id, start, end, roomId)` factory returning a full `Talk` with `trackId: 't1'`; `describe`/`it`/`expect` from `vitest`, `toEqual`/`toHaveLength`.
- `packages/core/src/resolveTalk.test.ts:6` fixture `tracks: [{ id: 'web', name: 'Web' }]`; line 33 dangling-track case (`trackId: 'nope'`) expects `undefined`.
- `packages/core/src/data.test.ts:6-8` asserts three tracks; lines 15–19 assert every talk resolves against the catalog.
- `packages/core/src/sortByStart.test.ts:9` another local `Talk` factory with `trackId: 't1'`.

### ui

- `packages/ui/src/ScheduleList.tsx:6-11` `ScheduleListProps`: `slots: Slot[]`, `catalog: Catalog`, `talkHref: (talkId: string) => string`, `renderLink?: LinkRenderer`.
- `packages/ui/src/ScheduleList.tsx:13` stateless function component taking those four props.
- `packages/ui/src/ScheduleList.tsx:21-22` resolves each talk with `resolveTalk(catalog, talk)` and returns `null` when there is no view.
- `packages/ui/src/ScheduleList.tsx:25` passes `href={talkHref(talk.id)}` and `renderLink` to `TalkCard`.
- `packages/ui/src/link.tsx:3-10` `LinkProps` and `LinkRenderer` types; `anchorLink` default at lines 12–16.
- `packages/ui/src/TalkCard.tsx:6-10` `TalkCardProps` (`view`, `href`, `renderLink?`); renders `<article>` with `TrackBadge` (lines 14–16).
- `packages/ui/src/TrackBadge.tsx:4-11` `TrackBadgeProps { track: Track }`; tone picked by `styles[track.id] ?? styles.other`.
- `packages/ui/src/TrackBadge.module.css:10-13` classes `.web`, `.data`, `.craft`, `.other`, each setting a `--color-track-*` token.
- `packages/ui/src/tokens.css:3-12` colour tokens (`--color-bg`, `--color-surface`, `--color-text`, `--color-text-muted`, `--color-border`, `--color-accent`, `--color-accent-contrast`, `--color-track-web|data|craft`); dark overrides at lines 37–46.
- `packages/ui/src/tokens.css:14-24` spacing `--space-1` to `--space-8` (no `--space-5`, `--space-7`), radius `--radius-1`, `--radius-2`.
- `packages/ui/src/tokens.css:27-32` `--font-family`, `--font-size-sm|md|lg|xl`, `--line-height`.
- One CSS module per component imported as `styles` (`ScheduleList.tsx:3`; also `TalkCard.module.css`, `Layout.module.css`, `TalkDetails.module.css`).
- `packages/ui/src/index.ts:1-6` barrel: `export { Name, type NameProps } from './Name';` for `Layout`, `LinkProps`/`LinkRenderer`, `ScheduleList`, `TalkCard`, `TalkDetails`, `TrackBadge`.
- `packages/ui/src/ScheduleList.test.tsx:1-24` `render, screen` from `@testing-library/react`; `describe, expect, it` from `vitest`; role queries (`getAllByRole('heading', { level: 2 })`, `getByRole('link', { name })`, `getAllByRole('article')`); data from `@agenda/core` (`catalog`, `groupBySlot`, `talks`).
- `packages/ui/src/TrackBadge.test.tsx:5-15` smallest component test, `describe('TrackBadge')` with `getByText`.
- `packages/ui/src/TalkCard.test.tsx:42` custom `renderLink` passed in a test.

### agenda

- `apps/agenda/src/pages/SchedulePage.tsx:1` imports `catalog, groupBySlot, talks` from `@agenda/core`.
- `apps/agenda/src/pages/SchedulePage.tsx:5` `const slots = groupBySlot(talks);` at module top level.
- `apps/agenda/src/pages/SchedulePage.tsx:10` renders `<h1>Schedule</h1>`.
- `apps/agenda/src/pages/SchedulePage.tsx:11` renders `<ScheduleList slots={slots} catalog={catalog} talkHref={(id) => \`/talks/${id}\`} renderLink={routerLink} />`.
- `apps/agenda/src/App.tsx:9` wraps routes in `<Layout title={conference.name}>`; lines 11–13 route `/`, `/talks/:id`, `*`.
- `apps/agenda/src/pages/TalkPage.tsx:6-15` `useParams()`, `findTalk`, `resolveTalk`, `<Link to="/">Back to schedule</Link>`, `TalkDetails` or `Talk not found.`.
- `apps/agenda/src/routerLink.tsx:4-8` `routerLink: LinkRenderer` adapter over react-router `Link`.
- `apps/agenda/src/App.test.tsx:3-4` imports `userEvent` from `@testing-library/user-event` and `MemoryRouter` from `react-router`.
- `apps/agenda/src/App.test.tsx:8-13` `renderAt(path)` helper renders `<App />` inside `<MemoryRouter initialEntries={[path]}>`.
- `apps/agenda/src/App.test.tsx:16-20` "shows the event name and every talk on /": asserts `Caleta Conf 2026` and `getAllByRole('article')` length equals `talks.length`.
- `apps/agenda/src/App.test.tsx:22-25` "/talks/:id" test at `/talks/fast-by-default` asserts level-1 heading `Fast by default`.
- `apps/agenda/src/App.test.tsx:27-30` unknown talk asserts `Talk not found.`.
- `apps/agenda/src/App.test.tsx:32-39` navigation test with `userEvent.setup()`, clicks `Fast by default` then `Back to schedule`, asserts `Schedule` heading.
- `apps/agenda/package.json:16` `react-router ^7.18.5`; lines 14–15 `react`/`react-dom ^19.3.1`; no test deps in the package, they come from the root.
- `apps/agenda/vite.config.ts:4-6` `defineConfig({ plugins: [react()] })`, no `test` block.
- `apps/agenda/src/main.tsx:4` the only `BrowserRouter`.

## Existing patterns

- One function per file in core, named after the function, with a sibling `.test.ts` using a local `Talk` factory and plain arrays.
- Core exports are collected in `index.ts` as named re-exports, with types under `export type`.
- ui components are stateless, typed `Props` objects exported beside the component, one CSS module per component, tokens through `var(--token)`.
- ui barrel line shape: `export { Name, type NameProps } from './Name';`.
- ui tests query by role and name and build fixtures from `@agenda/core` data.
- agenda pages compose core data into ui components; `routerLink` is the only router adapter.
- agenda page tests use a `renderAt(path)` helper with `MemoryRouter` and `userEvent.setup()`.

## Gaps

- No function in core filters talks by `trackId`; `resolveTalk` is the only `trackId` lookup and it is not a filter.
- No function in core maps a URL value to a track id or to `"all"`; the string `"all"` does not appear in core.
- No `<select>`, `<label>`, `htmlFor` or `useState` anywhere in `packages/ui/src`; no controlled form control exists to copy.
- No `useSearchParams`, `useLocation` or `URLSearchParams` usage in `apps/agenda/src`; no URL query state exists.
- No `apps/agenda/src/hooks/` directory exists.
- `SchedulePage` computes `slots` at module level, so it cannot react to URL input without moving the call inside the component.
- No test in `App.test.tsx` asserts on the URL or on a `combobox`.
