# DEMO-3 · Research

## Inventory

### core

- `packages/core/src/types.ts:17-28`: `Talk` has `start` and `end` as local `YYYY-MM-DDTHH:mm` strings with no offset.
- `packages/core/src/types.ts:30-34`: `Slot` is `{ start: string; end: string; talks: Talk[] }`; it has no id and no "current" flag.
- `packages/core/src/groupBySlot.ts:5`: `export function groupBySlot(talks: readonly Talk[]): Slot[]`; sorts with `sortByStart`, then groups talks sharing `start` and `end`, so its output is in schedule order.
- `packages/core/src/sortByStart.ts:3-7`: order is `start`, then `end`, then `roomId`, via `localeCompare` on a copy.
- `packages/core/src/filterTalksByTrack.ts:3-6`: `filterTalksByTrack(talks: readonly Talk[], selection: string): Talk[]`; `'all'` returns a copy, otherwise filters on `trackId`.
- `packages/core/src/index.ts:1-9`: value exports ordered alphabetically by module (`./data`, `./filterTalksByTrack`, `./findTalk`, `./formatTimeRange`, `./groupBySlot`, `./resolveTalk`, `./resolveTrackParam`, `./sortByStart`), then `export type { ... } from './types'` on line 9.
- `packages/core/src/data.ts:6`: `conference.date` is `'2026-11-14'`; `data.ts:46` builds every talk time as `${day}T${HH:mm}`.
- `packages/core/src/data.ts:49-63`: four seed slots, 09:30–10:15, 10:30–11:15, 11:30–12:15, 14:00–14:45; each holds exactly one `web`, one `data` and one `craft` talk; no two slots overlap.
- `packages/core/src/groupBySlot.test.ts:5-14`: local `talk(id, start, end, roomId)` fixture factory returning a full `Talk`.
- `packages/core/src/filterTalksByTrack.test.ts:6-8`: fixture `talk(id, trackId, start = '2026-11-14T09:00', end = '2026-11-14T09:45')`.
- `packages/core/src/filterTalksByTrack.test.ts:39-52`: composes `filterTalksByTrack` into `groupBySlot` inside a core test.
- `tsconfig.base.json:9`: `noUncheckedIndexedAccess: true`; tests read indexed elements with `?.` or through `map`.
- `packages/core/CLAUDE.md`: one function per file named after it; named exports re-exported from `index.ts`; `Date.now()` and `new Date()` without an argument are forbidden; date-times compared as strings; `describe('<functionName>')`, no mocks.
- No function, type or test about "now" or a current slot exists in `packages/core`.

### ui

- `packages/ui/src/ScheduleList.tsx:6-11`: `ScheduleListProps` is `{ slots: Slot[]; catalog: Catalog; talkHref: (talkId: string) => string; renderLink?: LinkRenderer }`.
- `packages/ui/src/ScheduleList.tsx:13`: `export function ScheduleList({ slots, catalog, talkHref, renderLink }: ScheduleListProps)`, no return type annotation.
- `packages/ui/src/ScheduleList.tsx:16-18`: each slot is `<li key={`${slot.start}-${slot.end}`}>` whose first child is `<h2 className={styles.time}>{formatTimeRange(slot.start, slot.end)}</h2>`, followed by `<ul className={styles.talks}>`.
- `packages/ui/src/ScheduleList.module.css:1-24`: classes `.list`, `.time` (muted colour, `--font-size-md`, weight 700, `margin: 0 0 var(--space-2)`) and `.talks`; no highlight class.
- `packages/ui/src/tokens.css:3-12`: colour tokens `--color-bg`, `--color-surface`, `--color-text`, `--color-text-muted`, `--color-border`, `--color-accent`, `--color-accent-contrast`, track colours; dark values at lines 37-46.
- `packages/ui/src/tokens.css:15-32`: spacing `--space-1|2|3|4|6|8`, radius `--radius-1|2`, type `--font-size-sm|md|lg|xl`; no font-weight token.
- `packages/ui/src/TrackBadge.module.css:1-13`: `.badge` inline label pattern (`padding: 0 var(--space-2)`, `border-radius: var(--radius-1)`, `font-size: var(--font-size-sm)`, `font-weight: 600`, `border: 1px solid currentColor`).
- `packages/ui/src/TalkCard.module.css:1-9`: `.card` uses `--color-surface`, `1px solid var(--color-border)`, `--radius-2`.
- `packages/ui/src/ScheduleList.test.tsx:1-24`: fixture `groupBySlot(talks)` from `@agenda/core`; three tests querying headings level 2, articles and links by role.
- `packages/ui/src/index.ts:1-7`: `export { ScheduleList, type ScheduleListProps } from './ScheduleList';` already exported.
- `packages/ui/CLAUDE.md`: no `Date`; "now" comes in as a prop; tokens only via `var(--token)`; tests query by role and name and never assert class names.
- No `aria-current`, "Now" label or current-slot prop exists in `packages/ui`.

### agenda

- `apps/agenda/src/pages/SchedulePage.tsx:9`: `const slots = groupBySlot(filterTalksByTrack(talks, selection));` inside the component.
- `apps/agenda/src/pages/SchedulePage.tsx:21`: `<ScheduleList slots={slots} catalog={catalog} talkHref={(id) => `/talks/${id}`} renderLink={routerLink} />`.
- `apps/agenda/src/App.tsx:11-13`: routes `/`, `/talks/:id`, `*`.
- `apps/agenda/src/pages/TalkPage.tsx`: does not render `ScheduleList`.
- `apps/agenda/src/routerLink.tsx:4`: the only adapter file today.
- `apps/agenda/src/App.test.tsx:13-19`: `renderAt(path)` wraps `<App />` and `LocationOutput` in `MemoryRouter`.
- `apps/agenda/src/App.test.tsx:24-104`: `describe('App routes')` and `describe('Track filter')`; no `vi`, no fake timers.
- `vitest.config.ts:28-32`: project `app`, `jsdom`, `include: ['src/**/*.test.{ts,tsx}']`, setup `vitest.setup.ts` (jest-dom matchers and `cleanup` in `afterEach`).
- `apps/agenda/CLAUDE.md:9-10`: adapters for timers live in their own small file; app hooks in `src/hooks/use<Name>.ts` connect an adapter to core.
- `apps/agenda/CLAUDE.md:17`: raw `Date.now()` is wrapped once in an adapter so tests can pass a fake.
- No `src/hooks/` folder, no `useState`, `useEffect`, `setInterval` or `Date` usage exists in `apps/agenda/src`.

## Existing patterns

- Core functions take `readonly` arrays and live one per file with a sibling test using a local `talk(...)` fixture factory.
- Core tests compose `filterTalksByTrack` into `groupBySlot` to cover filter-dependent paths (`filterTalksByTrack.test.ts:39-52`).
- `noUncheckedIndexedAccess` is handled in tests by asserting through `map` instead of indexing.
- ui label styling: `TrackBadge.module.css` `.badge`; ui surface styling: `TalkCard.module.css` `.card`.
- ui tests build slots with `groupBySlot(talks)` from `@agenda/core`.
- Page tests render `<App />` inside `MemoryRouter` via `renderAt(path)` and scope assertions with `within`.
- `SchedulePage` computes derived data on every render from core functions, with no memoisation.

## Gaps

- No core function selects the slot that contains a given date-time.
- `ScheduleList` has no prop for the current slot, no "Now" label, no `aria-current` and no highlight class.
- No clock adapter, no `src/hooks/` folder and no timer-driven hook in `apps/agenda`.
- No test in the repo uses fake timers or sets the system time.
- Seed data cannot produce a running slot emptied by the track filter: every slot holds one talk per track.
