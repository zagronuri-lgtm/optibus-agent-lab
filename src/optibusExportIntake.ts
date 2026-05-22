import path from "node:path";
import type { ExportFileFormat, OptibusExportKind } from "./optibusDataModel";

export interface OptibusExportFileDescriptor {
  path: string;
  kind: OptibusExportKind;
  format: ExportFileFormat;
  sourceName?: string;
  receivedAt: string;
}

export interface IntakeManifest {
  files: OptibusExportFileDescriptor[];
  notes: string[];
  missingExpectedExports: OptibusExportKind[];
}

export const EXPECTED_OPTIBUS_EXPORTS: OptibusExportKind[] = [
  "trips",
  "blocks",
  "duties",
  "vehicle_schedule",
  "crew_schedule",
  "issues_validation",
  "deadhead_report",
  "preferences_report",
  "run_history",
];

export function inferExportFormat(filePath: string): ExportFileFormat {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".csv") {
    return "csv";
  }
  if (extension === ".xlsx" || extension === ".xls") {
    return "xlsx";
  }
  if (extension === ".json") {
    return "json";
  }
  throw new Error(`Unsupported Optibus export file extension: ${extension}`);
}

export function createIntakeManifest(files: OptibusExportFileDescriptor[]): IntakeManifest {
  const present = new Set(files.map((file) => file.kind));
  return {
    files,
    notes: [
      "Data-first intake is read-only and file-based.",
      "Browser automation is secondary and frozen for this phase.",
      "No Run, Save, Apply, Publish, login automation, or map mutation is performed.",
    ],
    missingExpectedExports: EXPECTED_OPTIBUS_EXPORTS.filter((kind) => !present.has(kind)),
  };
}

export function describeExportsNeededNext(): string[] {
  return [
    "Trips export with route, trip ID, start/end times, origin/destination stops, service km.",
    "Blocks export with block ID, vehicle/depot assignment, trip sequence, service km, deadhead km.",
    "Duties export with duty ID, duty type, driver base, work/paid time, duty events.",
    "Vehicle schedule export with vehicle events, layovers, depot pulls, and deadheads.",
    "Crew schedule export with duty events, reliefs, breaks, travels, sign-on/sign-off.",
    "Issues / validation report with unique issue count, appearances, severity, entity links, dismissed status.",
    "Deadhead report with from/to points, distance, duration, timing, and generated/missing pairs.",
    "Preferences report if available: cost, depot setup, midday park, algorithm parameters, reliefs, duty rules, trip connections, deadhead catalog.",
    "Run history / optimization report if available: run type, algorithm/profile, iterations, status, error message, task log metadata.",
  ];
}
