# Map Audit Mode

## Purpose

Map Audit Mode collects read-only evidence about an Optibus map and its baseline
KPIs. It must not change the map.

## Entry criteria

- Academy Mode is complete or waived by a human reviewer.
- Target map and read-only KPI selectors are listed in YAML config.
- Operator has completed normal login if protected pages are required.

## Allowed actions

- Navigate to read-only map pages.
- Extract text from configured KPI selectors.
- Capture screenshots before and after audit sections.
- Record missing selectors as risks.

## Forbidden actions

- Any destructive or mutating action.
- Any workflow transition directly to Controlled Run Mode.
- Any attempt to infer hidden data by bypassing permissions.

## Major steps

1. Capture pre-audit screenshot.
2. Confirm current URL and page title.
3. Collect configured map identifiers.
4. Collect configured KPI values.
5. Collect visible warnings and validation messages.
6. Save post-audit screenshot.
7. Generate baseline report content.

## Outputs

- Baseline KPI records.
- Missing or ambiguous KPI issue list.
- Facts, assumptions, risks, and recommendations for human review.

## Exit criteria

- Baseline observations are logged.
- All missing evidence is identified as a risk.
- Run Readiness Mode can evaluate whether simulation is appropriate.
