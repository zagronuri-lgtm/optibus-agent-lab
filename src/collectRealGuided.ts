import { RealReadOnlyMapCollector } from "./realReadOnlyMapCollector";

interface CliOptions {
  url?: string;
  cdpEndpoint?: string;
  screenLimit?: number;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const collector = new RealReadOnlyMapCollector();
  const result = await collector.runGuided({
    url: options.url,
    cdpEndpoint: options.cdpEndpoint,
    reportPath: "reports/generated/real_map_readonly_audit.md",
    evidenceJsonPath: "logs/evidence/real_map_readonly_audit.json",
    screenshotDir: "screenshots",
    screenLimit: options.screenLimit,
  });

  console.log("Real read-only map audit completed safely.");
  console.log(`Report: ${result.reportPath}`);
  console.log(`Evidence JSON: ${result.evidenceJsonPath}`);
  console.log(`Readiness decision: ${result.decision}`);
  console.log(`Controlled Run enabled: ${result.controlledRunEnabled}`);
}

function parseArgs(args: string[]): CliOptions {
  return {
    url: readOption(args, "--url"),
    cdpEndpoint: readOption(args, "--cdp"),
    screenLimit: readNumberOption(args, "--screen-limit"),
  };
}

function readOption(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) {
    return undefined;
  }
  return args[index + 1];
}

function readNumberOption(args: string[], name: string): number | undefined {
  const value = readOption(args, name);
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  console.error("Usage: npm run collect:real:guided -- --url <Optibus URL> OR --cdp <Chrome DevTools endpoint>");
  process.exitCode = 1;
});
