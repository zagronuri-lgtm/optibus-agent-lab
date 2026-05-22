import type { KpiRecord } from "./kpiCollector";

export type IssueSeverity = "info" | "warning" | "high";

export interface Issue {
  severity: IssueSeverity;
  category:
    | "safety"
    | "access"
    | "selector"
    | "data_quality"
    | "configuration"
    | "readiness";
  summary: string;
  facts: string[];
  assumptions: string[];
  risks: string[];
  recommendations: string[];
}

export interface EvidenceBuckets {
  facts: string[];
  assumptions: string[];
  risks: string[];
  recommendations: string[];
}

export class IssueCollector {
  fromKpis(records: KpiRecord[]): Issue[] {
    return records.flatMap((record): Issue[] => {
      if (record.status === "collected") {
        return [];
      }

      if (record.status === "parse_error") {
        return [
          {
            severity: "warning",
            category: "data_quality",
            summary: `KPI could not be parsed as a number: ${record.name}`,
            facts: [
              `Selector ${record.selector} returned "${record.rawValue ?? ""}".`,
            ],
            assumptions: [
              "The selector points to the intended KPI element.",
              "The configured parser should match the KPI format.",
            ],
            risks: [
              "Comparison output may be misleading if the KPI format changed.",
            ],
            recommendations: [
              "Confirm the visible KPI format and update the YAML parser setting.",
            ],
          },
        ];
      }

      return [
        {
          severity: "warning",
          category: "selector",
          summary: `KPI missing or empty: ${record.name}`,
          facts: [`Selector ${record.selector} did not return visible text.`],
          assumptions: [
            "The current operator has permission to view the target KPI.",
          ],
          risks: [
            "A missing KPI prevents reliable baseline or scenario comparison.",
          ],
          recommendations: [
            "Verify the selector and capture the KPI manually if the UI changed.",
          ],
        },
      ];
    });
  }

  toEvidenceBuckets(issues: Issue[]): EvidenceBuckets {
    return {
      facts: unique(issues.flatMap((issue) => issue.facts)),
      assumptions: unique(issues.flatMap((issue) => issue.assumptions)),
      risks: unique(issues.flatMap((issue) => issue.risks)),
      recommendations: unique(
        issues.flatMap((issue) => issue.recommendations),
      ),
    };
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
