# Controlled Run Mode

## Purpose

Controlled Run Mode records an approved simulated run. In v1 it must never click
or submit a real Optibus Run control.

## Entry criteria

- Run Readiness Mode completed.
- Approval Gate received a typed token matching
  `APPROVE:ControlledRunMode:Run`.
- Human reviewer accepted documented assumptions and risks.

## Allowed actions in v1

- Log the simulated run intent.
- Capture screenshots before and after the simulated run step.
- Record scenario parameters from YAML.
- Transition to Post-Run Comparison using provided or previously captured data.

## Forbidden actions in v1

- Clicking Run.
- Clicking Save, Apply, Publish, Delete, Export, Import, Duplicate, or Create
  Version.
- Submitting forms that mutate Optibus state.
- Treating simulated output as a real Optibus run result.

## Major steps

1. Capture pre-simulation screenshot.
2. Validate approval token format and current workflow state.
3. Log the simulated run event with scenario name and reason.
4. Capture post-simulation screenshot.
5. Prepare comparison inputs.

## Outputs

- Simulated run log entry.
- Screenshots around the simulated run step.
- Comparison-ready scenario metadata.

## Exit criteria

- No real run has occurred.
- The simulation is clearly labeled as simulated in logs and reports.
- Post-Run Comparison can compare baseline data to declared scenario outputs.
