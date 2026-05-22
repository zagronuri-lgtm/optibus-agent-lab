"""Data-first Optibus Excel export loading and normalization.

This module intentionally does not automate Optibus, log in, click buttons, run
optimizations, or modify source Excel files. It only reads exported workbooks and
normalizes their content into reusable pandas DataFrames.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Mapping

import pandas as pd

EXPECTED_FILES = {
    "data_set": "B_Diagnostic_Vehicle_Driver_Holon_21_05_2026_data_set.xlsx",
    "relief_vehicle_schedule": "B_Diagnostic_Vehicle_Driver_Holon_21_05_2026_relief_vehicle_schedule.xlsx",
    "crew_schedule": "B_Diagnostic_Vehicle_Driver_Holon_21_05_2026_crew_schedule.xlsx",
    "vehicle_schedule": "B_Diagnostic_Vehicle_Driver_Holon_21_05_2026_vehicle_schedule.xlsx",
    "deadhead_catalog": "B_Diagnostic_Vehicle_Driver_Holon_21_05_2026_deadhead_catalog.xlsx",
    "full_schedule": "B_Diagnostic_Vehicle_Driver_Holon_21_05_2026_full_schedule.xlsx",
}

REQUIRED_SHEETS = {
    "data_set": ["Trips", "Places", "StopTimes", "VehicleTypes", "TripIdsMapping"],
    "relief_vehicle_schedule": ["Sheet1"],
    "crew_schedule": ["Sheet1"],
    "vehicle_schedule": ["Sheet1"],
    "deadhead_catalog": ["Deadheads"],
    "full_schedule": ["Duties"],
}


@dataclass(frozen=True)
class WorkbookSheetInfo:
    """Lightweight workbook metadata for inspection and debugging."""

    file_key: str
    file_path: Path
    sheet_name: str
    columns: list[str]
    row_count: int


@dataclass(frozen=True)
class OptibusExports:
    """Canonical normalized dataframes derived from the Optibus exports."""

    source_dir: Path
    trips: pd.DataFrame
    places: pd.DataFrame
    stop_times: pd.DataFrame
    vehicle_types: pd.DataFrame
    trip_ids_mapping: pd.DataFrame
    vehicle_events: pd.DataFrame
    duty_events: pd.DataFrame
    duties: pd.DataFrame
    deadhead_catalog: pd.DataFrame
    relief_vehicle_events: pd.DataFrame


def expected_file_paths(source_dir: str | Path) -> dict[str, Path]:
    """Return the expected Optibus export file paths for a source folder."""

    root = Path(source_dir)
    return {key: root / filename for key, filename in EXPECTED_FILES.items()}


def inspect_workbooks(source_dir: str | Path) -> list[WorkbookSheetInfo]:
    """List sheets, columns, and row counts for each expected workbook."""

    infos: list[WorkbookSheetInfo] = []
    for file_key, file_path in expected_file_paths(source_dir).items():
        xls = pd.ExcelFile(file_path)
        for sheet_name in xls.sheet_names:
            df = pd.read_excel(file_path, sheet_name=sheet_name, nrows=0)
            row_count = len(pd.read_excel(file_path, sheet_name=sheet_name, usecols=None))
            infos.append(
                WorkbookSheetInfo(
                    file_key=file_key,
                    file_path=file_path,
                    sheet_name=sheet_name,
                    columns=[str(column) for column in df.columns],
                    row_count=row_count,
                )
            )
    return infos


def validate_expected_workbooks(source_dir: str | Path) -> None:
    """Fail early if required files or sheets are missing."""

    for file_key, file_path in expected_file_paths(source_dir).items():
        if not file_path.exists():
            raise FileNotFoundError(f"Missing expected Optibus export: {file_path}")
        xls = pd.ExcelFile(file_path)
        missing = [sheet for sheet in REQUIRED_SHEETS[file_key] if sheet not in xls.sheet_names]
        if missing:
            raise ValueError(f"{file_path.name} missing required sheets: {missing}")


def load_optibus_exports(source_dir: str | Path) -> OptibusExports:
    """Load and normalize all configured Optibus Excel exports.

    The function keeps loading separate from analysis. Every returned dataframe is
    copied and normalized, but the Excel source files are never modified.
    """

    source = Path(source_dir)
    validate_expected_workbooks(source)
    files = expected_file_paths(source)

    data_set = files["data_set"]
    trips = normalize_trips(pd.read_excel(data_set, sheet_name="Trips"))
    places = normalize_places(pd.read_excel(data_set, sheet_name="Places"))
    stop_times = normalize_stop_times(pd.read_excel(data_set, sheet_name="StopTimes"))
    vehicle_types = normalize_generic(pd.read_excel(data_set, sheet_name="VehicleTypes"))
    trip_ids_mapping = normalize_generic(pd.read_excel(data_set, sheet_name="TripIdsMapping"))

    vehicle_events = normalize_vehicle_events(
        pd.read_excel(files["vehicle_schedule"], sheet_name="Sheet1")
    )
    duty_events = normalize_duty_events(
        pd.read_excel(files["crew_schedule"], sheet_name="Sheet1")
    )
    duties = normalize_duties(pd.read_excel(files["full_schedule"], sheet_name="Duties"))
    deadhead_catalog = normalize_deadhead_catalog(
        pd.read_excel(files["deadhead_catalog"], sheet_name="Deadheads")
    )
    relief_vehicle_events = normalize_vehicle_events(
        pd.read_excel(files["relief_vehicle_schedule"], sheet_name="Sheet1")
    )

    return OptibusExports(
        source_dir=source,
        trips=trips,
        places=places,
        stop_times=stop_times,
        vehicle_types=vehicle_types,
        trip_ids_mapping=trip_ids_mapping,
        vehicle_events=vehicle_events,
        duty_events=duty_events,
        duties=duties,
        deadhead_catalog=deadhead_catalog,
        relief_vehicle_events=relief_vehicle_events,
    )


def normalize_trips(df: pd.DataFrame) -> pd.DataFrame:
    return normalize_generic(df).rename(
        columns={
            "TripId": "trip_id",
            "RouteId": "route_id",
            "Sign": "sign",
            "Direction": "direction",
            "StartTime": "start_time",
            "EndTime": "end_time",
            "OriginPlaceId": "origin_place_id",
            "DestinationPlaceId": "destination_place_id",
            "ServiceKm": "service_km",
        }
    )


def normalize_places(df: pd.DataFrame) -> pd.DataFrame:
    return normalize_generic(df).rename(
        columns={"PlaceId": "place_id", "Name": "name", "Type": "place_type"}
    )


def normalize_stop_times(df: pd.DataFrame) -> pd.DataFrame:
    return normalize_generic(df).rename(
        columns={
            "TripId": "trip_id",
            "StopId": "stop_id",
            "PlaceId": "place_id",
            "Sequence": "sequence",
            "ArrivalTime": "arrival_time",
            "DepartureTime": "departure_time",
        }
    )


def normalize_vehicle_events(df: pd.DataFrame) -> pd.DataFrame:
    normalized = normalize_generic(df).rename(
        columns={
            "EventId": "vehicle_event_id",
            "BlockId": "block_id",
            "VehicleId": "vehicle_id",
            "EventType": "event_type",
            "RouteId": "route_id",
            "Sign": "sign",
            "TripId": "trip_id",
            "FromPlaceId": "from_place_id",
            "ToPlaceId": "to_place_id",
            "StartTime": "start_time",
            "EndTime": "end_time",
            "DistanceKm": "distance_km",
        }
    )
    if "event_type" in normalized:
        normalized["event_type"] = normalized["event_type"].astype("string").str.lower()
    return normalized


def normalize_duty_events(df: pd.DataFrame) -> pd.DataFrame:
    normalized = normalize_generic(df).rename(
        columns={
            "EventId": "duty_event_id",
            "DutyId": "duty_id",
            "DutyType": "duty_type",
            "EventType": "event_type",
            "RouteId": "route_id",
            "Sign": "sign",
            "TripId": "trip_id",
            "StartTime": "start_time",
            "EndTime": "end_time",
            "WorkMinutes": "work_minutes",
        }
    )
    if "event_type" in normalized:
        normalized["event_type"] = normalized["event_type"].astype("string").str.lower()
    return normalized


def normalize_duties(df: pd.DataFrame) -> pd.DataFrame:
    return normalize_generic(df).rename(
        columns={"DutyId": "duty_id", "DutyType": "duty_type"}
    )


def normalize_deadhead_catalog(df: pd.DataFrame) -> pd.DataFrame:
    return normalize_generic(df).rename(
        columns={
            "FromPlaceId": "from_place_id",
            "ToPlaceId": "to_place_id",
            "DistanceKm": "distance_km",
            "DurationMinutes": "duration_minutes",
            "Source": "source",
        }
    )


def normalize_generic(df: pd.DataFrame) -> pd.DataFrame:
    normalized = df.copy()
    normalized.columns = [str(column).strip() for column in normalized.columns]
    return normalized.dropna(how="all").reset_index(drop=True)


def get_trips_with_vehicle_and_driver(exports: OptibusExports) -> pd.DataFrame:
    """Return one row per trip with assigned block/vehicle and duty where available.

    Safest join key in the current exports: trip_id. It appears in Trips,
    vehicle_schedule service events, and crew_schedule service events. If a trip
    appears more than once in either schedule, this function keeps the first
    assignment and leaves detailed many-to-many inspection for later analysis.
    """

    vehicle_assignments = (
        exports.vehicle_events.query("event_type == 'service'")
        .sort_values(["trip_id", "start_time"], na_position="last")
        .drop_duplicates("trip_id")
        [["trip_id", "block_id", "vehicle_id", "vehicle_event_id"]]
    )
    duty_assignments = (
        exports.duty_events.query("event_type == 'service'")
        .sort_values(["trip_id", "start_time"], na_position="last")
        .drop_duplicates("trip_id")
        [["trip_id", "duty_id", "duty_type", "duty_event_id"]]
    )
    return (
        exports.trips.merge(vehicle_assignments, on="trip_id", how="left")
        .merge(duty_assignments, on="trip_id", how="left")
    )


def get_duty_level_summaries(exports: OptibusExports) -> pd.DataFrame:
    """Summarize duties by duty_id using crew_schedule events."""

    events = exports.duty_events.copy()
    if events.empty:
        return pd.DataFrame(
            columns=["duty_id", "duty_type", "start_time", "end_time", "service_events", "break_events", "travel_events", "total_work_minutes"]
        )
    grouped = events.groupby("duty_id", dropna=False)
    return grouped.agg(
        duty_type=("duty_type", "first"),
        start_time=("start_time", "min"),
        end_time=("end_time", "max"),
        service_events=("event_type", lambda values: int((values == "service").sum())),
        break_events=("event_type", lambda values: int((values == "break").sum())),
        travel_events=("event_type", lambda values: int((values == "travel").sum())),
        total_work_minutes=("work_minutes", "sum"),
    ).reset_index()


def get_block_level_summaries(exports: OptibusExports) -> pd.DataFrame:
    """Summarize vehicle blocks by service/non-service distance."""

    events = exports.vehicle_events.copy()
    if events.empty:
        return pd.DataFrame(
            columns=["block_id", "vehicle_id", "service_km", "deadhead_km", "depot_pull_out_km", "depot_pull_in_km", "layover_events", "total_km", "deadhead_ratio"]
        )

    def distance_for(event_type: str, frame: pd.DataFrame) -> float:
        return float(frame.loc[frame["event_type"] == event_type, "distance_km"].fillna(0).sum())

    rows: list[dict[str, object]] = []
    for block_id, frame in events.groupby("block_id", dropna=False):
        service_km = distance_for("service", frame)
        deadhead_km = distance_for("deadhead", frame)
        depot_pull_out_km = distance_for("depot_pull_out", frame)
        depot_pull_in_km = distance_for("depot_pull_in", frame)
        total_km = service_km + deadhead_km + depot_pull_out_km + depot_pull_in_km
        rows.append(
            {
                "block_id": block_id,
                "vehicle_id": frame["vehicle_id"].dropna().iloc[0] if frame["vehicle_id"].notna().any() else pd.NA,
                "service_km": service_km,
                "deadhead_km": deadhead_km,
                "depot_pull_out_km": depot_pull_out_km,
                "depot_pull_in_km": depot_pull_in_km,
                "layover_events": int((frame["event_type"] == "layover").sum()),
                "total_km": total_km,
                "deadhead_ratio": (deadhead_km + depot_pull_out_km + depot_pull_in_km) / total_km if total_km else 0,
            }
        )
    return pd.DataFrame(rows)


def describe_join_keys(exports: OptibusExports) -> Mapping[str, str]:
    """Document practical join keys and their caveats for the loaded exports."""

    return {
        "trips_to_vehicle_events": "Trips.trip_id -> vehicle_schedule.trip_id for service events; safest observed trip assignment key.",
        "trips_to_duty_events": "Trips.trip_id -> crew_schedule.trip_id for service events; safest observed driver/duty assignment key.",
        "vehicle_events_to_blocks": "vehicle_schedule.block_id groups events into vehicle blocks; block IDs may be generic but are valid operational keys.",
        "duty_events_to_duties": "crew_schedule.duty_id -> full_schedule.duty_id; use duty_id for duty summary enrichment.",
        "places_to_events": "Places.place_id joins to from_place_id/to_place_id and stop_times.place_id; names may be Hebrew and should remain strings.",
        "deadhead_catalog_to_events": "deadhead_catalog.from_place_id + to_place_id can validate vehicle non-service event pairs; direction matters.",
    }


def summarize_loaded_shapes(exports: OptibusExports) -> dict[str, tuple[int, int]]:
    """Convenience shape summary for tests and notebooks."""

    return {
        "trips": exports.trips.shape,
        "places": exports.places.shape,
        "stop_times": exports.stop_times.shape,
        "vehicle_events": exports.vehicle_events.shape,
        "duty_events": exports.duty_events.shape,
        "duties": exports.duties.shape,
        "deadhead_catalog": exports.deadhead_catalog.shape,
        "relief_vehicle_events": exports.relief_vehicle_events.shape,
    }


if __name__ == "__main__":
    exports = load_optibus_exports(Path("data/exports"))
    print("Loaded shapes:")
    for name, shape in summarize_loaded_shapes(exports).items():
        print(f"- {name}: {shape}")
    print("Join keys:")
    for name, description in describe_join_keys(exports).items():
        print(f"- {name}: {description}")
