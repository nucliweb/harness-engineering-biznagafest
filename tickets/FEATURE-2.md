---
id: FEATURE-2
title: Favourite talks persisted in localStorage
type: feature
---

## Description

Attendees want to mark the talks they plan to see. Each talk card on the schedule and the talk detail page get a favourite toggle. Favourites are remembered on the device, so they are still there after a reload. A favourited talk is visibly marked wherever it appears.

## Acceptance criteria

- Every talk card on `/` and the detail page at `/talks/:id` show a favourite toggle with an accessible name such as "Add to favourites" or "Remove from favourites" depending on the state.
- Activating the toggle on a talk marks it as a favourite; activating it again removes the mark.
- A favourited talk shows a visible marker on its card and on its detail page, and the toggle exposes its state with `aria-pressed`.
- Favourites are stored in `localStorage` under the key `agenda:favourites` as a JSON array of talk ids and are restored on reload.
- Corrupted or non-array stored values, and ids that do not match any talk, are ignored; the app still renders.
- The number of favourites is not shown anywhere and there is no separate favourites page.
