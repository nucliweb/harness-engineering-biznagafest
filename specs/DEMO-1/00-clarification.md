# DEMO-1 · Clarification

## Goal

Attendees can focus the schedule page on the talks of one track. A track filter on `/` narrows the list to Web, Data or Craft while keeping the grouping by time slot, and "All tracks" restores the full schedule. The selection lives in the URL as `?track=<trackId>` so a filtered view survives a reload and can be shared as a link.

## Scope

- core: a pure function that returns the talks whose `trackId` equals a given track id, applied before `groupBySlot` so slots keep their times and slots left empty disappear.
- core: a pure function that resolves the `track` URL value to a valid track id or to "all" when the value is missing or unknown.
- ui: a presentational, controlled track filter component built on a native `<select>` with a visible `<label>` reading "Track". Options are "All tracks" first, then one option per track from the catalog, in catalog order, labelled with the track name. It receives the current value and an `onChange` callback through props and holds no state.
- agenda: `SchedulePage` reads `track` from the URL with `useSearchParams`, resolves it with the core function, filters and groups the talks, and renders the filter above `ScheduleList`. Changing the filter writes `?track=<trackId>` to the URL; choosing "All tracks" removes the `track` param.
- agenda: a page-level test in `App.test.tsx` style that drives the filter with user events and with an initial `/?track=data` entry.

## Out of scope

- Changes to `/talks/:id`, including carrying the selected track back to the schedule from the talk page.
- Any empty-state message when a track has no talks; the page renders the heading and the filter with no slots.
- Rewriting or redirecting the URL when the `track` value is unknown; the URL stays as typed and the page renders "All tracks".
- Multi-track selection, persistence outside the URL (storage, cookies) and any custom dropdown widget.
- Visual redesign of `ScheduleList` or the schedule page layout beyond placing the filter.

## Acceptance criteria

- `/` renders a `<select>` labelled "Track" with options "All tracks", "Web", "Data" and "Craft", in that order, with "All tracks" selected when the URL has no `track` param.
- Selecting "Data" hides every talk whose `trackId` is not `data`; the remaining talks stay under their original time-slot headings and a slot with no remaining talks is not rendered.
- Selecting "All tracks" renders every talk and every slot again.
- Selecting a track updates the URL to `?track=<trackId>` (for example `/?track=data`); selecting "All tracks" removes the `track` param.
- Opening `/?track=data` directly renders only the Data talks with "Data" selected in the filter.
- Opening `/?track=unknown` renders the full schedule with "All tracks" selected and does not change the URL.
- The filter is operable with the keyboard (focusable, changeable with arrow keys) and is found by Testing Library with `getByRole('combobox', { name: 'Track' })`.
- `/talks/:id` renders exactly as before; its test keeps passing without changes.
- The existing `/` test that expects every talk keeps passing, since "All tracks" is the default.

## Code anchors

- `packages/core/src/types.ts:1` `Track` type with `id` and `name`; track ids are plain strings and drive the option values.
- `packages/core/src/types.ts:21` `Talk.trackId`; each talk has exactly one track, so the filter is an equality check on this field.
- `packages/core/src/data.ts:11` track seed data `web`, `data`, `craft`; these are the valid `track` URL values.
- `packages/core/src/groupBySlot.ts:5` `groupBySlot(talks)` groups by start and end; filtering before this call keeps slot times and drops empty slots.
- `packages/core/src/index.ts:4` public exports of core; the new pure functions are exported here.
- `packages/ui/src/ScheduleList.tsx:13` takes `slots`, `catalog`, `talkHref` and `renderLink` as props and holds no filtering logic; it receives already-filtered slots unchanged.
- `packages/ui/src/index.ts:1` ui exports; there is no select or form control yet, the filter component is new and exported here.
- `apps/agenda/src/pages/SchedulePage.tsx:5` `groupBySlot(talks)` runs at module level with no URL input; this moves into the component and takes the filtered talks.
- `apps/agenda/src/App.tsx:11` routes `/` to `SchedulePage` and `/talks/:id` to `TalkPage`; the detail route is untouched.
- `apps/agenda/src/App.test.tsx:15` the existing `/` assertion expects every talk and is the model for the new filter tests with `MemoryRouter` and `userEvent`.

## Open questions

- None
