DEMO DATA — NOT REAL OPTIBUS EXPORTS

# Optibus Data-First Analysis

## Executive summary

- Data-first export analysis is active; browser automation and manual guided collection are frozen.
- This report is generated from explicit local demo fixtures and must not be treated as real Optibus evidence.
- No login automation, browser clicks, Run, Save, Apply, Publish, or Excel source modification is performed.
- Schedule: B Diagnostic Vehicle Driver Holon (s7rQfR9exV)

## Files loaded

- /workspace/data/demo_exports/B_Diagnostic_Vehicle_Driver_Holon_21_05_2026_data_set.xlsx
- /workspace/data/demo_exports/B_Diagnostic_Vehicle_Driver_Holon_21_05_2026_vehicle_schedule.xlsx
- /workspace/data/demo_exports/B_Diagnostic_Vehicle_Driver_Holon_21_05_2026_crew_schedule.xlsx
- /workspace/data/demo_exports/B_Diagnostic_Vehicle_Driver_Holon_21_05_2026_full_schedule.xlsx
- /workspace/data/demo_exports/B_Diagnostic_Vehicle_Driver_Holon_21_05_2026_deadhead_catalog.xlsx
- /workspace/data/demo_exports/B_Diagnostic_Vehicle_Driver_Holon_21_05_2026_relief_vehicle_schedule.xlsx

## Data quality checks

- Loaded files: 6
- Trips rows: 1460
- Vehicle schedule events: 2175
- Crew schedule events: 1460
- Deadhead catalog entries: 4
- relief_vehicle_schedule Sheet1 is empty and was handled gracefully.

## KPI reconciliation

- Number of service trips: 1460
- Number of vehicle events: 2175
- Number of crew events: 1460
- Number of blocks: 179
- Number of duties: 298
- Service km: 28632
- Deadhead km: 4475
- Depot pull-out km: 754
- Depot pull-in km: 754
- Total non-service km: 5983
- Deadhead percentage: 17.28%

## Deadhead analysis

- Catalog coverage: 4/7 pairs (57.14%)
- Missing catalog pairs: 3

## Top deadhead pairs

- רידינג -> עתידים: 1560 km, 130 events, catalog covered=true
- וולפסון -> הבנאי: 1080 km, 120 events, catalog covered=true
- עתידים -> שיכון ובינוי: 900 km, 90 events, catalog covered=false
- DepotA -> חולון: 754 km, 110 events, catalog covered=true
- חולון -> DepotA: 754 km, 110 events, catalog covered=true
- הבנאי -> רידינג: 560 km, 80 events, catalog covered=false
- שיכון ובינוי -> וולפסון: 375 km, 75 events, catalog covered=false

## Top blocks by deadhead

- B2: 37.85 non-service km (deadhead=31, pull-out=6.85, pull-in=0)
- B3: 37.85 non-service km (deadhead=31, pull-out=6.85, pull-in=0)
- B4: 37.85 non-service km (deadhead=31, pull-out=0, pull-in=6.85)
- B5: 37.85 non-service km (deadhead=31, pull-out=0, pull-in=6.85)
- B6: 37.85 non-service km (deadhead=31, pull-out=0, pull-in=6.85)
- B7: 37.85 non-service km (deadhead=31, pull-out=0, pull-in=6.85)
- B8: 37.85 non-service km (deadhead=31, pull-out=0, pull-in=6.85)
- B9: 37.85 non-service km (deadhead=31, pull-out=0, pull-in=6.85)
- B10: 37.85 non-service km (deadhead=31, pull-out=0, pull-in=6.85)
- B11: 37.85 non-service km (deadhead=31, pull-out=0, pull-in=6.85)

## Route-level summary

- 26 / 26-A: 292 trips, 5726.12 service km
- 126 / 126-A: 292 trips, 5726.12 service km
- 22 / 22-A: 292 trips, 5726.12 service km
- 35 / 35-A: 292 trips, 5726.12 service km
- 77 / 77-A: 292 trips, 5727.52 service km

## Depot/place analysis

- חולון: type=stop, vehicle events=1680
- רידינג: type=stop, vehicle events=1670
- עתידים: type=stop, vehicle events=220
- DepotA: type=depot, vehicle events=220
- הבנאי: type=stop, vehicle events=200
- וולפסון: type=stop, vehicle events=195
- שיכון ובינוי: type=stop, vehicle events=165

## Candidate recommendations

- [P1] Review רידינג -> עתידים as a candidate service-from-deadhead opportunity (deadhead_to_service, candidate only)
- [P1] Review וולפסון -> הבנאי as a candidate service-from-deadhead opportunity (deadhead_to_service, candidate only)
- [P1] Review עתידים -> שיכון ובינוי as a candidate service-from-deadhead opportunity (deadhead_to_service, candidate only)
- [P1] Review DepotA -> חולון as a candidate service-from-deadhead opportunity (deadhead_to_service, candidate only)
- [P1] Review חולון -> DepotA as a candidate service-from-deadhead opportunity (deadhead_to_service, candidate only)
- [P1] Review block B2 for high non-service km (high_cost_block_review, candidate only)
- [P1] Review block B3 for high non-service km (high_cost_block_review, candidate only)
- [P1] Review block B4 for high non-service km (high_cost_block_review, candidate only)
- [P1] Review block B5 for high non-service km (high_cost_block_review, candidate only)
- [P1] Review block B6 for high non-service km (high_cost_block_review, candidate only)
- [P1] Check deadhead catalog coverage for עתידים -> שיכון ובינוי (deadhead_catalog_gap, candidate only)
- [P1] Check deadhead catalog coverage for הבנאי -> רידינג (deadhead_catalog_gap, candidate only)
- [P1] Check deadhead catalog coverage for שיכון ובינוי -> וולפסון (deadhead_catalog_gap, candidate only)
- [P0] Review driver rule / duty type conflicts before optimization retry (driver_rule_duty_type_conflict, candidate only)
- [P0] Investigate failed optimization reports before any new run (optimization_failure_investigation, candidate only)
- [P2] Check depot reassignment candidates after depot capacities and pull events are validated (depot_reassignment_check, candidate only)
- [P1] Validate relief points tied to high duty and vehicle issue areas (relief_point_check, candidate only)
- [P1] Review trip connection penalties for high deadhead corridors (trip_connection_check, candidate only)

## What must be validated in Optibus before any edit/run

- Confirm these exports match the intended schedule/version/copy.
- Validate vehicle and duty issue categories from the official validation report.
- Validate preferences, relief points, trip connections, duty types, and hard/soft constraints.
- Validate deadhead catalog gaps against Optibus and external service context before any service recommendation.
- Inspect failed run history/task logs before any optimization retry.
- Obtain explicit human approval before any future controlled run workflow.
