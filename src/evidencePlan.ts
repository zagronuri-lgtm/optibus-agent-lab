import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { KnowledgeBase } from "./knowledgeBase";
import type { BlockerTriagePlan, TriagedBlocker, TriageDecision } from "./blockerTriage";
import type { FailureDiagnosisReport } from "./failureDiagnosisCollector";
import type { RunReadinessAuditResult } from "./readOnlyMapAudit";

export type EvidencePriority = "P0" | "P1" | "P2" | "P3";

export type EvidenceCategory =
  | "FAILED_RUN_LOGS"
  | "ALGORITHM_PARAMETERS"
  | "VEHICLE_PIECE_VALIDATION"
  | "RELIEF_POINTS_RELIEF_TIMING"
  | "DUTY_TYPES_DRIVER_RULES"
  | "TRIP_CONNECTIONS"
  | "DEADHEAD_CATALOG"
  | "MIDDAY_PARK_DEPOTS"
  | "VALIDATION_PANEL";

export interface EvidenceItem {
  id: string;
  category: EvidenceCategory;
  blockerAddressed: string;
  optibusScreenPath: string;
  exactFieldsToRead: string[];
  expectedEvidence: string;
  readOnlySafe: boolean;
  requiresUserApproval: boolean;
  screenshotRequired: boolean;
  priority: EvidencePriority;
  decisionEnabled: string;
  destructiveActionAllowed: false;
}

export interface EvidencePlanInput {
  readiness: RunReadinessAuditResult;
  triage: BlockerTriagePlan;
  failureDiagnosis: FailureDiagnosisReport;
  knowledgeBase: KnowledgeBase;
  reportPath?: string;
}

export interface EvidenceCollectionPlan {
  reportPath: string;
  finalDecision: TriageDecision;
  evidenceItems: EvidenceItem[];
  topPrioritySequence: EvidenceItem[];
  summary: string[];
}

const REPORT_PATH = "reports/generated/holon_evidence_collection_plan.md";

export class EvidencePlanBuilder {
  build(input: EvidencePlanInput): EvidenceCollectionPlan {
    const items = enforceP0Coverage(
      [...baseHolonEvidenceItems(input), ...supportItemsFromFailure(input.failureDiagnosis)],
      input.triage.triagedBlockers,
    );
    const sorted = sortEvidenceItems(uniqueEvidenceItems(items));

    return {
      reportPath: input.reportPath ?? REPORT_PATH,
      finalDecision: input.triage.decision,
      evidenceItems: sorted,
      topPrioritySequence: sorted.slice(0, 15),
      summary: [
        "Evidence collection is read-only and simulated; no Optibus clicks, login, Run, Save, Apply, or Publish are implemented.",
        `Knowledge base loaded: ${input.knowledgeBase.loaded}; placeholder: ${input.knowledgeBase.isPlaceholder}.`,
        `Readiness score: ${input.readiness.score}.`,
        `Triage decision: ${input.triage.decision}.`,
        `Failure classification: ${input.failureDiagnosis.overallFailureClassification}.`,
      ],
    };
  }

  async writeReport(plan: EvidenceCollectionPlan): Promise<string> {
    await mkdir(path.dirname(plan.reportPath), { recursive: true });
    await writeFile(plan.reportPath, renderReport(plan), "utf8");
    return plan.reportPath;
  }
}

function baseHolonEvidenceItems(input: EvidencePlanInput): EvidenceItem[] {
  return [
    item({
      id: "FRL-001",
      category: "FAILED_RUN_LOGS",
      blockerAddressed: "Prior runs failed: Run A, Run B.",
      optibusScreenPath: "Runs / Tasks / Run A / Task log",
      exactFieldsToRead: ["Run name", "Task name", "Full error message", "Final status", "Technical details if visible"],
      expectedEvidence: "Run A task log confirms Driver-only Diagnostic failure and any exposed root-cause details.",
      priority: "P0",
      decisionEnabled: "Confirms whether Run A failure is generic UNKNOWN or exposes a specific diagnosis path.",
    }),
    item({
      id: "FRL-002",
      category: "FAILED_RUN_LOGS",
      blockerAddressed: "Prior runs failed: Run A, Run B.",
      optibusScreenPath: "Runs / Tasks / Run B / Task log",
      exactFieldsToRead: ["Run name", "Task name", "Full error message", "Algorithm iterations", "Technical details if visible"],
      expectedEvidence: "Run B task log confirms Vehicle + Driver Diagnostic failure after Advanced Vehicle Adapter attempt.",
      priority: "P0",
      decisionEnabled: "Confirms whether Advanced Vehicle Adapter failure has a visible technical root cause.",
    }),
    item({
      id: "FRL-003",
      category: "FAILED_RUN_LOGS",
      blockerAddressed: "Failure type remains UNKNOWN unless logs expose more detail.",
      optibusScreenPath: "Runs / Tasks / Run A and Run B / Details",
      exactFieldsToRead: ["Full error message", "Failure type evidence", "Time limit / timeout", "Time started", "Time ended", "Duration"],
      expectedEvidence: "Full failed-run context showing whether timeout, infeasible constraints, duty candidates, or internal error details are visible.",
      priority: "P0",
      decisionEnabled: "Determines whether UNKNOWN can be reclassified before any further diagnostic path.",
    }),
    item({
      id: "FRL-004",
      category: "FAILED_RUN_LOGS",
      blockerAddressed: "Optibus Support may be needed if technical logs do not expose root cause.",
      optibusScreenPath: "Runs / Tasks / Technical details if visible",
      exactFieldsToRead: ["Error code", "Stack or internal reference if visible", "Task ID", "Timestamp", "Tenant/map identifiers"],
      expectedEvidence: "Support-ready bug report details if task logs do not expose a user-actionable cause.",
      priority: "P1",
      decisionEnabled: "Decides whether Optibus Support should receive a bug report.",
    }),
    item({
      id: "ALG-001",
      category: "ALGORITHM_PARAMETERS",
      blockerAddressed: "Algorithm Parameters / DEEP readiness is not confirmed.",
      optibusScreenPath: "Run setup / Algorithm Parameters",
      exactFieldsToRead: ["Current algorithm template", "AFB / DEEP / other", "DEEP configured", "Retention ratio", "Iteration parameters"],
      expectedEvidence: "Current algorithm configuration and whether it matches Advanced Fixed Blocks or DEEP expectations.",
      priority: "P0",
      decisionEnabled: "Determines whether algorithm setup blocks all run attempts or allows a later diagnostic proposal.",
    }),
    item({
      id: "ALG-002",
      category: "ALGORITHM_PARAMETERS",
      blockerAddressed: "Advanced Vehicle Adapter was tried and failed.",
      optibusScreenPath: "Run setup / Algorithm selection",
      exactFieldsToRead: ["Selected algorithm/profile", "Advanced Fixed Blocks availability", "Vehicle Adapter", "Advanced Vehicle Adapter", "Justification note if present"],
      expectedEvidence: "Evidence that Vehicle Adapter / Advanced Vehicle Adapter is deprecated/not recommended unless explicitly justified.",
      priority: "P1",
      decisionEnabled: "Supports a user decision to prefer Advanced Fixed Blocks or document why another algorithm is required.",
    }),
    item({
      id: "ALG-003",
      category: "ALGORITHM_PARAMETERS",
      blockerAddressed: "Pull Reliefs in Trip Connections are not confirmed for DEEP readiness.",
      optibusScreenPath: "Algorithm Parameters / DEEP and Trip Connections",
      exactFieldsToRead: ["DEEP required", "DEEP configured", "Pull Reliefs required", "Pull Reliefs configured"],
      expectedEvidence: "Whether vehicle scheduling changes require DEEP and whether Pull Reliefs are configured.",
      priority: "P1",
      decisionEnabled: "Determines whether DEEP/Pull Reliefs readiness remains a blocker.",
    }),
    item({
      id: "VPV-001",
      category: "VEHICLE_PIECE_VALIDATION",
      blockerAddressed: "Vehicle optimization readiness not confirmed: Vehicle Piece Validation (not_performed).",
      optibusScreenPath: "Validation / Vehicle Piece Validation",
      exactFieldsToRead: ["Failing vehicle pieces", "Vehicle IDs", "Routes/trips in invalid pieces", "Validation reason", "Suggested cause if visible"],
      expectedEvidence: "Vehicle Piece Validation results showing whether pieces are cuttable and which vehicles to inspect first.",
      priority: "P0",
      decisionEnabled: "Determines whether vehicle scheduling evidence is safe enough for any later run request.",
    }),
    item({
      id: "VPV-002",
      category: "VEHICLE_PIECE_VALIDATION",
      blockerAddressed: "Vehicle Issues are high: 120 unique / 251 appearances.",
      optibusScreenPath: "Validation / Vehicle issues / Filtered by most frequent vehicles",
      exactFieldsToRead: ["Unique vehicle issues", "Appearances", "Vehicle IDs", "Routes", "Times", "Issue category"],
      expectedEvidence: "Prioritized vehicle list: highest issue appearances first, then common route/time clusters.",
      priority: "P0",
      decisionEnabled: "Chooses the first vehicles for read-only inspection and separates systemic issues from duplicates.",
    }),
    item({
      id: "RLF-001",
      category: "RELIEF_POINTS_RELIEF_TIMING",
      blockerAddressed: "Duty optimization readiness not confirmed: Relief Points (unknown).",
      optibusScreenPath: "Scheduling Preferences / Relief Points",
      exactFieldsToRead: ["Relief point preference", "Rידינג", "עתידים", "וולפסון", "הבנאי", "שיכון ובינוי", "Placement / all-day / all routes logic"],
      expectedEvidence: "Whether key Holon relief points are legal and how broadly each applies.",
      priority: "P1",
      decisionEnabled: "Determines whether relief point legality explains duty or vehicle-piece failures.",
    }),
    item({
      id: "RLF-002",
      category: "RELIEF_POINTS_RELIEF_TIMING",
      blockerAddressed: "Duty optimization readiness not confirmed: Relief Timing (unknown).",
      optibusScreenPath: "Scheduling Preferences / Relief Timing",
      exactFieldsToRead: ["Relief timing preference", "Drive to relief setting", "Timing windows", "All-day/all-routes logic"],
      expectedEvidence: "Relief timing rules and drive-to-relief configuration.",
      priority: "P1",
      decisionEnabled: "Determines whether relief timing rules cause missing or invalid duty candidates.",
    }),
    item({
      id: "DUT-001",
      category: "DUTY_TYPES_DRIVER_RULES",
      blockerAddressed: "Duty optimization readiness not confirmed: Duty Types (unknown).",
      optibusScreenPath: "Scheduling Preferences / Duty Types",
      exactFieldsToRead: ["Not allowed duty type", "Duty Types", "Duty Work Content", "Custom Duty Preference", "Homogeneity groups"],
      expectedEvidence: "Duty type completeness and whether any duty type blocks valid duty candidates.",
      priority: "P0",
      decisionEnabled: "Determines whether duty type configuration blocks all further optimization attempts.",
    }),
    item({
      id: "DUT-002",
      category: "DUTY_TYPES_DRIVER_RULES",
      blockerAddressed: "Duty Issues are high: 34 unique / 44 appearances.",
      optibusScreenPath: "Validation / Duty issues / Issue categories",
      exactFieldsToRead: ["Unique duty issues", "Appearances", "Duty IDs", "Issue category", "Dismissed issues"],
      expectedEvidence: "Duty issue categories and whether issues are blocking, warnings, or accepted risks.",
      priority: "P0",
      decisionEnabled: "Determines which duty rules require read-only investigation before user decisions.",
    }),
    item({
      id: "DUT-003",
      category: "DUTY_TYPES_DRIVER_RULES",
      blockerAddressed: "Hard/soft constraints are not fully classified.",
      optibusScreenPath: "Scheduling Preferences / Driver Rules / Global Constraints",
      exactFieldsToRead: ["Work Limitation", "Time Limitations", "Long schedule break", "תקנה", "Split Break Definition", "Break rules"],
      expectedEvidence: "Hard versus soft classification for driver rules and global constraints.",
      priority: "P0",
      decisionEnabled: "Enables user decision on which constraints can be relaxed or must remain hard.",
    }),
    item({
      id: "TRP-001",
      category: "TRIP_CONNECTIONS",
      blockerAddressed: "Vehicle optimization readiness not confirmed: Trip Connections (unknown).",
      optibusScreenPath: "Vehicle Preferences / Trip Connections",
      exactFieldsToRead: ["26 + 126", "רידינג", "עתידים", "22 + 35 + 77", "Allow / Disallow / Prefer / Penalize", "Penalty values"],
      expectedEvidence: "Trip connection rules for key Holon route groups and points.",
      priority: "P1",
      decisionEnabled: "Determines whether trip connection penalties or disallows explain invalid pieces.",
    }),
    item({
      id: "TRP-002",
      category: "TRIP_CONNECTIONS",
      blockerAddressed: "Pull Reliefs in Trip Connections are not confirmed for DEEP readiness.",
      optibusScreenPath: "Vehicle Preferences / Trip Connections / Pull Reliefs",
      exactFieldsToRead: ["Pull Reliefs", "Allow/Disallow/Prefer/Penalize", "Penalty values", "Applied route groups"],
      expectedEvidence: "Pull Relief settings required for DEEP or vehicle scheduling changes.",
      priority: "P1",
      decisionEnabled: "Determines whether DEEP-related Pull Relief configuration blocks later diagnostics.",
    }),
    item({
      id: "DHC-001",
      category: "DEADHEAD_CATALOG",
      blockerAddressed: "Mandatory optimization preference not confirmed: Deadhead Catalog (unknown).",
      optibusScreenPath: "Preferences / Deadhead Catalog",
      exactFieldsToRead: ["Catalog name", "Coverage indicator", "Missing pairs between key points", "Generated deadheads if any"],
      expectedEvidence: "Deadhead Catalog coverage for key depots, route points, and relief points.",
      priority: "P1",
      decisionEnabled: "Determines whether missing deadhead pairs can explain vehicle-piece or trip-connection failures.",
    }),
    item({
      id: "DHC-002",
      category: "DEADHEAD_CATALOG",
      blockerAddressed: "Deadhead Catalog coverage may require validation/export later.",
      optibusScreenPath: "Preferences / Deadhead Catalog / Coverage details",
      exactFieldsToRead: ["Validation status", "Missing pairs", "Export availability if later approved"],
      expectedEvidence: "Whether later validation/export is needed after approval; no export in v1.",
      priority: "P2",
      decisionEnabled: "Identifies whether a future approved export/validation request is needed.",
    }),
    item({
      id: "MDP-001",
      category: "MIDDAY_PARK_DEPOTS",
      blockerAddressed: "Mandatory optimization preference not confirmed: Depot Setup (unknown).",
      optibusScreenPath: "Vehicle Preferences / Depot Setup",
      exactFieldsToRead: ["Depot setup", "Capacities", "Vehicle groups", "Issues clustered by vehicles/routes/times"],
      expectedEvidence: "Depot capacity and setup evidence for vehicle scheduling feasibility.",
      priority: "P1",
      decisionEnabled: "Determines whether depot capacity/settings explain vehicle issue clusters.",
    }),
    item({
      id: "MDP-002",
      category: "MIDDAY_PARK_DEPOTS",
      blockerAddressed: "Mandatory optimization preference not confirmed: Midday Park (unknown).",
      optibusScreenPath: "Vehicle Preferences / Midday Park",
      exactFieldsToRead: ["Midday ON/OFF", "Minimal break length", "Minimum park time", "Park cost"],
      expectedEvidence: "Midday Park rules and cost settings.",
      priority: "P1",
      decisionEnabled: "Determines whether midday parking constraints contribute to vehicle-piece failures.",
    }),
    item({
      id: "VAL-001",
      category: "VALIDATION_PANEL",
      blockerAddressed: "Vehicle Issues are high: 120 unique / 251 appearances.",
      optibusScreenPath: "Validation Panel / Vehicle issues",
      exactFieldsToRead: ["Vehicle issues by category", "Unique vs appearances", "Dismissed issues", "Filters by problematic vehicles"],
      expectedEvidence: "Vehicle validation panel breakdown by category and duplicates.",
      priority: "P0",
      decisionEnabled: "Separates vehicle blockers from repeated appearances before remediation planning.",
    }),
    item({
      id: "VAL-002",
      category: "VALIDATION_PANEL",
      blockerAddressed: "Duty Issues are high: 34 unique / 44 appearances.",
      optibusScreenPath: "Validation Panel / Duty issues",
      exactFieldsToRead: ["Duty issues by category", "Unique vs appearances", "Dismissed issues", "Filters by problematic duties"],
      expectedEvidence: "Duty validation panel breakdown by category and duplicates.",
      priority: "P0",
      decisionEnabled: "Separates duty blockers from repeated appearances before remediation planning.",
    }),
  ];
}

function supportItemsFromFailure(input: FailureDiagnosisReport): EvidenceItem[] {
  if (!input.optibusSupportRecommended) {
    return [];
  }
  return [
    item({
      id: "SUP-001",
      category: "FAILED_RUN_LOGS",
      blockerAddressed: "Optibus Support may be needed if technical logs do not expose root cause.",
      optibusScreenPath: "Runs / Failed tasks / Support evidence packet",
      exactFieldsToRead: ["Task IDs", "Run names", "Schedule ID", "Full error messages", "Technical details if visible"],
      expectedEvidence: "A read-only support packet containing screenshots and task identifiers if root cause remains hidden.",
      priority: "P1",
      decisionEnabled: "Decides whether to escalate to Optibus Support with sufficient evidence.",
    }),
  ];
}

function enforceP0Coverage(items: EvidenceItem[], blockers: TriagedBlocker[]): EvidenceItem[] {
  const existing = [...items];
  const p0Blockers = blockers.filter((blocker) => blocker.priority === "P0");
  let index = 1;
  for (const blocker of p0Blockers) {
    if (existing.some((item) => item.blockerAddressed === blocker.blocker)) {
      continue;
    }
    existing.push(
      item({
        id: `P0-COVER-${String(index).padStart(3, "0")}`,
        category: inferCategory(blocker.blocker),
        blockerAddressed: blocker.blocker,
        optibusScreenPath: "Relevant Optibus read-only screen from blocker triage",
        exactFieldsToRead: ["Visible setting", "Visible issue detail", "Screenshot evidence", "Owner notes if visible"],
        expectedEvidence: `Read-only evidence that explains or resolves P0 blocker: ${blocker.blocker}`,
        priority: "P0",
        decisionEnabled: "Determines whether this P0 blocker can be downgraded or remains a no-run condition.",
      }),
    );
    index += 1;
  }
  return existing;
}

function inferCategory(blocker: string): EvidenceCategory {
  const lower = blocker.toLowerCase();
  if (lower.includes("task log") || lower.includes("prior runs") || lower.includes("failure diagnosis")) {
    return "FAILED_RUN_LOGS";
  }
  if (lower.includes("algorithm") || lower.includes("deep") || lower.includes("adapter")) {
    return "ALGORITHM_PARAMETERS";
  }
  if (lower.includes("vehicle piece")) {
    return "VEHICLE_PIECE_VALIDATION";
  }
  if (lower.includes("relief")) {
    return "RELIEF_POINTS_RELIEF_TIMING";
  }
  if (lower.includes("duty") || lower.includes("work") || lower.includes("time limitation")) {
    return "DUTY_TYPES_DRIVER_RULES";
  }
  if (lower.includes("trip connection")) {
    return "TRIP_CONNECTIONS";
  }
  if (lower.includes("deadhead")) {
    return "DEADHEAD_CATALOG";
  }
  if (lower.includes("depot") || lower.includes("midday")) {
    return "MIDDAY_PARK_DEPOTS";
  }
  return "VALIDATION_PANEL";
}

function item(input: Omit<EvidenceItem, "readOnlySafe" | "requiresUserApproval" | "screenshotRequired" | "destructiveActionAllowed">): EvidenceItem {
  return {
    ...input,
    readOnlySafe: true,
    requiresUserApproval: false,
    screenshotRequired: true,
    destructiveActionAllowed: false,
  };
}

function sortEvidenceItems(items: EvidenceItem[]): EvidenceItem[] {
  const priorityOrder: EvidencePriority[] = ["P0", "P1", "P2", "P3"];
  const categoryOrder: EvidenceCategory[] = [
    "FAILED_RUN_LOGS",
    "ALGORITHM_PARAMETERS",
    "VEHICLE_PIECE_VALIDATION",
    "RELIEF_POINTS_RELIEF_TIMING",
    "DUTY_TYPES_DRIVER_RULES",
    "TRIP_CONNECTIONS",
    "DEADHEAD_CATALOG",
    "MIDDAY_PARK_DEPOTS",
    "VALIDATION_PANEL",
  ];
  return [...items].sort((a, b) => {
    const priorityDelta = priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }
    const categoryDelta = categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
    if (categoryDelta !== 0) {
      return categoryDelta;
    }
    return a.id.localeCompare(b.id);
  });
}

function uniqueEvidenceItems(items: EvidenceItem[]): EvidenceItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

function renderReport(plan: EvidenceCollectionPlan): string {
  return [
    "# Holon Evidence Collection Plan",
    "",
    "## Executive summary",
    "",
    ...plan.summary.map((item) => `- ${item}`),
    `- Evidence items: ${plan.evidenceItems.length}`,
    `- Final decision: ${plan.finalDecision}`,
    "",
    "## Top-priority sequence: first 15 evidence items",
    "",
    ...plan.topPrioritySequence.map((item, index) => renderNumberedItem(item, index + 1)),
    "",
    "## Evidence items by investigation area",
    "",
    ...renderByCategory(plan.evidenceItems),
    "",
  ].join("\n");
}

function renderNumberedItem(item: EvidenceItem, index: number): string {
  return `${index}. **${item.id}** [${item.priority}] ${item.category} - ${item.blockerAddressed}\n   - Screen/path: ${item.optibusScreenPath}\n   - Fields: ${item.exactFieldsToRead.join("; ")}\n   - Expected evidence: ${item.expectedEvidence}\n   - Read-only safe: ${yesNo(item.readOnlySafe)}\n   - Requires user approval: ${yesNo(item.requiresUserApproval)}\n   - Screenshot required: ${yesNo(item.screenshotRequired)}\n   - Decision enabled: ${item.decisionEnabled}`;
}

function renderByCategory(items: EvidenceItem[]): string[] {
  const categories = [...new Set(items.map((item) => item.category))];
  return categories.flatMap((category) => [
    `### ${category}`,
    "",
    ...items.filter((item) => item.category === category).map((item) => `- **${item.id}** [${item.priority}] ${item.blockerAddressed}`),
    "",
  ]);
}

function yesNo(value: boolean): "yes" | "no" {
  return value ? "yes" : "no";
}
