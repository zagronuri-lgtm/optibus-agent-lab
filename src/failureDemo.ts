import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import {
  FailureDiagnosisCollector,
  type FailureDiagnosisInput,
} from "./failureDiagnosisCollector";
import { loadKnowledgeBase } from "./knowledgeBase";

async function main(): Promise<void> {
  const config = parse(
    await readFile("configs/holon_failure_diagnosis_demo.yaml", "utf8"),
  ) as FailureDiagnosisInput;
  const knowledgeBase = await loadKnowledgeBase(config.knowledge_base);
  const collector = new FailureDiagnosisCollector(knowledgeBase);
  const report = collector.collect(config);
  await collector.writeReport(report);

  console.log("Read-only Holon failure diagnosis completed safely.");
  console.log(`Report: ${report.reportPath}`);
  console.log(`Holon failure classification: ${report.overallFailureClassification}`);
  console.log(`Recommended next action: ${report.recommendedNextAction}`);
  console.log(`Optibus Support recommended: ${report.optibusSupportRecommended}`);
  for (const diagnosis of report.diagnoses) {
    console.log(
      `- ${diagnosis.runName}: status=${diagnosis.finalStatus}, type=${diagnosis.failureType}, confidence=${diagnosis.confidenceScore.toFixed(2)}, autoRetryAllowed=${diagnosis.autoRetryAllowed}`,
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
