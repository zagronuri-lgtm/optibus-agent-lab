export type OptibusExportKind =
  | "trips"
  | "blocks"
  | "duties"
  | "vehicle_schedule"
  | "crew_schedule"
  | "issues_validation"
  | "deadhead_report"
  | "preferences_report"
  | "run_history";

export type ExportFileFormat = "csv" | "xlsx" | "json";

export interface ProjectContext {
  projectId: string;
  projectName: string;
  datasetId: string;
  datasetName: string;
  scheduleId: string;
  scheduleName: string;
  serviceDay?: string;
  sourceFiles: string[];
}

export interface DatasetTrip {
  tripId: string;
  routeId?: string;
  sign?: string;
  direction?: string;
  startTime?: string;
  endTime?: string;
  originPlaceId?: string;
  destinationPlaceId?: string;
  serviceKm?: number;
}

export interface StopTime {
  tripId: string;
  stopId?: string;
  placeId?: string;
  sequence?: number;
  arrivalTime?: string;
  departureTime?: string;
}

export interface Place {
  placeId: string;
  name?: string;
  type?: string;
  latitude?: number;
  longitude?: number;
}

export interface VehicleEvent {
  eventId: string;
  blockId?: string;
  vehicleId?: string;
  eventType: "service" | "deadhead" | "depot_pull_out" | "depot_pull_in" | "layover" | "other";
  routeId?: string;
  sign?: string;
  tripId?: string;
  fromPlaceId?: string;
  toPlaceId?: string;
  startTime?: string;
  endTime?: string;
  distanceKm?: number;
}

export interface DutyEvent {
  eventId: string;
  dutyId?: string;
  dutyType?: string;
  eventType: "service" | "relief" | "break" | "travel" | "sign_on" | "sign_off" | "other";
  tripId?: string;
  routeId?: string;
  sign?: string;
  startTime?: string;
  endTime?: string;
  workMinutes?: number;
}

export interface DeadheadCatalogEntry {
  fromPlaceId: string;
  toPlaceId: string;
  distanceKm?: number;
  durationMinutes?: number;
  source?: string;
}

export interface IssueSummary {
  category: "vehicle" | "duty" | "trip" | "block" | "unknown";
  uniqueCount: number;
  appearanceCount: number;
  severity?: "info" | "warning" | "error" | "critical";
  notes?: string;
}

export interface ScheduleKpiSummary {
  serviceTrips: number;
  vehicleEvents: number;
  crewEvents: number;
  blocks: number;
  duties: number;
  serviceKm: number;
  deadheadKm: number;
  depotPullOutKm: number;
  depotPullInKm: number;
  totalNonServiceKm: number;
  deadheadPercentage: number;
}

export interface DeadheadPairSummary {
  fromPlaceId: string;
  toPlaceId: string;
  eventCount: number;
  distanceKm: number;
  catalogCovered: boolean;
}

export interface RouteSummary {
  routeId: string;
  sign?: string;
  trips: number;
  serviceKm: number;
}

export interface BlockSummary {
  blockId: string;
  vehicleId?: string;
  serviceKm: number;
  deadheadKm: number;
  depotPullOutKm: number;
  depotPullInKm: number;
  totalNonServiceKm: number;
}

export interface DutySummary {
  dutyId: string;
  dutyType?: string;
  serviceEvents: number;
  workMinutes?: number;
}

export interface OptibusExcelDataset {
  context: ProjectContext;
  trips: DatasetTrip[];
  stopTimes: StopTime[];
  places: Place[];
  vehicleTypes: Record<string, unknown>[];
  tripIdsMapping: Record<string, unknown>[];
  vehicleEvents: VehicleEvent[];
  dutyEvents: DutyEvent[];
  deadheadCatalog: DeadheadCatalogEntry[];
  issues: IssueSummary[];
  runResults?: RunResult[];
  loadedFiles: string[];
  dataQualityWarnings: string[];
}

// Legacy names retained for earlier data-first scaffold/tests.
export interface Project { id: string; name: string; }
export interface Dataset { id: string; name: string; projectId: string; }
export interface Schedule { id: string; name: string; datasetId: string; serviceDay?: string; version?: string; }
export interface Route { id: string; shortName?: string; longName?: string; direction?: string; }
export interface Trip { id: string; routeId?: string; blockId?: string; startTime?: string; endTime?: string; originStopId?: string; destinationStopId?: string; serviceKm?: number; }
export interface Block { id: string; vehicleId?: string; depotId?: string; tripIds: string[]; startTime?: string; endTime?: string; serviceKm?: number; deadheadKm?: number; }
export interface Duty { id: string; dutyType?: string; driverBaseId?: string; eventIds: string[]; startTime?: string; endTime?: string; paidTimeMinutes?: number; workTimeMinutes?: number; }
export interface Deadhead { id: string; blockId?: string; fromLocationId?: string; toLocationId?: string; startTime?: string; endTime?: string; distanceKm?: number; durationMinutes?: number; couldBecomeRevenueService?: boolean; }
export interface Depot { id: string; name: string; capacity?: number; vehicleGroupIds?: string[]; }
export interface ReliefPoint { id: string; name: string; stopId?: string; legal?: boolean; notes?: string; }
export interface Issue { id: string; category: "vehicle" | "duty" | "trip" | "block" | "preference" | "run" | "unknown"; severity?: "info" | "warning" | "error" | "critical"; message: string; entityType?: string; entityId?: string; uniqueCount?: number; appearanceCount?: number; dismissed?: boolean; }
export interface Preference { id: string; domain: "cost" | "depot_setup" | "midday_park" | "algorithm_parameters" | "pre_post_trip" | "relief_points" | "relief_timing" | "trip_connections" | "duty_types" | "work_limitation" | "time_limitations" | "split_break_definition" | "deadhead_catalog" | "global_constraints" | "unknown"; name: string; value?: string | number | boolean; hardOrSoft?: "hard" | "soft" | "unknown"; source?: string; }
export interface RunResult { id: string; runName: string; runType?: string; algorithmProfile?: string; optimizeVehicles?: boolean; optimizeDuties?: boolean; status: "completed" | "failed" | "cancelled" | "unknown"; startedAt?: string; endedAt?: string; durationMinutes?: number; errorMessage?: string; }
export interface OptibusNormalizedDataset { project: Project; dataset: Dataset; schedule: Schedule; routes: Route[]; trips: Trip[]; blocks: Block[]; duties: Duty[]; vehicleEvents: Array<{ id: string; blockId?: string; vehicleId?: string; type: "trip" | "deadhead" | "layover" | "depot" | "break" | "unknown"; tripId?: string; deadheadId?: string; startTime?: string; endTime?: string; fromLocationId?: string; toLocationId?: string; }>; dutyEvents: Array<{ id: string; dutyId?: string; type: "trip" | "relief" | "break" | "travel" | "sign_on" | "sign_off" | "unknown"; tripId?: string; reliefPointId?: string; startTime?: string; endTime?: string; }>; deadheads: Deadhead[]; depots: Depot[]; reliefPoints: ReliefPoint[]; issues: Issue[]; preferences: Preference[]; runResults: RunResult[]; }
export interface BaselineKpiSummary { trips?: string; blocks?: number; pvr?: number; duties?: number; vehicleEfficiencyPercent?: number; crewEfficiencyPercent?: number; serviceKm?: number; deadheadKm?: number; deadheadPercent?: number; totalCost?: number; crewCost?: number; vehicleCost?: number; }
