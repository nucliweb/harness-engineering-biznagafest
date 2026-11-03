# DEMO-1 · Design

## Alternatives

### A1 Filter in core
- Pros: pure and testable, reused by any page
- Cons: one more exported function

### A2 Filter inside the page
- Pros: fewer files
- Cons: logic mixed with composition, harder to test

## Decisions
- D1 Filtering lives in core as a pure function. Status: closed.
- D2 The page owns the selected track in component state. Status: open.

## Layer assignment

| change | layer | file |
|---|---|---|
| filterTalksByTrack | core | packages/core/src/talks.ts |
| TrackFilter | ui | packages/ui/src/TrackFilter.tsx |
| SchedulePage wiring | agenda | apps/agenda/src/pages/SchedulePage.tsx |

## Risks
- None
