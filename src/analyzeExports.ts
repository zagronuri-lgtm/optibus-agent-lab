import { loadHolonExportsConfig, loadOptibusExcelExports } from "./optibusExcelIntake";
import { analyzeOptibusSchedule } from "./optibusScheduleAnalysis";
import { generateCandidateRecommendations } from "./optibusRecommendationEngine";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const demoMode = args.includes("--demo");
  const configPath = readOption(args, "--config") ?? (demoMode ? "configs/holon_exports_demo.yaml" : "configs/holon_exports.yaml");
  const config = await loadHolonExportsConfig(configPath);
  if (!demoMode && config.allow_demo_fixture_generation) {
    throw new Error("Real analyze:exports cannot use fixture generation. Use analyze:exports:demo instead.");
  }
  const dataset = await loadOptibusExcelExports(config);
  const demoDetection = detectDemoFixtureData(dataset);
  if (!demoMode && demoDetection.found) {
    throw new Error("DEMO/FIXTURE DATA DETECTED IN REAL MODE — STOPPING");
  }
  const analysis = analyzeOptibusSchedule(dataset);
  const recommendations = generateCandidateRecommendations(dataset, analysis);
  const reportPath = "reports/generated/optibus_data_first_analysis.md";
  await writeAnalysisReport(reportPath, dataset, analysis, recommendations, demoMode);

  console.log("Optibus Excel export analysis completed safely.");
  console.log(`Report: ${reportPath}`);
  console.log(`Files loaded: ${dataset.loadedFiles.length}`);
  console.log(`Service trips: ${analysis.kpis.serviceTrips}`);
  console.log(`Vehicle events: ${analysis.kpis.vehicleEvents}`);
  console.log(`Crew events: ${analysis.kpis.crewEvents}`);
  console.log(`Blocks: ${analysis.kpis.blocks}`);
  console.log(`Duties: ${analysis.kpis.duties}`);
  console.log(`Service km: ${analysis.kpis.serviceKm}`);
  console.log(`Deadhead km: ${analysis.kpis.deadheadKm}`);
  console.log(`Depot pull-out km: ${analysis.kpis.depotPullOutKm}`);
  console.log(`Depot pull-in km: ${analysis.kpis.depotPullInKm}`);
  console.log(`Total non-service km: ${analysis.kpis.totalNonServiceKm}`);
  console.log(`Deadhead percentage: ${analysis.kpis.deadheadPercentage}%`);
  console.log(`Candidate recommendations: ${recommendations.length}`);
  console.log("Top 10 deadhead pairs:");
  for (const pair of analysis.topDeadheadPairs.slice(0, 10)) {
    console.log(`- ${pair.fromPlaceId} -> ${pair.toPlaceId}: ${pair.distanceKm} km (${pair.eventCount} events, catalog=${pair.catalogCovered})`);
  }
  console.log("Top 10 blocks by deadhead:");
  for (const block of analysis.topBlocksByDeadhead.slice(0, 10)) {
    console.log(`- ${block.blockId}: ${block.totalNonServiceKm} non-service km`);
  }
}

export async function writeAnalysisReport(
  reportPath: string,
  dataset: Awaited<ReturnType<typeof loadOptibusExcelExports>>,
  analysis: ReturnType<typeof analyzeOptibusSchedule>,
  recommendations: ReturnType<typeof generateCandidateRecommendations>,
  demoMode = false,
): Promise<void> {
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, renderReport(dataset, analysis, recommendations, demoMode), "utf8");
}

function renderReport(
  dataset: Awaited<ReturnType<typeof loadOptibusExcelExports>>,
  analysis: ReturnType<typeof analyzeOptibusSchedule>,
  recommendations: ReturnType<typeof generateCandidateRecommendations>,
  demoMode: boolean,
): string {
  return [
    demoMode ? "DEMO DATA — NOT REAL OPTIBUS EXPORTS" : "REAL OPTIBUS EXPORTS LOADED",
    "",
    "# Optibus Data-First Analysis",
    "",
    "## Executive summary",
    "",
    "- Data-first export analysis is active; browser automation and manual guided collection are frozen.",
    demoMode
      ? "- This report is generated from explicit local demo fixtures and must not be treated as real Optibus evidence."
      : "- This report is generated from configured real-mode Optibus Excel exports.",
    "- No login automation, browser clicks, Run, Save, Apply, Publish, or Excel source modification is performed.",
    `- Schedule: ${dataset.context.scheduleName} (${dataset.context.scheduleId})`,
    "",
    "## Files loaded",
    "",
    ...dataset.loadedFiles.map((file) => `- ${file}`),
    "",
    "## Data quality checks",
    "",
    ...analysis.dataQualityChecks.map((check) => `- ${check}`),
    "",
    "## KPI reconciliation",
    "",
    `- Number of service trips: ${analysis.kpis.serviceTrips}`,
    `- Number of vehicle events: ${analysis.kpis.vehicleEvents}`,
    `- Number of crew events: ${analysis.kpis.crewEvents}`,
    `- Number of blocks: ${analysis.kpis.blocks}`,
    `- Number of duties: ${analysis.kpis.duties}`,
    `- Service km: ${analysis.kpis.serviceKm}`,
    `- Deadhead km: ${analysis.kpis.deadheadKm}`,
    `- Depot pull-out km: ${analysis.kpis.depotPullOutKm}`,
    `- Depot pull-in km: ${analysis.kpis.depotPullInKm}`,
    `- Total non-service km: ${analysis.kpis.totalNonServiceKm}`,
    `- Deadhead percentage: ${analysis.kpis.deadheadPercentage}%`,
    "",
    "## Deadhead analysis",
    "",
    `- Catalog coverage: ${analysis.deadheadCatalogCoverage.coveredPairs}/${analysis.deadheadCatalogCoverage.totalDeadheadPairs} pairs (${analysis.deadheadCatalogCoverage.coveragePercent}%)`,
    `- Missing catalog pairs: ${analysis.deadheadCatalogCoverage.missingPairs}`,
    "",
    "## Top deadhead pairs",
    "",
    ...analysis.topDeadheadPairs.slice(0, 10).map((pair) => `- ${pair.fromPlaceId} -> ${pair.toPlaceId}: ${pair.distanceKm} km, ${pair.eventCount} events, catalog covered=${pair.catalogCovered}`),
    "",
    "## Top blocks by deadhead",
    "",
    ...analysis.topBlocksByDeadhead.slice(0, 10).map((block) => `- ${block.blockId}: ${block.totalNonServiceKm} non-service km (deadhead=${block.deadheadKm}, pull-out=${block.depotPullOutKm}, pull-in=${block.depotPullInKm})`),
    "",
    "## Route-level summary",
    "",
    ...analysis.routeSummaries.slice(0, 20).map((route) => `- ${route.routeId} / ${route.sign ?? ""}: ${route.trips} trips, ${route.serviceKm} service km`),
    "",
    "## Depot/place analysis",
    "",
    ...analysis.depotPlaceSummaries.slice(0, 20).map((place) => `- ${place.placeId}: type=${place.type ?? "unknown"}, vehicle events=${place.vehicleEventCount}`),
    "",
    "## Candidate recommendations",
    "",
    ...recommendations.map((recommendation) => `- [${recommendation.priority}] ${recommendation.title} (${recommendation.type}, candidate only)`),
    "",
    "## What must be validated in Optibus before any edit/run",
    "",
    "- Confirm these exports match the intended schedule/version/copy.",
    "- Validate vehicle and duty issue categories from the official validation report.",
    "- Validate preferences, relief points, trip connections, duty types, and hard/soft constraints.",
    "- Validate deadhead catalog gaps against Optibus and external service context before any service recommendation.",
    "- Inspect failed run history/task logs before any optimization retry.",
    "- Obtain explicit human approval before any future controlled run workflow.",
    "",
  ].join("\n");
}

export interface DemoFixtureDetectionResult {
  found: boolean;
  matches: string[];
}

export function detectDemoFixtureData(value: unknown): DemoFixtureDetectionResult {
  const haystack = JSON.stringify(value);
  const markers = ["DepotA", "B2", "B3", "fixture", "demo"];
  const matches = markers.filter((marker) => new RegExp(marker, "i").test(haystack));
  return { found: matches.length > 0, matches };
}

function readOption(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
