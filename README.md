# Optibus Agent Lab

Optibus Agent Lab is a safe internal TypeScript + Playwright framework for auditing Optibus maps, diagnosing scheduling issues, preparing run configurations, and recording controlled run simulations after approval.

The agent is governed by `knowledge/optibus_mastery.md`, which is treated as the authoritative Optibus operating manual. Workflow code and YAML configs are subordinate to that knowledge base.

## Safety posture

v1 is read-only for real Optibus browser actions:

- Do not hardcode real credentials.
- Do not bypass login, captcha, MFA, permissions, or security controls.
- Do not click real `Run`, `Save`, `Apply`, `Publish`, `Delete`, `Export`, `Import`, `Duplicate`, or `Create Version` controls.
- Controlled Run Mode simulates Run by logging intent only.
- Every potentially destructive action requires a typed approval token and must still pass the rules engine.

## Project structure

```text
README.md
AGENT_RULES.md
KNOWLEDGE_BASE.md
knowledge/optibus_mastery.md
workflows/
configs/
src/
reports/
logs/                 local JSONL action logs, ignored except .gitkeep
screenshots/          local screenshots, ignored except .gitkeep
```

## Workflow states

1. Academy Mode
2. Map Audit Mode
3. Scheduling Preferences Audit
4. Run Mechanics Audit
5. Run Readiness Gate
6. Controlled Run Mode
7. Failure Diagnosis Mode
8. Post-Run Comparison

The agent must never jump directly to Run. Before every simulated Run it must verify Optibus-specific readiness across cost preferences, depot setup, midday park, algorithm parameters, pre/post trip, reliefs, trip connections, duty/work/time limitations, split breaks, short pieces, crew relaxation, global constraints, vehicle piece validation, deadhead catalog, and validation panel issues.

## Setup

```bash
npm install
npm run typecheck
npm run demo
```

`npm run demo` runs plan-only mode against `configs/holon_baseline.yaml`. It does not launch a browser, log in, or touch Optibus.

## Optional browser mode

Browser mode is intended for operator-supervised read-only audits after manual login through normal Optibus controls:

```bash
npm start -- --config configs/holon_baseline.yaml --browser --headed
```

Do not provide credentials to the agent. The operator must authenticate manually.

## Logging

Every browser or workflow action is logged locally with:

- timestamp
- URL
- page title
- workflow state
- action
- selector
- reason
- risk level
- screenshot path when applicable

Major workflow steps capture before/after screenshots in `screenshots/`.

## Run readiness

The rules engine blocks Run when there is no copy/snapshot, baseline KPIs are missing, algorithm choice is unjustified, Advanced Vehicle Adapter is selected without explicit warning, DEEP is required but not configured, pull reliefs are missing when needed, Relief Points are not validated, Duty Types are incomplete, hard/soft constraints are unknown, or validation issues are not classified.

If a run fails with `Optimization could not be completed`, the agent must not retry automatically. It enters Failure Diagnosis Mode and inspects task log, algorithm parameters, candidate causes, timeout causes, relief points, duty types, short pieces, crew relaxation, vehicle piece validation, trip connections, and deadhead catalog.
