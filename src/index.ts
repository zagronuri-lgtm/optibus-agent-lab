import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import { AgentBrowser } from "./browser";
import { loadKnowledgeBase } from "./knowledgeBase";
import { FileLogger } from "./logger";
import { SafetyGate } from "./safetyGate";
import { WorkflowEngine, initialWorkflowState, type LabConfig } from "./workflowEngine";

interface CliOptions {
  configPath: string;
  browserMode: boolean;
  approvalToken?: string;
  headed: boolean;
}

async function main(): Promise<void> {
  const cli = parseArgs(process.argv.slice(2));
  const config = await loadConfig(cli.configPath);
  const logger = new FileLogger();
  await logger.init();
  const knowledgeBase = await loadKnowledgeBase(config.knowledge_base);

  const safetyGate = new SafetyGate(initialWorkflowState(config));

  if (!cli.browserMode) {
    const engine = new WorkflowEngine({ config, logger, safetyGate, knowledgeBase });
    const result = await engine.runPlanOnly();
    printResult(result.reportPath, logger.actionLogPath);
    return;
  }

  const browser = new AgentBrowser(logger, safetyGate, {
    headless: !cli.headed,
  });
  await browser.start();

  try {
    const engine = new WorkflowEngine({ config, logger, safetyGate, knowledgeBase, browser });
    const result = await engine.runAuditWorkflow();

    if (config.mode === "simulated_controlled_run") {
      await engine.simulateControlledRun(cli.approvalToken);
    }

    printResult(result.reportPath, logger.actionLogPath);
  } finally {
    await browser.close();
  }
}

async function loadConfig(configPath: string): Promise<LabConfig> {
  const rawConfig = await readFile(configPath, "utf8");
  const config = parse(rawConfig) as LabConfig;

  if (!config?.name || !config.schema_version) {
    throw new Error(`Invalid config file: ${configPath}`);
  }

  return config;
}

function parseArgs(args: string[]): CliOptions {
  return {
    configPath: readOption(args, "--config") ?? "configs/holon_baseline.yaml",
    browserMode: args.includes("--browser"),
    approvalToken: readOption(args, "--approval-token"),
    headed: args.includes("--headed"),
  };
}

function readOption(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) {
    return undefined;
  }

  return args[index + 1];
}

function printResult(reportPath: string | undefined, actionLogPath: string): void {
  console.log("Optibus Agent Lab completed safely.");
  console.log(`Action log: ${actionLogPath}`);
  if (reportPath) {
    console.log(`Report: ${reportPath}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
