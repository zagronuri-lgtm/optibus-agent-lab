import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import { loadKnowledgeBase } from "./knowledgeBase";
import { ReadOnlyMapAudit, type ReadOnlyMapAuditInput } from "./readOnlyMapAudit";

async function main(): Promise<void> {
  const configPath = "configs/holon_readiness_audit_demo.yaml";
  const config = parse(await readFile(configPath, "utf8")) as ReadOnlyMapAuditInput;
  const knowledgeBase = await loadKnowledgeBase(config.knowledge_base);
  const audit = new ReadOnlyMapAudit(knowledgeBase);
  const result = await audit.run(config);

  console.log("Read-only Optibus Map Audit completed safely.");
  console.log(`Report: ${result.reportPath}`);
  console.log(`Readiness: ${result.score}`);
  console.log(`Blockers: ${result.blockers.length}`);
  for (const blocker of result.blockers) {
    console.log(`- ${blocker}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
