import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import { BlockerTriage } from "./blockerTriage";
import {
  BrowserEvidenceCollector,
  demoCaptureInputs,
} from "./browserEvidenceCollector";
import { EvidencePlanBuilder } from "./evidencePlan";
import {
  FailureDiagnosisCollector,
  type FailureDiagnosisInput,
} from "./failureDiagnosisCollector";
import { loadKnowledgeBase } from "./knowledgeBase";
import { ReadOnlyMapAudit, type ReadOnlyMapAuditInput } from "./readOnlyMapAudit";

async function main(): Promise<void> {
  const auditConfig = parse(
    await readFile("configs/holon_readiness_audit_demo.yaml", "utf8"),
  ) as ReadOnlyMapAuditInput;
  const failureConfig = parse(
    await readFile("configs/holon_failure_diagnosis_demo.yaml", "utf8"),
  ) as FailureDiagnosisInput;
  const knowledgeBase = await loadKnowledgeBase(auditConfig.knowledge_base);
  const readiness = new ReadOnlyMapAudit(knowledgeBase).evaluate(auditConfig);
  const triage = new BlockerTriage().triage(readiness.blockers);
  const failureDiagnosis = new FailureDiagnosisCollector(knowledgeBase).collect(failureConfig);
  const evidencePlan = new EvidencePlanBuilder().build({
    readiness,
    triage,
    failureDiagnosis,
    knowledgeBase,
  });
  const collector = new BrowserEvidenceCollector();
  const session = await collector.simulateCapture(
    demoCaptureInputs(evidencePlan.evidenceItems),
  );

  console.log("Read-only browser evidence collection demo completed safely.");
  console.log(`Report: ${session.reportPath}`);
  console.log(`Evidence JSON: ${session.evidenceJsonPath}`);
  console.log(`Records: ${session.records.length}`);
  console.log(`Controlled Run enabled: ${session.controlledRunEnabled}`);
  for (const record of session.records) {
    console.log(
      `- ${record.evidenceItemId}: ${record.category}, closesBlocker=${record.closesBlocker}, followUpRequired=${record.followUpRequired}`,
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
