---
id: DEMO-1
title: Filter talks by track
type: feature
---

## Description

Attendees want to focus on the talks of one track. On the schedule page they should be able to pick Web, Data or Craft and see only the talks of that track, still grouped by time slot. Picking "All tracks" shows the full schedule again. The choice survives a page reload through the URL, so a filtered view can be shared as a link.

## Acceptance criteria

- The schedule at `/` shows a track filter with one option per track (Web, Data, Craft) and an "All tracks" option, selected by default.
- Selecting a track hides every talk that does not belong to it; talks keep their time slots and slots left with no talks are not shown.
- Selecting "All tracks" shows every talk again.
- The selected track is stored in the URL as `?track=<trackId>` (for example `/?track=data`); opening that URL shows the filtered schedule.
- An unknown `track` value in the URL is treated as "All tracks".
- The filter is keyboard accessible and labelled "Track".
- `/talks/:id` is unchanged.
