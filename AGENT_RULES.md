# Optibus Agent Permanent Rules

These rules apply to every Optibus Agent Lab workflow, configuration, browser
session, and report.

## Security and access

1. Never hardcode real credentials, tokens, cookies, or tenant secrets.
2. Never bypass login, captcha, MFA, permissions, network controls, or browser
   security warnings.
3. Require a human operator to authenticate manually through approved Optibus
   login flows.
4. Treat all tenant, map, schedule, and run data as confidential.

## Destructive-action restrictions

The agent must never click or submit controls matching these actions unless a
future workflow version explicitly allows that action in the current state:

- Save
- Apply
- Publish
- Delete
- Export
- Import
- Duplicate
- Create Version
- Run

In v1, real `Run` remains forbidden. Controlled Run Mode only records a
simulation of the intended run.

## Approval gates

1. Every potentially destructive action requires a typed approval token.
2. Approval tokens are not secrets; they are deliberate friction that confirms a
   human reviewed the state, action, and reason.
3. A token must match the expected format for the current state and action:
   `APPROVE:<WorkflowState>:<ActionName>`.
4. Missing, malformed, stale, or mismatched tokens must block the action.
5. Blocking an action is itself an auditable event and must be logged.

## Browser automation

1. All Playwright actions must go through the framework safety gate.
2. Do not call `page.click`, `page.fill`, or equivalent Playwright mutators
   directly from workflow code.
3. Log every browser action with timestamp, workflow state, URL, page title,
   action, selector, reason, and outcome.
4. Save screenshots before and after every major workflow step.
5. Prefer read-only selectors, text extraction, and screenshots over mutation.

## Reporting discipline

Reports must keep these categories separate:

- Facts: observed page state, extracted KPIs, timestamps, screenshots, URLs.
- Assumptions: unstated context needed to interpret facts.
- Risks: possible failure modes, data-quality concerns, or unsafe conditions.
- Recommendations: suggested next steps for human review.

Do not present assumptions or recommendations as facts.

## Failure handling

1. Stop the workflow when safety checks fail.
2. Capture a screenshot and log entry before reporting failure.
3. Diagnose failures without retry loops that could trigger destructive actions.
4. Escalate ambiguous UI states to a human reviewer.
