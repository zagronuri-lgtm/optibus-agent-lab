import { AgentBrowser } from "./browser";
import { IssueCollector, type EvidenceBuckets, type Issue } from "./issueCollector";
import {
  KpiCollector,
  type KpiDefinition,
  type KpiRecord,
} from "./kpiCollector";
import { FileLogger } from "./logger";
import { ReportGenerator } from "./reportGenerator";
import { SafetyGate, SafetyGateError, WorkflowState } from "./safetyGate";

export interface LabConfig {
  schema_version: number;
  name: string;
  description?: string;
  mode: string;
  target?: {
    tenant?: string;
    map_name?: string;
    url?: string;
    authentication?: string;
  };
  safety?: {
    v1_simulation_only?: boolean;
    require_approval_token?: boolean;
    expected_simulated_run_token?: string;
  };
  workflow?: {
    start_state?: WorkflowState;
    planned_states?: WorkflowState[];
  };
  audit?: {
    kpis?: KpiDefinition[];
  };
  scenario?: {
    run_label?: string;
    run_type?: string;
    real_run_allowed?: boolean;
    simulated_only?: boolean;
    intent?: string;
    assumptions?: string[];
  };
  reporting?: {
    output_dir?: string;
  };
}

export interface WorkflowEngineOptions {
  config: LabConfig;
  logger: FileLogger;
  safetyGate: SafetyGate;
  browser?: AgentBrowser;
  reportGenerator?: ReportGenerator;
}

export interface WorkflowRunResult {
  reportPath?: string;
  kpis: KpiRecord[];
  issues: Issue[];
  evidence: EvidenceBuckets;
}

export class WorkflowEngine {
  private readonly issueCollector = new IssueCollector();
  private readonly reportGenerator: ReportGenerator;

  constructor(private readonly options: WorkflowEngineOptions) {
    this.reportGenerator =
      options.reportGenerator ??
      new ReportGenerator(options.config.reporting?.output_dir);
  }

  async runPlanOnly(): Promise<WorkflowRunResult> {
    const evidence = this.baseEvidence();
    evidence.facts.push(
      "Plan-only execution was used; no browser actions were performed.",
    );
    evidence.recommendations.push(
      "Use browser mode only after a human operator is ready to authenticate manually.",
    );

    await this.options.logger.action({
      workflowState: this.options.safetyGate.state(),
      url: this.options.config.target?.url ?? "",
      pageTitle: "",
      action: "workflow.planOnly",
      reason: "Generate safe workflow plan without launching a browser.",
      outcome: "info",
      details: {
        config: this.options.config.name,
        mode: this.options.config.mode,
      },
    });

    const reportPath = await this.reportGenerator.writeMarkdownReport(
      `${this.options.config.name}-plan.md`,
      {
        title: `Optibus Agent Lab Plan: ${this.options.config.name}`,
        metadata: this.metadata(),
        kpis: [],
        issues: [],
        evidence,
      },
    );

    return {
      reportPath,
      kpis: [],
      issues: [],
      evidence,
    };
  }

  async runAuditWorkflow(): Promise<WorkflowRunResult> {
    if (!this.options.browser) {
      throw new Error("Browser mode requires an AgentBrowser instance.");
    }

    const browser = this.options.browser;
    const evidence = this.baseEvidence();
    const targetUrl = this.options.config.target?.url;

    if (targetUrl) {
      await browser.majorStep("academy-navigation", "Open target map URL.", async () => {
        await browser.goto(targetUrl, "Navigate to operator-provided target map URL.");
      });
      this.options.safetyGate.transitionTo(WorkflowState.MapAuditMode);
    }

    const kpis = await browser.majorStep(
      "map-audit-kpis",
      "Collect read-only KPI values.",
      async () => {
        const collector = new KpiCollector(browser);
        return collector.collect(this.options.config.audit?.kpis ?? []);
      },
    );

    evidence.facts.push(
      `Collected ${kpis.length} configured KPI record(s) in read-only mode.`,
    );
    const issues = this.issueCollector.fromKpis(kpis);
    mergeEvidence(evidence, this.issueCollector.toEvidenceBuckets(issues));

    if (this.options.safetyGate.state() === WorkflowState.MapAuditMode) {
      this.options.safetyGate.transitionTo(WorkflowState.RunReadinessMode);
    }

    const reportPath = await this.reportGenerator.writeMarkdownReport(
      `${this.options.config.name}-baseline.md`,
      {
        title: `Baseline Audit: ${this.options.config.name}`,
        metadata: this.metadata(),
        kpis,
        issues,
        evidence,
      },
    );

    return {
      reportPath,
      kpis,
      issues,
      evidence,
    };
  }

  async simulateControlledRun(approvalToken?: string): Promise<void> {
    if (!this.options.browser) {
      throw new Error("Controlled run simulation requires browser mode.");
    }

    while (this.options.safetyGate.state() !== WorkflowState.ControlledRunMode) {
      this.advanceTowardControlledRun();
    }

    await this.options.browser.majorStep(
      "controlled-run-simulation",
      "Record simulated controlled run. No real Run click is performed.",
      async () => {
        await this.options.browser?.simulateRun(
          this.options.config.scenario?.intent ??
            "Simulate controlled run intent.",
          approvalToken,
        );
      },
    );
  }

  private advanceTowardControlledRun(): void {
    const state = this.options.safetyGate.state();
    if (state === WorkflowState.AcademyMode) {
      this.options.safetyGate.transitionTo(WorkflowState.MapAuditMode);
      return;
    }
    if (state === WorkflowState.MapAuditMode) {
      this.options.safetyGate.transitionTo(WorkflowState.RunReadinessMode);
      return;
    }
    if (state === WorkflowState.RunReadinessMode) {
      this.options.safetyGate.transitionTo(WorkflowState.ApprovalGate);
      return;
    }
    if (state === WorkflowState.ApprovalGate) {
      this.options.safetyGate.transitionTo(WorkflowState.ControlledRunMode);
      return;
    }

    throw new SafetyGateError({
      allowed: false,
      reason: `Cannot advance from ${state} toward ControlledRunMode.`,
    });
  }

  private metadata(): Record<string, string | number | boolean | undefined> {
    return {
      config: this.options.config.name,
      mode: this.options.config.mode,
      tenant: this.options.config.target?.tenant,
      map: this.options.config.target?.map_name,
      targetUrl: this.options.config.target?.url,
      workflowState: this.options.safetyGate.state(),
      v1SimulationOnly: this.options.config.safety?.v1_simulation_only ?? true,
      generatedAt: new Date().toISOString(),
    };
  }

  private baseEvidence(): EvidenceBuckets {
    return {
      facts: [
        "Optibus Agent Lab v1 forbids real destructive browser actions.",
        "Controlled Run Mode is simulation-only in this scaffold.",
      ],
      assumptions: [
        "The operator will authenticate manually through approved Optibus login flows when browser mode is used.",
        ...(this.options.config.scenario?.assumptions ?? []),
      ],
      risks: [
        "Placeholder selectors must be validated against the real UI before relying on collected KPIs.",
      ],
      recommendations: [
        "Review all generated evidence before approving any future operational workflow.",
      ],
    };
  }
}

function mergeEvidence(target: EvidenceBuckets, source: EvidenceBuckets): void {
  target.facts.push(...source.facts);
  target.assumptions.push(...source.assumptions);
  target.risks.push(...source.risks);
  target.recommendations.push(...source.recommendations);
}
