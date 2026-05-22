import type {
  BlockSummary,
  DeadheadPairSummary,
  OptibusExcelDataset,
  RouteSummary,
  ScheduleKpiSummary,
} from "./optibusDataModel";

export interface DepotPlaceSummary {
  placeId: string;
  name?: string;
  type?: string;
  vehicleEventCount: number;
}

export interface DeadheadCatalogCoverageIndicator {
  totalDeadheadPairs: number;
  coveredPairs: number;
  missingPairs: number;
  coveragePercent: number;
}

export interface OptibusScheduleAnalysisResult {
  kpis: ScheduleKpiSummary;
  routeSummaries: RouteSummary[];
  blockSummaries: BlockSummary[];
  topDeadheadPairs: DeadheadPairSummary[];
  topBlocksByDeadhead: BlockSummary[];
  depotPlaceSummaries: DepotPlaceSummary[];
  deadheadCatalogCoverage: DeadheadCatalogCoverageIndicator;
  dataQualityChecks: string[];
}

export function analyzeOptibusSchedule(dataset: OptibusExcelDataset): OptibusScheduleAnalysisResult {
  const serviceVehicleEvents = dataset.vehicleEvents.filter((event) => event.eventType === "service");
  const deadheadEvents = dataset.vehicleEvents.filter((event) => event.eventType === "deadhead");
  const depotPullOutEvents = dataset.vehicleEvents.filter((event) => event.eventType === "depot_pull_out");
  const depotPullInEvents = dataset.vehicleEvents.filter((event) => event.eventType === "depot_pull_in");
  const serviceKm = sumDistance(serviceVehicleEvents);
  const deadheadKm = sumDistance(deadheadEvents);
  const depotPullOutKm = sumDistance(depotPullOutEvents);
  const depotPullInKm = sumDistance(depotPullInEvents);
  const totalNonServiceKm = deadheadKm + depotPullOutKm + depotPullInKm;

  const blockSummaries = summarizeBlocks(dataset);
  const routeSummaries = summarizeRoutes(dataset);
  const topDeadheadPairs = summarizeDeadheadPairs(dataset).slice(0, 10);
  const topBlocksByDeadhead = [...blockSummaries]
    .sort((a, b) => b.totalNonServiceKm - a.totalNonServiceKm)
    .slice(0, 10);

  return {
    kpis: {
      serviceTrips: dataset.trips.length,
      vehicleEvents: dataset.vehicleEvents.length,
      crewEvents: dataset.dutyEvents.length,
      blocks: new Set(dataset.vehicleEvents.map((event) => event.blockId).filter(Boolean)).size,
      duties: new Set(dataset.dutyEvents.map((event) => event.dutyId).filter(Boolean)).size,
      serviceKm: round(serviceKm),
      deadheadKm: round(deadheadKm),
      depotPullOutKm: round(depotPullOutKm),
      depotPullInKm: round(depotPullInKm),
      totalNonServiceKm: round(totalNonServiceKm),
      deadheadPercentage: round((totalNonServiceKm / (serviceKm + totalNonServiceKm)) * 100),
    },
    routeSummaries,
    blockSummaries,
    topDeadheadPairs,
    topBlocksByDeadhead,
    depotPlaceSummaries: summarizePlaces(dataset),
    deadheadCatalogCoverage: calculateCatalogCoverage(dataset),
    dataQualityChecks: buildDataQualityChecks(dataset),
  };
}

function summarizeRoutes(dataset: OptibusExcelDataset): RouteSummary[] {
  const map = new Map<string, RouteSummary>();
  for (const trip of dataset.trips) {
    const key = `${trip.routeId ?? "unknown"}::${trip.sign ?? ""}`;
    const current = map.get(key) ?? { routeId: trip.routeId ?? "unknown", sign: trip.sign, trips: 0, serviceKm: 0 };
    current.trips += 1;
    current.serviceKm += trip.serviceKm ?? 0;
    map.set(key, current);
  }
  return [...map.values()].map((summary) => ({ ...summary, serviceKm: round(summary.serviceKm) })).sort((a, b) => b.trips - a.trips);
}

function summarizeBlocks(dataset: OptibusExcelDataset): BlockSummary[] {
  const map = new Map<string, BlockSummary>();
  for (const event of dataset.vehicleEvents) {
    const blockId = event.blockId ?? "unknown";
    const current = map.get(blockId) ?? {
      blockId,
      vehicleId: event.vehicleId,
      serviceKm: 0,
      deadheadKm: 0,
      depotPullOutKm: 0,
      depotPullInKm: 0,
      totalNonServiceKm: 0,
    };
    const distance = event.distanceKm ?? 0;
    if (event.eventType === "service") current.serviceKm += distance;
    if (event.eventType === "deadhead") current.deadheadKm += distance;
    if (event.eventType === "depot_pull_out") current.depotPullOutKm += distance;
    if (event.eventType === "depot_pull_in") current.depotPullInKm += distance;
    current.totalNonServiceKm = current.deadheadKm + current.depotPullOutKm + current.depotPullInKm;
    map.set(blockId, current);
  }
  return [...map.values()].map((summary) => ({
    ...summary,
    serviceKm: round(summary.serviceKm),
    deadheadKm: round(summary.deadheadKm),
    depotPullOutKm: round(summary.depotPullOutKm),
    depotPullInKm: round(summary.depotPullInKm),
    totalNonServiceKm: round(summary.totalNonServiceKm),
  }));
}

function summarizeDeadheadPairs(dataset: OptibusExcelDataset): DeadheadPairSummary[] {
  const catalog = new Set(dataset.deadheadCatalog.map((entry) => `${entry.fromPlaceId}::${entry.toPlaceId}`));
  const map = new Map<string, DeadheadPairSummary>();
  for (const event of dataset.vehicleEvents.filter((candidate) => candidate.eventType !== "service")) {
    const from = event.fromPlaceId ?? "unknown";
    const to = event.toPlaceId ?? "unknown";
    const key = `${from}::${to}`;
    const current = map.get(key) ?? {
      fromPlaceId: from,
      toPlaceId: to,
      eventCount: 0,
      distanceKm: 0,
      catalogCovered: catalog.has(key),
    };
    current.eventCount += 1;
    current.distanceKm += event.distanceKm ?? 0;
    map.set(key, current);
  }
  return [...map.values()]
    .map((summary) => ({ ...summary, distanceKm: round(summary.distanceKm) }))
    .sort((a, b) => b.distanceKm - a.distanceKm);
}

function summarizePlaces(dataset: OptibusExcelDataset): DepotPlaceSummary[] {
  return dataset.places.map((place) => ({
    placeId: place.placeId,
    name: place.name,
    type: place.type,
    vehicleEventCount: dataset.vehicleEvents.filter(
      (event) => event.fromPlaceId === place.placeId || event.toPlaceId === place.placeId,
    ).length,
  })).sort((a, b) => b.vehicleEventCount - a.vehicleEventCount);
}

function calculateCatalogCoverage(dataset: OptibusExcelDataset): DeadheadCatalogCoverageIndicator {
  const pairs = summarizeDeadheadPairs(dataset);
  const coveredPairs = pairs.filter((pair) => pair.catalogCovered).length;
  return {
    totalDeadheadPairs: pairs.length,
    coveredPairs,
    missingPairs: pairs.length - coveredPairs,
    coveragePercent: pairs.length ? round((coveredPairs / pairs.length) * 100) : 0,
  };
}

function buildDataQualityChecks(dataset: OptibusExcelDataset): string[] {
  return [
    `Loaded files: ${dataset.loadedFiles.length}`,
    `Trips rows: ${dataset.trips.length}`,
    `Vehicle schedule events: ${dataset.vehicleEvents.length}`,
    `Crew schedule events: ${dataset.dutyEvents.length}`,
    `Deadhead catalog entries: ${dataset.deadheadCatalog.length}`,
    ...dataset.dataQualityWarnings,
  ];
}

function sumDistance(events: Array<{ distanceKm?: number }>): number {
  return events.reduce((sum, event) => sum + (event.distanceKm ?? 0), 0);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
