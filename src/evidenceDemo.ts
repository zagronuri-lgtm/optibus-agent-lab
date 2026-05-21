import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import { BlockerTriage } from "./blockerTriage";
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

  const audit = new ReadOnlyMapAudit(knowledgeBase);
  const readiness = audit.evaluate(auditConfig);
  const triage = new BlockerTriage().triage(readiness.blockers);
  const failureDiagnosis = new FailureDiagnosisCollector(knowledgeBase).collect(failureConfig);
  const builder = new EvidencePlanBuilder();
  const plan = builder.build({ readiness, triage, failureDiagnosis, knowledgeBase });
  await builder.writeReport(plan);

  console.log("Read-only Holon evidence collection plan completed safely.");
  console.log(`Report: ${plan.reportPath}`);
  console.log(`Evidence items: ${plan.evidenceItems.length}`);
  console.log(`Final decision: ${plan.finalDecision}`);
  console.log("Top 15 evidence items:");
  for (const [index, item] of plan.topPrioritySequence.entries()) {
    console.log(`${index + 1}. ${item.id} [${item.priority}] ${item.category} - ${item.blockerAddressed}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
