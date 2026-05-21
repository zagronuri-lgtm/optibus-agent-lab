import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import { BlockerTriage } from "./blockerTriage";
import { loadKnowledgeBase } from "./knowledgeBase";
import { ReadOnlyMapAudit, type ReadOnlyMapAuditInput } from "./readOnlyMapAudit";

async function main(): Promise<void> {
  const config = parse(
    await readFile("configs/holon_readiness_audit_demo.yaml", "utf8"),
  ) as ReadOnlyMapAuditInput;
  const knowledgeBase = await loadKnowledgeBase(config.knowledge_base);
  const audit = new ReadOnlyMapAudit(knowledgeBase);
  const auditResult = audit.evaluate(config);
  const triage = new BlockerTriage();
  const plan = triage.triage(auditResult.blockers);
  await triage.writeReport(plan);

  console.log("Read-only Holon blocker triage completed safely.");
  console.log(`Report: ${plan.reportPath}`);
  console.log(`Decision: ${plan.decision}`);
  console.log(`Blockers: ${plan.triagedBlockers.length}`);
  console.log("Top 10 next actions:");
  for (const [index, action] of plan.topNextActions.entries()) {
    console.log(`${index + 1}. ${action}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
