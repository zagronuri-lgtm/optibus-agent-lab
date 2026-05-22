import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { describeExportsNeededNext } from "./optibusExportIntake";
import type { BaselineKpiSummary, OptibusNormalizedDataset } from "./optibusDataModel";

export interface AnalysisFinding {
  module: string;
  severity: "info" | "warning" | "critical";
  finding: string;
  evidence: string[];
  recommendation?: string;
}

export interface DataFirstAnalysisReport {
  reportPath: string;
  findings: AnalysisFinding[];
  recommendations: string[];
  exportsNeededNext: string[];
}

export function analyzeKpis(kpis: BaselineKpiSummary): AnalysisFinding[] {
  const findings: AnalysisFinding[] = [];
  findings.push({
    module: "KPI analysis",
    severity: "info",
    finding: "Holon baseline KPIs are available from prior collected values.",
    evidence: [
      `Trips: ${kpis.trips}`,
      `Blocks: ${kpis.blocks}`,
      `PVR: ${kpis.pvr}`,
      `Duties: ${kpis.duties}`,
      `Vehicle Efficiency: ${kpis.vehicleEfficiencyPercent}%`,
      `Crew Efficiency: ${kpis.crewEfficiencyPercent}%`,
      `Service km: ${kpis.serviceKm}`,
      `Deadhead km: ${kpis.deadheadKm}`,
      `Deadhead %: ${kpis.deadheadPercent}%`,
    ],
  });
  if ((kpis.deadheadPercent ?? 0) > 15) {
    findings.push({
      module: "Deadhead analysis",
      severity: "warning",
      finding: "Deadhead percentage is high enough to require detailed deadhead export review.",
      evidence: [`Deadhead %: ${kpis.deadheadPercent}%`],
      recommendation: "Use the deadhead report to rank movements by distance/time and test service-from-deadhead candidates with external validation later.",
    });
  }
  return findings;
}

export function analyzeIssues(dataset: OptibusNormalizedDataset): AnalysisFinding[] {
  return dataset.issues.map((issue) => ({
    module: issue.category === "vehicle" ? "Vehicle issue analysis" : "Duty issue analysis",
    severity: issue.severity === "critical" || issue.severity === "error" ? "critical" : "warning",
    finding: issue.message,
    evidence: [
      `Unique count: ${issue.uniqueCount ?? "unknown"}`,
      `Appearance count: ${issue.appearanceCount ?? "unknown"}`,
    ],
    recommendation:
      issue.category === "vehicle"
        ? "Inspect vehicle issue categories, vehicle-piece validation, depot allocation, trip connections, and deadhead coverage."
        : "Inspect duty type conflicts, Regulation 168-related rules, split duties, relief points, and work/time limitations.",
  }));
}

export function analyzeRuns(dataset: OptibusNormalizedDataset): AnalysisFinding[] {
  const failedRuns = dataset.runResults.filter((run) => run.status === "failed");
  if (failedRuns.length === 0) {
    return [];
  }
  return [
    {
      module: "Optimization failure analysis",
      severity: "critical",
      finding: "Prior diagnostic runs failed and optimization failure root cause remains unresolved.",
      evidence: failedRuns.map((run) => `${run.runName}: ${run.algorithmProfile ?? "unknown algorithm"} - ${run.errorMessage ?? "no error message"}`),
      recommendation: "Use run history/exported optimization reports and task logs before any further run planning.",
    },
  ];
}

export function analyzePreferences(dataset: OptibusNormalizedDataset): AnalysisFinding[] {
  return dataset.preferences
    .filter((preference) => String(preference.value ?? "").includes("not"))
    .map((preference) => ({
      module: preference.domain === "trip_connections" ? "Trip connection analysis" : "Preference analysis",
      severity: "warning",
      finding: `${preference.name} is ${preference.value}.`,
      evidence: [`Domain: ${preference.domain}`, `Hard/soft: ${preference.hardOrSoft ?? "unknown"}`],
      recommendation: "Load the preferences report/export or validated screenshots before making run-readiness claims.",
    }));
}

export function buildDataFirstRecommendations(findings: AnalysisFinding[]): string[] {
  const recommendations = new Set<string>();
  recommendations.add("Freeze browser-guided manual collection; prioritize structured Optibus exports.");
  recommendations.add("Reduce deadhead by ranking exported deadhead movements by distance, time, route context, and depot assignment.");
  recommendations.add("Review depot assignment after vehicle schedule and depot capacity exports are available.");
  recommendations.add("Add or adjust relief points only after relief legality, duty issue categories, and driver-rule exports are reviewed.");
  recommendations.add("Identify trips or lines for review from trips/blocks/duties exports plus validation issues.");
  recommendations.add("Identify deadhead movements that may become revenue service only after deadhead export and external network validation.");
  recommendations.add("Identify driver rule / duty type conflicts from duties, crew schedule, issues, and preferences exports.");
  recommendations.add("Explain optimization failure using run history/task reports before any future Run request.");
  if (findings.some((finding) => finding.module.includes("Vehicle"))) {
    recommendations.add("Prioritize vehicle issue categories and vehicle-piece validation before vehicle optimization changes.");
  }
  return [...recommendations];
}

export function buildDataFirstAnalysisReport(
  dataset: OptibusNormalizedDataset,
  kpis: BaselineKpiSummary,
  reportPath = "reports/generated/optibus_data_first_analysis.md",
): DataFirstAnalysisReport {
  const findings = [
    ...analyzeKpis(kpis),
    ...analyzeIssues(dataset),
    ...analyzeRuns(dataset),
    ...analyzePreferences(dataset),
    {
      module: "Candidate service-from-deadhead analysis",
      severity: "info",
      finding: "Candidate service-from-deadhead analysis is defined but requires real deadhead export rows and external validation before recommendations.",
      evidence: dataset.deadheads.map((deadhead) => `${deadhead.fromLocationId ?? "unknown"} -> ${deadhead.toLocationId ?? "unknown"}: ${deadhead.distanceKm ?? "unknown"} km`),
      recommendation: "Do not recommend service additions until deadhead movements are matched to corridor gaps and external service evidence.",
    } satisfies AnalysisFinding,
  ];

  return {
    reportPath,
    findings,
    recommendations: buildDataFirstRecommendations(findings),
    exportsNeededNext: describeExportsNeededNext(),
  };
}

export async function writeDataFirstAnalysisReport(report: DataFirstAnalysisReport): Promise<string> {
  await mkdir(path.dirname(report.reportPath), { recursive: true });
  await writeFile(report.reportPath, renderReport(report), "utf8");
  return report.reportPath;
}

function renderReport(report: DataFirstAnalysisReport): string {
  return [
    "# Optibus Data-First Analysis",
    "",
    "## Executive summary",
    "",
    "- Data-first architecture is active for analysis scaffolding; browser-guided collection is frozen for now.",
    "- This report uses Holon baseline sample data already collected in prior work.",
    "- No real Optibus Run, login automation, Save, Apply, Publish, or map mutation is implemented.",
    "",
    "## Findings",
    "",
    ...report.findings.flatMap(renderFinding),
    "",
    "## Recommendations",
    "",
    ...report.recommendations.map((recommendation) => `- ${recommendation}`),
    "",
    "## Real Optibus exports needed next",
    "",
    ...report.exportsNeededNext.map((item) => `- ${item}`),
    "",
  ].join("\n");
}

function renderFinding(finding: AnalysisFinding): string[] {
  return [
    `### ${finding.module}`,
    "",
    `- Severity: ${finding.severity}`,
    `- Finding: ${finding.finding}`,
    "- Evidence:",
    ...finding.evidence.map((item) => `  - ${item}`),
    ...(finding.recommendation ? [`- Recommendation: ${finding.recommendation}`] : []),
    "",
  ];
}
