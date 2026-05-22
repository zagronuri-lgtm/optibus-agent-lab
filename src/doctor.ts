import { loadKnowledgeBase, isRealKnowledgeBase } from "./knowledgeBase";
import { RulesEngine } from "./rulesEngine";

async function main(): Promise<void> {
  const knowledgeBase = await loadKnowledgeBase();
  const rulesEngine = new RulesEngine();
  const readiness = rulesEngine.evaluateRunReadiness({});
  const realKnowledgeBase = isRealKnowledgeBase(knowledgeBase);

  console.log("Optibus Agent Lab doctor");
  console.log(`knowledgeBase.path=${knowledgeBase.path}`);
  console.log(`knowledgeBase.exists=${knowledgeBase.loaded}`);
  console.log(`knowledgeBase.placeholder=${knowledgeBase.isPlaceholder}`);
  console.log(`controlledRun.blockedWhenRealKnowledgeBaseMissing=${!realKnowledgeBase}`);
  console.log(`emptyReadiness.allowed=${readiness.allowed}`);
  console.log(`emptyReadiness.blockers=${readiness.blockers.length}`);

  if (!knowledgeBase.loaded) {
    console.log("status=failed: knowledge/optibus_mastery.md is missing");
    process.exitCode = 1;
    return;
  }

  if (knowledgeBase.isPlaceholder) {
    console.log("status=warning: knowledge/optibus_mastery.md is a placeholder; Controlled Run Mode remains blocked");
    return;
  }

  console.log("status=ok");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
