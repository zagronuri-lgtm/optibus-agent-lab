import { holonBaselineKpis, holonDataFirstSample } from "./holonDataFirstSample";
import {
  buildDataFirstAnalysisReport,
  writeDataFirstAnalysisReport,
} from "./optibusDataFirstAnalysis";

async function main(): Promise<void> {
  const report = buildDataFirstAnalysisReport(holonDataFirstSample, holonBaselineKpis);
  await writeDataFirstAnalysisReport(report);
  console.log("Optibus data-first analysis demo completed safely.");
  console.log(`Report: ${report.reportPath}`);
  console.log(`Findings: ${report.findings.length}`);
  console.log(`Recommendations: ${report.recommendations.length}`);
  console.log(`Exports needed next: ${report.exportsNeededNext.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
