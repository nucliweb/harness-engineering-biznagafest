# Malagueta Agenda

Demo repository for a conference talk about Claude Code harnesses. The app is a deliberately boring conference agenda for a fictional event; the point is the harness around it (`.claude/`), not the app. Contracts for names, formats and schemas live in `docs/contracts.md`; layer conventions live in `.claude/skills/monorepo-conventions` and in each package's `CLAUDE.md`.

## Commands

Run from the repo root. Every one exits non-zero on failure.

| Command | Does |
|---|---|
| `pnpm lint` | ESLint over everything, including the layer boundary rules |
| `pnpm lint:file <path>` | ESLint on one file (absolute or relative path) |
| `pnpm typecheck` | `tsc --noEmit` in every package |
| `pnpm test` | Vitest for all packages, then `node --test` for `.claude/**/*.test.mjs` |
| `pnpm build` | Vite build of `apps/agenda` |
| `pnpm dev` | Vite dev server for `apps/agenda` |

## Layers

```
apps/agenda (@agenda/app)  ->  packages/ui (@agenda/ui)  ->  packages/core (@agenda/core)
apps/agenda                ->  packages/core
```

- `core`: domain types and pure functions. No React, no DOM, no I/O, no workspace imports.
- `ui`: presentational components and CSS tokens. Imports `core` only. No routing, no storage.
- `agenda`: routing, storage adapters, page composition. Imports `ui` and `core` by package name.
- Nothing imports upwards. ESLint enforces it with `no-restricted-imports`; the rule fails `pnpm lint` and `pnpm lint:file`.
- Tests live next to the file: `foo.ts` and `foo.test.ts`.

Implementation order inside any change is `core -> ui -> agenda`. Read the `CLAUDE.md` of a package before editing it.
