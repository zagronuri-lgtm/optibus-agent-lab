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

export interface Project {
  id: string;
  name: string;
}

export interface Dataset {
  id: string;
  name: string;
  projectId: string;
}

export interface Schedule {
  id: string;
  name: string;
  datasetId: string;
  serviceDay?: string;
  version?: string;
}

export interface Route {
  id: string;
  shortName?: string;
  longName?: string;
  direction?: string;
}

export interface Trip {
  id: string;
  routeId?: string;
  blockId?: string;
  startTime?: string;
  endTime?: string;
  originStopId?: string;
  destinationStopId?: string;
  serviceKm?: number;
}

export interface Block {
  id: string;
  vehicleId?: string;
  depotId?: string;
  tripIds: string[];
  startTime?: string;
  endTime?: string;
  serviceKm?: number;
  deadheadKm?: number;
}

export interface Duty {
  id: string;
  dutyType?: string;
  driverBaseId?: string;
  eventIds: string[];
  startTime?: string;
  endTime?: string;
  paidTimeMinutes?: number;
  workTimeMinutes?: number;
}

export interface VehicleEvent {
  id: string;
  blockId?: string;
  vehicleId?: string;
  type: "trip" | "deadhead" | "layover" | "depot" | "break" | "unknown";
  tripId?: string;
  deadheadId?: string;
  startTime?: string;
  endTime?: string;
  fromLocationId?: string;
  toLocationId?: string;
}

export interface DutyEvent {
  id: string;
  dutyId?: string;
  type: "trip" | "relief" | "break" | "travel" | "sign_on" | "sign_off" | "unknown";
  tripId?: string;
  reliefPointId?: string;
  startTime?: string;
  endTime?: string;
}

export interface Deadhead {
  id: string;
  blockId?: string;
  fromLocationId?: string;
  toLocationId?: string;
  startTime?: string;
  endTime?: string;
  distanceKm?: number;
  durationMinutes?: number;
  couldBecomeRevenueService?: boolean;
}

export interface Depot {
  id: string;
  name: string;
  capacity?: number;
  vehicleGroupIds?: string[];
}

export interface ReliefPoint {
  id: string;
  name: string;
  stopId?: string;
  legal?: boolean;
  notes?: string;
}

export interface Issue {
  id: string;
  category: "vehicle" | "duty" | "trip" | "block" | "preference" | "run" | "unknown";
  severity?: "info" | "warning" | "error" | "critical";
  message: string;
  entityType?: string;
  entityId?: string;
  uniqueCount?: number;
  appearanceCount?: number;
  dismissed?: boolean;
}

export interface Preference {
  id: string;
  domain:
    | "cost"
    | "depot_setup"
    | "midday_park"
    | "algorithm_parameters"
    | "pre_post_trip"
    | "relief_points"
    | "relief_timing"
    | "trip_connections"
    | "duty_types"
    | "work_limitation"
    | "time_limitations"
    | "split_break_definition"
    | "deadhead_catalog"
    | "global_constraints"
    | "unknown";
  name: string;
  value?: string | number | boolean;
  hardOrSoft?: "hard" | "soft" | "unknown";
  source?: string;
}

export interface RunResult {
  id: string;
  runName: string;
  runType?: string;
  algorithmProfile?: string;
  optimizeVehicles?: boolean;
  optimizeDuties?: boolean;
  status: "completed" | "failed" | "cancelled" | "unknown";
  startedAt?: string;
  endedAt?: string;
  durationMinutes?: number;
  errorMessage?: string;
}

export interface OptibusNormalizedDataset {
  project: Project;
  dataset: Dataset;
  schedule: Schedule;
  routes: Route[];
  trips: Trip[];
  blocks: Block[];
  duties: Duty[];
  vehicleEvents: VehicleEvent[];
  dutyEvents: DutyEvent[];
  deadheads: Deadhead[];
  depots: Depot[];
  reliefPoints: ReliefPoint[];
  issues: Issue[];
  preferences: Preference[];
  runResults: RunResult[];
}

export interface BaselineKpiSummary {
  trips?: string;
  blocks?: number;
  pvr?: number;
  duties?: number;
  vehicleEfficiencyPercent?: number;
  crewEfficiencyPercent?: number;
  serviceKm?: number;
  deadheadKm?: number;
  deadheadPercent?: number;
  totalCost?: number;
  crewCost?: number;
  vehicleCost?: number;
}
