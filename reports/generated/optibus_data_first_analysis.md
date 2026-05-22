# Optibus Data-First Analysis

## Executive summary

- Data-first architecture is active for analysis scaffolding; browser-guided collection is frozen for now.
- This report uses Holon baseline sample data already collected in prior work.
- No real Optibus Run, login automation, Save, Apply, Publish, or map mutation is implemented.

## Findings

### KPI analysis

- Severity: info
- Finding: Holon baseline KPIs are available from prior collected values.
- Evidence:
  - Trips: 1460/1460
  - Blocks: 179
  - PVR: 178
  - Duties: 298
  - Vehicle Efficiency: 82.72%
  - Crew Efficiency: 77.72%
  - Service km: 28632
  - Deadhead km: 5983
  - Deadhead %: 17.28%

### Deadhead analysis

- Severity: warning
- Finding: Deadhead percentage is high enough to require detailed deadhead export review.
- Evidence:
  - Deadhead %: 17.28%
- Recommendation: Use the deadhead report to rank movements by distance/time and test service-from-deadhead candidates with external validation later.

### Vehicle issue analysis

- Severity: critical
- Finding: Vehicle Issues are high: 120 unique / 251 appearances.
- Evidence:
  - Unique count: 120
  - Appearance count: 251
- Recommendation: Inspect vehicle issue categories, vehicle-piece validation, depot allocation, trip connections, and deadhead coverage.

### Duty issue analysis

- Severity: critical
- Finding: Duty Issues are high: 34 unique / 44 appearances.
- Evidence:
  - Unique count: 34
  - Appearance count: 44
- Recommendation: Inspect duty type conflicts, Regulation 168-related rules, split duties, relief points, and work/time limitations.

### Optimization failure analysis

- Severity: critical
- Finding: Prior diagnostic runs failed and optimization failure root cause remains unresolved.
- Evidence:
  - Run A - Driver-only Diagnostic: Advanced Fixed blocks - Optimization could not be completed
  - Run B - Vehicle + Driver Diagnostic: Advanced Vehicle adapter - Optimization could not be completed
- Recommendation: Use run history/exported optimization reports and task logs before any further run planning.

### Preference analysis

- Severity: warning
- Finding: Algorithm Parameters / DEEP readiness is not confirmed.
- Evidence:
  - Domain: algorithm_parameters
  - Hard/soft: unknown
- Recommendation: Load the preferences report/export or validated screenshots before making run-readiness claims.

### Trip connection analysis

- Severity: warning
- Finding: Trip Connections / Pull Reliefs is not confirmed.
- Evidence:
  - Domain: trip_connections
  - Hard/soft: unknown
- Recommendation: Load the preferences report/export or validated screenshots before making run-readiness claims.

### Preference analysis

- Severity: warning
- Finding: Hard/soft constraints is not fully classified.
- Evidence:
  - Domain: global_constraints
  - Hard/soft: unknown
- Recommendation: Load the preferences report/export or validated screenshots before making run-readiness claims.

### Preference analysis

- Severity: warning
- Finding: Vehicle Piece Validation is not performed.
- Evidence:
  - Domain: unknown
  - Hard/soft: unknown
- Recommendation: Load the preferences report/export or validated screenshots before making run-readiness claims.

### Candidate service-from-deadhead analysis

- Severity: info
- Finding: Candidate service-from-deadhead analysis is defined but requires real deadhead export rows and external validation before recommendations.
- Evidence:
  - רידינג -> עתידים: 8.5 km
  - וולפסון -> הבנאי: 6.2 km
- Recommendation: Do not recommend service additions until deadhead movements are matched to corridor gaps and external service evidence.


## Recommendations

- Freeze browser-guided manual collection; prioritize structured Optibus exports.
- Reduce deadhead by ranking exported deadhead movements by distance, time, route context, and depot assignment.
- Review depot assignment after vehicle schedule and depot capacity exports are available.
- Add or adjust relief points only after relief legality, duty issue categories, and driver-rule exports are reviewed.
- Identify trips or lines for review from trips/blocks/duties exports plus validation issues.
- Identify deadhead movements that may become revenue service only after deadhead export and external network validation.
- Identify driver rule / duty type conflicts from duties, crew schedule, issues, and preferences exports.
- Explain optimization failure using run history/task reports before any future Run request.
- Prioritize vehicle issue categories and vehicle-piece validation before vehicle optimization changes.

## Real Optibus exports needed next

- Trips export with route, trip ID, start/end times, origin/destination stops, service km.
- Blocks export with block ID, vehicle/depot assignment, trip sequence, service km, deadhead km.
- Duties export with duty ID, duty type, driver base, work/paid time, duty events.
- Vehicle schedule export with vehicle events, layovers, depot pulls, and deadheads.
- Crew schedule export with duty events, reliefs, breaks, travels, sign-on/sign-off.
- Issues / validation report with unique issue count, appearances, severity, entity links, dismissed status.
- Deadhead report with from/to points, distance, duration, timing, and generated/missing pairs.
- Preferences report if available: cost, depot setup, midday park, algorithm parameters, reliefs, duty rules, trip connections, deadhead catalog.
- Run history / optimization report if available: run type, algorithm/profile, iterations, status, error message, task log metadata.
