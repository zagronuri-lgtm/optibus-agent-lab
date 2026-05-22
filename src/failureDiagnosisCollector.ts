import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { KnowledgeBase } from "./knowledgeBase";

export type FailureType =
  | "NO_VALID_DUTY_CANDIDATES"
  | "TOO_MANY_DUTY_CANDIDATES"
  | "TIMEOUT"
  | "INFEASIBLE_CONSTRAINTS"
  | "RELIEF_POINT_FAILURE"
  | "DUTY_TYPE_FAILURE"
  | "MIDDAY_PARK_FAILURE"
  | "TRIP_CONNECTION_FAILURE"
  | "DEADHEAD_CATALOG_FAILURE"
  | "ALGORITHM_CONFIGURATION_FAILURE"
  | "INTERNAL_ERROR"
  | "UNKNOWN";

export interface FailureRunInput {
  run_name: string;
  task_name?: string;
  schedule_id?: string;
  run_type?: string;
  algorithm_profile_used?: string;
  optimize_vehicles?: boolean;
  optimize_duties?: boolean;
  algorithm_iterations?: number | null;
  duty_recut_iterations?: number | null;
  allow_unscheduled_duties?: boolean;
  time_started?: string | null;
  time_ended?: string | null;
  duration?: string | null;
  final_status?: string;
  full_error_message?: string;
  evidence?: string[];
}

export interface FailureDiagnosisInput {
  schema_version: number;
  name: string;
  description?: string;
  knowledge_base?: string;
  schedule_id?: string;
  runs: FailureRunInput[];
  output?: {
    report_path?: string;
  };
}

export interface RunFailureDiagnosis {
  runName: string;
  taskName?: string;
  scheduleId?: string;
  runType?: string;
  algorithmProfileUsed?: string;
  optimizeVehicles?: boolean;
  optimizeDuties?: boolean;
  algorithmIterations?: number | null;
  dutyRecutIterations?: number | null;
  allowUnscheduledDuties?: boolean;
  timeStarted?: string | null;
  timeEnded?: string | null;
  duration?: string | null;
  finalStatus?: string;
  fullErrorMessage?: string;
  failureType: FailureType;
  evidence: string[];
  confidenceScore: number;
  requiredNextReadOnlyChecks: string[];
  optibusSupportRecommended: boolean;
  autoRetryAllowed: boolean;
  operationalRisk: "LOW" | "MEDIUM" | "HIGH";
}

export interface FailureDiagnosisReport {
  reportPath: string;
  diagnoses: RunFailureDiagnosis[];
  overallFailureClassification: FailureType;
  recommendedNextAction: string;
  summary: string[];
  optibusSupportRecommended: boolean;
}

const GENERIC_OPTIMIZATION_FAILURE = "Optimization could not be completed";

const UNKNOWN_FAILURE_REQUIRED_CHECKS = [
  "Task log inspection",
  "Algorithm Parameters inspection",
  "Vehicle Piece Validation",
  "Relief Points validation",
  "Duty Types validation",
  "Limit Short Pieces / Crew Relaxation inspection",
  "Trip Connections inspection",
  "Deadhead Catalog coverage check",
];

export class FailureDiagnosisCollector {
  constructor(private readonly knowledgeBase: KnowledgeBase) {}

  collect(input: FailureDiagnosisInput): FailureDiagnosisReport {
    const diagnoses = input.runs.map((run) => this.diagnoseRun(run));
    const unknownCount = diagnoses.filter((diagnosis) => diagnosis.failureType === "UNKNOWN").length;
    const failedCount = diagnoses.filter((diagnosis) => isFailedStatus(diagnosis.finalStatus)).length;
    const supportRecommended = diagnoses.some((diagnosis) => diagnosis.optibusSupportRecommended);

    return {
      reportPath: input.output?.report_path ?? "reports/generated/holon_failure_diagnosis.md",
      diagnoses,
      overallFailureClassification: unknownCount > 0 ? "UNKNOWN" : diagnoses[0]?.failureType ?? "UNKNOWN",
      recommendedNextAction:
        "Read-only failure investigation: inspect task logs and configuration evidence before any B2 or retry decision.",
      summary: [
        `${failedCount}/${diagnoses.length} runs failed.`,
        unknownCount > 0
          ? "Failure type remains UNKNOWN unless logs expose more detail."
          : "Failure type was classified from available evidence.",
        "Automatic retry is forbidden for unresolved optimization failures.",
        "Next action is read-only failure investigation, not B2.",
        supportRecommended
          ? "Optibus Support may be needed if technical logs do not expose root cause."
          : "Optibus Support is not required by current evidence.",
      ],
      optibusSupportRecommended: supportRecommended,
    };
  }

  async writeReport(report: FailureDiagnosisReport): Promise<string> {
    await mkdir(path.dirname(report.reportPath), { recursive: true });
    await writeFile(report.reportPath, renderReport(report, this.knowledgeBase), "utf8");
    return report.reportPath;
  }

  private diagnoseRun(run: FailureRunInput): RunFailureDiagnosis {
    const message = run.full_error_message ?? "";
    const failureType = classifyFailureType(message);
    const genericUnknown =
      message.includes(GENERIC_OPTIMIZATION_FAILURE) && failureType === "UNKNOWN";
    const advancedVehicleAdapterFailure =
      /advanced vehicle adapter/i.test(run.algorithm_profile_used ?? "") &&
      isFailedStatus(run.final_status);
    const evidence = [...(run.evidence ?? [])];

    if (genericUnknown) {
      evidence.push("Generic optimization failure message is present without exposed root-cause detail.");
    }
    if (advancedVehicleAdapterFailure) {
      evidence.push("Advanced Vehicle Adapter was used on a failed run, raising optimization workflow risk.");
    }

    return {
      runName: run.run_name,
      taskName: run.task_name,
      scheduleId: run.schedule_id,
      runType: run.run_type,
      algorithmProfileUsed: run.algorithm_profile_used,
      optimizeVehicles: run.optimize_vehicles,
      optimizeDuties: run.optimize_duties,
      algorithmIterations: run.algorithm_iterations,
      dutyRecutIterations: run.duty_recut_iterations,
      allowUnscheduledDuties: run.allow_unscheduled_duties,
      timeStarted: run.time_started,
      timeEnded: run.time_ended,
      duration: run.duration,
      finalStatus: run.final_status,
      fullErrorMessage: run.full_error_message,
      failureType,
      evidence,
      confidenceScore: confidenceFor(run, failureType, genericUnknown),
      requiredNextReadOnlyChecks: genericUnknown
        ? UNKNOWN_FAILURE_REQUIRED_CHECKS
        : checksForFailureType(failureType),
      optibusSupportRecommended: genericUnknown || failureType === "INTERNAL_ERROR",
      autoRetryAllowed: false,
      operationalRisk: genericUnknown ? "HIGH" : "MEDIUM",
    };
  }
}

export function classifyFailureType(message: string): FailureType {
  const lower = message.toLowerCase();
  if (lower.includes("no valid duty candidate")) {
    return "NO_VALID_DUTY_CANDIDATES";
  }
  if (lower.includes("too many duty candidate")) {
    return "TOO_MANY_DUTY_CANDIDATES";
  }
  if (lower.includes("timeout") || lower.includes("timed out")) {
    return "TIMEOUT";
  }
  if (lower.includes("infeasible constraint") || lower.includes("infeasible")) {
    return "INFEASIBLE_CONSTRAINTS";
  }
  if (lower.includes("relief point")) {
    return "RELIEF_POINT_FAILURE";
  }
  if (lower.includes("duty type")) {
    return "DUTY_TYPE_FAILURE";
  }
  if (lower.includes("midday park")) {
    return "MIDDAY_PARK_FAILURE";
  }
  if (lower.includes("trip connection")) {
    return "TRIP_CONNECTION_FAILURE";
  }
  if (lower.includes("deadhead catalog")) {
    return "DEADHEAD_CATALOG_FAILURE";
  }
  if (lower.includes("algorithm parameter") || lower.includes("algorithm configuration")) {
    return "ALGORITHM_CONFIGURATION_FAILURE";
  }
  if (lower.includes("internal error") || lower.includes("unexpected error")) {
    return "INTERNAL_ERROR";
  }
  return "UNKNOWN";
}

function checksForFailureType(failureType: FailureType): string[] {
  switch (failureType) {
    case "NO_VALID_DUTY_CANDIDATES":
      return ["Duty Types validation", "Relief Points validation", "Limit Short Pieces / Crew Relaxation inspection"];
    case "TOO_MANY_DUTY_CANDIDATES":
      return ["Duty Types validation", "Algorithm Parameters inspection", "Crew Relaxation inspection"];
    case "TIMEOUT":
      return ["Task log inspection", "Algorithm Parameters inspection", "Timeout causes inspection"];
    case "RELIEF_POINT_FAILURE":
      return ["Relief Points validation", "Relief Timing validation"];
    case "DUTY_TYPE_FAILURE":
      return ["Duty Types validation", "Work Limitation inspection", "Time Limitations inspection"];
    case "TRIP_CONNECTION_FAILURE":
      return ["Trip Connections inspection", "Pull Reliefs inspection"];
    case "DEADHEAD_CATALOG_FAILURE":
      return ["Deadhead Catalog coverage check"];
    case "ALGORITHM_CONFIGURATION_FAILURE":
      return ["Algorithm Parameters inspection", "DEEP configuration inspection"];
    default:
      return UNKNOWN_FAILURE_REQUIRED_CHECKS;
  }
}

function confidenceFor(
  run: FailureRunInput,
  failureType: FailureType,
  genericUnknown: boolean,
): number {
  if (genericUnknown) {
    return 0.35;
  }
  if (failureType !== "UNKNOWN") {
    return run.evidence?.length ? 0.8 : 0.65;
  }
  return 0.25;
}

function isFailedStatus(status: string | undefined): boolean {
  return (status ?? "").toLowerCase() === "failed";
}

function renderReport(report: FailureDiagnosisReport, knowledgeBase: KnowledgeBase): string {
  return [
    "# Holon Failure Diagnosis",
    "",
    "## Executive summary",
    "",
    ...report.summary.map((item) => `- ${item}`),
    `- Overall failure classification: ${report.overallFailureClassification}`,
    `- Recommended next action: ${report.recommendedNextAction}`,
    `- Knowledge base loaded: ${knowledgeBase.loaded}`,
    `- Knowledge base placeholder: ${knowledgeBase.isPlaceholder}`,
    "- Safety: read-only; no login, real Run, Save, Apply, Publish, or destructive click is implemented.",
    "",
    "## Run diagnoses",
    "",
    ...report.diagnoses.flatMap(renderDiagnosis),
    "",
  ].join("\n");
}

function renderDiagnosis(diagnosis: RunFailureDiagnosis): string[] {
  return [
    `### ${diagnosis.runName}`,
    "",
    `- Task name: ${diagnosis.taskName ?? "unknown"}`,
    `- Schedule ID: ${diagnosis.scheduleId ?? "unknown"}`,
    `- Run type: ${diagnosis.runType ?? "unknown"}`,
    `- Algorithm/Profile used: ${diagnosis.algorithmProfileUsed ?? "unknown"}`,
    `- Optimize vehicles: ${formatBoolean(diagnosis.optimizeVehicles)}`,
    `- Optimize duties: ${formatBoolean(diagnosis.optimizeDuties)}`,
    `- Algorithm iterations: ${diagnosis.algorithmIterations ?? "unknown"}`,
    `- Duty recut iterations: ${diagnosis.dutyRecutIterations ?? "unknown"}`,
    `- Time started: ${diagnosis.timeStarted ?? "unknown"}`,
    `- Time ended: ${diagnosis.timeEnded ?? "unknown"}`,
    `- Duration: ${diagnosis.duration ?? "unknown"}`,
    `- Final status: ${diagnosis.finalStatus ?? "unknown"}`,
    `- Full error message: ${diagnosis.fullErrorMessage ?? "unknown"}`,
    `- Failure type classification: ${diagnosis.failureType}`,
    `- Confidence score: ${diagnosis.confidenceScore.toFixed(2)}`,
    `- Operational risk: ${diagnosis.operationalRisk}`,
    `- Auto retry allowed: ${diagnosis.autoRetryAllowed}`,
    `- Optibus Support recommended: ${diagnosis.optibusSupportRecommended}`,
    "",
    "#### Evidence",
    "",
    ...diagnosis.evidence.map((item) => `- ${item}`),
    "",
    "#### Required next read-only checks",
    "",
    ...diagnosis.requiredNextReadOnlyChecks.map((item) => `- ${item}`),
    "",
  ];
}

function formatBoolean(value: boolean | undefined): string {
  if (value === undefined) {
    return "unknown";
  }
  return value ? "ON" : "OFF";
}
