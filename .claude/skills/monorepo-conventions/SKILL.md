---
name: monorepo-conventions
description: Layer rules, implementation order, per-package CLAUDE.md files and root commands of this monorepo. Load before planning, implementing, reviewing or validating any change.
user-invocable: false
---

# Monorepo conventions

Three layers. Dependencies point one way only, and ESLint fails the build when they do not.

```
apps/agenda  ->  packages/ui  ->  packages/core
apps/agenda  ->  packages/core
```

## Layers

| Layer | Folder | Package | May import | Owns | Never |
|---|---|---|---|---|---|
| core | `packages/core` | `@agenda/core` | nothing from the workspace | domain types, pure functions | `react`, `window`, `fetch`, any I/O |
| ui | `packages/ui` | `@agenda/ui` | `@agenda/core` | presentational components, CSS tokens | routing, storage, domain logic |
| agenda | `apps/agenda` | `@agenda/app` | `@agenda/ui`, `@agenda/core` | routing, storage adapters, page composition | logic that belongs in core |

- Tests live next to the file they test: `foo.ts` and `foo.test.ts`.
- Implementation order inside a ticket is always `core -> ui -> agenda`.
- ui components receive data through props. If a component needs to filter, sort or compute, that function belongs in core.

## Per-layer conventions

Each package has its own `CLAUDE.md`. Read the one for the layer you touch, and only that one:

| Layer | File |
|---|---|
| core | `packages/core/CLAUDE.md` |
| ui | `packages/ui/CLAUDE.md` |
| agenda | `apps/agenda/CLAUDE.md` |

When delegating to a subagent, paste the content of the layer's `CLAUDE.md` into its prompt. Subagents start with a clean context.

## Commands

Root scripts. Each exits non-zero on failure.

| Command | Does |
|---|---|
| `pnpm lint` | ESLint over every package, including the layer boundary rules |
| `pnpm lint:file <abs path>` | ESLint over one file |
| `pnpm typecheck` | `tsc --noEmit` per package |
| `pnpm test` | Vitest for all packages, then `node --test` for `.claude/scripts` |
| `pnpm build` | Vite build of the app |
| `pnpm dev` | Vite dev server |

Scoped to one layer, for the developer and reviewer agents:

| Layer | Typecheck | Test |
|---|---|---|
| core | `pnpm --filter @agenda/core typecheck` | `pnpm exec vitest run --project core` |
| ui | `pnpm --filter @agenda/ui typecheck` | `pnpm exec vitest run --project ui` |
| agenda | `pnpm --filter @agenda/app typecheck` | `pnpm exec vitest run --project app` |

## The boundary rule the hook enforces

After every `Edit` or `Write` on a `.ts` or `.tsx` file, the `PostToolUse` hook `.claude/hooks/post-edit-eslint.sh` runs `pnpm lint:file <path>`. An import that goes against the arrows above (for example `packages/ui` importing from `apps/agenda`, or `packages/core` importing `react`) comes back as ESLint output on that same tool call, with a message that starts with `Layer rule:`. Fix it immediately by moving the code to the right layer. Never silence it with `eslint-disable`; a suppression is reported in `04-dod.md` and a person decides whether it blocks.

## Shell commands

One plain command per Bash call: no redirection, no pipe, no `;` or `&&` chain, no shell variables, no `cd`. The permission allowlist matches the command prefix, so `node .claude/scripts/validate-plan.mjs specs/X/03-plan.md; echo $?` is denied while the bare `node ...` command runs. The tool result already carries the exit status and the output.
