# Failure Diagnosis Mode

## Purpose

Failure Diagnosis Mode explains why an audit, readiness check, approval gate, or
simulated run step failed without taking recovery actions that could mutate
Optibus data.

## Entry criteria

- A workflow step failed, was blocked by the safety gate, or produced ambiguous
  evidence.
- The agent has captured the latest available screenshot and log entry.

## Allowed actions

- Read page state and visible error messages.
- Capture additional screenshots.
- Classify failures as safety, access, selector, data-quality, or configuration
  issues.
- Recommend human follow-up.

## Forbidden actions

- Clicking destructive controls to retry.
- Changing map data to resolve a readiness failure.
- Bypassing login, captcha, permissions, or security controls.
- Hiding or overwriting earlier failure evidence.

## Major steps

1. Capture failure screenshot.
2. Record current URL, title, workflow state, and failed action.
3. Classify the failure.
4. Separate known facts from assumptions.
5. List risks created by the failure.
6. Recommend safe next steps.

## Failure classes

- Safety gate block.
- Manual authentication required.
- Permission denied.
- Missing or changed selector.
- Baseline KPI unavailable.
- Scenario configuration incomplete.
- Ambiguous UI state.
- Browser or network error.

## Outputs

- Failure diagnosis report.
- Evidence links to screenshots and log entries.
- Recommendations for human review.

## Exit criteria

- The diagnosis is documented.
- The workflow stops unless a human explicitly starts a new safe workflow.
