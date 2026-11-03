---
id: DEMO-4
title: Filter talks by room
type: feature
---

## Description

Attendees who stay in one room want to see only what happens there. On the schedule page they should be able to pick a room and see only the talks in that room, still grouped by time slot, next to the existing track filter. Picking "All rooms" shows the full schedule again. The choice survives a page reload through the URL, so a filtered view can be shared as a link, and it combines with the track filter.

## Acceptance criteria

- The schedule at `/` shows a room filter with one option per room and an "All rooms" option, selected by default, next to the track filter.
- Selecting a room hides every talk that is not in it; talks keep their time slots and slots left with no talks are not shown.
- Selecting "All rooms" shows every talk again.
- The selected room is stored in the URL as `?room=<roomId>`; opening that URL shows the filtered schedule.
- Room and track filters combine: `/?track=web&room=harbour` shows only Web talks in the Harbour room, and changing one filter keeps the other.
- An unknown `room` value in the URL is treated as "All rooms".
- The filter is keyboard accessible and labelled "Room".
- `/talks/:id` is unchanged.
