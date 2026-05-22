# AGENTS.md

## Cursor Cloud specific instructions

### Overview

Optibus Agent Lab is a TypeScript CLI agent framework (no server/UI). It audits Optibus transit scheduling configurations via plan-only mode and optional Playwright browser automation. No databases, Docker, or background services needed.

### Key commands

All commands are defined in `package.json` scripts. The most important ones:

| Command | Purpose |
|---|---|
| `npm run typecheck` | Type-check (also aliased as `npm test`) |
| `npm run test:demo` | Run the automated readiness test suite (47 assertions) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run demo` | Plan-only audit of Holon baseline config (no browser) |
| `npm run doctor` | Validate knowledge base and safety gate health |
| `npm run analyze:exports:demo` | Run Excel export analysis with demo fixtures |

### Non-obvious notes

- **No ESLint/Prettier**: The project uses `tsc --noEmit` as its only lint/check command. `npm test` is aliased to `npm run typecheck`.
- **Browser mode is optional**: Most workflows run plan-only without Playwright. Browser mode (`--browser --headed`) requires manual operator login; the agent never handles credentials.
- **Demo mode is self-contained**: `npm run demo` and `npm run analyze:exports:demo` generate output in `reports/generated/` and `logs/` using built-in fixture data — no external files or services needed.
- **Generated files**: Running demos creates files in `reports/generated/` and `logs/`. These are gitignored.
- **tsconfig `include` scope**: Only `src/**/*.ts` is included in the TypeScript project. Tests under `tests/` are run directly via `tsx` and are not type-checked by `tsc --noEmit`.
