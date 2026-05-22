import { stat } from "node:fs/promises";
import ExcelJS from "exceljs";
import { loadHolonExportsConfig, resolveConfigPaths } from "./optibusExcelIntake";

const EXPECTED_FILENAMES = [
  "B_Diagnostic_Vehicle_Driver_Holon_21_05_2026_data_set.xlsx",
  "B_Diagnostic_Vehicle_Driver_Holon_21_05_2026_vehicle_schedule.xlsx",
  "B_Diagnostic_Vehicle_Driver_Holon_21_05_2026_crew_schedule.xlsx",
  "B_Diagnostic_Vehicle_Driver_Holon_21_05_2026_full_schedule.xlsx",
  "B_Diagnostic_Vehicle_Driver_Holon_21_05_2026_deadhead_catalog.xlsx",
  "B_Diagnostic_Vehicle_Driver_Holon_21_05_2026_relief_vehicle_schedule.xlsx",
];

const STRONG_FIXTURE_MARKERS = ["demo", "fixture", "DepotA", "DepotB", "Source: demo", "generated synthetic"];
const WEAK_FIXTURE_MARKERS = ["B1", "B2", "B3", "B4"];

interface WorkbookInspection {
  filePath: string;
  fileSizeBytes: number;
  expectedFilename: boolean;
  sheets: SheetInspection[];
  looksRealOrFixture: "looks_real" | "looks_suspicious" | "looks_fixture";
  fixtureMarkers: string[];
  weakMarkers: string[];
  evidence: string[];
  deadheadCatalogDetails?: DeadheadCatalogDetails;
}

interface DeadheadCatalogDetails {
  sheetNames: string[];
  rowCount: number;
  headers: string[];
  firstTenRows: Record<string, unknown>[];
  uniqueOriginOrSourceNames: string[];
  uniqueDestinationNames: string[];
  replacementRequired: boolean;
}

interface SheetInspection {
  sheetName: string;
  rowCount: number;
  firstFiveColumnHeaders: string[];
  firstThreeDataRows: Record<string, unknown>[];
}

async function main(): Promise<void> {
  const config = await loadHolonExportsConfig(readOption(process.argv.slice(2), "--config") ?? "configs/holon_exports.yaml");
  const paths = resolveConfigPaths(config);
  const inspections: WorkbookInspection[] = [];

  for (const filePath of Object.values(paths)) {
    inspections.push(await inspectWorkbook(filePath));
  }

  for (const inspection of inspections) {
    console.log(JSON.stringify(inspection, null, 2));
  }
}

async function inspectWorkbook(filePath: string): Promise<WorkbookInspection> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheets = workbook.worksheets.map(inspectSheet);
  const raw = JSON.stringify(sheets);
  const fixtureMarkers = STRONG_FIXTURE_MARKERS.filter((marker) => new RegExp(escapeRegExp(marker), "i").test(raw));
  const weakMarkers = WEAK_FIXTURE_MARKERS.filter((marker) => new RegExp(`\\b${escapeRegExp(marker)}\\b`, "i").test(raw));
  const deadheadCatalogDetails = filePath.endsWith("deadhead_catalog.xlsx")
    ? inspectDeadheadCatalog(workbook)
    : undefined;
  const evidence = [
    ...fixtureMarkers.map((marker) => `strong fixture marker: ${marker}`),
    ...weakMarkers.map((marker) => `weak generic block-id marker: ${marker}`),
  ];
  if (deadheadCatalogDetails?.replacementRequired) {
    evidence.push("deadhead_catalog.xlsx has only 5 rows and contains strong fixture markers; replace before real analysis");
  }
  return {
    filePath,
    fileSizeBytes: (await stat(filePath)).size,
    expectedFilename: EXPECTED_FILENAMES.some((name) => filePath.endsWith(name)),
    sheets,
    looksRealOrFixture: fixtureMarkers.length > 0 ? "looks_fixture" : weakMarkers.length > 0 ? "looks_suspicious" : "looks_real",
    fixtureMarkers,
    weakMarkers,
    evidence,
    deadheadCatalogDetails,
  };
}


function inspectDeadheadCatalog(workbook: ExcelJS.Workbook): DeadheadCatalogDetails {
  const worksheet = workbook.getWorksheet("Deadheads") ?? workbook.worksheets[0];
  const headers = worksheet ? (worksheet.getRow(1).values as unknown[]).slice(1).map((value) => String(value ?? "")) : [];
  const firstTenRows: Record<string, unknown>[] = [];
  if (worksheet) {
    for (let rowNumber = 2; rowNumber <= Math.min(worksheet.rowCount, 11); rowNumber += 1) {
      const values = (worksheet.getRow(rowNumber).values as unknown[]).slice(1);
      if (values.length === 0 || values.every((value) => value === undefined || value === null || value === "")) {
        continue;
      }
      firstTenRows.push(Object.fromEntries(headers.map((header, index) => [header, cellValue(values[index])])));
    }
  }
  const uniqueOriginOrSourceNames = unique(
    firstTenRows.flatMap((row) => [String(row.FromPlaceId ?? ""), String(row.Source ?? "")]).filter(Boolean),
  );
  const uniqueDestinationNames = unique(
    firstTenRows.map((row) => String(row.ToPlaceId ?? "")).filter(Boolean),
  );
  const raw = JSON.stringify(firstTenRows);
  const hasStrongMarker = STRONG_FIXTURE_MARKERS.some((marker) => new RegExp(escapeRegExp(marker), "i").test(raw));
  return {
    sheetNames: workbook.worksheets.map((sheet) => sheet.name),
    rowCount: worksheet?.rowCount ?? 0,
    headers,
    firstTenRows,
    uniqueOriginOrSourceNames,
    uniqueDestinationNames,
    replacementRequired: (worksheet?.rowCount ?? 0) <= 5 && hasStrongMarker,
  };
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function inspectSheet(worksheet: ExcelJS.Worksheet): SheetInspection {
  const headers = (worksheet.getRow(1).values as unknown[]).slice(1).map((value) => String(value ?? ""));
  const firstThreeDataRows: Record<string, unknown>[] = [];
  for (let rowNumber = 2; rowNumber <= Math.min(worksheet.rowCount, 4); rowNumber += 1) {
    const values = (worksheet.getRow(rowNumber).values as unknown[]).slice(1);
    if (values.length === 0 || values.every((value) => value === undefined || value === null || value === "")) {
      continue;
    }
    firstThreeDataRows.push(Object.fromEntries(headers.map((header, index) => [header, cellValue(values[index])])));
  }
  return {
    sheetName: worksheet.name,
    rowCount: worksheet.rowCount,
    firstFiveColumnHeaders: headers.slice(0, 5),
    firstThreeDataRows,
  };
}

function cellValue(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value && typeof value === "object" && "text" in value) {
    return (value as { text?: unknown }).text;
  }
  return value ?? "";
}

function readOption(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
