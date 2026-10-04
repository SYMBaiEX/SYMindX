export type StepStatus = 'pending' | 'active' | 'done' | 'skipped';

export interface PlanStep {
  readonly id: string;
  readonly text: string;
  readonly status: StepStatus;
}

export interface Intention {
  readonly goal: string;
  readonly steps: readonly PlanStep[];
  readonly createdAt: number;
}

const MAX_GOAL_LENGTH = 500;
const MAX_STEPS = 8;
const MAX_STEP_TEXT = 200;

function copyStep(step: PlanStep, status: StepStatus): PlanStep {
  return { id: step.id, text: step.text, status };
}

export function planGoal(goal: string, at: number): Intention {
  const trimmed = goal.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_GOAL_LENGTH) {
    throw new RangeError('goal must be 1 to 500 characters');
  }
  if (!Number.isFinite(at)) {
    throw new RangeError('at must be finite');
  }

  const phrases = trimmed
    .split(/[.!?;]+/)
    .map((phrase) => phrase.trim())
    .filter((phrase) => phrase.length > 0)
    .slice(0, MAX_STEPS);
  const texts = phrases.length > 0 ? phrases : [trimmed];
  const steps: readonly PlanStep[] = texts.map((text, index) => ({
    id: `s${index + 1}`,
    text: text.slice(0, MAX_STEP_TEXT),
    status: index === 0 ? 'active' : 'pending',
  }));

  return { goal: trimmed, steps, createdAt: at };
}

export function completeStep(plan: Intention, stepId: string): Intention {
  return closeStep(plan, stepId, 'done');
}

export function skipStep(plan: Intention, stepId: string): Intention {
  return closeStep(plan, stepId, 'skipped');
}

function closeStep(plan: Intention, stepId: string, status: 'done' | 'skipped'): Intention {
  const index = plan.steps.findIndex((step) => step.id === stepId);
  const current = index >= 0 ? plan.steps[index] : undefined;
  if (current === undefined) {
    throw new RangeError('unknown step');
  }

  let promoteIndex = -1;
  if (current.status === 'active') {
    for (let cursor = index + 1; cursor < plan.steps.length; cursor += 1) {
      const candidate = plan.steps[cursor];
      if (candidate !== undefined && candidate.status === 'pending') {
        promoteIndex = cursor;
        break;
      }
    }
  }

  const steps = plan.steps.map((step, stepIndex) => {
    if (stepIndex === index) {
      return copyStep(step, status);
    }
    if (stepIndex === promoteIndex) {
      return copyStep(step, 'active');
    }
    return copyStep(step, step.status);
  });

  return { goal: plan.goal, steps, createdAt: plan.createdAt };
}
