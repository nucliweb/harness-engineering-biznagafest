---
id: FEATURE-3
title: "Now" indicator on the schedule
type: feature
---

## Description

During the event, attendees open the schedule and need to see at a glance what is happening right now. The schedule highlights the slot that is currently running and labels it "Now". Before the event day nothing is highlighted, and after the last talk nothing is highlighted either. The highlight keeps up with the clock while the page stays open.

## Acceptance criteria

- On `/`, when the current time is inside a slot of the conference day, that slot's time heading is followed by a visible "Now" label and the slot is visually highlighted.
- Only one slot is highlighted at a time; a slot is current from its start time (inclusive) until its end time (exclusive).
- Between slots, before the first slot, after the last slot, and on any date other than the conference date, no slot is highlighted.
- The highlight updates without a reload: the page re-evaluates the current time every 30 seconds.
- The highlighted slot is exposed to assistive technology, for example with `aria-current="time"` on the slot.
- `/talks/:id` is unchanged.
