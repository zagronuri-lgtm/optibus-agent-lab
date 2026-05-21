import { loadKnowledgeBase, isRealKnowledgeBase } from "../../src/knowledgeBase";
import { RulesEngine, OPTIMIZATION_FAILURE_MESSAGE } from "../../src/rulesEngine";

interface CaseResult {
  name: string;
  passed: boolean;
  details: string;
}

async function main(): Promise<void> {
  const rules = new RulesEngine();
  const kb = await loadKnowledgeBase();
  const results: CaseResult[] = [];

  const empty = rules.evaluateRunReadiness({});
  results.push({
    name: "empty readiness blocks run",
    passed: !empty.allowed && empty.blockers.length > 0,
    details: `${empty.blockers.length} blocker(s)`,
  });

  const ready = rules.evaluateRunReadiness({
    has_copy_or_snapshot: true,
    baseline_kpis_present: true,
    cost_preferences_checked: true,
    depot_setup_checked: true,
    midday_park_checked: true,
    algorithm_parameters_checked: true,
    pre_post_trip_checked: true,
    relief_points_checked: true,
    relief_timing_checked: true,
    trip_connections_checked: true,
    duty_types_checked: true,
    work_limitation_checked: true,
    time_limitations_checked: true,
    split_break_definition_checked: true,
    limit_short_pieces_checked: true,
    crew_relaxation_checked: true,
    global_constraints_checked: true,
    vehicle_piece_validation_ready: true,
    deadhead_catalog_checked: true,
    validation_panel_issues_checked: true,
    algorithm_choice_justified: true,
    advanced_vehicle_adapter_selected: false,
    advanced_vehicle_adapter_warning_accepted: false,
    deep_required: false,
    deep_configured: false,
    pull_reliefs_needed: true,
    pull_reliefs_present: true,
    relief_points_validated: true,
    duty_types_complete: true,
    hard_soft_constraints_known: true,
    validation_issues_classified: true,
  });
  results.push({
    name: "complete readiness allows simulated gate",
    passed: ready.allowed,
    details: `${ready.blockers.length} blocker(s)`,
  });

  const diagnosis = rules.diagnoseOptimizationFailure(OPTIMIZATION_FAILURE_MESSAGE);
  results.push({
    name: "optimization failure disables auto retry",
    passed: diagnosis?.autoRetryAllowed === false && diagnosis.enterFailureDiagnosisMode,
    details: `${diagnosis?.requiredInspections.length ?? 0} inspection(s)`,
  });

  results.push({
    name: "real knowledge base clears missing-knowledge gate",
    passed: kb.loaded && isRealKnowledgeBase(kb),
    details: `exists=${kb.loaded}, placeholder=${kb.isPlaceholder}`,
  });

  for (const result of results) {
    console.log(`${result.passed ? "PASS" : "FAIL"}: ${result.name} (${result.details})`);
  }

  if (results.some((result) => !result.passed)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
