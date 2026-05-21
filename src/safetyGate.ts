export enum WorkflowState {
  AcademyMode = "AcademyMode",
  MapAuditMode = "MapAuditMode",
  RunReadinessMode = "RunReadinessMode",
  ApprovalGate = "ApprovalGate",
  ControlledRunMode = "ControlledRunMode",
  PostRunComparison = "PostRunComparison",
  FailureDiagnosisMode = "FailureDiagnosisMode",
}

export type DestructiveActionName =
  | "Save"
  | "Apply"
  | "Publish"
  | "Delete"
  | "Export"
  | "Import"
  | "Duplicate"
  | "Create Version"
  | "Run";

export interface SafetyCheck {
  workflowState: WorkflowState;
  action: string;
  selector?: string;
  reason: string;
  approvalToken?: string;
  label?: string;
}

export interface SafetyDecision {
  allowed: boolean;
  destructiveAction?: DestructiveActionName;
  reason: string;
  expectedApprovalToken?: string;
}

export class SafetyGateError extends Error {
  readonly decision: SafetyDecision;

  constructor(decision: SafetyDecision) {
    super(decision.reason);
    this.name = "SafetyGateError";
    this.decision = decision;
  }
}

const DESTRUCTIVE_ACTIONS: DestructiveActionName[] = [
  "Save",
  "Apply",
  "Publish",
  "Delete",
  "Export",
  "Import",
  "Duplicate",
  "Create Version",
  "Run",
];

const ALLOWED_TRANSITIONS: Record<WorkflowState, WorkflowState[]> = {
  [WorkflowState.AcademyMode]: [
    WorkflowState.MapAuditMode,
    WorkflowState.FailureDiagnosisMode,
  ],
  [WorkflowState.MapAuditMode]: [
    WorkflowState.RunReadinessMode,
    WorkflowState.FailureDiagnosisMode,
  ],
  [WorkflowState.RunReadinessMode]: [
    WorkflowState.ApprovalGate,
    WorkflowState.FailureDiagnosisMode,
  ],
  [WorkflowState.ApprovalGate]: [
    WorkflowState.ControlledRunMode,
    WorkflowState.FailureDiagnosisMode,
  ],
  [WorkflowState.ControlledRunMode]: [
    WorkflowState.PostRunComparison,
    WorkflowState.FailureDiagnosisMode,
  ],
  [WorkflowState.PostRunComparison]: [WorkflowState.FailureDiagnosisMode],
  [WorkflowState.FailureDiagnosisMode]: [],
};

export class SafetyGate {
  private currentState: WorkflowState;

  constructor(initialState: WorkflowState = WorkflowState.AcademyMode) {
    this.currentState = initialState;
  }

  state(): WorkflowState {
    return this.currentState;
  }

  transitionTo(nextState: WorkflowState): void {
    const allowed = ALLOWED_TRANSITIONS[this.currentState].includes(nextState);
    if (!allowed) {
      throw new SafetyGateError({
        allowed: false,
        reason: `Invalid workflow transition from ${this.currentState} to ${nextState}.`,
      });
    }

    this.currentState = nextState;
  }

  expectedApprovalToken(
    workflowState: WorkflowState,
    action: DestructiveActionName,
  ): string {
    return `APPROVE:${workflowState}:${action}`;
  }

  evaluateAction(check: SafetyCheck): SafetyDecision {
    const destructiveAction = detectDestructiveAction(check);
    if (!destructiveAction) {
      return {
        allowed: true,
        reason: "No destructive intent detected.",
      };
    }

    const expectedApprovalToken = this.expectedApprovalToken(
      check.workflowState,
      destructiveAction,
    );

    if (check.approvalToken !== expectedApprovalToken) {
      return {
        allowed: false,
        destructiveAction,
        expectedApprovalToken,
        reason: `Blocked ${destructiveAction}: missing or mismatched approval token for ${check.workflowState}.`,
      };
    }

    return {
      allowed: false,
      destructiveAction,
      expectedApprovalToken,
      reason: `Blocked ${destructiveAction}: v1 does not allow real destructive browser actions.`,
    };
  }

  assertActionAllowed(check: SafetyCheck): void {
    const decision = this.evaluateAction(check);
    if (!decision.allowed) {
      throw new SafetyGateError(decision);
    }
  }

  assertSimulatedRunAllowed(approvalToken?: string): SafetyDecision {
    const expectedApprovalToken = this.expectedApprovalToken(
      WorkflowState.ControlledRunMode,
      "Run",
    );

    if (this.currentState !== WorkflowState.ControlledRunMode) {
      return {
        allowed: false,
        destructiveAction: "Run",
        expectedApprovalToken,
        reason: `Simulated Run requires ${WorkflowState.ControlledRunMode}; current state is ${this.currentState}.`,
      };
    }

    if (approvalToken !== expectedApprovalToken) {
      return {
        allowed: false,
        destructiveAction: "Run",
        expectedApprovalToken,
        reason: "Simulated Run blocked: missing or mismatched approval token.",
      };
    }

    return {
      allowed: true,
      destructiveAction: "Run",
      expectedApprovalToken,
      reason: "Simulated Run approved. No real browser Run action will occur.",
    };
  }
}

export function detectDestructiveAction(
  check: Pick<SafetyCheck, "action" | "selector" | "reason" | "label">,
): DestructiveActionName | undefined {
  const haystack = [check.action, check.selector, check.label, check.reason]
    .filter(Boolean)
    .join(" ");

  return DESTRUCTIVE_ACTIONS.find((actionName) =>
    destructivePattern(actionName).test(haystack),
  );
}

function destructivePattern(actionName: DestructiveActionName): RegExp {
  if (actionName === "Create Version") {
    return /\bcreate\s+version\b/i;
  }

  return new RegExp(`\\b${escapeRegExp(actionName)}\\b`, "i");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
