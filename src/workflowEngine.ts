import { AgentBrowser } from "./browser";
import { isRealKnowledgeBase, type KnowledgeBase } from "./knowledgeBase";
import { IssueCollector, type EvidenceBuckets, type Issue } from "./issueCollector";
import {
  KpiCollector,
  type KpiDefinition,
  type KpiRecord,
} from "./kpiCollector";
import { FileLogger } from "./logger";
import { ReportGenerator } from "./reportGenerator";
import {
  RulesEngine,
  type PreRunReadinessChecklist,
  type RunReadinessResult,
} from "./rulesEngine";
import { SafetyGate, SafetyGateError, WorkflowState, normalizeWorkflowState } from "./safetyGate";

export interface LabConfig {
  schema_version: number;
  name: string;
  description?: string;
  mode: string;
  knowledge_base?: string;
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
    start_state?: WorkflowState | string;
    planned_states?: Array<WorkflowState | string>;
  };
  map_audit?: {
    has_copy_or_snapshot?: boolean;
    baseline_kpis_present?: boolean;
  };
  audit?: {
    kpis?: KpiDefinition[];
  };
  readiness?: PreRunReadinessChecklist;
  scenario?: {
    run_label?: string;
    run_type?: string;
    real_run_allowed?: boolean;
    simulated_only?: boolean;
    intent?: string;
    algorithm_choice?: string;
    algorithm_choice_reason?: string;
    assumptions?: string[];
  };
  failure?: {
    message?: string;
    auto_retry_allowed?: boolean;
    required_inspections?: string[];
  };
  reporting?: {
    output_dir?: string;
  };
}

export interface WorkflowEngineOptions {
  config: LabConfig;
  logger: FileLogger;
  safetyGate: SafetyGate;
  knowledgeBase: KnowledgeBase;
  browser?: AgentBrowser;
  reportGenerator?: ReportGenerator;
}

export interface WorkflowRunResult {
  reportPath?: string;
  kpis: KpiRecord[];
  issues: Issue[];
  evidence: EvidenceBuckets;
  readiness: RunReadinessResult;
}

export class WorkflowEngine {
  private readonly issueCollector = new IssueCollector();
  private readonly rulesEngine = new RulesEngine();
  private readonly reportGenerator: ReportGenerator;

  constructor(private readonly options: WorkflowEngineOptions) {
    this.reportGenerator =
      options.reportGenerator ??
      new ReportGenerator(options.config.reporting?.output_dir);
  }

  async runPlanOnly(): Promise<WorkflowRunResult> {
    const evidence = this.baseEvidence();
    const readiness = this.evaluateReadiness();
    evidence.facts.push(
      "Plan-only execution was used; no browser actions were performed.",
      `Knowledge base path: ${this.options.knowledgeBase.path}.`,
      `Knowledge base loaded: ${this.options.knowledgeBase.loaded}.`,
      `Knowledge base placeholder: ${this.options.knowledgeBase.isPlaceholder}.`,
      `Run readiness blockers: ${readiness.blockers.length}.`,
    );
    evidence.risks.push(...readiness.blockers.map((blocker) => blocker.summary));
    evidence.recommendations.push(
      "Use browser mode only after a human operator is ready to authenticate manually.",
      "Resolve all Run Readiness Gate blockers before requesting Controlled Run Mode.",
    );

    await this.options.logger.action({
      workflowState: this.options.safetyGate.state(),
      url: this.options.config.target?.url ?? "",
      pageTitle: "",
      action: "workflow.planOnly",
      selector: this.options.knowledgeBase.path,
      reason: "Generate safe Optibus workflow plan without launching a browser.",
      riskLevel: readiness.allowed ? "low" : "medium",
      screenshotPath: "",
      outcome: "info",
      details: {
        config: this.options.config.name,
        mode: this.options.config.mode,
        readinessAllowed: readiness.allowed,
        readinessBlockers: readiness.blockers.map((blocker) => blocker.id),
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
        readiness,
      },
    );

    return {
      reportPath,
      kpis: [],
      issues: [],
      evidence,
      readiness,
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

    this.advanceIfCurrent(WorkflowState.MapAuditMode, WorkflowState.SchedulingPreferencesAudit);
    this.advanceIfCurrent(WorkflowState.SchedulingPreferencesAudit, WorkflowState.RunMechanicsAudit);
    this.advanceIfCurrent(WorkflowState.RunMechanicsAudit, WorkflowState.RunReadinessGate);

    const readiness = this.evaluateReadiness(kpis);
    evidence.facts.push(`Run Readiness Gate allowed: ${readiness.allowed}.`);
    evidence.risks.push(...readiness.blockers.map((blocker) => blocker.summary));

    const reportPath = await this.reportGenerator.writeMarkdownReport(
      `${this.options.config.name}-baseline.md`,
      {
        title: `Baseline Audit: ${this.options.config.name}`,
        metadata: this.metadata(),
        kpis,
        issues,
        evidence,
        readiness,
      },
    );

    return {
      reportPath,
      kpis,
      issues,
      evidence,
      readiness,
    };
  }

  async simulateControlledRun(approvalToken?: string): Promise<void> {
    if (!this.options.browser) {
      throw new Error("Controlled run simulation requires browser mode.");
    }

    if (!isRealKnowledgeBase(this.options.knowledgeBase)) {
      throw new SafetyGateError({
        allowed: false,
        destructiveAction: "Run",
        expectedApprovalToken: this.options.safetyGate.expectedApprovalToken(
          WorkflowState.ControlledRunMode,
          "Run",
        ),
        reason: "Controlled Run Mode is blocked because the real Optibus knowledge base is missing.",
      });
    }

    const readiness = this.evaluateReadiness();
    if (!readiness.allowed) {
      throw new SafetyGateError({
        allowed: false,
        destructiveAction: "Run",
        expectedApprovalToken: this.options.safetyGate.expectedApprovalToken(
          WorkflowState.ControlledRunMode,
          "Run",
        ),
        reason: `Run Readiness Gate blocked simulation: ${readiness.blockers.map((blocker) => blocker.id).join(", ")}.`,
      });
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

  diagnoseFailureMessage(message: string): EvidenceBuckets | undefined {
    const plan = this.rulesEngine.diagnoseOptimizationFailure(message);
    if (!plan) {
      return undefined;
    }

    return {
      facts: plan.facts,
      assumptions: ["The failure message reflects the latest run or simulated-run evidence supplied by the operator."],
      risks: plan.risks,
      recommendations: plan.recommendations.concat(
        plan.requiredInspections.map((inspection) => `Inspect ${inspection}.`),
      ),
    };
  }

  private evaluateReadiness(kpis?: KpiRecord[]): RunReadinessResult {
    const configured = this.options.config.readiness ?? {};
    const checklist: PreRunReadinessChecklist = {
      ...configured,
      has_copy_or_snapshot:
        this.options.config.map_audit?.has_copy_or_snapshot ?? configured.has_copy_or_snapshot,
      baseline_kpis_present:
        this.options.config.map_audit?.baseline_kpis_present ??
        configured.baseline_kpis_present ??
        (kpis ? kpis.some((kpi) => kpi.status === "collected") : undefined),
    };

    return this.rulesEngine.evaluateRunReadiness(checklist);
  }

  private advanceTowardControlledRun(): void {
    const state = this.options.safetyGate.state();
    if (state === WorkflowState.AcademyMode) {
      this.options.safetyGate.transitionTo(WorkflowState.MapAuditMode);
      return;
    }
    if (state === WorkflowState.MapAuditMode) {
      this.options.safetyGate.transitionTo(WorkflowState.SchedulingPreferencesAudit);
      return;
    }
    if (state === WorkflowState.SchedulingPreferencesAudit) {
      this.options.safetyGate.transitionTo(WorkflowState.RunMechanicsAudit);
      return;
    }
    if (state === WorkflowState.RunMechanicsAudit) {
      this.options.safetyGate.transitionTo(WorkflowState.RunReadinessGate);
      return;
    }
    if (state === WorkflowState.RunReadinessGate) {
      this.options.safetyGate.transitionTo(WorkflowState.ApprovalGate);
      return;
    }
    if (state === WorkflowState.ApprovalGate) {
      this.options.safetyGate.transitionTo(WorkflowState.ControlledRunMode);
      return;
    }

    throw new SafetyGateError({
      allowed: false,
      reason: `Cannot advance from ${state} toward Controlled Run Mode.`,
    });
  }

  private advanceIfCurrent(current: WorkflowState, next: WorkflowState): void {
    if (this.options.safetyGate.state() === current) {
      this.options.safetyGate.transitionTo(next);
    }
  }

  private metadata(): Record<string, string | number | boolean | undefined> {
    return {
      config: this.options.config.name,
      mode: this.options.config.mode,
      knowledgeBase: this.options.knowledgeBase.path,
      knowledgeBaseLoaded: this.options.knowledgeBase.loaded,
      knowledgeBasePlaceholder: this.options.knowledgeBase.isPlaceholder,
      controlledRunBlockedWithoutRealKnowledgeBase: !isRealKnowledgeBase(this.options.knowledgeBase),
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
        "The agent must follow knowledge/optibus_mastery.md as the operating manual.",
      ],
      assumptions: [
        "The operator will authenticate manually through approved Optibus login flows when browser mode is used.",
        ...(this.options.config.scenario?.assumptions ?? []),
      ],
      risks: [
        "Placeholder selectors must be validated against the real Optibus UI before relying on collected KPIs.",
      ],
      recommendations: [
        "Review all generated evidence before approving any future operational workflow.",
      ],
    };
  }
}

export function initialWorkflowState(config: LabConfig): WorkflowState {
  return normalizeWorkflowState(config.workflow?.start_state ?? WorkflowState.AcademyMode);
}

function mergeEvidence(target: EvidenceBuckets, source: EvidenceBuckets): void {
  target.facts.push(...source.facts);
  target.assumptions.push(...source.assumptions);
  target.risks.push(...source.risks);
  target.recommendations.push(...source.recommendations);
}
