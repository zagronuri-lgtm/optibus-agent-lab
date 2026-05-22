# Controlled Run Mode

## Purpose

Record an approved simulated run. In v1 the agent never clicks a real Optibus Run control.

## Entry criteria

- Academy Mode, Map Audit Mode, Scheduling Preferences Audit, Run Mechanics Audit, and Run Readiness Gate are complete.
- The rules engine reports no blockers.
- A human provided `APPROVE:Controlled Run Mode:Run`.

## Allowed in v1

- Log simulated run intent.
- Capture screenshots before and after simulation.
- Generate run readiness and post-run comparison reports from supplied data.

## Forbidden in v1

- Clicking Run.
- Clicking Save, Apply, Publish, Delete, Export, Import, Duplicate, or Create Version.
- Treating simulated output as a real Optibus run result.
