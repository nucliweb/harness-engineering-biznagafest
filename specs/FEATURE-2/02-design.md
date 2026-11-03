# FEATURE-2 · Design

## Alternatives

### A1 Hook in App, props down to the pages, one shared ui control

Core exports `parseFavourites` and `serialiseFavourites`. ui exports one controlled `FavouriteControl`, which renders the marker and the toggle, and `TalkCard` and `TalkDetails` both use it. agenda adds a `favouritesStorage` adapter and a `useFavourites` hook, calls the hook once in `App`, and passes the ids and the toggle callback to both pages as props.

- Pros: one source of truth above the routes, so a toggle is visible on the other route with no second read of storage; the toggle markup and its accessible names live in one file; `App` is the anchor the clarification already names; the pages stay composition.
- Cons: two page signatures gain props; `App` gains its first state.

### A2 Hook in each page, no shared state

`SchedulePage` and `TalkPage` each call `useFavourites`. Routes unmount on navigation, so the next page reads storage again on mount.

- Pros: `App.tsx` does not change, one file fewer; the page owns its state, as `apps/agenda/CLAUDE.md` describes.
- Cons: the second route is correct only because of when the router unmounts a page; storage is parsed once per navigation; the source of truth becomes storage, not state.

### A3 Context provider read directly by the pages

A `FavouritesProvider` wraps the routes and a `useFavourites` hook reads the context.

- Pros: no props on the pages; later consumers need no wiring.
- Cons: one more file and one more exported symbol for two consumers; a page rendered without the provider needs a default or a throw; no context exists in the app today.

### A4 Inline toggle in TalkCard and TalkDetails, no shared ui component

Each ui component writes its own marker and button.

- Pros: no new ui component, no new export.
- Cons: the accessible names, `aria-pressed` and the marker text are written twice and tested twice, and they can drift; saves four files but still leaves the ticket above every Gate B threshold.

Chosen: A1.

## Decisions

- D1 Core exports `parseFavourites(raw: string | null, talks: readonly Talk[]): string[]` in `packages/core/src/parseFavourites.ts`; it returns `[]` for `null`, for text that is not valid JSON and for JSON that is not an array, and otherwise returns the string entries that equal the `id` of a talk, duplicates removed, first occurrence kept, stored order preserved. Status: closed.
- D2 `parseFavourites` catches the `JSON.parse` error inside the function and never throws. Status: closed.
- D3 Core exports `serialiseFavourites(ids: readonly string[]): string` in `packages/core/src/serialiseFavourites.ts`; it returns `JSON.stringify(ids)`, so an empty list is `[]`. Status: closed.
- D4 ui exports `FavouriteControl` with props `isFavourite: boolean` and `onToggle: () => void`; it renders a wrapper with the text `Favourite` in a `span` when `isFavourite` is true, followed by a `<button type="button">`. Status: closed.
- D5 The button text is its accessible name: `Remove from favourites` when `isFavourite` is true and `Add to favourites` when it is false, verbatim, with no talk title; `aria-pressed` equals `isFavourite`. Status: closed.
- D6 `TalkCard` gains required props `isFavourite: boolean` and `onToggleFavourite: () => void`, and renders `FavouriteControl` after the meta line, outside the `h3`. Status: closed.
- D7 `TalkDetails` gains the same two required props and renders `FavouriteControl` after the meta line. Status: closed.
- D8 `ScheduleList` gains required props `favouriteIds: readonly string[]` and `onToggleFavourite: (talkId: string) => void`; for each talk it passes `isFavourite={favouriteIds.includes(talk.id)}` and `onToggleFavourite={() => onToggleFavourite(talk.id)}`. Status: closed.
- D9 agenda exports `favouritesStorage` from `apps/agenda/src/favouritesStorage.ts`, an object with `read(): string | null` and `write(value: string): void`; it is the only file that names the key `agenda:favourites` or calls `localStorage`, and it adds no error handling, because failures of the storage API are out of scope. Status: closed.
- D10 agenda exports `useFavourites(storage = favouritesStorage)` from `apps/agenda/src/hooks/useFavourites.ts`, returning `{ favouriteIds, toggleFavourite }`; state starts from a lazy `useState` initialiser `() => parseFavourites(storage.read(), talks)`, and nothing runs on mount, so loading writes nothing. Status: closed.
- D11 `toggleFavourite(id)` computes the next list from the current state, removing `id` when present and appending it otherwise, then calls the state setter and `storage.write(serialiseFavourites(next))` in the event handler, not in an effect and not in a state updater, so `StrictMode` cannot write twice. Status: closed.
- D12 The add-or-remove transition stays in `useFavourites`, because `00-clarification.md` lists what core holds and this transition treats ids as opaque values. Status: closed.
- D13 `App` calls `useFavourites()` once and passes `favouriteIds` and `onToggleFavourite` to `SchedulePage` and `TalkPage`, so state survives client-side navigation. Status: closed.
- D14 `SchedulePage` passes both props to `ScheduleList`. Its track filter code is untouched. Status: closed.
- D15 `TalkPage` passes `isFavourite={favouriteIds.includes(view.talk.id)}` and `onToggleFavourite={() => onToggleFavourite(view.talk.id)}` to `TalkDetails`; the `Talk not found.` branch is untouched. Status: closed.
- D16 Page-level tests run against the jsdom `localStorage` with `localStorage.clear()` in `beforeEach`, and drive the feature with user events. Status: closed.
- D17 `FavouriteControl.module.css` styles the control with tokens only; no new token is added. Status: closed.

## Layer assignment

| change | layer | file |
|---|---|---|
| `parseFavourites` pure function | core | `packages/core/src/parseFavourites.ts` |
| tests for `parseFavourites` | core | `packages/core/src/parseFavourites.test.ts` |
| `serialiseFavourites` pure function | core | `packages/core/src/serialiseFavourites.ts` |
| tests for `serialiseFavourites` | core | `packages/core/src/serialiseFavourites.test.ts` |
| re-export the two functions | core | `packages/core/src/index.ts` |
| `FavouriteControl` component and props type | ui | `packages/ui/src/FavouriteControl.tsx` |
| styles for `FavouriteControl` | ui | `packages/ui/src/FavouriteControl.module.css` |
| tests for `FavouriteControl` | ui | `packages/ui/src/FavouriteControl.test.tsx` |
| render the control in the card | ui | `packages/ui/src/TalkCard.tsx` |
| card tests, new required props in existing renders | ui | `packages/ui/src/TalkCard.test.tsx` |
| render the control in the detail view | ui | `packages/ui/src/TalkDetails.tsx` |
| detail tests, new required props in existing renders | ui | `packages/ui/src/TalkDetails.test.tsx` |
| thread ids and callback to the card | ui | `packages/ui/src/ScheduleList.tsx` |
| list tests, new required props in existing renders | ui | `packages/ui/src/ScheduleList.test.tsx` |
| re-export `FavouriteControl` and its props type | ui | `packages/ui/src/index.ts` |
| `localStorage` adapter owning the key | agenda | `apps/agenda/src/favouritesStorage.ts` |
| tests for the adapter | agenda | `apps/agenda/src/favouritesStorage.test.ts` |
| `useFavourites` hook | agenda | `apps/agenda/src/hooks/useFavourites.ts` |
| call the hook, pass state to the pages | agenda | `apps/agenda/src/App.tsx` |
| pass state to `ScheduleList` | agenda | `apps/agenda/src/pages/SchedulePage.tsx` |
| pass state to `TalkDetails` | agenda | `apps/agenda/src/pages/TalkPage.tsx` |
| page-level favourites tests with user events | agenda | `apps/agenda/src/App.test.tsx` |

## Risks

- The state-dependent name plus `aria-pressed` announces the state twice. Accepted: the clarification requires both.
- A case-insensitive or partial query for the marker text would also match the button labels. Tests use exact `getByText('Favourite')`, which matches only the marker.
- Newer Node releases ship their own global `localStorage`, which could interfere with the jsdom one in the `app` test project. The page tests in D16 surface this at once, and `favouritesStorage` is the single place to adjust.
- D12 leaves a small list transition in a hook, next to the `apps/agenda/CLAUDE.md` rule against business rules in hooks. Accepted, and recorded so a reviewer does not reopen it.
