# DEMO-1 · Plan

## Scope check

| files touched | lines estimated | layers touched | new exported symbols |
|---|---|---|---|
| 4 | 120 | core, ui, agenda | 2 |

Verdict: Single PR

## Interfaces

### core
```ts
export function filterTalksByTrack(talks: Talk[], track: string | null): Talk[];
```

### agenda
- None

## Steps

### core
- [ ] S1 `packages/core/src/talks.ts` — add filterTalksByTrack returning all talks when track is null
- [ ] S2 `packages/core/src/talks.test.ts` — test filtering by track and the null case

### ui
- [ ] S3 `packages/ui/src/TrackFilter.tsx` — render a select with an "All" option, call onChange

### agenda
- [ ] S4 `apps/agenda/src/pages/SchedulePage.tsx` — hold the selected track in state and pass the filtered list down

## Definition of done

### core
- WHEN the track is null THE core SHALL return every talk
- WHEN a track is given THE core SHALL return only talks of that track

### ui
- WHEN the user picks a track THE ui SHALL call onChange with that track

### agenda
- WHEN the user picks a track THE agenda SHALL show only talks of that track

## Audit
Blocking: 0 · Recommendations: 1 · Iterations: 2
