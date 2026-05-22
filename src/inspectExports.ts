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

const DEMO_MARKERS = ["DepotA", "B2", "B3", "fixture", "demo"];

interface WorkbookInspection {
  filePath: string;
  fileSizeBytes: number;
  expectedFilename: boolean;
  sheets: SheetInspection[];
  looksRealOrFixture: "looks_real" | "looks_fixture";
  fixtureMarkers: string[];
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
  const fixtureMarkers = DEMO_MARKERS.filter((marker) => new RegExp(marker, "i").test(raw));
  return {
    filePath,
    fileSizeBytes: (await stat(filePath)).size,
    expectedFilename: EXPECTED_FILENAMES.some((name) => filePath.endsWith(name)),
    sheets,
    looksRealOrFixture: fixtureMarkers.length > 0 ? "looks_fixture" : "looks_real",
    fixtureMarkers,
  };
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
