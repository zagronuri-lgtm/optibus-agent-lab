# Phase 2B - External Transit Data Integration Plan

## Status

External data integration is planned but not active.
No external APIs are called, Markav is not scraped, and no service change recommendations are made in this v1 plan.

## Defined providers

- Markav
- Open Bus Stride API

## Sources

### Markav

- Source name: Markav
- URL: https://markav.net/
- Access method: Optional manual planning reference/source if accessible; no scraping in v1.
- Active: false
- Expected data types:
  - line context
  - stop context
  - schedule references
  - network-planning context
  - planning notes if visible to an authorized user
- How it helps Optibus analysis:
  - compare Optibus map assumptions with external planning context
  - validate route/trip deletion risk from a network-planning perspective
  - support service addition decisions when visible planning evidence exists
- Limitations:
  - access method and permissions are not guaranteed
  - no automated scraping is allowed in v1
  - data structure and completeness are not assumed
- Risks:
  - stale or incomplete planning references
  - terms-of-use or access restrictions
  - confusing external planning context with operational Optibus facts
- Privacy/security notes:
  - do not store credentials
  - do not bypass login or permissions
  - only record evidence a user is authorized to view
- Future decisions it can support:
  - validateTripDeletionRisk
  - validateServiceAdditionOpportunity
  - compare planned trips with external planning references

### Open Bus Stride API

- Source name: Open Bus Stride API
- URL: https://open-bus-stride-api.hasadna.org.il/docs
- Access method: HTTP API, disabled by default until explicitly enabled.
- Active: false
- Expected data types:
  - route information
  - stops for route
  - trips for route and date
  - service frequency
  - observed performance if available
  - ridership or load proxy if available
  - nearby stops
- How it helps Optibus analysis:
  - enrich Optibus routes/trips/blocks with external line, stop, and schedule data
  - identify deadhead movements that may have revenue-service potential
  - validate trip deletion risk using external service context
  - validate service addition opportunities from service-gap evidence
  - compare planned Optibus trips with external schedule/performance data
- Limitations:
  - endpoint coverage and field availability must be verified before use
  - performance and demand/load proxy data may not be available
  - API calls are disabled in v1 demo
- Risks:
  - mismatched identifiers between Optibus and external sources
  - stale or incomplete external data
  - over-interpreting proxy data as demand proof
- Privacy/security notes:
  - do not send sensitive Optibus data unless explicitly approved
  - minimize query parameters to planning identifiers required for lookup
  - log source metadata and assumptions separately from facts
- Future decisions it can support:
  - analyzeDeadheadAsPotentialService
  - validateTripDeletionRisk
  - validateServiceAdditionOpportunity
  - compare planned trips with external schedule/performance data


## Future agent decisions supported

- validateTripDeletionRisk
- validateServiceAdditionOpportunity
- compare planned trips with external planning references
- analyzeDeadheadAsPotentialService
- compare planned trips with external schedule/performance data

## Safety constraints

- Do not call external APIs unless explicitly enabled.
- Do not scrape Markav unless explicitly approved and access is confirmed.
- Do not assume data exists unless the API or source provides it.
- Do not make service deletion recommendations without external validation.
- Do not make service addition recommendations without demand or service-gap evidence.
- Keep external evidence separate from Optibus operational facts.
