# Optibus Agent Lab

Optibus Agent Lab is an internal, safety-first browser-agent framework for
auditing Optibus maps and preparing controlled run reviews. It is built around a
finite-state workflow, explicit approval gates, Playwright browser automation,
Markdown/YAML configuration, local file logging, and report templates that keep
facts separate from assumptions, risks, and recommendations.

This v1 scaffold is intentionally read-only for real Optibus operations:

- It must not bypass login, captcha, permissions, or any security control.
- It must not hardcode credentials.
- It must not perform real `Run`, `Save`, `Apply`, `Publish`, `Delete`,
  `Export`, `Import`, `Duplicate`, or `Create Version` actions.
- Any controlled-run behavior is simulated and logged only.

## Repository layout

```text
AGENT_RULES.md                 Permanent safety rules
configs/                       Example YAML scenarios
reports/                       Markdown report templates
src/                           TypeScript framework modules
workflows/                     Human-readable workflow definitions
logs/                          Local JSONL action logs, ignored by git
artifacts/screenshots/         Local screenshots, ignored by git
```

## Setup

```bash
npm install
npm run typecheck
```

Run the scaffold in planning mode with an example config:

```bash
npm run demo
```

The demo does not log into Optibus and does not execute browser actions against
real tenant data. Real browser use requires an operator to authenticate manually
through normal Optibus controls.

## Safety model

The agent progresses through a finite-state workflow:

1. Academy Mode
2. Map Audit Mode
3. Run Readiness Mode
4. Approval Gate
5. Controlled Run Mode
6. Post-Run Comparison
7. Failure Diagnosis Mode

Browser actions flow through `SafetyGate` before Playwright receives them. The
gate detects destructive intent from action names, selectors, labels, and
reasons. In v1, destructive actions are blocked even if an approval token is
provided. The only supported controlled-run behavior is a simulated run event
that records what would have happened.

Every browser action is logged locally with:

- timestamp
- workflow state
- URL
- page title
- action
- selector
- reason
- outcome

Major workflow steps save before and after screenshots. Generated reports use
separate sections for facts, assumptions, risks, and recommendations so that
audit evidence remains distinguishable from interpretation.

## Configuration

YAML scenario files describe the target map, read-only KPI selectors, readiness
checks, comparison inputs, and required approval tokens. The included examples
use placeholder URLs and selectors only:

- `configs/holon_baseline.yaml`
- `configs/run_A_driver_only.yaml`
- `configs/run_B_vehicle_driver.yaml`

Do not store secrets in YAML. Credentials must be supplied manually through the
normal browser login flow.
