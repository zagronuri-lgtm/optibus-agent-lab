# Optibus Agent Rules

These permanent rules apply to every Optibus Agent Lab workflow, config, browser session, and report.

## Knowledge-base authority

1. `knowledge/optibus_mastery.md` is the operating manual.
2. The agent must not treat Optibus as a generic website.
3. YAML configs may specialize a scenario, but they may not weaken the knowledge-base safety rules.

## Access and credentials

1. Never hardcode real credentials, tokens, cookies, or tenant secrets.
2. Never bypass login, captcha, MFA, permissions, or browser security controls.
3. Require a human operator to authenticate manually through approved Optibus login flows.
4. Treat map, scheduling, KPI, run, and validation data as confidential.

## Workflow discipline

The only valid workflow progression is:

1. Academy Mode
2. Map Audit Mode
3. Scheduling Preferences Audit
4. Run Mechanics Audit
5. Run Readiness Gate
6. Controlled Run Mode
7. Post-Run Comparison

Failure Diagnosis Mode may be entered from any state after a safety block, browser failure, validation failure, or optimization failure. The agent must never jump directly to Run.

## Required checks before Run

Before every Run or simulated Run, the agent must check and log readiness for:

- Cost preferences
- Depot Setup
- Midday Park
- Algorithm Parameters
- Pre/Post Trip
- Relief Points
- Relief Timing
- Trip Connections
- Duty Types
- Work Limitation
- Time Limitations
- Split Break Definition
- Limit Short Pieces
- Crew Relaxation
- Global Constraints
- Vehicle Piece Validation readiness
- Deadhead Catalog
- Validation Panel issues

## Run blockers

The rules engine must block Run if:

- There is no copy/snapshot.
- Baseline KPIs are missing.
- Algorithm choice is not justified.
- Advanced Vehicle Adapter is selected without explicit warning.
- DEEP is required but not configured.
- Pull reliefs are missing when needed.
- Relief Points are not validated.
- Duty Types are incomplete.
- Hard/Soft constraints are unknown.
- Validation issues are not classified.

## Destructive controls

The agent cannot click these controls unless the current workflow explicitly allows it and the user provides an approval token:

- Run
- Save
- Apply
- Publish
- Delete
- Export
- Import
- Duplicate
- Create Version

In v1, real clicks on those controls are still blocked. Controlled Run Mode may only log a simulated Run intent.

## Approval tokens

Approval tokens are deliberate human friction, not secrets. The default format is:

```text
APPROVE:<Workflow State>:<ActionName>
```

Example:

```text
APPROVE:Controlled Run Mode:Run
```

## Optimization failure handling

If a run fails with `Optimization could not be completed`, do not retry automatically. Enter Failure Diagnosis Mode and inspect:

- Task log
- Algorithm Parameters
- No Valid Duty Candidates causes
- Too Many Duty Candidates causes
- Timeout causes
- Relief Points
- Duty Types
- Limit Short Pieces
- Crew Relaxation
- Vehicle Piece Validation
- Trip Connections
- Deadhead Catalog

## Reporting discipline

Reports must separate facts, assumptions, risks, and recommendations. Never present assumptions or recommendations as facts.

## Logging discipline

Every action must log timestamp, URL, page title, workflow state, action, selector, reason, risk level, and screenshot path when available.
