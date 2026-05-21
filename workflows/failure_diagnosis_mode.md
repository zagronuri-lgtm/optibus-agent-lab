# Failure Diagnosis Mode

## Purpose

Diagnose safety blocks, readiness failures, browser failures, validation failures, and optimization failures without retrying unsafe actions.

## Special optimization failure rule

If a run fails with `Optimization could not be completed`, do not retry automatically. Inspect:

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

## Exit criteria

- Failure facts, assumptions, risks, and recommendations are documented.
- The workflow stops unless a human starts a new safe workflow.
