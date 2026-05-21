export interface PreRunReadinessChecklist {
  has_copy_or_snapshot?: boolean;
  baseline_kpis_present?: boolean;
  cost_preferences_checked?: boolean;
  depot_setup_checked?: boolean;
  midday_park_checked?: boolean;
  algorithm_parameters_checked?: boolean;
  pre_post_trip_checked?: boolean;
  relief_points_checked?: boolean;
  relief_timing_checked?: boolean;
  trip_connections_checked?: boolean;
  duty_types_checked?: boolean;
  work_limitation_checked?: boolean;
  time_limitations_checked?: boolean;
  split_break_definition_checked?: boolean;
  limit_short_pieces_checked?: boolean;
  crew_relaxation_checked?: boolean;
  global_constraints_checked?: boolean;
  vehicle_piece_validation_ready?: boolean;
  deadhead_catalog_checked?: boolean;
  validation_panel_issues_checked?: boolean;
  algorithm_choice_justified?: boolean;
  advanced_vehicle_adapter_selected?: boolean;
  advanced_vehicle_adapter_warning_accepted?: boolean;
  deep_required?: boolean;
  deep_configured?: boolean;
  pull_reliefs_needed?: boolean;
  pull_reliefs_present?: boolean;
  relief_points_validated?: boolean;
  duty_types_complete?: boolean;
  hard_soft_constraints_known?: boolean;
  validation_issues_classified?: boolean;
}

export interface RunBlocker {
  id: string;
  severity: "high" | "critical";
  summary: string;
  facts: string[];
  risks: string[];
  recommendations: string[];
}

export interface RunReadinessResult {
  allowed: boolean;
  blockers: RunBlocker[];
  checkedItems: ReadinessCheckStatus[];
}

export interface ReadinessCheckStatus {
  id: keyof PreRunReadinessChecklist;
  label: string;
  checked: boolean;
}

export interface OptimizationFailureDiagnosisPlan {
  autoRetryAllowed: false;
  enterFailureDiagnosisMode: true;
  requiredInspections: string[];
  facts: string[];
  risks: string[];
  recommendations: string[];
}

export const REQUIRED_PRE_RUN_CHECKS: Array<{
  id: keyof PreRunReadinessChecklist;
  label: string;
}> = [
  { id: "cost_preferences_checked", label: "Cost preferences" },
  { id: "depot_setup_checked", label: "Depot Setup" },
  { id: "midday_park_checked", label: "Midday Park" },
  { id: "algorithm_parameters_checked", label: "Algorithm Parameters" },
  { id: "pre_post_trip_checked", label: "Pre/Post Trip" },
  { id: "relief_points_checked", label: "Relief Points" },
  { id: "relief_timing_checked", label: "Relief Timing" },
  { id: "trip_connections_checked", label: "Trip Connections" },
  { id: "duty_types_checked", label: "Duty Types" },
  { id: "work_limitation_checked", label: "Work Limitation" },
  { id: "time_limitations_checked", label: "Time Limitations" },
  { id: "split_break_definition_checked", label: "Split Break Definition" },
  { id: "limit_short_pieces_checked", label: "Limit Short Pieces" },
  { id: "crew_relaxation_checked", label: "Crew Relaxation" },
  { id: "global_constraints_checked", label: "Global Constraints" },
  {
    id: "vehicle_piece_validation_ready",
    label: "Vehicle Piece Validation readiness",
  },
  { id: "deadhead_catalog_checked", label: "Deadhead Catalog" },
  { id: "validation_panel_issues_checked", label: "Validation Panel issues" },
];

export const OPTIMIZATION_FAILURE_MESSAGE = "Optimization could not be completed";

export const OPTIMIZATION_FAILURE_INSPECTIONS = [
  "Task log",
  "Algorithm Parameters",
  "No Valid Duty Candidates causes",
  "Too Many Duty Candidates causes",
  "Timeout causes",
  "Relief Points",
  "Duty Types",
  "Limit Short Pieces",
  "Crew Relaxation",
  "Vehicle Piece Validation",
  "Trip Connections",
  "Deadhead Catalog",
];

export class RulesEngine {
  evaluateRunReadiness(
    checklist: PreRunReadinessChecklist,
  ): RunReadinessResult {
    const checkedItems = REQUIRED_PRE_RUN_CHECKS.map((item) => ({
      ...item,
      checked: checklist[item.id] === true,
    }));
    const blockers: RunBlocker[] = [];

    for (const item of checkedItems) {
      if (!item.checked) {
        blockers.push({
          id: `missing-check:${item.id}`,
          severity: "high",
          summary: `${item.label} has not been checked before Run.`,
          facts: [`${item.label} readiness is not confirmed in config/evidence.`],
          risks: ["The agent would be jumping toward Run without required Optibus-specific readiness evidence."],
          recommendations: [`Audit ${item.label} and classify the result before requesting Run approval.`],
        });
      }
    }

    if (!checklist.has_copy_or_snapshot) {
      blockers.push(blocker(
        "no-copy-snapshot",
        "There is no confirmed copy/snapshot.",
        "A real map could be affected without a recoverable baseline.",
        "Create or identify a safe copy/snapshot before any future real Run workflow.",
      ));
    }

    if (!checklist.baseline_kpis_present) {
      blockers.push(blocker(
        "baseline-kpis-missing",
        "Baseline KPIs are missing.",
        "Post-run comparison would not have a reliable baseline.",
        "Collect baseline KPIs in Map Audit Mode.",
      ));
    }

    if (!checklist.algorithm_choice_justified) {
      blockers.push(blocker(
        "algorithm-choice-unjustified",
        "Algorithm choice is not justified.",
        "Run mechanics may not match the scheduling issue being diagnosed.",
        "Document why the selected algorithm is appropriate.",
      ));
    }

    if (
      checklist.advanced_vehicle_adapter_selected &&
      !checklist.advanced_vehicle_adapter_warning_accepted
    ) {
      blockers.push(blocker(
        "advanced-vehicle-adapter-warning-missing",
        "Advanced Vehicle Adapter is selected without explicit warning acceptance.",
        "Vehicle behavior may change in ways reviewers have not acknowledged.",
        "Record an explicit human warning before readiness approval.",
      ));
    }

    if (checklist.deep_required && !checklist.deep_configured) {
      blockers.push(blocker(
        "deep-required-not-configured",
        "DEEP is required but not configured.",
        "Optimization may fail or produce misleading diagnostics.",
        "Configure DEEP or change the scenario assumptions.",
      ));
    }

    if (checklist.pull_reliefs_needed && !checklist.pull_reliefs_present) {
      blockers.push(blocker(
        "pull-reliefs-missing",
        "Pull reliefs are missing when needed.",
        "Duty candidates may be invalid or incomplete.",
        "Validate pull relief availability before readiness approval.",
      ));
    }

    if (!checklist.relief_points_validated) {
      blockers.push(blocker(
        "relief-points-not-validated",
        "Relief Points are not validated.",
        "Relief feasibility is unknown.",
        "Validate Relief Points and document exceptions.",
      ));
    }

    if (!checklist.duty_types_complete) {
      blockers.push(blocker(
        "duty-types-incomplete",
        "Duty Types are incomplete.",
        "No valid duty candidates or excess candidates may result.",
        "Complete Duty Types before readiness approval.",
      ));
    }

    if (!checklist.hard_soft_constraints_known) {
      blockers.push(blocker(
        "constraints-unknown",
        "Hard/Soft constraints are unknown.",
        "The agent cannot explain what constraints may be relaxed or binding.",
        "Classify hard and soft constraints in Scheduling Preferences Audit.",
      ));
    }

    if (!checklist.validation_issues_classified) {
      blockers.push(blocker(
        "validation-issues-unclassified",
        "Validation issues are not classified.",
        "Known validation problems may be ignored before Run.",
        "Classify validation panel issues as blocking, warning, or accepted risk.",
      ));
    }

    return {
      allowed: blockers.length === 0,
      blockers,
      checkedItems,
    };
  }

  diagnoseOptimizationFailure(message: string): OptimizationFailureDiagnosisPlan | undefined {
    if (!message.includes(OPTIMIZATION_FAILURE_MESSAGE)) {
      return undefined;
    }

    return {
      autoRetryAllowed: false,
      enterFailureDiagnosisMode: true,
      requiredInspections: OPTIMIZATION_FAILURE_INSPECTIONS,
      facts: [`Failure message matched: ${OPTIMIZATION_FAILURE_MESSAGE}.`],
      risks: ["Automatic retry could repeat an invalid or expensive optimization attempt without explaining root cause."],
      recommendations: ["Enter Failure Diagnosis Mode and inspect the required Optibus-specific causes before any new run request."],
    };
  }
}

function blocker(
  id: string,
  summary: string,
  risk: string,
  recommendation: string,
): RunBlocker {
  return {
    id,
    severity: "critical",
    summary,
    facts: [summary],
    risks: [risk],
    recommendations: [recommendation],
  };
}
