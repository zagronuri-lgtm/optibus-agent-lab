import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

export type LogOutcome =
  | "allowed"
  | "blocked"
  | "completed"
  | "failed"
  | "simulated"
  | "info";

export interface BrowserActionLogEntry {
  timestamp: string;
  workflowState: string;
  url: string;
  pageTitle: string;
  action: string;
  selector?: string;
  reason: string;
  outcome: LogOutcome;
  screenshotPath?: string;
  details?: Record<string, unknown>;
}

export interface FileLoggerOptions {
  logDir?: string;
  screenshotDir?: string;
  sessionId?: string;
}

export class FileLogger {
  readonly logDir: string;
  readonly screenshotDir: string;
  readonly sessionId: string;
  readonly actionLogPath: string;

  constructor(options: FileLoggerOptions = {}) {
    this.sessionId = options.sessionId ?? createSessionId();
    this.logDir = options.logDir ?? "logs";
    this.screenshotDir = options.screenshotDir ?? "artifacts/screenshots";
    this.actionLogPath = path.join(this.logDir, `${this.sessionId}.jsonl`);
  }

  async init(): Promise<void> {
    await mkdir(this.logDir, { recursive: true });
    await mkdir(this.screenshotDir, { recursive: true });
  }

  async action(entry: Omit<BrowserActionLogEntry, "timestamp">): Promise<void> {
    const completeEntry: BrowserActionLogEntry = {
      timestamp: new Date().toISOString(),
      ...entry,
    };

    await appendFile(
      this.actionLogPath,
      `${JSON.stringify(completeEntry)}\n`,
      "utf8",
    );
  }

  screenshotPath(workflowState: string, label: string): string {
    const safeState = sanitizeFilePart(workflowState);
    const safeLabel = sanitizeFilePart(label);
    return path.join(
      this.screenshotDir,
      `${this.sessionId}-${safeState}-${safeLabel}-${Date.now()}.png`,
    );
  }
}

export function createSessionId(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function sanitizeFilePart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
