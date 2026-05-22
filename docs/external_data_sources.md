# Phase 2B - External Transit Data Integration

External Transit Data Integration is a planned Phase 2B capability for the Optibus Autonomous Planning Agent. The goal is to enrich Optibus map analysis with external Israeli public transport data without relying only on internal Optibus operational data.

This phase is **planned but not active**. The current implementation defines source metadata, interfaces, safety constraints, and a demo report. It does not call external APIs, scrape Markav, automate login, run Optibus actions, or make service change recommendations.

## Sources

### Markav

- URL: https://markav.net/
- Planned role: optional planning reference/source if accessible and permitted.
- Access status: manual/reference only in v1; no scraping or automated collection.
- Expected data types if accessible: line context, stop context, schedule references, network-planning context, and planning notes visible to an authorized user.

### Open Bus Stride API

- URL: https://open-bus-stride-api.hasadna.org.il/docs
- Planned role: structured API source for external Israeli public transport data where endpoints provide it.
- Access status: disabled by default in v1; no API calls are made by the demo.
- Expected data types where available: route/line info, stops, trips by route/date, service frequency, observed performance, and possible demand/load proxies if exposed.

## Planned Optibus analysis support

External data can support future read-only or approval-gated decisions such as:

- Enrich Optibus routes, trips, and blocks with external line, stop, schedule, performance, and demand-related data where available.
- Identify whether a deadhead movement could be converted into revenue service.
- Validate whether a trip or route deletion is safe from a network-planning perspective.
- Validate whether adding service makes sense based on corridor or service gaps.
- Compare planned Optibus trips with external schedule/performance data.
- Support Israeli public transport planning decisions.

## Safety and decision rules

- Do not call external APIs unless explicitly enabled.
- Do not scrape Markav unless explicitly approved and technically/legal access is confirmed.
- Do not assume data exists unless the source provides it.
- Do not make service deletion recommendations without external validation.
- Do not make service addition recommendations without demand or service-gap evidence.
- Treat external data as advisory and separate it from Optibus facts.
- Keep privacy/security notes visible in all generated reports.
