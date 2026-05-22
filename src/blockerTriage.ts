import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export type BlockerCategory =
  | "CRITICAL_RUN_BLOCKER"
  | "MISSING_EVIDENCE"
  | "CONFIGURATION_RISK"
  | "OPTIMIZATION_WORKFLOW_RISK"
  | "DATA_QUALITY_RISK"
  | "CAN_BE_CHECKED_READ_ONLY"
  | "REQUIRES_USER_DECISION"
  | "REQUIRES_OPTIBUS_SUPPORT";

export type BlockerPriority = "P0" | "P1" | "P2" | "P3";

export type TriageDecision =
  | "DO_NOT_RUN_YET"
  | "CAN_RUN_DIAGNOSTIC"
  | "CAN_RUN_PRODUCTION";

export interface TriagedBlocker {
  blocker: string;
  categories: BlockerCategory[];
  priority: BlockerPriority;
  rationale: string;
  nextAction: string;
}

export interface BlockerTriagePlan {
  decision: TriageDecision;
  triagedBlockers: TriagedBlocker[];
  topNextActions: string[];
  reportPath: string;
}

const ALL_CATEGORIES: BlockerCategory[] = [
  "CRITICAL_RUN_BLOCKER",
  "MISSING_EVIDENCE",
  "CONFIGURATION_RISK",
  "OPTIMIZATION_WORKFLOW_RISK",
  "DATA_QUALITY_RISK",
  "CAN_BE_CHECKED_READ_ONLY",
  "REQUIRES_USER_DECISION",
  "REQUIRES_OPTIBUS_SUPPORT",
];

const PRIORITIES: BlockerPriority[] = ["P0", "P1", "P2", "P3"];

export class BlockerTriage {
  triage(
    blockers: string[],
    reportPath = "reports/generated/holon_blocker_triage.md",
  ): BlockerTriagePlan {
    const triagedBlockers = blockers.map((blocker) => this.classify(blocker));
    const decision = decide(triagedBlockers);

    return {
      decision,
      triagedBlockers,
      topNextActions: nextTenActions(triagedBlockers),
      reportPath,
    };
  }

  async writeReport(plan: BlockerTriagePlan): Promise<string> {
    await mkdir(path.dirname(plan.reportPath), { recursive: true });
    await writeFile(plan.reportPath, renderReport(plan), "utf8");
    return plan.reportPath;
  }

  classify(blocker: string): TriagedBlocker {
    const lower = blocker.toLowerCase();
    const categories = new Set<BlockerCategory>();
    let priority: BlockerPriority = "P2";
    let rationale = "Interpretation or documentation risk.";
    let nextAction = "Document the blocker and confirm whether it affects readiness.";

    if (mentionsMissingEvidence(lower)) {
      categories.add("MISSING_EVIDENCE");
      categories.add("CAN_BE_CHECKED_READ_ONLY");
      priority = maxPriority(priority, "P1");
      rationale = "Required readiness evidence is missing before any run decision.";
      nextAction = "Collect the missing evidence in read-only mode and update the audit.";
    }

    if (lower.includes("mandatory optimization preference")) {
      categories.add("CONFIGURATION_RISK");
      categories.add("CAN_BE_CHECKED_READ_ONLY");
      priority = maxPriority(priority, "P1");
      nextAction = "Open the relevant preference screen in read-only mode and record the configured value.";
    }

    if (lower.includes("duty optimization readiness")) {
      categories.add("CONFIGURATION_RISK");
      categories.add("CAN_BE_CHECKED_READ_ONLY");
      priority = maxPriority(priority, "P1");
      nextAction = "Review duty optimization settings in read-only mode and classify readiness.";
    }

    if (lower.includes("vehicle optimization readiness")) {
      categories.add("CONFIGURATION_RISK");
      categories.add("CAN_BE_CHECKED_READ_ONLY");
      priority = maxPriority(priority, "P1");
      nextAction = "Review vehicle optimization settings in read-only mode and classify readiness.";
    }

    if (lower.includes("vehicle piece validation")) {
      categories.add("CRITICAL_RUN_BLOCKER");
      categories.add("DATA_QUALITY_RISK");
      categories.add("CAN_BE_CHECKED_READ_ONLY");
      priority = maxPriority(priority, "P0");
      rationale = "Vehicle Piece Validation readiness is required before controlled run approval.";
      nextAction = "Perform/read Vehicle Piece Validation evidence and resolve or classify failures.";
    }

    if (lower.includes("prior runs failed")) {
      categories.add("CRITICAL_RUN_BLOCKER");
      categories.add("OPTIMIZATION_WORKFLOW_RISK");
      priority = maxPriority(priority, "P0");
      rationale = "Prior failed runs prevent further run attempts until diagnosed.";
      nextAction = "Enter failure diagnosis workflow and inspect prior run evidence before any retry.";
    }

    if (lower.includes("failure diagnosis inspection required")) {
      categories.add("MISSING_EVIDENCE");
      categories.add("CAN_BE_CHECKED_READ_ONLY");
      priority = maxPriority(priority, "P1");
      rationale = "Optimization failure causes must be inspected before retry or approval.";
      nextAction = `Inspect ${blocker.replace(/^Failure diagnosis inspection required:\s*/i, "")} in read-only mode.`;
    }

    if (
      lower.includes("no valid duty candidates") ||
      lower.includes("too many duty candidates") ||
      lower.includes("timeout causes")
    ) {
      categories.add("OPTIMIZATION_WORKFLOW_RISK");
      categories.add("REQUIRES_OPTIBUS_SUPPORT");
      priority = maxPriority(priority, "P1");
      nextAction = "Inspect available task-log detail; escalate to Optibus support if causes remain unexplained.";
    }

    if (lower.includes("advanced vehicle adapter was tried and failed")) {
      categories.add("OPTIMIZATION_WORKFLOW_RISK");
      categories.add("REQUIRES_USER_DECISION");
      priority = maxPriority(priority, "P1");
      rationale = "A deprecated/not recommended algorithm path failed and requires explicit human decision.";
      nextAction = "Document why Advanced Fixed Blocks is not sufficient before considering another algorithm.";
    }

    if (lower.includes("deep") || lower.includes("pull reliefs")) {
      categories.add("OPTIMIZATION_WORKFLOW_RISK");
      categories.add("CONFIGURATION_RISK");
      categories.add("CAN_BE_CHECKED_READ_ONLY");
      priority = maxPriority(priority, "P1");
      rationale = "DEEP/Pull Reliefs readiness affects vehicle scheduling diagnostics.";
      nextAction = "Check Algorithm Parameters and Trip Connections/Pull Reliefs before run approval.";
    }

    if (lower.includes("hard/soft") || lower.includes("global constraints")) {
      categories.add("CRITICAL_RUN_BLOCKER");
      categories.add("CONFIGURATION_RISK");
      categories.add("REQUIRES_USER_DECISION");
      priority = maxPriority(priority, "P1");
      rationale = "Unknown hard/soft constraints make optimization behavior unsafe to interpret.";
      nextAction = "Classify hard and soft constraints with a map owner before approving any run.";
    }

    if (lower.includes("vehicle issues are high") || lower.includes("duty issues are high")) {
      categories.add("DATA_QUALITY_RISK");
      categories.add("CAN_BE_CHECKED_READ_ONLY");
      priority = maxPriority(priority, "P1");
      rationale = "High issue volume can invalidate readiness or comparison results.";
      nextAction = "Review issue lists in read-only mode and classify blocking versus accepted issues.";
    }

    if (lower.includes("baseline kpis") || lower.includes("copy/snapshot")) {
      categories.add("CRITICAL_RUN_BLOCKER");
      categories.add("MISSING_EVIDENCE");
      priority = maxPriority(priority, "P0");
      rationale = "Baseline protection/evidence is required before any run path.";
      nextAction = "Confirm copy/snapshot and baseline KPI evidence before run readiness review.";
    }

    if (categories.size === 0) {
      categories.add("MISSING_EVIDENCE");
      categories.add("CAN_BE_CHECKED_READ_ONLY");
    }

    return {
      blocker,
      categories: [...categories],
      priority,
      rationale,
      nextAction,
    };
  }
}

function decide(blockers: TriagedBlocker[]): TriageDecision {
  if (blockers.some((blocker) => blocker.priority === "P0")) {
    return "DO_NOT_RUN_YET";
  }
  if (blockers.some((blocker) => blocker.priority === "P1")) {
    return "CAN_RUN_DIAGNOSTIC";
  }
  return "CAN_RUN_PRODUCTION";
}

function mentionsMissingEvidence(value: string): boolean {
  return (
    value.includes("not confirmed") ||
    value.includes("missing") ||
    value.includes("not performed") ||
    value.includes("not fully classified") ||
    value.includes("inspection required")
  );
}

function maxPriority(current: BlockerPriority, candidate: BlockerPriority): BlockerPriority {
  return PRIORITIES.indexOf(candidate) < PRIORITIES.indexOf(current) ? candidate : current;
}

function nextTenActions(blockers: TriagedBlocker[]): string[] {
  const suggestions = [
    actionIf(blockers, "prior runs failed", "Inspect Run A and Run B task logs in read-only mode; do not retry automatically."),
    actionIf(blockers, "algorithm parameters", "Review Algorithm Parameters and determine whether DEEP is required/configured."),
    actionIf(blockers, "vehicle piece validation", "Perform/read Vehicle Piece Validation evidence and classify each vehicle-piece issue."),
    actionIf(blockers, "vehicle issues are high", "Review the 120 unique / 251 vehicle issue appearances and separate blockers from accepted warnings."),
    actionIf(blockers, "duty issues are high", "Review the 34 unique / 44 duty issue appearances and identify infeasible duty causes."),
    actionIf(blockers, "relief points", "Validate Relief Points and Relief Timing against the service-day assumptions."),
    actionIf(blockers, "duty types", "Validate Duty Types, Work Limitation, Time Limitations, and break definitions."),
    actionIf(blockers, "pull reliefs", "Check Trip Connections for Pull Reliefs if DEEP or vehicle scheduling changes are needed."),
    actionIf(blockers, "deadhead catalog", "Verify Deadhead Catalog coverage before interpreting vehicle optimization outputs."),
    actionIf(blockers, "hard/soft", "Classify hard versus soft constraints with a user decision and document accepted risks."),
    actionIf(blockers, "advanced vehicle adapter", "Prefer Advanced Fixed Blocks unless a human explicitly justifies another algorithm."),
  ].filter((value): value is string => Boolean(value));

  return unique(suggestions).slice(0, 10);
}

function actionIf(blockers: TriagedBlocker[], needle: string, action: string): string | undefined {
  return blockers.some((blocker) => blocker.blocker.toLowerCase().includes(needle)) ? action : undefined;
}

function renderReport(plan: BlockerTriagePlan): string {
  return [
    "# Holon Blocker Triage",
    "",
    "## Executive summary",
    "",
    `- Decision: ${plan.decision}`,
    `- Total blockers: ${plan.triagedBlockers.length}`,
    `- P0 blockers: ${byPriority(plan, "P0").length}`,
    `- P1 blockers: ${byPriority(plan, "P1").length}`,
    "- This triage is read-only. It does not implement login, real Run, Save, Apply, Publish, or destructive clicks.",
    "",
    "## Blockers grouped by category",
    "",
    ...ALL_CATEGORIES.flatMap((category) => renderBlockersForCategory(plan, category)),
    "",
    "## Blockers grouped by priority",
    "",
    ...PRIORITIES.flatMap((priority) => renderBlockersForPriority(plan, priority)),
    "",
    renderBlockersForPredicate(
      "What can be checked in read-only mode",
      plan,
      (blocker) => blocker.categories.includes("CAN_BE_CHECKED_READ_ONLY"),
    ),
    "",
    renderBlockersForPredicate(
      "What requires user approval",
      plan,
      (blocker) => blocker.categories.includes("REQUIRES_USER_DECISION"),
    ),
    "",
    renderBlockersForPredicate(
      "What requires map configuration change",
      plan,
      (blocker) => blocker.categories.includes("CONFIGURATION_RISK"),
    ),
    "",
    renderBlockersForPredicate(
      "What requires Optibus support",
      plan,
      (blocker) => blocker.categories.includes("REQUIRES_OPTIBUS_SUPPORT"),
    ),
    "",
    "## Recommended next 10 actions",
    "",
    ...plan.topNextActions.map((action, index) => `${index + 1}. ${action}`),
    "",
  ].join("\n");
}

function byPriority(plan: BlockerTriagePlan, priority: BlockerPriority): TriagedBlocker[] {
  return plan.triagedBlockers.filter((blocker) => blocker.priority === priority);
}

function renderBlockersForCategory(plan: BlockerTriagePlan, category: BlockerCategory): string[] {
  const matching = plan.triagedBlockers.filter((blocker) => blocker.categories.includes(category));
  return [`### ${category}`, "", renderBlockerList(matching), ""];
}

function renderBlockersForPriority(plan: BlockerTriagePlan, priority: BlockerPriority): string[] {
  return [`### ${priority}`, "", renderBlockerList(byPriority(plan, priority)), ""];
}

function renderBlockersForPredicate(
  title: string,
  plan: BlockerTriagePlan,
  predicate: (blocker: TriagedBlocker) => boolean,
): string {
  return [`## ${title}`, "", renderBlockerList(plan.triagedBlockers.filter(predicate))].join("\n");
}

function renderBlockerList(blockers: TriagedBlocker[]): string {
  if (blockers.length === 0) {
    return "_None identified._";
  }

  return blockers
    .map(
      (blocker) =>
        `- **${blocker.priority}** ${blocker.blocker} (${blocker.categories.join(", ")})\n  - Next action: ${blocker.nextAction}`,
    )
    .join("\n");
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
