# FEATURE-3 · Plan

## Scope check

| files touched | lines estimated | layers touched | new exported symbols |
|---|---|---|---|
| 12 | 360 | core, ui, agenda | 1 |

New exported symbols counts `export` lines added to a package `index.ts`: only `findCurrentSlot` in `packages/core/src/index.ts`. `ScheduleListProps` changes shape but is already exported; `readLocalNow` and `useNow` are app modules, not package exports.

Verdict: Single PR

## Interfaces

### core

```ts
// packages/core/src/findCurrentSlot.ts
export function findCurrentSlot(slots: readonly Slot[], now: string): Slot | undefined;

// packages/core/src/index.ts adds
export { findCurrentSlot } from './findCurrentSlot';
```

### ui

```ts
// packages/ui/src/ScheduleList.tsx, changed
export type ScheduleListProps = {
  slots: Slot[];
  catalog: Catalog;
  talkHref: (talkId: string) => string;
  renderLink?: LinkRenderer;
  currentSlot?: Slot | undefined; // an element of `slots`, compared by identity
};
export function ScheduleList({ slots, catalog, talkHref, renderLink, currentSlot }: ScheduleListProps); // no return annotation, as today
```

### agenda

```ts
// apps/agenda/src/clock.ts
export function readLocalNow(): string; // local time as YYYY-MM-DDTHH:mm

// apps/agenda/src/hooks/useNow.ts
export function useNow(): string;

// apps/agenda/src/pages/SchedulePage.tsx, signature unchanged (no return annotation, as today)
export function SchedulePage();
```

## Steps

### core

- [x] S1 `packages/core/src/findCurrentSlot.test.ts` — imports: `describe, expect, it` from `'vitest'`, `filterTalksByTrack` from `'./filterTalksByTrack'`, `findCurrentSlot` from `'./findCurrentSlot'`, `groupBySlot` from `'./groupBySlot'`, `import type { Slot, Talk } from './types'`. Local fixtures: `const slot = (start: string, end: string): Slot => ({ start, end, talks: [] });` and `const talk = (id: string, trackId: string, start: string, end: string): Talk => ({ id, title: id, abstract: '', trackId, roomId: 'r1', speakerIds: [], start, end });`. Inside `describe('findCurrentSlot')` declare `const first = slot('2026-11-14T09:30', '2026-11-14T10:15'); const second = slot('2026-11-14T10:30', '2026-11-14T11:15'); const slots = [first, second];`. Cases, each one `it`: (1) `findCurrentSlot(slots, '2026-11-14T09:30')` `toBe(first)` (start is inclusive); (2) `'2026-11-14T10:14'` `toBe(first)`; (3) `'2026-11-14T10:15'` `toBeUndefined()` (end is exclusive); (4) `'2026-11-14T10:20'` `toBeUndefined()` (between slots); (5) `'2026-11-14T08:00'` `toBeUndefined()` (before the first slot); (6) `'2026-11-14T11:15'` and `'2026-11-14T15:00'` both `toBeUndefined()` (after the last slot); (7) `'2026-11-13T09:30'` and `'2026-11-15T09:30'` both `toBeUndefined()` (other dates); (8) `'2026-11-14T10:30'` `toBe(second)`; (9) `findCurrentSlot([], '2026-11-14T09:30')` `toBeUndefined()`; (10) overlap: `const long = slot('2026-11-14T09:30', '2026-11-14T11:00'); const short = slot('2026-11-14T09:30', '2026-11-14T10:00');` then `findCurrentSlot([short, long], '2026-11-14T09:45')` `toBe(short)` and `findCurrentSlot([long, short], '2026-11-14T09:45')` `toBe(long)`; (11) schedule order: `findCurrentSlot(groupBySlot([talk('a', 'web', '2026-11-14T09:30', '2026-11-14T11:00'), talk('b', 'web', '2026-11-14T09:30', '2026-11-14T10:00')]), '2026-11-14T09:45')?.end` `toBe('2026-11-14T10:00')`; (12) filter hides the running slot: `const fixture = [talk('a', 'data', '2026-11-14T09:30', '2026-11-14T10:15'), talk('b', 'web', '2026-11-14T10:30', '2026-11-14T11:15')];` then `findCurrentSlot(groupBySlot(filterTalksByTrack(fixture, 'web')), '2026-11-14T09:45')` `toBeUndefined()` and `findCurrentSlot(groupBySlot(filterTalksByTrack(fixture, 'data')), '2026-11-14T09:45')?.talks.map((t) => t.id)` `toEqual(['a'])`; (13) no mutation: `const input = [second, first]; findCurrentSlot(input, '2026-11-14T09:45'); expect(input).toEqual([second, first]);` and `expect(input[0]).toBe(second)`.
- [x] S2 `packages/core/src/findCurrentSlot.ts` — `import type { Slot } from './types';` then `export function findCurrentSlot(slots: readonly Slot[], now: string): Slot | undefined { return slots.find((slot) => slot.start <= now && now < slot.end); }`. No other branches, no `Date`.
- [x] S3 `packages/core/src/index.ts` — insert `export { findCurrentSlot } from './findCurrentSlot';` as a new line between line 3 (`export { findTalk } from './findTalk';`) and line 4 (`export { formatTimeRange } from './formatTimeRange';`); leave every other line untouched.

### ui

- [x] S4 `packages/ui/src/ScheduleList.test.tsx` — change the Testing Library import to `import { render, screen, within } from '@testing-library/react';`. Keep the three existing tests unchanged. Inside `describe('ScheduleList')`, after `const slots = groupBySlot(talks);`, add `const markedSlots = () => screen.getAllByRole('listitem').filter((li) => li.hasAttribute('aria-current'));` and `const markedHeadings = () => markedSlots().map((li) => within(li).getByRole('heading', { level: 2 }).textContent);`. Add four tests, each rendering `<ScheduleList slots={slots} catalog={catalog} talkHref={(id) => `/talks/${id}`} currentSlot={...} />`: (1) with `currentSlot={slots[1]}`: `markedHeadings()` `toEqual(['10:30 - 11:15'])`; `markedSlots().map((li) => li.getAttribute('aria-current'))` `toEqual(['time'])`; `screen.getAllByText('Now')` `toHaveLength(1)`; `screen.getByText('Now')` `toBeVisible()`; `markedSlots().map((li) => within(li).getByRole('heading', { level: 2 }).nextElementSibling?.textContent)` `toEqual(['Now'])`; `screen.getByRole('heading', { level: 2, name: '10:30 - 11:15' })` `toBeInTheDocument()` (the heading name stays the time range); (2) without the `currentSlot` prop: `markedSlots()` `toHaveLength(0)` and `screen.queryByText('Now')` `toBeNull()`; (3) with `currentSlot={{ start: '2026-11-14T09:30', end: '2026-11-14T10:15', talks: [] }}` (equal range, not an element of `slots`): `markedSlots()` `toHaveLength(0)` and `screen.queryByText('Now')` `toBeNull()`; (4) follows the prop: `const { rerender } = render(... currentSlot={slots[1]} />)`, then `rerender(... currentSlot={slots[2]} />)` and expect `markedHeadings()` `toEqual(['11:30 - 12:15'])` and `screen.getAllByText('Now')` `toHaveLength(1)`, then `rerender(... currentSlot={undefined} />)` and expect `markedSlots()` `toHaveLength(0)` and `screen.queryByText('Now')` `toBeNull()`. Never assert on class names.
- [x] S5 `packages/ui/src/ScheduleList.tsx` — add `currentSlot?: Slot | undefined;` as the last field of `ScheduleListProps`; destructure `currentSlot` last in the parameter list. Replace the slot map body with a block: `{slots.map((slot) => { const isCurrent = slot === currentSlot; return ( <li key={`${slot.start}-${slot.end}`} className={isCurrent ? styles.current : undefined} aria-current={isCurrent ? 'time' : undefined}> <h2 className={styles.time}>{formatTimeRange(slot.start, slot.end)}</h2> {isCurrent ? <p className={styles.now}>Now</p> : null} <ul className={styles.talks}>…unchanged talk map…</ul> </li> ); })}`. Imports stay as they are; no state, no hooks, no `Date`.
- [x] S6 `packages/ui/src/ScheduleList.module.css` — append after `.talks`: `.current { padding: var(--space-3); border: 1px solid var(--color-accent); border-radius: var(--radius-2); background: var(--color-surface); }` and `.now { display: inline-block; margin: 0 0 var(--space-2); padding: 0 var(--space-2); border-radius: var(--radius-1); background: var(--color-accent); color: var(--color-accent-contrast); font-size: var(--font-size-sm); font-weight: 600; }`. Leave `.list`, `.time` and `.talks` unchanged; do not edit `tokens.css`.

### agenda

- [x] S7 `apps/agenda/src/clock.test.ts` — imports: `afterEach, beforeEach, describe, expect, it, vi` from `'vitest'`, `readLocalNow` from `'./clock'`. `describe('readLocalNow')` with `beforeEach(() => { vi.useFakeTimers(); })` and `afterEach(() => { vi.useRealTimers(); })`. Cases, each calling `vi.setSystemTime(...)` then `readLocalNow()`: (1) `new Date(2026, 10, 14, 9, 5, 59)` returns `'2026-11-14T09:05'` (pads hours and minutes, drops seconds); (2) `new Date(2026, 0, 3, 14, 30)` returns `'2026-01-03T14:30'` (pads month and day); (3) `new Date(2026, 11, 31, 23, 59, 59, 999)` returns `'2026-12-31T23:59'`; (4) `new Date(2026, 10, 14, 0, 0)` returns `'2026-11-14T00:00'`.
- [x] S8 `apps/agenda/src/clock.ts` — `const pad = (value: number) => String(value).padStart(2, '0');` (not exported) and `export function readLocalNow(): string { const date = new Date(); return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`; }`. Local getters only, no `toISOString`, no timezone logic.
- [x] S9 `apps/agenda/src/hooks/useNow.test.ts` — imports: `act, renderHook` from `'@testing-library/react'`, `afterEach, beforeEach, describe, expect, it, vi` from `'vitest'`, `useNow` from `'./useNow'`. `describe('useNow')` with `beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 10, 14, 9, 30, 50)); })` and `afterEach(() => { vi.useRealTimers(); })`. Cases: (1) `const { result } = renderHook(() => useNow());` `result.current` `toBe('2026-11-14T09:30')`; (2) reads again every 30 seconds: render, then `act(() => { vi.advanceTimersByTime(29_999); })` and `result.current` `toBe('2026-11-14T09:30')`, then `act(() => { vi.advanceTimersByTime(1); })` and `toBe('2026-11-14T09:31')`, then `act(() => { vi.advanceTimersByTime(30_000); })` and `toBe('2026-11-14T09:31')`, then `act(() => { vi.advanceTimersByTime(30_000); })` and `toBe('2026-11-14T09:32')`; (3) a re-render does not read the clock: render, `act(() => { vi.advanceTimersByTime(20_000); })`, `rerender()`, `result.current` `toBe('2026-11-14T09:30')`; (4) clears its timer on unmount: `const { unmount } = renderHook(() => useNow());` `expect(vi.getTimerCount()).toBe(1)`, `unmount()`, `expect(vi.getTimerCount()).toBe(0)`.
- [x] S10 `apps/agenda/src/hooks/useNow.ts` — `import { useEffect, useState } from 'react';` and `import { readLocalNow } from '../clock';`; `const REFRESH_MS = 30_000;` (not exported); `export function useNow(): string { const [now, setNow] = useState(readLocalNow); useEffect(() => { const timer = setInterval(() => setNow(readLocalNow()), REFRESH_MS); return () => clearInterval(timer); }, []); return now; }`. No other effects, no minute alignment, no visibility listener.
- [x] S11 `apps/agenda/src/App.test.tsx` — change imports to `import { act, render, screen, within } from '@testing-library/react';` and `import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';`. Keep every existing test unchanged. After `const dataTalks = ...` add `const markedSlots = () => screen.queryAllByRole('listitem').filter((li) => li.hasAttribute('aria-current'));` and `const markedHeadings = () => markedSlots().map((li) => within(li).getByRole('heading', { level: 2 }).textContent);`. Add `describe('Current slot')` at the end of the file with `beforeEach(() => { vi.useFakeTimers(); })` and `afterEach(() => { vi.useRealTimers(); })` and: (1) `it.each` over rows `{ label, date, expected }`: `['start of first slot', new Date(2026, 10, 14, 9, 30), ['09:30 - 10:15']]`, `['last minute of first slot', new Date(2026, 10, 14, 10, 14), ['09:30 - 10:15']]`, `['end of first slot', new Date(2026, 10, 14, 10, 15), []]`, `['between slots', new Date(2026, 10, 14, 10, 20), []]`, `['before the first slot', new Date(2026, 10, 14, 8, 0), []]`, `['inside the last slot', new Date(2026, 10, 14, 14, 44), ['14:00 - 14:45']]`, `['after the last slot', new Date(2026, 10, 14, 15, 0), []]`, `['the day before', new Date(2026, 10, 13, 9, 30), []]`, `['the day after', new Date(2026, 10, 15, 9, 30), []]`, written as objects and titled `'highlights $label'`; each row does `vi.setSystemTime(date); renderAt('/');` then `expect(markedHeadings()).toEqual(expected)`, `expect(markedSlots().map((li) => li.getAttribute('aria-current'))).toEqual(expected.map(() => 'time'))`, `expect(screen.queryAllByText('Now')).toHaveLength(expected.length)` and `expect(markedSlots().map((li) => within(li).queryByText('Now') !== null)).toEqual(expected.map(() => true))`; (2) with the track filter: `vi.setSystemTime(new Date(2026, 10, 14, 9, 30)); renderAt('/?track=data');` then `screen.getAllByRole('article')` `toHaveLength(dataTalks.length)`, `markedHeadings()` `toEqual(['09:30 - 10:15'])`, and `markedSlots().map((li) => within(li).getAllByRole('article').length)` `toEqual([1])`; (3) updates without a reload: `vi.setSystemTime(new Date(2026, 10, 14, 10, 29, 45)); renderAt('/');` `markedHeadings()` `toEqual([])`, then `act(() => { vi.advanceTimersByTime(30_000); });` and `markedHeadings()` `toEqual(['10:30 - 11:15'])` and `screen.getAllByText('Now')` `toHaveLength(1)`; (4) talk page unchanged: `vi.setSystemTime(new Date(2026, 10, 14, 11, 45)); renderAt('/talks/fast-by-default');` `screen.getByRole('heading', { level: 1, name: 'Fast by default' })` `toBeInTheDocument()`, `screen.queryByText('Now')` `toBeNull()`, `markedSlots()` `toHaveLength(0)`. Do not use `userEvent` inside this `describe`.
- [x] S12 `apps/agenda/src/pages/SchedulePage.tsx` — change the core import to `import { catalog, filterTalksByTrack, findCurrentSlot, groupBySlot, resolveTrackParam, talks, tracks } from '@agenda/core';` and add `import { useNow } from '../hooks/useNow';` after the `routerLink` import. Inside `SchedulePage`, add `const now = useNow();` directly after the `useSearchParams` line, and `const currentSlot = findCurrentSlot(slots, now);` directly after the `const slots = ...` line. Add `currentSlot={currentSlot}` as the last prop of the existing `<ScheduleList ... />`. Change nothing else; no `useEffect`, no `Date` in the page.

## Definition of done

### core

- WHEN `findCurrentSlot` receives slots and a `now` with `start <= now < end` for one of them THE core SHALL return that slot object from the input
- WHEN `findCurrentSlot` receives a `now` equal to a slot's `end` THE core SHALL return `undefined` for that slot (end is exclusive), and `now` equal to `start` SHALL return the slot (start is inclusive)
- WHEN `findCurrentSlot` receives a `now` between slots, before the first, after the last, on a date other than the slots' date, or an empty array THE core SHALL return `undefined`
- WHEN several given slots contain `now` THE core SHALL return the first one in the order of the input array, which for `groupBySlot` output is schedule order
- WHEN the slots come from `groupBySlot(filterTalksByTrack(talks, track))` and the filter removed every talk of the running slot THE core SHALL return `undefined`
- WHEN `findCurrentSlot` runs THE core SHALL leave the input array unchanged
- WHEN `@agenda/core` is imported THE core SHALL expose `findCurrentSlot` from `src/index.ts`
- WHEN `pnpm exec vitest run --project core` runs THE core SHALL pass every test in `findCurrentSlot.test.ts` and every existing core test

### ui

- WHEN `ScheduleList` renders with `currentSlot` set to one of `slots` THE ui SHALL put `aria-current="time"` on that slot's `<li>` and render a visible "Now" label as the element right after its time heading, with the heading name still the time range
- WHEN `ScheduleList` renders THE ui SHALL render at most one "Now" label and no `aria-current` attribute on any other slot
- WHEN `ScheduleList` renders without `currentSlot`, or with a slot object that is not an element of `slots` THE ui SHALL render no "Now" label and no `aria-current` attribute
- WHEN the parent changes `currentSlot` THE ui SHALL move the label and `aria-current` to the new slot, or remove them when it becomes `undefined`
- WHEN `ScheduleList.module.css` styles the current slot THE ui SHALL use only `var(--...)` tokens that already exist in `tokens.css` (plus the 1px border width already used by `TalkCard`), and `tokens.css` SHALL be unchanged
- WHEN `pnpm exec vitest run --project ui` runs THE ui SHALL pass the three existing and four new `ScheduleList` tests

### agenda

- WHEN `readLocalNow` runs THE agenda SHALL return the device local time as `YYYY-MM-DDTHH:mm` with zero-padded month, day, hours and minutes and no seconds
- WHEN a component using `useNow` mounts THE agenda SHALL read the clock once for the first render and again every 30 seconds, and not on other re-renders
- WHEN a component using `useNow` unmounts THE agenda SHALL clear its interval, leaving no pending timer
- WHEN `/` is open at `2026-11-14T09:30` THE agenda SHALL show "Now" right after the `09:30 - 10:15` heading, highlight that slot and give only it `aria-current="time"`
- WHEN `/` is open at `2026-11-14T10:15`, `10:20`, `08:00`, `15:00`, or at `09:30` on `2026-11-13` or `2026-11-15` THE agenda SHALL show no "Now" label and no `aria-current` attribute
- WHEN `pnpm dev` serves `/` with the device clock inside a slot of `2026-11-14` THE agenda SHALL show that slot with the accent border, the surface background and the "Now" badge, in light and dark colour schemes
- WHEN `/?track=data` is open at `2026-11-14T09:30` THE agenda SHALL highlight the `09:30 - 10:15` slot among the filtered slots, which shows only its Data talk
- WHEN `/` stays open from `2026-11-14T10:29:45` for 30 seconds THE agenda SHALL move the highlight to `10:30 - 11:15` without a reload
- WHEN `/talks/:id` opens during a running slot THE agenda SHALL render the talk page as before, with no "Now" label, and the existing route tests SHALL pass unchanged
- WHEN `pnpm exec vitest run --project app` runs THE agenda SHALL pass the existing `App routes` and `Track filter` tests, the new `Current slot` tests, and the `readLocalNow` and `useNow` tests

## Audit

Blocking: 0 · Recommendations: 1 · Iterations: 1
