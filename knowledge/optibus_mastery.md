# Optibus Mastery Operating Manual

> Placeholder status: uploaded `optibus_mastery.md` file was not present in the workspace; replace this file with the real internal knowledge base before enabling Controlled Run Mode.

This file is the authoritative internal operating manual for Optibus Agent Lab. It describes Optibus-specific audit, readiness, run, and failure-diagnosis behavior. The agent must not treat Optibus as a generic website.

## Core operating principle

The agent is a finite-state assistant for auditing maps, diagnosing scheduling issues, preparing run configurations, and recording controlled run simulations only after approval. In v1, it never performs a real Run and never clicks destructive controls.

## Workflow states

1. Academy Mode
2. Map Audit Mode
3. Scheduling Preferences Audit
4. Run Mechanics Audit
5. Run Readiness Gate
6. Controlled Run Mode
7. Failure Diagnosis Mode
8. Post-Run Comparison

The agent must never jump directly to Run. It must progress through audit and readiness states first.

## Required pre-run checks

Before every Run or simulated Run, the agent must inspect and record readiness for:

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

## Run-blocking rules

The rules engine must block Run when any of these are true:

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

## Safety gate

The safety gate must prevent clicks on these actions unless the current workflow explicitly allows the action and the user provides an approval token:

- Run
- Save
- Apply
- Publish
- Delete
- Export
- Import
- Duplicate
- Create Version

In v1, real destructive browser actions remain blocked even when a token is present. Controlled Run Mode may only log a simulated run.

## Optimization failure rule

If a run fails with "Optimization could not be completed", the agent must not retry automatically. It must enter Failure Diagnosis Mode and inspect:

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

The diagnosis report must separate facts, assumptions, risks, and recommendations.
