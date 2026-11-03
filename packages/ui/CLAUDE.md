# @agenda/ui

Presentational React components and CSS tokens. It renders what it is given and reports what the user did.

## Belongs here

- Components in `src/<Name>.tsx` with `src/<Name>.module.css` beside them.
- Design tokens in `src/tokens.css` (colour, spacing, radius, type scale as CSS variables). Components use `var(--token)`, never raw colours or pixel values.
- Prop types exported next to each component (`TalkCardProps`).

## Never here

- Routing (`react-router`), `window`, `localStorage`, `fetch`, `Date`. If a component needs a link, it takes `href` and an optional `renderLink`; if it needs "now" or stored state, it takes a prop.
- Business rules (filtering, sorting, grouping). Components receive data already prepared by `core`. If you are writing an `if` about talks, it belongs in core.
- Imports from `@agenda/app`. Only `@agenda/core` is allowed, mostly for types and small formatters.

## Conventions

- One component per file, PascalCase file name equal to the component name. Named exports only, re-exported from `src/index.ts` with its props type.
- Function components with a typed `Props` object. State only for purely visual concerns.
- Callbacks are named `onX` (`onSelect`, `onChange`) and receive plain values, not events.
- Accessibility first: semantic elements, labels, visible focus. Tests query by role and name.
- Tests: `Name.test.tsx` next to the component, Vitest + Testing Library, `describe('<Name>')`, assert on what the user sees, never on class names.

## How a feature lands here

Add tokens if needed, then a failing render test, then the component, then export it. Controlled components only: the app owns the state and passes `value` and `onChange`. Style with the CSS module and tokens.
