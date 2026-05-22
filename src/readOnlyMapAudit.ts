import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { KnowledgeBase } from "./knowledgeBase";

export type ReadinessScore = "READY" | "READY_WITH_WARNINGS" | "NOT_READY";

type DomainStatus =
  | "validated"
  | "present"
  | "not_present"
  | "not_applicable"
  | "unknown"
  | "not_confirmed"
  | "not_performed"
  | "hard_soft_not_classified"
  | string
  | boolean
  | number
  | null
  | undefined;

export interface MapIdentityAudit {
  project?: string;
  dataset?: string;
  schedule_name?: string;
  schedule_id?: string;
  service_day?: string;
  version_copy_snapshot?: string;
  baseline_kpis_exist?: boolean;
}

export interface BaselineKpisAudit {
  trips?: string;
  blocks?: number;
  pvr?: number;
  duties?: number;
  vehicle_efficiency?: string;
  crew_efficiency?: string;
  service_km?: string;
  deadhead_km?: string;
  deadhead_percent?: string;
  total_cost?: string | number | null;
  crew_cost?: string | number | null;
  vehicle_cost?: string | number | null;
  vehicle_issues?: string;
  duty_issues?: string;
}

export interface FailureDiagnosisAudit {
  previous_run_failed_optimization_not_completed?: boolean;
  prior_failed_runs?: string[];
  inspected?: Record<string, boolean>;
}

export interface AlgorithmReadinessAudit {
  selected_algorithm?: string;
  advanced_fixed_blocks_warning_acknowledged?: boolean;
  advanced_vehicle_adapter_tried_and_failed?: boolean;
  vehicle_scheduling_changes_required?: boolean;
  deep_needed?: DomainStatus;
  deep_configured?: DomainStatus;
  pull_reliefs_checked?: DomainStatus;
  algorithm_choice_justification?: string;
}

export interface ReadOnlyMapAuditInput {
  schema_version: number;
  name: string;
  description?: string;
  knowledge_base?: string;
  map_identity?: MapIdentityAudit;
  baseline_kpis?: BaselineKpisAudit;
  mandatory_optimization_preferences?: Record<string, DomainStatus>;
  duty_optimization_readiness?: Record<string, DomainStatus>;
  vehicle_optimization_readiness?: Record<string, DomainStatus>;
  algorithm_readiness?: AlgorithmReadinessAudit;
  failure_diagnosis?: FailureDiagnosisAudit;
  constraints?: {
    hard_soft_constraints_classified?: boolean;
  };
  output?: {
    report_path?: string;
  };
}

export interface RunReadinessAuditResult {
  score: ReadinessScore;
  reportPath: string;
  facts: string[];
  missingData: string[];
  risks: string[];
  blockers: string[];
  recommendations: string[];
  requiredUserApprovals: string[];
}

const BASIC_IDENTITY_FIELDS: Array<[keyof MapIdentityAudit, string]> = [
  ["project", "Project"],
  ["dataset", "Dataset"],
  ["schedule_name", "Schedule name"],
  ["schedule_id", "Schedule ID"],
  ["service_day", "Service day"],
  ["version_copy_snapshot", "Version / Copy / Snapshot"],
];

const BASELINE_KPI_FIELDS: Array<[keyof BaselineKpisAudit, string]> = [
  ["trips", "Trips"],
  ["blocks", "Blocks"],
  ["pvr", "PVR"],
  ["duties", "Duties"],
  ["vehicle_efficiency", "Vehicle Efficiency"],
  ["crew_efficiency", "Crew Efficiency"],
  ["service_km", "Service km"],
  ["deadhead_km", "Deadhead km"],
  ["deadhead_percent", "Deadhead %"],
  ["total_cost", "Total Cost"],
  ["crew_cost", "Crew Cost"],
  ["vehicle_cost", "Vehicle Cost"],
  ["vehicle_issues", "Vehicle Issues"],
  ["duty_issues", "Duty Issues"],
];

const MANDATORY_PREFERENCES: Array<[string, string]> = [
  ["cost", "Cost"],
  ["depot_setup", "Depot Setup"],
  ["midday_park", "Midday Park"],
  ["algorithm_parameters", "Algorithm Parameters"],
  ["pre_post_trip", "Pre/Post Trip"],
  ["deadhead_catalog", "Deadhead Catalog"],
];

const DUTY_READINESS: Array<[string, string]> = [
  ["relief_points", "Relief Points"],
  ["relief_timing", "Relief Timing"],
  ["split_break_definition", "Split Break Definition"],
  ["duty_breaks", "Duty Breaks"],
  ["preference_groups", "Preference Groups"],
  ["travels_travel_catalog", "Travels / Travel Catalog"],
  ["custom_duty_preference", "Custom Duty Preference"],
  ["limit_short_pieces", "Limit Short Pieces"],
  ["crew_relaxation", "Crew Relaxation"],
  ["duty_work_content", "Duty Work Content"],
  ["route_groups", "Route Groups"],
  ["driver_base", "Driver Base"],
  ["time_definitions", "Time Definitions"],
  ["break_rules_break_preferences", "Break Rules / Break Preferences"],
  ["driver_signing", "Driver Signing"],
  ["time_limitations", "Time Limitations"],
  ["work_limitation", "Work Limitation"],
  ["duty_types", "Duty Types"],
  ["global_constraints", "Global Constraints"],
];

const VEHICLE_READINESS: Array<[string, string]> = [
  ["depot_capacity", "Depot capacity"],
  ["midday_park_settings", "Midday Park settings"],
  ["trip_connections", "Trip Connections"],
  ["layovers", "Layovers"],
  ["deadhead_catalog_coverage_indicator", "Deadhead Catalog coverage indicator"],
  ["vehicle_preference_designer", "Vehicle Preference Designer if present"],
  ["vehicle_types_vehicle_groups", "Vehicle Types / Vehicle Groups if present"],
  ["vehicle_piece_validation", "Vehicle Piece Validation"],
];

const FAILURE_INSPECTIONS: Array<[string, string]> = [
  ["task_log", "Task log"],
  ["algorithm_parameters", "Algorithm Parameters"],
  ["no_valid_duty_candidates_causes", "No Valid Duty Candidates causes"],
  ["too_many_duty_candidates_causes", "Too Many Duty Candidates causes"],
  ["timeout_causes", "Timeout causes"],
  ["relief_points", "Relief Points"],
  ["duty_types", "Duty Types"],
  ["limit_short_pieces", "Limit Short Pieces"],
  ["crew_relaxation", "Crew Relaxation"],
  ["vehicle_piece_validation", "Vehicle Piece Validation"],
  ["trip_connections", "Trip Connections"],
  ["deadhead_catalog", "Deadhead Catalog"],
];

export class ReadOnlyMapAudit {
  constructor(private readonly knowledgeBase: KnowledgeBase) {}

  async run(input: ReadOnlyMapAuditInput): Promise<RunReadinessAuditResult> {
    const result = this.evaluate(input);
    await mkdir(path.dirname(result.reportPath), { recursive: true });
    await writeFile(result.reportPath, this.renderMarkdown(input, result), "utf8");
    return result;
  }

  evaluate(input: ReadOnlyMapAuditInput): RunReadinessAuditResult {
    const facts: string[] = [];
    const missingData: string[] = [];
    const risks: string[] = [];
    const blockers: string[] = [];
    const recommendations: string[] = [];
    const requiredUserApprovals: string[] = [];

    facts.push(`Knowledge base loaded: ${this.knowledgeBase.loaded}.`);
    facts.push(`Knowledge base placeholder: ${this.knowledgeBase.isPlaceholder}.`);
    facts.push("Audit mode is read-only; no browser clicks, login, Save, Apply, Publish, or Run are performed.");

    for (const [field, label] of BASIC_IDENTITY_FIELDS) {
      const value = input.map_identity?.[field];
      if (hasValue(value)) {
        facts.push(`${label}: ${value}.`);
      } else {
        missingData.push(`${label} is missing.`);
      }
    }

    if (input.map_identity?.baseline_kpis_exist === true) {
      facts.push("Baseline KPIs exist.");
    } else {
      blockers.push("Baseline KPIs are missing or not confirmed.");
    }

    for (const [field, label] of BASELINE_KPI_FIELDS) {
      const value = input.baseline_kpis?.[field];
      if (hasValue(value)) {
        facts.push(`${label}: ${value}.`);
      } else {
        missingData.push(`${label} is missing.`);
      }
    }

    this.auditDomain(
      input.mandatory_optimization_preferences,
      MANDATORY_PREFERENCES,
      "Mandatory optimization preference",
      missingData,
      blockers,
    );
    this.auditDomain(
      input.duty_optimization_readiness,
      DUTY_READINESS,
      "Duty optimization readiness",
      missingData,
      blockers,
    );
    this.auditDomain(
      input.vehicle_optimization_readiness,
      VEHICLE_READINESS,
      "Vehicle optimization readiness",
      missingData,
      blockers,
    );

    this.auditAlgorithm(input, facts, missingData, risks, blockers, recommendations);
    this.auditFailureDiagnosis(input, facts, blockers, recommendations);

    if (input.constraints?.hard_soft_constraints_classified !== true) {
      blockers.push("Hard/soft constraints are not fully classified.");
      recommendations.push("Classify hard and soft constraints before Controlled Run Mode.");
    }

    const vehicleIssueCount = parseFirstInteger(input.baseline_kpis?.vehicle_issues);
    if (vehicleIssueCount !== undefined && vehicleIssueCount >= 100) {
      blockers.push(`Vehicle Issues are high: ${input.baseline_kpis?.vehicle_issues}.`);
      risks.push("High vehicle issue count can invalidate vehicle optimization readiness.");
    }

    const dutyIssueCount = parseFirstInteger(input.baseline_kpis?.duty_issues);
    if (dutyIssueCount !== undefined && dutyIssueCount >= 30) {
      blockers.push(`Duty Issues are high: ${input.baseline_kpis?.duty_issues}.`);
      risks.push("High duty issue count can indicate infeasible or unstable duty candidates.");
    }

    if (!this.knowledgeBase.loaded || this.knowledgeBase.isPlaceholder) {
      blockers.push("Real Optibus knowledge base is missing or placeholder.");
    }

    requiredUserApprovals.push("Approval token required for Controlled Run Mode: APPROVE:Controlled Run Mode:Run.");
    requiredUserApprovals.push("Human approval required for algorithm selection and any accepted validation risks.");

    if (blockers.length > 0) {
      recommendations.push("Do not enter Controlled Run Mode until blockers are resolved.");
    }
    recommendations.push("Advanced Fixed Blocks is the recommended/default algorithm in most cases.");
    recommendations.push("Vehicle Adapter and Advanced Vehicle Adapter are deprecated/not recommended unless explicitly justified.");

    const score = scoreReadiness(blockers, risks, missingData);
    return {
      score,
      reportPath: input.output?.report_path ?? "reports/generated/run_readiness_audit.md",
      facts: unique(facts),
      missingData: unique(missingData),
      risks: unique(risks),
      blockers: unique(blockers),
      recommendations: unique(recommendations),
      requiredUserApprovals: unique(requiredUserApprovals),
    };
  }

  private auditDomain(
    values: Record<string, DomainStatus> | undefined,
    required: Array<[string, string]>,
    domain: string,
    missingData: string[],
    blockers: string[],
  ): void {
    for (const [key, label] of required) {
      const value = values?.[key];
      if (isReadyStatus(value)) {
        continue;
      }

      const message = `${domain} not confirmed: ${label} (${formatValue(value)}).`;
      missingData.push(message);
      blockers.push(message);
    }
  }

  private auditAlgorithm(
    input: ReadOnlyMapAuditInput,
    facts: string[],
    missingData: string[],
    risks: string[],
    blockers: string[],
    recommendations: string[],
  ): void {
    const algorithm = input.algorithm_readiness;
    facts.push("Advanced Fixed Blocks is the recommended/default algorithm in most cases.");
    risks.push("Vehicle Adapter and Advanced Vehicle Adapter are deprecated/not recommended unless explicitly justified.");

    if (algorithm?.selected_algorithm) {
      facts.push(`Selected algorithm: ${algorithm.selected_algorithm}.`);
    } else {
      missingData.push("Selected algorithm is missing.");
      blockers.push("Algorithm choice is not confirmed.");
    }

    if (!hasValue(algorithm?.algorithm_choice_justification)) {
      blockers.push("Algorithm choice is not justified.");
    }

    if (algorithm?.advanced_vehicle_adapter_tried_and_failed) {
      blockers.push("Advanced Vehicle Adapter was tried and failed.");
      risks.push("Advanced Vehicle Adapter is deprecated/not recommended and failed in prior diagnostics.");
    }

    if (algorithm?.vehicle_scheduling_changes_required) {
      recommendations.push("Vehicle scheduling changes are required; confirm whether DEEP / Algorithm Parameters are needed.");
      if (!isReadyStatus(algorithm.deep_configured)) {
        blockers.push("Algorithm Parameters / DEEP readiness is not confirmed.");
      }
      if (!isReadyStatus(algorithm.pull_reliefs_checked)) {
        blockers.push("Pull Reliefs in Trip Connections are not confirmed for DEEP readiness.");
      }
    }
  }

  private auditFailureDiagnosis(
    input: ReadOnlyMapAuditInput,
    facts: string[],
    blockers: string[],
    recommendations: string[],
  ): void {
    const failure = input.failure_diagnosis;
    if (!failure?.previous_run_failed_optimization_not_completed) {
      return;
    }

    facts.push("Previous run failed with Optimization could not be completed.");
    if (failure.prior_failed_runs?.length) {
      blockers.push(`Prior runs failed: ${failure.prior_failed_runs.join(", ")}.`);
    }

    for (const [key, label] of FAILURE_INSPECTIONS) {
      if (failure.inspected?.[key] !== true) {
        blockers.push(`Failure diagnosis inspection required: ${label}.`);
        recommendations.push(`Inspect ${label} before retrying or requesting Controlled Run Mode.`);
      }
    }
  }

  private renderMarkdown(
    input: ReadOnlyMapAuditInput,
    result: RunReadinessAuditResult,
  ): string {
    return [
      "# Run Readiness Audit",
      "",
      "## Summary",
      "",
      `- Audit: ${input.name}`,
      `- Readiness result: ${result.score}`,
      `- Knowledge base: ${this.knowledgeBase.path}`,
      `- Knowledge base loaded: ${this.knowledgeBase.loaded}`,
      `- Knowledge base placeholder: ${this.knowledgeBase.isPlaceholder}`,
      "- Browser mode: not used",
      "- Real Run: not implemented",
      "",
      renderListSection("Facts", result.facts),
      "",
      renderListSection("Missing data", result.missingData),
      "",
      renderListSection("Risks", result.risks),
      "",
      renderListSection("Blockers", result.blockers),
      "",
      renderListSection("Recommendations", result.recommendations),
      "",
      renderListSection("Required user approvals", result.requiredUserApprovals),
      "",
    ].join("\n");
  }
}

function scoreReadiness(
  blockers: string[],
  risks: string[],
  missingData: string[],
): ReadinessScore {
  if (blockers.length > 0) {
    return "NOT_READY";
  }
  if (risks.length > 0 || missingData.length > 0) {
    return "READY_WITH_WARNINGS";
  }
  return "READY";
}

function isReadyStatus(value: DomainStatus): boolean {
  return value === true || value === "validated" || value === "present" || value === "not_applicable";
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function formatValue(value: DomainStatus): string {
  if (value === undefined) {
    return "missing";
  }
  if (value === null) {
    return "null";
  }
  return String(value);
}

function parseFirstInteger(value: string | undefined): number | undefined {
  const match = value?.match(/\d+/);
  return match ? Number(match[0]) : undefined;
}

function renderListSection(title: string, values: string[]): string {
  return [`## ${title}`, "", values.length ? values.map((value) => `- ${value}`).join("\n") : "_None._"].join("\n");
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
