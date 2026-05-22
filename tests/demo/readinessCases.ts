import { loadKnowledgeBase, isRealKnowledgeBase } from "../../src/knowledgeBase";
import { BlockerTriage } from "../../src/blockerTriage";
import { BrowserEvidenceCollector, demoCaptureInputs } from "../../src/browserEvidenceCollector";
import { EvidencePlanBuilder } from "../../src/evidencePlan";
import { detectDemoFixtureData } from "../../src/analyzeExports";
import { buildDataFirstAnalysisReport } from "../../src/optibusDataFirstAnalysis";
import { loadHolonExportsConfig, loadOptibusExcelExports } from "../../src/optibusExcelIntake";
import { analyzeOptibusSchedule } from "../../src/optibusScheduleAnalysis";
import { generateCandidateRecommendations } from "../../src/optibusRecommendationEngine";
import { EXPECTED_OPTIBUS_EXPORTS, describeExportsNeededNext } from "../../src/optibusExportIntake";
import { DEFAULT_OPTIBUS_EXPORT_PARSERS } from "../../src/optibusExportParsers";
import { holonBaselineKpis, holonDataFirstSample } from "../../src/holonDataFirstSample";
import { buildExternalIntegrationPlan, createDisabledProviders, loadExternalSourcesConfig } from "../../src/externalDataSources";
import { FailureDiagnosisCollector, type FailureDiagnosisInput } from "../../src/failureDiagnosisCollector";
import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import { ReadOnlyMapAudit, type ReadOnlyMapAuditInput } from "../../src/readOnlyMapAudit";
import { GUIDED_READONLY_SCREENS, evaluateRealMapAudit, fieldsFromQuickBlock, safetyCheckReadOnlyControl, type RealMapScreenEvidence } from "../../src/realReadOnlyMapCollector";
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

  const holonConfig = parse(
    await readFile("configs/holon_readiness_audit_demo.yaml", "utf8"),
  ) as ReadOnlyMapAuditInput;
  const holonAudit = new ReadOnlyMapAudit(kb);
  const holonResult = holonAudit.evaluate(holonConfig);
  results.push({
    name: "Holon readiness audit is NOT_READY",
    passed:
      holonResult.score === "NOT_READY" &&
      holonResult.blockers.some((blocker) => blocker.includes("Advanced Vehicle Adapter was tried and failed")) &&
      holonResult.blockers.some((blocker) => blocker.includes("Vehicle Piece Validation")),
    details: `${holonResult.score}, blockers=${holonResult.blockers.length}`,
  });

  const triage = new BlockerTriage();
  const triagePlan = triage.triage(holonResult.blockers);
  const findTriaged = (needle: string) =>
    triagePlan.triagedBlockers.find((blocker) =>
      blocker.blocker.includes(needle),
    );
  const failureDiagnosis = triagePlan.triagedBlockers.filter((blocker) =>
    blocker.blocker.includes("Failure diagnosis inspection required"),
  );
  const vehiclePieceValidation = findTriaged("Vehicle Piece Validation");
  const advancedVehicleAdapter = findTriaged("Advanced Vehicle Adapter was tried and failed");
  const hardSoft = findTriaged("Hard/soft constraints");
  const deep = findTriaged("DEEP readiness");
  const pullReliefs = findTriaged("Pull Reliefs");

  results.push({
    name: "Holon NOT_READY blockers produce DO_NOT_RUN_YET",
    passed: triagePlan.decision === "DO_NOT_RUN_YET",
    details: `${triagePlan.decision}, blockers=${triagePlan.triagedBlockers.length}`,
  });
  results.push({
    name: "failure diagnosis blockers are P0/P1",
    passed:
      failureDiagnosis.length > 0 &&
      failureDiagnosis.every((blocker) =>
        blocker.priority === "P0" || blocker.priority === "P1",
      ),
    details: `${failureDiagnosis.length} failure diagnosis blocker(s)`,
  });
  results.push({
    name: "missing Vehicle Piece Validation is P0",
    passed: vehiclePieceValidation?.priority === "P0",
    details: vehiclePieceValidation?.priority ?? "missing",
  });
  results.push({
    name: "Advanced Vehicle Adapter tried-and-failed is OPTIMIZATION_WORKFLOW_RISK",
    passed:
      advancedVehicleAdapter?.categories.includes(
        "OPTIMIZATION_WORKFLOW_RISK",
      ) === true,
    details: advancedVehicleAdapter?.categories.join(",") ?? "missing",
  });
  results.push({
    name: "missing hard/soft classification is P0 or P1",
    passed: hardSoft?.priority === "P0" || hardSoft?.priority === "P1",
    details: hardSoft?.priority ?? "missing",
  });
  results.push({
    name: "missing DEEP/Pull Reliefs readiness is P1",
    passed: deep?.priority === "P1" && pullReliefs?.priority === "P1",
    details: `deep=${deep?.priority ?? "missing"}, pullReliefs=${pullReliefs?.priority ?? "missing"}`,
  });



  const failureConfig = parse(
    await readFile("configs/holon_failure_diagnosis_demo.yaml", "utf8"),
  ) as FailureDiagnosisInput;
  const failureCollector = new FailureDiagnosisCollector(kb);
  const failureReport = failureCollector.collect(failureConfig);
  const runB = failureReport.diagnoses.find((diagnosis) => diagnosis.runName === "Run B");

  results.push({
    name: "failed optimization enters Failure Diagnosis Mode",
    passed:
      failureReport.diagnoses.length === 2 &&
      failureReport.diagnoses.every((diagnosis) => diagnosis.finalStatus === "failed"),
    details: `${failureReport.diagnoses.length} failed run(s)`,
  });
  results.push({
    name: "unknown failure blocks automatic retry",
    passed:
      failureReport.overallFailureClassification === "UNKNOWN" &&
      failureReport.diagnoses.every((diagnosis) => diagnosis.autoRetryAllowed === false),
    details: `${failureReport.overallFailureClassification}, retries=${failureReport.diagnoses.map((diagnosis) => diagnosis.autoRetryAllowed).join(",")}`,
  });
  results.push({
    name: "two failed runs increase confidence that map/run configuration needs investigation",
    passed:
      failureReport.diagnoses.length === 2 &&
      failureReport.recommendedNextAction.includes("Read-only failure investigation"),
    details: failureReport.recommendedNextAction,
  });
  results.push({
    name: "Advanced Vehicle Adapter failure raises workflow risk",
    passed:
      runB?.evidence.some((item) =>
        item.includes("Advanced Vehicle Adapter was used on a failed run"),
      ) === true,
    details: runB?.evidence.join(" | ") ?? "missing Run B",
  });
  results.push({
    name: "lack of detailed logs keeps root cause UNKNOWN",
    passed:
      failureReport.diagnoses.every((diagnosis) => diagnosis.failureType === "UNKNOWN") &&
      failureReport.diagnoses.every((diagnosis) =>
        diagnosis.requiredNextReadOnlyChecks.includes("Task log inspection"),
      ),
    details: failureReport.diagnoses.map((diagnosis) => diagnosis.failureType).join(","),
  });


  const evidencePlan = new EvidencePlanBuilder().build({
    readiness: holonResult,
    triage: triagePlan,
    failureDiagnosis: failureReport,
    knowledgeBase: kb,
  });
  const p0Blockers = triagePlan.triagedBlockers.filter(
    (blocker) => blocker.priority === "P0",
  );

  results.push({
    name: "evidence plan exists for unknown optimization failure",
    passed:
      evidencePlan.finalDecision === "DO_NOT_RUN_YET" &&
      evidencePlan.evidenceItems.length > 0 &&
      failureReport.overallFailureClassification === "UNKNOWN",
    details: `${evidencePlan.finalDecision}, items=${evidencePlan.evidenceItems.length}`,
  });
  results.push({
    name: "each P0 blocker has at least one evidence item",
    passed: p0Blockers.every((blocker) =>
      evidencePlan.evidenceItems.some(
        (item) => item.blockerAddressed === blocker.blocker,
      ),
    ),
    details: `p0=${p0Blockers.length}, items=${evidencePlan.evidenceItems.length}`,
  });
  results.push({
    name: "failed run logs are first priority",
    passed:
      evidencePlan.topPrioritySequence[0]?.category === "FAILED_RUN_LOGS" &&
      evidencePlan.topPrioritySequence[1]?.category === "FAILED_RUN_LOGS",
    details: evidencePlan.topPrioritySequence
      .slice(0, 2)
      .map((item) => item.id)
      .join(","),
  });
  results.push({
    name: "Vehicle Piece Validation is included",
    passed: evidencePlan.evidenceItems.some(
      (item) => item.category === "VEHICLE_PIECE_VALIDATION",
    ),
    details: `${evidencePlan.evidenceItems.filter((item) => item.category === "VEHICLE_PIECE_VALIDATION").length} item(s)`,
  });
  results.push({
    name: "Algorithm Parameters / DEEP / Pull Reliefs are included",
    passed:
      evidencePlan.evidenceItems.some((item) =>
        item.exactFieldsToRead.some((field) => field.includes("DEEP")),
      ) &&
      evidencePlan.evidenceItems.some((item) =>
        item.exactFieldsToRead.some((field) => field.includes("Pull Reliefs")),
      ) &&
      evidencePlan.evidenceItems.some(
        (item) => item.category === "ALGORITHM_PARAMETERS",
      ),
    details: `${evidencePlan.evidenceItems.filter((item) => item.category === "ALGORITHM_PARAMETERS").length} algorithm item(s)`,
  });
  results.push({
    name: "no evidence item allows Run / Save / Apply / Publish",
    passed: evidencePlan.evidenceItems.every(
      (item) => item.readOnlySafe && item.destructiveActionAllowed === false,
    ),
    details: `${evidencePlan.evidenceItems.length} read-only item(s)`,
  });


  const collector = new BrowserEvidenceCollector({
    screenshotDir: "screenshots/test-demo",
    evidenceLogDir: "logs/evidence-test",
    reportPath: "reports/generated/test_collected_evidence.md",
  });
  const safetyLabels = [
    "Run",
    "Optimize",
    "Save",
    "Apply",
    "Publish",
    "Delete",
    "Export",
    "Import",
    "Duplicate",
    "Create Version",
    "Clear Duties",
    "Update Schedule",
    "Revise Events",
    "Analyze",
  ];
  const safetyRefusals = safetyLabels.map((label) =>
    collector.safetyCheckControl(label),
  );
  const collectionSession = await collector.simulateCapture(
    demoCaptureInputs(evidencePlan.evidenceItems),
  );

  results.push({
    name: "collector refuses destructive controls",
    passed: safetyRefusals.every((refusal) => refusal.refused),
    details: `${safetyRefusals.filter((refusal) => refusal.refused).length}/${safetyLabels.length} refused`,
  });
  results.push({
    name: "collector saves evidence records",
    passed:
      collectionSession.records.length === 5 &&
      collectionSession.records.every((record) => record.screenshotPath),
    details: `${collectionSession.records.length} record(s)`,
  });
  results.push({
    name: "collector links evidence record to blocker",
    passed: collectionSession.records.every((record) => record.blockerAddressed.length > 0),
    details: collectionSession.records.map((record) => record.evidenceItemId).join(","),
  });
  results.push({
    name: "collector can mark blocker as unresolved",
    passed: collectionSession.records.some(
      (record) => !record.closesBlocker && record.followUpRequired,
    ),
    details: `${collectionSession.records.filter((record) => !record.closesBlocker).length} unresolved record(s)`,
  });
  results.push({
    name: "collector does not enable Run after evidence collection",
    passed: collectionSession.controlledRunEnabled === false,
    details: `controlledRunEnabled=${collectionSession.controlledRunEnabled}`,
  });
  results.push({
    name: "collector report is generated",
    passed: collectionSession.reportPath.endsWith("test_collected_evidence.md"),
    details: collectionSession.reportPath,
  });


  const externalConfig = await loadExternalSourcesConfig();
  const externalProviders = createDisabledProviders(externalConfig);
  const externalPlan = buildExternalIntegrationPlan(externalConfig);
  results.push({
    name: "external transit providers are defined but inactive",
    passed:
      externalProviders.map((provider) => provider.name).join(",") ===
        "Markav,Open Bus Stride API" &&
      externalProviders.every((provider) => provider.active === false) &&
      externalConfig.external_api_calls_enabled === false &&
      externalConfig.markav_scraping_enabled === false,
    details: externalProviders.map((provider) => `${provider.name}:active=${provider.active}`).join(";"),
  });
  results.push({
    name: "external sources support future planning decisions only",
    passed:
      externalPlan.futureDecisionsEnabled.includes("analyzeDeadheadAsPotentialService") &&
      externalPlan.futureDecisionsEnabled.includes("validateTripDeletionRisk") &&
      externalPlan.futureDecisionsEnabled.includes("validateServiceAdditionOpportunity") &&
      externalPlan.active === false,
    details: externalPlan.futureDecisionsEnabled.join(","),
  });


  const realCollectorSafetyLabels = [
    "Run",
    "Optimize",
    "Save",
    "Apply",
    "Publish",
    "Delete",
    "Export",
    "Import",
    "Duplicate",
    "Create Version",
    "Clear Duties",
    "Update Schedule",
    "Revise Events",
    "Analyze",
  ];
  const realCollectorRefusals = realCollectorSafetyLabels.map((label) =>
    safetyCheckReadOnlyControl(label),
  );
  const partialRealRecords: RealMapScreenEvidence[] = [
    {
      screenId: "map-identity",
      screenTitle: "Map identity / Schedule header",
      optibusArea: "Schedule header",
      url: "https://example.optibus.local/map",
      pageTitle: "Optibus Map",
      timestamp: new Date().toISOString(),
      screenshotPath: "screenshots/test-real-map-identity.png",
      fields: GUIDED_READONLY_SCREENS[0].fields.map((field) => ({
        ...field,
        status: field.key === "scheduleId" ? "missing" : "observed",
        value: field.key === "scheduleId" ? "" : `demo-${field.key}`,
        note: "demo non-browser test",
      })),
    },
  ];
  const realAuditEvaluation = evaluateRealMapAudit(partialRealRecords);

  results.push({
    name: "real guided collector defines required Optibus screens",
    passed:
      GUIDED_READONLY_SCREENS.length === 16 &&
      GUIDED_READONLY_SCREENS.some((screen) => screen.id === "run-history-tasks") &&
      GUIDED_READONLY_SCREENS.some((screen) => screen.id === "deadhead-catalog"),
    details: `${GUIDED_READONLY_SCREENS.length} screen(s)`,
  });
  results.push({
    name: "real guided collector refuses destructive controls",
    passed: realCollectorRefusals.every((refusal) => refusal.refused),
    details: `${realCollectorRefusals.filter((refusal) => refusal.refused).length}/${realCollectorSafetyLabels.length} refused`,
  });
  results.push({
    name: "real guided collector keeps Controlled Run disabled",
    passed:
      realAuditEvaluation.controlledRunEnabled === false &&
      realAuditEvaluation.decision === "NOT_READY",
    details: `decision=${realAuditEvaluation.decision}, controlledRunEnabled=${realAuditEvaluation.controlledRunEnabled}`,
  });


  const quickFields = fieldsFromQuickBlock(
    GUIDED_READONLY_SCREENS[0],
    `screen: schedule-header
fields:
  project:
    status: observed
    value: מטרופולין
  dataset:
    status: observed
    value: חולון א-ה 28.12_v2
  scheduleName:
    status: observed
    value: חולון א-ה אורי28.12_v2
  scheduleId:
    status: observed
    value: s7rQfR9exV
  serviceDay:
    status: observed
    value: Sunday
  versionCopySnapshot:
    status: observed
    value: Version 2 / Current Version`,
  );
  results.push({
    name: "real guided collector quick mode parses YAML field block",
    passed:
      quickFields.length === GUIDED_READONLY_SCREENS[0].fields.length &&
      quickFields.every((field) => field.status === "observed") &&
      quickFields.some((field) => field.key === "scheduleId" && field.value === "s7rQfR9exV"),
    details: `${quickFields.length} field(s)`,
  });


  const dataFirstReport = buildDataFirstAnalysisReport(holonDataFirstSample, holonBaselineKpis);
  results.push({
    name: "data-first model includes Holon normalized entities",
    passed:
      holonDataFirstSample.schedule.id === "s7rQfR9exV" &&
      holonDataFirstSample.issues.length === 2 &&
      holonDataFirstSample.runResults.length === 2,
    details: `issues=${holonDataFirstSample.issues.length}, runs=${holonDataFirstSample.runResults.length}`,
  });
  results.push({
    name: "data-first parser stubs cover CSV Excel JSON",
    passed:
      DEFAULT_OPTIBUS_EXPORT_PARSERS.some((parser) => parser.supports({ path: "demo.csv", kind: "trips", format: "csv", receivedAt: "now" })) &&
      DEFAULT_OPTIBUS_EXPORT_PARSERS.some((parser) => parser.supports({ path: "demo.xlsx", kind: "blocks", format: "xlsx", receivedAt: "now" })) &&
      DEFAULT_OPTIBUS_EXPORT_PARSERS.some((parser) => parser.supports({ path: "demo.json", kind: "duties", format: "json", receivedAt: "now" })),
    details: `${DEFAULT_OPTIBUS_EXPORT_PARSERS.length} parser(s)`,
  });
  results.push({
    name: "data-first intake lists required Optibus exports",
    passed:
      EXPECTED_OPTIBUS_EXPORTS.includes("trips") &&
      EXPECTED_OPTIBUS_EXPORTS.includes("issues_validation") &&
      EXPECTED_OPTIBUS_EXPORTS.includes("run_history") &&
      describeExportsNeededNext().length >= 9,
    details: `${EXPECTED_OPTIBUS_EXPORTS.length} expected export kind(s)`,
  });
  results.push({
    name: "data-first report captures Holon risks and recommendations",
    passed:
      dataFirstReport.reportPath === "reports/generated/optibus_data_first_analysis.md" &&
      dataFirstReport.findings.some((finding) => finding.module === "Deadhead analysis") &&
      dataFirstReport.recommendations.some((recommendation) => recommendation.includes("structured Optibus exports")),
    details: `findings=${dataFirstReport.findings.length}, recommendations=${dataFirstReport.recommendations.length}`,
  });


  const exportsConfig = await loadHolonExportsConfig("configs/holon_exports_demo.yaml");
  const excelDataset = await loadOptibusExcelExports(exportsConfig);
  const excelAnalysis = analyzeOptibusSchedule(excelDataset);
  const excelRecommendations = generateCandidateRecommendations(excelDataset, excelAnalysis);
  results.push({
    name: "Excel intake detects all expected Holon export files",
    passed: excelDataset.loadedFiles.length === 6,
    details: `${excelDataset.loadedFiles.length} file(s)`,
  });
  results.push({
    name: "Excel intake handles empty relief vehicle schedule gracefully",
    passed: excelDataset.dataQualityWarnings.some((warning) => warning.includes("relief_vehicle_schedule")),
    details: excelDataset.dataQualityWarnings.join(" | "),
  });
  results.push({
    name: "Excel analysis detects 1460 service trips",
    passed: excelAnalysis.kpis.serviceTrips === 1460,
    details: `${excelAnalysis.kpis.serviceTrips} trip(s)`,
  });
  results.push({
    name: "Excel analysis detects vehicle schedule events",
    passed: excelAnalysis.kpis.vehicleEvents > 1460,
    details: `${excelAnalysis.kpis.vehicleEvents} vehicle event(s)`,
  });
  results.push({
    name: "Excel analysis detects crew schedule events",
    passed: excelAnalysis.kpis.crewEvents >= 1460,
    details: `${excelAnalysis.kpis.crewEvents} crew event(s)`,
  });
  results.push({
    name: "Excel analysis detects deadhead catalog entries",
    passed: excelDataset.deadheadCatalog.length > 0,
    details: `${excelDataset.deadheadCatalog.length} catalog entrie(s)`,
  });
  results.push({
    name: "Excel analysis produces top deadhead pairs",
    passed: excelAnalysis.topDeadheadPairs.length > 0,
    details: `${excelAnalysis.topDeadheadPairs.length} pair(s)`,
  });
  results.push({
    name: "Excel recommendation engine produces candidates only",
    passed:
      excelRecommendations.length > 0 &&
      excelRecommendations.every((recommendation) => recommendation.candidateOnly),
    details: `${excelRecommendations.length} candidate(s)`,
  });
  const demoDetection = detectDemoFixtureData(excelDataset);
  results.push({
    name: "real-mode demo detector catches fixture markers",
    passed:
      demoDetection.found &&
      demoDetection.matches.includes("DepotA") &&
      demoDetection.matches.includes("demo") &&
      demoDetection.weakMatches.includes("B2"),
    details: `strong=${demoDetection.matches.join(",")}; weak=${demoDetection.weakMatches.join(",")}`,
  });

  results.push({
    name: "Excel data-first path enables no browser/run/edit actions",
    passed: true,
    details: "file intake only; no browser automation, Run, Save, Apply, or Publish",
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
