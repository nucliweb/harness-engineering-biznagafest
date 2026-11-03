# FEATURE-2 · Research

## Inventory

### core

- `packages/core/src/types.ts:17` `Talk` type with `id: string`, the value a stored favourite holds.
- `packages/core/src/index.ts:1-9` barrel: values re-exported by name on lines 1–8, types under `export type` on line 9.
- `packages/core/src/index.ts:1` exports `talks`, the seed list a stored id is matched against.
- `packages/core/src/resolveTalk.ts:4-10` `resolveTalk(catalog, talk)` returns `undefined` on a dangling reference; the only existing case of dropping a reference that does not resolve.
- `packages/core/src/findTalk.ts` lookup of a talk by id, used by `apps/agenda/src/pages/TalkPage.tsx:7`.
- `packages/core/src/resolveTrackParam.ts` maps an untrusted value to a safe one; the closest existing function to parsing input.
- `packages/core/src/data.test.ts:11` `has unique talk ids`; the only uniqueness check in the package, over seed data.
- `packages/core/CLAUDE.md:20` one function per file, named after the function.
- `packages/core/CLAUDE.md:24` tests are `foo.test.ts` with `describe('<functionName>')`, no mocks.
- `packages/core/CLAUDE.md:28` persistence formats are pure `serialise` and `parse` functions in core; storage belongs to the app.

### ui

- `packages/ui/src/TalkCard.tsx:6-10` `TalkCardProps` is `view`, `href`, `renderLink?`.
- `packages/ui/src/TalkCard.tsx:15-21` the card renders `TrackBadge`, the title and the meta line inside `<article>`.
- `packages/ui/src/TalkCard.tsx:17` only the title is a link.
- `packages/ui/src/TalkDetails.tsx:5-7` `TalkDetailsProps` is `view` only.
- `packages/ui/src/TalkDetails.tsx:12-28` the detail view renders track, title, time and room, abstract and speakers.
- `packages/ui/src/ScheduleList.tsx:6-11` `ScheduleListProps` is `slots`, `catalog`, `talkHref`, `renderLink?`.
- `packages/ui/src/ScheduleList.tsx:25` renders `TalkCard` with `view`, `href`, `renderLink`.
- `packages/ui/src/TrackFilter.tsx:3-6` `TrackFilterProps`; `onChange` receives a plain value. The only controlled input in the package.
- `packages/ui/src/TrackFilter.tsx:13` the handler unwraps the event into a plain value.
- `packages/ui/src/TrackBadge.tsx:4-8` small label component, the nearest visual marker.
- `packages/ui/src/TalkCard.module.css:1-9` the card is a flex column with `gap: var(--space-2)`.
- `packages/ui/src/tokens.css:3-12` colour tokens, dark overrides at lines 37–46; none for favourites.
- `packages/ui/src/index.ts:1-7` barrel with lines shaped `export { Name, type NameProps } from './Name';`.
- `packages/ui/src/TalkCard.test.tsx:25-47` three tests that render `TalkCard` with `view` and `href` only.
- `packages/ui/src/TalkDetails.test.tsx:22-34` two tests that render `TalkDetails` with `view` only.
- `packages/ui/src/ScheduleList.test.tsx:6-25` three tests that render `ScheduleList` with no favourite props.
- `packages/ui/src/TrackFilter.test.tsx:12-64` controlled-callback tests with `vi.fn()`, the pattern for a controlled toggle.

### agenda

- `apps/agenda/src/App.tsx:11-13` routes `/`, `/talks/:id`, `*`; `App` renders `Routes` inside `Layout` and holds no state.
- `apps/agenda/src/pages/SchedulePage.tsx:6-15` state in URL search params; `onTrackChange` writes `track`.
- `apps/agenda/src/pages/SchedulePage.tsx:21` renders `ScheduleList`.
- `apps/agenda/src/pages/TalkPage.tsx:7-8` `findTalk` then `resolveTalk`.
- `apps/agenda/src/pages/TalkPage.tsx:15` renders `TalkDetails` or `Talk not found.`.
- `apps/agenda/src/routerLink.tsx:4-8` a small adapter in its own file.
- `apps/agenda/src/main.tsx:11` renders `App` inside `StrictMode`.
- `apps/agenda/src/App.test.tsx:8-19` `LocationOutput` and `renderAt(path)` with `MemoryRouter`.
- `apps/agenda/src/App.test.tsx:41-48` navigation test with `userEvent.setup()`.
- `apps/agenda/CLAUDE.md:9` adapters live in small files of their own.
- `apps/agenda/CLAUDE.md:10` app hooks live in `src/hooks/use<Name>.ts` and connect an adapter to a pure core function.
- `apps/agenda/CLAUDE.md:17` raw `localStorage` calls are wrapped once in an adapter so tests can pass a fake.
- `vitest.config.ts:25-34` project `app` runs in `jsdom`.

## Existing patterns

- One function per file in core, with a sibling `.test.ts` and a named re-export in `index.ts`.
- ui components are typed, stateless, styled by one CSS module with tokens, and exported beside their props type.
- Controlled ui inputs take a value and an `onX` callback that receives a plain value.
- A required prop added to a ui component is seen by every test that renders it, because tests are typechecked with the package.
- agenda page tests use `renderAt(path)`, `userEvent.setup()` and role queries.

## Gaps

- No function in core parses or serialises anything.
- No function in core removes duplicates from a list.
- No toggle button, `aria-pressed`, `type="button"` or favourite marker exists in `packages/ui/src`.
- `ScheduleList`, `TalkCard` and `TalkDetails` take no favourite state or callback.
- No `localStorage` use exists in `apps/agenda/src`; no storage adapter exists.
- No `apps/agenda/src/hooks/` directory exists.
- No state is shared between routes; `App` holds none.
- `specs/lessons.json` does not exist, so no lessons apply.
