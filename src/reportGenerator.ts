import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { EvidenceBuckets, Issue } from "./issueCollector";
import type { KpiRecord } from "./kpiCollector";

export interface ReportInput {
  title: string;
  metadata: Record<string, string | number | boolean | undefined>;
  kpis?: KpiRecord[];
  issues?: Issue[];
  evidence: EvidenceBuckets;
}

export class ReportGenerator {
  constructor(private readonly outputDir = "reports/generated") {}

  async writeMarkdownReport(fileName: string, input: ReportInput): Promise<string> {
    await mkdir(this.outputDir, { recursive: true });
    const reportPath = path.join(this.outputDir, fileName);
    await writeFile(reportPath, this.renderMarkdown(input), "utf8");
    return reportPath;
  }

  renderMarkdown(input: ReportInput): string {
    return [
      `# ${input.title}`,
      "",
      "## Metadata",
      "",
      ...Object.entries(input.metadata).map(
        ([key, value]) => `- ${key}: ${value ?? ""}`,
      ),
      "",
      "## KPI Records",
      "",
      renderKpiTable(input.kpis ?? []),
      "",
      "## Issues",
      "",
      renderIssueList(input.issues ?? []),
      "",
      renderEvidenceSection("Facts", input.evidence.facts),
      "",
      renderEvidenceSection("Assumptions", input.evidence.assumptions),
      "",
      renderEvidenceSection("Risks", input.evidence.risks),
      "",
      renderEvidenceSection(
        "Recommendations",
        input.evidence.recommendations,
      ),
      "",
    ].join("\n");
  }
}

function renderKpiTable(records: KpiRecord[]): string {
  if (records.length === 0) {
    return "_No KPI records collected._";
  }

  return [
    "| KPI | Value | Unit | Selector | Status | Collected at |",
    "| --- | --- | --- | --- | --- | --- |",
    ...records.map((record) =>
      [
        record.name,
        record.rawValue ?? "",
        record.unit ?? "",
        `\`${record.selector}\``,
        record.status,
        record.collectedAt,
      ]
        .map(escapeTableCell)
        .join(" | "),
    ).map((row) => `| ${row} |`),
  ].join("\n");
}

function renderIssueList(issues: Issue[]): string {
  if (issues.length === 0) {
    return "_No issues recorded._";
  }

  return issues
    .map(
      (issue) =>
        `- **${issue.severity.toUpperCase()} / ${issue.category}**: ${issue.summary}`,
    )
    .join("\n");
}

function renderEvidenceSection(title: string, values: string[]): string {
  return [
    `## ${title}`,
    "",
    values.length > 0
      ? values.map((value) => `- ${value}`).join("\n")
      : "_None recorded._",
  ].join("\n");
}

function escapeTableCell(value: string): string {
  return value.replace(/\|/g, "\\|");
}
