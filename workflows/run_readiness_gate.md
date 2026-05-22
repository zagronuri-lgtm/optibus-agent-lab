# Run Readiness Gate

## Purpose

Apply the rules engine before Controlled Run Mode. The agent must never jump directly to Run.

## Blocking conditions

Run is blocked if any of the following are true:

- No copy/snapshot exists.
- Baseline KPIs are missing.
- Algorithm choice is not justified.
- Advanced Vehicle Adapter is selected without explicit warning.
- DEEP is required but not configured.
- Pull reliefs are missing when needed.
- Relief Points are not validated.
- Duty Types are incomplete.
- Hard/Soft constraints are unknown.
- Validation issues are not classified.

## Exit criteria

- A Run Readiness Report is generated.
- Controlled Run Mode is available only when all blockers are cleared and a typed approval token is supplied.
