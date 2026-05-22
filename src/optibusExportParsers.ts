import { readFile } from "node:fs/promises";
import type { OptibusExportFileDescriptor } from "./optibusExportIntake";
import type { OptibusNormalizedDataset } from "./optibusDataModel";

export interface ParserResult<T = unknown> {
  descriptor: OptibusExportFileDescriptor;
  records: T[];
  warnings: string[];
}

export interface OptibusExportParser<T = unknown> {
  supports(descriptor: OptibusExportFileDescriptor): boolean;
  parse(descriptor: OptibusExportFileDescriptor): Promise<ParserResult<T>>;
}

export class CsvOptibusExportParser implements OptibusExportParser<Record<string, string>> {
  supports(descriptor: OptibusExportFileDescriptor): boolean {
    return descriptor.format === "csv";
  }

  async parse(descriptor: OptibusExportFileDescriptor): Promise<ParserResult<Record<string, string>>> {
    const raw = await readFile(descriptor.path, "utf8");
    const records = parseSimpleCsv(raw);
    return {
      descriptor,
      records,
      warnings: ["CSV parser is a first-pass stub; validate delimiter, quoting, locale, and Optibus column mapping before production use."],
    };
  }
}

export class JsonOptibusExportParser implements OptibusExportParser<unknown> {
  supports(descriptor: OptibusExportFileDescriptor): boolean {
    return descriptor.format === "json";
  }

  async parse(descriptor: OptibusExportFileDescriptor): Promise<ParserResult<unknown>> {
    const parsed = JSON.parse(await readFile(descriptor.path, "utf8"));
    return {
      descriptor,
      records: Array.isArray(parsed) ? parsed : [parsed],
      warnings: ["JSON parser preserves source objects; mapping to normalized Optibus entities must be configured per export."],
    };
  }
}

export class ExcelOptibusExportParser implements OptibusExportParser {
  supports(descriptor: OptibusExportFileDescriptor): boolean {
    return descriptor.format === "xlsx";
  }

  async parse(descriptor: OptibusExportFileDescriptor): Promise<ParserResult> {
    return {
      descriptor,
      records: [],
      warnings: [
        "Excel parser stub only: add a vetted XLSX reader and real Optibus workbook samples before parsing production files.",
        "No Excel content was read in this first implementation.",
      ],
    };
  }
}

export const DEFAULT_OPTIBUS_EXPORT_PARSERS: OptibusExportParser[] = [
  new CsvOptibusExportParser(),
  new JsonOptibusExportParser(),
  new ExcelOptibusExportParser(),
];

export async function parseExportWithRegisteredParser(
  descriptor: OptibusExportFileDescriptor,
  parsers = DEFAULT_OPTIBUS_EXPORT_PARSERS,
): Promise<ParserResult> {
  const parser = parsers.find((candidate) => candidate.supports(descriptor));
  if (!parser) {
    throw new Error(`No parser registered for ${descriptor.format} export ${descriptor.path}`);
  }
  return parser.parse(descriptor);
}

export function createEmptyNormalizedDataset(): OptibusNormalizedDataset {
  return {
    project: { id: "unknown", name: "unknown" },
    dataset: { id: "unknown", name: "unknown", projectId: "unknown" },
    schedule: { id: "unknown", name: "unknown", datasetId: "unknown" },
    routes: [],
    trips: [],
    blocks: [],
    duties: [],
    vehicleEvents: [],
    dutyEvents: [],
    deadheads: [],
    depots: [],
    reliefPoints: [],
    issues: [],
    preferences: [],
    runResults: [],
  };
}

function parseSimpleCsv(raw: string): Record<string, string>[] {
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return [];
  }
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function splitCsvLine(line: string): string[] {
  // First-pass parser for demo/stub use. Real exports need robust CSV dialect validation.
  return line.split(",").map((value) => value.trim().replace(/^"|"$/g, ""));
}
