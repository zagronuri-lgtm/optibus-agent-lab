import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { FileLogger, type LogOutcome } from "./logger";
import {
  SafetyGate,
  SafetyGateError,
  WorkflowState,
  type SafetyDecision,
} from "./safetyGate";

export interface AgentBrowserOptions {
  headless?: boolean;
  slowMoMs?: number;
}

export class AgentBrowser {
  private browser?: Browser;
  private context?: BrowserContext;
  private pageInstance?: Page;

  constructor(
    private readonly logger: FileLogger,
    private readonly safetyGate: SafetyGate,
    private readonly options: AgentBrowserOptions = {},
  ) {}

  async start(): Promise<Page> {
    this.browser = await chromium.launch({
      headless: this.options.headless ?? true,
      slowMo: this.options.slowMoMs,
    });
    this.context = await this.browser.newContext();
    this.pageInstance = await this.context.newPage();

    await this.logAction({
      action: "browser.start",
      reason: "Start isolated Playwright browser context.",
      outcome: "completed",
    });

    return this.pageInstance;
  }

  page(): Page {
    if (!this.pageInstance) {
      throw new Error("Browser has not been started.");
    }

    return this.pageInstance;
  }

  async close(): Promise<void> {
    await this.logAction({
      action: "browser.close",
      reason: "Close isolated Playwright browser context.",
      outcome: "completed",
    });
    await this.context?.close();
    await this.browser?.close();
  }

  async goto(url: string, reason: string): Promise<void> {
    await this.runGuardedAction({
      action: "navigate",
      reason,
      selector: url,
      operation: async () => {
        await this.page().goto(url, { waitUntil: "domcontentloaded" });
      },
    });
  }

  async click(
    selector: string,
    reason: string,
    approvalToken?: string,
  ): Promise<void> {
    await this.runGuardedAction({
      action: "click",
      selector,
      reason,
      approvalToken,
      operation: async () => {
        await this.page().click(selector);
      },
    });
  }

  async fill(
    selector: string,
    value: string,
    reason: string,
    approvalToken?: string,
  ): Promise<void> {
    await this.runGuardedAction({
      action: "fill",
      selector,
      reason,
      approvalToken,
      operation: async () => {
        await this.page().fill(selector, value);
      },
    });
  }

  async textContent(selector: string, reason: string): Promise<string | null> {
    let value: string | null = null;
    await this.runGuardedAction({
      action: "textContent",
      selector,
      reason,
      operation: async () => {
        value = await this.page().locator(selector).first().textContent();
      },
    });

    return value;
  }

  async screenshot(label: string, reason: string): Promise<string> {
    const screenshotPath = this.logger.screenshotPath(
      this.safetyGate.state(),
      label,
    );

    await this.page().screenshot({ path: screenshotPath, fullPage: true });
    await this.logAction({
      action: "screenshot",
      selector: screenshotPath,
      reason,
      outcome: "completed",
      screenshotPath,
    });

    return screenshotPath;
  }

  async majorStep<T>(
    label: string,
    reason: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    await this.screenshot(`${label}-before`, `Before major step: ${reason}`);

    try {
      const result = await operation();
      await this.screenshot(`${label}-after`, `After major step: ${reason}`);
      return result;
    } catch (error) {
      await this.screenshot(`${label}-failure`, `Failure during: ${reason}`);
      throw error;
    }
  }

  async simulateRun(reason: string, approvalToken?: string): Promise<void> {
    const decision = this.safetyGate.assertSimulatedRunAllowed(approvalToken);
    if (!decision.allowed) {
      await this.logSafetyDecision("simulateRun", reason, decision, "blocked");
      throw new SafetyGateError(decision);
    }

    await this.logSafetyDecision("simulateRun", reason, decision, "simulated");
  }

  private async runGuardedAction(input: {
    action: string;
    selector?: string;
    reason: string;
    approvalToken?: string;
    operation: () => Promise<void>;
  }): Promise<void> {
    const decision = this.safetyGate.evaluateAction({
      workflowState: this.safetyGate.state(),
      action: input.action,
      selector: input.selector,
      reason: input.reason,
      approvalToken: input.approvalToken,
    });

    if (!decision.allowed) {
      await this.logSafetyDecision(
        input.action,
        input.reason,
        decision,
        "blocked",
        input.selector,
      );
      throw new SafetyGateError(decision);
    }

    try {
      await input.operation();
      await this.logAction({
        action: input.action,
        selector: input.selector,
        reason: input.reason,
        outcome: "completed",
      });
    } catch (error) {
      await this.logAction({
        action: input.action,
        selector: input.selector,
        reason: input.reason,
        outcome: "failed",
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
      throw error;
    }
  }

  private async logSafetyDecision(
    action: string,
    reason: string,
    decision: SafetyDecision,
    outcome: LogOutcome,
    selector?: string,
  ): Promise<void> {
    await this.logAction({
      action,
      selector,
      reason,
      outcome,
      details: {
        safetyReason: decision.reason,
        destructiveAction: decision.destructiveAction,
        expectedApprovalToken: decision.expectedApprovalToken,
      },
    });
  }

  private async logAction(entry: {
    action: string;
    reason: string;
    outcome: LogOutcome;
    selector?: string;
    screenshotPath?: string;
    details?: Record<string, unknown>;
  }): Promise<void> {
    const page = this.pageInstance;
    const url = page?.url() ?? "about:blank";
    const pageTitle = page ? await page.title().catch(() => "") : "";

    await this.logger.action({
      workflowState: this.safetyGate.state(),
      url,
      pageTitle,
      action: entry.action,
      selector: entry.selector,
      reason: entry.reason,
      outcome: entry.outcome,
      screenshotPath: entry.screenshotPath,
      details: entry.details,
    });
  }
}

export { WorkflowState };
