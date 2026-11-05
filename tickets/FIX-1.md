---
id: FIX-1
title: Browser tab title never changes
type: fix
---

## Description

The browser tab always reads "Malagueta Conf 2026", whatever the page. On a talk page the tab should name the talk, so attendees with several talks open can tell them apart and the browser history reads sensibly. An unknown talk id should say so in the title too. Today the only title is the static one in `apps/agenda/index.html`, and nothing in the app updates it on navigation.

## Acceptance criteria

- On `/` the tab reads `Schedule · Malagueta Conf 2026`.
- On `/talks/:id` for a known talk the tab reads `<talk title> · Malagueta Conf 2026`.
- On `/talks/:id` for an unknown id the tab reads `Talk not found · Malagueta Conf 2026`.
- Navigating between pages without a reload updates the title every time, including the browser back button.
- The title is built by a pure function that takes the page name and the conference name, so the format lives in one place and is unit tested.
- No page flashes the static title before the right one on a client-side navigation.
