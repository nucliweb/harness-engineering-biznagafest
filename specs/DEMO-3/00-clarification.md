# DEMO-3 · Clarification

## Goal

During the event, attendees open the schedule on `/` and need to see at a glance what is happening right now. The schedule highlights the slot that is currently running and labels it "Now", keeps that highlight in step with the clock while the page stays open, and highlights nothing outside the running slots or on any other date.

## Scope

- core: a pure function that, given the slots and the current local date-time as an argument (`YYYY-MM-DDTHH:mm`, minute precision), returns the current slot or none. A slot is current when `start <= now < end`, compared as strings. If several slots contain `now`, the first in schedule order wins. Exported from `packages/core/src/index.ts`.
- ui: `ScheduleList` takes the current slot through props. On that slot it renders a visible "Now" label right after the time heading, sets `aria-current="time"` on the slot element and applies a visual highlight built from existing tokens in `tokens.css`.
- agenda: a clock hook under `apps/agenda/src/hooks/` reads the device's local time on mount and every 30 seconds after that, formats it as `YYYY-MM-DDTHH:mm` and clears its timer on unmount. `SchedulePage` passes the current slot, picked from the slots it already renders after the track filter, to `ScheduleList`.

## Out of scope

- `/talks/:id` (`TalkPage`) and its route stay unchanged.
- Timezone modelling: no conference timezone, no offsets. The device's local clock is compared with the local seed times.
- New design tokens or themes.
- Changes to slot grouping (`groupBySlot`), seed data or the track filter.
- Scrolling to the current slot, notifications, or showing the next slot.

## Acceptance criteria

- On `/`, when the current local time is inside a slot of the conference day, that slot's time heading is followed by a visible "Now" label and the slot is visually highlighted.
- Only one slot is highlighted at a time. A slot is current from its start time (inclusive) until its end time (exclusive): at `2026-11-14T09:30` the 09:30–10:15 slot is current, and at `2026-11-14T10:15` it is not.
- Between slots (for example `2026-11-14T10:20`), before the first slot, after the last slot, and on any date other than `2026-11-14`, no slot is highlighted and no "Now" label is shown.
- When the track filter hides every talk of the running slot, nothing is highlighted.
- The highlight updates without a reload: the time is read once on first render and again every 30 seconds while `/` is mounted.
- The highlighted slot has `aria-current="time"`; no other slot has an `aria-current` attribute.
- `/talks/:id` renders the same as before.

## Code anchors

- `packages/core/src/types.ts:24` — `Talk.start` and `Talk.end` are local `YYYY-MM-DDTHH:mm` strings with no offset; `now` uses the same shape.
- `packages/core/src/types.ts:30` — `Slot` stores `start`, `end` and `talks`, so the current-slot rule reads the slot's own range.
- `packages/core/src/data.ts:6` — conference date `2026-11-14`; every seed talk time starts with this date, so the "other date" case falls out of the full date-time comparison.
- `packages/core/src/groupBySlot.ts:5` — slots group talks with the same start and end; slots with the same start and different ends are possible, hence the "first in schedule order" rule.
- `packages/core/src/index.ts:1` — public exports; the new current-slot function is added here.
- `packages/core/CLAUDE.md` — `Date.now()` and `new Date()` with no argument are forbidden in core; time comes in as an argument.
- `packages/ui/src/ScheduleList.tsx:16` — each slot is an `<li>` with `<h2 className={styles.time}>`; the "Now" label follows this heading and `aria-current` goes on the `<li>`.
- `packages/ui/src/tokens.css:3` — colour tokens such as `--color-accent`; the highlight reuses them.
- `apps/agenda/src/pages/SchedulePage.tsx:6` — computes `slots` from the filtered talks; the composition point for the current slot.
- `apps/agenda/CLAUDE.md` — timers belong in a hook under `src/hooks/use<Name>.ts`.

## Open questions

- None
