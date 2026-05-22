import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { EvidenceItem } from "./evidencePlan";

export interface CollectedEvidenceRecord {
  evidenceItemId: string;
  category: string;
  blockerAddressed: string;
  screenPath: string;
  url: string;
  pageTitle: string;
  timestamp: string;
  screenshotPath: string;
  userNote: string;
  observedValues: Record<string, string>;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  closesBlocker: boolean;
  followUpRequired: boolean;
}

export interface CaptureInput {
  evidenceItem: EvidenceItem;
  url: string;
  pageTitle: string;
  userNote: string;
  observedValues: Record<string, string>;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  closesBlocker: boolean;
  followUpRequired: boolean;
  screenshotContent?: string;
}

export interface EvidenceCollectionSession {
  records: CollectedEvidenceRecord[];
  reportPath: string;
  evidenceJsonPath: string;
  controlledRunEnabled: false;
}

export interface SafetyRefusal {
  refused: boolean;
  reason: string;
  matchedControl?: string;
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

export class BrowserEvidenceCollector {
  constructor(
    private readonly options: {
      screenshotDir?: string;
      evidenceLogDir?: string;
      reportPath?: string;
    } = {},
  ) {}

  safetyCheckControl(labelOrAriaLabel: string): SafetyRefusal {
    const matchedControl = FORBIDDEN_CONTROL_LABELS.find((label) =>
      controlPattern(label).test(labelOrAriaLabel),
    );

    if (!matchedControl) {
      return {
        refused: false,
        reason: "No destructive control label detected.",
      };
    }

    return {
      refused: true,
      matchedControl,
      reason:
        matchedControl === "Analyze"
          ? "Analyze is reserved for a future explicit read-only validation mode and is refused in v1."
          : `Refused to interact with prohibited Optibus control: ${matchedControl}.`,
    };
  }

  async simulateCapture(inputs: CaptureInput[]): Promise<EvidenceCollectionSession> {
    const records: CollectedEvidenceRecord[] = [];
    const evidenceLogDir = this.options.evidenceLogDir ?? "logs/evidence";
    const reportPath = this.options.reportPath ?? "reports/generated/holon_collected_evidence.md";
    await mkdir(evidenceLogDir, { recursive: true });
    await mkdir(this.options.screenshotDir ?? "screenshots", { recursive: true });
    await mkdir(path.dirname(reportPath), { recursive: true });

    for (const input of inputs) {
      records.push(await this.captureSimulated(input));
    }

    const evidenceJsonPath = path.join(evidenceLogDir, "holon_collected_evidence.json");
    await writeFile(evidenceJsonPath, JSON.stringify({ records }, null, 2), "utf8");
    await writeFile(reportPath, renderReport(records), "utf8");

    return {
      records,
      reportPath,
      evidenceJsonPath,
      controlledRunEnabled: false,
    };
  }

  private async captureSimulated(input: CaptureInput): Promise<CollectedEvidenceRecord> {
    const screenshotPath = await this.writeSimulatedScreenshot(input.evidenceItem.id, input.screenshotContent);
    return {
      evidenceItemId: input.evidenceItem.id,
      category: input.evidenceItem.category,
      blockerAddressed: input.evidenceItem.blockerAddressed,
      screenPath: input.evidenceItem.optibusScreenPath,
      url: input.url,
      pageTitle: input.pageTitle,
      timestamp: new Date().toISOString(),
      screenshotPath,
      userNote: input.userNote,
      observedValues: input.observedValues,
      confidence: input.confidence,
      closesBlocker: input.closesBlocker,
      followUpRequired: input.followUpRequired,
    };
  }

  private async writeSimulatedScreenshot(
    evidenceItemId: string,
    content = "simulated screenshot placeholder",
  ): Promise<string> {
    const screenshotDir = this.options.screenshotDir ?? "screenshots";
    await mkdir(screenshotDir, { recursive: true });
    const screenshotPath = path.join(
      screenshotDir,
      `simulated-${evidenceItemId.toLowerCase()}-${Date.now()}.txt`,
    );
    await writeFile(screenshotPath, content, "utf8");
    return screenshotPath;
  }
}

export function demoCaptureInputs(items: EvidenceItem[]): CaptureInput[] {
  const selectedIds = new Set(["FRL-001", "FRL-002", "FRL-003", "ALG-001", "VPV-001"]);
  return items
    .filter((item) => selectedIds.has(item.id))
    .slice(0, 5)
    .map((item) => ({
      evidenceItem: item,
      url: `https://example.optibus.local/read-only/${item.id.toLowerCase()}`,
      pageTitle: `Simulated Optibus evidence - ${item.id}`,
      userNote: demoNoteFor(item.id),
      observedValues: demoObservedValuesFor(item.id),
      confidence: item.id.startsWith("FRL") ? "MEDIUM" : "LOW",
      closesBlocker: false,
      followUpRequired: true,
      screenshotContent: `Simulated screenshot for ${item.id}. No Optibus browser automation was performed.`,
    }));
}

function demoNoteFor(id: string): string {
  switch (id) {
    case "FRL-001":
      return "Run A failed with generic optimization message; detailed task log still needed.";
    case "FRL-002":
      return "Run B failed after Advanced Vehicle Adapter attempt; root cause not visible in demo.";
    case "FRL-003":
      return "Full error remains generic; UNKNOWN classification stays in place.";
    case "ALG-001":
      return "Algorithm Parameters / DEEP readiness not confirmed from demo evidence.";
    case "VPV-001":
      return "Vehicle Piece Validation has not been performed; blocker remains open.";
    default:
      return "Simulated read-only evidence note.";
  }
}

function demoObservedValuesFor(id: string): Record<string, string> {
  switch (id) {
    case "FRL-001":
      return {
        runName: "Run A",
        taskName: "Driver-only Diagnostic",
        status: "failed",
        message: "Optimization could not be completed",
      };
    case "FRL-002":
      return {
        runName: "Run B",
        taskName: "Vehicle + Driver Diagnostic",
        status: "failed",
        algorithm: "Advanced Vehicle adapter",
      };
    case "FRL-003":
      return {
        failureTypeEvidence: "not exposed",
        timeoutEvidence: "not exposed",
        technicalDetails: "not visible in demo",
      };
    case "ALG-001":
      return {
        algorithmTemplate: "not confirmed",
        deepConfigured: "not confirmed",
        pullReliefsRequired: "unknown",
      };
    case "VPV-001":
      return {
        vehiclePieceValidation: "not performed",
        cuttablePieces: "unknown",
        requiredScreenshots: "pending",
      };
    default:
      return {};
  }
}

function renderReport(records: CollectedEvidenceRecord[]): string {
  return [
    "# Holon Collected Evidence",
    "",
    "## Summary",
    "",
    `- Records collected: ${records.length}`,
    "- Mode: simulated read-only guided capture",
    "- Controlled Run enabled: no",
    "- No login automation, scraping, destructive clicks, Save, Apply, Publish, or real Run were implemented.",
    "",
    "## Evidence records",
    "",
    ...records.flatMap(renderRecord),
    "",
  ].join("\n");
}

function renderRecord(record: CollectedEvidenceRecord): string[] {
  return [
    `### ${record.evidenceItemId}`,
    "",
    `- Category: ${record.category}`,
    `- Blocker addressed: ${record.blockerAddressed}`,
    `- Screen/path: ${record.screenPath}`,
    `- URL: ${record.url}`,
    `- Page title: ${record.pageTitle}`,
    `- Timestamp: ${record.timestamp}`,
    `- Screenshot path: ${record.screenshotPath}`,
    `- User note: ${record.userNote}`,
    `- Confidence: ${record.confidence}`,
    `- Closes blocker: ${record.closesBlocker ? "yes" : "no"}`,
    `- Follow-up required: ${record.followUpRequired ? "yes" : "no"}`,
    "- Observed values:",
    ...Object.entries(record.observedValues).map(([key, value]) => `  - ${key}: ${value}`),
    "",
  ];
}

function controlPattern(label: string): RegExp {
  return new RegExp(`\\b${escapeRegExp(label)}\\b`, "i");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
