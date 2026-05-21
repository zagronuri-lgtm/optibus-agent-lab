# Academy Mode

## Purpose

Academy Mode teaches the agent and operator how to observe an Optibus map safely
before any audit or run-readiness work begins.

## Entry criteria

- Operator has reviewed `AGENT_RULES.md`.
- Browser session is unauthenticated or manually authenticated by the operator.
- No map mutation is needed.

## Allowed actions

- Navigate to operator-provided URLs.
- Read page titles, URLs, labels, tables, and help text.
- Capture screenshots.
- Record facts, assumptions, risks, and recommendations.

## Forbidden actions

- Save, Apply, Publish, Delete, Export, Import, Duplicate, Create Version, Run.
- Credential entry by the agent.
- Bypassing login, captcha, MFA, permissions, or security controls.

## Major steps

1. Start local action log.
2. Capture initial screenshot.
3. Review visible navigation and read-only map context.
4. Record UI terms, map identifiers, and data-source assumptions.
5. Capture final screenshot.

## Outputs

- Academy notes in the local log.
- Screenshots for orientation.
- Human-readable list of learned page landmarks.

## Exit criteria

- The operator can identify the target map and relevant read-only pages.
- No destructive action has been attempted.
- Risks and unknowns are documented for Map Audit Mode.
