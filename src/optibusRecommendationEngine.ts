import type { OptibusExcelDataset } from "./optibusDataModel";
import type { OptibusScheduleAnalysisResult } from "./optibusScheduleAnalysis";

export interface CandidateRecommendation {
  type:
    | "deadhead_to_service"
    | "depot_reassignment_check"
    | "relief_point_check"
    | "trip_connection_check"
    | "deadhead_catalog_gap"
    | "high_cost_block_review"
    | "driver_rule_duty_type_conflict"
    | "optimization_failure_investigation";
  priority: "P0" | "P1" | "P2" | "P3";
  title: string;
  evidence: string[];
  candidateOnly: true;
}

export function generateCandidateRecommendations(
  dataset: OptibusExcelDataset,
  analysis: OptibusScheduleAnalysisResult,
): CandidateRecommendation[] {
  const recommendations: CandidateRecommendation[] = [];
  for (const pair of analysis.topDeadheadPairs.slice(0, 5)) {
    recommendations.push({
      type: "deadhead_to_service",
      priority: "P1",
      title: `Review ${pair.fromPlaceId} -> ${pair.toPlaceId} as a candidate service-from-deadhead opportunity`,
      evidence: [`${pair.eventCount} events`, `${pair.distanceKm} km`, `Catalog covered: ${pair.catalogCovered}`],
      candidateOnly: true,
    });
  }
  for (const block of analysis.topBlocksByDeadhead.slice(0, 5)) {
    recommendations.push({
      type: "high_cost_block_review",
      priority: "P1",
      title: `Review block ${block.blockId} for high non-service km`,
      evidence: [`Non-service km: ${block.totalNonServiceKm}`, `Vehicle: ${block.vehicleId ?? "unknown"}`],
      candidateOnly: true,
    });
  }
  for (const pair of analysis.topDeadheadPairs.filter((pair) => !pair.catalogCovered).slice(0, 5)) {
    recommendations.push({
      type: "deadhead_catalog_gap",
      priority: "P1",
      title: `Check deadhead catalog coverage for ${pair.fromPlaceId} -> ${pair.toPlaceId}`,
      evidence: [`Pair has ${pair.distanceKm} km in schedule events but is not covered by catalog fixture.`],
      candidateOnly: true,
    });
  }
  if (dataset.issues.some((issue) => issue.category === "duty" && issue.uniqueCount > 0)) {
    recommendations.push({
      type: "driver_rule_duty_type_conflict",
      priority: "P0",
      title: "Review driver rule / duty type conflicts before optimization retry",
      evidence: dataset.issues.filter((issue) => issue.category === "duty").map((issue) => `${issue.uniqueCount} unique / ${issue.appearanceCount} appearances`),
      candidateOnly: true,
    });
  }
  if (dataset.runResults?.some?.((run) => run.status === "failed")) {
    recommendations.push({
      type: "optimization_failure_investigation",
      priority: "P0",
      title: "Investigate failed optimization reports before any new run",
      evidence: dataset.runResults.filter((run) => run.status === "failed").map((run) => `${run.runName}: ${run.errorMessage ?? "unknown error"}`),
      candidateOnly: true,
    });
  }
  recommendations.push({
    type: "depot_reassignment_check",
    priority: "P2",
    title: "Check depot reassignment candidates after depot capacities and pull events are validated",
    evidence: analysis.depotPlaceSummaries.slice(0, 5).map((place) => `${place.placeId}: ${place.vehicleEventCount} vehicle events`),
    candidateOnly: true,
  });
  recommendations.push({
    type: "relief_point_check",
    priority: "P1",
    title: "Validate relief points tied to high duty and vehicle issue areas",
    evidence: ["Relief legality requires Optibus preferences export and validation evidence."],
    candidateOnly: true,
  });
  recommendations.push({
    type: "trip_connection_check",
    priority: "P1",
    title: "Review trip connection penalties for high deadhead corridors",
    evidence: analysis.topDeadheadPairs.slice(0, 3).map((pair) => `${pair.fromPlaceId} -> ${pair.toPlaceId}`),
    candidateOnly: true,
  });
  return recommendations;
}
