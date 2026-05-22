import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";

export interface RouteInfoQuery {
  routeId?: string;
  lineNumber?: string;
  operatorId?: string;
  date?: string;
}

export interface RouteDateQuery extends RouteInfoQuery {
  date: string;
}

export interface NearbyStopsQuery {
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface DeadheadServiceQuery {
  fromStopId?: string;
  toStopId?: string;
  startTime?: string;
  endTime?: string;
  routeContext?: string;
}

export interface TripChangeRiskQuery extends RouteDateQuery {
  tripId?: string;
  changeReason?: string;
}

export interface ServiceAdditionQuery {
  corridor?: string;
  fromStopId?: string;
  toStopId?: string;
  timeWindow?: string;
}

export interface ExternalTransitDataResult<T = unknown> {
  sourceName: string;
  active: boolean;
  dataAvailable: boolean;
  data?: T;
  limitations: string[];
  assumptions: string[];
}

export interface ExternalTransitDataProvider {
  readonly name: string;
  readonly active: boolean;
  getRouteInfo(query: RouteInfoQuery): Promise<ExternalTransitDataResult>;
  getStopsForRoute(query: RouteInfoQuery): Promise<ExternalTransitDataResult>;
  getTripsForRouteAndDate(query: RouteDateQuery): Promise<ExternalTransitDataResult>;
  getServiceFrequency(query: RouteDateQuery): Promise<ExternalTransitDataResult>;
  getObservedPerformanceIfAvailable(query: RouteDateQuery): Promise<ExternalTransitDataResult>;
  getRidershipOrLoadProxyIfAvailable(query: RouteDateQuery): Promise<ExternalTransitDataResult>;
  findNearbyStops(query: NearbyStopsQuery): Promise<ExternalTransitDataResult>;
  analyzeDeadheadAsPotentialService(query: DeadheadServiceQuery): Promise<ExternalTransitDataResult>;
  validateTripDeletionRisk(query: TripChangeRiskQuery): Promise<ExternalTransitDataResult>;
  validateServiceAdditionOpportunity(query: ServiceAdditionQuery): Promise<ExternalTransitDataResult>;
}

export interface ExternalSourceDefinition {
  name: string;
  url: string;
  provider_key: string;
  access_method: string;
  active: boolean;
  expected_data_types: string[];
  optibus_analysis_help: string[];
  limitations: string[];
  risks: string[];
  privacy_security_notes: string[];
  future_decisions_supported: string[];
}

export interface ExternalSourcesConfig {
  schema_version: number;
  phase: string;
  status: string;
  external_api_calls_enabled: boolean;
  markav_scraping_enabled: boolean;
  sources: ExternalSourceDefinition[];
}

export interface ExternalIntegrationPlan {
  reportPath: string;
  active: false;
  sources: ExternalSourceDefinition[];
  definedProviders: string[];
  futureDecisionsEnabled: string[];
}

export class DisabledExternalTransitDataProvider implements ExternalTransitDataProvider {
  readonly active = false;

  constructor(readonly name: string) {}

  async getRouteInfo(query: RouteInfoQuery): Promise<ExternalTransitDataResult> {
    return this.disabled("getRouteInfo", query);
  }

  async getStopsForRoute(query: RouteInfoQuery): Promise<ExternalTransitDataResult> {
    return this.disabled("getStopsForRoute", query);
  }

  async getTripsForRouteAndDate(query: RouteDateQuery): Promise<ExternalTransitDataResult> {
    return this.disabled("getTripsForRouteAndDate", query);
  }

  async getServiceFrequency(query: RouteDateQuery): Promise<ExternalTransitDataResult> {
    return this.disabled("getServiceFrequency", query);
  }

  async getObservedPerformanceIfAvailable(query: RouteDateQuery): Promise<ExternalTransitDataResult> {
    return this.disabled("getObservedPerformanceIfAvailable", query);
  }

  async getRidershipOrLoadProxyIfAvailable(query: RouteDateQuery): Promise<ExternalTransitDataResult> {
    return this.disabled("getRidershipOrLoadProxyIfAvailable", query);
  }

  async findNearbyStops(query: NearbyStopsQuery): Promise<ExternalTransitDataResult> {
    return this.disabled("findNearbyStops", query);
  }

  async analyzeDeadheadAsPotentialService(query: DeadheadServiceQuery): Promise<ExternalTransitDataResult> {
    return this.disabled("analyzeDeadheadAsPotentialService", query);
  }

  async validateTripDeletionRisk(query: TripChangeRiskQuery): Promise<ExternalTransitDataResult> {
    return this.disabled("validateTripDeletionRisk", query);
  }

  async validateServiceAdditionOpportunity(query: ServiceAdditionQuery): Promise<ExternalTransitDataResult> {
    return this.disabled("validateServiceAdditionOpportunity", query);
  }

  private async disabled(method: string, query: unknown): Promise<ExternalTransitDataResult> {
    return {
      sourceName: this.name,
      active: false,
      dataAvailable: false,
      data: { method, query },
      limitations: ["External data integration is planned but not active.", "No external API calls or Markav scraping are performed in v1."],
      assumptions: ["Future integration must explicitly enable the provider and validate endpoint/data availability."],
    };
  }
}

export async function loadExternalSourcesConfig(
  configPath = "configs/external_sources.yaml",
): Promise<ExternalSourcesConfig> {
  return parse(await readFile(configPath, "utf8")) as ExternalSourcesConfig;
}

export function createDisabledProviders(config: ExternalSourcesConfig): ExternalTransitDataProvider[] {
  return config.sources.map((source) => new DisabledExternalTransitDataProvider(source.name));
}

export function buildExternalIntegrationPlan(
  config: ExternalSourcesConfig,
  reportPath = "reports/generated/external_data_integration_plan.md",
): ExternalIntegrationPlan {
  return {
    reportPath,
    active: false,
    sources: config.sources,
    definedProviders: config.sources.map((source) => source.name),
    futureDecisionsEnabled: unique(config.sources.flatMap((source) => source.future_decisions_supported)),
  };
}

export async function writeExternalIntegrationPlanReport(
  plan: ExternalIntegrationPlan,
): Promise<string> {
  await mkdir(path.dirname(plan.reportPath), { recursive: true });
  await writeFile(plan.reportPath, renderExternalIntegrationPlan(plan), "utf8");
  return plan.reportPath;
}

function renderExternalIntegrationPlan(plan: ExternalIntegrationPlan): string {
  return [
    "# Phase 2B - External Transit Data Integration Plan",
    "",
    "## Status",
    "",
    "External data integration is planned but not active.",
    "No external APIs are called, Markav is not scraped, and no service change recommendations are made in this v1 plan.",
    "",
    "## Defined providers",
    "",
    ...plan.definedProviders.map((provider) => `- ${provider}`),
    "",
    "## Sources",
    "",
    ...plan.sources.flatMap(renderSource),
    "",
    "## Future agent decisions supported",
    "",
    ...plan.futureDecisionsEnabled.map((decision) => `- ${decision}`),
    "",
    "## Safety constraints",
    "",
    "- Do not call external APIs unless explicitly enabled.",
    "- Do not scrape Markav unless explicitly approved and access is confirmed.",
    "- Do not assume data exists unless the API or source provides it.",
    "- Do not make service deletion recommendations without external validation.",
    "- Do not make service addition recommendations without demand or service-gap evidence.",
    "- Keep external evidence separate from Optibus operational facts.",
    "",
  ].join("\n");
}

function renderSource(source: ExternalSourceDefinition): string[] {
  return [
    `### ${source.name}`,
    "",
    `- Source name: ${source.name}`,
    `- URL: ${source.url}`,
    `- Access method: ${source.access_method}`,
    `- Active: ${source.active}`,
    "- Expected data types:",
    ...source.expected_data_types.map((item) => `  - ${item}`),
    "- How it helps Optibus analysis:",
    ...source.optibus_analysis_help.map((item) => `  - ${item}`),
    "- Limitations:",
    ...source.limitations.map((item) => `  - ${item}`),
    "- Risks:",
    ...source.risks.map((item) => `  - ${item}`),
    "- Privacy/security notes:",
    ...source.privacy_security_notes.map((item) => `  - ${item}`),
    "- Future decisions it can support:",
    ...source.future_decisions_supported.map((item) => `  - ${item}`),
    "",
  ];
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
