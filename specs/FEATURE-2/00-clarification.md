# FEATURE-2 · Clarification

## Goal

Attendees can mark the talks they plan to see from the schedule and from the talk detail page, and a favourited talk is visibly marked wherever it appears. Favourites stay on the device, so they survive a reload and bad stored data never stops the app from rendering.

## Scope

- core: pure `parse` and `serialise` functions for the stored favourites format, plus the rule that keeps only ids matching a talk and collapses duplicates.
- ui: a controlled favourite toggle and a visible marker, rendered by `TalkCard` and `TalkDetails`, with the favourite state and change callback passed through `ScheduleList`.
- agenda: a `localStorage` adapter that owns the key `agenda:favourites`, the favourites state, and its wiring into `SchedulePage` and `TalkPage`.

## Out of scope

- A count of favourites anywhere.
- A favourites page or any new route.
- Filtering or sorting the schedule by favourite. Schedule order and the track filter are unchanged.
- Sync between browser tabs.
- Failures of the storage API itself, such as `localStorage` being unavailable or a write being rejected. Only bad stored values are handled.
- Any change to the "Talk not found." state at `/talks/:id`, which shows no toggle.

## Acceptance criteria

- Every talk card on `/` and the detail page at `/talks/:id` show a toggle whose accessible name is "Add to favourites" when the talk is not a favourite and "Remove from favourites" when it is.
- Activating the toggle on a talk marks it as a favourite; activating it again removes the mark. Activating it does not navigate and does not change the track filter.
- A favourited talk shows the visible text "Favourite", separate from the toggle, on its card and on its detail page. A talk that is not a favourite does not show it.
- The toggle has `aria-pressed="true"` when the talk is a favourite and `aria-pressed="false"` when it is not.
- A toggle on one route is reflected on the other after client-side navigation, without a reload.
- Favourites are stored in `localStorage` under the key `agenda:favourites` as a JSON array of talk ids and are restored on reload. Removing the last favourite stores an empty array.
- A missing key means no favourites, and loading the app writes nothing to storage.
- A stored value that is not valid JSON or is not an array is ignored and the app renders with no favourites.
- Inside a stored array, entries that are not strings, ids that match no talk, and duplicates are ignored; the remaining valid ids are restored and the app renders. The next toggle writes only ids that match a talk.
- The number of favourites is not shown anywhere and there is no separate favourites page.

## Code anchors

- `packages/core/src/types.ts:17`: `Talk` has `id: string`, the value the stored array holds.
- `packages/core/CLAUDE.md:28`: persistence formats live in core as pure `serialise` and `parse` functions; the storage itself belongs to the app.
- `packages/ui/src/TalkCard.tsx:12`: the card that takes the toggle and marker; it only receives `view`, `href` and `renderLink` today.
- `packages/ui/src/TalkCard.tsx:17`: only the title is a link, so a toggle outside the `h3` does not sit inside an anchor.
- `packages/ui/src/TalkDetails.tsx:9`: the detail view that takes the toggle and marker; it only receives `view` today.
- `packages/ui/src/ScheduleList.tsx:25`: renders `TalkCard`, so the new props are threaded through here.
- `apps/agenda/src/pages/SchedulePage.tsx:21`: where `/` renders `ScheduleList` and passes in the favourite state.
- `apps/agenda/src/pages/TalkPage.tsx:15`: where `/talks/:id` renders `TalkDetails`; the not-found branch stays as is.
- `apps/agenda/src/App.tsx:11`: the routes that share the favourites; no new route is added.
- `apps/agenda/CLAUDE.md:17`: raw `localStorage` calls are wrapped once in an adapter. No storage adapter exists yet.

## Open questions

- None
