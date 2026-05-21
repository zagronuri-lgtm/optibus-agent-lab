import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

export type FieldStatus = "observed" | "missing" | "uncertain";
export type RealAuditDecision = "NOT_READY" | "NEEDS_HUMAN_REVIEW" | "READY_FOR_DIAGNOSTIC_RUN";

export interface ScreenFieldDefinition {
  key: string;
  label: string;
  required: boolean;
}

export interface GuidedScreenDefinition {
  id: string;
  title: string;
  optibusArea: string;
  fields: ScreenFieldDefinition[];
}

export interface CollectedFieldValue {
  key: string;
  label: string;
  required: boolean;
  status: FieldStatus;
  value: string;
  note: string;
}

export interface RealMapScreenEvidence {
  screenId: string;
  screenTitle: string;
  optibusArea: string;
  url: string;
  pageTitle: string;
  timestamp: string;
  screenshotPath: string;
  fields: CollectedFieldValue[];
}

export interface RealMapAuditResult {
  reportPath: string;
  evidenceJsonPath: string;
  decision: RealAuditDecision;
  records: RealMapScreenEvidence[];
  facts: string[];
  missingEvidence: string[];
  risks: string[];
  suspectedRootCauses: string[];
  nextActions: string[];
  controlledRunEnabled: false;
}

export interface RealCollectorOptions {
  url?: string;
  cdpEndpoint?: string;
  screenshotDir?: string;
  evidenceJsonPath?: string;
  reportPath?: string;
}

export interface SafetyCheckResult {
  refused: boolean;
  matchedControl?: string;
  reason: string;
}

const FORBIDDEN_CONTROL_LABELS = [
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

export const GUIDED_READONLY_SCREENS: GuidedScreenDefinition[] = [
  {
    id: "map-identity",
    title: "Map identity / Schedule header",
    optibusArea: "Schedule header",
    fields: [
      field("project", "Project", true),
      field("dataset", "Dataset", true),
      field("scheduleName", "Schedule name", true),
      field("scheduleId", "Schedule ID", true),
      field("serviceDay", "Service day", true),
      field("versionCopySnapshot", "Version / Copy / Snapshot", true),
    ],
  },
  {
    id: "kpi-dashboard",
    title: "KPI dashboard",
    optibusArea: "Dashboard / KPIs",
    fields: [
      field("trips", "Trips", true),
      field("blocks", "Blocks", true),
      field("pvr", "PVR", true),
      field("duties", "Duties", true),
      field("vehicleEfficiency", "Vehicle Efficiency", true),
      field("crewEfficiency", "Crew Efficiency", true),
      field("serviceKm", "Service km", true),
      field("deadheadKm", "Deadhead km", true),
      field("deadheadPercent", "Deadhead %", true),
      field("totalCost", "Total Cost", false),
      field("crewCost", "Crew Cost", false),
      field("vehicleCost", "Vehicle Cost", false),
    ],
  },
  {
    id: "vehicle-issues",
    title: "Vehicle Issues panel",
    optibusArea: "Validation Panel / Vehicle issues",
    fields: [
      field("uniqueVehicleIssues", "Unique vehicle issues", true),
      field("vehicleIssueAppearances", "Vehicle issue appearances", true),
      field("topVehicleIssueCategories", "Top vehicle issue categories", true),
      field("dismissedVehicleIssues", "Dismissed vehicle issues", false),
    ],
  },
  {
    id: "duty-issues",
    title: "Duty Issues panel",
    optibusArea: "Validation Panel / Duty issues",
    fields: [
      field("uniqueDutyIssues", "Unique duty issues", true),
      field("dutyIssueAppearances", "Duty issue appearances", true),
      field("topDutyIssueCategories", "Top duty issue categories", true),
      field("dismissedDutyIssues", "Dismissed duty issues", false),
    ],
  },
  {
    id: "optimization-settings",
    title: "Optimization settings",
    optibusArea: "Run setup / Optimization settings",
    fields: [
      field("optimizeVehicles", "Optimize vehicles ON/OFF", true),
      field("optimizeDuties", "Optimize duties ON/OFF", true),
      field("allowUnscheduledDuties", "Allow unscheduled duties", false),
      field("selectedAlgorithm", "Selected algorithm/profile", true),
    ],
  },
  {
    id: "algorithm-parameters",
    title: "Algorithm Parameters",
    optibusArea: "Run setup / Algorithm Parameters",
    fields: [
      field("algorithmTemplate", "Current algorithm template", true),
      field("deepConfigured", "DEEP configured", true),
      field("retentionRatio", "Retention ratio", false),
      field("iterationParameters", "Iteration parameters", true),
      field("pullReliefsNeeded", "Pull Reliefs needed", true),
    ],
  },
  {
    id: "depot-setup",
    title: "Depot Setup",
    optibusArea: "Vehicle Preferences / Depot Setup",
    fields: [
      field("depots", "Depots", true),
      field("depotCapacities", "Depot capacities", true),
      field("vehicleGroups", "Vehicle groups", false),
    ],
  },
  {
    id: "midday-park",
    title: "Midday Park",
    optibusArea: "Vehicle Preferences / Midday Park",
    fields: [
      field("middayParkEnabled", "Midday ON/OFF", true),
      field("minimalBreakLength", "Minimal break length", true),
      field("minimumParkTime", "Minimum park time", true),
      field("parkCost", "Park cost", false),
    ],
  },
  {
    id: "relief-points",
    title: "Relief Points",
    optibusArea: "Scheduling Preferences / Relief Points",
    fields: [
      field("reliefPointPreference", "Relief point preference", true),
      field("keyReliefPointsLegal", "Key relief points legal?", true),
      field("allDayAllRoutesLogic", "Placement / all-day / all-routes logic", true),
    ],
  },
  {
    id: "relief-timing",
    title: "Relief Timing",
    optibusArea: "Scheduling Preferences / Relief Timing",
    fields: [
      field("reliefTimingPreference", "Relief timing preference", true),
      field("driveToRelief", "Drive to relief setting", true),
      field("timingWindows", "Timing windows", false),
    ],
  },
  {
    id: "trip-connections",
    title: "Trip Connections",
    optibusArea: "Vehicle Preferences / Trip Connections",
    fields: [
      field("routePairs", "26+126 / 22+35+77 / key route pairs", true),
      field("readingAtidimRules", "רידינג / עתידים rules", true),
      field("allowDisallowPreferPenalize", "Allow / Disallow / Prefer / Penalize", true),
      field("penaltyValues", "Penalty values", false),
      field("pullReliefs", "Pull Reliefs", true),
    ],
  },
  {
    id: "duty-types",
    title: "Duty Types",
    optibusArea: "Scheduling Preferences / Duty Types",
    fields: [
      field("notAllowedDutyType", "Not allowed duty type", true),
      field("dutyTypesComplete", "Duty Types complete", true),
      field("homogeneityGroups", "Homogeneity groups", false),
    ],
  },
  {
    id: "work-limitation",
    title: "Work Limitation",
    optibusArea: "Scheduling Preferences / Work Limitation",
    fields: [
      field("workLimitationRules", "Work Limitation rules", true),
      field("hardSoftClassification", "Hard/soft classification", true),
    ],
  },
  {
    id: "time-limitations",
    title: "Time Limitations",
    optibusArea: "Scheduling Preferences / Time Limitations",
    fields: [
      field("timeLimitationRules", "Time Limitation rules", true),
      field("longScheduleBreak", "Long schedule break", true),
      field("takana", "תקנה", false),
      field("splitBreakDefinition", "Split Break Definition", true),
      field("breakRules", "Break rules", true),
    ],
  },
  {
    id: "deadhead-catalog",
    title: "Deadhead Catalog",
    optibusArea: "Preferences / Deadhead Catalog",
    fields: [
      field("catalogName", "Catalog name", true),
      field("coverageIndicator", "Coverage indicator", true),
      field("missingPairs", "Missing pairs between key points", true),
      field("generatedDeadheads", "Generated deadheads if any", false),
    ],
  },
  {
    id: "run-history-tasks",
    title: "Run History / Tasks",
    optibusArea: "Runs / Tasks",
    fields: [
      field("runATaskLog", "Run A task log", true),
      field("runBTaskLog", "Run B task log", true),
      field("fullErrorMessages", "Full error messages", true),
      field("taskTechnicalDetails", "Technical details if visible", false),
    ],
  },
];

export function safetyCheckReadOnlyControl(labelOrAriaLabel: string): SafetyCheckResult {
  const matchedControl = FORBIDDEN_CONTROL_LABELS.find((label) =>
    new RegExp(`\\b${escapeRegExp(label)}\\b`, "i").test(labelOrAriaLabel),
  );

  if (!matchedControl) {
    return { refused: false, reason: "No prohibited control detected." };
  }

  return {
    refused: true,
    matchedControl,
    reason:
      matchedControl === "Analyze"
        ? "Analyze is not allowed in Real Read-Only Map Collector v1."
        : `Prohibited Optibus control refused: ${matchedControl}.`,
  };
}

export function evaluateRealMapAudit(records: RealMapScreenEvidence[]): Omit<RealMapAuditResult, "reportPath" | "evidenceJsonPath"> {
  const facts: string[] = [];
  const missingEvidence: string[] = [];
  const risks: string[] = [];
  const suspectedRootCauses: string[] = [];

  for (const record of records) {
    facts.push(`${record.screenTitle}: captured ${record.fields.length} field(s) at ${record.url}.`);
    for (const fieldValue of record.fields) {
      if (fieldValue.status === "observed") {
        facts.push(`${record.screenTitle} / ${fieldValue.label}: ${fieldValue.value || "observed"}.`);
      }
      if (fieldValue.status === "missing" || (fieldValue.required && !fieldValue.value.trim())) {
        missingEvidence.push(`${record.screenTitle} / ${fieldValue.label} is missing.`);
      }
      if (fieldValue.status === "uncertain") {
        risks.push(`${record.screenTitle} / ${fieldValue.label} is uncertain.`);
      }
    }
  }

  if (records.some((record) => record.screenId === "vehicle-issues" && record.fields.some((fieldValue) => fieldValue.status !== "observed"))) {
    suspectedRootCauses.push("Vehicle issue evidence is incomplete; vehicle-piece feasibility remains a suspected root cause.");
  }
  if (records.some((record) => record.screenId === "algorithm-parameters" && record.fields.some((fieldValue) => fieldValue.status !== "observed"))) {
    suspectedRootCauses.push("Algorithm Parameters / DEEP readiness remains a suspected root cause.");
  }
  if (records.some((record) => record.screenId === "run-history-tasks" && record.fields.some((fieldValue) => fieldValue.status !== "observed"))) {
    suspectedRootCauses.push("Failed run task logs are incomplete; root cause remains unknown.");
  }

  const decision = decide(records, missingEvidence, risks);
  return {
    decision,
    records,
    facts: unique(facts),
    missingEvidence: unique(missingEvidence),
    risks: unique(risks),
    suspectedRootCauses: unique(suspectedRootCauses),
    nextActions: nextFiveActions(decision, missingEvidence, risks),
    controlledRunEnabled: false,
  };
}

export async function writeRealMapAuditOutputs(
  result: Omit<RealMapAuditResult, "reportPath" | "evidenceJsonPath">,
  options: { reportPath?: string; evidenceJsonPath?: string } = {},
): Promise<RealMapAuditResult> {
  const reportPath = options.reportPath ?? "reports/generated/real_map_readonly_audit.md";
  const evidenceJsonPath = options.evidenceJsonPath ?? "logs/evidence/real_map_readonly_audit.json";
  await mkdir(path.dirname(reportPath), { recursive: true });
  await mkdir(path.dirname(evidenceJsonPath), { recursive: true });
  const completeResult: RealMapAuditResult = { ...result, reportPath, evidenceJsonPath };
  await writeFile(evidenceJsonPath, JSON.stringify({ records: result.records }, null, 2), "utf8");
  await writeFile(reportPath, renderRealMapAuditReport(completeResult), "utf8");
  return completeResult;
}

export class RealReadOnlyMapCollector {
  async runGuided(options: RealCollectorOptions): Promise<RealMapAuditResult> {
    const readline = createInterface({ input, output });
    let browser: Browser | undefined;
    try {
      const pageContext = await openGuidedPage(options);
      browser = pageContext.browser;
      const records: RealMapScreenEvidence[] = [];
      for (const screen of GUIDED_READONLY_SCREENS) {
        records.push(await collectScreenEvidence(pageContext.page, screen, readline, options.screenshotDir));
      }
      const evaluated = evaluateRealMapAudit(records);
      return writeRealMapAuditOutputs(evaluated, {
        reportPath: options.reportPath,
        evidenceJsonPath: options.evidenceJsonPath,
      });
    } finally {
      readline.close();
      await browser?.close();
    }
  }
}

async function openGuidedPage(options: RealCollectorOptions): Promise<{ browser: Browser; context: BrowserContext; page: Page }> {
  if (options.cdpEndpoint) {
    const browser = await chromium.connectOverCDP(options.cdpEndpoint);
    const context = browser.contexts()[0] ?? await browser.newContext();
    const page = context.pages()[0] ?? await context.newPage();
    return { browser, context, page };
  }

  if (!options.url) {
    throw new Error("collect:real:guided requires --url <Optibus URL> or --cdp <Chrome DevTools endpoint>.");
  }

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(options.url, { waitUntil: "domcontentloaded" });
  return { browser, context, page };
}

async function collectScreenEvidence(
  page: Page,
  screen: GuidedScreenDefinition,
  readline: ReturnType<typeof createInterface>,
  screenshotDir = "screenshots",
): Promise<RealMapScreenEvidence> {
  console.log(`\nScreen: ${screen.title}`);
  console.log(`Navigate manually to: ${screen.optibusArea}`);
  console.log("Do not click Run, Optimize, Save, Apply, Publish, Delete, Export, Import, Duplicate, Create Version, Clear Duties, Update Schedule, Revise Events, or Analyze.");
  await readline.question("Press Enter after you have manually navigated to this read-only screen...");

  const timestamp = new Date().toISOString();
  await mkdir(screenshotDir, { recursive: true });
  const screenshotPath = path.join(screenshotDir, `real-${screen.id}-${Date.now()}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  const fields: CollectedFieldValue[] = [];
  for (const fieldDef of screen.fields) {
    const status = await askFieldStatus(readline, fieldDef);
    const value = await readline.question(`Value for ${fieldDef.label} (blank if unavailable): `);
    const note = await readline.question(`Note for ${fieldDef.label} (optional): `);
    fields.push({ ...fieldDef, status, value, note });
  }

  return {
    screenId: screen.id,
    screenTitle: screen.title,
    optibusArea: screen.optibusArea,
    url: page.url(),
    pageTitle: await page.title().catch(() => ""),
    timestamp,
    screenshotPath,
    fields,
  };
}

async function askFieldStatus(
  readline: ReturnType<typeof createInterface>,
  fieldDef: ScreenFieldDefinition,
): Promise<FieldStatus> {
  while (true) {
    const answer = (await readline.question(`${fieldDef.label} status [observed/missing/uncertain]: `)).trim().toLowerCase();
    if (answer === "observed" || answer === "missing" || answer === "uncertain") {
      return answer;
    }
    console.log("Please enter observed, missing, or uncertain.");
  }
}

function decide(records: RealMapScreenEvidence[], missingEvidence: string[], risks: string[]): RealAuditDecision {
  const capturedScreenIds = new Set(records.map((record) => record.screenId));
  const allScreensCaptured = GUIDED_READONLY_SCREENS.every((screen) => capturedScreenIds.has(screen.id));
  if (!allScreensCaptured || missingEvidence.length > 0) {
    return "NOT_READY";
  }
  if (risks.length > 0) {
    return "NEEDS_HUMAN_REVIEW";
  }
  return "READY_FOR_DIAGNOSTIC_RUN";
}

function nextFiveActions(decision: RealAuditDecision, missingEvidence: string[], risks: string[]): string[] {
  if (decision === "NOT_READY") {
    return [
      "Collect missing required evidence from the listed read-only screens.",
      "Review Run History / Tasks full error messages before any retry discussion.",
      "Capture Vehicle Issues and Duty Issues category breakdowns with screenshots.",
      "Confirm Algorithm Parameters, DEEP, and Pull Reliefs readiness.",
      "Keep Controlled Run blocked until missing evidence is resolved.",
    ];
  }
  if (decision === "NEEDS_HUMAN_REVIEW") {
    return [
      "Ask a map owner to review uncertain values.",
      "Classify remaining risks as blocking or accepted warnings.",
      "Confirm hard/soft constraints with the scheduling owner.",
      "Update the evidence JSON with reviewed statuses.",
      "Re-run readiness scoring before any diagnostic-run approval.",
    ];
  }
  return [
    "Prepare a human review packet for diagnostic-run approval.",
    "Confirm no destructive action is requested by the collector.",
    "Require a typed approval token before any future Controlled Run Mode.",
    "Keep Save/Apply/Publish/Run unavailable in this collector.",
    "Document final diagnostic-run assumptions.",
  ];
}

function renderRealMapAuditReport(result: RealMapAuditResult): string {
  return [
    "# Real Map Read-Only Audit",
    "",
    "## Executive summary",
    "",
    `- Readiness decision: ${result.decision}`,
    `- Screens captured: ${result.records.length}`,
    `- Controlled Run enabled: ${result.controlledRunEnabled}`,
    "- Mode: user-guided read-only collection; no login automation, no scraping assumptions, no destructive clicks.",
    "",
    renderSection("Facts collected", result.facts),
    "",
    renderSection("Missing evidence", result.missingEvidence),
    "",
    renderSection("Risks", result.risks),
    "",
    renderSection("Suspected root causes", result.suspectedRootCauses),
    "",
    "## Next 5 actions only",
    "",
    ...result.nextActions.map((action, index) => `${index + 1}. ${action}`),
    "",
  ].join("\n");
}

function renderSection(title: string, values: string[]): string {
  return [`## ${title}`, "", values.length ? values.map((value) => `- ${value}`).join("\n") : "_None._"].join("\n");
}

function field(key: string, label: string, required: boolean): ScreenFieldDefinition {
  return { key, label, required };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
