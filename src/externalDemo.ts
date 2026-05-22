import {
  buildExternalIntegrationPlan,
  createDisabledProviders,
  loadExternalSourcesConfig,
  writeExternalIntegrationPlanReport,
} from "./externalDataSources";

async function main(): Promise<void> {
  const config = await loadExternalSourcesConfig();
  const providers = createDisabledProviders(config);
  const plan = buildExternalIntegrationPlan(config);
  await writeExternalIntegrationPlanReport(plan);

  console.log("External data integration is planned but not active.");
  console.log(`Report: ${plan.reportPath}`);
  console.log(`Defined providers: ${providers.map((provider) => provider.name).join(", ")}`);
  console.log(`External API calls enabled: ${config.external_api_calls_enabled}`);
  console.log(`Markav scraping enabled: ${config.markav_scraping_enabled}`);
  console.log("Future decisions enabled:");
  for (const decision of plan.futureDecisionsEnabled) {
    console.log(`- ${decision}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
