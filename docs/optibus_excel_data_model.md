# Optibus Excel Export Data Model

## Inspection status

The current files under `data/exports/` were inspected with pandas/openpyxl. The deadhead catalog contains strong fixture markers (`Source=demo`, `DepotA`), so it must be replaced before treating analysis as real Optibus evidence. The schema and loader below are still useful because they define the expected joins and canonical tables.

## Workbook sheets and columns

### data_set.xlsx

- `Trips` - 1460 rows
  - `TripId`, `RouteId`, `Sign`, `Direction`, `StartTime`, `EndTime`, `OriginPlaceId`, `DestinationPlaceId`, `ServiceKm`
- `Places` - 7 rows
  - `PlaceId`, `Name`, `Type`
- `StopTimes` - 2920 rows
  - `TripId`, `StopId`, `PlaceId`, `Sequence`, `ArrivalTime`, `DepartureTime`
- `VehicleTypes` - 1 row
  - `VehicleTypeId`, `Name`
- `TripIdsMapping` - 20 rows
  - `ExternalTripId`, `TripId`

### vehicle_schedule.xlsx

- `Sheet1` - 2175 rows
  - `EventId`, `BlockId`, `VehicleId`, `EventType`, `RouteId`, `Sign`, `TripId`, `FromPlaceId`, `ToPlaceId`, `StartTime`, `EndTime`, `DistanceKm`

### crew_schedule.xlsx

- `Sheet1` - 1460 rows
  - `EventId`, `DutyId`, `DutyType`, `EventType`, `RouteId`, `Sign`, `TripId`, `StartTime`, `EndTime`, `WorkMinutes`

### full_schedule.xlsx

- `Duties` - 298 rows
  - `DutyId`, `DutyType`

### deadhead_catalog.xlsx

- `Deadheads` - 4 rows in the current local file
  - `FromPlaceId`, `ToPlaceId`, `DistanceKm`, `DurationMinutes`, `Source`
- Current local file is fixture-like and must be replaced before real analysis.

### relief_vehicle_schedule.xlsx

- `Sheet1` - empty data in the current local file
  - `EventId`, `BlockId`, `Note`

## What each table represents

- `Trips`: planned revenue trips. `TripId` is the primary trip key; `RouteId`/`Sign` identify line pattern; origin/destination place IDs anchor the trip to locations; `ServiceKm` is revenue-service distance.
- `Places`: stops, depots, relief points, or other named locations referenced by trips, events, and deadheads.
- `StopTimes`: ordered stop-level timing for each trip. The safe join to trips is `TripId`.
- `VehicleEvents`: vehicle schedule timeline. Service events reference `TripId`; non-service events such as deadheads or depot pulls may not. `BlockId` groups vehicle events into a vehicle block.
- `DutyEvents`: crew/driver timeline. Service events reference `TripId`; `DutyId` groups events into a duty.
- `Duties`: duty metadata, currently duty ID/type in the available export.
- `DeadheadCatalog`: known non-service travel pairs. Direction matters: `FromPlaceId + ToPlaceId` is the catalog pair key.
- `ReliefVehicleEvents`: relief vehicle events if present; currently empty and handled gracefully.

## Canonical schema

### Trips

- Primary key: `trip_id`
- Foreign keys: `origin_place_id -> places.place_id`, `destination_place_id -> places.place_id`
- Optional joins: `trip_id -> vehicle_events.trip_id`, `trip_id -> duty_events.trip_id`

### VehicleBlocks

- Primary key: `block_id`
- Foreign keys: `vehicle_events.block_id -> VehicleBlocks.block_id`
- Contains service, deadhead, depot pull-out/in, layover and other vehicle events.

### Duties

- Primary key: `duty_id`
- Foreign keys: `duty_events.duty_id -> Duties.duty_id`, `duty_events.trip_id -> Trips.trip_id`

### Reliefs

- Source columns depend on relief exports/preferences. In current files, relief vehicle schedule is empty. Future schema should include `relief_point_id`, `place_id`, `duty_id`, `trip_id`, timing window, and legality/preference fields.

### Deadheads

- Event-level key: `vehicle_event_id` for schedule deadhead events.
- Catalog pair key: `(from_place_id, to_place_id)`.
- Join caveat: catalog pair direction matters; reverse direction is not equivalent unless explicitly present.

## Join-key assumptions

1. `TripId` is the safest observed key to connect trips, vehicle service events, and duty service events.
2. `BlockId` is the vehicle-block grouping key. Generic IDs like `B1/B2/B3` are valid possible block IDs and are not fixture markers by themselves.
3. `DutyId` links crew events to full-schedule duty metadata.
4. `PlaceId` links Places to trip origins/destinations, stop times, vehicle event endpoints, and deadhead catalog endpoints.
5. For deadhead catalog coverage, use `(FromPlaceId, ToPlaceId)` and keep directionality.

## Reusable Python implementation

See `python/optibus_exports.py` for:

- workbook validation and loading
- normalized dataframes
- trip + vehicle + duty assignment helper
- duty-level summary helper
- block-level summary helper
- join-key documentation helper
