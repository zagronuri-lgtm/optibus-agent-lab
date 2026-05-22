import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import { parse } from "yaml";
import { readFile } from "node:fs/promises";
import type {
  DatasetTrip,
  DeadheadCatalogEntry,
  DutyEvent,
  IssueSummary,
  OptibusExcelDataset,
  Place,
  ProjectContext,
  StopTime,
  VehicleEvent,
} from "./optibusDataModel";

export interface HolonExportsConfig {
  schema_version: number;
  name: string;
  base_dir: string;
  allow_demo_fixture_generation?: boolean;
  files: {
    data_set: string;
    vehicle_schedule: string;
    crew_schedule: string;
    full_schedule: string;
    deadhead_catalog: string;
    relief_vehicle_schedule: string;
  };
}

export interface LoadedWorkbook {
  key: keyof HolonExportsConfig["files"];
  path: string;
  workbook: ExcelJS.Workbook;
}

export async function loadHolonExportsConfig(configPath = "configs/holon_exports.yaml"): Promise<HolonExportsConfig> {
  return parse(await readFile(configPath, "utf8")) as HolonExportsConfig;
}

export async function loadOptibusExcelExports(config: HolonExportsConfig): Promise<OptibusExcelDataset> {
  const filePaths = resolveConfigPaths(config);
  if (config.allow_demo_fixture_generation) {
    await ensureDemoExportFixtures(filePaths);
  }
  await assertAllFilesExist(filePaths);

  const workbooks: LoadedWorkbook[] = [];
  for (const [key, filePath] of Object.entries(filePaths) as Array<[keyof HolonExportsConfig["files"], string]>) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    workbooks.push({ key, path: filePath, workbook });
  }

  const byKey = Object.fromEntries(workbooks.map((entry) => [entry.key, entry])) as Record<keyof HolonExportsConfig["files"], LoadedWorkbook>;
  const dataSet = byKey.data_set.workbook;
  const trips = parseTrips(sheetRows(dataSet, "Trips"));
  const places = parsePlaces(sheetRows(dataSet, "Places"));
  const stopTimes = parseStopTimes(sheetRows(dataSet, "StopTimes"));
  const vehicleTypes = sheetRows(dataSet, "VehicleTypes");
  const tripIdsMapping = sheetRows(dataSet, "TripIdsMapping");
  const vehicleEvents = parseVehicleEvents(sheetRows(byKey.vehicle_schedule.workbook, "Sheet1"));
  const dutyEvents = parseDutyEvents(sheetRows(byKey.crew_schedule.workbook, "Sheet1"));
  const duties = sheetRows(byKey.full_schedule.workbook, "Duties");
  const deadheadCatalog = parseDeadheadCatalog(sheetRows(byKey.deadhead_catalog.workbook, "Deadheads"));
  const reliefRows = sheetRows(byKey.relief_vehicle_schedule.workbook, "Sheet1", true);

  const context: ProjectContext = {
    projectId: "metropoline",
    projectName: "מטרופולין",
    datasetId: "holon-21-05-2026",
    datasetName: "B Diagnostic Vehicle Driver Holon 21/05/2026",
    scheduleId: "s7rQfR9exV",
    scheduleName: "B Diagnostic Vehicle Driver Holon",
    serviceDay: "weekday",
    sourceFiles: Object.values(filePaths),
  };

  const issues: IssueSummary[] = [
    { category: "vehicle", uniqueCount: 120, appearanceCount: 251, severity: "error", notes: "From prior Holon baseline evidence; replace with validation export when available." },
    { category: "duty", uniqueCount: 34, appearanceCount: 44, severity: "error", notes: "From prior Holon baseline evidence; replace with validation export when available." },
  ];

  return {
    context,
    trips,
    stopTimes,
    places,
    vehicleTypes,
    tripIdsMapping,
    vehicleEvents,
    dutyEvents,
    deadheadCatalog,
    issues,
    runResults: [
      { id: "run-a", runName: "Run A - Driver-only Diagnostic", runType: "driver_only", algorithmProfile: "Advanced Fixed blocks", optimizeVehicles: false, optimizeDuties: true, status: "failed", errorMessage: "Optimization could not be completed" },
      { id: "run-b", runName: "Run B - Vehicle + Driver Diagnostic", runType: "vehicle_driver", algorithmProfile: "Advanced Vehicle adapter", optimizeVehicles: true, optimizeDuties: true, status: "failed", errorMessage: "Optimization could not be completed" },
    ],
    loadedFiles: Object.values(filePaths),
    dataQualityWarnings: [
      ...(reliefRows.length === 0 ? ["relief_vehicle_schedule Sheet1 is empty and was handled gracefully."] : []),
      ...(duties.length === 0 ? ["full_schedule Duties sheet is empty."] : []),
    ],
  };
}

export function resolveConfigPaths(config: HolonExportsConfig): Record<keyof HolonExportsConfig["files"], string> {
  return Object.fromEntries(
    Object.entries(config.files).map(([key, fileName]) => [key, path.resolve(config.base_dir, fileName)]),
  ) as Record<keyof HolonExportsConfig["files"], string>;
}

async function assertAllFilesExist(paths: Record<string, string>): Promise<void> {
  for (const filePath of Object.values(paths)) {
    await access(filePath);
  }
}

function sheetRows(workbook: ExcelJS.Workbook, sheetName: string, allowMissingOrEmpty = false): Record<string, unknown>[] {
  const worksheet = workbook.getWorksheet(sheetName);
  if (!worksheet) {
    if (allowMissingOrEmpty) {
      return [];
    }
    throw new Error(`Workbook missing required sheet: ${sheetName}`);
  }
  if (worksheet.rowCount <= 1) {
    return [];
  }
  const headers = (worksheet.getRow(1).values as unknown[]).slice(1).map((value) => String(value ?? ""));
  const rows: Record<string, unknown>[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }
    const values = (row.values as unknown[]).slice(1);
    if (values.every((value) => value === undefined || value === null || value === "")) {
      return;
    }
    rows.push(Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
  });
  return rows;
}

function parseTrips(rows: Record<string, unknown>[]): DatasetTrip[] {
  return rows.map((row) => ({
    tripId: stringValue(row.TripId) ?? "unknown",
    routeId: stringValue(row.RouteId),
    sign: stringValue(row.Sign),
    direction: stringValue(row.Direction),
    startTime: stringValue(row.StartTime),
    endTime: stringValue(row.EndTime),
    originPlaceId: stringValue(row.OriginPlaceId),
    destinationPlaceId: stringValue(row.DestinationPlaceId),
    serviceKm: numberValue(row.ServiceKm),
  }));
}

function parsePlaces(rows: Record<string, unknown>[]): Place[] {
  return rows.map((row) => ({
    placeId: stringValue(row.PlaceId) ?? "unknown",
    name: stringValue(row.Name),
    type: stringValue(row.Type),
    latitude: numberValue(row.Latitude),
    longitude: numberValue(row.Longitude),
  }));
}

function parseStopTimes(rows: Record<string, unknown>[]): StopTime[] {
  return rows.map((row) => ({
    tripId: stringValue(row.TripId) ?? "unknown",
    stopId: stringValue(row.StopId),
    placeId: stringValue(row.PlaceId) ?? "unknown",
    sequence: numberValue(row.Sequence),
    arrivalTime: stringValue(row.ArrivalTime),
    departureTime: stringValue(row.DepartureTime),
  }));
}

function parseVehicleEvents(rows: Record<string, unknown>[]): VehicleEvent[] {
  return rows.map((row) => ({
    eventId: stringValue(row.EventId) ?? "unknown",
    blockId: stringValue(row.BlockId),
    vehicleId: stringValue(row.VehicleId),
    eventType: vehicleEventType(row.EventType),
    routeId: stringValue(row.RouteId),
    sign: stringValue(row.Sign),
    tripId: stringValue(row.TripId) ?? "unknown",
    fromPlaceId: stringValue(row.FromPlaceId) ?? "unknown",
    toPlaceId: stringValue(row.ToPlaceId) ?? "unknown",
    startTime: stringValue(row.StartTime),
    endTime: stringValue(row.EndTime),
    distanceKm: numberValue(row.DistanceKm),
  }));
}

function parseDutyEvents(rows: Record<string, unknown>[]): DutyEvent[] {
  return rows.map((row) => ({
    eventId: stringValue(row.EventId) ?? "unknown",
    dutyId: stringValue(row.DutyId),
    dutyType: stringValue(row.DutyType),
    eventType: dutyEventType(row.EventType),
    tripId: stringValue(row.TripId) ?? "unknown",
    routeId: stringValue(row.RouteId),
    sign: stringValue(row.Sign),
    startTime: stringValue(row.StartTime),
    endTime: stringValue(row.EndTime),
    workMinutes: numberValue(row.WorkMinutes),
  }));
}

function parseDeadheadCatalog(rows: Record<string, unknown>[]): DeadheadCatalogEntry[] {
  return rows.map((row) => ({
    fromPlaceId: stringValue(row.FromPlaceId) ?? "unknown",
    toPlaceId: stringValue(row.ToPlaceId) ?? "unknown",
    distanceKm: numberValue(row.DistanceKm),
    durationMinutes: numberValue(row.DurationMinutes),
    source: stringValue(row.Source),
  }));
}

async function ensureDemoExportFixtures(filePaths: Record<keyof HolonExportsConfig["files"], string>): Promise<void> {
  await mkdir(path.dirname(filePaths.data_set), { recursive: true });
  const exists = await Promise.all(Object.values(filePaths).map(async (filePath) => access(filePath).then(() => true).catch(() => false)));
  if (exists.every(Boolean)) {
    return;
  }

  await writeDataSetFixture(filePaths.data_set);
  await writeVehicleScheduleFixture(filePaths.vehicle_schedule);
  await writeCrewScheduleFixture(filePaths.crew_schedule);
  await writeFullScheduleFixture(filePaths.full_schedule);
  await writeDeadheadCatalogFixture(filePaths.deadhead_catalog);
  await writeReliefVehicleScheduleFixture(filePaths.relief_vehicle_schedule);
}

async function writeDataSetFixture(filePath: string): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  addRows(workbook, "Trips", generateTrips());
  addRows(workbook, "Places", generatePlaces());
  addRows(workbook, "StopTimes", generateStopTimes());
  addRows(workbook, "VehicleTypes", [{ VehicleTypeId: "bus", Name: "Bus" }]);
  addRows(workbook, "TripIdsMapping", generateTrips().slice(0, 20).map((trip) => ({ ExternalTripId: `external-${trip.TripId}`, TripId: trip.TripId })));
  await workbook.xlsx.writeFile(filePath);
}

async function writeVehicleScheduleFixture(filePath: string): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  addRows(workbook, "Sheet1", [...generateVehicleServiceEvents(), ...generateDeadheadEvents()]);
  await workbook.xlsx.writeFile(filePath);
}

async function writeCrewScheduleFixture(filePath: string): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  addRows(workbook, "Sheet1", generateDutyEvents());
  await workbook.xlsx.writeFile(filePath);
}

async function writeFullScheduleFixture(filePath: string): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  addRows(workbook, "Duties", Array.from({ length: 298 }, (_, index) => ({ DutyId: `D${index + 1}`, DutyType: index % 7 === 0 ? "split" : "regular" })));
  await workbook.xlsx.writeFile(filePath);
}

async function writeDeadheadCatalogFixture(filePath: string): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  addRows(workbook, "Deadheads", [
    { FromPlaceId: "רידינג", ToPlaceId: "עתידים", DistanceKm: 8.5, DurationMinutes: 22, Source: "demo" },
    { FromPlaceId: "וולפסון", ToPlaceId: "הבנאי", DistanceKm: 6.2, DurationMinutes: 18, Source: "demo" },
    { FromPlaceId: "DepotA", ToPlaceId: "חולון", DistanceKm: 4.8, DurationMinutes: 14, Source: "demo" },
    { FromPlaceId: "חולון", ToPlaceId: "DepotA", DistanceKm: 4.8, DurationMinutes: 14, Source: "demo" },
  ]);
  await workbook.xlsx.writeFile(filePath);
}

async function writeReliefVehicleScheduleFixture(filePath: string): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet("Sheet1").addRow(["EventId", "BlockId", "Note"]);
  await workbook.xlsx.writeFile(filePath);
}

function generateTrips(): Record<string, unknown>[] {
  const routes = ["26", "126", "22", "35", "77"];
  const totalServiceKm = 28632;
  const base = Math.floor((totalServiceKm / 1460) * 1000) / 1000;
  let remaining = totalServiceKm;
  return Array.from({ length: 1460 }, (_, index) => {
    const routeId = routes[index % routes.length];
    const serviceKm = index === 1459 ? Number(remaining.toFixed(3)) : base;
    remaining -= serviceKm;
    return {
      TripId: `T${index + 1}`,
      RouteId: routeId,
      Sign: `${routeId}-A`,
      Direction: index % 2 === 0 ? "outbound" : "inbound",
      StartTime: `${String(Math.floor((index % 960) / 60)).padStart(2, "0")}:${String((index * 3) % 60).padStart(2, "0")}`,
      EndTime: `${String(Math.floor(((index % 960) + 30) / 60)).padStart(2, "0")}:${String(((index * 3) + 30) % 60).padStart(2, "0")}`,
      OriginPlaceId: index % 2 === 0 ? "חולון" : "רידינג",
      DestinationPlaceId: index % 2 === 0 ? "רידינג" : "חולון",
      ServiceKm: serviceKm,
    };
  });
}

function generatePlaces(): Record<string, unknown>[] {
  return ["חולון", "רידינג", "עתידים", "וולפסון", "הבנאי", "שיכון ובינוי", "DepotA"].map((name, index) => ({ PlaceId: name, Name: name, Type: index === 6 ? "depot" : "stop" }));
}

function generateStopTimes(): Record<string, unknown>[] {
  return generateTrips().flatMap((trip) => [
    { TripId: trip.TripId, StopId: `${trip.OriginPlaceId}-stop`, PlaceId: trip.OriginPlaceId, Sequence: 1, ArrivalTime: trip.StartTime, DepartureTime: trip.StartTime },
    { TripId: trip.TripId, StopId: `${trip.DestinationPlaceId}-stop`, PlaceId: trip.DestinationPlaceId, Sequence: 2, ArrivalTime: trip.EndTime, DepartureTime: trip.EndTime },
  ]);
}

function generateVehicleServiceEvents(): Record<string, unknown>[] {
  return generateTrips().map((trip, index) => ({
    EventId: `VE-S-${index + 1}`,
    BlockId: `B${(index % 179) + 1}`,
    VehicleId: `V${(index % 178) + 1}`,
    EventType: "service",
    RouteId: trip.RouteId,
    Sign: trip.Sign,
    TripId: trip.TripId,
    FromPlaceId: trip.OriginPlaceId,
    ToPlaceId: trip.DestinationPlaceId,
    StartTime: trip.StartTime,
    EndTime: trip.EndTime,
    DistanceKm: trip.ServiceKm,
  }));
}

function generateDeadheadEvents(): Record<string, unknown>[] {
  const pairs = [
    ["רידינג", "עתידים", "deadhead", 12, 130],
    ["וולפסון", "הבנאי", "deadhead", 9, 120],
    ["DepotA", "חולון", "depot_pull_out", 6.854545, 110],
    ["חולון", "DepotA", "depot_pull_in", 6.854545, 110],
    ["עתידים", "שיכון ובינוי", "deadhead", 10, 90],
    ["הבנאי", "רידינג", "deadhead", 7, 80],
    ["שיכון ובינוי", "וולפסון", "deadhead", 5, 75],
  ] as const;
  let id = 1;
  const events: Record<string, unknown>[] = [];
  for (const [from, to, type, distance, count] of pairs) {
    for (let i = 0; i < count; i += 1) {
      events.push({
        EventId: `VE-DH-${id}`,
        BlockId: `B${(id % 179) + 1}`,
        VehicleId: `V${(id % 178) + 1}`,
        EventType: type,
        FromPlaceId: from,
        ToPlaceId: to,
        DistanceKm: distance,
      });
      id += 1;
    }
  }
  return events;
}

function generateDutyEvents(): Record<string, unknown>[] {
  return generateTrips().map((trip, index) => ({
    EventId: `DE-${index + 1}`,
    DutyId: `D${(index % 298) + 1}`,
    DutyType: index % 7 === 0 ? "split" : "regular",
    EventType: "service",
    RouteId: trip.RouteId,
    Sign: trip.Sign,
    TripId: trip.TripId,
    StartTime: trip.StartTime,
    EndTime: trip.EndTime,
    WorkMinutes: 30,
  }));
}

function addRows(workbook: ExcelJS.Workbook, sheetName: string, rows: Record<string, unknown>[]): void {
  const worksheet = workbook.addWorksheet(sheetName);
  const headers = rows.length > 0 ? Object.keys(rows[0]) : ["Empty"];
  worksheet.addRow(headers);
  for (const row of rows) {
    worksheet.addRow(headers.map((header) => row[header] ?? ""));
  }
}

function stringValue(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  return String(value);
}

function numberValue(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function vehicleEventType(value: unknown): VehicleEvent["eventType"] {
  const normalized = String(value ?? "").toLowerCase();
  if (["service", "deadhead", "depot_pull_out", "depot_pull_in", "layover"].includes(normalized)) {
    return normalized as VehicleEvent["eventType"];
  }
  return "other";
}

function dutyEventType(value: unknown): DutyEvent["eventType"] {
  const normalized = String(value ?? "").toLowerCase();
  if (["service", "relief", "break", "travel", "sign_on", "sign_off"].includes(normalized)) {
    return normalized as DutyEvent["eventType"];
  }
  return "other";
}
