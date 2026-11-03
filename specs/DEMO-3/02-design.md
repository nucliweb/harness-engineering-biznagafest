# DEMO-3 · Design

## Alternatives

### A1 Core `findCurrentSlot`, ui `currentSlot` prop, agenda clock adapter plus `useNow` hook

Core exports `findCurrentSlot(slots, now)`, which returns the first slot with `start <= now < end`. `ScheduleList` takes an optional `currentSlot` prop and marks the matching slot with a "Now" label, `aria-current="time"` and a `.current` class. The app wraps the device clock once in `apps/agenda/src/clock.ts` (`readLocalNow()` formats the local time as `YYYY-MM-DDTHH:mm`), and `apps/agenda/src/hooks/useNow.ts` reads it on mount and every 30 seconds. `SchedulePage` calls `findCurrentSlot(slots, useNow())` on the slots it already renders and passes the result down.

- Pros: one new exported symbol; the only rule (which slot is current) lives in core and is unit tested; the clock is wrapped once in an adapter as `apps/agenda/CLAUDE.md` asks, and the hook only schedules; ui stays a pure render of props.
- Cons: two agenda files (adapter and hook) plus their tests for a small feature; page tests need fake timers and a fixed system time.

### A2 One `useCurrentSlot(slots)` hook that reads the clock, formats it and calls core

Same core and ui. In agenda, a single `useCurrentSlot(slots)` hook holds the `Date` read, the formatting, the interval and the call to `findCurrentSlot`, and returns the slot.

- Pros: the page gains one line; one agenda source file instead of two.
- Cons: the clarification asks for a clock hook that returns the formatted time and for `SchedulePage` to pick the slot; mixing the clock read into the hook leaves no adapter for tests to replace and puts formatting and scheduling in one untestable unit.

### A3 ui receives `now` and decides which slot is current

`ScheduleList` takes `now: string` and compares it with each slot's range while rendering.

- Pros: no new core function; agenda only passes a string.
- Cons: puts a domain rule inside ui, which `packages/ui/CLAUDE.md` forbids; the "first slot wins" rule would be written in a component; contradicts the clarification, which assigns the rule to core.

Chosen: A1.

## Decisions

- D1 Core adds `packages/core/src/findCurrentSlot.ts` exporting `findCurrentSlot(slots: readonly Slot[], now: string): Slot | undefined`, implemented as `slots.find((slot) => slot.start <= now && now < slot.end)`; it returns the element of the input array, not a copy, and `undefined` when no slot contains `now`. Status: closed.
- D2 The comparison is plain string comparison on `YYYY-MM-DDTHH:mm` values; there is no separate check against `conference.date`, because a `now` on another date sorts outside every slot range. Status: closed.
- D3 When several slots contain `now`, the first one in the order of the given array wins; callers pass `groupBySlot` output, which is in schedule order. Status: closed.
- D4 `findCurrentSlot` is re-exported from `packages/core/src/index.ts` between the `findTalk` and `formatTimeRange` lines, keeping the alphabetical order of value exports. Status: closed.
- D5 `ScheduleListProps` gains `currentSlot?: Slot | undefined`; the prop is optional so the existing callers and tests compile unchanged. Status: closed.
- D6 `ScheduleList` treats a slot as current when `slot === currentSlot` (object identity), because the page passes an element of the same `slots` array it renders; a slot object that is not in `slots` highlights nothing. Status: closed.
- D7 On the current slot, the `<li>` gets `aria-current="time"` and `className={styles.current}`, and a `<p className={styles.now}>Now</p>` is rendered as the next sibling of the `<h2>`, so the heading's accessible name stays the time range; on every other slot `aria-current` and `className` are `undefined`, so React renders neither attribute. Status: closed.
- D8 `ScheduleList.module.css` adds `.current` (padding `var(--space-3)`, `1px solid var(--color-accent)` border, `var(--radius-2)` radius, `var(--color-surface)` background) and `.now` (inline-block badge with `var(--color-accent)` background, `var(--color-accent-contrast)` text, `var(--font-size-sm)`, weight 600, `var(--radius-1)` radius, `0 var(--space-2)` padding, `0 0 var(--space-2)` margin); the 1px border width and the numeric font weights follow the existing `TalkCard.module.css` and `TrackBadge.module.css`; no token is added to `tokens.css`. Status: closed.
- D9 Agenda adds the adapter `apps/agenda/src/clock.ts` exporting `readLocalNow(): string`, which builds `new Date()` and returns `${getFullYear()}-${MM}-${DD}T${HH}:${mm}` with month, day, hours and minutes zero-padded to two digits from the local getters; it is the only place in the app that reads the clock. Status: closed.
- D10 Agenda adds `apps/agenda/src/hooks/useNow.ts` exporting `useNow(): string`; it initialises state with `useState(readLocalNow)`, and in a `useEffect` with an empty dependency list starts `setInterval(() => setNow(readLocalNow()), 30_000)` and returns a cleanup that calls `clearInterval`. No minute alignment and no visibility handling. Status: closed.
- D11 `SchedulePage` adds `const now = useNow();` and `const currentSlot = findCurrentSlot(slots, now);` after the existing `slots` line, and passes `currentSlot={currentSlot}` to `ScheduleList`; because `slots` is already filtered by track, a running slot hidden by the filter yields `undefined` and nothing is highlighted. Status: closed.
- D12 Tests that depend on time use Vitest fake timers with `vi.setSystemTime(new Date(2026, 10, 14, H, M, S))` (local-time constructor, so results do not depend on the machine timezone) and `vi.useRealTimers()` in `afterEach`; time advances through `act(() => { vi.advanceTimersByTime(ms); })`. Status: closed.
- D13 Because every seed slot holds one talk per track, the "filter hides the running slot" criterion is proven in core with fixture talks composed through `filterTalksByTrack` and `groupBySlot`, and in agenda by D11 using the filtered `slots`; page tests cover a filtered URL where the running slot keeps a talk. Status: closed.
- D14 `TalkPage` and `/talks/:id` are not edited; a page test checks that `/talks/fast-by-default` at a running time shows no "Now" label. Status: closed.

## Layer assignment

| change | layer | file |
|---|---|---|
| `findCurrentSlot` pure function | core | `packages/core/src/findCurrentSlot.ts` |
| tests for `findCurrentSlot` | core | `packages/core/src/findCurrentSlot.test.ts` |
| re-export `findCurrentSlot` | core | `packages/core/src/index.ts` |
| `currentSlot` prop, "Now" label, `aria-current`, highlight class | ui | `packages/ui/src/ScheduleList.tsx` |
| `.current` and `.now` styles from existing tokens | ui | `packages/ui/src/ScheduleList.module.css` |
| render tests for the current slot | ui | `packages/ui/src/ScheduleList.test.tsx` |
| clock adapter `readLocalNow` | agenda | `apps/agenda/src/clock.ts` |
| tests for `readLocalNow` | agenda | `apps/agenda/src/clock.test.ts` |
| `useNow` hook with 30 second interval | agenda | `apps/agenda/src/hooks/useNow.ts` |
| tests for `useNow` | agenda | `apps/agenda/src/hooks/useNow.test.ts` |
| compose `useNow` and `findCurrentSlot` into the page | agenda | `apps/agenda/src/pages/SchedulePage.tsx` |
| page-level current-slot tests | agenda | `apps/agenda/src/App.test.tsx` |

## Risks

- The highlight lags the clock by up to 30 seconds at slot boundaries; accepted by the clarification's 30 second refresh.
- Object identity in D6 breaks if a future caller passes a slot from a different array; the ui test pins the behaviour and `findCurrentSlot` returns an element of its input.
- Fake timers in `App.test.tsx` could leak into the existing `userEvent` tests; the new tests live in their own `describe` with `vi.useRealTimers()` in `afterEach`.
- Seed data cannot empty a running slot through the track filter, so that path is not exercised end to end in the page; it is covered by the core composition test and by the page using the filtered `slots`.
- `.current` adds padding to the slot `<li>`, which shifts its content slightly; accepted as part of the visual highlight.
