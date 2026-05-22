export enum WorkflowState {
  AcademyMode = "Academy Mode",
  MapAuditMode = "Map Audit Mode",
  SchedulingPreferencesAudit = "Scheduling Preferences Audit",
  RunMechanicsAudit = "Run Mechanics Audit",
  RunReadinessGate = "Run Readiness Gate",
  ApprovalGate = "Approval Gate",
  ControlledRunMode = "Controlled Run Mode",
  FailureDiagnosisMode = "Failure Diagnosis Mode",
  PostRunComparison = "Post-Run Comparison",
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
    WorkflowState.SchedulingPreferencesAudit,
    WorkflowState.FailureDiagnosisMode,
  ],
  [WorkflowState.SchedulingPreferencesAudit]: [
    WorkflowState.RunMechanicsAudit,
    WorkflowState.FailureDiagnosisMode,
  ],
  [WorkflowState.RunMechanicsAudit]: [
    WorkflowState.RunReadinessGate,
    WorkflowState.FailureDiagnosisMode,
  ],
  [WorkflowState.RunReadinessGate]: [
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

const EXPLICITLY_ALLOWED_DESTRUCTIVE_STATES: Partial<
  Record<DestructiveActionName, WorkflowState[]>
> = {
  Run: [WorkflowState.ControlledRunMode],
};

export class SafetyGate {
  private currentState: WorkflowState;

  constructor(initialState: WorkflowState = WorkflowState.AcademyMode) {
    this.currentState = normalizeWorkflowState(initialState);
  }

  state(): WorkflowState {
    return this.currentState;
  }

  transitionTo(nextState: WorkflowState): void {
    const normalizedNextState = normalizeWorkflowState(nextState);
    const allowed = ALLOWED_TRANSITIONS[this.currentState].includes(
      normalizedNextState,
    );
    if (!allowed) {
      throw new SafetyGateError({
        allowed: false,
        reason: `Invalid workflow transition from ${this.currentState} to ${normalizedNextState}.`,
      });
    }

    this.currentState = normalizedNextState;
  }

  expectedApprovalToken(
    workflowState: WorkflowState,
    action: DestructiveActionName,
  ): string {
    return `APPROVE:${workflowState}:${action}`;
  }

  evaluateAction(check: SafetyCheck): SafetyDecision {
    const workflowState = normalizeWorkflowState(check.workflowState);
    const destructiveAction = detectDestructiveAction(check);
    if (!destructiveAction) {
      return {
        allowed: true,
        reason: "No destructive intent detected.",
      };
    }

    const allowedStates = EXPLICITLY_ALLOWED_DESTRUCTIVE_STATES[destructiveAction] ?? [];
    const expectedApprovalToken = this.expectedApprovalToken(
      workflowState,
      destructiveAction,
    );

    if (!allowedStates.includes(workflowState)) {
      return {
        allowed: false,
        destructiveAction,
        expectedApprovalToken,
        reason: `Blocked ${destructiveAction}: ${workflowState} does not explicitly allow it.`,
      };
    }

    if (check.approvalToken !== expectedApprovalToken) {
      return {
        allowed: false,
        destructiveAction,
        expectedApprovalToken,
        reason: `Blocked ${destructiveAction}: missing or mismatched approval token for ${workflowState}.`,
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

export function normalizeWorkflowState(state: WorkflowState | string): WorkflowState {
  if (Object.values(WorkflowState).includes(state as WorkflowState)) {
    return state as WorkflowState;
  }

  const withoutSpaces = String(state).replace(/\s+/g, "").toLowerCase();
  const matched = Object.values(WorkflowState).find(
    (value) => value.replace(/\s+/g, "").toLowerCase() === withoutSpaces,
  );

  if (!matched) {
    throw new Error(`Unknown workflow state: ${state}`);
  }

  return matched;
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
